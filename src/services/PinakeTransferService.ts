import * as path from 'path';
import * as vscode from 'vscode';
import { pinakeDirectoryName, pinakeDocsDirectoryName, pinakeManifestFileName } from '../constants';
import { PinakeDocumentDefinition, PinakeDocumentType, PinakeManifest, ScaffoldResult } from '../types';
import { FileService } from './FileService';
import { IndexService } from './IndexService';
import { ManifestService } from './ManifestService';
import { isUriInside, joinUri, toWorkspaceRelative } from './uriUtils';

export interface PinakeExportResult extends ScaffoldResult {
	targetPath: string;
}

export interface PinakeImportResult extends ScaffoldResult {
	importedCount: number;
	sourceCount: number;
}

export class PinakeTransferService {
	public constructor(
		private readonly fileService: FileService,
		private readonly manifestService: ManifestService,
		private readonly indexService: IndexService,
	) {}

	public async exportWorkspace(root: vscode.Uri, destinationDirectory: vscode.Uri): Promise<PinakeExportResult> {
		const manifest = await this.requireManifest(root);
		const docsDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeDocsDirectoryName);
		if (!(await this.fileService.isDirectory(docsDirectory))) {
			throw new Error('Pinake docs directory not found. Create or repair Pinake first.');
		}

		const exportDirectory = vscode.Uri.joinPath(destinationDirectory, `pinake-export-${slug(manifest.project.name || path.basename(root.fsPath))}`);
		if (isUriInside(docsDirectory, exportDirectory)) {
			throw new Error('Choose an export destination outside .pinake/docs.');
		}

		const result = createEmptyExportResult(exportDirectory.fsPath);
		await this.ensureDirectoryTracked(exportDirectory, path.posix.basename(exportDirectory.path), result);
		await this.ensureDirectoryTracked(vscode.Uri.joinPath(exportDirectory, pinakeDocsDirectoryName), `${path.posix.basename(exportDirectory.path)}/${pinakeDocsDirectoryName}`, result);

		await this.copyDirectoryContents(
			docsDirectory,
			vscode.Uri.joinPath(exportDirectory, pinakeDocsDirectoryName),
			[path.posix.basename(exportDirectory.path), pinakeDocsDirectoryName],
			result,
		);

		const exportedManifest: PinakeManifest = {
			...manifest,
			storage: {
				...manifest.storage,
				root: pinakeDocsDirectoryName,
			},
			documents: manifest.documents.map((document) => ({ ...document })),
		};
		await this.writeJsonTracked(
			vscode.Uri.joinPath(exportDirectory, pinakeManifestFileName),
			exportedManifest,
			`${path.posix.basename(exportDirectory.path)}/${pinakeManifestFileName}`,
			result,
		);
		await this.writeTextTracked(
			vscode.Uri.joinPath(exportDirectory, 'index.html'),
			createStaticIndex(manifest),
			`${path.posix.basename(exportDirectory.path)}/index.html`,
			result,
		);

		return result;
	}

	public async importMarkdownDirectory(root: vscode.Uri, sourceDirectory: vscode.Uri, targetFolder = 'imported'): Promise<PinakeImportResult> {
		const manifest = await this.requireManifest(root);
		const docsDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeDocsDirectoryName);
		await this.fileService.ensureDirectory(docsDirectory);

		const markdownFiles = await this.collectMarkdownFiles(sourceDirectory);
		const result = createEmptyImportResult(markdownFiles.length);
		const importedDocuments: PinakeDocumentDefinition[] = [];
		for (const source of markdownFiles) {
			const sourceRelativePath = toWorkspaceRelative(sourceDirectory, source);
			const targetRelativePath = normalizeRelativePath(`${targetFolder}/${sourceRelativePath}`);
			const target = joinUri(docsDirectory, targetRelativePath);
			const trackedPath = `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${targetRelativePath}`;
			if (await this.fileService.exists(target)) {
				result.skipped.push(trackedPath);
				continue;
			}

			const sourceContent = await this.fileService.readText(source);
			const document = this.createImportedDocument(sourceContent, targetRelativePath, manifest.documents.length + importedDocuments.length + 1);
			await this.fileService.ensureDirectory(target.with({ path: path.posix.dirname(target.path) }));
			await this.fileService.writeText(target, ensureMarkdownFrontmatter(document, sourceContent));
			result.created.push(trackedPath);
			importedDocuments.push(document);
		}

		if (this.manifestService.addDocuments(manifest, importedDocuments)) {
			await this.manifestService.writeManifest(root, manifest);
			result.updated.push(`${pinakeDirectoryName}/${pinakeManifestFileName}`);
		}

		if (importedDocuments.length > 0) {
			await this.indexService.rebuild(root);
			result.updated.push(`${pinakeDirectoryName}/.state/indexes.json`);
		}
		result.importedCount = importedDocuments.length;

		return result;
	}

	private async requireManifest(root: vscode.Uri): Promise<PinakeManifest> {
		const manifest = await this.manifestService.readManifest(root);
		if (!manifest) {
			throw new Error('Pinake manifest not found. Create a Pinake first.');
		}

		return manifest;
	}

	private createImportedDocument(content: string, targetRelativePath: string, order: number): PinakeDocumentDefinition {
		return {
			id: `imported-${slug(targetRelativePath)}`,
			title: extractMarkdownTitle(content) ?? titleFromPath(targetRelativePath),
			path: targetRelativePath,
			type: inferDocumentType(targetRelativePath),
			status: 'draft',
			order,
		};
	}

	private async collectMarkdownFiles(directory: vscode.Uri): Promise<vscode.Uri[]> {
		if (!(await this.fileService.isDirectory(directory))) {
			return [];
		}

		const entries = await this.fileService.readDirectory(directory);
		const files: vscode.Uri[] = [];
		for (const [name, type] of entries) {
			if (shouldSkipImportEntry(name)) {
				continue;
			}

			const uri = vscode.Uri.joinPath(directory, name);
			if ((type & vscode.FileType.Directory) !== 0) {
				files.push(...await this.collectMarkdownFiles(uri));
				continue;
			}

			if ((type & vscode.FileType.File) !== 0 && name.toLowerCase().endsWith('.md')) {
				files.push(uri);
			}
		}

		return files.sort((left, right) => left.path.localeCompare(right.path, undefined, { numeric: true, sensitivity: 'base' }));
	}

	private async copyDirectoryContents(
		sourceDirectory: vscode.Uri,
		targetDirectory: vscode.Uri,
		targetSegments: string[],
		result: ScaffoldResult,
	): Promise<void> {
		const entries = await this.fileService.readDirectory(sourceDirectory);
		for (const [name, type] of entries) {
			const source = vscode.Uri.joinPath(sourceDirectory, name);
			const target = vscode.Uri.joinPath(targetDirectory, name);
			const trackedPath = [...targetSegments, name].join('/');
			if ((type & vscode.FileType.Directory) !== 0) {
				await this.ensureDirectoryTracked(target, trackedPath, result);
				await this.copyDirectoryContents(source, target, [...targetSegments, name], result);
				continue;
			}

			if ((type & vscode.FileType.File) === 0) {
				continue;
			}

			if (await this.fileService.exists(target)) {
				result.skipped.push(trackedPath);
				continue;
			}

			await this.fileService.copy(source, target, false);
			result.created.push(trackedPath);
		}
	}

	private async ensureDirectoryTracked(uri: vscode.Uri, trackedPath: string, result: ScaffoldResult): Promise<void> {
		if (await this.fileService.exists(uri)) {
			return;
		}

		await this.fileService.ensureDirectory(uri);
		result.created.push(trackedPath);
	}

	private async writeJsonTracked(uri: vscode.Uri, value: unknown, trackedPath: string, result: ScaffoldResult): Promise<void> {
		if (await this.fileService.exists(uri)) {
			result.skipped.push(trackedPath);
			return;
		}

		await this.fileService.writeJson(uri, value);
		result.created.push(trackedPath);
	}

	private async writeTextTracked(uri: vscode.Uri, content: string, trackedPath: string, result: ScaffoldResult): Promise<void> {
		if (await this.fileService.writeTextIfMissing(uri, content)) {
			result.created.push(trackedPath);
		} else {
			result.skipped.push(trackedPath);
		}
	}
}

