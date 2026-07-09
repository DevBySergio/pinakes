import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import {
	internalStateFileNames,
	pinakeDirectoryName,
	pinakeDocsDirectoryName,
	pinakeManifestFileName,
	pinakeStateDirectoryName,
} from '../constants';
import { PinakeManifest, ValidationIssue, ValidationResult } from '../types';
import { FileService } from './FileService';
import { JsonSchema, JsonSchemaValidator } from './JsonSchemaValidator';
import { ManifestService } from './ManifestService';
import { joinUri } from './uriUtils';

interface RuntimeSchemaValidationResult {
	values: Map<string, unknown>;
	invalidPaths: Set<string>;
}

interface JsonSchemaFileSpec {
	relativePath: string;
	schemaFileName: string;
}

const manifestRelativePath = `${pinakeDirectoryName}/${pinakeManifestFileName}`;
const jsonSchemaFiles: JsonSchemaFileSpec[] = [
	{
		relativePath: manifestRelativePath,
		schemaFileName: 'pinake.schema.json',
	},
	{
		relativePath: `${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.modules}`,
		schemaFileName: 'modules.schema.json',
	},
	{
		relativePath: `${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.ui}`,
		schemaFileName: 'ui.schema.json',
	},
	{
		relativePath: `${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.indexes}`,
		schemaFileName: 'indexes.schema.json',
	},
	{
		relativePath: `${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.migrations}`,
		schemaFileName: 'migrations.schema.json',
	},
	{
		relativePath: `${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.version}`,
		schemaFileName: 'version.schema.json',
	},
];

const schemaCache = new Map<string, JsonSchema>();

export class ValidationService {
	public constructor(
		private readonly fileService: FileService,
		private readonly manifestService: ManifestService,
	) {}

	public async validate(root: vscode.Uri): Promise<ValidationResult> {
		const issues: ValidationIssue[] = [];
		await this.validateRequiredRootEntries(root, issues);

		const schemaResult = await this.validateJsonSchemas(root, issues);
		const manifest = this.getValidManifest(schemaResult);
		if (manifest) {
			await this.validateManifestDocuments(root, manifest, issues);
			await this.validateAdrNames(root, manifest, issues);
		}

		await this.validateMarkdownLinks(root, issues);
		await this.validateMarkdownSecretHygiene(root, issues);

		return {
			valid: issues.every((issue) => issue.severity !== 'error'),
			issues,
		};
	}

	private async validateRequiredRootEntries(root: vscode.Uri, issues: ValidationIssue[]): Promise<void> {
		const requiredEntries = [
			pinakeDirectoryName,
			`${pinakeDirectoryName}/${pinakeManifestFileName}`,
			`${pinakeDirectoryName}/${pinakeDocsDirectoryName}`,
			`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.modules}`,
			`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.ui}`,
			`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.indexes}`,
			`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.migrations}`,
			`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.version}`,
		];

		for (const relativePath of requiredEntries) {
			if (!(await this.fileService.exists(joinUri(root, relativePath)))) {
				issues.push({
					severity: 'error',
					message: `Missing required Pinake entry: ${relativePath}.`,
					path: relativePath,
				});
			}
		}
	}

	private async validateJsonSchemas(root: vscode.Uri, issues: ValidationIssue[]): Promise<RuntimeSchemaValidationResult> {
		const values = new Map<string, unknown>();
		const invalidPaths = new Set<string>();
		const schemaValidator = new JsonSchemaValidator();

		for (const spec of jsonSchemaFiles) {
			const uri = spec.relativePath === manifestRelativePath
				? this.manifestService.getManifestUri(root)
				: joinUri(root, spec.relativePath);
			if (!(await this.fileService.exists(uri))) {
				continue;
			}

			let value: unknown;
			try {
				value = JSON.parse(await this.fileService.readText(uri)) as unknown;
				values.set(spec.relativePath, value);
			} catch (error) {
				invalidPaths.add(spec.relativePath);
				issues.push({
					severity: 'error',
					message: `${spec.relativePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`,
					path: spec.relativePath,
				});
				continue;
			}

			let schema: JsonSchema;
			try {
				schema = await readJsonSchema(spec.schemaFileName);
			} catch (error) {
				invalidPaths.add(spec.relativePath);
				issues.push({
					severity: 'error',
					message: `Unable to load runtime schema ${spec.schemaFileName}: ${error instanceof Error ? error.message : String(error)}.`,
					path: spec.relativePath,
				});
				continue;
			}

			const schemaIssues = schemaValidator.validate(value, schema);
			if (schemaIssues.length === 0) {
				continue;
			}

			invalidPaths.add(spec.relativePath);
			for (const schemaIssue of schemaIssues) {
				issues.push({
					severity: 'error',
					message: `${spec.relativePath} ${schemaIssue.path}: ${schemaIssue.message}.`,
					path: spec.relativePath,
				});
			}
		}

		return { values, invalidPaths };
	}

