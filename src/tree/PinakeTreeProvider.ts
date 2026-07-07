import * as path from 'path';
import * as vscode from 'vscode';
import { pinakeDirectoryName, pinakeInternalDirectoryName } from '../constants';
import { FileService } from '../services/FileService';
import { joinUri, toWorkspaceRelative } from '../services/uriUtils';
import { PinakeNode } from './PinakeNode';

export class PinakeTreeProvider implements vscode.TreeDataProvider<PinakeNode> {
	private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<PinakeNode | undefined | null | void>();
	public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

	public constructor(
		private readonly root: vscode.Uri | undefined,
		private readonly fileService: FileService,
	) {}

	public refresh(): void {
		this.onDidChangeTreeDataEmitter.fire();
	}

	public async getParent(element: PinakeNode): Promise<PinakeNode | undefined> {
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

		const pinakeDirectory = vscode.Uri.joinPath(this.root, pinakeDirectoryName);
		const uri = joinUri(pinakeDirectory, normalized);
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
		const collapsibleState = element.kind === 'directory'
			? vscode.TreeItemCollapsibleState.Collapsed
			: vscode.TreeItemCollapsibleState.None;
		const item = new vscode.TreeItem(element.label, collapsibleState);
		item.resourceUri = element.uri;
		item.contextValue = element.kind;
		item.tooltip = element.relativePath;
		item.iconPath = this.getIcon(element);

		if (element.kind === 'file') {
			item.command = {
				command: 'pinakes.openFile',
				title: 'Open File',
				arguments: [element],
			};
		}

		return item;
	}

	public async getChildren(element?: PinakeNode): Promise<PinakeNode[]> {
		if (!this.root) {
			return [];
		}

		const pinakeDirectory = vscode.Uri.joinPath(this.root, pinakeDirectoryName);
		const directory = element?.uri ?? pinakeDirectory;
		if (!(await this.fileService.isDirectory(directory))) {
			return [];
		}

		const entries = await this.fileService.readDirectory(directory);
		return entries
			.filter(([name]) => !isHiddenFromPinakeTree(name))
			.filter(([, type]) => (type & (vscode.FileType.Directory | vscode.FileType.File)) !== 0)
			.sort(([leftName, leftType], [rightName, rightType]) => {
				const leftIsDirectory = (leftType & vscode.FileType.Directory) !== 0;
				const rightIsDirectory = (rightType & vscode.FileType.Directory) !== 0;
				if (leftIsDirectory !== rightIsDirectory) {
					return leftIsDirectory ? -1 : 1;
				}

				return leftName.localeCompare(rightName, undefined, { numeric: true, sensitivity: 'base' });
			})
			.map(([name, type]) => {
				const uri = vscode.Uri.joinPath(directory, name);
				const kind = (type & vscode.FileType.Directory) !== 0 ? 'directory' : 'file';
				return {
					uri,
					label: name,
					relativePath: toWorkspaceRelative(pinakeDirectory, uri),
					kind,
				};
			});
	}

	private getIcon(element: PinakeNode): vscode.ThemeIcon {
		if (element.kind === 'file') {
			if (element.label.toLowerCase().endsWith('.md')) {
				return new vscode.ThemeIcon('markdown');
			}

			if (element.label.toLowerCase().endsWith('.json')) {
				return new vscode.ThemeIcon('json');
			}

			return new vscode.ThemeIcon('file');
		}

		const iconByFolder = new Map<string, string>([
			['API', 'symbol-interface'],
			['Database', 'database'],
			['Docker', 'package'],
			['Kubernetes', 'cloud'],
			['CI-CD', 'repo-forked'],
			['Frontend', 'browser'],
			['Mobile', 'device-mobile'],
			['Authentication', 'lock'],
			['06_Decisions', 'book'],
		]);

		return new vscode.ThemeIcon(iconByFolder.get(element.label) ?? 'folder');
	}
}

function isHiddenFromPinakeTree(name: string): boolean {
	return name === pinakeInternalDirectoryName || name === '.gitignore';
}

function normalizeRelativePath(relativePath: string): string {
	return relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}
