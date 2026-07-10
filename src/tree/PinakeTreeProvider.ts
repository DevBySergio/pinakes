import * as path from 'path';
import * as vscode from 'vscode';
import { pinakeDirectoryName, pinakeDocsDirectoryName, pinakeManifestFileName, pinakeStateDirectoryName } from '../constants';
import { FileService } from '../services/FileService';
import { StateService } from '../services/StateService';
import { joinUri, toWorkspaceRelative } from '../services/uriUtils';
import { PinakeDocumentDefinition, PinakeManifest, PinakeTreeSortMode, PinakeUiState } from '../types';
import { PinakeNode } from './PinakeNode';

export class PinakeTreeProvider implements vscode.TreeDataProvider<PinakeNode> {
	private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<PinakeNode | undefined | null | void>();
	public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

	public constructor(
		private root: vscode.Uri | undefined,
		private readonly fileService: FileService,
		private readonly stateService: StateService,
	) {}

	public getWorkspaceRoot(): vscode.Uri | undefined {
		return this.root;
	}

	public setWorkspaceRoot(root: vscode.Uri): void {
		this.root = root;
		this.refresh();
	}

	public refresh(): void {
		this.onDidChangeTreeDataEmitter.fire();
	}

	public async getParent(element: PinakeNode): Promise<PinakeNode | undefined> {
		if (element.kind === 'favorites' || element.kind === 'emptyState') {
			return undefined;
		}

		if (element.kind === 'favoriteFile' && this.root) {
			return this.createFavoritesNode(this.getDocsDirectory());
		}

		if (!element.relativePath.includes('/')) {
			return undefined;
		}

		return this.getNodeByRelativePath(path.posix.dirname(element.relativePath));
	}

	public async getNodeByRelativePath(relativePath: string): Promise<PinakeNode | undefined> {
		if (!this.root) {
			return undefined;
		}

		const normalized = normalizeRelativePath(relativePath);
		if (!normalized || normalized.split('/').some((segment) => isHiddenFromPinakeTree(segment))) {
			return undefined;
		}

		const docsDirectory = this.getDocsDirectory();
		const manifest = await this.readManifest();
		const document = manifest?.documents.find((entry) => entry.path === normalized);
		if (document) {
			return this.createDocumentNode(document);
		}

		const hasDocumentBelow = manifest?.documents.some((entry) => entry.path.startsWith(`${normalized}/`));
		if (hasDocumentBelow) {
			return this.createDirectoryNode(normalized, docsDirectory);
		}

		const uri = joinUri(docsDirectory, normalized);
		if (!(await this.fileService.exists(uri))) {
			return undefined;
		}

		return {
			uri,
			label: path.posix.basename(normalized),
			relativePath: normalized,
			kind: await this.fileService.isDirectory(uri) ? 'directory' : 'file',
		};
	}

	public getTreeItem(element: PinakeNode): vscode.TreeItem {
		const collapsibleState = getCollapsibleState(element);
		const item = new vscode.TreeItem(element.label, collapsibleState);
		if (element.kind !== 'favorites' && element.kind !== 'emptyState') {
			item.resourceUri = element.uri;
		}
		item.contextValue = getContextValue(element);
		item.tooltip = this.getTooltip(element);
		item.iconPath = this.getIcon(element);

		if (element.kind === 'file') {
			item.description = element.document
				? `${formatDocumentType(element.document.type)} - ${formatDocumentStatus(element.document.status)}`
				: undefined;
		}

		if (element.kind === 'favoriteFile') {
			item.description = element.sourceRelativePath ?? element.relativePath;
		}

		if (element.kind === 'emptyState') {
			item.description = getEmptyStateDescription(element);
			item.command = getEmptyStateCommand(element);
		}

		if (element.kind === 'file' || element.kind === 'favoriteFile') {
			item.command = {
				command: 'pinake.openPreview',
				title: 'Open Preview',
				arguments: [element],
			};
		}

		return item;
	}

	public async getChildren(element?: PinakeNode): Promise<PinakeNode[]> {
		if (!this.root) {
			return [this.createEmptyStateNode('noWorkspace')];
		}

		if (element?.kind === 'favorites') {
			return this.getFavoriteChildren();
		}

		if (element?.kind === 'file' || element?.kind === 'favoriteFile' || element?.kind === 'emptyState') {
			return [];
		}

		const state = await this.stateService.readUiState(this.root);
		const sortMode = state.sortMode ?? 'foldersFirst';
		const manifest = await this.readManifest();
		const manifestChildren = this.getManifestChildren(element?.relativePath ?? '', sortMode, manifest);
		const filesystemChildren = await this.getFilesystemChildren(element, sortMode);
		const children = manifestChildren.length > 0
			? mergeFilesystemDirectories(manifestChildren, filesystemChildren, sortMode)
			: filesystemChildren;

		if (!element) {
			const favoriteChildren = await this.getFavoriteChildren(state, manifest ?? null);
			const rootChildren = favoriteChildren.length > 0
				? [this.createFavoritesNode(this.getDocsDirectory()), ...children]
				: children;
			if (rootChildren.length > 0) {
				return rootChildren;
			}

			return [await this.createRootEmptyStateNode()];
		}

		return children;
	}