	private getValidManifest(schemaResult: RuntimeSchemaValidationResult): PinakeManifest | undefined {
		if (schemaResult.invalidPaths.has(manifestRelativePath)) {
			return undefined;
		}

		return schemaResult.values.get(manifestRelativePath) as PinakeManifest | undefined;
	}

	private async validateManifestDocuments(root: vscode.Uri, manifest: PinakeManifest, issues: ValidationIssue[]): Promise<void> {
		const docsDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeDocsDirectoryName);
		const seenIds = new Set<string>();
		const seenPaths = new Set<string>();

		for (const document of manifest.documents) {
			const relativePath = `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${document.path}`;
			if (seenIds.has(document.id)) {
				issues.push({
					severity: 'warning',
					message: `Duplicate document id in pinake.json: ${document.id}.`,
					path: `${pinakeDirectoryName}/${pinakeManifestFileName}`,
				});
			}
			seenIds.add(document.id);

			if (seenPaths.has(document.path)) {
				issues.push({
					severity: 'warning',
					message: `Duplicate document path in pinake.json: ${document.path}.`,
					path: `${pinakeDirectoryName}/${pinakeManifestFileName}`,
				});
			}
			seenPaths.add(document.path);

			const documentUri = joinUri(docsDirectory, document.path);
			if (!(await this.fileService.exists(documentUri))) {
				issues.push({
					severity: 'error',
					message: `Document listed in pinake.json is missing: ${relativePath}.`,
					path: relativePath,
				});
				continue;
			}

			if (document.path.toLowerCase().endsWith('.md')) {
				const content = await this.fileService.readText(documentUri);
				const frontmatter = parseMarkdownFrontmatter(content);
				if (!frontmatter) {
					issues.push({
						severity: 'warning',
						message: `Markdown document should include frontmatter: ${relativePath}.`,
						path: relativePath,
					});
				} else {
					validateFrontmatterAlignment(relativePath, document, frontmatter, issues);
				}
			}
		}
	}

	private async validateAdrNames(root: vscode.Uri, manifest: PinakeManifest, issues: ValidationIssue[]): Promise<void> {
		for (const document of manifest.documents.filter((entry) => entry.type === 'adr')) {
			const name = path.posix.basename(document.path);
			if (!/^ADR-\d{4}-.+\.md$/i.test(name)) {
				issues.push({
					severity: 'warning',
					message: `ADR file should match ADR-####-*.md: ${name}.`,
					path: `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${document.path}`,
				});
			}
		}
	}

	private async validateMarkdownLinks(root: vscode.Uri, issues: ValidationIssue[]): Promise<void> {
		const docsDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeDocsDirectoryName);
		const files = await this.collectMarkdownFiles(docsDirectory, []);
		for (const relativePath of files) {
			const fileUri = joinUri(docsDirectory, relativePath);
			const content = await this.fileService.readText(fileUri);
			validateMarkdownStyle(`${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${relativePath}`, content, issues);
			for (const target of extractMarkdownLinkTargets(content)) {
				const resolved = resolveMarkdownLink(docsDirectory, relativePath, target);
				if (!resolved || await this.fileService.exists(resolved)) {
					continue;
				}

				issues.push({
					severity: 'warning',
					message: `Broken Markdown link "${target}" in ${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${relativePath}.`,
					path: `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${relativePath}`,
				});
			}
		}
	}

	private async validateMarkdownSecretHygiene(root: vscode.Uri, issues: ValidationIssue[]): Promise<void> {
		const docsDirectory = vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeDocsDirectoryName);
		const files = await this.collectMarkdownFiles(docsDirectory, []);
		for (const relativePath of files) {
			const fileUri = joinUri(docsDirectory, relativePath);
			const content = await this.fileService.readText(fileUri);
			validateSecretHygiene(`${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${relativePath}`, content, issues);
		}
	}

	private async collectMarkdownFiles(directory: vscode.Uri, relativeSegments: string[]): Promise<string[]> {
		if (!(await this.fileService.exists(directory))) {
			return [];
		}

		const entries = await this.fileService.readDirectory(directory);
		const files: string[] = [];
		for (const [name, type] of entries) {
			if (name === pinakeStateDirectoryName) {
				continue;
			}

			const nextSegments = [...relativeSegments, name];
			if ((type & vscode.FileType.Directory) !== 0) {
				files.push(...await this.collectMarkdownFiles(vscode.Uri.joinPath(directory, name), nextSegments));
			} else if ((type & vscode.FileType.File) !== 0 && name.toLowerCase().endsWith('.md')) {
				files.push(nextSegments.join('/'));
			}
		}

	return files;
	}
}

