import * as path from 'path';
import * as vscode from 'vscode';
import { internalStateFileNames, pinakeDirectoryName, pinakeDocsDirectoryName, pinakeStateDirectoryName } from '../constants';
import {
	PinakeBacklink,
	PinakeBrokenReference,
	PinakeIndexedDocument,
	PinakeIndexedHeading,
	PinakeIndexesState,
	PinakeReferenceGraph,
	PinakeSearchResult,
} from '../types';
import { FileService } from './FileService';
import { extractMarkdownLinks, resolveMarkdownLinkPath } from './markdownLinks';
import { joinUri } from './uriUtils';

interface ParsedSearchQuery {
	terms: string[];
	tagFilters: string[];
	headingFilters: string[];
}

export class IndexService {
	public constructor(private readonly fileService: FileService) {}

	public async rebuild(root: vscode.Uri): Promise<PinakeIndexesState> {
		const docsDirectory = this.getDocsDirectory(root);
		const markdownFiles = await this.collectMarkdownFiles(docsDirectory, []);
		const markdownFileSet = new Set(markdownFiles);
		const documents: PinakeIndexedDocument[] = [];

		for (const [index, relativePath] of markdownFiles.entries()) {
			documents.push(await this.indexDocument(docsDirectory, relativePath, markdownFileSet, index + 1));
		}

		const indexState = createIndexState(documents);
		await this.fileService.writeJson(this.getIndexUri(root), indexState);
		return indexState;
	}

	public async read(root: vscode.Uri): Promise<PinakeIndexesState | undefined> {
		const index = await this.fileService.readJson<PinakeIndexesState>(this.getIndexUri(root));
		return index?.version === 2 ? index : undefined;
	}

	public async updateDocument(root: vscode.Uri, targetPath: string): Promise<PinakeIndexesState> {
		const relativePath = normalizeReferencePath(targetPath);
		if (!relativePath.toLowerCase().endsWith('.md')) {
			return await this.read(root) ?? await this.rebuild(root);
		}

		const docsDirectory = this.getDocsDirectory(root);
		const markdownFiles = await this.collectMarkdownFiles(docsDirectory, []);
		const markdownFileSet = new Set(markdownFiles);
		if (!markdownFileSet.has(relativePath)) {
			return this.removeDocument(root, relativePath);
		}

		const index = await this.read(root);
		if (!index) {
			return this.rebuild(root);
		}

		const existingDocument = index.documents.find((document) => document.path === relativePath);
		const documentId = existingDocument?.id ?? Math.max(0, ...index.documents.map((document) => document.id)) + 1;
		const nextDocument = await this.indexDocument(docsDirectory, relativePath, markdownFileSet, documentId);
		const documents = existingDocument
			? index.documents.map((document) => document.path === relativePath ? nextDocument : document)
			: [...index.documents, nextDocument];

		return this.writeIndex(root, refreshLinkStates(documents, markdownFileSet));
	}

	public async removeDocument(root: vscode.Uri, targetPath: string): Promise<PinakeIndexesState> {
		const index = await this.read(root);
		if (!index) {
			return this.rebuild(root);
		}

		const docsDirectory = this.getDocsDirectory(root);
		const markdownFiles = await this.collectMarkdownFiles(docsDirectory, []);
		const markdownFileSet = new Set(markdownFiles);
		const normalizedTarget = normalizeReferencePath(targetPath);
		const documents = index.documents.filter((document) => document.path !== normalizedTarget);
		return this.writeIndex(root, refreshLinkStates(documents, markdownFileSet));
	}