	private getDocsDirectory(): vscode.Uri {
		if (!this.root) {
			throw new Error('Pinake tree requires a workspace root.');
		}

		return vscode.Uri.joinPath(this.root, pinakeDirectoryName, pinakeDocsDirectoryName);
	}

	private async readManifest(): Promise<PinakeManifest | undefined> {
		if (!this.root) {
			return undefined;
		}

		try {
			return await this.fileService.readJson<PinakeManifest>(vscode.Uri.joinPath(this.root, pinakeDirectoryName, pinakeManifestFileName));
		} catch {
			return undefined;
		}
	}

	private getManifestChildren(
		parentRelativePath: string,
		sortMode: PinakeTreeSortMode,
		manifest: PinakeManifest | undefined,
	): PinakeNode[] {
		if (!manifest || manifest.documents.length === 0) {
			return [];
		}

		const normalizedParent = normalizeRelativePath(parentRelativePath);
		const directories = new Map<string, PinakeNode>();
		const files: PinakeNode[] = [];
		for (const document of manifest.documents) {
			const documentPath = normalizeRelativePath(document.path);
			if (!isDirectOrNestedChild(normalizedParent, documentPath)) {
				continue;
			}

			const remaining = normalizedParent.length > 0
				? documentPath.slice(normalizedParent.length + 1)
				: documentPath;
			const [firstSegment] = remaining.split('/');
			if (!firstSegment) {
				continue;
			}

			if (!remaining.includes('/')) {
				files.push(this.createDocumentNode(document));
				continue;
			}

			const directoryPath = normalizedParent.length > 0 ? `${normalizedParent}/${firstSegment}` : firstSegment;
			if (!directories.has(directoryPath)) {
				directories.set(directoryPath, this.createDirectoryNode(directoryPath, this.getDocsDirectory()));
			}
		}

		return [...directories.values(), ...files].sort((left, right) => compareNodes(left, right, sortMode));
	}

	private async getFilesystemChildren(element: PinakeNode | undefined, sortMode: PinakeTreeSortMode): Promise<PinakeNode[]> {
		const docsDirectory = this.getDocsDirectory();
		const directory = element?.uri ?? docsDirectory;
		if (!(await this.fileService.isDirectory(directory))) {
			return [];
		}

		const entries = await this.fileService.readDirectory(directory);
		return entries
			.filter(([name]) => !isHiddenFromPinakeTree(name))
			.filter(([, type]) => (type & (vscode.FileType.Directory | vscode.FileType.File)) !== 0)
			.map(([name, type]) => {
				const uri = vscode.Uri.joinPath(directory, name);
				const kind: PinakeNode['kind'] = (type & vscode.FileType.Directory) !== 0 ? 'directory' : 'file';
				return {
					uri,
					label: name,
					relativePath: toWorkspaceRelative(docsDirectory, uri),
					kind,
				};
			})
			.sort((left, right) => compareNodes(left, right, sortMode));
	}

	private createDocumentNode(document: PinakeDocumentDefinition): PinakeNode {
		return {
			uri: joinUri(this.getDocsDirectory(), document.path),
			label: document.title,
			relativePath: document.path,
			kind: 'file',
			document,
		};
	}

	private createDirectoryNode(relativePath: string, docsDirectory: vscode.Uri): PinakeNode {
		return {
			uri: joinUri(docsDirectory, relativePath),
			label: path.posix.basename(relativePath),
			relativePath,
			kind: 'directory',
		};
	}

	private async createRootEmptyStateNode(): Promise<PinakeNode> {
		if (!this.root) {
			return this.createEmptyStateNode('noWorkspace');
		}

		const pinakeDirectory = vscode.Uri.joinPath(this.root, pinakeDirectoryName);
		const docsDirectory = this.getDocsDirectory();
		if (!(await this.fileService.exists(pinakeDirectory))) {
			return this.createEmptyStateNode('createPinake');
		}

		if (!(await this.fileService.isDirectory(docsDirectory))) {
			return this.createEmptyStateNode('createPinake');
		}

		return this.createEmptyStateNode('emptyDocs');
	}

	private createEmptyStateNode(emptyState: NonNullable<PinakeNode['emptyState']>): PinakeNode {
		return {
			uri: vscode.Uri.from({ scheme: 'pinake', path: `/empty/${emptyState}` }),
			label: getEmptyStateLabel(emptyState),
			relativePath: `__empty__/${emptyState}`,
			kind: 'emptyState',
			emptyState,
		};
	}

