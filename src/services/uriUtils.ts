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
	const rootPath = trimTrailingSlash(root.path);
	if (!isUriInside(root, uri)) {
		throw new Error(`URI is outside ${root.fsPath}: ${uri.fsPath}`);
	}

	if (uri.path === rootPath) {
		return '';
	}

	return decodeURIComponent(uri.path.slice(rootPath.length + 1));
}

export function normalizeRelativePath(relativePath: string): string {
	return relativePath.split(path.sep).join('/');
}

export function isUriInside(parent: vscode.Uri, uri: vscode.Uri): boolean {
	if (parent.scheme !== uri.scheme) {
		return false;
	}

	const parentPath = trimTrailingSlash(parent.path);
	return uri.path === parentPath || uri.path.startsWith(`${parentPath}/`);
}

function trimTrailingSlash(value: string): string {
	return value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
}