	public async search(root: vscode.Uri, query: string, limit = 20): Promise<PinakeSearchResult[]> {
		const parsed = parseSearchQuery(query);
		if (parsed.terms.length === 0 && parsed.tagFilters.length === 0 && parsed.headingFilters.length === 0) {
			return [];
		}

		const docsDirectory = this.getDocsDirectory(root);
		const index = await this.read(root) ?? await this.rebuild(root);
		const documentsById = new Map(index.documents.map((document) => [document.id, document]));
		const scored = new Map<number, PinakeSearchResult>();
		const candidateDocuments = parsed.terms.length > 0
			? this.getTermMatchedDocuments(parsed.terms, index, documentsById, scored)
			: index.documents;

		for (const document of candidateDocuments) {
			if (!matchesFilters(document, parsed)) {
				continue;
			}

			const haystacks = [
				document.path,
				document.title ?? '',
				...document.headings,
				...document.tags,
				...document.keywords,
			].map((value) => value.toLowerCase());
			const existing = scored.get(document.id) ?? createSearchResult(document);

			for (const term of parsed.terms) {
				if (document.tags.some((tag) => tag.toLowerCase() === term)) {
					existing.score += 20;
					existing.matchedTerms = addUnique(existing.matchedTerms, term);
				}

				if ((document.title ?? '').toLowerCase().includes(term)) {
					existing.score += 18;
					existing.matchedTerms = addUnique(existing.matchedTerms, term);
				}

				if (document.headings.some((heading) => heading.toLowerCase().includes(term))) {
					existing.score += 14;
					existing.matchedTerms = addUnique(existing.matchedTerms, term);
				}

				if (document.path.toLowerCase().includes(term)) {
					existing.score += 10;
					existing.matchedTerms = addUnique(existing.matchedTerms, term);
				}

				if (haystacks.some((value) => value.includes(term))) {
					existing.score += 4;
					existing.matchedTerms = addUnique(existing.matchedTerms, term);
				}
			}

			if (parsed.tagFilters.length > 0) {
				existing.score += 12 * parsed.tagFilters.length;
			}

			if (parsed.headingFilters.length > 0) {
				existing.score += 8 * parsed.headingFilters.length;
			}

			if (parsed.terms.length === 0 && existing.score === 0) {
				existing.score = 1;
			}

			scored.set(document.id, existing);
		}

		const results = Array.from(scored.values())
			.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
			.slice(0, limit);

		for (const result of results) {
			const content = await this.fileService.readText(joinUri(docsDirectory, result.path));
			result.snippet = createSnippet(content, parsed.terms);
		}

		return results;
	}

