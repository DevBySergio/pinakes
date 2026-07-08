import * as path from 'path';
import * as vscode from 'vscode';
import { legacyPinakeDirectoryName, pinakeDirectoryName, pinakeDocsDirectoryName } from '../constants';
import { moduleDescriptors, modulePresets } from '../modules/moduleDescriptors';
import { FileService } from '../services/FileService';
import {
	formatNoSearchResultsMessage,
	formatPropertiesReport,
	formatSearchResultItem,
	formatValidationReport,
} from '../services/FeedbackFormatter';
import { IndexService } from '../services/IndexService';
import { ManifestService } from '../services/ManifestService';
import { ScaffoldService } from '../services/ScaffoldService';
import { StateService } from '../services/StateService';
import { ValidationService } from '../services/ValidationService';
import { WorkspaceService } from '../services/WorkspaceService';
import {
	PinakeDocumentDefinition,
	PinakeDocumentType,
	PinakeModuleDescriptor,
	PinakeModuleId,
	PinakeTemplateDefinition,
	PinakeTreeSortMode,
	ScaffoldResult,
	ValidationResult,
} from '../types';
import { PinakeNode } from '../tree/PinakeNode';
import { PinakeTreeProvider } from '../tree/PinakeTreeProvider';
import { joinUri, toWorkspaceRelative } from '../services/uriUtils';
import {
	allPinakeModuleIds,
	getPinakeModuleDefinition,
	pinakeTemplateDefinitions,
} from '../templates/pinakeTemplates';

export class PinakesCommands {
	public constructor(
		private readonly workspaceService: WorkspaceService,
		private readonly fileService: FileService,
		private readonly manifestService: ManifestService,
		private readonly scaffoldService: ScaffoldService,
		private readonly validationService: ValidationService,
		private readonly indexService: IndexService,
		private readonly stateService: StateService,
		private readonly treeProvider: PinakeTreeProvider,
		private readonly outputChannel: vscode.OutputChannel,
	) {}

	public async createPinake(): Promise<void> {
		const root = await this.workspaceService.pickWorkspaceRoot();
		if (!root) {
			vscode.window.showErrorMessage('Open a workspace folder before using Pinake.');
			return;
		}

		const template = await this.pickDocumentationTemplate();
		if (!template) {
			return;
		}

		const moduleIds = await this.pickTemplateModules(template);
		if (!moduleIds) {
			return;
		}

		const hiddenFromExplorer = await this.pickExplorerVisibility();
		if (hiddenFromExplorer === undefined) {
			return;
		}

		const migrateLegacy = await this.resolveLegacyPinakeMigration(root);
		if (migrateLegacy === undefined) {
			return;
		}

		if (!(await this.confirmExistingPinakeUpdate(root))) {
			return;
		}

		try {
			const result = await this.scaffoldService.initializePinake(root, {
				projectName: this.workspaceService.getDefaultProjectName(root),
				templateId: template.id,
				moduleIds,
				hiddenFromExplorer,
				migrateLegacy,
			});
			this.treeProvider.setWorkspaceRoot(root);
			this.showScaffoldSummary('Pinake created', result);
		} catch (error) {
			this.outputChannel.appendLine(`Create Pinake failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
			vscode.window.showErrorMessage(`Pinake setup failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public refresh(): void {
		this.treeProvider.refresh();
	}

	public async openFile(node?: PinakeNode): Promise<void> {
		await this.openPreview(node);
	}

	public async openPreview(node?: PinakeNode): Promise<void> {
		const uri = await this.resolveFileUri(node);
		if (!uri) {
			return;
		}

		await vscode.commands.executeCommand('markdown.showPreview', uri);
		await this.recordLastOpened(uri);
	}

	public async openFileSide(node?: PinakeNode): Promise<void> {
		await this.editDocument(node);
	}

	public async editDocument(node?: PinakeNode): Promise<void> {
		const uri = await this.resolveFileUri(node);
		if (!uri) {
			return;
		}

		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document, {
			preview: false,
			preserveFocus: false,
		});
		await this.recordLastOpened(uri);
	}

	public async openManifest(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const uri = vscode.Uri.joinPath(root, pinakeDirectoryName, 'pinake.json');
		if (!(await this.fileService.exists(uri))) {
			vscode.window.showWarningMessage('Pinake manifest not found. Create a Pinake first.');
			return;
		}

		await vscode.window.showTextDocument(uri, { preview: true, preserveFocus: false });
		await this.recordLastOpened(uri);
	}

	public async duplicate(node?: PinakeNode): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const source = this.resolvePinakeItemUri(root, node, 'duplicate');
		if (!source) {
			return;
		}

		const target = await this.createDuplicateTarget(source);
		const sourceRelativePath = this.toPinakeRelativePath(root, source);
		await this.fileService.copy(source, target, false);
		let indexedIncrementally = false;
		if (!(await this.fileService.isDirectory(target)) && target.path.toLowerCase().endsWith('.md')) {
			const targetRelativePath = this.toPinakeRelativePath(root, target);
			await this.addDocumentToManifest(root, createDocumentDefinition(targetRelativePath, sourceRelativePath));
			await this.indexService.updateDocument(root, targetRelativePath);
			indexedIncrementally = true;
		}
		if (!indexedIncrementally) {
			await this.indexService.rebuild(root);
		}
		this.treeProvider.refresh();
		vscode.window.showInformationMessage(`Duplicated ${path.posix.basename(source.path)}.`);
	}

	public async revealInExplorer(node?: PinakeNode): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const uri = this.resolvePinakeItemUri(root, node, 'reveal');
		if (!uri) {
			return;
		}

		await vscode.commands.executeCommand('revealInExplorer', uri);
	}

