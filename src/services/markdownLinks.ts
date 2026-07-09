import * as path from 'path';
import { legacyPinakeDirectoryName, pinakeDirectoryName, pinakeDocsDirectoryName } from '../constants';

export interface MarkdownLinkTarget {
	target: string;
	line: number;
}

export function extractMarkdownLinks(content: string): MarkdownLinkTarget[] {
	const links: MarkdownLinkTarget[] = [];
	for (const [index, line] of content.split(/\r?\n/).entries()) {
		const linkPattern = /!?\[[^\]]*]\(([^)]*)\)/g;
		let match = linkPattern.exec(line);
		while (match) {
			const target = parseMarkdownLinkDestination(match[1] ?? '');
			if (target && !shouldIgnoreMarkdownLinkTarget(target)) {
				links.push({
					target,
					line: index + 1,
				});
			}

			match = linkPattern.exec(line);
		}
	}

	return links;
}

export function extractMarkdownLinkTargets(content: string): string[] {
	return extractMarkdownLinks(content).map((link) => link.target);
}

export function resolveMarkdownLinkPath(
	sourceRelativePath: string,
	rawTarget: string,
	markdownFileSet: Set<string>,
): string | undefined {
	const candidates = resolveMarkdownLinkCandidates(sourceRelativePath, rawTarget);
	if (!candidates) {
		return undefined;
	}

	return candidates.find((candidate) => markdownFileSet.has(candidate));
}

export function resolveMarkdownLinkCandidates(sourceRelativePath: string, rawTarget: string): string[] | undefined {
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

	const normalized = decodedTarget.startsWith('/')
		? path.posix.normalize(decodedTarget
			.replace(new RegExp(`^/?${escapeRegExp(pinakeDirectoryName)}/${escapeRegExp(pinakeDocsDirectoryName)}/`), '')
			.replace(new RegExp(`^/?${escapeRegExp(legacyPinakeDirectoryName)}/`), '')
			.replace(/^\//, ''))
		: path.posix.normalize(path.posix.join(path.posix.dirname(sourceRelativePath), decodedTarget));

	if (normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
		return [];
	}

	const candidates = [normalized];
	if (!normalized.toLowerCase().endsWith('.md')) {
		candidates.push(`${normalized}.md`);
	}
	candidates.push(path.posix.join(normalized, 'index.md'));

	return Array.from(new Set(candidates));
}

function parseMarkdownLinkDestination(rawValue: string): string | undefined {
	const trimmed = rawValue.trim();
	if (!trimmed) {
		return undefined;
	}

	if (trimmed.startsWith('<')) {
		const closingIndex = trimmed.indexOf('>');
		if (closingIndex > 0) {
			return trimmed.slice(1, closingIndex).trim() || undefined;
		}
	}

	const titleStart = findMarkdownTitleStart(trimmed);
	const destination = titleStart === -1 ? trimmed : trimmed.slice(0, titleStart).trim();
	return destination || undefined;
}

function findMarkdownTitleStart(value: string): number {
	for (let index = 0; index < value.length; index += 1) {
		if (!/\s/.test(value[index])) {
			continue;
		}

		const title = value.slice(index).trim();
		if (isMarkdownLinkTitle(title)) {
			return index;
		}
	}

	return -1;
}

function isMarkdownLinkTitle(value: string): boolean {
	if (value.length < 2) {
		return false;
	}

	const first = value[0];
	const last = value[value.length - 1];
	return (first === '"' && last === '"')
		|| (first === '\'' && last === '\'')
		|| (first === '(' && last === ')');
}

function shouldIgnoreMarkdownLinkTarget(target: string): boolean {
	return target.startsWith('#') || /^(https?:|mailto:|tel:)/i.test(target);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