	private getTooltip(element: PinakeNode): string {
		if (element.kind === 'emptyState') {
			return getEmptyStateTooltip(element);
		}

		if (element.kind === 'favorites') {
			return 'Favorited Pinake documents';
		}

		if (element.document) {
			return [
				element.document.title,
				element.relativePath,
				`Type: ${formatDocumentType(element.document.type)}`,
				`Status: ${formatDocumentStatus(element.document.status)}`,
			].join('\n');
		}

		if (element.kind === 'directory') {
			return `Folder\n${element.relativePath}`;
		}

		return element.sourceRelativePath ?? element.relativePath;
	}

	private getIcon(element: PinakeNode): vscode.ThemeIcon {
		if (element.kind === 'emptyState') {
			return new vscode.ThemeIcon(getEmptyStateIcon(element));
		}

		if (element.kind === 'favorites') {
			return new vscode.ThemeIcon('star-full');
		}

		if (element.kind === 'file' || element.kind === 'favoriteFile') {
			if (element.relativePath.toLowerCase().endsWith('.md')) {
				return new vscode.ThemeIcon(element.kind === 'favoriteFile' ? 'star-full' : 'markdown');
			}

			if (element.relativePath.toLowerCase().endsWith('.json')) {
				return new vscode.ThemeIcon('json');
			}

			return new vscode.ThemeIcon('file');
		}

		const iconByFolder = new Map<string, string>([
			['00_overview', 'book'],
			['00_Overview', 'book'],
			['01_getting-started', 'rocket'],
			['01_GettingStarted', 'rocket'],
			['02_development', 'tools'],
			['03_Development', 'tools'],
			['03_decisions', 'git-pull-request'],
			['06_Decisions', 'git-pull-request'],
			['04_architecture', 'type-hierarchy-sub'],
			['02_Architecture', 'type-hierarchy-sub'],
			['05_quality', 'checklist'],
			['04_Quality', 'checklist'],
			['06_operations', 'server-process'],
			['05_Operations', 'server-process'],
			['07_project-management', 'timeline-view-icon'],
			['07_ProjectManagement', 'timeline-view-icon'],
			['99_appendix', 'references'],
			['99_Appendix', 'references'],
			['API', 'symbol-interface'],
			['Database', 'database'],
			['Docker', 'package'],
			['Kubernetes', 'cloud'],
			['CI-CD', 'repo-forked'],
			['Frontend', 'browser'],
			['Mobile', 'device-mobile'],
			['Authentication', 'lock'],
			['Backend', 'server-process'],
			['gRPC', 'symbol-method'],
			['GraphQL', 'symbol-interface'],
			['WebSocket', 'radio-tower'],
			['Cache', 'database'],
			['MessageQueue', 'list-tree'],
			['OAuth', 'key'],
			['Authorization', 'shield'],
			['Payments', 'credit-card'],
			['Monitoring', 'pulse'],
			['Logging', 'output'],
			['Security', 'shield'],
			['CLI', 'terminal'],
			['SDK', 'package'],
			['PluginExtension', 'extensions'],
		]);

		return new vscode.ThemeIcon(iconByFolder.get(element.label) ?? 'folder');
	}

	private async getFavoriteChildren(state?: PinakeUiState, manifest?: PinakeManifest | null): Promise<PinakeNode[]> {
		if (!this.root) {
			return [];
		}

		const activeState = state ?? (await this.stateService.readUiState(this.root));
		const activeManifest = manifest === undefined ? await this.readManifest() : manifest;
		const documentsByPath = new Map((activeManifest?.documents ?? []).map((document) => [document.path, document]));
		const favorites: PinakeNode[] = [];
		for (const relativePath of activeState.favorites) {
			const normalized = normalizeRelativePath(relativePath);
			if (!normalized || normalized.split('/').some((segment) => isHiddenFromPinakeTree(segment))) {
				continue;
			}

			const document = documentsByPath.get(normalized);
			const node = document
				? this.createDocumentNode(document)
				: await this.getLooseFavoriteFileNode(normalized);
			if (!node) {
				continue;
			}

			favorites.push({
				...node,
				kind: 'favoriteFile',
				sourceRelativePath: node.relativePath,
			});
		}

		return favorites.sort((left, right) => {
			const labelOrder = left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: 'base' });
			return labelOrder !== 0
				? labelOrder
				: left.relativePath.localeCompare(right.relativePath, undefined, { numeric: true, sensitivity: 'base' });
		});
	}

	private async getLooseFavoriteFileNode(relativePath: string): Promise<PinakeNode | undefined> {
		const uri = joinUri(this.getDocsDirectory(), relativePath);
		if (!(await this.fileService.exists(uri)) || await this.fileService.isDirectory(uri)) {
			return undefined;
		}

		return {
			uri,
			label: path.posix.basename(relativePath),
			relativePath,
			kind: 'file',
		};
	}

	private createFavoritesNode(docsDirectory: vscode.Uri): PinakeNode {
		return {
			uri: docsDirectory,
			label: 'Favorites',
			relativePath: '__favorites__',
			kind: 'favorites',
		};
	}
}

