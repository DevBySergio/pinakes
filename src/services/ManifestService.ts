import * as vscode from 'vscode';
import { pinakeDirectoryName, pinakeManifestFileName } from '../constants';
import { PinakeManifest, PinakeModuleDescriptor, PinakeModuleManifest } from '../types';
import { FileService } from './FileService';

export class ManifestService {
	public constructor(private readonly fileService: FileService) {}

	public getManifestUri(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeManifestFileName);
	}

	public createDefaultManifest(projectName: string): PinakeManifest {
		return {
			name: projectName,
			description: `Pinake docs for ${projectName}.`,
			version: '1.0.0',
			language: 'en',
			modules: [],
			keywords: ['pinake', 'docs'],
		};
	}

	public async readManifest(root: vscode.Uri): Promise<PinakeManifest | undefined> {
		return this.fileService.readJson<PinakeManifest>(this.getManifestUri(root));
	}

	public async writeManifest(root: vscode.Uri, manifest: PinakeManifest): Promise<void> {
		await this.fileService.writeJson(this.getManifestUri(root), manifest);
	}

	public validateManifestShape(value: unknown): string[] {
		if (!isRecord(value)) {
			return ['pinake.json must be a JSON object.'];
		}

		const issues: string[] = [];
		if (typeof value.name !== 'string' || value.name.trim().length === 0) {
			issues.push('pinake.json requires a non-empty string field: name.');
		}

		if (typeof value.version !== 'string' || value.version.trim().length === 0) {
			issues.push('pinake.json requires a non-empty string field: version.');
		}

		if (typeof value.language !== 'string' || !/^[a-z]{2}(-[A-Z]{2})?$/.test(value.language)) {
			issues.push('pinake.json requires language in the form "en" or "en-US".');
		}

		if (!Array.isArray(value.modules)) {
			issues.push('pinake.json requires modules to be an array.');
			return issues;
		}

		for (const [index, moduleValue] of value.modules.entries()) {
			if (!isRecord(moduleValue)) {
				issues.push(`pinake.json modules[${index}] must be an object.`);
				continue;
			}

			if (typeof moduleValue.id !== 'string' || moduleValue.id.trim().length === 0) {
				issues.push(`pinake.json modules[${index}] requires a non-empty id.`);
			}

			if (typeof moduleValue.enabled !== 'boolean') {
				issues.push(`pinake.json modules[${index}] requires a boolean enabled field.`);
			}

			if (moduleValue.version !== undefined && typeof moduleValue.version !== 'string') {
				issues.push(`pinake.json modules[${index}] version must be a string when present.`);
			}
		}

		return issues;
	}

	public ensureModule(manifest: PinakeManifest, descriptor: PinakeModuleDescriptor): boolean {
		const existing = manifest.modules.find((moduleEntry) => moduleEntry.id === descriptor.id);
		if (existing) {
			if (!existing.enabled || existing.version !== descriptor.version) {
				existing.enabled = true;
				existing.version = descriptor.version;
				return true;
			}

			return false;
		}

		const moduleEntry: PinakeModuleManifest = {
			id: descriptor.id,
			version: descriptor.version,
			enabled: true,
		};
		manifest.modules.push(moduleEntry);
		return true;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
