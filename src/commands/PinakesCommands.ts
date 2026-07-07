import * as path from 'path';
import * as vscode from 'vscode';
import { pinakeDirectoryName } from '../constants';
import { moduleDescriptors, modulePresets } from '../modules/moduleDescriptors';
import { FileService } from '../services/FileService';
import { IndexService } from '../services/IndexService';
import { ScaffoldService } from '../services/ScaffoldService';
import { StateService } from '../services/StateService';
import { ValidationService } from '../services/ValidationService';
import { WorkspaceService } from '../services/WorkspaceService';
import { PinakeModuleDescriptor, ScaffoldResult, ValidationResult } from '../types';
import { PinakeNode } from '../tree/PinakeNode';
import { PinakeTreeProvider } from '../tree/PinakeTreeProvider';
import { joinUri, toWorkspaceRelative } from '../services/uriUtils';

export class PinakesCommands {
	public constructor(
		private readonly workspaceService: WorkspaceService,
		private readonly fileService: FileService,
		private readonly scaffoldService: ScaffoldService,
		private readonly validationService: ValidationService,
		private readonly indexService: IndexService,
		private readonly stateService: StateService,
		private readonly treeProvider: PinakeTreeProvider,
		private readonly outputChannel: vscode.OutputChannel,
	) {}

	public async createPinake(): Promise<void> {
		const root = this.requireRootForCommand();
		if (!root) {
			return;
		}

		const defaultName = this.workspaceService.getDefaultProjectName(root);
		const projectName = await vscode.window.showInputBox({
			title: 'Create Pinake',
			prompt: 'Project name',
			value: defaultName,
			validateInput: (value) => value.trim().length === 0 ? 'Project name is required.' : undefined,
		});
		if (!projectName) {
			return;
		}

		const result = await this.scaffoldService.initializePinake(root, projectName.trim());
		this.treeProvider.refresh();
		this.showScaffoldSummary('Pinake created', result);
	}

	public refresh(): void {
		this.treeProvider.refresh();
	}

	public async openFile(node?: PinakeNode): Promise<void> {
		const uri = await this.resolveFileUri(node);
		if (!uri) {
			return;
		}

		await vscode.window.showTextDocument(uri, {
			preview: true,
			preserveFocus: false,
		});
		await this.recordLastOpened(uri);
	}

	public async openFileSide(node?: PinakeNode): Promise<void> {
		const uri = await this.resolveFileUri(node);
		if (!uri) {
			return;
		}

		await vscode.window.showTextDocument(uri, {
			viewColumn: vscode.ViewColumn.Beside,
			preview: false,
			preserveFocus: false,
		});
		await this.recordLastOpened(uri);
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

		await this.fileService.writeText(uri, `# ${path.basename(normalizedName, '.md')}\n\n`);
		await this.indexService.rebuild(root);
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

		const nextName = await vscode.window.showInputBox({
			title: 'Rename Pinake Item',
			prompt: 'New name',
			value: node.label,
			validateInput: (value) => value.trim().length === 0 ? 'Name is required.' : undefined,
		});
		if (!nextName || nextName === node.label) {
			return;
		}

		const target = node.uri.with({ path: path.posix.join(path.posix.dirname(node.uri.path), nextName.trim()) });
		await this.fileService.rename(node.uri, target, false);
		const root = this.workspaceService.getWorkspaceRoot();
		if (root) {
			await this.indexService.rebuild(root);
		}

		this.treeProvider.refresh();
	}

	public async delete(node?: PinakeNode): Promise<void> {
		if (!node) {
			vscode.window.showWarningMessage('Select a Pinake item to delete.');
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
		const root = this.workspaceService.getWorkspaceRoot();
		if (root) {
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
			prompt: 'Search Markdown headings, paths, and indexed terms',
			validateInput: (value) => value.trim().length === 0 ? 'Search query is required.' : undefined,
		});
		if (!query) {
			return;
		}

		await this.indexService.rebuild(root);
		const results = await this.indexService.search(root, query);
		if (results.length === 0) {
			vscode.window.showInformationMessage(`No Pinake results found for "${query}".`);
			return;
		}

		const selected = await vscode.window.showQuickPick(
			results.map((result) => ({
				label: result.path,
				description: result.headings.slice(0, 2).join(' > '),
				detail: result.matchedTerms.length > 0 ? `Matched: ${result.matchedTerms.join(', ')}` : undefined,
				path: result.path,
			})),
			{
				title: 'Pinake Search Results',
				placeHolder: 'Open a matching document',
			},
		);
		if (!selected) {
			return;
		}

		const uri = joinUri(vscode.Uri.joinPath(root, pinakeDirectoryName), selected.path);
		await vscode.window.showTextDocument(uri, { preview: true, preserveFocus: false });
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
			vscode.window.showWarningMessage(`Pinake validation found ${result.issues.length} issue(s).`);
		}
	}

	private requireRootForCommand(): vscode.Uri | undefined {
		try {
			return this.workspaceService.requireWorkspaceRoot();
		} catch (error) {
			vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
			return undefined;
		}
	}

	private async resolveFileUri(node?: PinakeNode): Promise<vscode.Uri | undefined> {
		if (node?.kind === 'file') {
			return node.uri;
		}

		const activeUri = vscode.window.activeTextEditor?.document.uri;
		if (activeUri?.scheme === 'file') {
			return activeUri;
		}

		vscode.window.showWarningMessage('Select a Pinake file to open.');
		return undefined;
	}

	private async recordLastOpened(uri: vscode.Uri): Promise<void> {
		const root = this.workspaceService.getWorkspaceRoot();
		if (!root) {
			return;
		}

		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		if (!uri.path.startsWith(pinakeDirectory.path)) {
			return;
		}

		await this.stateService.recordLastOpened(root, toWorkspaceRelative(pinakeDirectory, uri));
	}

	private async resolveTargetDirectory(root: vscode.Uri, node?: PinakeNode): Promise<vscode.Uri | undefined> {
		if (!node) {
			return vscode.Uri.joinPath(root, pinakeDirectoryName);
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
		this.outputChannel.appendLine('Pinake Validation Report');
		this.outputChannel.appendLine(result.valid ? 'Status: passed' : 'Status: issues found');
		this.outputChannel.appendLine('');

		if (result.issues.length === 0) {
			this.outputChannel.appendLine('No issues found.');
			return;
		}

		for (const issue of result.issues) {
			const location = issue.path ? ` (${issue.path})` : '';
			this.outputChannel.appendLine(`[${issue.severity.toUpperCase()}] ${issue.message}${location}`);
		}
	}
}