function isHiddenFromPinakeTree(name: string): boolean {
	return name === pinakeStateDirectoryName || name === pinakeManifestFileName || name === '.gitignore';
}

function normalizeRelativePath(relativePath: string): string {
	return relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function isDirectOrNestedChild(parentRelativePath: string, documentPath: string): boolean {
	return parentRelativePath.length === 0 || documentPath.startsWith(`${parentRelativePath}/`);
}

function getCollapsibleState(element: PinakeNode): vscode.TreeItemCollapsibleState {
	if (element.kind === 'favorites') {
		return vscode.TreeItemCollapsibleState.Expanded;
	}

	return element.kind === 'directory'
		? vscode.TreeItemCollapsibleState.Collapsed
		: vscode.TreeItemCollapsibleState.None;
}

function getContextValue(element: PinakeNode): string {
	if (element.kind === 'emptyState') {
		return `pinakeEmptyState.${element.emptyState ?? 'unknown'}`;
	}

	if (element.kind === 'file') {
		return 'pinakeDocument';
	}

	if (element.kind === 'favoriteFile') {
		return 'favoritePinakeDocument';
	}

	return element.kind;
}

function getEmptyStateLabel(emptyState: NonNullable<PinakeNode['emptyState']>): string {
	if (emptyState === 'noWorkspace') {
		return 'Open a workspace folder';
	}

	if (emptyState === 'createPinake') {
		return 'Create Pinake documentation';
	}

	return 'No Pinake documents yet';
}

function getEmptyStateDescription(element: PinakeNode): string | undefined {
	if (element.emptyState === 'noWorkspace') {
		return 'Pinake needs a workspace';
	}

	if (element.emptyState === 'createPinake') {
		return 'Run Pinake: Create Documentation';
	}

	if (element.emptyState === 'emptyDocs') {
		return 'Create a Markdown file';
	}

	return undefined;
}

function getEmptyStateTooltip(element: PinakeNode): string {
	if (element.emptyState === 'noWorkspace') {
		return 'Open a workspace folder to create or browse Pinake documentation.';
	}

	if (element.emptyState === 'createPinake') {
		return 'Create a local .pinake/docs workspace for project documentation.';
	}

	if (element.emptyState === 'emptyDocs') {
		return 'No documents were found under .pinake/docs. Create a Markdown file or run Pinake repair.';
	}

	return element.label;
}

function getEmptyStateCommand(element: PinakeNode): vscode.Command | undefined {
	if (element.emptyState === 'createPinake') {
		return {
			command: 'pinake.create',
			title: 'Create Pinake Documentation',
		};
	}

	if (element.emptyState === 'emptyDocs') {
		return {
			command: 'pinakes.newFile',
			title: 'New Markdown File',
		};
	}

	return undefined;
}

function getEmptyStateIcon(element: PinakeNode): string {
	if (element.emptyState === 'noWorkspace') {
		return 'folder-opened';
	}

	if (element.emptyState === 'createPinake') {
		return 'add';
	}

	return 'new-file';
}

function formatDocumentType(type: string): string {
	if (type === 'adr') {
		return 'ADR';
	}

	return type
		.split('-')
		.map((part) => part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
		.join(' ');
}

function formatDocumentStatus(status: string): string {
	return status
		.split('-')
		.map((part) => part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
		.join(' ');
}

function compareNodes(left: PinakeNode, right: PinakeNode, sortMode: PinakeTreeSortMode): number {
	if (sortMode === 'foldersFirst') {
		const leftIsDirectory = left.kind === 'directory';
		const rightIsDirectory = right.kind === 'directory';
		if (leftIsDirectory !== rightIsDirectory) {
			return leftIsDirectory ? -1 : 1;
		}
	}

	const labelOrder = left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: 'base' });
	return sortMode === 'nameDesc' ? -labelOrder : labelOrder;
}

function mergeFilesystemDirectories(manifestChildren: PinakeNode[], filesystemChildren: PinakeNode[], sortMode: PinakeTreeSortMode): PinakeNode[] {
	const childrenByPath = new Map(manifestChildren.map((node) => [node.relativePath, node]));
	for (const filesystemChild of filesystemChildren) {
		if (filesystemChild.kind !== 'directory' || childrenByPath.has(filesystemChild.relativePath)) {
			continue;
		}

		childrenByPath.set(filesystemChild.relativePath, filesystemChild);
	}

	return Array.from(childrenByPath.values()).sort((left, right) => compareNodes(left, right, sortMode));
}
