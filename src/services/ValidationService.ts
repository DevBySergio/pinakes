import * as path from 'path';
import * as vscode from 'vscode';
import {
	coreDirectoryNames,
	internalStateFileNames,
	pinakeDirectoryName,
	pinakeInternalDirectoryName,
	pinakeManifestFileName,
} from '../constants';
import { moduleDescriptors } from '../modules/moduleDescriptors';
import { createCoreTemplates } from '../templates/coreTemplates';
import { PinakeManifest, ValidationIssue, ValidationResult } from '../types';
import { FileService } from './FileService';
import { ManifestService } from './ManifestService';
import { joinUri } from './uriUtils';

export class ValidationService {
	public constructor(
		private readonly fileService: FileService,
		private readonly manifestService: ManifestService,
	) {}

	public async validate(root: vscode.Uri): Promise<ValidationResult> {
		const issues: ValidationIssue[] = [];
		await this.validateRequiredRootEntries(root, issues);

		const manifest = await this.validateManifest(root, issues);
		await this.validateCoreScaffold(root, issues);
		if (manifest) {
			await this.validateEnabledModules(root, manifest, issues);
		}

		await this.validateAdrNames(root, issues);
		await this.validateMarkdownLinks(root, issues);

		return {
			valid: issues.every((issue) => issue.severity !== 'error'),
			issues,
		};
	}

	private async validateRequiredRootEntries(root: vscode.Uri, issues: ValidationIssue[]): Promise<void> {
		const requiredEntries = [
			pinakeDirectoryName,
			`${pinakeDirectoryName}/${pinakeManifestFileName}`,
			`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.modules}`,
			`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.ui}`,
			`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.indexes}`,
			`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.migrations}`,
			`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.version}`,
		];

		for (const relativePath of requiredEntries) {
			if (!(await this.fileService.exists(joinUri(root, relativePath)))) {
				issues.push({
					severity: 'error',
					message: `Missing required Pinake entry: ${relativePath}.`,
					path: relativePath,
				});
			}
		}
	}

	private async validateManifest(root: vscode.Uri, issues: ValidationIssue[]): Promise<PinakeManifest | undefined> {
		const manifestUri = this.manifestService.getManifestUri(root);
		const manifestRelativePath = `${pinakeDirectoryName}/${pinakeManifestFileName}`;
		if (!(await this.fileService.exists(manifestUri))) {
			return undefined;
		}

		try {
			const value = JSON.parse(await this.fileService.readText(manifestUri)) as unknown;
			const manifestIssues = this.manifestService.validateManifestShape(value);
			for (const message of manifestIssues) {
				issues.push({
					severity: 'error',
					message,
					path: manifestRelativePath,
				});
			}

			if (manifestIssues.length > 0) {
				return undefined;
			}

			return value as PinakeManifest;
		} catch (error) {
			issues.push({
				severity: 'error',
				message: `pinake.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`,
				path: manifestRelativePath,
			});
			return undefined;
		}
	}

	private async validateCoreScaffold(root: vscode.Uri, issues: ValidationIssue[]): Promise<void> {
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		for (const directoryName of coreDirectoryNames) {
			const relativePath = `${pinakeDirectoryName}/${directoryName}`;
			if (!(await this.fileService.isDirectory(vscode.Uri.joinPath(pinakeDirectory, directoryName)))) {
				issues.push({
					severity: 'error',
					message: `Missing required core directory: ${relativePath}.`,
					path: relativePath,
				});
			}
		}

		for (const template of createCoreTemplates('Project')) {
			const relativePath = `${pinakeDirectoryName}/${template.relativePath}`;
			if (!(await this.fileService.exists(joinUri(pinakeDirectory, template.relativePath)))) {
				issues.push({
					severity: 'warning',
					message: `Missing recommended core document: ${relativePath}.`,
					path: relativePath,
				});
			}
		}
	}

