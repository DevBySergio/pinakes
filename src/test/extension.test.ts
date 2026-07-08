import * as assert from 'assert';
import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { getModuleDescriptor } from '../modules/moduleDescriptors';
import {
	formatNoSearchResultsMessage,
	formatPropertiesReport,
	formatSearchResultItem,
	formatValidationReport,
} from '../services/FeedbackFormatter';
import { FileService } from '../services/FileService';
import { IndexService } from '../services/IndexService';
import { ManifestService } from '../services/ManifestService';
import { ScaffoldService } from '../services/ScaffoldService';
import { StateService } from '../services/StateService';
import { ValidationService } from '../services/ValidationService';
import { allPinakeModuleIds } from '../templates/pinakeTemplates';
import { PinakeDocumentDefinition } from '../types';
import { PinakeTreeProvider } from '../tree/PinakeTreeProvider';

const execFileAsync = promisify(execFile);

suite('Pinakes v0.1', () => {
	const tempRoots: string[] = [];

	teardown(async () => {
		await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
	});

	test('creates the minimal .pinake scaffold and internal state', async () => {
		const { root, fileService, manifestService, scaffoldService } = await createFixture();

		const result = await scaffoldService.initializePinake(root, 'SampleApp');
		const manifest = await manifestService.readManifest(root);
		const gitignore = await fileService.readText(vscode.Uri.joinPath(root, '.pinake', '.gitignore'));
		const overview = await fileService.readText(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'index.md'));

		assert.ok(result.created.includes('.pinake/pinake.json'));
		assert.ok(result.created.includes('.pinake/docs/00_overview/index.md'));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '03_decisions', 'ADR-0001-example.md')));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', '.state', 'modules.json')));
		assert.ok(!(await fileService.exists(vscode.Uri.joinPath(root, 'Pinake'))));
		assert.strictEqual(manifest?.project.name, 'SampleApp');
		assert.strictEqual(manifest?.project.template, 'minimal-internal-docs');
		assert.strictEqual(manifest?.storage.root, '.pinake/docs');
		assert.strictEqual(manifest?.storage.hiddenFromExplorer, false);
		assert.strictEqual(manifest?.modules.overview, true);
		assert.strictEqual(manifest?.modules.architecture, false);
		assert.ok(manifest?.documents.some((document) => document.id === 'overview-index' && document.path === '00_overview/index.md'));
		assert.ok(!manifest?.documents.some((document) => document.content));
		assert.match(overview, /^---\ntitle: "Overview"\ntype: overview/m);
		assert.match(gitignore, /^\.state\/$/m);
	});

	test('can generate the old large structure as the Full Product Handbook template', async () => {
		const { root, fileService, manifestService, scaffoldService } = await createFixture();

		await scaffoldService.initializePinake(root, {
			projectName: 'SampleApp',
			templateId: 'full-product-handbook',
			moduleIds: allPinakeModuleIds,
			hiddenFromExplorer: false,
		});

		const manifest = await manifestService.readManifest(root);
		assert.strictEqual(manifest?.project.template, 'full-product-handbook');
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_Overview', 'Overview.md')));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '06_Decisions', 'ADR-0001-ExampleDecision.md')));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '03_Development')));
	});

	test('optionally hides .pinake from the VS Code Explorer without losing settings', async () => {
		const { root, fileService, manifestService, scaffoldService } = await createFixture();
		await fileService.ensureDirectory(vscode.Uri.joinPath(root, '.vscode'));
		await fileService.writeJson(vscode.Uri.joinPath(root, '.vscode', 'settings.json'), {
			'editor.tabSize': 2,
			'files.exclude': {
				'**/.cache': true,
			},
		});

		await scaffoldService.initializePinake(root, {
			projectName: 'SampleApp',
			hiddenFromExplorer: true,
		});

		const settings = await fileService.readJson<Record<string, unknown>>(vscode.Uri.joinPath(root, '.vscode', 'settings.json'));
		const filesExclude = settings?.['files.exclude'] as Record<string, boolean>;
		const manifest = await manifestService.readManifest(root);

		assert.strictEqual(settings?.['editor.tabSize'], 2);
		assert.strictEqual(filesExclude['**/.cache'], true);
		assert.strictEqual(filesExclude['**/.pinake'], true);
		assert.strictEqual(manifest?.storage.hiddenFromExplorer, true);
	});

	test('safely copies an old Pinake folder into .pinake/docs when migration is requested', async () => {
		const { root, fileService, manifestService, scaffoldService } = await createFixture();
		await fileService.ensureDirectory(vscode.Uri.joinPath(root, 'Pinake', '00_Overview'));
		await fileService.writeText(vscode.Uri.joinPath(root, 'Pinake', '00_Overview', 'Legacy.md'), '# Legacy Overview\n');
		await fileService.writeText(vscode.Uri.joinPath(root, 'Pinake', 'pinake.json'), '{"legacy":true}\n');

		await scaffoldService.initializePinake(root, {
			projectName: 'SampleApp',
			migrateLegacy: true,
		});

		const manifest = await manifestService.readManifest(root);
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, 'Pinake', '00_Overview', 'Legacy.md')));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_Overview', 'Legacy.md')));
		assert.ok(!(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', 'pinake.json'))));
		assert.ok(manifest?.documents.some((document) => document.path.toLowerCase() === '00_overview/legacy.md'));
	});

	test('upgrades a legacy Pinake folder into the current schema and records migration history', async () => {
		const { root, fileService, manifestService, scaffoldService } = await createFixture();
		await fileService.ensureDirectory(vscode.Uri.joinPath(root, 'Pinake', '00_Overview'));
		await fileService.writeText(vscode.Uri.joinPath(root, 'Pinake', '00_Overview', 'Legacy.md'), '# Legacy Overview\n');
		await fileService.writeJson(vscode.Uri.joinPath(root, 'Pinake', 'pinake.json'), {
			name: 'LegacyApp',
			version: '1.0.0',
			language: 'en',
			modules: [
				{ id: 'API', enabled: true },
			],
		});

		const result = await scaffoldService.upgradePinake(root, 'FallbackName');
		const manifest = await manifestService.readManifest(root);
		const migrations = await fileService.readJson<{ history: { notes: string }[] }>(
			vscode.Uri.joinPath(root, '.pinake', '.state', 'migrations.json'),
		);

		assert.ok(result.created.includes('.pinake/docs/00_Overview/Legacy.md'));
		assert.strictEqual(manifest?.project.name, 'LegacyApp');
		assert.strictEqual(manifest?.storage.root, '.pinake/docs');
		assert.strictEqual(manifest?.modules.API, true);
		assert.ok(manifest?.documents.some((document) => document.path === '00_Overview/Legacy.md'));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', '.state', 'modules.json')));
		assert.ok(migrations?.history.some((entry) => entry.notes.includes('current Pinake schema')));
	});

	test('generates modules without overwriting edited documents', async () => {
		const { root, fileService, manifestService, scaffoldService } = await createFixture();
		const api = getModuleDescriptor('API');
		assert.ok(api);

		await scaffoldService.initializePinake(root, 'SampleApp');
		await scaffoldService.generateModules(root, [api]);

		const overviewUri = vscode.Uri.joinPath(root, '.pinake', 'docs', '03_Development', 'API', 'Overview.md');
		await fileService.writeText(overviewUri, '# Custom API Overview\n');
		await scaffoldService.generateModules(root, [api]);

		const manifest = await manifestService.readManifest(root);
		assert.strictEqual(await fileService.readText(overviewUri), '# Custom API Overview\n');
		assert.strictEqual(manifest?.modules.API, true);
		assert.ok(manifest?.documents.some((document) => document.path === '03_Development/API/Overview.md'));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', '.state', 'indexes.json')));
	});

	test('persists expanded and collapsed tree state in Pinake ui state', async () => {
		const { root, scaffoldService, stateService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		await stateService.recordExpanded(root, '00_overview');
		await stateService.recordExpanded(root, '02_development/API');
		await stateService.recordCollapsed(root, '00_overview');
		await stateService.recordLastOpened(root, '02_development/API/overview.md');
		await stateService.recordSortMode(root, 'nameDesc');

		const state = await stateService.readUiState(root);
		assert.deepStrictEqual(state.expanded, ['02_development/API']);
		assert.deepStrictEqual(state.collapsed, ['00_overview']);
		assert.strictEqual(state.lastOpened, '02_development/API/overview.md');
		assert.strictEqual(state.sortMode, 'nameDesc');
	});

	test('persists favorite tree paths in Pinake ui state', async () => {
		const { root, scaffoldService, stateService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		assert.strictEqual(await stateService.addFavorite(root, '00_overview/index.md'), true);
		assert.strictEqual(await stateService.addFavorite(root, '00_overview/index.md'), false);
		assert.strictEqual(await stateService.addFavorite(root, '99_appendix/glossary.md'), true);
		assert.strictEqual(await stateService.removeFavorite(root, '00_overview/index.md'), true);
		assert.strictEqual(await stateService.removeFavorite(root, '00_overview/index.md'), false);

		const state = await stateService.readUiState(root);
		assert.deepStrictEqual(state.favorites, ['99_appendix/glossary.md']);
	});

	test('indexes snippets, filters, backlinks, and reference graph data', async () => {
		const { root, fileService, indexService, scaffoldService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'searchable.md'),
			[
				'---',
				'tags: [payments, backend]',
				'---',
				'# Payments Gateway',
				'',
				'Stripe checkout and invoice webhook handling.',
				'See [Overview](../00_overview/index.md).',
				'See [Missing](missing.md).',
				'',
			].join('\n'),
		);
		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'linked.md'),
			[
				'---',
				'tags:',
				'  - overview',
				'---',
				'# Linked',
				'',
				'Read [Payments](../02_development/searchable.md).',
				'',
			].join('\n'),
		);

		const index = await indexService.rebuild(root);
		const tagResults = await indexService.search(root, 'tag:payments stripe');
		const headingResults = await indexService.search(root, 'heading:payments');
		const backlinks = await indexService.findBacklinks(root, '02_development/searchable.md');
		const brokenReferences = await indexService.findBrokenReferences(root);
		const graph = await indexService.getReferenceGraph(root);

		assert.strictEqual(index.version, 2);
		assert.strictEqual(tagResults[0]?.path, '02_development/searchable.md');
		assert.ok(tagResults[0]?.matchedTerms.includes('stripe'));
		assert.ok(tagResults[0]?.snippet?.includes('Stripe checkout'));
		assert.ok(tagResults[0]?.tags.includes('payments'));
		assert.strictEqual(headingResults[0]?.path, '02_development/searchable.md');
		assert.ok(backlinks.some((entry) =>
			entry.sourcePath === '00_overview/linked.md'
			&& entry.targetPath === '02_development/searchable.md',
		));
		assert.ok(brokenReferences.some((entry) =>
			entry.sourcePath === '02_development/searchable.md'
			&& entry.targetRaw === 'missing.md',
		));
		assert.ok(graph.nodes.some((node) =>
			node.path === '02_development/searchable.md'
			&& node.title === 'Payments Gateway'
			&& node.tags.includes('payments'),
		));
		assert.ok(graph.edges.some((edge) =>
			edge.sourcePath === '00_overview/linked.md'
			&& edge.targetPath === '02_development/searchable.md'
			&& !edge.broken,
		));

		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'searchable.md'),
			[
				'---',
				'tags: [payments, backend]',
				'---',
				'# Payments Gateway',
				'',
				'PayPal payouts and refund reconciliation.',
				'See [Overview](../00_overview/index.md).',
				'See [Missing](missing.md).',
				'',
			].join('\n'),
		);
		await indexService.updateDocument(root, '02_development/searchable.md');

		const updatedResults = await indexService.search(root, 'paypal refunds');
		assert.strictEqual(updatedResults[0]?.path, '02_development/searchable.md');
		assert.ok(updatedResults[0]?.snippet?.includes('PayPal payouts'));

		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'missing.md'),
			'# Missing\n\nThis page now exists.\n',
		);
		await indexService.updateDocument(root, '02_development/missing.md');
		const resolvedReferences = await indexService.findBrokenReferences(root);
		assert.ok(!resolvedReferences.some((entry) =>
			entry.sourcePath === '02_development/searchable.md'
			&& entry.targetRaw === 'missing.md',
		));

		await fs.rm(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'linked.md').fsPath);
		await indexService.removeDocument(root, '00_overview/linked.md');
		const remainingBacklinks = await indexService.findBacklinks(root, '02_development/searchable.md');
		assert.ok(!remainingBacklinks.some((entry) => entry.sourcePath === '00_overview/linked.md'));
	});

	test('repairs missing generated files without overwriting existing docs', async () => {
		const { root, fileService, scaffoldService } = await createFixture();
		const api = getModuleDescriptor('API');
		assert.ok(api);

		await scaffoldService.initializePinake(root, 'SampleApp');
		await scaffoldService.generateModules(root, [api]);

		const overviewUri = vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'index.md');
		const endpointUri = vscode.Uri.joinPath(root, '.pinake', 'docs', '03_Development', 'API', 'Endpoints.md');
		const authUri = vscode.Uri.joinPath(root, '.pinake', 'docs', '03_Development', 'API', 'Authentication.md');
		await fileService.writeText(authUri, '# Custom Auth\n');
		await fs.rm(overviewUri.fsPath);
		await fs.rm(endpointUri.fsPath);

		const result = await scaffoldService.repairPinake(root, 'SampleApp');

		assert.ok(result.created.includes('.pinake/docs/00_overview/index.md'));
		assert.strictEqual(await fileService.readText(authUri), '# Custom Auth\n');
	});

	test('reports bad ADR names and broken Markdown links', async () => {
		const { root, fileService, manifestService, scaffoldService, validationService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		const badAdrPath = '03_decisions/BadDecision.md';
		await fileService.writeText(vscode.Uri.joinPath(root, '.pinake', 'docs', '03_decisions', 'BadDecision.md'), '# Bad Decision\n');
		await fileService.writeText(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'broken.md'), '[Missing](../Missing.md)\n');

		const manifest = await manifestService.readManifest(root);
		assert.ok(manifest);
		manifestService.addDocuments(manifest, [createTestDocument('bad-adr', 'Bad Decision', badAdrPath, 'adr')]);
		await manifestService.writeManifest(root, manifest);

		const result = await validationService.validate(root);

		assert.ok(result.valid);
		assert.ok(result.issues.some((issue) => issue.message.includes('ADR file should match')));
		assert.ok(result.issues.some((issue) => issue.message.includes('Broken Markdown link')));
	});

	test('validates manifest shape', async () => {
		const { manifestService } = await createFixture();

		const issues = manifestService.validateManifestShape({
			version: 1,
			storage: {
				root: '.pinake/docs',
				hiddenFromExplorer: true,
			},
			project: {
				name: 'SampleApp',
				documentationType: 'internal',
				audience: ['developers'],
				template: 'minimal-internal-docs',
			},
			modules: {
				overview: 'yes',
			},
			documents: [
				{
					id: 'bad',
					title: 'Bad',
					path: '../bad.md',
					type: 'unknown',
					status: 'draft',
					order: 1,
				},
			],
		});

		assert.ok(issues.some((issue) => issue.includes('modules.overview')));
		assert.ok(issues.some((issue) => issue.includes('path must be relative')));
		assert.ok(issues.some((issue) => issue.includes('unsupported type')));
	});

	test('validates Pinake JSON files against runtime schemas', async () => {
		const { root, fileService, manifestService, scaffoldService, validationService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		const manifest = await manifestService.readManifest(root);
		assert.ok(manifest);
		await fileService.writeJson(vscode.Uri.joinPath(root, '.pinake', 'pinake.json'), {
			...manifest,
			documents: [
				{
					...manifest.documents[0],
					content: '# This is not allowed in pinake.json',
					status: 'unknown',
				},
			],
		});

		const result = await validationService.validate(root);

		assert.strictEqual(result.valid, false);
		assert.ok(result.issues.some((issue) =>
			issue.path === '.pinake/pinake.json'
			&& issue.message.includes('$.documents[0].content')
			&& issue.message.includes('additional property "content"'),
		));
		assert.ok(result.issues.some((issue) =>
			issue.path === '.pinake/pinake.json'
			&& issue.message.includes('$.documents[0].status')
			&& issue.message.includes('must be one of'),
		));
	});

	test('validates internal Pinake state files against runtime schemas', async () => {
		const { root, fileService, scaffoldService, validationService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.writeJson(vscode.Uri.joinPath(root, '.pinake', '.state', 'ui.json'), {
			expanded: [],
			collapsed: [],
			favorites: [],
			sortMode: 'random',
			lastScroll: 2,
			extra: true,
		});

		const result = await validationService.validate(root);

		assert.strictEqual(result.valid, false);
		assert.ok(result.issues.some((issue) =>
			issue.path === '.pinake/.state/ui.json'
			&& issue.message.includes('$.sortMode')
			&& issue.message.includes('must be one of'),
		));
		assert.ok(result.issues.some((issue) =>
			issue.path === '.pinake/.state/ui.json'
			&& issue.message.includes('$.lastScroll')
			&& issue.message.includes('less than or equal to 1'),
		));
		assert.ok(result.issues.some((issue) =>
			issue.path === '.pinake/.state/ui.json'
			&& issue.message.includes('additional property "extra"'),
		));
	});

	test('reports Markdown style warnings with line numbers', async () => {
		const { root, fileService, scaffoldService, validationService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'style.md'),
			'# Style Issue  \n\tIndented with a tab\n```ts\nconst open = true;\n',
		);

		const result = await validationService.validate(root);

		assert.ok(result.valid);
		assert.ok(result.issues.some((issue) =>
			issue.path === '.pinake/docs/00_overview/style.md'
			&& issue.line === 1
			&& issue.message.includes('trailing whitespace'),
		));
		assert.ok(result.issues.some((issue) =>
			issue.path === '.pinake/docs/00_overview/style.md'
			&& issue.line === 2
			&& issue.message.includes('starts with a tab'),
		));
		assert.ok(result.issues.some((issue) =>
			issue.path === '.pinake/docs/00_overview/style.md'
			&& issue.line === 3
			&& issue.message.includes('fenced code block is not closed'),
		));
	});

	test('formats search, validation, and properties feedback for native surfaces', () => {
		const searchItem = formatSearchResultItem({
			path: '02_development/searchable.md',
			title: 'Payments Gateway',
			headings: ['Payments Gateway', 'Webhook Flow'],
			score: 42,
			matchedTerms: ['invoice', 'stripe'],
			snippet: 'Stripe checkout and invoice webhook handling.',
			tags: ['backend', 'payments'],
		});
		const validationReport = formatValidationReport({
			valid: false,
			issues: [
				{
					severity: 'warning',
					message: 'Broken Markdown link "../Missing.md" in .pinake/docs/00_overview/index.md.',
					path: '.pinake/docs/00_overview/index.md',
					line: 12,
				},
				{
					severity: 'error',
					message: '.pinake/pinake.json $.documents[0].status must be one of stable, draft.',
					path: '.pinake/pinake.json',
				},
			],
		});
		const propertiesReport = formatPropertiesReport({
			name: 'index.md',
			type: 'File',
			relativePath: '00_overview/index.md',
			fullPath: '/workspace/.pinake/docs/00_overview/index.md',
			size: '1.2 KB',
			created: '2026-07-08T12:00:00.000Z',
			modified: '2026-07-08T12:30:00.000Z',
			document: createTestDocument('overview-index', 'Overview', '00_overview/index.md', 'overview'),
		});

		assert.strictEqual(searchItem.label, 'Payments Gateway');
		assert.strictEqual(searchItem.description, '02_development/searchable.md');
		assert.ok(searchItem.detail?.includes('Tags: #backend #payments'));
		assert.ok(searchItem.detail?.includes('Snippet: Stripe checkout'));
		assert.ok(searchItem.detail?.includes('Headings: Payments Gateway > Webhook Flow'));
		assert.ok(searchItem.detail?.includes('Matched: invoice, stripe'));
		assert.strictEqual(
			formatNoSearchResultsMessage('tag:payments missing'),
			'No Pinake results found for "tag:payments missing". Try a shorter phrase, tag:<name>, heading:<text>, or a broader term.',
		);

		assert.ok(validationReport.includes('Summary: 1 error(s), 1 warning(s), 0 info item(s).'));
		assert.ok(validationReport.includes('Errors (1)'));
		assert.ok(validationReport.includes('- .pinake/pinake.json'));
		assert.ok(validationReport.some((line) => line.includes('Issue: .pinake/pinake.json $.documents[0].status')));
		assert.ok(validationReport.includes('  Fix: Update the JSON file so it matches the shipped Pinake schema.'));
		assert.ok(validationReport.includes('Warnings (1)'));
		assert.ok(validationReport.includes('- .pinake/docs/00_overview/index.md:12'));
		assert.ok(validationReport.includes('  Fix: Update the link target or add the missing document.'));

		assert.deepStrictEqual(propertiesReport.slice(0, 12), [
			'Pinake Item Properties',
			'',
			'Location',
			'Relative path: 00_overview/index.md',
			'Full path: /workspace/.pinake/docs/00_overview/index.md',
			'',
			'Item',
			'Name: index.md',
			'Type: File',
			'Size: 1.2 KB',
			'Created: 2026-07-08T12:00:00.000Z',
			'Modified: 2026-07-08T12:30:00.000Z',
		]);
		assert.ok(propertiesReport.includes('Document Metadata'));
		assert.ok(propertiesReport.includes('Document type: Overview'));
		assert.ok(propertiesReport.includes('Status: Draft'));
	});

	test('generates CI validation workflow and standalone validator', async () => {
		const { root, fileService, scaffoldService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		const result = await scaffoldService.generateCiValidation(root);
		const workflow = await fileService.readText(vscode.Uri.joinPath(root, '.github', 'workflows', 'pinake-validate.yml'));
		const validatorUri = vscode.Uri.joinPath(root, '.pinake', 'tools', 'validate-pinake.mjs');
		const validator = await fileService.readText(validatorUri);
		const { stdout } = await execFileAsync(process.execPath, [validatorUri.fsPath, '--root', root.fsPath, '--format', 'json']);
		const report = JSON.parse(stdout) as { valid: boolean };

		assert.ok(result.created.includes('.github/workflows/pinake-validate.yml'));
		assert.ok(result.created.includes('.pinake/tools/validate-pinake.mjs'));
		assert.match(workflow, /node \.pinake\/tools\/validate-pinake\.mjs --format github/);
		assert.match(validator, /Usage: node validate-pinake\.mjs/);
		assert.strictEqual(report.valid, true);
	});

	test('sorts tree children and opens documents with Markdown preview by default', async () => {
		const { root, fileService, scaffoldService, stateService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		const provider = new PinakeTreeProvider(root, fileService, stateService);
		const rootChildren = await provider.getChildren();
		assert.deepStrictEqual(
			rootChildren.map((node) => node.label),
			['00_overview', '01_getting-started', '02_development', '03_decisions', '99_appendix'],
		);
		assert.ok(!rootChildren.some((node) => node.label === '.state'));

		const overviewDirectory = rootChildren.find((node) => node.label === '00_overview');
		if (!overviewDirectory) {
			assert.fail('Expected 00_overview directory in tree.');
		}

		const directoryItem = provider.getTreeItem(overviewDirectory);
		assert.strictEqual(directoryItem.contextValue, 'directory');
		assert.strictEqual(directoryItem.tooltip, 'Folder\n00_overview');
		assert.strictEqual(overviewDirectory.relativePath, '00_overview');

		const overviewChildren = await provider.getChildren(overviewDirectory);
		const overviewFile = overviewChildren.find((node) => node.relativePath === '00_overview/index.md');
		if (!overviewFile) {
			assert.fail('Expected overview document in tree.');
		}

		const fileItem = provider.getTreeItem(overviewFile);
		assert.strictEqual(overviewFile.label, 'Overview');
		assert.strictEqual(fileItem.contextValue, 'pinakeDocument');
		assert.strictEqual(fileItem.description, 'Overview - Draft');
		assert.match(String(fileItem.tooltip), /Type: Overview/);
		assert.match(String(fileItem.tooltip), /Status: Draft/);
		assert.strictEqual(fileItem.command?.command, 'pinake.openPreview');

		const resolvedFile = await provider.getNodeByRelativePath('00_overview/index.md');
		const parent = resolvedFile ? await provider.getParent(resolvedFile) : undefined;
		assert.strictEqual(resolvedFile?.label, 'Overview');
		assert.strictEqual(parent?.label, '00_overview');

		await stateService.recordSortMode(root, 'nameDesc');
		const descendingChildren = await provider.getChildren();
		assert.strictEqual(descendingChildren[0]?.label, '99_appendix');
	});

	test('shows native TreeView onboarding states before documents exist', async () => {
		const { root, fileService, stateService } = await createFixture();

		const noWorkspaceProvider = new PinakeTreeProvider(undefined, fileService, stateService);
		const noWorkspaceChildren = await noWorkspaceProvider.getChildren();
		assert.strictEqual(noWorkspaceChildren[0]?.kind, 'emptyState');
		assert.strictEqual(noWorkspaceChildren[0]?.label, 'Open a workspace folder');
		assert.strictEqual(noWorkspaceProvider.getTreeItem(noWorkspaceChildren[0]).contextValue, 'pinakeEmptyState.noWorkspace');
		assert.strictEqual(noWorkspaceProvider.getTreeItem(noWorkspaceChildren[0]).command, undefined);

		const provider = new PinakeTreeProvider(root, fileService, stateService);
		const missingChildren = await provider.getChildren();
		assert.strictEqual(missingChildren.length, 1);
		assert.strictEqual(missingChildren[0]?.kind, 'emptyState');
		assert.strictEqual(missingChildren[0]?.label, 'Create Pinake documentation');
		const missingItem = provider.getTreeItem(missingChildren[0]);
		assert.strictEqual(missingItem.contextValue, 'pinakeEmptyState.createPinake');
		assert.strictEqual(missingItem.description, 'Run Pinake: Create Documentation');
		assert.strictEqual(missingItem.command?.command, 'pinake.create');

		await fileService.ensureDirectory(vscode.Uri.joinPath(root, '.pinake', 'docs'));
		const emptyChildren = await provider.getChildren();
		assert.strictEqual(emptyChildren.length, 1);
		assert.strictEqual(emptyChildren[0]?.label, 'No Pinake documents yet');
		const emptyItem = provider.getTreeItem(emptyChildren[0]);
		assert.strictEqual(emptyItem.contextValue, 'pinakeEmptyState.emptyDocs');
		assert.strictEqual(emptyItem.description, 'Create a Markdown file');
		assert.strictEqual(emptyItem.command?.command, 'pinakes.newFile');
	});

	test('shows favorited files in a virtual Favorites tree group', async () => {
		const { root, fileService, scaffoldService, stateService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await stateService.addFavorite(root, '00_overview/index.md');
		await stateService.addFavorite(root, 'Missing.md');

		const provider = new PinakeTreeProvider(root, fileService, stateService);
		const rootChildren = await provider.getChildren();
		const favorites = rootChildren[0];
		assert.strictEqual(favorites.label, 'Favorites');
		assert.strictEqual(provider.getTreeItem(favorites).contextValue, 'favorites');

		const favoriteChildren = await provider.getChildren(favorites);
		assert.deepStrictEqual(favoriteChildren.map((node) => node.relativePath), ['00_overview/index.md']);
		assert.strictEqual(favoriteChildren[0]?.kind, 'favoriteFile');
		assert.strictEqual(favoriteChildren[0]?.sourceRelativePath, '00_overview/index.md');

		const favoriteItem = provider.getTreeItem(favoriteChildren[0]);
		assert.strictEqual(favoriteItem.contextValue, 'favoritePinakeDocument');
		assert.strictEqual(favoriteItem.command?.command, 'pinake.openPreview');
		assert.strictEqual((await provider.getParent(favoriteChildren[0]))?.label, 'Favorites');

		await stateService.removeFavorite(root, '00_overview/index.md');
		assert.notStrictEqual((await provider.getChildren())[0]?.label, 'Favorites');
	});

	async function createFixture(): Promise<Fixture> {
		const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pinakes-test-'));
		tempRoots.push(rootPath);
		const root = vscode.Uri.file(rootPath);
		const fileService = new FileService();
		const manifestService = new ManifestService(fileService);
		const stateService = new StateService(fileService);
		const indexService = new IndexService(fileService);
		const scaffoldService = new ScaffoldService(fileService, manifestService, stateService, indexService);
		const validationService = new ValidationService(fileService, manifestService);

		return {
			root,
			fileService,
			indexService,
			manifestService,
			scaffoldService,
			stateService,
			validationService,
		};
	}
});

function createTestDocument(id: string, title: string, documentPath: string, type: PinakeDocumentDefinition['type']): PinakeDocumentDefinition {
	return {
		id,
		title,
		path: documentPath,
		type,
		status: 'draft',
		order: 1,
	};
}

interface Fixture {
	root: vscode.Uri;
	fileService: FileService;
	indexService: IndexService;
	manifestService: ManifestService;
	scaffoldService: ScaffoldService;
	stateService: StateService;
	validationService: ValidationService;
}
