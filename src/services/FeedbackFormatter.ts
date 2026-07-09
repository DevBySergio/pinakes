import {
	ModulePreset,
	PinakeDocumentDefinition,
	PinakeModuleDefinition,
	PinakeModuleDescriptor,
	PinakeModuleId,
	PinakeSearchResult,
	PinakeTemplateDefinition,
	ValidationIssue,
	ValidationResult,
} from '../types';

export interface PinakeSearchQuickPickItem {
	label: string;
	description: string;
	detail?: string;
	path: string;
}

export interface PinakeItemProperties {
	name: string;
	type: string;
	relativePath: string;
	fullPath: string;
	size: string;
	created: string;
	modified: string;
	document?: PinakeDocumentDefinition;
}

export interface PinakeTemplateQuickPickItem {
	label: string;
	description: string;
	detail: string;
	template: PinakeTemplateDefinition;
}

export interface PinakeTemplateModuleQuickPickItem {
	label: string;
	description: string;
	detail: string;
	moduleId: PinakeModuleId;
	picked: boolean;
}

export type PinakeTemplateModuleSelectionState = 'included' | 'recommended' | 'optional';

export interface PinakeModulePresetQuickPickItem {
	label: string;
	description: string;
	detail: string;
	presetId: string;
}

export interface PinakeGeneratedModuleQuickPickItem {
	label: string;
	description: string;
	detail: string;
	moduleId: string;
}

const severityOrder: ValidationIssue['severity'][] = ['error', 'warning', 'info'];

export function formatSearchResultItem(result: PinakeSearchResult): PinakeSearchQuickPickItem {
	const tags = formatTags(result.tags);
	const headingTrail = result.headings.slice(0, 3).join(' > ');
	const detail = [
		tags ? `Tags: ${tags}` : undefined,
		result.snippet ? `Snippet: ${result.snippet}` : undefined,
		headingTrail.length > 0 ? `Headings: ${headingTrail}` : undefined,
		result.matchedTerms.length > 0 ? `Matched: ${result.matchedTerms.join(', ')}` : undefined,
	].filter((line): line is string => Boolean(line)).join('\n');

	return {
		label: result.title ?? result.path,
		description: result.path,
		detail: detail.length > 0 ? detail : undefined,
		path: result.path,
	};
}

export function formatTemplatePickItem(
	template: PinakeTemplateDefinition,
	defaultModuleTitles: string[],
	isDefault: boolean,
	recommendedModuleTitles: string[] = [],
): PinakeTemplateQuickPickItem {
	const moduleSummary = formatCount(template.defaultModules.length, 'module');
	return {
		label: template.title,
		description: isDefault ? `Default - ${moduleSummary}` : moduleSummary,
		detail: [
			template.description,
			`Starts with: ${formatInlineList(defaultModuleTitles)}`,
			recommendedModuleTitles.length > 0 ? `Recommended optional modules: ${formatInlineList(recommendedModuleTitles)}` : undefined,
		].filter((line): line is string => Boolean(line)).join('\n'),
		template,
	};
}

export function formatTemplateModulePickItem(
	definition: PinakeModuleDefinition,
	moduleId: PinakeModuleId,
	selectionState: PinakeTemplateModuleSelectionState | boolean,
): PinakeTemplateModuleQuickPickItem {
	const state = typeof selectionState === 'boolean'
		? selectionState ? 'included' : 'optional'
		: selectionState;
	return {
		label: definition.title,
		description: `${formatModuleSelectionState(state)} - ${definition.folder}`,
		detail: [
			formatCount(definition.documents.length, 'document'),
			state === 'recommended' ? 'Suggested optional coverage for this template.' : undefined,
		].filter((line): line is string => Boolean(line)).join('\n'),
		moduleId,
		picked: state === 'included',
	};
}

export function formatModulePresetPickItem(preset: ModulePreset): PinakeModulePresetQuickPickItem {
	return {
		label: preset.title,
		description: formatCount(preset.moduleIds.length, 'module'),
		detail: preset.description,
		presetId: preset.id,
	};
}

export function formatGeneratedModulePickItem(descriptor: PinakeModuleDescriptor): PinakeGeneratedModuleQuickPickItem {
	const detail = [
		descriptor.description,
		formatCount(descriptor.files.length, 'file'),
		descriptor.dependencies.length > 0 ? `Requires: ${descriptor.dependencies.join(', ')}` : undefined,
	].filter((line): line is string => Boolean(line)).join('\n');

	return {
		label: descriptor.title,
		description: descriptor.rootFolder,
		detail,
		moduleId: descriptor.id,
	};
}

