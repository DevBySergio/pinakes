import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import {
	internalStateFileNames,
	legacyPinakeDirectoryName,
	pinakeDirectoryName,
	pinakeDocsDirectoryName,
	pinakeGitignoreFileName,
	pinakeManifestFileName,
	pinakeStateDirectoryName,
} from '../constants';
import { moduleDescriptors } from '../modules/moduleDescriptors';
import {
	getDefaultPinakeTemplate,
	getPinakeDocuments,
	getPinakeModuleDefinitions,
	getPinakeTemplate,
} from '../templates/pinakeTemplates';
import {
	InitializePinakeOptions,
	PinakeDocumentDefinition,
	PinakeDocumentType,
	PinakeManifest,
	PinakeModuleDescriptor,
	PinakeModuleId,
	ScaffoldResult,
	TemplateFile,
} from '../types';
import { createDocumentId } from './documentIds';
import { FileService } from './FileService';
import { IndexService } from './IndexService';
import { ManifestService } from './ManifestService';
import { StateService } from './StateService';
import { joinUri } from './uriUtils';

export class ScaffoldService {
	public constructor(
		private readonly fileService: FileService,
		private readonly manifestService: ManifestService,
		private readonly stateService: StateService,
		private readonly indexService: IndexService,
	) {}

	public async initializePinake(root: vscode.Uri, projectNameOrOptions: string | InitializePinakeOptions): Promise<ScaffoldResult> {
		const options = normalizeInitializeOptions(projectNameOrOptions);
		const result = createEmptyResult();
		const template = getPinakeTemplate(options.templateId);
		const moduleIds = options.moduleIds ?? template.defaultModules;
		const moduleDefinitions = getPinakeModuleDefinitions(template, moduleIds);
		const documents = getPinakeDocuments(template, moduleIds);
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		const docsDirectory = vscode.Uri.joinPath(pinakeDirectory, pinakeDocsDirectoryName);

		await this.ensureDirectoryTracked(pinakeDirectory, pinakeDirectoryName, result);
		await this.ensureDirectoryTracked(docsDirectory, `${pinakeDirectoryName}/${pinakeDocsDirectoryName}`, result);

		for (const moduleDefinition of moduleDefinitions) {
			await this.ensureDirectoryTracked(joinUri(docsDirectory, moduleDefinition.folder), `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${moduleDefinition.folder}`, result);
		}

		if (options.migrateLegacy) {
			await this.copyLegacyPinakeIntoDocs(root, docsDirectory, result);
		}

		await this.writeDocumentFiles(docsDirectory, documents, result);

		let manifest = await this.manifestService.readManifest(root);
		let manifestChanged = false;
		if (!manifest) {
			manifest = this.manifestService.createManifest(options.projectName, template.id, moduleIds, options.hiddenFromExplorer ?? false, documents);
			result.created.push(`${pinakeDirectoryName}/${pinakeManifestFileName}`);
			manifestChanged = true;
		} else {
			manifestChanged = this.manifestService.setTemplateSelection(manifest, template.id, moduleIds, options.hiddenFromExplorer ?? manifest.storage.hiddenFromExplorer);
			if (this.manifestService.addDocuments(manifest, documents)) {
				manifestChanged = true;
			}
		}

		const discoveredDocuments = await this.collectUntrackedMarkdownDocuments(docsDirectory, manifest.documents);
		if (this.manifestService.addDocuments(manifest, discoveredDocuments)) {
			manifestChanged = true;
		}

		if (manifestChanged) {
			await this.manifestService.writeManifest(root, manifest);
			if (!result.created.includes(`${pinakeDirectoryName}/${pinakeManifestFileName}`)) {
				result.updated.push(`${pinakeDirectoryName}/${pinakeManifestFileName}`);
			}
		}

		result.created.push(...await this.stateService.ensureInitialState(root, manifest));
		if (await this.stateService.syncModulesState(root, manifest)) {
			result.updated.push(`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.modules}`);
		}
		if (await this.ensurePinakeGitignoreEntry(pinakeDirectory)) {
			result.updated.push(`${pinakeDirectoryName}/${pinakeGitignoreFileName}`);
		}

		if (options.hiddenFromExplorer && await this.hidePinakeFromExplorer(root)) {
			result.updated.push('.vscode/settings.json');
		}

		await this.indexService.rebuild(root);
		return result;
	}

