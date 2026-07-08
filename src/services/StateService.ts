import * as vscode from 'vscode';
import {
	internalStateFileNames,
	pinakeDirectoryName,
	pinakeStateDirectoryName,
	pinakeSpecVersion,
	pinakesExtensionVersion,
} from '../constants';
import {
	PinakeIndexesState,
	PinakeManifest,
	PinakeMigrationsState,
	PinakeModulesState,
	PinakeTreeSortMode,
	PinakeUiState,
	PinakeVersionState,
} from '../types';
import { FileService } from './FileService';

export class StateService {
	public constructor(private readonly fileService: FileService) {}

	public getInternalDirectoryUri(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(root, pinakeDirectoryName, pinakeStateDirectoryName);
	}

	public getUiStateUri(root: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(this.getInternalDirectoryUri(root), internalStateFileNames.ui);
	}

	public async ensureInitialState(root: vscode.Uri, manifest: PinakeManifest): Promise<string[]> {
		const created: string[] = [];
		const internalDirectory = this.getInternalDirectoryUri(root);
		await this.fileService.ensureDirectory(internalDirectory);

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.modules), this.createModulesState(manifest))) {
			created.push(`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.modules}`);
		}

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.ui), this.createUiState())) {
			created.push(`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.ui}`);
		}

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.indexes), this.createIndexesState())) {
			created.push(`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.indexes}`);
		}

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.migrations), this.createMigrationsState())) {
			created.push(`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.migrations}`);
		}

		if (await this.writeJsonIfMissing(vscode.Uri.joinPath(internalDirectory, internalStateFileNames.version), this.createVersionState())) {
			created.push(`${pinakeDirectoryName}/${pinakeStateDirectoryName}/${internalStateFileNames.version}`);
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

	public async syncVersionState(root: vscode.Uri): Promise<void> {
		const internalDirectory = this.getInternalDirectoryUri(root);
		await this.fileService.ensureDirectory(internalDirectory);
		await this.fileService.writeJson(
			vscode.Uri.joinPath(internalDirectory, internalStateFileNames.version),
			this.createVersionState(),
		);
	}

	public async recordMigration(root: vscode.Uri, notes: string): Promise<boolean> {
		const internalDirectory = this.getInternalDirectoryUri(root);
		const migrationsUri = vscode.Uri.joinPath(internalDirectory, internalStateFileNames.migrations);
		await this.fileService.ensureDirectory(internalDirectory);

		const state = normalizeMigrationsState(await this.fileService.readJson<PinakeMigrationsState>(migrationsUri));
		const alreadyRecorded = state.history.some((entry) => entry.version === pinakeSpecVersion && entry.notes === notes);
		state.currentVersion = pinakeSpecVersion;
		if (!alreadyRecorded) {
			state.history.push({
				version: pinakeSpecVersion,
				upgradedAt: new Date().toISOString(),
				notes,
			});
		}

		await this.fileService.writeJson(migrationsUri, state);
		return !alreadyRecorded;
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

	public async addFavorite(root: vscode.Uri, relativePath: string): Promise<boolean> {
		const state = await this.readUiState(root);
		const nextFavorites = addUnique(state.favorites, relativePath);
		if (nextFavorites.length === state.favorites.length) {
			return false;
		}

		state.favorites = nextFavorites;
		await this.writeUiState(root, state);
		return true;
	}

	public async removeFavorite(root: vscode.Uri, relativePath: string): Promise<boolean> {
		const state = await this.readUiState(root);
		const nextFavorites = removeValue(state.favorites, relativePath);
		if (nextFavorites.length === state.favorites.length) {
			return false;
		}

		state.favorites = nextFavorites;
		await this.writeUiState(root, state);
		return true;
	}

	public async recordSortMode(root: vscode.Uri, sortMode: PinakeTreeSortMode): Promise<void> {
		const state = await this.readUiState(root);
		state.sortMode = sortMode;
		await this.writeUiState(root, state);
	}

	private async writeUiState(root: vscode.Uri, state: PinakeUiState): Promise<void> {
		await this.fileService.ensureDirectory(this.getInternalDirectoryUri(root));
		await this.fileService.writeJson(this.getUiStateUri(root), state);
	}

	private createModulesState(manifest: PinakeManifest): PinakeModulesState {
		return {
			installedModules: Object.entries(manifest.modules)
				.filter(([, enabled]) => enabled)
				.map(([id]) => ({
					id,
					version: pinakeSpecVersion,
					config: {},
				})),
		};
	}

	private createUiState(): PinakeUiState {
		return {
			expanded: [],
			collapsed: [],
			favorites: [],
			sortMode: 'foldersFirst',
		};
	}

	private createIndexesState(): PinakeIndexesState {
		return {
			version: 2,
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
		sortMode: isTreeSortMode(value?.sortMode) ? value.sortMode : 'foldersFirst',
		lastOpened: typeof value?.lastOpened === 'string' ? value.lastOpened : undefined,
		lastScroll: typeof value?.lastScroll === 'number' ? value.lastScroll : undefined,
	};
}

function isTreeSortMode(value: unknown): value is PinakeTreeSortMode {
	return value === 'foldersFirst' || value === 'nameAsc' || value === 'nameDesc';
}

function normalizeMigrationsState(value: PinakeMigrationsState | undefined): PinakeMigrationsState {
	return {
		currentVersion: typeof value?.currentVersion === 'string' ? value.currentVersion : pinakeSpecVersion,
		history: Array.isArray(value?.history)
			? value.history.filter(isMigrationEntry)
			: [],
	};
}

function isMigrationEntry(value: unknown): value is PinakeMigrationsState['history'][number] {
	return typeof value === 'object'
		&& value !== null
		&& typeof (value as PinakeMigrationsState['history'][number]).version === 'string'
		&& typeof (value as PinakeMigrationsState['history'][number]).upgradedAt === 'string'
		&& typeof (value as PinakeMigrationsState['history'][number]).notes === 'string';
}