	public async findBacklinks(root: vscode.Uri, targetPath: string): Promise<PinakeBacklink[]> {
		const normalizedTarget = normalizeReferencePath(targetPath);
		const docsDirectory = this.getDocsDirectory(root);
		const index = await this.read(root) ?? await this.rebuild(root);
		const backlinks: PinakeBacklink[] = [];

		for (const document of index.documents) {
			for (const link of document.links) {
				if (link.resolvedPath !== normalizedTarget) {
					continue;
				}

				const content = await this.fileService.readText(joinUri(docsDirectory, document.path));
				backlinks.push({
					sourcePath: document.path,
					targetPath: normalizedTarget,
					targetRaw: link.target,
					line: link.line,
					snippet: getLineSnippet(content, link.line),
				});
			}
		}

		return backlinks.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath) || left.line - right.line);
	}

	public async findBrokenReferences(root: vscode.Uri): Promise<PinakeBrokenReference[]> {
		const index = await this.read(root) ?? await this.rebuild(root);
		return index.documents
			.flatMap((document) => document.links
				.filter((link) => link.broken)
				.map((link) => ({
					sourcePath: document.path,
					targetRaw: link.target,
					line: link.line,
				})))
			.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath) || left.line - right.line);
	}

	public async getReferenceGraph(root: vscode.Uri): Promise<PinakeReferenceGraph> {
		const index = await this.read(root) ?? await this.rebuild(root);
		return {
			nodes: index.documents
				.map((document) => ({
					path: document.path,
					title: document.title,
					tags: document.tags,
				}))
				.sort((left, right) => left.path.localeCompare(right.path)),
			edges: index.documents
				.flatMap((document) => document.links.map((link) => ({
					sourcePath: document.path,
					targetPath: link.resolvedPath,
					targetRaw: link.target,
					line: link.line,
					broken: link.broken,
				})))
				.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath) || left.line - right.line),
		};
	}

	private getTermMatchedDocuments(
		terms: string[],
		index: PinakeIndexesState,
		documentsById: Map<number, PinakeIndexedDocument>,
		scored: Map<number, PinakeSearchResult>,
	): PinakeIndexedDocument[] {
		const candidates = new Map<number, PinakeIndexedDocument>();
		for (const term of terms) {
			for (const documentId of index.terms[term] ?? []) {
				const document = documentsById.get(documentId);
				if (!document) {
					continue;
				}

				const existing = scored.get(documentId) ?? createSearchResult(document);
				existing.score += 6;
				existing.matchedTerms = addUnique(existing.matchedTerms, term);
				scored.set(documentId, existing);
				candidates.set(documentId, document);
			}
		}

		return Array.from(candidates.values());
	}

	private getIndexUri(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeStateDirectoryName, internalStateFileNames.indexes);
	}

	private getDocsDirectory(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeDocsDirectoryName);
	}

	private async indexDocument(
		docsDirectory: vscode.Uri,
		relativePath: string,
		markdownFileSet: Set<string>,
		documentId: number,
	): Promise<PinakeIndexedDocument> {
		const uri = joinUri(docsDirectory, relativePath);
		const content = await this.fileService.readText(uri);
		const headingDetails = extractHeadingDetails(content);
		const tags = extractTags(content);
		const links = extractMarkdownLinks(content)
			.map((link) => {
				const resolvedPath = resolveMarkdownLinkPath(relativePath, link.target, markdownFileSet);
				return {
					...link,
					resolvedPath,
					broken: resolvedPath === undefined,
				};
			});
		const searchableText = [
			relativePath,
			...headingDetails.map((heading) => heading.text),
			...tags,
			content,
		].join('\n');
		const keywords = Array.from(new Set(tokenize(searchableText))).sort();
		return {
			id: documentId,
			path: relativePath,
			title: headingDetails[0]?.text,
			headings: headingDetails.map((heading) => heading.text),
			headingDetails,
			keywords: keywords.slice(0, 120),
			tags,
			links,
		};
	}

	private async writeIndex(root: vscode.Uri, documents: PinakeIndexedDocument[]): Promise<PinakeIndexesState> {
		const indexState = createIndexState(documents.sort((left, right) => left.path.localeCompare(right.path)));
		await this.fileService.writeJson(this.getIndexUri(root), indexState);
		return indexState;
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
			if (name === pinakeStateDirectoryName) {
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

function createIndexState(documents: PinakeIndexedDocument[]): PinakeIndexesState {
	return {
		version: 2,
		documents,
		terms: createTerms(documents),
	};
}

function createTerms(documents: PinakeIndexedDocument[]): Record<string, number[]> {
	const termSets = new Map<string, Set<number>>();
	for (const document of documents) {
		for (const keyword of document.keywords) {
			const set = termSets.get(keyword) ?? new Set<number>();
			set.add(document.id);
			termSets.set(keyword, set);
		}
	}

	const terms: Record<string, number[]> = {};
	for (const [term, ids] of termSets.entries()) {
		terms[term] = Array.from(ids).sort((left, right) => left - right);
	}

	return terms;
}

function refreshLinkStates(documents: PinakeIndexedDocument[], markdownFileSet: Set<string>): PinakeIndexedDocument[] {
	return documents.map((document) => ({
		...document,
		links: document.links.map((link) => {
			const resolvedPath = resolveMarkdownLinkPath(document.path, link.target, markdownFileSet);
			return {
				...link,
				resolvedPath,
				broken: resolvedPath === undefined,
			};
		}),
	}));
}

function createSearchResult(document: PinakeIndexedDocument): PinakeSearchResult {
	return {
		path: document.path,
		title: document.title,
		headings: document.headings,
		score: 0,
		matchedTerms: [],
		tags: document.tags,
	};
}

function extractHeadingDetails(content: string): PinakeIndexedHeading[] {
	return content
		.split(/\r?\n/)
		.map((line, index) => {
			const match = /^(#{1,6})\s+(.+)$/.exec(line);
			if (!match) {
				return undefined;
			}

			return {
				level: match[1].length,
				text: match[2].trim(),
				line: index + 1,
			};
		})
		.filter((heading): heading is PinakeIndexedHeading => Boolean(heading));
}

function extractTags(content: string): string[] {
	const frontmatter = extractFrontmatter(content);
	if (!frontmatter) {
		return [];
	}

	const tags = new Set<string>();
	const lines = frontmatter.split(/\r?\n/);
	let readingList = false;
	for (const line of lines) {
		const inlineMatch = /^(tags|keywords):\s*\[(.*)]\s*$/i.exec(line);
		if (inlineMatch) {
			readingList = false;
			for (const value of inlineMatch[2].split(',')) {
				addTag(tags, value);
			}
			continue;
		}

		const scalarMatch = /^(tags|keywords):\s*(.+)\s*$/i.exec(line);
		if (scalarMatch) {
			readingList = false;
			for (const value of scalarMatch[2].split(',')) {
				addTag(tags, value);
			}
			continue;
		}

		if (/^(tags|keywords):\s*$/i.test(line)) {
			readingList = true;
			continue;
		}

		if (readingList) {
			const listMatch = /^\s*-\s*(.+)\s*$/.exec(line);
			if (!listMatch) {
				readingList = false;
				continue;
			}
			addTag(tags, listMatch[1]);
		}
	}

	return Array.from(tags).sort((left, right) => left.localeCompare(right));
}

function extractFrontmatter(content: string): string | undefined {
	if (!content.startsWith('---')) {
		return undefined;
	}

	const endIndex = content.indexOf('\n---', 3);
	if (endIndex < 0) {
		return undefined;
	}

	return content.slice(3, endIndex).trim();
}

function addTag(tags: Set<string>, value: string): void {
	const normalized = value.trim().replace(/^["']|["']$/g, '').toLowerCase();
	if (normalized.length > 0) {
		tags.add(normalized);
	}
}

function normalizeReferencePath(targetPath: string): string {
	const normalized = path.posix.normalize(targetPath
		.split('#')[0]
		?.split('?')[0] ?? targetPath);
	return normalized
		.replace(/^\/?\.pinake\/docs\//, '')
		.replace(/^\/?Pinake\//, '')
		.replace(/^\//, '')
		.replace(/^\.\//, '');
}

function parseSearchQuery(query: string): ParsedSearchQuery {
	const terms: string[] = [];
	const tagFilters: string[] = [];
	const headingFilters: string[] = [];
	for (const rawToken of query.match(/"[^"]+"|\S+/g) ?? []) {
		const token = rawToken.replace(/^"|"$/g, '').trim().toLowerCase();
		if (token.length === 0) {
			continue;
		}

		if (token.startsWith('tag:')) {
			tagFilters.push(token.slice('tag:'.length));
		} else if (token.startsWith('#')) {
			tagFilters.push(token.slice(1));
		} else if (token.startsWith('heading:')) {
			headingFilters.push(token.slice('heading:'.length));
		} else {
			terms.push(...tokenize(token));
		}
	}

	return {
		terms: Array.from(new Set(terms)),
		tagFilters: Array.from(new Set(tagFilters.filter(Boolean))),
		headingFilters: Array.from(new Set(headingFilters.filter(Boolean))),
	};
}

function matchesFilters(document: PinakeIndexedDocument, parsed: ParsedSearchQuery): boolean {
	return parsed.tagFilters.every((filter) => document.tags.some((tag) => tag.toLowerCase() === filter))
		&& parsed.headingFilters.every((filter) => document.headings.some((heading) => heading.toLowerCase().includes(filter)));
}

function tokenize(content: string): string[] {
	const matches = content.toLowerCase().match(/[a-z0-9_]+/g);
	return matches ?? [];
}

function createSnippet(content: string, terms: string[]): string | undefined {
	const lines = content
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('---'));
	const matched = terms.length > 0
		? lines.find((line) => terms.some((term) => line.toLowerCase().includes(term)))
		: undefined;
	const fallback = matched ?? lines.find((line) => !line.startsWith('#'));
	return fallback ? truncate(fallback.replace(/^#+\s*/, ''), 180) : undefined;
}

function getLineSnippet(content: string, lineNumber: number): string | undefined {
	const line = content.split(/\r?\n/)[lineNumber - 1]?.trim();
	return line ? truncate(line, 180) : undefined;
}

function truncate(value: string, maxLength: number): string {
	return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function addUnique(values: string[], value: string): string[] {
	return Array.from(new Set([...values, value])).sort((left, right) => left.localeCompare(right));
}
