import * as vscode from 'vscode';
import { PinakesCommands } from './commands/PinakesCommands';
import { registerPinakesCommands } from './commands/registerCommands';
import { AgentSkillInstaller } from './services/AgentSkillInstaller';
import { FileService } from './services/FileService';
import { IndexService } from './services/IndexService';
import { ManifestService } from './services/ManifestService';
import { PinakeTransferService } from './services/PinakeTransferService';
import { ScaffoldService } from './services/ScaffoldService';
import { StateService } from './services/StateService';
import { ValidationDiagnosticsService } from './services/ValidationDiagnosticsService';
import { ValidationService } from './services/ValidationService';
import { WorkspaceService } from './services/WorkspaceService';
import { PinakeTreeDragAndDropController } from './tree/PinakeTreeDragAndDropController';
import { PinakeTreeProvider } from './tree/PinakeTreeProvider';

export function activate(context: vscode.ExtensionContext): void {
	const workspaceService = new WorkspaceService();
	const fileService = new FileService();
	const manifestService = new ManifestService(fileService);
	const stateService = new StateService(fileService);
	const indexService = new IndexService(fileService);
	const scaffoldService = new ScaffoldService(fileService, manifestService, stateService, indexService);
	const transferService = new PinakeTransferService(fileService, manifestService, indexService);
	const validationService = new ValidationService(fileService, manifestService);
	const validationDiagnostics = vscode.languages.createDiagnosticCollection('pinakes');
	const validationDiagnosticsService = new ValidationDiagnosticsService(fileService, validationDiagnostics);
	const agentSkillInstaller = new AgentSkillInstaller(fileService, context.extensionUri);
	const treeProvider = new PinakeTreeProvider(workspaceService.getWorkspaceRoot(), fileService, stateService);
	const dragAndDropController = new PinakeTreeDragAndDropController(
		fileService,
		manifestService,
		stateService,
		indexService,
		validationService,
		treeProvider,
		validationDiagnosticsService,
	);
	const outputChannel = vscode.window.createOutputChannel('Pinakes');
	const treeView = vscode.window.createTreeView('pinakesView', {
		treeDataProvider: treeProvider,
		dragAndDropController,
		showCollapseAll: true,
	});

	const commands = new PinakesCommands(
		workspaceService,
		fileService,
		manifestService,
		scaffoldService,
		validationService,
		indexService,
		transferService,
		stateService,
		treeProvider,
		outputChannel,
		agentSkillInstaller,
		validationDiagnosticsService,
	);

	registerPinakesCommands(context, commands);

	const root = workspaceService.getWorkspaceRoot();
	if (root) {
		const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, '.pinake/**'));
		const refresh = debounce(() => treeProvider.refresh(), 150);
		context.subscriptions.push(
			watcher,
			watcher.onDidCreate(refresh),
			watcher.onDidChange(refresh),
			watcher.onDidDelete(refresh),
			treeView.onDidExpandElement((event) => {
				if (event.element.kind === 'directory') {
					void stateService.recordExpanded(root, event.element.relativePath);
				}
			}),
			treeView.onDidCollapseElement((event) => {
				if (event.element.kind === 'directory') {
					void stateService.recordCollapsed(root, event.element.relativePath);
				}
			}),
		);

		void restoreTreeState(root, stateService, treeProvider, treeView);
	}

	context.subscriptions.push(outputChannel, treeView, validationDiagnostics);
}

async function restoreTreeState(
	root: vscode.Uri,
	stateService: StateService,
	treeProvider: PinakeTreeProvider,
	treeView: vscode.TreeView<import('./tree/PinakeNode').PinakeNode>,
): Promise<void> {
	const state = await stateService.readUiState(root);
	const collapsed = new Set(state.collapsed);
	const expanded = state.expanded
		.filter((relativePath) => !collapsed.has(relativePath))
		.sort((left, right) => left.split('/').length - right.split('/').length);

	for (const relativePath of expanded) {
		const node = await treeProvider.getNodeByRelativePath(relativePath);
		if (node?.kind !== 'directory') {
			continue;
		}

		await treeView.reveal(node, { expand: true, focus: false, select: false });
	}

	if (state.lastOpened) {
		const node = await treeProvider.getNodeByRelativePath(state.lastOpened);
		if (node) {
			await treeView.reveal(node, { focus: false, select: true });
		}
	}
}

export function deactivate(): void {}

function debounce(callback: () => void, delayMs: number): () => void {
	let timeout: NodeJS.Timeout | undefined;
	return () => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(callback, delayMs);
	};
}
