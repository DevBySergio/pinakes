export const pinakeDirectoryName = 'Pinake';
export const pinakeManifestFileName = 'pinake.json';
export const pinakeInternalDirectoryName = '.pinake';
export const pinakeGitignoreFileName = '.gitignore';
export const pinakeSpecVersion = '0.1.0';
export const pinakesExtensionVersion = '0.0.1';

export const internalStateFileNames = {
	modules: 'modules.json',
	ui: 'ui.json',
	indexes: 'indexes.json',
	migrations: 'migrations.json',
	version: 'version.json',
} as const;

export const coreDirectoryNames = [
	'00_Overview',
	'01_GettingStarted',
	'02_Architecture',
	'03_Development',
	'04_Quality',
	'05_Operations',
	'06_Decisions',
	'07_ProjectManagement',
	'99_Appendix',
] as const;
