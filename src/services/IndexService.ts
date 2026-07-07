import * as vscode from 'vscode';
import { internalStateFileNames, pinakeDirectoryName, pinakeInternalDirectoryName } from '../constants';
import { PinakeIndexedDocument, PinakeIndexesState, PinakeSearchResult } from '../types';
import { FileService } from './FileService';
import { joinUri } from './uriUtils';

export class IndexService {
	public constructor(private readonly fileService: FileService) {}

	public async rebuild(root: vscode.Uri): Promise<PinakeIndexesState> {
		const pinakeDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName);
		const markdownFiles = await this.collectMarkdownFiles(pinakeDirectory, []);
		const documents: PinakeIndexedDocument[] = [];
		const termSets = new Map<string, Set<number>>();

		for (const [index, relativePath] of markdownFiles.entries()) {
			const uri = joinUri(pinakeDirectory, relativePath);
			const content = await this.fileService.readText(uri);
			const headings = extractHeadings(content);
			const keywords = Array.from(new Set(tokenize(content))).sort();
			const documentId = index + 1;

			documents.push({
				id: documentId,
				path: relativePath,
				headings,
				keywords: keywords.slice(0, 80),
			});

			for (const keyword of keywords) {
				const set = termSets.get(keyword) ?? new Set<number>();
				set.add(documentId);
				termSets.set(keyword, set);
			}
		}

		const terms: Record<string, number[]> = {};
		for (const [term, ids] of termSets.entries()) {
			terms[term] = Array.from(ids).sort((left, right) => left - right);
		}

		const indexState: PinakeIndexesState = {
			version: 1,
			documents,
			terms,
		};

		await this.fileService.writeJson(this.getIndexUri(root), indexState);
		return indexState;
	}

	public async read(root: vscode.Uri): Promise<PinakeIndexesState | undefined> {
		return this.fileService.readJson<PinakeIndexesState>(this.getIndexUri(root));
	}

	public async search(root: vscode.Uri, query: string, limit = 20): Promise<PinakeSearchResult[]> {
		const terms = Array.from(new Set(tokenize(query)));
		if (terms.length === 0) {
			return [];
		}

		const index = await this.read(root) ?? await this.rebuild(root);
		const documentsById = new Map(index.documents.map((document) => [document.id, document]));
		const scored = new Map<number, PinakeSearchResult>();

		for (const term of terms) {
			for (const documentId of index.terms[term] ?? []) {
				const document = documentsById.get(documentId);
				if (!document) {
					continue;
				}

				const existing = scored.get(documentId) ?? {
					path: document.path,
					headings: document.headings,
					score: 0,
					matchedTerms: [],
				};
				existing.score += 5;
				existing.matchedTerms = addUnique(existing.matchedTerms, term);
				scored.set(documentId, existing);
			}
		}

		for (const document of index.documents) {
			const haystacks = [document.path, ...document.headings].map((value) => value.toLowerCase());
			for (const term of terms) {
				if (!haystacks.some((value) => value.includes(term))) {
					continue;
				}

				const existing = scored.get(document.id) ?? {
					path: document.path,
					headings: document.headings,
					score: 0,
					matchedTerms: [],
				};
				existing.score += 10;
				existing.matchedTerms = addUnique(existing.matchedTerms, term);
				scored.set(document.id, existing);
			}
		}

		return Array.from(scored.values())
			.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
			.slice(0, limit);
	}

	private getIndexUri(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeInternalDirectoryName, internalStateFileNames.indexes);
	}

	private async collectMarkdownFiles(directory: vscode.Uri, relativeSegments: string[]): Promise<string[]> {
		if (!(await this.fileService.exists(directory))) {
			return [];
		}

		const entries = await this.fileService.readDirectory(directory);
		const files: string[] = [];
		const sortedEntries = entries.sort(([leftName, leftType], [rightName, rightType]) => {
			const leftIsDirectory = (leftType & vscode.FileType.Directory) !== 0;
			const rightIsDirectory = (rightType & vscode.FileType.Directory) !== 0;
			if (leftIsDirectory !== rightIsDirectory) {
				return leftIsDirectory ? -1 : 1;
			}

			return leftName.localeCompare(rightName, undefined, { numeric: true, sensitivity: 'base' });
		});

		for (const [name, type] of sortedEntries) {
			if (name === pinakeInternalDirectoryName) {
				continue;
			}

			const nextSegments = [...relativeSegments, name];
			if ((type & vscode.FileType.Directory) !== 0) {
				files.push(...await this.collectMarkdownFiles(vscode.Uri.joinPath(directory, name), nextSegments));
				continue;
			}

			if ((type & vscode.FileType.File) !== 0 && name.toLowerCase().endsWith('.md')) {
				files.push(nextSegments.join('/'));
			}
		}

		return files;
	}
}

function extractHeadings(content: string): string[] {
	return content
		.split(/\r?\n/)
		.map((line) => /^#{1,6}\s+(.+)$/.exec(line)?.[1]?.trim())
		.filter((heading): heading is string => Boolean(heading));
}

function tokenize(content: string): string[] {
	const matches = content.toLowerCase().match(/[a-z0-9_]+/g);
	return matches ?? [];
}

function addUnique(values: string[], value: string): string[] {
	return Array.from(new Set([...values, value])).sort((left, right) => left.localeCompare(right));
}
