import * as path from 'path';
import * as vscode from 'vscode';

export class WorkspaceService {
	public getWorkspaceRoot(): vscode.Uri | undefined {
		const folder = vscode.workspace.workspaceFolders?.[0];
		return folder?.uri;
	}

	public async pickWorkspaceRoot(): Promise<vscode.Uri | undefined> {
		const folders = vscode.workspace.workspaceFolders ?? [];
		if (folders.length === 0) {
			return undefined;
		}

		if (folders.length === 1) {
			return folders[0].uri;
		}

		const selected = await vscode.window.showQuickPick(
			folders.map((folder) => ({
				label: folder.name,
				description: folder.uri.fsPath,
				uri: folder.uri,
			})),
			{
				title: 'Select Pinake Workspace',
				placeHolder: 'Choose the workspace folder that should contain .pinake',
			},
		);

		return selected?.uri;
	}

	public requireWorkspaceRoot(): vscode.Uri {
		const root = this.getWorkspaceRoot();
		if (!root) {
			throw new Error('Open a workspace folder before using Pinake.');
		}

		return root;
	}

	public getDefaultProjectName(root: vscode.Uri): string {
		return path.basename(root.fsPath);
	}
}