export function normalizePinakeMarkdownFileName(value: string): string {
	const trimmed = value.trim();
	return trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`;
}

export function normalizePinakeFolderName(value: string): string {
	return value.trim();
}

export function validatePinakeFileName(value: string): string | undefined {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return 'File name is required.';
	}
	if (trimmed === '.' || trimmed === '..') {
		return 'Use a file name, not "." or "..".';
	}
	if (/[\\/]/.test(trimmed)) {
		return 'Use a file name only; create folders separately.';
	}
	if (hasNonMarkdownExtension(trimmed)) {
		return 'Use a .md file name, or omit the extension.';
	}

	return undefined;
}

export function validatePinakeFolderName(value: string): string | undefined {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return 'Folder name is required.';
	}
	if (trimmed === '.' || trimmed === '..') {
		return 'Use a folder name, not "." or "..".';
	}
	if (/[\\/]/.test(trimmed)) {
		return 'Use one folder name at a time.';
	}
	if (trimmed.toLowerCase().endsWith('.md')) {
		return 'Use New File to create Markdown documents.';
	}

	return undefined;
}

export function formatNoSearchResultsMessage(query: string): string {
	return `No Pinake results found for "${query}". Try a shorter phrase, tag:<name>, heading:<text>, or a broader term.`;
}

export function formatPropertiesReport(properties: PinakeItemProperties): string[] {
	const lines = [
		'Pinake Item Properties',
		'',
		'Location',
		`Relative path: ${properties.relativePath}`,
		`Full path: ${properties.fullPath}`,
		'',
		'Item',
		`Name: ${properties.name}`,
		`Type: ${properties.type}`,
		`Size: ${properties.size}`,
		`Created: ${properties.created}`,
		`Modified: ${properties.modified}`,
	];

	if (properties.document) {
		lines.push(
			'',
			'Document Metadata',
			`Title: ${properties.document.title}`,
			`Document type: ${formatDisplayValue(properties.document.type)}`,
			`Status: ${formatDisplayValue(properties.document.status)}`,
			`Order: ${properties.document.order}`,
		);
	}

	return lines;
}

export function formatValidationReport(result: ValidationResult): string[] {
	const counts = countIssuesBySeverity(result.issues);
	const lines = [
		'Pinake Validation Report',
		`Status: ${result.valid ? 'passed' : 'issues found'}`,
		`Summary: ${counts.error} error(s), ${counts.warning} warning(s), ${counts.info} info item(s).`,
		'',
	];

	if (result.issues.length === 0) {
		lines.push('No issues found.');
		return lines;
	}

	for (const severity of severityOrder) {
		const issues = result.issues
			.filter((issue) => issue.severity === severity)
			.sort(compareIssues);
		if (issues.length === 0) {
			continue;
		}

		lines.push(`${titleCase(severity)}s (${issues.length})`);
		for (const issue of issues) {
			lines.push(`- ${formatIssueLocation(issue)}`);
			lines.push(`  Issue: ${issue.message}`);
			const suggestion = getIssueSuggestion(issue);
			if (suggestion) {
				lines.push(`  Fix: ${suggestion}`);
			}
		}
		lines.push('');
	}

	return trimTrailingBlankLine(lines);
}

function formatTags(tags: string[]): string | undefined {
	if (tags.length === 0) {
		return undefined;
	}

	return tags.map((tag) => `#${tag}`).join(' ');
}

function formatCount(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function formatModuleSelectionState(state: PinakeTemplateModuleSelectionState): string {
	return state === 'included'
		? 'Included'
		: state === 'recommended'
			? 'Recommended'
			: 'Optional';
}

function formatInlineList(values: string[], maxItems = 4): string {
	if (values.length === 0) {
		return 'No modules selected';
	}

	const shown = values.slice(0, maxItems);
	const remaining = values.length - shown.length;
	return remaining > 0 ? `${shown.join(', ')}, +${remaining} more` : shown.join(', ');
}

function hasNonMarkdownExtension(value: string): boolean {
	const lastSeparator = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
	const basename = value.slice(lastSeparator + 1);
	const dotIndex = basename.lastIndexOf('.');
	return dotIndex > 0 && basename.slice(dotIndex).toLowerCase() !== '.md';
}

function countIssuesBySeverity(issues: ValidationIssue[]): Record<ValidationIssue['severity'], number> {
	return {
		error: issues.filter((issue) => issue.severity === 'error').length,
		warning: issues.filter((issue) => issue.severity === 'warning').length,
		info: issues.filter((issue) => issue.severity === 'info').length,
	};
}

function compareIssues(left: ValidationIssue, right: ValidationIssue): number {
	const leftPath = left.path ?? '';
	const rightPath = right.path ?? '';
	return leftPath.localeCompare(rightPath)
		|| (left.line ?? 0) - (right.line ?? 0)
		|| left.message.localeCompare(right.message);
}

function formatIssueLocation(issue: ValidationIssue): string {
	if (!issue.path) {
		return 'Workspace';
	}

	return issue.line ? `${issue.path}:${issue.line}` : issue.path;
}

function getIssueSuggestion(issue: ValidationIssue): string | undefined {
	const message = issue.message.toLowerCase();
	if (message.includes('missing required pinake entry')) {
		return 'Run Pinake: Repair, then validate again.';
	}
	if (message.includes('not valid json')) {
		return 'Fix the JSON syntax in the reported file.';
	}
	if (message.includes('additional property') || message.includes('must be one of') || message.includes('schema')) {
		return 'Update the JSON file so it matches the shipped Pinake schema.';
	}
	if (message.includes('broken markdown link')) {
		return 'Update the link target or add the missing document.';
	}
	if (message.includes('frontmatter')) {
		return 'Add Pinake frontmatter with title, type, status, and order.';
	}
	if (message.includes('adr file should match')) {
		return 'Rename the ADR to ADR-####-short-title.md.';
	}
	if (message.includes('trailing whitespace')) {
		return 'Remove trailing spaces or tabs from the reported line.';
	}
	if (message.includes('starts with a tab')) {
		return 'Replace leading tabs with spaces.';
	}
	if (message.includes('fenced code block is not closed')) {
		return 'Add the closing fence for the code block.';
	}
	if (message.includes('top-level heading')) {
		return 'Keep exactly one H1 heading in the Markdown document.';
	}
	if (message.includes('secret-like content')) {
		return 'Remove the value, replace it with a safe placeholder, or document where the secret is managed.';
	}

	return undefined;
}

function titleCase(value: string): string {
	return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatDisplayValue(value: string): string {
	if (value.toLowerCase() === 'adr') {
		return 'ADR';
	}

	return value
		.split('-')
		.map((part) => part.length > 0 ? titleCase(part) : part)
		.join(' ');
}

function trimTrailingBlankLine(lines: string[]): string[] {
	return lines.at(-1) === '' ? lines.slice(0, -1) : lines;
}