	private async validateEnabledModules(root: vscode.Uri, manifest: PinakeManifest, issues: ValidationIssue[]): Promise<void> {
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		const descriptorById = new Map(moduleDescriptors.map((descriptor) => [descriptor.id, descriptor]));

		for (const moduleEntry of manifest.modules.filter((entry) => entry.enabled)) {
			const descriptor = descriptorById.get(moduleEntry.id);
			if (!descriptor) {
				issues.push({
					severity: 'warning',
					message: `Unknown enabled module in pinake.json: ${moduleEntry.id}.`,
					path: `${pinakeDirectoryName}/${pinakeManifestFileName}`,
				});
				continue;
			}

			if (!(await this.fileService.isDirectory(joinUri(pinakeDirectory, descriptor.rootFolder)))) {
				issues.push({
					severity: 'error',
					message: `Enabled module "${descriptor.id}" is missing folder ${pinakeDirectoryName}/${descriptor.rootFolder}.`,
					path: `${pinakeDirectoryName}/${descriptor.rootFolder}`,
				});
			}
		}
	}

	private async validateAdrNames(root: vscode.Uri, issues: ValidationIssue[]): Promise<void> {
		const decisionsDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName, '06_Decisions');
		if (!(await this.fileService.exists(decisionsDirectory))) {
			return;
		}

		const entries = await this.fileService.readDirectory(decisionsDirectory);
		for (const [name, type] of entries) {
			if ((type & vscode.FileType.File) === 0 || !name.toLowerCase().endsWith('.md')) {
				continue;
			}

			if (!/^ADR-\d{4}-.+\.md$/.test(name)) {
				issues.push({
					severity: 'warning',
					message: `ADR file should match ADR-####-*.md: ${name}.`,
					path: `${pinakeDirectoryName}/06_Decisions/${name}`,
				});
			}
		}
	}

	private async validateMarkdownLinks(root: vscode.Uri, issues: ValidationIssue[]): Promise<void> {
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		const files = await this.collectMarkdownFiles(pinakeDirectory, []);
		for (const relativePath of files) {
			const fileUri = joinUri(pinakeDirectory, relativePath);
			const content = await this.fileService.readText(fileUri);
			for (const target of extractMarkdownLinkTargets(content)) {
				const resolved = resolveMarkdownLink(pinakeDirectory, relativePath, target);
				if (!resolved || await this.fileService.exists(resolved)) {
					continue;
				}

				issues.push({
					severity: 'warning',
					message: `Broken Markdown link "${target}" in ${pinakeDirectoryName}/${relativePath}.`,
					path: `${pinakeDirectoryName}/${relativePath}`,
				});
			}
		}
	}

	private async collectMarkdownFiles(directory: vscode.Uri, relativeSegments: string[]): Promise<string[]> {
		if (!(await this.fileService.exists(directory))) {
			return [];
		}

		const entries = await this.fileService.readDirectory(directory);
		const files: string[] = [];
		for (const [name, type] of entries) {
			if (name === pinakeInternalDirectoryName) {
				continue;
			}

			const nextSegments = [...relativeSegments, name];
			if ((type & vscode.FileType.Directory) !== 0) {
				files.push(...await this.collectMarkdownFiles(vscode.Uri.joinPath(directory, name), nextSegments));
			} else if ((type & vscode.FileType.File) !== 0 && name.toLowerCase().endsWith('.md')) {
				files.push(nextSegments.join('/'));
			}
		}

		return files;
	}
}

function extractMarkdownLinkTargets(content: string): string[] {
	const targets: string[] = [];
	const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;
	let match = linkPattern.exec(content);
	while (match) {
		const target = match[1]?.trim();
		if (target && !target.startsWith('#') && !/^(https?:|mailto:|tel:)/i.test(target)) {
			targets.push(target);
		}

		match = linkPattern.exec(content);
	}

	return targets;
}

function resolveMarkdownLink(pinakeDirectory: vscode.Uri, sourceRelativePath: string, rawTarget: string): vscode.Uri | undefined {
	const withoutAnchor = rawTarget.split('#')[0]?.split('?')[0];
	if (!withoutAnchor || withoutAnchor.length === 0) {
		return undefined;
	}

	let decodedTarget: string;
	try {
		decodedTarget = decodeURIComponent(withoutAnchor);
	} catch {
		decodedTarget = withoutAnchor;
	}

	if (decodedTarget.startsWith('/')) {
		return joinUri(pinakeDirectory, decodedTarget.replace(/^\/?Pinake\//, '').replace(/^\//, ''));
	}

	const sourceDirectory = path.posix.dirname(sourceRelativePath);
	const normalized = path.posix.normalize(path.posix.join(sourceDirectory, decodedTarget));
	if (normalized.startsWith('..')) {
		return undefined;
	}

	return joinUri(pinakeDirectory, normalized);
}
