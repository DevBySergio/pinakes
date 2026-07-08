export type PinakeDocumentType =
	| 'overview'
	| 'tutorial'
	| 'how-to'
	| 'reference'
	| 'explanation'
	| 'architecture'
	| 'adr'
	| 'runbook'
	| 'changelog'
	| 'roadmap'
	| 'glossary'
	| 'troubleshooting'
	| 'testing'
	| 'process';

export type PinakeDocumentStatus =
	| 'draft'
	| 'in-review'
	| 'stable'
	| 'deprecated';

export type PinakeModuleId =
	| 'overview'
	| 'gettingStarted'
	| 'development'
	| 'decisions'
	| 'architecture'
	| 'quality'
	| 'operations'
	| 'projectManagement'
	| 'reference';

export interface PinakeDocumentDefinition {
	id: string;
	title: string;
	path: string;
	type: PinakeDocumentType;
	status: PinakeDocumentStatus;
	order: number;
	content?: string;
}

export interface PinakeModuleDefinition {
	id: PinakeModuleId;
	title: string;
	folder: string;
	documents: PinakeDocumentDefinition[];
}

export interface PinakeTemplateDefinition {
	id: string;
	title: string;
	description: string;
	defaultModules: PinakeModuleId[];
	recommendedModules?: PinakeModuleId[];
	moduleOverrides?: Partial<Record<PinakeModuleId, PinakeModuleDefinition>>;
}

export type PinakeModuleSelection = Record<PinakeModuleId, boolean>;

export interface PinakeStorageConfig {
	root: string;
	hiddenFromExplorer: boolean;
}

export interface PinakeProjectConfig {
	name: string;
	documentationType: string;
	audience: string[];
	template: string;
}

export interface PinakeManifest {
	version: number;
	storage: PinakeStorageConfig;
	project: PinakeProjectConfig;
	modules: Record<string, boolean>;
	documents: PinakeDocumentDefinition[];
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
	sortMode?: PinakeTreeSortMode;
	lastOpened?: string;
	lastScroll?: number;
}

export type PinakeTreeSortMode = 'foldersFirst' | 'nameAsc' | 'nameDesc';

export interface PinakeIndexedHeading {
	level: number;
	text: string;
	line: number;
}

export interface PinakeIndexedLink {
	target: string;
	line: number;
	resolvedPath?: string;
	broken: boolean;
}

export interface PinakeIndexedDocument {
	path: string;
	headings: string[];
	headingDetails: PinakeIndexedHeading[];
	keywords: string[];
	tags: string[];
	title?: string;
	links: PinakeIndexedLink[];
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
	snippet?: string;
	tags: string[];
	title?: string;
}

export interface PinakeBacklink {
	sourcePath: string;
	targetPath: string;
	targetRaw: string;
	line: number;
	snippet?: string;
}

export interface PinakeBrokenReference {
	sourcePath: string;
	targetRaw: string;
	line: number;
}

export interface PinakeReferenceGraphNode {
	path: string;
	title?: string;
	tags: string[];
}

export interface PinakeReferenceGraphEdge {
	sourcePath: string;
	targetPath?: string;
	targetRaw: string;
	line: number;
	broken: boolean;
}

export interface PinakeReferenceGraph {
	nodes: PinakeReferenceGraphNode[];
	edges: PinakeReferenceGraphEdge[];
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
	line?: number;
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

export interface InitializePinakeOptions {
	projectName: string;
	templateId?: string;
	moduleIds?: PinakeModuleId[];
	hiddenFromExplorer?: boolean;
	migrateLegacy?: boolean;
}