interface MarkdownFrontmatter {
	values: Record<string, string>;
	closed: boolean;
}

interface SecretPattern {
	name: string;
	pattern: RegExp;
	getValue?: (match: RegExpMatchArray) => string | undefined;
}

const secretPatterns: SecretPattern[] = [
	{
		name: 'private key material',
		pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/,
	},
	{
		name: 'GitHub token',
		pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/,
	},
	{
		name: 'AWS access key id',
		pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
	},
	{
		name: 'Slack token',
		pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
	},
	{
		name: 'JWT-like token',
		pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
	},
	{
		name: 'credential assignment',
		pattern: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|secret|token)\b\s*[:=]\s*["']?([^"'\s`]{12,})["']?/i,
		getValue: (match) => match[1],
	},
];

function parseMarkdownFrontmatter(content: string): MarkdownFrontmatter | undefined {
	const normalized = content.replace(/^\uFEFF/, '');
	if (!normalized.startsWith('---')) {
		return undefined;
	}

	const lines = normalized.split(/\r?\n/);
	if (lines[0]?.trim() !== '---') {
		return undefined;
	}

	const frontmatterLines: string[] = [];
	for (let index = 1; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		if (line.trim() === '---') {
			return {
				values: parseFrontmatterScalars(frontmatterLines),
				closed: true,
			};
		}

		frontmatterLines.push(line);
	}

	return {
		values: parseFrontmatterScalars(frontmatterLines),
		closed: false,
	};
}

function parseFrontmatterScalars(lines: string[]): Record<string, string> {
	const values: Record<string, string> = {};
	for (const line of lines) {
		if (/^\s/.test(line)) {
			continue;
		}

		const match = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
		if (!match) {
			continue;
		}

		values[match[1]] = normalizeFrontmatterValue(match[2]);
	}

	return values;
}

function normalizeFrontmatterValue(rawValue: string): string {
	const value = rawValue.trim();
	if (value.startsWith('"') && value.endsWith('"')) {
		try {
			return JSON.parse(value) as string;
		} catch {
			return value.slice(1, -1);
		}
	}

	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1).replace(/''/g, "'");
	}

	return value;
}

function validateFrontmatterAlignment(
	relativePath: string,
	document: PinakeManifest['documents'][number],
	frontmatter: MarkdownFrontmatter,
	issues: ValidationIssue[],
): void {
	if (!frontmatter.closed) {
		issues.push({
			severity: 'warning',
			message: `Markdown frontmatter should close with ---: ${relativePath}.`,
			path: relativePath,
		});
		return;
	}

	const expectedValues: Record<string, string> = {
		title: document.title,
		type: document.type,
		status: document.status,
		order: String(document.order),
	};

	for (const [field, expected] of Object.entries(expectedValues)) {
		const actual = frontmatter.values[field];
		if (actual === undefined) {
			issues.push({
				severity: 'warning',
				message: `Markdown frontmatter should include ${field}: ${relativePath}.`,
				path: relativePath,
			});
			continue;
		}

		if (field === 'order' ? Number(actual) !== document.order : actual !== expected) {
			issues.push({
				severity: 'warning',
				message: `Markdown frontmatter ${field} should match pinake.json for ${relativePath}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}.`,
				path: relativePath,
			});
		}
	}
}

function validateSecretHygiene(relativePath: string, content: string, issues: ValidationIssue[]): void {
	const lines = content.split(/\r?\n/);
	for (const [index, line] of lines.entries()) {
		if (isSecretPlaceholderLine(line)) {
			continue;
		}

		for (const secretPattern of secretPatterns) {
			const match = line.match(secretPattern.pattern);
			if (!match) {
				continue;
			}

			const value = secretPattern.getValue?.(match) ?? match[0];
			if (isSafePlaceholderValue(value)) {
				continue;
			}

			issues.push({
				severity: 'warning',
				message: `Possible secret-like content detected (${secretPattern.name}) in ${relativePath}.`,
				path: relativePath,
				line: index + 1,
			});
			break;
		}
	}
}