	public async generateModules(root: vscode.Uri, descriptors: PinakeModuleDescriptor[]): Promise<ScaffoldResult> {
		const result = createEmptyResult();
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		const docsDirectory = vscode.Uri.joinPath(pinakeDirectory, pinakeDocsDirectoryName);
		await this.ensureDirectoryTracked(pinakeDirectory, pinakeDirectoryName, result);
		await this.ensureDirectoryTracked(docsDirectory, `${pinakeDirectoryName}/${pinakeDocsDirectoryName}`, result);

		let manifest = await this.manifestService.readManifest(root);
		if (!manifest) {
			manifest = this.manifestService.createDefaultManifest(path.basename(root.fsPath));
			await this.manifestService.writeManifest(root, manifest);
			result.created.push(`${pinakeDirectoryName}/${pinakeManifestFileName}`);
		}

		const expandedDescriptors = this.includeDependencies(descriptors);
		const generatedDocuments: PinakeDocumentDefinition[] = [];
		for (const descriptor of expandedDescriptors) {
			await this.ensureDirectoryTracked(joinUri(docsDirectory, descriptor.rootFolder), `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${descriptor.rootFolder}`, result);
			await this.writeTemplateFiles(docsDirectory, descriptor.files, result);
			generatedDocuments.push(...descriptorToDocuments(descriptor));
			if (this.manifestService.ensureModule(manifest, descriptor)) {
				result.updated.push(`${pinakeDirectoryName}/${pinakeManifestFileName}:${descriptor.id}`);
			}
		}

		if (this.manifestService.addDocuments(manifest, generatedDocuments)) {
			result.updated.push(`${pinakeDirectoryName}/${pinakeManifestFileName}:documents`);
		}

		await this.manifestService.writeManifest(root, manifest);
		await this.stateService.ensureInitialState(root, manifest);
		await this.stateService.syncModulesState(root, manifest);
		await this.indexService.rebuild(root);
		return result;
	}

	public async repairPinake(root: vscode.Uri, projectName: string): Promise<ScaffoldResult> {
		let manifest = await this.manifestService.readManifest(root);
		if (!manifest) {
			return this.initializePinake(root, projectName);
		}

		const result = createEmptyResult();
		const template = getPinakeTemplate(manifest.project.template);
		const moduleIds = Object.entries(manifest.modules)
			.filter(([, enabled]) => enabled)
			.map(([moduleId]) => moduleId)
			.filter(isPinakeModuleId);
		const selectedModuleIds = moduleIds.length > 0 ? moduleIds : template.defaultModules;
		const moduleDefinitions = getPinakeModuleDefinitions(template, selectedModuleIds);
		const documents = getPinakeDocuments(template, selectedModuleIds);
		const docsDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeDocsDirectoryName);

		await this.ensureDirectoryTracked(docsDirectory, `${pinakeDirectoryName}/${pinakeDocsDirectoryName}`, result);
		for (const moduleDefinition of moduleDefinitions) {
			await this.ensureDirectoryTracked(joinUri(docsDirectory, moduleDefinition.folder), `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${moduleDefinition.folder}`, result);
		}

		await this.writeDocumentFiles(docsDirectory, documents, result);
		let manifestChanged = false;
		if (this.manifestService.addDocuments(manifest, documents)) {
			manifestChanged = true;
		}

		const discoveredDocuments = await this.collectUntrackedMarkdownDocuments(docsDirectory, manifest.documents);
		if (this.manifestService.addDocuments(manifest, discoveredDocuments)) {
			manifestChanged = true;
		}

		if (manifestChanged) {
			await this.manifestService.writeManifest(root, manifest);
			result.updated.push(`${pinakeDirectoryName}/${pinakeManifestFileName}`);
		}

