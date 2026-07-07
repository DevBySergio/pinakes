export interface PinakeModuleManifest {
	id: string;
	version?: string;
	enabled: boolean;
}

export interface PinakeManifest {
	name: string;
	description?: string;
	version: string;
	author?: string;
	license?: string;
	language: string;
	modules: PinakeModuleManifest[];
	keywords?: string[];
}

export interface InstalledModuleState {
	id: string;
	version: string;
	config: Record<string, string | number | boolean>;
}

export interface PinakeModulesState {
	installedModules: InstalledModuleState[];
}

export interface PinakeUiState {
	expanded: string[];
	collapsed: string[];
	favorites: string[];
	lastOpened?: string;
	lastScroll?: number;
}

export interface PinakeIndexedDocument {
	path: string;
	headings: string[];
	keywords: string[];
	id: number;
}

export interface PinakeIndexesState {
	version: number;
	documents: PinakeIndexedDocument[];
	terms: Record<string, number[]>;
}

export interface PinakeSearchResult {
	path: string;
	headings: string[];
	score: number;
	matchedTerms: string[];
}

export interface PinakeMigrationEntry {
	version: string;
	upgradedAt: string;
	notes: string;
}

export interface PinakeMigrationsState {
	currentVersion: string;
	history: PinakeMigrationEntry[];
}

export interface PinakeVersionState {
	pinakeVersion: string;
	extensionVersion: string;
}

export interface TemplateFile {
	relativePath: string;
	content: string;
}

export interface PinakeModuleDescriptor {
	id: string;
	title: string;
	version: string;
	description: string;
	dependencies: string[];
	rootFolder: string;
	files: TemplateFile[];
}

export interface ModulePreset {
	id: string;
	title: string;
	description: string;
	moduleIds: string[];
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
	severity: ValidationSeverity;
	message: string;
	path?: string;
}

export interface ValidationResult {
	valid: boolean;
	issues: ValidationIssue[];
}

export interface ScaffoldResult {
	created: string[];
	skipped: string[];
	updated: string[];
}
