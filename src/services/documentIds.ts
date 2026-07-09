import { createHash } from 'crypto';
import * as path from 'path';

export function createDocumentId(prefix: string, relativePath: string, seed = relativePath): string {
	const normalizedPath = normalizeDocumentPath(relativePath);
	const readableSeed = slugIdPart(seed);
	const readablePath = slugIdPart(normalizedPath);
	const readable = readableSeed === readablePath ? readablePath : `${readableSeed}-${readablePath}`;
	return `${slugIdPart(prefix)}-${readable}-${hashPath(normalizedPath)}`;
}

export function createDocumentIdVariant(id: string, relativePath: string): string {
	return createDocumentId(getDocumentIdPrefix(id), relativePath);
}

function normalizeDocumentPath(relativePath: string): string {
	const normalized = path.posix.normalize(relativePath.replace(/\\/g, '/')).replace(/^\/+|\/+$/g, '');
	return normalized === '.' ? 'document.md' : normalized;
}

function hashPath(relativePath: string): string {
	return createHash('sha1').update(relativePath).digest('hex').slice(0, 8);
}

function getDocumentIdPrefix(id: string): string {
	const [prefix] = id.split('-');
	return prefix && /^[a-z0-9]+$/i.test(prefix) ? prefix : 'document';
}

function slugIdPart(value: string): string {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized.length > 0 ? normalized : 'document';
}