		result.created.push(...await this.stateService.ensureInitialState(root, manifest));
		await this.indexService.rebuild(root);
		return result;
	}

	public async upgradePinake(root: vscode.Uri, projectName: string): Promise<ScaffoldResult> {
		const result = createEmptyResult();
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		const docsDirectory = vscode.Uri.joinPath(pinakeDirectory, pinakeDocsDirectoryName);
		const manifestUri = this.manifestService.getManifestUri(root);
		const manifestExists = await this.fileService.exists(manifestUri);

		await this.ensureDirectoryTracked(pinakeDirectory, pinakeDirectoryName, result);
		await this.ensureDirectoryTracked(docsDirectory, `${pinakeDirectoryName}/${pinakeDocsDirectoryName}`, result);
		await this.copyLegacyPinakeIntoDocs(root, docsDirectory, result);

		const discoveredDocuments = await this.collectUntrackedMarkdownDocuments(docsDirectory, []);
		const rawManifest = manifestExists
			? await this.fileService.readJson<unknown>(manifestUri)
			: await this.readLegacyManifest(root);
		const manifest = this.createManifestForUpgrade(rawManifest, projectName, discoveredDocuments);
		this.manifestService.addDocuments(manifest, discoveredDocuments);
		if (manifestExists) {
			result.updated.push(`${pinakeDirectoryName}/${pinakeManifestFileName}`);
		} else {
			result.created.push(`${pinakeDirectoryName}/${pinakeManifestFileName}`);
		}
		await this.manifestService.writeManifest(root, manifest);

		result.created.push(...await this.stateService.ensureInitialState(root, manifest));
		await this.stateService.syncModulesState(root, manifest);
		await this.stateService.syncVersionState(root);
		if (await this.stateService.recordMigration(root, 'Upgraded workspace to the current Pinake schema.')) {
			result.updated.push(`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.migrations}`);
		}
		result.updated.push(`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.modules}`);
		result.updated.push(`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.version}`);

		if (await this.ensurePinakeGitignoreEntry(pinakeDirectory)) {
			result.updated.push(`${pinakeDirectoryName}/${pinakeGitignoreFileName}`);
		}

		await this.indexService.rebuild(root);
		return result;
	}

	public async generateCiValidation(root: vscode.Uri): Promise<ScaffoldResult> {
		const result = createEmptyResult();
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		const toolsDirectory = vscode.Uri.joinPath(pinakeDirectory, 'tools');
		const workflowDirectory = vscode.Uri.joinPath(root, '.github', 'workflows');
		const validatorUri = vscode.Uri.joinPath(toolsDirectory, 'validate-pinake.mjs');
		const workflowUri = vscode.Uri.joinPath(workflowDirectory, 'pinake-validate.yml');

		await this.ensureDirectoryTracked(pinakeDirectory, pinakeDirectoryName, result);
		await this.ensureDirectoryTracked(toolsDirectory, `${pinakeDirectoryName}/tools`, result);
		await this.ensureDirectoryTracked(workflowDirectory, '.github/workflows', result);

		const validatorScript = await readStandaloneValidatorScript();
		if (await this.fileService.writeTextIfMissing(validatorUri, validatorScript)) {
			result.created.push(`${pinakeDirectoryName}/tools/validate-pinake.mjs`);
		} else {
			result.skipped.push(`${pinakeDirectoryName}/tools/validate-pinake.mjs`);
		}

		if (await this.fileService.writeTextIfMissing(workflowUri, createPinakeValidationWorkflow())) {
			result.created.push('.github/workflows/pinake-validate.yml');
		} else {
			result.skipped.push('.github/workflows/pinake-validate.yml');
		}

		return result;
	}

	public async hidePinakeFromExplorer(root: vscode.Uri): Promise<boolean> {
		const settingsUri = vscode.Uri.joinPath(root, '.vscode', 'settings.json');
		if (!(await this.fileService.exists(settingsUri))) {
			await this.fileService.ensureDirectory(vscode.Uri.joinPath(root, '.vscode'));
			await this.fileService.writeJson(settingsUri, {
				'files.exclude': {
					'**/.pinake': true,
				},
			});
			return true;
		}

		try {
			const settings = JSON.parse(await this.fileService.readText(settingsUri)) as unknown;
			if (!isRecord(settings)) {
				throw new Error('Workspace settings must be a JSON object.');
			}

			const filesExclude = isRecord(settings['files.exclude']) ? settings['files.exclude'] : {};
			if (filesExclude['**/.pinake'] === true) {
				return false;
			}

			settings['files.exclude'] = {
				...filesExclude,
				'**/.pinake': true,
			};
			await this.fileService.writeJson(settingsUri, settings);
			return true;
		} catch {
			const config = vscode.workspace.getConfiguration('files', root);
			const current = config.get<Record<string, boolean>>('exclude') ?? {};
			if (current['**/.pinake'] === true) {
				return false;
			}

			await config.update('exclude', { ...current, '**/.pinake': true }, vscode.ConfigurationTarget.WorkspaceFolder);
			return true;
		}
	}

	private async writeDocumentFiles(baseDirectory: vscode.Uri, documents: PinakeDocumentDefinition[], result: ScaffoldResult): Promise<void> {
		await this.writeTemplateFiles(
			baseDirectory,
			documents.map((document) => ({
				relativePath: document.path,
				content: document.content ?? defaultDocumentContent(document),
			})),
			result,
		);
	}

	private async writeTemplateFiles(baseDirectory: vscode.Uri, files: TemplateFile[], result: ScaffoldResult): Promise<void> {
		for (const file of files) {
			const uri = joinUri(baseDirectory, file.relativePath);
			const parent = uri.with({ path: path.posix.dirname(uri.path) });
			await this.fileService.ensureDirectory(parent);
			const content = ensureMarkdownFrontmatter(file.relativePath, file.content);

			if (await this.fileService.writeTextIfMissing(uri, content)) {
				result.created.push(`${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${file.relativePath}`);
			} else {
				result.skipped.push(`${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${file.relativePath}`);
			}
		}
	}

	private includeDependencies(descriptors: PinakeModuleDescriptor[]): PinakeModuleDescriptor[] {
		const byId = new Map(moduleDescriptors.map((descriptor) => [descriptor.id, descriptor]));
		const result = new Map<string, PinakeModuleDescriptor>();
		const visit = (descriptor: PinakeModuleDescriptor): void => {
			for (const dependencyId of descriptor.dependencies) {
				const dependency = byId.get(dependencyId);
				if (dependency && !result.has(dependency.id)) {
					visit(dependency);
				}
			}

			result.set(descriptor.id, descriptor);
		};

		for (const descriptor of descriptors) {
			visit(descriptor);
		}

		return Array.from(result.values());
	}

	private async ensureDirectoryTracked(uri: vscode.Uri, relativePath: string, result: ScaffoldResult): Promise<void> {
		if (await this.fileService.exists(uri)) {
			return;
		}

		await this.fileService.ensureDirectory(uri);
		result.created.push(relativePath);
	}

	private async ensurePinakeGitignoreEntry(pinakeDirectory: vscode.Uri): Promise<boolean> {
		const gitignore = vscode.Uri.joinPath(pinakeDirectory, pinakeGitignoreFileName);
		const entry = `${pinakeStateDirectoryName}/`;
		if (!(await this.fileService.exists(gitignore))) {
			await this.fileService.writeText(gitignore, `${entry}\n`);
			return true;
		}

		const content = await this.fileService.readText(gitignore);
		const lines = content.split(/\r?\n/).map((line) => line.trim());
		if (lines.includes(entry) || lines.includes(`/${entry}`)) {
			return false;
		}

		const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
		await this.fileService.writeText(gitignore, `${content}${separator}${entry}\n`);
		return true;
	}

	private async copyLegacyPinakeIntoDocs(root: vscode.Uri, docsDirectory: vscode.Uri, result: ScaffoldResult): Promise<void> {
		const legacyDirectory = vscode.Uri.joinPath(root, legacyPinakeDirectoryName);
		if (!(await this.fileService.isDirectory(legacyDirectory))) {
			return;
		}

		await this.copyLegacyChildren(legacyDirectory, docsDirectory, [], result);
	}

	private async copyLegacyChildren(sourceDirectory: vscode.Uri, targetDirectory: vscode.Uri, relativeSegments: string[], result: ScaffoldResult): Promise<void> {
		const entries = await this.fileService.readDirectory(sourceDirectory);
		for (const [name, type] of entries) {
			if (shouldSkipLegacyEntry(name, relativeSegments.length === 0)) {
				continue;
			}

			const nextSegments = [...relativeSegments, name];
			const source = vscode.Uri.joinPath(sourceDirectory, name);
			const target = vscode.Uri.joinPath(targetDirectory, name);
			const relativePath = nextSegments.join('/');

			if ((type & vscode.FileType.Directory) !== 0) {
				await this.ensureDirectoryTracked(target, `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${relativePath}`, result);
				await this.copyLegacyChildren(source, target, nextSegments, result);
				continue;
			}

			if ((type & vscode.FileType.File) === 0) {
				continue;
			}

			if (await this.fileService.exists(target)) {
				result.skipped.push(`${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${relativePath}`);
				continue;
			}

			await this.fileService.copy(source, target, false);
			result.created.push(`${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${relativePath}`);
		}
	}

	private async collectUntrackedMarkdownDocuments(docsDirectory: vscode.Uri, existingDocuments: PinakeDocumentDefinition[]): Promise<PinakeDocumentDefinition[]> {
		const knownPaths = new Set(existingDocuments.map((document) => document.path));
		const documents: PinakeDocumentDefinition[] = [];
		await this.collectUntrackedMarkdownDocumentsFromDirectory(docsDirectory, [], knownPaths, documents);
		return documents;
	}

	private createManifestForUpgrade(
		rawManifest: unknown,
		projectName: string,
		discoveredDocuments: PinakeDocumentDefinition[],
	): PinakeManifest {
		if (this.manifestService.validateManifestShape(rawManifest).length === 0) {
			return rawManifest as PinakeManifest;
		}

		const template = getDefaultPinakeTemplate();
		const manifest = this.manifestService.createManifest(
			getLegacyProjectName(rawManifest) ?? projectName,
			template.id,
			template.defaultModules,
			false,
			discoveredDocuments,
		);

		for (const [moduleId, enabled] of getLegacyModuleSelection(rawManifest)) {
			manifest.modules[moduleId] = enabled;
		}

		return manifest;
	}

	private async readLegacyManifest(root: vscode.Uri): Promise<unknown> {
		const legacyManifestUri = vscode.Uri.joinPath(root, legacyPinakeDirectoryName, pinakeManifestFileName);
		if (!(await this.fileService.exists(legacyManifestUri))) {
			return undefined;
		}

		return this.fileService.readJson<unknown>(legacyManifestUri);
	}

	private async collectUntrackedMarkdownDocumentsFromDirectory(
		directory: vscode.Uri,
		relativeSegments: string[],
		knownPaths: Set<string>,
		documents: PinakeDocumentDefinition[],
	): Promise<void> {
		if (!(await this.fileService.exists(directory))) {
			return;
		}

		const entries = await this.fileService.readDirectory(directory);
		for (const [name, type] of entries) {
			if (name === pinakeStateDirectoryName) {
				continue;
			}

			const nextSegments = [...relativeSegments, name];
			const relativePath = nextSegments.join('/');
			if ((type & vscode.FileType.Directory) !== 0) {
				await this.collectUntrackedMarkdownDocumentsFromDirectory(vscode.Uri.joinPath(directory, name), nextSegments, knownPaths, documents);
				continue;
			}

			if ((type & vscode.FileType.File) === 0 || !name.toLowerCase().endsWith('.md') || knownPaths.has(relativePath)) {
				continue;
			}

			documents.push(documentFromPath(relativePath, documents.length + 1));
		}
	}
}