function createEmptyExportResult(targetPath: string): PinakeExportResult {
	return {
		...createEmptyResult(),
		targetPath,
	};
}

function createEmptyImportResult(sourceCount: number): PinakeImportResult {
	return {
		...createEmptyResult(),
		importedCount: 0,
		sourceCount,
	};
}

function createEmptyResult(): ScaffoldResult {
	return {
		created: [],
		skipped: [],
		updated: [],
	};
}

function createStaticIndex(manifest: PinakeManifest): string {
	const items = manifest.documents
		.map((document) => `    <li><a href="docs/${escapeAttribute(document.path)}">${escapeHtml(document.title)}</a> <span>${escapeHtml(document.type)} / ${escapeHtml(document.status)}</span></li>`)
		.join('\n');
	return [
		'<!doctype html>',
		'<html lang="en">',
		'<head>',
		'  <meta charset="utf-8">',
		`  <title>${escapeHtml(manifest.project.name)} Pinake Export</title>`,
		'</head>',
		'<body>',
		`  <h1>${escapeHtml(manifest.project.name)} Pinake Export</h1>`,
		'  <ul>',
		items,
		'  </ul>',
		'</body>',
		'</html>',
		'',
	].join('\n');
}

function ensureMarkdownFrontmatter(document: PinakeDocumentDefinition, content: string): string {
	if (content.trimStart().startsWith('---')) {
		return content;
	}

	const trimmed = content.trimStart();
	const hasHeading = /^#\s+.+$/m.test(trimmed);
	const heading = hasHeading ? '' : `# ${document.title}\n\n`;
	return [
		'---',
		`title: ${JSON.stringify(document.title)}`,
		`type: ${document.type}`,
		`status: ${document.status}`,
		`order: ${document.order}`,
		'---',
		'',
		`${heading}${trimmed}`,
	].join('\n');
}

function extractMarkdownTitle(content: string): string | undefined {
	const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
	return heading && heading.length > 0 ? heading : undefined;
}

function titleFromPath(relativePath: string): string {
	const basename = path.posix.basename(relativePath, path.posix.extname(relativePath));
	return basename
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferDocumentType(relativePath: string): PinakeDocumentType {
	const lower = relativePath.toLowerCase();
	if (lower.includes('adr') || lower.includes('decision')) {
		return 'adr';
	}

	if (lower.includes('runbook') || lower.includes('operation')) {
		return 'runbook';
	}

	if (lower.includes('test') || lower.includes('quality')) {
		return 'testing';
	}

	if (lower.includes('architecture')) {
		return 'architecture';
	}

	if (lower.includes('roadmap')) {
		return 'roadmap';
	}

	if (lower.includes('process')) {
		return 'process';
	}

	return 'reference';
}

function normalizeRelativePath(relativePath: string): string {
	return relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function shouldSkipImportEntry(name: string): boolean {
	return name.startsWith('.') || name === 'node_modules';
}

function slug(value: string): string {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized.length > 0 ? normalized : 'pinake';
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function escapeAttribute(value: string): string {
	return escapeHtml(encodeURI(value));
}