function isSecretPlaceholderLine(line: string): boolean {
	const trimmed = line.trim();
	if (!trimmed) {
		return true;
	}

	return /^(?:[-*]\s*)?(?:`)?[A-Z][A-Z0-9_]*(?:`)?(?:\s+-\s+|\s*:\s*$|\s*$)/.test(trimmed)
		&& /(?:TOKEN|SECRET|PASSWORD|API_KEY|KEY)$/i.test(trimmed);
}

function isSafePlaceholderValue(value: string): boolean {
	const normalized = value.toUpperCase();
	return normalized.includes('EXAMPLE')
		|| normalized.includes('SAMPLE')
		|| normalized.includes('PLACEHOLDER')
		|| normalized.includes('REDACTED')
		|| normalized.includes('CHANGEME')
		|| normalized.includes('CHANGE_ME')
		|| normalized.includes('YOUR_')
		|| normalized.includes('XXXX')
		|| normalized.includes('***')
		|| /^<[^>]+>$/.test(value)
		|| /^\$\{[^}]+}$/.test(value);
}

function validateMarkdownStyle(relativePath: string, content: string, issues: ValidationIssue[]): void {
	const lines = content.split(/\r?\n/);
	let h1Count = 0;
	let inFence = false;
	let fenceStartLine = 0;

	for (const [index, line] of lines.entries()) {
		const lineNumber = index + 1;
		if (/[ \t]$/.test(line)) {
			issues.push({
				severity: 'warning',
				message: `Markdown line has trailing whitespace: ${relativePath}.`,
				path: relativePath,
				line: lineNumber,
			});
		}

		if (/^\t+/.test(line)) {
			issues.push({
				severity: 'warning',
				message: `Markdown line starts with a tab; use spaces for indentation: ${relativePath}.`,
				path: relativePath,
				line: lineNumber,
			});
		}

		if (/^```/.test(line.trim())) {
			if (inFence) {
				inFence = false;
			} else {
				inFence = true;
				fenceStartLine = lineNumber;
			}
		}

		if (/^#\s+\S/.test(line)) {
			h1Count += 1;
		}
	}

	if (h1Count === 0) {
		issues.push({
			severity: 'warning',
			message: `Markdown document should include a top-level heading: ${relativePath}.`,
			path: relativePath,
		});
	} else if (h1Count > 1) {
		issues.push({
			severity: 'warning',
			message: `Markdown document should include only one top-level heading: ${relativePath}.`,
			path: relativePath,
		});
	}

	if (inFence) {
		issues.push({
			severity: 'warning',
			message: `Markdown fenced code block is not closed: ${relativePath}.`,
			path: relativePath,
			line: fenceStartLine,
		});
	}
}

function extractMarkdownLinkTargets(content: string): string[] {
	const targets: string[] = [];
	const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;
	let match = linkPattern.exec(content);
	while (match) {
		const target = match[1]?.trim();
		if (target && !target.startsWith('#') && !/^(https?:|mailto:|tel:)/i.test(target)) {
			targets.push(target);
		}

		match = linkPattern.exec(content);
	}

	return targets;
}

function resolveMarkdownLink(docsDirectory: vscode.Uri, sourceRelativePath: string, rawTarget: string): vscode.Uri | undefined {
	const withoutAnchor = rawTarget.split('#')[0]?.split('?')[0];
	if (!withoutAnchor || withoutAnchor.length === 0) {
		return undefined;
	}

	let decodedTarget: string;
	try {
		decodedTarget = decodeURIComponent(withoutAnchor);
	} catch {
		decodedTarget = withoutAnchor;
	}

	if (decodedTarget.startsWith('/')) {
		return joinUri(
			docsDirectory,
			decodedTarget
				.replace(/^\/?\.pinake\/docs\//, '')
				.replace(/^\/?Pinake\//, '')
				.replace(/^\//, ''),
		);
	}

	const sourceDirectory = path.posix.dirname(sourceRelativePath);
	const normalized = path.posix.normalize(path.posix.join(sourceDirectory, decodedTarget));
	if (normalized.startsWith('..')) {
		return undefined;
	}

	return joinUri(docsDirectory, normalized);
}

async function readJsonSchema(schemaFileName: string): Promise<JsonSchema> {
	const cached = schemaCache.get(schemaFileName);
	if (cached) {
		return cached;
	}

	const schemaPath = path.join(__dirname, '..', '..', 'schemas', schemaFileName);
	const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8')) as JsonSchema;
	schemaCache.set(schemaFileName, schema);
	return schema;
}