function normalizeInitializeOptions(projectNameOrOptions: string | InitializePinakeOptions): InitializePinakeOptions {
	if (typeof projectNameOrOptions === 'string') {
		const template = getDefaultPinakeTemplate();
		return {
			projectName: projectNameOrOptions,
			templateId: template.id,
			moduleIds: template.defaultModules,
			hiddenFromExplorer: false,
			migrateLegacy: false,
		};
	}

	const template = getPinakeTemplate(projectNameOrOptions.templateId);
	return {
		...projectNameOrOptions,
		templateId: template.id,
		moduleIds: projectNameOrOptions.moduleIds ?? template.defaultModules,
		hiddenFromExplorer: projectNameOrOptions.hiddenFromExplorer ?? false,
		migrateLegacy: projectNameOrOptions.migrateLegacy ?? false,
	};
}

function createEmptyResult(): ScaffoldResult {
	return {
		created: [],
		skipped: [],
		updated: [],
	};
}

function descriptorToDocuments(descriptor: PinakeModuleDescriptor): PinakeDocumentDefinition[] {
	return descriptor.files
		.filter((file) => file.relativePath.toLowerCase().endsWith('.md'))
		.map((file, index) => documentFromPath(file.relativePath, index + 1, `module-${slug(descriptor.id)}-${slug(file.relativePath)}`));
}

