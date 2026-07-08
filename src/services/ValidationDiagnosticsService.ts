import * as path from 'path';
import * as vscode from 'vscode';
import { pinakeDirectoryName } from '../constants';
import { ValidationIssue, ValidationResult, ValidationSeverity } from '../types';
import { FileService } from './FileService';
import { joinUri } from './uriUtils';

export class ValidationDiagnosticsService {
	public constructor(
		private readonly fileService: FileService,
		private readonly diagnostics: vscode.DiagnosticCollection,
	) {}

	public async update(root: vscode.Uri, result: ValidationResult): Promise<void> {
		const diagnosticsByUri = new Map<string, { uri: vscode.Uri; diagnostics: vscode.Diagnostic[] }>();

		for (const issue of result.issues) {
			const uri = this.getIssueUri(root, issue);
			if (!uri) {
				continue;
			}

			const diagnostic = new vscode.Diagnostic(
				await this.createRange(uri, issue.line),
				issue.message,
				toDiagnosticSeverity(issue.severity),
			);
			diagnostic.source = 'Pinake';

			const key = uri.toString();
			const entry = diagnosticsByUri.get(key) ?? { uri, diagnostics: [] };
			entry.diagnostics.push(diagnostic);
			diagnosticsByUri.set(key, entry);
		}

		this.diagnostics.clear();
		for (const entry of diagnosticsByUri.values()) {
			this.diagnostics.set(entry.uri, entry.diagnostics);
		}
	}

	public clear(): void {
		this.diagnostics.clear();
	}

	private getIssueUri(root: vscode.Uri, issue: ValidationIssue): vscode.Uri | undefined {
		if (!issue.path) {
			return undefined;
		}

		const normalizedPath = path.posix.normalize(issue.path.replace(/\\/g, '/'));
		if (
			normalizedPath === '.'
			|| path.posix.isAbsolute(normalizedPath)
			|| normalizedPath === '..'
			|| normalizedPath.startsWith('../')
		) {
			return undefined;
		}

		if (normalizedPath !== pinakeDirectoryName && !normalizedPath.startsWith(`${pinakeDirectoryName}/`)) {
			return undefined;
		}

		return joinUri(root, normalizedPath);
	}

	private async createRange(uri: vscode.Uri, line: number | undefined): Promise<vscode.Range> {
		const requestedLine = Math.max(0, (line ?? 1) - 1);
		const lineText = await this.readLine(uri, requestedLine);
		const endCharacter = Math.max(1, lineText.text.length);
		return new vscode.Range(lineText.line, 0, lineText.line, endCharacter);
	}

	private async readLine(uri: vscode.Uri, requestedLine: number): Promise<{ line: number; text: string }> {
		try {
			const text = await this.fileService.readText(uri);
			const lines = text.split(/\r\n|\r|\n/);
			const line = Math.min(requestedLine, Math.max(0, lines.length - 1));
			return { line, text: lines[line] ?? '' };
		} catch {
			return { line: requestedLine, text: '' };
		}
	}
}

function toDiagnosticSeverity(severity: ValidationSeverity): vscode.DiagnosticSeverity {
	switch (severity) {
		case 'error':
			return vscode.DiagnosticSeverity.Error;
		case 'warning':
			return vscode.DiagnosticSeverity.Warning;
		case 'info':
			return vscode.DiagnosticSeverity.Information;
	}
}
