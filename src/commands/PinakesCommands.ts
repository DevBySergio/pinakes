import * as path from 'path';
import * as vscode from 'vscode';
import { legacyPinakeDirectoryName, pinakeDirectoryName, pinakeDocsDirectoryName } from '../constants';
import { moduleDescriptors, modulePresets } from '../modules/moduleDescriptors';
import { AgentSkillInstaller } from '../services/AgentSkillInstaller';
import { createDocumentId } from '../services/documentIds';
import { FileService } from '../services/FileService';
import {
	formatGeneratedModulePickItem,
	formatModulePresetPickItem,
	formatNoSearchResultsMessage,
	formatPropertiesReport,
	formatSearchResultItem,
	formatTemplateModulePickItem,
	formatTemplatePickItem,
	formatValidationReport,
	normalizePinakeFolderName,
	normalizePinakeMarkdownFileName,
	validatePinakeFileName,
	validatePinakeFolderName,
} from '../services/FeedbackFormatter';
import { IndexService } from '../services/IndexService';
import { ManifestService } from '../services/ManifestService';
import { PinakeTransferService } from '../services/PinakeTransferService';
import { ScaffoldService } from '../services/ScaffoldService';
import { StateService } from '../services/StateService';
import { ValidationDiagnosticsService } from '../services/ValidationDiagnosticsService';
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
import { isUriInside, joinUri, toWorkspaceRelative } from '../services/uriUtils';
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
		private readonly transferService: PinakeTransferService,
		private readonly stateService: StateService,
		private readonly treeProvider: PinakeTreeProvider,
		private readonly outputChannel: vscode.OutputChannel,
		private readonly agentSkillInstaller: AgentSkillInstaller,
		private readonly validationDiagnosticsService?: ValidationDiagnosticsService,
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

		if (!(await this.confirmPinakeCreation(root, template, moduleIds, hiddenFromExplorer, migrateLegacy))) {
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

		const sourceRelativePath = this.toPinakeRelativePath(root, source);
		const target = await this.createDuplicateTarget(source);
		const targetRelativePath = this.getContainedPinakeRelativePath(root, target, 'duplicate to');
		if (!targetRelativePath) {
			return;
		}

		await this.fileService.copy(source, target, false);
		let indexedIncrementally = false;
		const targetIsDirectory = await this.fileService.isDirectory(target);
		if (targetIsDirectory) {
			await this.addDocumentsToManifest(root, await this.createDocumentsForDirectoryCopy(root, target, sourceRelativePath, targetRelativePath));
		} else if (target.path.toLowerCase().endsWith('.md')) {
			await this.addDocumentsToManifest(root, [createDocumentDefinition(targetRelativePath, sourceRelativePath)]);
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
			title: 'Pinake: New Markdown File',
			prompt: 'Name the Markdown file to create.',
			placeHolder: 'architecture-notes.md',
			value: 'NewDocument.md',
			validateInput: validatePinakeFileName,
		});
		if (name === undefined) {
			return;
		}

		const normalizedName = normalizePinakeMarkdownFileName(name);
		const uri = vscode.Uri.joinPath(parent, normalizedName);
		if (await this.fileService.exists(uri)) {
			vscode.window.showWarningMessage(`File already exists: ${normalizedName}.`);
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
			title: 'Pinake: New Folder',
			prompt: 'Name the folder to create.',
			placeHolder: 'architecture',
			validateInput: validatePinakeFolderName,
		});
		if (name === undefined) {
			return;
		}

		const normalizedName = normalizePinakeFolderName(name);
		const uri = vscode.Uri.joinPath(parent, normalizedName);
		if (await this.fileService.exists(uri)) {
			vscode.window.showWarningMessage(`Folder already exists: ${normalizedName}.`);
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

		if (node.kind !== 'file' && node.kind !== 'directory') {
			vscode.window.showWarningMessage('Select a Pinake file or folder to rename.');
			return;
		}

		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const oldRelativePath = this.getContainedPinakeRelativePath(root, node.uri, 'rename');
		if (!oldRelativePath) {
			return;
		}

		const validateInput = node.kind === 'directory' ? validatePinakeFolderName : validatePinakeFileName;
		const nextName = await vscode.window.showInputBox({
			title: 'Rename Pinake Item',
			prompt: node.kind === 'directory' ? 'New folder name' : 'New Markdown file name',
			value: path.posix.basename(node.uri.path),
			validateInput,
		});
		if (nextName === undefined) {
			return;
		}

		const validationMessage = validateInput(nextName);
		if (validationMessage) {
			vscode.window.showWarningMessage(validationMessage);
			return;
		}

		const normalizedName = node.kind === 'directory'
			? normalizePinakeFolderName(nextName)
			: normalizePinakeMarkdownFileName(nextName);
		if (normalizedName === path.posix.basename(node.uri.path)) {
			return;
		}

		const target = node.uri.with({ path: path.posix.join(path.posix.dirname(node.uri.path), normalizedName) });
		const nextRelativePath = this.getContainedPinakeRelativePath(root, target, 'rename to');
		if (!nextRelativePath) {
			return;
		}

		if (await this.fileService.exists(target)) {
			vscode.window.showWarningMessage(`Pinake item already exists: ${normalizedName}.`);
			return;
		}

		await this.fileService.rename(node.uri, target, false);
		await this.renameManifestPath(root, oldRelativePath, nextRelativePath, node.kind === 'directory', path.posix.basename(normalizedName, '.md'));
		await this.stateService.renamePathReferences(root, oldRelativePath, nextRelativePath, node.kind === 'directory');
		if (node.kind === 'file') {
			await this.indexService.removeDocument(root, oldRelativePath);
			await this.indexService.updateDocument(root, nextRelativePath);
		} else {
			await this.indexService.rebuild(root);
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

		if (node.kind !== 'file' && node.kind !== 'directory') {
			vscode.window.showWarningMessage('Select a Pinake file or folder to delete.');
			return;
		}

		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const relativePath = this.getContainedPinakeRelativePath(root, node.uri, 'delete');
		if (!relativePath) {
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
		await this.removeManifestPath(root, relativePath, node.kind === 'directory');
		await this.stateService.removePathReferences(root, relativePath, node.kind === 'directory');
		if (node.kind === 'file') {
			await this.indexService.removeDocument(root, relativePath);
		} else {
			await this.indexService.rebuild(root);
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
		this.validationDiagnosticsService?.clear();
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

	public async exportPinake(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const destination = await vscode.window.showOpenDialog({
			title: 'Pinake: Export',
			openLabel: 'Export Here',
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
		});
		const destinationDirectory = destination?.[0];
		if (!destinationDirectory) {
			return;
		}

		try {
			const result = await this.transferService.exportWorkspace(root, destinationDirectory);
			this.showScaffoldSummary('Pinake exported', result);
		} catch (error) {
			this.outputChannel.appendLine(`Export Pinake failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
			vscode.window.showErrorMessage(`Pinake export failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public async importDocumentation(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const source = await vscode.window.showOpenDialog({
			title: 'Pinake: Import Markdown',
			openLabel: 'Import Folder',
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
		});
		const sourceDirectory = source?.[0];
		if (!sourceDirectory) {
			return;
		}

		const answer = await vscode.window.showInformationMessage(
			'Import Markdown documents into Pinake?',
			{
				modal: true,
				detail: [
					`Source: ${sourceDirectory.fsPath}`,
					'Target: .pinake/docs/imported',
					'Existing target files will be skipped.',
				].join('\n'),
			},
			'Import Documents',
			'Cancel',
		);
		if (answer !== 'Import Documents') {
			return;
		}

		try {
			const result = await this.transferService.importMarkdownDirectory(root, sourceDirectory);
			this.treeProvider.refresh();
			this.showScaffoldSummary('Pinake import complete', result);
		} catch (error) {
			this.outputChannel.appendLine(`Import Pinake documents failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
			vscode.window.showErrorMessage(`Pinake import failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public async validate(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const result = await this.validationService.validate(root);
		await this.validationDiagnosticsService?.update(root, result);
		this.writeValidationResult(result);
		this.outputChannel.show(true);

		if (result.valid) {
			vscode.window.showInformationMessage('Pinake validation passed.');
		} else {
			vscode.window.showWarningMessage(`Pinake validation found ${result.issues.length} issue(s). See the Pinakes output channel for details.`);
		}
	}

	public async installAgentSkill(): Promise<void> {
		try {
			const result = await this.agentSkillInstaller.installPinakeSkill(async (targetUri) => {
				const answer = await vscode.window.showWarningMessage(
					'A different Pinake agent skill already exists.',
					{
						modal: true,
						detail: `Replace ${targetUri.fsPath}?`,
					},
					'Replace Skill',
					'Cancel',
				);

				return answer === 'Replace Skill';
			});

			if (result.status === 'cancelled') {
				vscode.window.showInformationMessage('Pinake agent skill installation cancelled.');
				return;
			}

			const action = result.status === 'unchanged'
				? 'already installed'
				: result.status === 'updated'
					? 'updated'
					: 'installed';
			vscode.window.showInformationMessage(`Pinake agent skill ${action}: ${result.targetUri.fsPath}`);
		} catch (error) {
			this.outputChannel.appendLine(`Install Pinake agent skill failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
			vscode.window.showErrorMessage(`Pinake agent skill installation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async pickDocumentationTemplate(): Promise<PinakeTemplateDefinition | undefined> {
		const selected = await vscode.window.showQuickPick(
			pinakeTemplateDefinitions.map((template, index) => formatTemplatePickItem(
				template,
				template.defaultModules.map((moduleId) => getPinakeModuleDefinition(template, moduleId).title),
				index === 0,
				(template.recommendedModules ?? []).map((moduleId) => getPinakeModuleDefinition(template, moduleId).title),
			)),
			{
				title: 'Pinake: Select Template',
				placeHolder: 'Choose a starter documentation structure',
			},
		);

		return selected?.template;
	}

	private async pickTemplateModules(template: PinakeTemplateDefinition): Promise<PinakeModuleId[] | undefined> {
		const defaultModuleIds = new Set(template.defaultModules);
		const recommendedModuleIds = new Set(template.recommendedModules ?? []);
		const selected = await vscode.window.showQuickPick(
			allPinakeModuleIds.map((moduleId) => {
				const definition = getPinakeModuleDefinition(template, moduleId);
				const selectionState = defaultModuleIds.has(moduleId)
					? 'included'
					: recommendedModuleIds.has(moduleId)
						? 'recommended'
						: 'optional';
				return formatTemplateModulePickItem(definition, moduleId, selectionState);
			}),
			{
				title: 'Pinake: Select Modules',
				placeHolder: 'Keep included modules or add optional ones',
				canPickMany: true,
			},
		);

		return selected?.map((item) => item.moduleId);
	}

	private async pickExplorerVisibility(): Promise<boolean | undefined> {
		const selected = await vscode.window.showQuickPick(
			[
				{
					label: 'Hide .pinake in Explorer',
					description: 'Recommended',
					detail: 'Adds "**/.pinake": true to .vscode/settings.json while preserving existing settings.',
					hiddenFromExplorer: true,
				},
				{
					label: 'Show .pinake in Explorer',
					description: 'No settings change',
					detail: 'Leaves .vscode/settings.json unchanged.',
					hiddenFromExplorer: false,
				},
			],
			{
				title: 'Pinake: Explorer Visibility',
				placeHolder: 'Choose how .pinake appears in the Explorer',
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
					label: 'Copy into .pinake/docs',
					description: 'Recommended',
					detail: 'Copies existing Pinake/ documentation without deleting the old folder.',
					migrate: true,
				},
				{
					label: 'Keep Pinake/ as-is',
					description: 'Create .pinake separately',
					detail: 'Leaves the existing Pinake/ folder untouched.',
					migrate: false,
				},
				{
					label: 'Cancel',
					description: 'Stop setup',
					cancel: true,
					migrate: false,
				},
			],
			{
				title: 'Pinake: Legacy Folder Found',
				placeHolder: 'Choose what to do with the existing Pinake/ folder',
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
			'Create Missing Files',
			'Cancel',
		);

		return answer === 'Create Missing Files';
	}

	private async confirmPinakeCreation(
		root: vscode.Uri,
		template: PinakeTemplateDefinition,
		moduleIds: PinakeModuleId[],
		hiddenFromExplorer: boolean,
		migrateLegacy: boolean,
	): Promise<boolean> {
		const answer = await vscode.window.showInformationMessage(
			'Create Pinake documentation?',
			{
				modal: true,
				detail: this.formatPinakeCreationSummary(root, template, moduleIds, hiddenFromExplorer, migrateLegacy),
			},
			'Create Documentation',
			'Cancel',
		);

		return answer === 'Create Documentation';
	}

	private formatPinakeCreationSummary(
		root: vscode.Uri,
		template: PinakeTemplateDefinition,
		moduleIds: PinakeModuleId[],
		hiddenFromExplorer: boolean,
		migrateLegacy: boolean,
	): string {
		const moduleTitles = moduleIds.map((moduleId) => getPinakeModuleDefinition(template, moduleId).title);
		return [
			`Workspace: ${root.fsPath}`,
			`Template: ${template.title}`,
			`Modules: ${moduleTitles.length > 0 ? moduleTitles.join(', ') : 'None'}`,
			`Explorer: ${hiddenFromExplorer ? 'Hide .pinake' : 'Show .pinake'}`,
			`Legacy Pinake/: ${migrateLegacy ? 'Copy into .pinake/docs' : 'No copy'}`,
		].join('\n');
	}

	private async addDocumentToManifest(root: vscode.Uri, document: PinakeDocumentDefinition): Promise<void> {
		await this.addDocumentsToManifest(root, [document]);
	}

	private async addDocumentsToManifest(root: vscode.Uri, documents: PinakeDocumentDefinition[]): Promise<void> {
		if (documents.length === 0) {
			return;
		}

		const manifest = await this.manifestService.readManifest(root) ?? this.manifestService.createDefaultManifest(this.workspaceService.getDefaultProjectName(root));
		if (this.manifestService.addDocuments(manifest, documents)) {
			await this.manifestService.writeManifest(root, manifest);
		}
	}

	private async createDocumentsForDirectoryCopy(
		root: vscode.Uri,
		targetDirectory: vscode.Uri,
		sourceRelativePath: string,
		targetRelativePath: string,
	): Promise<PinakeDocumentDefinition[]> {
		const targetMarkdownPaths = await this.collectMarkdownPaths(root, targetDirectory);
		return targetMarkdownPaths.map((targetMarkdownPath) => {
			const suffix = targetMarkdownPath.startsWith(`${targetRelativePath}/`)
				? targetMarkdownPath.slice(targetRelativePath.length + 1)
				: path.posix.basename(targetMarkdownPath);
			const sourceMarkdownPath = `${sourceRelativePath}/${suffix}`;
			return createDocumentDefinition(targetMarkdownPath, sourceMarkdownPath);
		});
	}

	private async collectMarkdownPaths(root: vscode.Uri, directory: vscode.Uri): Promise<string[]> {
		if (!(await this.fileService.isDirectory(directory))) {
			return [];
		}

		const entries = await this.fileService.readDirectory(directory);
		const markdownPaths: string[] = [];
		for (const [name, type] of entries) {
			const uri = vscode.Uri.joinPath(directory, name);
			if ((type & vscode.FileType.Directory) !== 0) {
				markdownPaths.push(...await this.collectMarkdownPaths(root, uri));
				continue;
			}

			if ((type & vscode.FileType.File) !== 0 && name.toLowerCase().endsWith('.md')) {
				markdownPaths.push(this.toPinakeRelativePath(root, uri));
			}
		}

		return markdownPaths.sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));
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
			if (!isUriInside(this.getDocsDirectory(root), node.uri)) {
				vscode.window.showWarningMessage(`Pinake can only ${action} items inside .pinake/docs.`);
				return undefined;
			}

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
		const uri = this.resolvePinakeItemUri(root, node, action);
		return uri ? this.toPinakeRelativePath(root, uri) : undefined;
	}

	private toPinakeRelativePath(root: vscode.Uri, uri: vscode.Uri): string {
		return toWorkspaceRelative(this.getDocsDirectory(root), uri);
	}

	private getContainedPinakeRelativePath(root: vscode.Uri, uri: vscode.Uri, action: string): string | undefined {
		const docsDirectory = this.getDocsDirectory(root);
		if (!isUriInside(docsDirectory, uri)) {
			vscode.window.showWarningMessage(`Pinake can only ${action} items inside .pinake/docs.`);
			return undefined;
		}

		return toWorkspaceRelative(docsDirectory, uri);
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
			if (!isUriInside(this.getDocsDirectory(root), node.uri)) {
				vscode.window.showWarningMessage('Select or open a Pinake file to favorite.');
				return undefined;
			}

			return node.sourceRelativePath ?? this.toPinakeRelativePath(root, node.uri);
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
		const docsDirectory = this.getDocsDirectory(root);
		if (!node) {
			return docsDirectory;
		}

		let directory: vscode.Uri;
		if (node.kind === 'directory') {
			directory = node.uri;
		} else if (node.kind === 'file' || node.kind === 'favoriteFile') {
			directory = node.uri.with({ path: path.posix.dirname(node.uri.path) });
		} else {
			vscode.window.showWarningMessage('Select a Pinake folder or document.');
			return undefined;
		}

		if (!isUriInside(docsDirectory, directory)) {
			vscode.window.showWarningMessage('Pinake can only create items inside .pinake/docs.');
			return undefined;
		}

		return directory;
	}

	private async pickModules(): Promise<PinakeModuleDescriptor[]> {
		const mode = await vscode.window.showQuickPick(
			[
				...modulePresets.map(formatModulePresetPickItem),
				{
					label: 'Choose individual modules',
					description: 'Custom selection',
					detail: 'Pick one or more generated module scaffolds.',
					presetId: undefined,
				},
			],
			{
				title: 'Pinake: Generate Module',
				placeHolder: 'Choose a preset or select modules manually',
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
			moduleDescriptors.map(formatGeneratedModulePickItem),
			{
				title: 'Pinake: Select Modules',
				canPickMany: true,
				placeHolder: 'Choose modules to generate',
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
		id: createDocumentId('custom', relativePath, idSeed),
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
