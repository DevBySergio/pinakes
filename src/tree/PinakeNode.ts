import * as vscode from 'vscode';

export type PinakeNodeKind = 'directory' | 'file';

export interface PinakeNode {
	uri: vscode.Uri;
	label: string;
	relativePath: string;
	kind: PinakeNodeKind;
}
