import * as path from 'path';
import * as vscode from 'vscode';
import { coreDirectoryNames, pinakeDirectoryName, pinakeGitignoreFileName, pinakeInternalDirectoryName } from '../constants';
import { moduleDescriptors } from '../modules/moduleDescriptors';
import { createCoreTemplates } from '../templates/coreTemplates';
import { PinakeManifest, PinakeModuleDescriptor, ScaffoldResult, TemplateFile } from '../types';
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

	public async initializePinake(root: vscode.Uri, projectName: string): Promise<ScaffoldResult> {
		const result = createEmptyResult();
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		await this.fileService.ensureDirectory(pinakeDirectory);

		for (const directoryName of coreDirectoryNames) {
			await this.fileService.ensureDirectory(vscode.Uri.joinPath(pinakeDirectory, directoryName));
		}

		await this.writeTemplateFiles(pinakeDirectory, createCoreTemplates(projectName), result);

		let manifest = await this.manifestService.readManifest(root);
		if (!manifest) {
			manifest = this.manifestService.createDefaultManifest(projectName);
			await this.manifestService.writeManifest(root, manifest);
			result.created.push(`${pinakeDirectoryName}/pinake.json`);
		} else {
			result.skipped.push(`${pinakeDirectoryName}/pinake.json`);
		}

		result.created.push(...await this.stateService.ensureInitialState(root, manifest));
		if (await this.ensurePinakeGitignoreEntry(pinakeDirectory)) {
			result.updated.push(`${pinakeDirectoryName}/${pinakeGitignoreFileName}`);
		}

		await this.indexService.rebuild(root);
		return result;
	}

	public async generateModules(root: vscode.Uri, descriptors: PinakeModuleDescriptor[]): Promise<ScaffoldResult> {
		const result = createEmptyResult();
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		await this.fileService.ensureDirectory(pinakeDirectory);

		let manifest = await this.manifestService.readManifest(root);
		if (!manifest) {
			manifest = this.manifestService.createDefaultManifest(path.basename(root.fsPath));
			await this.manifestService.writeManifest(root, manifest);
			result.created.push(`${pinakeDirectoryName}/pinake.json`);
		}

		const expandedDescriptors = this.includeDependencies(descriptors);
		for (const descriptor of expandedDescriptors) {
			await this.fileService.ensureDirectory(joinUri(pinakeDirectory, descriptor.rootFolder));
			await this.writeTemplateFiles(pinakeDirectory, descriptor.files, result);
			if (this.manifestService.ensureModule(manifest, descriptor)) {
				result.updated.push(`${pinakeDirectoryName}/pinake.json:${descriptor.id}`);
			}
		}

		await this.manifestService.writeManifest(root, manifest);
		await this.stateService.ensureInitialState(root, manifest);
		await this.stateService.syncModulesState(root, manifest);
		await this.indexService.rebuild(root);
		return result;
	}

	public async repairPinake(root: vscode.Uri, projectName: string): Promise<ScaffoldResult> {
		const result = await this.initializePinake(root, projectName);
		const manifest = await this.manifestService.readManifest(root);
		if (!manifest) {
			return result;
		}

		const enabledModuleIds = new Set(manifest.modules.filter((moduleEntry) => moduleEntry.enabled).map((moduleEntry) => moduleEntry.id));
		const descriptors = moduleDescriptors.filter((descriptor) => enabledModuleIds.has(descriptor.id));
		if (descriptors.length === 0) {
			return result;
		}

		const moduleResult = await this.generateModules(root, descriptors);
		return mergeResults(result, moduleResult);
	}

	private async writeTemplateFiles(baseDirectory: vscode.Uri, files: TemplateFile[], result: ScaffoldResult): Promise<void> {
		for (const file of files) {
			const uri = joinUri(baseDirectory, file.relativePath);
			const parent = uri.with({ path: path.posix.dirname(uri.path) });
			await this.fileService.ensureDirectory(parent);

			if (await this.fileService.writeTextIfMissing(uri, file.content)) {
				result.created.push(`${pinakeDirectoryName}/${file.relativePath}`);
			} else {
				result.skipped.push(`${pinakeDirectoryName}/${file.relativePath}`);
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

	private async ensurePinakeGitignoreEntry(pinakeDirectory: vscode.Uri): Promise<boolean> {
		const gitignore = vscode.Uri.joinPath(pinakeDirectory, pinakeGitignoreFileName);
		const entry = `${pinakeInternalDirectoryName}/`;
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
}

function createEmptyResult(): ScaffoldResult {
	return {
		created: [],
		skipped: [],
		updated: [],
	};
}

function mergeResults(left: ScaffoldResult, right: ScaffoldResult): ScaffoldResult {
	return {
		created: [...left.created, ...right.created],
		skipped: [...left.skipped, ...right.skipped],
		updated: [...left.updated, ...right.updated],
	};
}
