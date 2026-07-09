#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const pinakeDirectoryName = '.pinake';
const pinakeDocsDirectoryName = 'docs';
const pinakeStateDirectoryName = '.state';
const pinakeManifestFileName = 'pinake.json';

const internalStateFileNames = {
	modules: 'modules.json',
	ui: 'ui.json',
	indexes: 'indexes.json',
	migrations: 'migrations.json',
	version: 'version.json',
};

const manifestRelativePath = `${pinakeDirectoryName}/${pinakeManifestFileName}`;
const schemaSpecs = [
	[manifestRelativePath, createManifestSchema()],
	[`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.modules}`, createModulesSchema()],
	[`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.ui}`, createUiSchema()],
	[`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.indexes}`, createIndexesSchema()],
	[`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.migrations}`, createMigrationsSchema()],
	[`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.version}`, createVersionSchema()],
];

const secretPatterns = [
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

const options = parseArgs(process.argv.slice(2));
const result = await validatePinake(path.resolve(options.root));
writeResult(result, options.format);
process.exitCode = result.valid ? 0 : 1;

async function validatePinake(root) {
	const issues = [];
	await validateRequiredEntries(root, issues);
	const schemaResult = await validateJsonSchemas(root, issues);
	const manifest = schemaResult.invalidPaths.has(manifestRelativePath) ? undefined : schemaResult.values.get(manifestRelativePath);
	if (manifest) {
		await validateManifestDocuments(root, manifest, issues);
		await validateAdrNames(manifest, issues);
	}

	await validateMarkdownDocuments(root, issues);
	await validateMarkdownSecretHygiene(root, issues);
	return {
		valid: issues.every((issue) => issue.severity !== 'error'),
		issueCount: issues.length,
		issues,
	};
}

async function validateRequiredEntries(root, issues) {
	const requiredEntries = [
		pinakeDirectoryName,
		manifestRelativePath,
		`${pinakeDirectoryName}/${pinakeDocsDirectoryName}`,
		`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.modules}`,
		`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.ui}`,
		`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.indexes}`,
		`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.migrations}`,
		`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.version}`,
	];

	for (const relativePath of requiredEntries) {
		if (!(await exists(path.join(root, relativePath)))) {
			issues.push({
				severity: 'error',
				message: `Missing required Pinake entry: ${relativePath}.`,
				path: relativePath,
			});
		}
	}
}

async function validateJsonSchemas(root, issues) {
	const values = new Map();
	const invalidPaths = new Set();
	for (const [relativePath, schema] of schemaSpecs) {
		const absolutePath = path.join(root, relativePath);
		if (!(await exists(absolutePath))) {
			continue;
		}

		let value;
		try {
			value = JSON.parse(await fs.readFile(absolutePath, 'utf8'));
			values.set(relativePath, value);
		} catch (error) {
			invalidPaths.add(relativePath);
			issues.push({
				severity: 'error',
				message: `${relativePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`,
				path: relativePath,
			});
			continue;
		}

		const schemaIssues = validateJsonSchema(value, schema);
		if (schemaIssues.length === 0) {
			continue;
		}

		invalidPaths.add(relativePath);
		for (const issue of schemaIssues) {
			issues.push({
				severity: 'error',
				message: `${relativePath} ${issue.path}: ${issue.message}.`,
				path: relativePath,
			});
		}
	}

	return { values, invalidPaths };
}

async function validateManifestDocuments(root, manifest, issues) {
	const docsDirectory = path.join(root, pinakeDirectoryName, pinakeDocsDirectoryName);
	const seenIds = new Set();
	const seenPaths = new Set();

	for (const document of manifest.documents) {
		const relativePath = `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${document.path}`;
		if (seenIds.has(document.id)) {
			issues.push({
				severity: 'warning',
				message: `Duplicate document id in pinake.json: ${document.id}.`,
				path: manifestRelativePath,
			});
		}
		seenIds.add(document.id);

		if (seenPaths.has(document.path)) {
			issues.push({
				severity: 'warning',
				message: `Duplicate document path in pinake.json: ${document.path}.`,
				path: manifestRelativePath,
			});
		}
		seenPaths.add(document.path);

		const documentPath = path.join(docsDirectory, document.path);
		if (!(await exists(documentPath))) {
			issues.push({
				severity: 'error',
				message: `Document listed in pinake.json is missing: ${relativePath}.`,
				path: relativePath,
			});
			continue;
		}

		if (document.path.toLowerCase().endsWith('.md')) {
			const content = await fs.readFile(documentPath, 'utf8');
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

async function validateAdrNames(manifest, issues) {
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

async function validateMarkdownDocuments(root, issues) {
	const docsDirectory = path.join(root, pinakeDirectoryName, pinakeDocsDirectoryName);
	for (const relativePath of await collectMarkdownFiles(docsDirectory, [])) {
		const absolutePath = path.join(docsDirectory, relativePath);
		const content = await fs.readFile(absolutePath, 'utf8');
		const pinakePath = `${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${relativePath}`;
		validateMarkdownStyle(pinakePath, content, issues);
		for (const target of extractMarkdownLinkTargets(content)) {
			const resolved = resolveMarkdownLink(docsDirectory, relativePath, target);
			if (!resolved || await exists(resolved)) {
				continue;
			}

			issues.push({
				severity: 'warning',
				message: `Broken Markdown link "${target}" in ${pinakePath}.`,
				path: pinakePath,
			});
		}
	}
}

async function validateMarkdownSecretHygiene(root, issues) {
	const docsDirectory = path.join(root, pinakeDirectoryName, pinakeDocsDirectoryName);
	for (const relativePath of await collectMarkdownFiles(docsDirectory, [])) {
		const absolutePath = path.join(docsDirectory, relativePath);
		const content = await fs.readFile(absolutePath, 'utf8');
		validateSecretHygiene(`${pinakeDirectoryName}/${pinakeDocsDirectoryName}/${relativePath}`, content, issues);
	}
}

async function collectMarkdownFiles(directory, relativeSegments) {
	if (!(await exists(directory))) {
		return [];
	}

	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		if (entry.name === pinakeStateDirectoryName) {
			continue;
		}

		const nextSegments = [...relativeSegments, entry.name];
		if (entry.isDirectory()) {
			files.push(...await collectMarkdownFiles(path.join(directory, entry.name), nextSegments));
		} else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
			files.push(nextSegments.join('/'));
		}
	}

	return files;
}

function parseMarkdownFrontmatter(content) {
	const normalized = content.replace(/^\uFEFF/, '');
	if (!normalized.startsWith('---')) {
		return undefined;
	}

	const lines = normalized.split(/\r?\n/);
	if (lines[0]?.trim() !== '---') {
		return undefined;
	}

	const frontmatterLines = [];
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

function parseFrontmatterScalars(lines) {
	const values = {};
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

function normalizeFrontmatterValue(rawValue) {
	const value = rawValue.trim();
	if (value.startsWith('"') && value.endsWith('"')) {
		try {
			return JSON.parse(value);
		} catch {
			return value.slice(1, -1);
		}
	}

	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1).replace(/''/g, "'");
	}

	return value;
}

function validateFrontmatterAlignment(relativePath, document, frontmatter, issues) {
	if (!frontmatter.closed) {
		issues.push({
			severity: 'warning',
			message: `Markdown frontmatter should close with ---: ${relativePath}.`,
			path: relativePath,
		});
		return;
	}

	const expectedValues = {
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

function validateMarkdownStyle(relativePath, content, issues) {
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

function validateSecretHygiene(relativePath, content, issues) {
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

function isSecretPlaceholderLine(line) {
	const trimmed = line.trim();
	if (!trimmed) {
		return true;
	}

	return /^(?:[-*]\s*)?(?:`)?[A-Z][A-Z0-9_]*(?:`)?(?:\s+-\s+|\s*:\s*$|\s*$)/.test(trimmed)
		&& /(?:TOKEN|SECRET|PASSWORD|API_KEY|KEY)$/i.test(trimmed);
}

function isSafePlaceholderValue(value) {
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

function extractMarkdownLinkTargets(content) {
	const targets = [];
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

function resolveMarkdownLink(docsDirectory, sourceRelativePath, rawTarget) {
	const withoutAnchor = rawTarget.split('#')[0]?.split('?')[0];
	if (!withoutAnchor) {
		return undefined;
	}

	let decodedTarget;
	try {
		decodedTarget = decodeURIComponent(withoutAnchor);
	} catch {
		decodedTarget = withoutAnchor;
	}

	if (decodedTarget.startsWith('/')) {
		return path.join(
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

	return path.join(docsDirectory, normalized);
}

function validateJsonSchema(value, schema) {
	const issues = [];
	validateJsonSchemaValue(value, schema, '$', issues);
	return issues;
}

function validateJsonSchemaValue(value, schema, currentPath, issues) {
	if (schema.type && !matchesType(value, schema.type)) {
		issues.push({ path: currentPath, message: `must be ${formatType(schema.type)}` });
		return;
	}

	if (schema.enum && !schema.enum.some((entry) => valuesEqual(entry, value))) {
		issues.push({ path: currentPath, message: `must be one of: ${schema.enum.map(formatValue).join(', ')}` });
	}

	if (typeof value === 'string') {
		if (schema.minLength !== undefined && value.length < schema.minLength) {
			issues.push({ path: currentPath, message: `must be at least ${schema.minLength} character(s)` });
		}

		if (schema.pattern !== undefined && !(new RegExp(schema.pattern).test(value))) {
			issues.push({ path: currentPath, message: `must match pattern ${schema.pattern}` });
		}

		if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) {
			issues.push({ path: currentPath, message: 'must be a valid date-time' });
		}
	}

	if (typeof value === 'number') {
		if (schema.minimum !== undefined && value < schema.minimum) {
			issues.push({ path: currentPath, message: `must be greater than or equal to ${schema.minimum}` });
		}

		if (schema.maximum !== undefined && value > schema.maximum) {
			issues.push({ path: currentPath, message: `must be less than or equal to ${schema.maximum}` });
		}
	}

	if (Array.isArray(value) && schema.items) {
		for (const [index, item] of value.entries()) {
			validateJsonSchemaValue(item, schema.items, `${currentPath}[${index}]`, issues);
		}
	}

	if (isRecord(value)) {
		const propertySchemas = schema.properties ?? {};
		for (const propertyName of schema.required ?? []) {
			if (!Object.prototype.hasOwnProperty.call(value, propertyName)) {
				issues.push({ path: appendPath(currentPath, propertyName), message: 'is required' });
			}
		}

		for (const [propertyName, propertySchema] of Object.entries(propertySchemas)) {
			if (Object.prototype.hasOwnProperty.call(value, propertyName)) {
				validateJsonSchemaValue(value[propertyName], propertySchema, appendPath(currentPath, propertyName), issues);
			}
		}

		for (const [propertyName, propertyValue] of Object.entries(value)) {
			if (Object.prototype.hasOwnProperty.call(propertySchemas, propertyName)) {
				continue;
			}

			if (schema.additionalProperties === false) {
				issues.push({ path: appendPath(currentPath, propertyName), message: `must not include additional property "${propertyName}"` });
			} else if (isRecord(schema.additionalProperties)) {
				validateJsonSchemaValue(propertyValue, schema.additionalProperties, appendPath(currentPath, propertyName), issues);
			}
		}
	}

	if (schema.not && validateJsonSchema(value, schema.not).length === 0) {
		issues.push({
			path: currentPath,
			message: schema.not.pattern ? `must not match pattern ${schema.not.pattern}` : 'must not match disallowed schema',
		});
	}
}

function matchesType(value, expected) {
	const expectedTypes = Array.isArray(expected) ? expected : [expected];
	return expectedTypes.some((type) => {
		switch (type) {
			case 'array':
				return Array.isArray(value);
			case 'boolean':
				return typeof value === 'boolean';
			case 'integer':
				return typeof value === 'number' && Number.isInteger(value);
			case 'null':
				return value === null;
			case 'number':
				return typeof value === 'number';
			case 'object':
				return isRecord(value);
			case 'string':
				return typeof value === 'string';
			default:
				return false;
		}
	});
}

function writeResult(result, format) {
	if (format === 'json') {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	if (format === 'github') {
		for (const issue of result.issues) {
			const command = issue.severity === 'error' ? 'error' : 'warning';
			const properties = [];
			if (issue.path) {
				properties.push(`file=${escapeProperty(issue.path)}`);
			}
			if (issue.line) {
				properties.push(`line=${issue.line}`);
			}

			const suffix = properties.length > 0 ? ` ${properties.join(',')}` : '';
			console.log(`::${command}${suffix}::${escapeMessage(issue.message)}`);
		}
		return;
	}

	console.log(`Pinake validation ${result.valid ? 'passed' : 'found issues'}.`);
	if (result.issues.length === 0) {
		console.log('No issues found.');
		return;
	}

	for (const issue of result.issues) {
		const location = issue.path ? ` (${issue.path}${issue.line ? `:${issue.line}` : ''})` : '';
		console.log(`[${issue.severity.toUpperCase()}] ${issue.message}${location}`);
	}
}

function parseArgs(args) {
	const options = {
		root: process.cwd(),
		format: 'text',
	};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--root') {
			options.root = args[index + 1] ?? options.root;
			index += 1;
		} else if (arg.startsWith('--root=')) {
			options.root = arg.slice('--root='.length);
		} else if (arg === '--format') {
			options.format = args[index + 1] ?? options.format;
			index += 1;
		} else if (arg.startsWith('--format=')) {
			options.format = arg.slice('--format='.length);
		} else if (arg === '--help' || arg === '-h') {
			console.log('Usage: node validate-pinake.mjs [--root <workspace>] [--format text|json|github]');
			process.exit(0);
		}
	}

	if (!['text', 'json', 'github'].includes(options.format)) {
		throw new Error(`Unsupported format: ${options.format}`);
	}

	return options;
}

async function exists(absolutePath) {
	try {
		await fs.stat(absolutePath);
		return true;
	} catch {
		return false;
	}
}

function isRecord(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function appendPath(base, propertyName) {
	if (/^[A-Za-z_$][\w$]*$/.test(propertyName)) {
		return `${base}.${propertyName}`;
	}

	return `${base}[${JSON.stringify(propertyName)}]`;
}

function formatType(type) {
	return Array.isArray(type) ? type.join(' or ') : type;
}

function formatValue(value) {
	return typeof value === 'string' ? `"${value}"` : String(value);
}

function valuesEqual(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

function escapeMessage(value) {
	return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeProperty(value) {
	return escapeMessage(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

function createManifestSchema() {
	return {
		type: 'object',
		additionalProperties: false,
		required: ['version', 'storage', 'project', 'modules', 'documents'],
		properties: {
			version: { type: 'number' },
			storage: {
				type: 'object',
				additionalProperties: false,
				required: ['root', 'hiddenFromExplorer'],
				properties: {
					root: { type: 'string', minLength: 1 },
					hiddenFromExplorer: { type: 'boolean' },
				},
			},
			project: {
				type: 'object',
				additionalProperties: false,
				required: ['name', 'documentationType', 'audience', 'template'],
				properties: {
					name: { type: 'string', minLength: 1 },
					documentationType: { type: 'string', minLength: 1 },
					audience: { type: 'array', items: { type: 'string' } },
					template: { type: 'string', minLength: 1 },
				},
			},
			modules: {
				type: 'object',
				additionalProperties: { type: 'boolean' },
			},
			documents: {
				type: 'array',
				items: {
					type: 'object',
					additionalProperties: false,
					required: ['id', 'title', 'path', 'type', 'status', 'order'],
					properties: {
						id: { type: 'string', minLength: 1 },
						title: { type: 'string', minLength: 1 },
						path: {
							type: 'string',
							minLength: 1,
							not: { pattern: '^/|(^|/)\\.\\.(/|$)' },
						},
						type: {
							type: 'string',
							enum: ['overview', 'tutorial', 'how-to', 'reference', 'explanation', 'architecture', 'adr', 'runbook', 'changelog', 'roadmap', 'glossary', 'troubleshooting', 'testing', 'process'],
						},
						status: {
							type: 'string',
							enum: ['draft', 'in-review', 'stable', 'deprecated'],
						},
						order: { type: 'number' },
					},
				},
			},
		},
	};
}

function createModulesSchema() {
	return {
		type: 'object',
		additionalProperties: false,
		required: ['installedModules'],
		properties: {
			installedModules: {
				type: 'array',
				items: {
					type: 'object',
					additionalProperties: false,
					required: ['id', 'version', 'config'],
					properties: {
						id: { type: 'string' },
						version: { type: 'string' },
						config: { type: 'object' },
					},
				},
			},
		},
	};
}

function createUiSchema() {
	return {
		type: 'object',
		additionalProperties: false,
		required: ['expanded', 'collapsed', 'favorites'],
		properties: {
			expanded: { type: 'array', items: { type: 'string' } },
			collapsed: { type: 'array', items: { type: 'string' } },
			favorites: { type: 'array', items: { type: 'string' } },
			sortMode: { type: 'string', enum: ['foldersFirst', 'nameAsc', 'nameDesc'] },
			lastOpened: { type: 'string' },
			lastScroll: { type: 'number', minimum: 0, maximum: 1 },
		},
	};
}

function createIndexesSchema() {
	return {
		type: 'object',
		additionalProperties: false,
		required: ['version', 'documents', 'terms'],
		properties: {
			version: { type: 'integer', minimum: 2 },
			documents: {
				type: 'array',
				items: {
					type: 'object',
					additionalProperties: false,
					required: ['path', 'headings', 'headingDetails', 'keywords', 'tags', 'links', 'id'],
					properties: {
						path: { type: 'string' },
						title: { type: 'string' },
						headings: { type: 'array', items: { type: 'string' } },
						headingDetails: {
							type: 'array',
							items: {
								type: 'object',
								additionalProperties: false,
								required: ['level', 'text', 'line'],
								properties: {
									level: { type: 'integer', minimum: 1 },
									text: { type: 'string' },
									line: { type: 'integer', minimum: 1 },
								},
							},
						},
						keywords: { type: 'array', items: { type: 'string' } },
						tags: { type: 'array', items: { type: 'string' } },
						links: {
							type: 'array',
							items: {
								type: 'object',
								additionalProperties: false,
								required: ['target', 'line', 'broken'],
								properties: {
									target: { type: 'string' },
									line: { type: 'integer', minimum: 1 },
									resolvedPath: { type: 'string' },
									broken: { type: 'boolean' },
								},
							},
						},
						id: { type: 'integer', minimum: 1 },
					},
				},
			},
			terms: {
				type: 'object',
				additionalProperties: {
					type: 'array',
					items: { type: 'integer', minimum: 1 },
				},
			},
		},
	};
}

function createMigrationsSchema() {
	return {
		type: 'object',
		additionalProperties: false,
		required: ['currentVersion', 'history'],
		properties: {
			currentVersion: { type: 'string' },
			history: {
				type: 'array',
				items: {
					type: 'object',
					additionalProperties: false,
					required: ['version', 'upgradedAt', 'notes'],
					properties: {
						version: { type: 'string' },
						upgradedAt: { type: 'string', format: 'date-time' },
						notes: { type: 'string' },
					},
				},
			},
		},
	};
}

function createVersionSchema() {
	return {
		type: 'object',
		additionalProperties: false,
		required: ['pinakeVersion', 'extensionVersion'],
		properties: {
			pinakeVersion: { type: 'string' },
			extensionVersion: { type: 'string' },
		},
	};
}
