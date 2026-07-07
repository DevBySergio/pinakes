import * as path from 'path';
import * as vscode from 'vscode';

export function joinUri(base: vscode.Uri, relativePath: string): vscode.Uri {
	const segments = relativePath.split('/').filter((segment) => segment.length > 0);
	return vscode.Uri.joinPath(base, ...segments);
}

export function uriBasename(uri: vscode.Uri): string {
	return path.posix.basename(uri.path);
}

export function uriDirname(uri: vscode.Uri): vscode.Uri {
	const parentPath = path.posix.dirname(uri.path);
	return uri.with({ path: parentPath });
}

export function toWorkspaceRelative(root: vscode.Uri, uri: vscode.Uri): string {
	const rootPath = root.path.endsWith('/') ? root.path : `${root.path}/`;
	if (!uri.path.startsWith(rootPath)) {
		return uriBasename(uri);
	}

	return decodeURIComponent(uri.path.slice(rootPath.length));
}

export function normalizeRelativePath(relativePath: string): string {
	return relativePath.split(path.sep).join('/');
}
