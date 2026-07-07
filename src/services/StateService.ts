import * as vscode from 'vscode';
import {
	internalStateFileNames,
	pinakeDirectoryName,
	pinakeInternalDirectoryName,
	pinakeSpecVersion,
	pinakesExtensionVersion,
} from '../constants';
import {
	PinakeIndexesState,
	PinakeManifest,
	PinakeMigrationsState,
	PinakeModulesState,
	PinakeUiState,
	PinakeVersionState,
} from '../types';
import { FileService } from './FileService';

export class StateService {
	public constructor(private readonly fileService: FileService) {}

	public getInternalDirectoryUri(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeInternalDirectoryName);
	}

	public getUiStateUri(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(this.getInternalDirectoryUri(root), internalStateFileNames.ui);
	}

	public async ensureInitialState(root: vscode.Uri, manifest: PinakeManifest): Promise<string[]> {
		const created: string[] = [];
		const internalDirectory = this.getInternalDirectoryUri(root);
		await this.fileService.ensureDirectory(internalDirectory);

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.modules), this.createModulesState(manifest))) {
			created.push(`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.modules}`);
		}

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.ui), this.createUiState())) {
			created.push(`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.ui}`);
		}

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.indexes), this.createIndexesState())) {
			created.push(`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.indexes}`);
		}

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.migrations), this.createMigrationsState())) {
			created.push(`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.migrations}`);
		}

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.version), this.createVersionState())) {
			created.push(`${pinakeDirectoryName}/${pinakeInternalDirectoryName}/${internalStateFileNames.version}`);
		}

		return created;
	}

	public async syncModulesState(root: vscode.Uri, manifest: PinakeManifest): Promise<void> {
		const internalDirectory = this.getInternalDirectoryUri(root);
		await this.fileService.ensureDirectory(internalDirectory);
		await this.fileService.writeJson(
			vscode.Uri.joinPath(internalDirectory, internalStateFileNames.modules),
			this.createModulesState(manifest),
		);
	}

	public async readUiState(root: vscode.Uri): Promise<PinakeUiState> {
		const existing = await this.fileService.readJson<PinakeUiState>(this.getUiStateUri(root));
		return normalizeUiState(existing);
	}

	public async recordExpanded(root: vscode.Uri, relativePath: string): Promise<void> {
		const state = await this.readUiState(root);
		state.expanded = addUnique(state.expanded, relativePath);
		state.collapsed = removeValue(state.collapsed, relativePath);
		await this.writeUiState(root, state);
	}

	public async recordCollapsed(root: vscode.Uri, relativePath: string): Promise<void> {
		const state = await this.readUiState(root);
		state.collapsed = addUnique(state.collapsed, relativePath);
		state.expanded = removeValue(state.expanded, relativePath);
		await this.writeUiState(root, state);
	}

	public async recordLastOpened(root: vscode.Uri, relativePath: string): Promise<void> {
		const state = await this.readUiState(root);
		state.lastOpened = relativePath;
		await this.writeUiState(root, state);
	}

	private async writeUiState(root: vscode.Uri, state: PinakeUiState): Promise<void> {
		await this.fileService.ensureDirectory(this.getInternalDirectoryUri(root));
		await this.fileService.writeJson(this.getUiStateUri(root), state);
	}

	private createModulesState(manifest: PinakeManifest): PinakeModulesState {
		return {
			installedModules: manifest.modules
				.filter((moduleEntry) => moduleEntry.enabled)
				.map((moduleEntry) => ({
					id: moduleEntry.id,
					version: moduleEntry.version ?? pinakeSpecVersion,
					config: {},
				})),
		};
	}

	private createUiState(): PinakeUiState {
		return {
			expanded: [],
			collapsed: [],
			favorites: [],
		};
	}

	private createIndexesState(): PinakeIndexesState {
		return {
			version: 1,
			documents: [],
			terms: {},
		};
	}

	private createMigrationsState(): PinakeMigrationsState {
		return {
			currentVersion: pinakeSpecVersion,
			history: [
				{
					version: pinakeSpecVersion,
					upgradedAt: new Date().toISOString(),
					notes: 'Initial schema.',
				},
			],
		};
	}

	private createVersionState(): PinakeVersionState {
		return {
			pinakeVersion: pinakeSpecVersion,
			extensionVersion: pinakesExtensionVersion,
		};
	}

	private async writeJsonIfMissing(uri: vscode.Uri, value: unknown): Promise<boolean> {
		if (await this.fileService.exists(uri)) {
			return false;
		}

		await this.fileService.writeJson(uri, value);
		return true;
	}
}

function addUnique(values: string[], value: string): string[] {
	return Array.from(new Set([...values, value])).sort((left, right) => left.localeCompare(right));
}

function removeValue(values: string[], value: string): string[] {
	return values.filter((entry) => entry !== value);
}

function normalizeUiState(value: PinakeUiState | undefined): PinakeUiState {
	return {
		expanded: Array.isArray(value?.expanded) ? value.expanded : [],
		collapsed: Array.isArray(value?.collapsed) ? value.collapsed : [],
		favorites: Array.isArray(value?.favorites) ? value.favorites : [],
		lastOpened: typeof value?.lastOpened === 'string' ? value.lastOpened : undefined,
		lastScroll: typeof value?.lastScroll === 'number' ? value.lastScroll : undefined,
	};
}
