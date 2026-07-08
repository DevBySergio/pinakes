import * as vscode from 'vscode';
import { pinakeDirectoryName, pinakeDocsDirectoryName, pinakeManifestFileName } from '../constants';
import { getDefaultPinakeTemplate, getPinakeDocuments, getPinakeTemplate } from '../templates/pinakeTemplates';
import {
	PinakeDocumentDefinition,
	PinakeDocumentStatus,
	PinakeDocumentType,
	PinakeManifest,
	PinakeModuleDescriptor,
	PinakeModuleId,
} from '../types';
import { FileService } from './FileService';

export class ManifestService {
	public constructor(private readonly fileService: FileService) {}

	public getManifestUri(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeManifestFileName);
	}

	public createDefaultManifest(projectName: string): PinakeManifest {
		const template = getDefaultPinakeTemplate();
		return this.createManifest(projectName, template.id, template.defaultModules, false, getPinakeDocuments(template, template.defaultModules));
	}

	public createManifest(
		projectName: string,
		templateId: string,
		moduleIds: PinakeModuleId[],
		hiddenFromExplorer: boolean,
		documents: PinakeDocumentDefinition[],
	): PinakeManifest {
		return {
			version: 1,
			storage: {
				root: `${pinakeDirectoryName}/${pinakeDocsDirectoryName}`,
				hiddenFromExplorer,
			},
			project: {
				name: projectName,
				documentationType: 'internal',
				audience: ['developers', 'small-team'],
				template: templateId,
			},
			modules: createModuleSelection(moduleIds),
			documents: documents.map(toManifestDocument),
		};
	}

	public async readManifest(root: vscode.Uri): Promise<PinakeManifest | undefined> {
		return this.fileService.readJson<PinakeManifest>(this.getManifestUri(root));
	}

	public async writeManifest(root: vscode.Uri, manifest: PinakeManifest): Promise<void> {
		await this.fileService.writeJson(this.getManifestUri(root), normalizeManifestForWrite(manifest));
	}

	public validateManifestShape(value: unknown): string[] {
		if (!isRecord(value)) {
			return ['pinake.json must be a JSON object.'];
		}

		const issues: string[] = [];
		if (typeof value.version !== 'number') {
			issues.push('pinake.json requires numeric field: version.');
		}

		if (!isRecord(value.storage)) {
			issues.push('pinake.json requires object field: storage.');
		} else {
			if (typeof value.storage.root !== 'string' || value.storage.root.trim().length === 0) {
				issues.push('pinake.json requires storage.root to be a non-empty string.');
			}

			if (typeof value.storage.hiddenFromExplorer !== 'boolean') {
				issues.push('pinake.json requires storage.hiddenFromExplorer to be a boolean.');
			}
		}

		if (!isRecord(value.project)) {
			issues.push('pinake.json requires object field: project.');
		} else {
			if (typeof value.project.name !== 'string' || value.project.name.trim().length === 0) {
				issues.push('pinake.json requires project.name to be a non-empty string.');
			}

			if (typeof value.project.documentationType !== 'string' || value.project.documentationType.trim().length === 0) {
				issues.push('pinake.json requires project.documentationType to be a non-empty string.');
			}

			if (!Array.isArray(value.project.audience) || !value.project.audience.every((entry) => typeof entry === 'string')) {
				issues.push('pinake.json requires project.audience to be an array of strings.');
			}

			if (typeof value.project.template !== 'string' || value.project.template.trim().length === 0) {
				issues.push('pinake.json requires project.template to be a non-empty string.');
			}
		}

		if (!isRecord(value.modules)) {
			issues.push('pinake.json requires modules to be an object of boolean flags.');
		} else {
			for (const [moduleId, enabled] of Object.entries(value.modules)) {
				if (typeof enabled !== 'boolean') {
					issues.push(`pinake.json modules.${moduleId} must be a boolean.`);
				}
			}
		}

		if (!Array.isArray(value.documents)) {
			issues.push('pinake.json requires documents to be an array.');
			return issues;
		}

		for (const [index, documentValue] of value.documents.entries()) {
			validateDocumentShape(documentValue, index, issues);
		}

		return issues;
	}

	public ensureModule(manifest: PinakeManifest, descriptor: PinakeModuleDescriptor): boolean {
		if (manifest.modules[descriptor.id] === true) {
			return false;
		}

		manifest.modules[descriptor.id] = true;
		return true;
	}

	public setTemplateSelection(
		manifest: PinakeManifest,
		templateId: string,
		moduleIds: PinakeModuleId[],
		hiddenFromExplorer: boolean,
	): void {
		manifest.storage.root = `${pinakeDirectoryName}/${pinakeDocsDirectoryName}`;
		manifest.storage.hiddenFromExplorer = hiddenFromExplorer;
		manifest.project.template = getPinakeTemplate(templateId).id;
		for (const moduleId of moduleIds) {
			manifest.modules[moduleId] = true;
		}
	}

	public addDocuments(manifest: PinakeManifest, documents: PinakeDocumentDefinition[]): boolean {
		let changed = false;
		for (const document of documents.map(toManifestDocument)) {
			const existingIndex = manifest.documents.findIndex((entry) => entry.id === document.id || entry.path === document.path);
			if (existingIndex >= 0) {
				const existing = manifest.documents[existingIndex];
				if (JSON.stringify(existing) !== JSON.stringify(document)) {
					manifest.documents[existingIndex] = {
						...existing,
						...document,
					};
					changed = true;
				}
				continue;
			}

			manifest.documents.push(document);
			changed = true;
		}

		if (changed) {
			manifest.documents.sort(compareDocuments);
		}

		return changed;
	}

	public removeDocument(manifest: PinakeManifest, relativePath: string): boolean {
		const nextDocuments = manifest.documents.filter((document) => document.path !== relativePath);
		if (nextDocuments.length === manifest.documents.length) {
			return false;
		}

		manifest.documents = nextDocuments;
		return true;
	}

	public renameDocument(manifest: PinakeManifest, oldPath: string, newPath: string, newTitle?: string): boolean {
		const document = manifest.documents.find((entry) => entry.path === oldPath);
		if (!document) {
			return false;
		}

		document.path = newPath;
		if (newTitle) {
			document.title = newTitle;
		}

		manifest.documents.sort(compareDocuments);
		return true;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createModuleSelection(moduleIds: PinakeModuleId[]): Record<string, boolean> {
	const modules: Record<string, boolean> = {
		overview: false,
		gettingStarted: false,
		development: false,
		decisions: false,
		architecture: false,
		quality: false,
		operations: false,
		projectManagement: false,
		reference: false,
	};

	for (const moduleId of moduleIds) {
		modules[moduleId] = true;
	}

	return modules;
}

function normalizeManifestForWrite(manifest: PinakeManifest): PinakeManifest {
	return {
		...manifest,
		documents: manifest.documents.map(toManifestDocument).sort(compareDocuments),
	};
}

function toManifestDocument(document: PinakeDocumentDefinition): PinakeDocumentDefinition {
	return {
		id: document.id,
		title: document.title,
		path: document.path,
		type: document.type,
		status: document.status,
		order: document.order,
	};
}

function validateDocumentShape(value: unknown, index: number, issues: string[]): void {
	if (!isRecord(value)) {
		issues.push(`pinake.json documents[${index}] must be an object.`);
		return;
	}

	if (typeof value.id !== 'string' || value.id.trim().length === 0) {
		issues.push(`pinake.json documents[${index}] requires a non-empty id.`);
	}

	if (typeof value.title !== 'string' || value.title.trim().length === 0) {
		issues.push(`pinake.json documents[${index}] requires a non-empty title.`);
	}

	if (typeof value.path !== 'string' || value.path.trim().length === 0) {
		issues.push(`pinake.json documents[${index}] requires a non-empty path.`);
	} else if (value.path.startsWith('/') || value.path.includes('..')) {
		issues.push(`pinake.json documents[${index}] path must be relative to .pinake/docs.`);
	}

	if (!isDocumentType(value.type)) {
		issues.push(`pinake.json documents[${index}] has unsupported type.`);
	}

	if (!isDocumentStatus(value.status)) {
		issues.push(`pinake.json documents[${index}] has unsupported status.`);
	}

	if (typeof value.order !== 'number') {
		issues.push(`pinake.json documents[${index}] requires numeric order.`);
	}
}

function isDocumentType(value: unknown): value is PinakeDocumentType {
	return typeof value === 'string' && [
		'overview',
		'tutorial',
		'how-to',
		'reference',
		'explanation',
		'architecture',
		'adr',
		'runbook',
		'changelog',
		'roadmap',
		'glossary',
		'troubleshooting',
		'testing',
		'process',
	].includes(value);
}

function isDocumentStatus(value: unknown): value is PinakeDocumentStatus {
	return value === 'draft' || value === 'in-review' || value === 'stable' || value === 'deprecated';
}

function compareDocuments(left: PinakeDocumentDefinition, right: PinakeDocumentDefinition): number {
	const pathOrder = left.path.localeCompare(right.path, undefined, { numeric: true, sensitivity: 'base' });
	return pathOrder !== 0 ? pathOrder : left.order - right.order;
}