function documentFromPath(relativePath: string, order: number, id = createDocumentId('document', relativePath)): PinakeDocumentDefinition {
	const title = titleFromPath(relativePath);
	return {
		id,
		title,
		path: relativePath,
		type: inferDocumentType(relativePath),
		status: 'draft',
		order,
	};
}

function defaultDocumentContent(document: PinakeDocumentDefinition): string {
	return `---
title: ${JSON.stringify(document.title)}
type: ${document.type}
status: ${document.status}
order: ${document.order}
---

# ${document.title}

Add practical internal notes for this document.
`;
}

function ensureMarkdownFrontmatter(relativePath: string, content: string): string {
	if (!relativePath.toLowerCase().endsWith('.md') || content.trimStart().startsWith('---')) {
		return content;
	}

	const document = documentFromPath(relativePath, 1);
	const trimmed = content.trimStart();
	const firstHeading = /^#\s+.+$/m.test(trimmed) ? '' : `# ${document.title}\n\n`;
	return `---
title: ${JSON.stringify(document.title)}
type: ${document.type}
status: ${document.status}
order: ${document.order}
---

${firstHeading}${trimmed}`;
}

function titleFromPath(relativePath: string): string {
	const basename = path.posix.basename(relativePath, path.posix.extname(relativePath));
	return basename
		.replace(/^index$/i, 'Overview')
		.replace(/[-_]+/g, ' ')
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferDocumentType(relativePath: string): PinakeDocumentType {
	const lower = relativePath.toLowerCase();
	if (lower.includes('adr-')) {
		return 'adr';
	}

	if (lower.includes('changelog')) {
		return 'changelog';
	}

	if (lower.includes('roadmap')) {
		return 'roadmap';
	}

	if (lower.includes('glossary')) {
		return 'glossary';
	}

	if (lower.includes('testing')) {
		return 'testing';
	}

	if (lower.includes('deployment') || lower.includes('monitoring') || lower.includes('logging') || lower.includes('backup')) {
		return 'runbook';
	}

	if (lower.includes('architecture') || lower.includes('containers') || lower.includes('context')) {
		return 'architecture';
	}

	if (lower.includes('overview') || lower.endsWith('index.md')) {
		return 'overview';
	}

	return 'reference';
}

function slug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function shouldSkipLegacyEntry(name: string, isRootEntry: boolean): boolean {
	return isRootEntry && (name === pinakeManifestFileName || name === pinakeStateDirectoryName || name === '.pinake' || name === pinakeGitignoreFileName);
}

async function readStandaloneValidatorScript(): Promise<string> {
	return fs.readFile(path.join(__dirname, '..', '..', 'scripts', 'validate-pinake.mjs'), 'utf8');
}

function createPinakeValidationWorkflow(): string {
	return `name: Pinake validation

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  validate-pinake:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Validate Pinake
        run: node .pinake/tools/validate-pinake.mjs --format github
`;
}

function isPinakeModuleId(value: string): value is PinakeModuleId {
	return [
		'overview',
		'gettingStarted',
		'development',
		'decisions',
		'architecture',
		'quality',
		'operations',
		'projectManagement',
		'reference',
	].includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getLegacyProjectName(value: unknown): string | undefined {
	if (!isRecord(value) || typeof value.name !== 'string' || value.name.trim().length === 0) {
		return undefined;
	}

	return value.name.trim();
}

function getLegacyModuleSelection(value: unknown): [string, boolean][] {
	if (!isRecord(value) || !Array.isArray(value.modules)) {
		return [];
	}

	return value.modules
		.filter(isLegacyModuleEntry)
		.map((entry) => [entry.id, entry.enabled]);
}

function isLegacyModuleEntry(value: unknown): value is { id: string; enabled: boolean } {
	return isRecord(value) && typeof value.id === 'string' && typeof value.enabled === 'boolean';
}
