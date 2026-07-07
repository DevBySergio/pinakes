import * as path from 'path';
import * as vscode from 'vscode';

export class WorkspaceService {
	public getWorkspaceRoot(): vscode.Uri | undefined {
		const folder = vscode.workspace.workspaceFolders?.[0];
		return folder?.uri;
	}

	public requireWorkspaceRoot(): vscode.Uri {
		const root = this.getWorkspaceRoot();
		if (!root) {
			throw new Error('Open a workspace folder before using Pinakes.');
		}

		return root;
	}

	public getDefaultProjectName(root: vscode.Uri): string {
		return path.basename(root.fsPath);
	}
}
