import * as path from 'path';
import * as vscode from 'vscode';
import { pinakeDirectoryName, pinakeDocsDirectoryName } from '../constants';
import { FileService } from '../services/FileService';
import { IndexService } from '../services/IndexService';
import { ManifestService } from '../services/ManifestService';
import { StateService } from '../services/StateService';
import { ValidationDiagnosticsService } from '../services/ValidationDiagnosticsService';
import { ValidationService } from '../services/ValidationService';
import { isUriInside, toWorkspaceRelative } from '../services/uriUtils';
import { PinakeManifest } from '../types';
import { PinakeNode } from './PinakeNode';
import { PinakeTreeProvider } from './PinakeTreeProvider';

const pinakeTreeMimeType = 'application/vnd.code.tree.pinakesview';

interface PinakeDragItem {
	kind: 'file' | 'directory';
	uri: string;
}

interface PinakeMovePlan {
	source: vscode.Uri;
	target: vscode.Uri;
	oldRelativePath: string;
	newRelativePath: string;
	kind: 'file' | 'directory';
}

export class PinakeTreeDragAndDropController implements vscode.TreeDragAndDropController<PinakeNode> {
	public readonly dropMimeTypes = [pinakeTreeMimeType];
	public readonly dragMimeTypes = [pinakeTreeMimeType];

	public constructor(
		private readonly fileService: FileService,
		private readonly manifestService: ManifestService,
		private readonly stateService: StateService,
		private readonly indexService: IndexService,
		private readonly validationService: ValidationService,
		private readonly treeProvider: PinakeTreeProvider,
		private readonly validationDiagnosticsService?: ValidationDiagnosticsService,
	) {}