	public async copyPath(node?: PinakeNode): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const relativePath = this.resolvePinakeRelativePath(root, node, 'copy the path for');
		if (!relativePath) {
			return;
		}

		await vscode.env.clipboard.writeText(relativePath);
		vscode.window.showInformationMessage(`Copied ${relativePath}.`);
	}

	public async showProperties(node?: PinakeNode): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const uri = this.resolvePinakeItemUri(root, node, 'show properties for');
		if (!uri) {
			return;
		}

		const relativePath = node?.sourceRelativePath ?? (node?.kind === 'file' || node?.kind === 'directory' || node?.kind === 'favoriteFile'
			? node.relativePath
			: this.toPinakeRelativePath(root, uri));
		const stat = await this.fileService.stat(uri);
		const type = (stat.type & vscode.FileType.Directory) !== 0 ? 'Directory' : 'File';
		this.outputChannel.clear();
		for (const line of formatPropertiesReport({
			name: path.posix.basename(uri.path),
			type,
			relativePath,
			fullPath: uri.fsPath,
			size: formatBytes(stat.size),
			created: formatTimestamp(stat.ctime),
			modified: formatTimestamp(stat.mtime),
			document: node?.document,
		})) {
			this.outputChannel.appendLine(line);
		}
		this.outputChannel.show(true);
	}

	public async sortChildren(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const selected = await vscode.window.showQuickPick(
			[
				{
					label: 'Folders first',
					description: 'Directories first, then files A-Z.',
					sortMode: 'foldersFirst' as PinakeTreeSortMode,
				},
				{
					label: 'Name A-Z',
					description: 'Files and directories mixed by name.',
					sortMode: 'nameAsc' as PinakeTreeSortMode,
				},
				{
					label: 'Name Z-A',
					description: 'Files and directories mixed by reverse name.',
					sortMode: 'nameDesc' as PinakeTreeSortMode,
				},
			],
			{
				title: 'Sort Pinake Children',
				placeHolder: 'Choose the tree ordering mode',
			},
		);
		if (!selected) {
			return;
		}

		await this.stateService.recordSortMode(root, selected.sortMode);
		this.treeProvider.refresh();
		vscode.window.showInformationMessage(`Pinake tree sorting set to ${selected.label}.`);
	}

	public async addFavorite(node?: PinakeNode): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const relativePath = this.resolveFavoriteRelativePath(root, node);
		if (!relativePath) {
			return;
		}

		const changed = await this.stateService.addFavorite(root, relativePath);
		this.treeProvider.refresh();
		vscode.window.showInformationMessage(changed
			? `Added ${path.posix.basename(relativePath)} to Pinake favorites.`
			: `${path.posix.basename(relativePath)} is already in Pinake favorites.`);
	}

	public async removeFavorite(node?: PinakeNode): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const relativePath = this.resolveFavoriteRelativePath(root, node);
		if (!relativePath) {
			return;
		}

		const changed = await this.stateService.removeFavorite(root, relativePath);
		this.treeProvider.refresh();
		vscode.window.showInformationMessage(changed
			? `Removed ${path.posix.basename(relativePath)} from Pinake favorites.`
			: `${path.posix.basename(relativePath)} is not in Pinake favorites.`);
	}

	public async newFile(node?: PinakeNode): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const parent = await this.resolveTargetDirectory(root, node);
		if (!parent) {
			return;
		}
		await this.fileService.ensureDirectory(parent);

		const name = await vscode.window.showInputBox({
			title: 'New Pinake Markdown',
			prompt: 'File name',
			value: 'NewDocument.md',
			validateInput: (value) => value.trim().length === 0 ? 'File name is required.' : undefined,
		});
		if (!name) {
			return;
		}

		const normalizedName = name.endsWith('.md') ? name : `${name}.md`;
		const uri = vscode.Uri.joinPath(parent, normalizedName);
		if (await this.fileService.exists(uri)) {
			vscode.window.showWarningMessage(`File already exists: ${normalizedName}`);
			return;
		}

		const relativePath = this.toPinakeRelativePath(root, uri);
		const document = createDocumentDefinition(relativePath);
		await this.fileService.writeText(uri, createMarkdownContent(document));
		await this.addDocumentToManifest(root, document);
		await this.indexService.updateDocument(root, relativePath);
		this.treeProvider.refresh();
		await vscode.window.showTextDocument(uri, { preview: false });
	}

	public async newFolder(node?: PinakeNode): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const parent = await this.resolveTargetDirectory(root, node);
		if (!parent) {
			return;
		}
		await this.fileService.ensureDirectory(parent);

		const name = await vscode.window.showInputBox({
			title: 'New Pinake Folder',
			prompt: 'Folder name',
			validateInput: (value) => value.trim().length === 0 ? 'Folder name is required.' : undefined,
		});
		if (!name) {
			return;
		}

		const uri = vscode.Uri.joinPath(parent, name.trim());
		if (await this.fileService.exists(uri)) {
			vscode.window.showWarningMessage(`Folder already exists: ${name}`);
			return;
		}

		await this.fileService.ensureDirectory(uri);
		this.treeProvider.refresh();
	}

	public async rename(node?: PinakeNode): Promise<void> {
		if (!node) {
			vscode.window.showWarningMessage('Select a Pinake item to rename.');
			return;
		}

		if (node.kind === 'favorites' || node.kind === 'favoriteFile') {
			vscode.window.showWarningMessage('Rename the original Pinake file or folder.');
			return;
		}

		const nextName = await vscode.window.showInputBox({
			title: 'Rename Pinake Item',
			prompt: 'New name',
			value: node.label,
			validateInput: (value) => value.trim().length === 0 ? 'Name is required.' : undefined,
		});
		if (!nextName || nextName === node.label) {
			return;
		}

		const root = this.treeProvider.getWorkspaceRoot() ?? this.workspaceService.getWorkspaceRoot();
		const oldRelativePath = root ? this.toPinakeRelativePath(root, node.uri) : undefined;
		const target = node.uri.with({ path: path.posix.join(path.posix.dirname(node.uri.path), nextName.trim()) });
		await this.fileService.rename(node.uri, target, false);
		if (root) {
			const nextRelativePath = this.toPinakeRelativePath(root, target);
			await this.renameManifestPath(root, oldRelativePath, nextRelativePath, node.kind === 'directory', path.posix.basename(nextName.trim(), '.md'));
			if (node.kind === 'file' && oldRelativePath) {
				await this.indexService.removeDocument(root, oldRelativePath);
				await this.indexService.updateDocument(root, nextRelativePath);
			} else {
				await this.indexService.rebuild(root);
			}
		}

		this.treeProvider.refresh();
	}

	public async delete(node?: PinakeNode): Promise<void> {
		if (!node) {
			vscode.window.showWarningMessage('Select a Pinake item to delete.');
			return;
		}

		if (node.kind === 'favorites' || node.kind === 'favoriteFile') {
			vscode.window.showWarningMessage('Remove the favorite instead of deleting the virtual tree item.');
			return;
		}

		const answer = await vscode.window.showWarningMessage(
			`Delete ${node.label}?`,
			{ modal: true, detail: 'The item will be moved to the trash when the platform supports it.' },
			'Delete',
		);
		if (answer !== 'Delete') {
			return;
		}

		await this.fileService.delete(node.uri, node.kind === 'directory');
		const root = this.treeProvider.getWorkspaceRoot() ?? this.workspaceService.getWorkspaceRoot();
		if (root) {
			const relativePath = this.toPinakeRelativePath(root, node.uri);
			await this.removeManifestPath(root, relativePath, node.kind === 'directory');
			if (node.kind === 'file') {
				await this.indexService.removeDocument(root, relativePath);
			} else {
				await this.indexService.rebuild(root);
			}
		}

		this.treeProvider.refresh();
	}

	public async generateModule(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const descriptors = await this.pickModules();
		if (descriptors.length === 0) {
			return;
		}

		const result = await this.scaffoldService.generateModules(root, descriptors);
		this.treeProvider.refresh();
		this.showScaffoldSummary('Pinake module generation complete', result);
	}

	public async searchDocumentation(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const query = await vscode.window.showInputBox({
			title: 'Search Pinake Documentation',
			prompt: 'Search paths, headings, tags, and text. Use tag:<name> or heading:<text> to filter.',
			validateInput: (value) => value.trim().length === 0 ? 'Search query is required.' : undefined,
		});
		if (!query) {
			return;
		}

		await this.indexService.rebuild(root);
		const results = await this.indexService.search(root, query);
		if (results.length === 0) {
			vscode.window.showInformationMessage(formatNoSearchResultsMessage(query));
			return;
		}

		const selected = await vscode.window.showQuickPick(
			results.map(formatSearchResultItem),
			{
				title: 'Pinake Search Results',
				placeHolder: 'Open a matching document',
			},
		);
		if (!selected) {
			return;
		}

		const uri = joinUri(this.getDocsDirectory(root), selected.path);
		await vscode.commands.executeCommand('markdown.showPreview', uri);
		await this.recordLastOpened(uri);
	}

	public async repairPinake(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const result = await this.scaffoldService.repairPinake(root, this.workspaceService.getDefaultProjectName(root));
		this.treeProvider.refresh();
		this.showScaffoldSummary('Pinake repaired', result);
	}

	public async upgradePinake(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		try {
			const result = await this.scaffoldService.upgradePinake(root, this.workspaceService.getDefaultProjectName(root));
			this.treeProvider.refresh();
			this.showScaffoldSummary('Pinake upgraded', result);
		} catch (error) {
			this.outputChannel.appendLine(`Upgrade Pinake failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
			vscode.window.showErrorMessage(`Pinake upgrade failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public async generateCiValidation(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		try {
			const result = await this.scaffoldService.generateCiValidation(root);
			this.showScaffoldSummary('Pinake CI validation generated', result);
		} catch (error) {
			this.outputChannel.appendLine(`Generate Pinake CI validation failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
			vscode.window.showErrorMessage(`Pinake CI validation generation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public async validate(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const result = await this.validationService.validate(root);
		this.writeValidationResult(result);
		this.outputChannel.show(true);

		if (result.valid) {
			vscode.window.showInformationMessage('Pinake validation passed.');
		} else {
			vscode.window.showWarningMessage(`Pinake validation found ${result.issues.length} issue(s). See the Pinakes output channel for details.`);
		}
	}

	private async pickDocumentationTemplate(): Promise<PinakeTemplateDefinition | undefined> {
		const selected = await vscode.window.showQuickPick(
			pinakeTemplateDefinitions.map((template, index) => ({
				label: template.title,
				description: index === 0 ? 'Default' : undefined,
				detail: template.description,
				template,
			})),
			{
				title: 'Create Pinake: Select Template',
				placeHolder: 'Choose a documentation template',
			},
		);

		return selected?.template;
	}

	private async pickTemplateModules(template: PinakeTemplateDefinition): Promise<PinakeModuleId[] | undefined> {
		const defaultModuleIds = new Set(template.defaultModules);
		const selected = await vscode.window.showQuickPick(
			allPinakeModuleIds.map((moduleId) => {
				const definition = getPinakeModuleDefinition(template, moduleId);
				return {
					label: definition.title,
					description: definition.folder,
					moduleId,
					picked: defaultModuleIds.has(moduleId),
				};
			}),
			{
				title: 'Create Pinake: Select Modules',
				placeHolder: 'Choose optional documentation modules',
				canPickMany: true,
			},
		);

		return selected?.map((item) => item.moduleId);
	}

	private async pickExplorerVisibility(): Promise<boolean | undefined> {
		const selected = await vscode.window.showQuickPick(
			[
				{
					label: 'Hide .pinake folder from VS Code Explorer',
					description: 'Recommended',
					detail: 'Adds "**/.pinake": true to .vscode/settings.json while preserving existing settings.',
					hiddenFromExplorer: true,
				},
				{
					label: 'Show .pinake folder in VS Code Explorer',
					description: 'Do not update workspace settings',
					hiddenFromExplorer: false,
				},
			],
			{
				title: 'Create Pinake: Explorer Visibility',
				placeHolder: 'Confirm whether Pinake should hide its internal folder from the standard Explorer',
			},
		);

		return selected?.hiddenFromExplorer;
	}

	private async resolveLegacyPinakeMigration(root: vscode.Uri): Promise<boolean | undefined> {
		const legacyDirectory = vscode.Uri.joinPath(root, legacyPinakeDirectoryName);
		if (!(await this.fileService.isDirectory(legacyDirectory))) {
			return false;
		}

		const selected = await vscode.window.showQuickPick(
			[
				{
					label: 'Keep existing Pinake folder',
					description: 'Leave Pinake/ untouched and create the selected .pinake structure separately.',
					migrate: false,
				},
				{
					label: 'Copy Pinake into .pinake/docs',
					description: 'Safely copy existing documentation without deleting the old folder.',
					migrate: true,
				},
				{
					label: 'Cancel setup',
					description: 'Do not create or update Pinake.',
					cancel: true,
					migrate: false,
				},
			],
			{
				title: 'Existing Pinake Folder Found',
				placeHolder: 'Choose how Pinake should handle the old visible folder',
			},
		);

		if (!selected || selected.cancel) {
			return undefined;
		}

		return selected.migrate;
	}

	private async confirmExistingPinakeUpdate(root: vscode.Uri): Promise<boolean> {
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		if (!(await this.fileService.exists(pinakeDirectory))) {
			return true;
		}

		const answer = await vscode.window.showWarningMessage(
			'.pinake already exists in this workspace.',
			{
				modal: true,
				detail: 'Pinake will create missing files and update pinake.json, but it will not overwrite existing documentation files.',
			},
			'Update Missing Files',
			'Cancel',
		);

		return answer === 'Update Missing Files';
	}

	private async addDocumentToManifest(root: vscode.Uri, document: PinakeDocumentDefinition): Promise<void> {
		const manifest = await this.manifestService.readManifest(root) ?? this.manifestService.createDefaultManifest(this.workspaceService.getDefaultProjectName(root));
		if (this.manifestService.addDocuments(manifest, [document])) {
			await this.manifestService.writeManifest(root, manifest);
		}
	}

	private async renameManifestPath(
		root: vscode.Uri,
		oldRelativePath: string | undefined,
		newRelativePath: string,
		isDirectory: boolean,
		newTitle?: string,
	): Promise<void> {
		if (!oldRelativePath) {
			return;
		}

		const manifest = await this.manifestService.readManifest(root);
		if (!manifest) {
			return;
		}

		let changed = false;
		if (isDirectory) {
			const prefix = `${oldRelativePath}/`;
			for (const document of manifest.documents) {
				if (!document.path.startsWith(prefix)) {
					continue;
				}

				document.path = `${newRelativePath}/${document.path.slice(prefix.length)}`;
				changed = true;
			}
		} else {
			changed = this.manifestService.renameDocument(manifest, oldRelativePath, newRelativePath, newTitle);
		}

		if (changed) {
			await this.manifestService.writeManifest(root, manifest);
		}
	}

	private async removeManifestPath(root: vscode.Uri, relativePath: string, isDirectory: boolean): Promise<void> {
		const manifest = await this.manifestService.readManifest(root);
		if (!manifest) {
			return;
		}

		let changed = false;
		if (isDirectory) {
			const prefix = `${relativePath}/`;
			const nextDocuments = manifest.documents.filter((document) => !document.path.startsWith(prefix));
			changed = nextDocuments.length !== manifest.documents.length;
			manifest.documents = nextDocuments;
		} else {
			changed = this.manifestService.removeDocument(manifest, relativePath);
		}

		if (changed) {
			await this.manifestService.writeManifest(root, manifest);
		}
	}

	private getDocsDirectory(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeDocsDirectoryName);
	}

	private requireRootForCommand(): vscode.Uri | undefined {
		try {
			return this.treeProvider.getWorkspaceRoot() ?? this.workspaceService.requireWorkspaceRoot();
		} catch (error) {
			vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
			return undefined;
		}
	}

	private async resolveFileUri(node?: PinakeNode): Promise<vscode.Uri | undefined> {
		if (node?.kind === 'file' || node?.kind === 'favoriteFile') {
			return node.uri;
		}

		const activeUri = vscode.window.activeTextEditor?.document.uri;
		const root = this.treeProvider.getWorkspaceRoot() ?? this.workspaceService.getWorkspaceRoot();
		if (activeUri?.scheme === 'file' && root && isUriInside(this.getDocsDirectory(root), activeUri)) {
			return activeUri;
		}

		vscode.window.showWarningMessage('Select a Pinake file to open.');
		return undefined;
	}

	private resolvePinakeItemUri(root: vscode.Uri, node: PinakeNode | undefined, action: string): vscode.Uri | undefined {
		if (node?.kind === 'favorites') {
			vscode.window.showWarningMessage(`Select a Pinake file or folder to ${action}.`);
			return undefined;
		}

		if (node?.kind === 'file' || node?.kind === 'directory' || node?.kind === 'favoriteFile') {
			return node.uri;
		}

		const activeUri = vscode.window.activeTextEditor?.document.uri;
		const docsDirectory = this.getDocsDirectory(root);
		if (activeUri?.scheme === 'file' && isUriInside(docsDirectory, activeUri)) {
			return activeUri;
		}

		vscode.window.showWarningMessage(`Select or open a Pinake item to ${action}.`);
		return undefined;
	}

	private resolvePinakeRelativePath(root: vscode.Uri, node: PinakeNode | undefined, action: string): string | undefined {
		if (node?.kind === 'file' || node?.kind === 'directory' || node?.kind === 'favoriteFile') {
			return node.sourceRelativePath ?? node.relativePath;
		}

		const uri = this.resolvePinakeItemUri(root, node, action);
		return uri ? this.toPinakeRelativePath(root, uri) : undefined;
	}

	private toPinakeRelativePath(root: vscode.Uri, uri: vscode.Uri): string {
		return toWorkspaceRelative(this.getDocsDirectory(root), uri);
	}

	private async createDuplicateTarget(source: vscode.Uri): Promise<vscode.Uri> {
		const isDirectory = await this.fileService.isDirectory(source);
		const parentPath = path.posix.dirname(source.path);
		const basename = path.posix.basename(source.path);
		const extension = isDirectory ? '' : path.posix.extname(basename);
		const stem = extension.length > 0 ? basename.slice(0, -extension.length) : basename;

		for (let index = 1; ; index += 1) {
			const suffix = index === 1 ? ' copy' : ` copy ${index}`;
			const candidate = source.with({ path: path.posix.join(parentPath, `${stem}${suffix}${extension}`) });
			if (!(await this.fileService.exists(candidate))) {
				return candidate;
			}
		}
	}

	private resolveFavoriteRelativePath(root: vscode.Uri, node?: PinakeNode): string | undefined {
		if (node?.kind === 'file' || node?.kind === 'favoriteFile') {
			return node.sourceRelativePath ?? node.relativePath;
		}

		const activeUri = vscode.window.activeTextEditor?.document.uri;
		const docsDirectory = this.getDocsDirectory(root);
		if (activeUri?.scheme === 'file' && isUriInside(docsDirectory, activeUri)) {
			return toWorkspaceRelative(docsDirectory, activeUri);
		}

		vscode.window.showWarningMessage('Select or open a Pinake file to favorite.');
		return undefined;
	}

	private async recordLastOpened(uri: vscode.Uri): Promise<void> {
		const root = this.treeProvider.getWorkspaceRoot() ?? this.workspaceService.getWorkspaceRoot();
		if (!root) {
			return;
		}

		const docsDirectory = this.getDocsDirectory(root);
		if (!isUriInside(docsDirectory, uri)) {
			return;
		}

		await this.stateService.recordLastOpened(root, toWorkspaceRelative(docsDirectory, uri));
	}

	private async resolveTargetDirectory(root: vscode.Uri, node?: PinakeNode): Promise<vscode.Uri | undefined> {
		if (!node) {
			return this.getDocsDirectory(root);
		}

		if (node.kind === 'directory') {
			return node.uri;
		}

		return node.uri.with({ path: path.posix.dirname(node.uri.path) });
	}

	private async pickModules(): Promise<PinakeModuleDescriptor[]> {
		const mode = await vscode.window.showQuickPick(
			[
				...modulePresets.map((preset) => ({
					label: preset.title,
					description: preset.description,
					presetId: preset.id,
					moduleId: undefined,
				})),
				{
					label: 'Choose individual modules',
					description: 'Select one or more v0.1 modules.',
					presetId: undefined,
					moduleId: undefined,
				},
			],
			{
				title: 'Generate Pinake Module',
				placeHolder: 'Select a preset or choose individual modules',
			},
		);

		if (!mode) {
			return [];
		}

		const preset = mode.presetId ? modulePresets.find((candidate) => candidate.id === mode.presetId) : undefined;
		if (preset) {
			return moduleDescriptors.filter((descriptor) => preset.moduleIds.includes(descriptor.id));
		}

		const selected = await vscode.window.showQuickPick(
			moduleDescriptors.map((descriptor) => ({
				label: descriptor.title,
				description: descriptor.description,
				moduleId: descriptor.id,
			})),
			{
				title: 'Choose Pinake Modules',
				canPickMany: true,
				placeHolder: 'Select modules to generate',
			},
		);

		const ids = selected?.map((item) => item.moduleId) ?? [];
		return moduleDescriptors.filter((descriptor) => ids.includes(descriptor.id));
	}

	private showScaffoldSummary(title: string, result: ScaffoldResult): void {
		const message = `${title}: ${result.created.length} created, ${result.skipped.length} skipped, ${result.updated.length} updated.`;
		vscode.window.showInformationMessage(message);
	}

	private writeValidationResult(result: ValidationResult): void {
		this.outputChannel.clear();
		for (const line of formatValidationReport(result)) {
			this.outputChannel.appendLine(line);
		}
	}
}

function createDocumentDefinition(relativePath: string, idSeed = relativePath): PinakeDocumentDefinition {
	const title = titleFromRelativePath(relativePath);
	return {
		id: `custom-${slug(idSeed)}-${slug(relativePath)}`,
		title,
		path: relativePath,
		type: inferDocumentType(relativePath),
		status: 'draft',
		order: 1,
	};
}

function createMarkdownContent(document: PinakeDocumentDefinition): string {
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

function titleFromRelativePath(relativePath: string): string {
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

	if (lower.includes('testing')) {
		return 'testing';
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

function isUriInside(parent: vscode.Uri, uri: vscode.Uri): boolean {
	const parentPath = parent.path.endsWith('/') ? parent.path : `${parent.path}/`;
	return uri.path === parent.path || uri.path.startsWith(parentPath);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	const kib = bytes / 1024;
	if (kib < 1024) {
		return `${kib.toFixed(1)} KB`;
	}

	return `${(kib / 1024).toFixed(1)} MB`;
}

function formatTimestamp(timestamp: number): string {
	return timestamp > 0 ? new Date(timestamp).toISOString() : 'Unknown';
}
