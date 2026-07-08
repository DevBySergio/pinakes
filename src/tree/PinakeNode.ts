import * as vscode from 'vscode';
import { PinakeDocumentDefinition } from '../types';

export type PinakeEmptyState = 'noWorkspace' | 'createPinake' | 'emptyDocs';

export type PinakeNodeKind = 'directory' | 'file' | 'favorites' | 'favoriteFile' | 'emptyState';

export interface PinakeNode {
	uri: vscode.Uri;
	label: string;
	relativePath: string;
	kind: PinakeNodeKind;
	sourceRelativePath?: string;
	document?: PinakeDocumentDefinition;
	emptyState?: PinakeEmptyState;
}