	public handleDrag(source: readonly PinakeNode[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void {
		if (token.isCancellationRequested) {
			return;
		}

		const items = source
			.filter((node): node is PinakeNode & { kind: 'file' | 'directory' } => node.kind === 'file' || node.kind === 'directory')
			.map((node) => ({
				kind: node.kind,
				uri: node.uri.toString(),
			}));
		if (items.length === 0) {
			return;
		}

		dataTransfer.set(pinakeTreeMimeType, new vscode.DataTransferItem(JSON.stringify(items)));
	}

	public async handleDrop(target: PinakeNode | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
		if (token.isCancellationRequested) {
			return;
		}

		const root = this.treeProvider.getWorkspaceRoot();
		if (!root) {
			vscode.window.showWarningMessage('Open a workspace folder before moving Pinake items.');
			return;
		}

		const items = await this.readDragItems(dataTransfer);
		if (items.length === 0) {
			return;
		}

		const targetDirectory = await this.resolveTargetDirectory(root, target);
		if (!targetDirectory) {
			return;
		}

		const plans = await this.createMovePlans(root, items, targetDirectory);
		if (plans.length === 0) {
			return;
		}

		for (const plan of plans) {
			await this.fileService.rename(plan.source, plan.target, false);
		}

		await this.updateManifest(root, plans);
		for (const plan of plans) {
			await this.stateService.renamePathReferences(root, plan.oldRelativePath, plan.newRelativePath, plan.kind === 'directory');
		}
		await this.refreshIndex(root, plans);
		const validation = await this.validationService.validate(root);
		await this.validationDiagnosticsService?.update(root, validation);

		this.treeProvider.refresh();
		const movedCount = plans.length;
		const noun = movedCount === 1 ? 'item' : 'items';
		if (validation.valid) {
			vscode.window.showInformationMessage(`Moved ${movedCount} Pinake ${noun}.`);
		} else {
			vscode.window.showWarningMessage(`Moved ${movedCount} Pinake ${noun}, but validation reported issues.`);
		}
	}

	private async readDragItems(dataTransfer: vscode.DataTransfer): Promise<PinakeDragItem[]> {
		const item = dataTransfer.get(pinakeTreeMimeType);
		if (!item) {
			return [];
		}

		try {
			const parsed = JSON.parse(await item.asString()) as unknown;
			if (!Array.isArray(parsed)) {
				return [];
			}

			return parsed.filter(isPinakeDragItem);
		} catch {
			return [];
		}
	}

	private async resolveTargetDirectory(root: vscode.Uri, target: PinakeNode | undefined): Promise<vscode.Uri | undefined> {
		const docsDirectory = this.getDocsDirectory(root);
		if (!target) {
			return docsDirectory;
		}

		if (target.kind === 'favorites' || target.kind === 'favoriteFile' || target.kind === 'emptyState') {
			vscode.window.showWarningMessage('Drop Pinake items onto a folder, document, or the Pinake root.');
			return undefined;
		}

		const targetDirectory = target.kind === 'directory'
			? target.uri
			: target.uri.with({ path: path.posix.dirname(target.uri.path) });
		if (!isUriInside(docsDirectory, targetDirectory)) {
			vscode.window.showWarningMessage('Drop target must stay inside .pinake/docs.');
			return undefined;
		}

		await this.fileService.ensureDirectory(targetDirectory);
		return targetDirectory;
	}

	private async createMovePlans(root: vscode.Uri, items: PinakeDragItem[], targetDirectory: vscode.Uri): Promise<PinakeMovePlan[]> {
		const docsDirectory = this.getDocsDirectory(root);
		const sourceItems = this.getTopLevelItems(root, items);
		const plans: PinakeMovePlan[] = [];
		const targetPaths = new Set<string>();
		for (const item of sourceItems) {
			const source = vscode.Uri.parse(item.uri);
			if (!isUriInside(docsDirectory, source) || source.path === docsDirectory.path) {
				continue;
			}

			const oldRelativePath = toWorkspaceRelative(docsDirectory, source);
			const target = vscode.Uri.joinPath(targetDirectory, path.posix.basename(source.path));
			const newRelativePath = toWorkspaceRelative(docsDirectory, target);
			if (oldRelativePath === newRelativePath) {
				continue;
			}

			if (item.kind === 'directory' && pathMatchesOrContains(newRelativePath, oldRelativePath)) {
				vscode.window.showWarningMessage('Cannot move a Pinake folder into itself.');
				return [];
			}

			if (targetPaths.has(target.path)) {
				vscode.window.showWarningMessage(`Multiple dragged items would move to ${newRelativePath}.`);
				return [];
			}

			if (await this.fileService.exists(target)) {
				vscode.window.showWarningMessage(`Pinake item already exists: ${newRelativePath}.`);
				return [];
			}

			targetPaths.add(target.path);
			plans.push({
				source,
				target,
				oldRelativePath,
				newRelativePath,
				kind: item.kind,
			});
		}

		return plans;
	}

	private getTopLevelItems(root: vscode.Uri, items: PinakeDragItem[]): PinakeDragItem[] {
		const docsDirectory = this.getDocsDirectory(root);
		const withPaths = items
			.map((item) => {
				const uri = vscode.Uri.parse(item.uri);
				if (!isUriInside(docsDirectory, uri)) {
					return undefined;
				}

				return {
					...item,
					relativePath: toWorkspaceRelative(docsDirectory, uri),
				};
			})
			.filter((item): item is PinakeDragItem & { relativePath: string } => Boolean(item));

		return withPaths.filter((item) => !withPaths.some((candidate) =>
			candidate !== item
			&& candidate.kind === 'directory'
			&& pathMatchesOrContains(item.relativePath, candidate.relativePath)));
	}

	private async updateManifest(root: vscode.Uri, plans: PinakeMovePlan[]): Promise<void> {
		const manifest = await this.manifestService.readManifest(root);
		if (!manifest) {
			return;
		}

		let changed = false;
		for (const plan of plans) {
			if (plan.kind === 'directory') {
				changed = updateManifestDirectoryPath(manifest, plan.oldRelativePath, plan.newRelativePath) || changed;
				continue;
			}

			changed = this.manifestService.renameDocument(manifest, plan.oldRelativePath, plan.newRelativePath) || changed;
		}

		if (changed) {
			manifest.documents.sort((left, right) => left.path.localeCompare(right.path) || left.order - right.order);
			await this.manifestService.writeManifest(root, manifest);
		}
	}

	private async refreshIndex(root: vscode.Uri, plans: PinakeMovePlan[]): Promise<void> {
		if (plans.some((plan) => plan.kind === 'directory')) {
			await this.indexService.rebuild(root);
			return;
		}

		for (const plan of plans) {
			if (!plan.oldRelativePath.toLowerCase().endsWith('.md') && !plan.newRelativePath.toLowerCase().endsWith('.md')) {
				continue;
			}

			await this.indexService.removeDocument(root, plan.oldRelativePath);
			await this.indexService.updateDocument(root, plan.newRelativePath);
		}
	}

	private getDocsDirectory(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeDocsDirectoryName);
	}
}

function isPinakeDragItem(value: unknown): value is PinakeDragItem {
	return typeof value === 'object'
		&& value !== null
		&& ((value as { kind?: unknown }).kind === 'file' || (value as { kind?: unknown }).kind === 'directory')
		&& typeof (value as { uri?: unknown }).uri === 'string';
}

function updateManifestDirectoryPath(manifest: PinakeManifest, oldRelativePath: string, newRelativePath: string): boolean {
	let changed = false;
	const prefix = `${oldRelativePath}/`;
	for (const document of manifest.documents) {
		if (!document.path.startsWith(prefix)) {
			continue;
		}

		document.path = `${newRelativePath}/${document.path.slice(prefix.length)}`;
		changed = true;
	}

	return changed;
}

function pathMatchesOrContains(candidatePath: string, parentPath: string): boolean {
	return candidatePath === parentPath || candidatePath.startsWith(`${parentPath}/`);
}
