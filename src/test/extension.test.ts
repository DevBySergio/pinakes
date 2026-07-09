import * as assert from 'assert';
import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { PinakesCommands } from '../commands/PinakesCommands';
import { getModuleDescriptor, moduleDescriptors, modulePresets } from '../modules/moduleDescriptors';
import {
	AgentSkillInstaller,
	getPackagedPinakeSkillUri,
	resolvePinakeAgentSkillTarget,
} from '../services/AgentSkillInstaller';
import {
	formatGeneratedModulePickItem,
	formatModulePresetPickItem,
	formatNoSearchResultsMessage,
	formatPropertiesReport,
	formatSearchResultItem,
	formatTemplateModulePickItem,
	formatTemplatePickItem,
	formatValidationReport,
	normalizePinakeFolderName,
	normalizePinakeMarkdownFileName,
	validatePinakeFileName,
	validatePinakeFolderName,
} from '../services/FeedbackFormatter';
import { FileService } from '../services/FileService';
import { IndexService } from '../services/IndexService';
import { ManifestService } from '../services/ManifestService';
import { PinakeTransferService } from '../services/PinakeTransferService';
import { ScaffoldService } from '../services/ScaffoldService';
import { StateService } from '../services/StateService';
import { ValidationDiagnosticsService } from '../services/ValidationDiagnosticsService';
import { ValidationService } from '../services/ValidationService';
import { WorkspaceService } from '../services/WorkspaceService';
import { allPinakeModuleIds, getPinakeDocuments, getPinakeModuleDefinition, pinakeTemplateDefinitions } from '../templates/pinakeTemplates';
import { PinakeDocumentDefinition } from '../types';
import { PinakeTreeDragAndDropController } from '../tree/PinakeTreeDragAndDropController';
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
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '03_Development', 'Workflow.md')));
		assert.ok(manifest?.documents.some((document) => document.id === 'full-development-workflow'));
	});

	test('setup templates provide stable, actionable starter documents', () => {
		for (const template of pinakeTemplateDefinitions) {
			const defaultModuleIds = new Set(template.defaultModules);
			const recommendedModuleIds = new Set(template.recommendedModules ?? []);
			const documents = getPinakeDocuments(template, template.defaultModules);
			const documentIds = new Set<string>();
			const documentPaths = new Set<string>();

			assert.ok(documents.length > 0, `${template.id} should generate documents`);
			for (const moduleId of template.defaultModules) {
				assert.ok(getPinakeModuleDefinition(template, moduleId).documents.length > 0, `${template.id}:${moduleId} should include starter documents`);
			}

			for (const moduleId of recommendedModuleIds) {
				assert.ok(allPinakeModuleIds.includes(moduleId), `${template.id} recommends known module ${moduleId}`);
				assert.ok(!defaultModuleIds.has(moduleId), `${template.id} should not recommend a default module`);
			}

			for (const document of documents) {
				assert.ok(!documentIds.has(document.id), `${template.id} has duplicate document id ${document.id}`);
				assert.ok(!documentPaths.has(document.path), `${template.id} has duplicate document path ${document.path}`);
				assert.ok(document.content?.includes(`# ${document.title}`), `${document.id} should render its title`);
				assert.ok((document.content?.match(/^## /gm) ?? []).length >= 2, `${document.id} should include actionable sections`);
				documentIds.add(document.id);
				documentPaths.add(document.path);
			}
		}
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

	test('includes the expanded component catalog and generates representative modules', async () => {
		const rootPath = path.resolve(__dirname, '..', '..');
		const roadmap = await fs.readFile(path.join(rootPath, 'docs', 'component-catalog-roadmap.md'), 'utf8');
		const scaffoldReference = await fs.readFile(path.join(rootPath, 'docs', 'scaffold-reference.md'), 'utf8');
		const requiredModuleIds = [
			'GraphQL',
			'gRPC',
			'WebSocket',
			'Backend',
			'Cache',
			'MessageQueue',
			'OAuth',
			'IaC',
			'Monitoring',
			'Security',
			'CLI',
			'SDK',
			'Microservice',
		];
		const deferredModuleIds = [
			'Authorization',
			'Payments',
			'Search',
			'Email',
			'DataPipeline',
			'ML',
			'GraphDB',
			'Logging',
			'PluginExtension',
			'Monorepo',
			'LegacyMigration',
			'Documentation',
			'Testing',
			'DevTools',
		];
		const missingModuleIds = requiredModuleIds.filter((id) => !getModuleDescriptor(id));
		const unexpectedlyShippedModuleIds = deferredModuleIds.filter((id) => getModuleDescriptor(id));
		const duplicateModuleIds = moduleDescriptors
			.map((descriptor) => descriptor.id)
			.filter((id, index, ids) => ids.indexOf(id) !== index);

		assert.deepStrictEqual(missingModuleIds, []);
		assert.deepStrictEqual(unexpectedlyShippedModuleIds, []);
		assert.deepStrictEqual(duplicateModuleIds, []);
		assert.ok(roadmap.includes('## Current Shipped Slice'));
		assert.ok(roadmap.includes('## Deferred Backlog'));
		assert.ok(scaffoldReference.includes('## Deferred Component Modules'));
		for (const id of requiredModuleIds) {
			const descriptor = getModuleDescriptor(id);
			assert.ok(descriptor);
			assert.ok(descriptor.rootFolder.length > 0);
			assert.ok(descriptor.files.length >= 5);
			assert.ok(descriptor.files.every((file) => file.relativePath.startsWith(`${descriptor.rootFolder}/`)));
			assert.ok(descriptor.files.every((file) => file.content.startsWith('# ')));
			assert.ok(roadmap.includes(`| \`${id}\` |`));
		}
		for (const id of deferredModuleIds) {
			assert.ok(roadmap.includes(id));
		}
		assert.ok(scaffoldReference.includes('| Authorization | `03_Development/Authorization` |'));
		assert.ok(scaffoldReference.includes('| DevTools | `02_Development/DevTools` |'));

		const apiPlatform = modulePresets.find((preset) => preset.id === 'api-platform');
		const cloudNative = modulePresets.find((preset) => preset.id === 'cloud-native');
		const microservice = modulePresets.find((preset) => preset.id === 'microservice');
		assert.deepStrictEqual(apiPlatform?.moduleIds, ['API', 'GraphQL', 'gRPC', 'WebSocket', 'SDK']);
		assert.ok(cloudNative?.moduleIds.includes('IaC'));
		assert.ok(cloudNative?.moduleIds.includes('Security'));
		assert.ok(microservice?.moduleIds.includes('Microservice'));

		const { root, fileService, manifestService, scaffoldService } = await createFixture();
		const descriptors = ['OAuth', 'Microservice', 'GraphQL', 'CLI', 'IaC', 'Security']
			.map((id) => getModuleDescriptor(id));
		if (descriptors.some((descriptor) => !descriptor)) {
			assert.fail('Expected representative expanded module descriptors.');
		}
		const selectedDescriptors = descriptors.filter((descriptor): descriptor is NonNullable<typeof descriptor> => Boolean(descriptor));

		await scaffoldService.initializePinake(root, 'SampleApp');
		await scaffoldService.generateModules(root, selectedDescriptors);

		const manifest = await manifestService.readManifest(root);
		assert.strictEqual(manifest?.modules.OAuth, true);
		assert.strictEqual(manifest?.modules.Authentication, true);
		assert.strictEqual(manifest?.modules.Microservice, true);
		assert.strictEqual(manifest?.modules.Monitoring, true);
		assert.strictEqual(manifest?.modules.GraphQL, true);
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '03_Development', 'GraphQL', 'Schema.md')));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '03_Development', 'CLI', 'Commands.md')));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '05_Operations', 'IaC', 'State.md')));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '04_Architecture', 'Security', 'ThreatModel.md')));
		assert.ok(manifest?.documents.some((document) => document.path === '04_Architecture/Microservice/Boundaries.md'));
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

	test('repair adds untracked Markdown documents to the manifest explicitly', async () => {
		const { root, fileService, manifestService, scaffoldService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		const untrackedUri = vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'local-notes.md');
		await fileService.writeText(untrackedUri, '# Local Notes\n');

		let manifest = await manifestService.readManifest(root);
		assert.ok(!manifest?.documents.some((document) => document.path === '02_development/local-notes.md'));

		const result = await scaffoldService.repairPinake(root, 'SampleApp');
		manifest = await manifestService.readManifest(root);

		assert.ok(result.updated.includes('.pinake/pinake.json'));
		assert.ok(manifest?.documents.some((document) =>
			document.path === '02_development/local-notes.md'
			&& document.title === 'Local Notes',
		));
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

	test('reports frontmatter that drifts from manifest metadata', async () => {
		const { root, fileService, scaffoldService, validationService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'index.md'),
			[
				'---',
				'title: "Wrong Overview"',
				'type: reference',
				'status: stable',
				'order: 99',
				'---',
				'',
				'# Overview',
				'',
			].join('\n'),
		);

		const result = await validationService.validate(root);

		assert.ok(result.valid);
		assert.ok(result.issues.some((issue) =>
			issue.path === '.pinake/docs/00_overview/index.md'
			&& issue.message.includes('frontmatter title should match pinake.json')
			&& issue.message.includes('Wrong Overview'),
		));
		assert.ok(result.issues.some((issue) => issue.message.includes('frontmatter type should match pinake.json')));
		assert.ok(result.issues.some((issue) => issue.message.includes('frontmatter status should match pinake.json')));
		assert.ok(result.issues.some((issue) => issue.message.includes('frontmatter order should match pinake.json')));
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

	test('reports warning-only secret hygiene issues with line numbers', async () => {
		const { root, fileService, scaffoldService, validationService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'secrets.md'),
			[
				'---',
				'title: "Secret Hygiene"',
				'type: reference',
				'status: draft',
				'order: 1',
				'---',
				'',
				'# Secret Hygiene',
				'github_token = "ghp_1234567890abcdefghijklmnopqrstuvwxyzAB"',
				'client_secret: liveclientsecretvalue12345',
				'-----BEGIN PRIVATE KEY-----',
				'',
			].join('\n'),
		);

		const result = await validationService.validate(root);
		const secretIssues = result.issues.filter((issue) => issue.message.includes('secret-like content'));

		assert.strictEqual(result.valid, true);
		assert.strictEqual(secretIssues.length, 3);
		assert.ok(secretIssues.every((issue) => issue.severity === 'warning'));
		assert.ok(secretIssues.some((issue) =>
			issue.path === '.pinake/docs/02_development/secrets.md'
			&& issue.line === 9
			&& issue.message.includes('GitHub token'),
		));
		assert.ok(secretIssues.some((issue) => issue.line === 10 && issue.message.includes('credential assignment')));
		assert.ok(secretIssues.some((issue) => issue.line === 11 && issue.message.includes('private key material')));
	});

	test('does not report safe secret placeholders or variable names', async () => {
		const { root, fileService, scaffoldService, validationService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'placeholders.md'),
			[
				'---',
				'title: "Secret Placeholders"',
				'type: reference',
				'status: draft',
				'order: 1',
				'---',
				'',
				'# Secret Placeholders',
				'- `EXAMPLE_API_TOKEN`',
				'api_key = "EXAMPLE_API_TOKEN"',
				'password: REDACTED',
				'client_secret=${CLIENT_SECRET}',
				'The token bucket algorithm limits request bursts.',
				'',
			].join('\n'),
		);

		const result = await validationService.validate(root);

		assert.ok(!result.issues.some((issue) => issue.message.includes('secret-like content')));
	});

	test('publishes validation issues as VS Code diagnostics', async () => {
		const { root, fileService } = await createFixture();
		const markdownUri = vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'style.md');
		const manifestUri = vscode.Uri.joinPath(root, '.pinake', 'pinake.json');
		const ignoredUri = vscode.Uri.joinPath(root, 'README.md');
		const diagnostics = vscode.languages.createDiagnosticCollection('pinakes-test-map');
		const diagnosticsService = new ValidationDiagnosticsService(fileService, diagnostics);

		await fileService.ensureDirectory(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview'));
		await fileService.writeText(markdownUri, '# Style\nsecond line\n');
		await fileService.writeText(manifestUri, '{ "version": 1 }\n');

		try {
			await diagnosticsService.update(root, {
				valid: false,
				issues: [
					{
						severity: 'warning',
						message: 'Markdown line has trailing whitespace.',
						path: '.pinake/docs/00_overview/style.md',
						line: 2,
					},
					{
						severity: 'error',
						message: '.pinake/pinake.json $.documents is required.',
						path: '.pinake/pinake.json',
					},
					{
						severity: 'error',
						message: 'Ignored issue outside Pinake files.',
						path: 'README.md',
					},
				],
			});

			const markdownDiagnostics = diagnostics.get(markdownUri) ?? [];
			const manifestDiagnostics = diagnostics.get(manifestUri) ?? [];

			assert.strictEqual(markdownDiagnostics.length, 1);
			assert.strictEqual(markdownDiagnostics[0]?.source, 'Pinake');
			assert.strictEqual(markdownDiagnostics[0]?.severity, vscode.DiagnosticSeverity.Warning);
			assert.strictEqual(markdownDiagnostics[0]?.range.start.line, 1);
			assert.strictEqual(markdownDiagnostics[0]?.range.end.character, 'second line'.length);
			assert.strictEqual(manifestDiagnostics.length, 1);
			assert.strictEqual(manifestDiagnostics[0]?.severity, vscode.DiagnosticSeverity.Error);
			assert.strictEqual((diagnostics.get(ignoredUri) ?? []).length, 0);
		} finally {
			diagnostics.dispose();
		}
	});

	test('clears stale validation diagnostics after passing validation and repair', async () => {
		const fixture = await createFixture();
		const { root, fileService, scaffoldService } = fixture;
		const diagnostics = vscode.languages.createDiagnosticCollection('pinakes-test-clear');
		const diagnosticsService = new ValidationDiagnosticsService(fileService, diagnostics);
		const { commands, outputChannel } = createCommandHarness(fixture, diagnosticsService);
		const markdownUri = vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'secrets.md');

		try {
			await scaffoldService.initializePinake(root, 'SampleApp');
			await fileService.writeText(
				markdownUri,
				[
					'# Secrets',
					'github_token = "ghp_1234567890abcdefghijklmnopqrstuvwxyzAB"',
					'',
				].join('\n'),
			);

			await commands.validate();
			assert.strictEqual((diagnostics.get(markdownUri) ?? []).length, 1);

			await fileService.writeText(markdownUri, '# Secrets\n\nUse environment-managed credentials.\n');
			await commands.validate();
			assert.strictEqual((diagnostics.get(markdownUri) ?? []).length, 0);

			await diagnosticsService.update(root, {
				valid: false,
				issues: [
					{
						severity: 'warning',
						message: 'Stale diagnostic before repair.',
						path: '.pinake/docs/02_development/secrets.md',
						line: 1,
					},
				],
			});
			assert.strictEqual((diagnostics.get(markdownUri) ?? []).length, 1);

			await commands.repairPinake();
			assert.strictEqual((diagnostics.get(markdownUri) ?? []).length, 0);
		} finally {
			outputChannel.dispose();
			diagnostics.dispose();
		}
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
					{
						severity: 'warning',
						message: 'Possible secret-like content detected (GitHub token) in .pinake/docs/00_overview/index.md.',
						path: '.pinake/docs/00_overview/index.md',
						line: 8,
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

			assert.ok(validationReport.includes('Summary: 1 error(s), 2 warning(s), 0 info item(s).'));
			assert.ok(validationReport.includes('Errors (1)'));
			assert.ok(validationReport.includes('- .pinake/pinake.json'));
			assert.ok(validationReport.some((line) => line.includes('Issue: .pinake/pinake.json $.documents[0].status')));
			assert.ok(validationReport.includes('  Fix: Update the JSON file so it matches the shipped Pinake schema.'));
			assert.ok(validationReport.includes('Warnings (2)'));
			assert.ok(validationReport.includes('- .pinake/docs/00_overview/index.md:8'));
			assert.ok(validationReport.includes('  Fix: Remove the value, replace it with a safe placeholder, or document where the secret is managed.'));
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

	test('formats setup flow choices and validates new Pinake item names', () => {
		const template = pinakeTemplateDefinitions[0];
		const templateItem = formatTemplatePickItem(
			template,
			template.defaultModules.map((moduleId) => getPinakeModuleDefinition(template, moduleId).title),
			true,
			(template.recommendedModules ?? []).map((moduleId) => getPinakeModuleDefinition(template, moduleId).title),
		);
		const includedModuleId = template.defaultModules[0];
		const includedModule = getPinakeModuleDefinition(template, includedModuleId);
		const includedModuleItem = formatTemplateModulePickItem(includedModule, includedModuleId, 'included');
		const recommendedModuleId = template.recommendedModules?.[0];
		assert.ok(recommendedModuleId);
		const recommendedModule = getPinakeModuleDefinition(template, recommendedModuleId);
		const recommendedModuleItem = formatTemplateModulePickItem(recommendedModule, recommendedModuleId, 'recommended');
		const preset = modulePresets[0];
		const presetItem = formatModulePresetPickItem(preset);
		const descriptor = moduleDescriptors[0];
		const generatedModuleItem = formatGeneratedModulePickItem(descriptor);

		assert.strictEqual(templateItem.label, template.title);
		assert.strictEqual(templateItem.description, `Default - ${template.defaultModules.length} modules`);
		assert.ok(templateItem.detail.includes(template.description));
		assert.ok(templateItem.detail.includes('Starts with: Overview, Getting Started'));
		assert.ok(templateItem.detail.includes('Recommended optional modules: Quality, Project Management'));
		assert.strictEqual(includedModuleItem.description, `Included - ${includedModule.folder}`);
		assert.strictEqual(includedModuleItem.detail, `${includedModule.documents.length} documents`);
		assert.strictEqual(includedModuleItem.picked, true);
		assert.strictEqual(recommendedModuleItem.description, `Recommended - ${recommendedModule.folder}`);
		assert.ok(recommendedModuleItem.detail.includes(`${recommendedModule.documents.length} documents`));
		assert.ok(recommendedModuleItem.detail.includes('Suggested optional coverage'));
		assert.strictEqual(recommendedModuleItem.picked, false);
		assert.strictEqual(presetItem.description, `${preset.moduleIds.length} modules`);
		assert.strictEqual(presetItem.detail, preset.description);
		assert.strictEqual(generatedModuleItem.description, descriptor.rootFolder);
		assert.ok(generatedModuleItem.detail.includes(descriptor.description));
		assert.ok(generatedModuleItem.detail.includes(`${descriptor.files.length} files`));

		assert.strictEqual(normalizePinakeMarkdownFileName(' Architecture Notes '), 'Architecture Notes.md');
		assert.strictEqual(normalizePinakeMarkdownFileName('README.md'), 'README.md');
		assert.strictEqual(validatePinakeFileName(''), 'File name is required.');
		assert.strictEqual(validatePinakeFileName('docs/notes.md'), 'Use a file name only; create folders separately.');
		assert.strictEqual(validatePinakeFileName('notes.txt'), 'Use a .md file name, or omit the extension.');
		assert.strictEqual(validatePinakeFileName('notes'), undefined);
		assert.strictEqual(normalizePinakeFolderName(' Architecture '), 'Architecture');
		assert.strictEqual(validatePinakeFolderName(''), 'Folder name is required.');
		assert.strictEqual(validatePinakeFolderName('../docs'), 'Use one folder name at a time.');
		assert.strictEqual(validatePinakeFolderName('notes.md'), 'Use New File to create Markdown documents.');
		assert.strictEqual(validatePinakeFolderName('architecture'), undefined);
	});

	test('installs the packaged Pinake agent skill with safe overwrite behavior', async () => {
		const { root, fileService } = await createFixture();
		const homePath = path.join(root.fsPath, 'home');
		const envHomePath = path.join(homePath, 'codex-home');
		const extensionUri = vscode.Uri.joinPath(root, 'extension');
		const sourceUri = getPackagedPinakeSkillUri(extensionUri);
		const sourceContent = [
			'---',
			'name: pinake',
			'description: Use when the user mentions Pinake.',
			'---',
			'',
			'# Pinake',
			'',
		].join('\n');
		await fileService.ensureDirectory(vscode.Uri.file(path.dirname(sourceUri.fsPath)));
		await fileService.writeText(sourceUri, sourceContent);

		const environmentTarget = resolvePinakeAgentSkillTarget({ CODEX_HOME: envHomePath }, homePath);
		const fallbackTarget = resolvePinakeAgentSkillTarget({ CODEX_HOME: path.join(path.dirname(homePath), 'other-user', '.codex') }, homePath);
		const installer = new AgentSkillInstaller(fileService, extensionUri);

		assert.strictEqual(environmentTarget.targetHome, envHomePath);
		assert.strictEqual(environmentTarget.usedCodexHomeEnvironment, true);
		assert.strictEqual(environmentTarget.targetUri.fsPath, path.join(envHomePath, 'skills', 'pinake', 'SKILL.md'));
		assert.strictEqual(fallbackTarget.targetHome, path.join(homePath, '.codex'));
		assert.strictEqual(fallbackTarget.usedCodexHomeEnvironment, false);
		assert.strictEqual(installer.getPackagedPinakeSkillUri().fsPath, sourceUri.fsPath);

		const installed = await installer.installPinakeSkill(
			async () => assert.fail('Fresh install should not ask for overwrite confirmation.'),
			{ CODEX_HOME: envHomePath },
			homePath,
		);
		assert.strictEqual(installed.status, 'installed');
		assert.strictEqual(await fileService.readText(installed.targetUri), sourceContent);

		let promptCount = 0;
		const unchanged = await installer.installPinakeSkill(
			async () => {
				promptCount += 1;
				return false;
			},
			{ CODEX_HOME: envHomePath },
			homePath,
		);
		assert.strictEqual(unchanged.status, 'unchanged');
		assert.strictEqual(promptCount, 0);

		await fileService.writeText(installed.targetUri, 'different skill');
		const cancelled = await installer.installPinakeSkill(
			async () => {
				promptCount += 1;
				return false;
			},
			{ CODEX_HOME: envHomePath },
			homePath,
		);
		assert.strictEqual(cancelled.status, 'cancelled');
		assert.strictEqual(await fileService.readText(installed.targetUri), 'different skill');
		assert.strictEqual(promptCount, 1);

		const updated = await installer.installPinakeSkill(
			async () => true,
			{ CODEX_HOME: envHomePath },
			homePath,
		);
		assert.strictEqual(updated.status, 'updated');
		assert.strictEqual(await fileService.readText(updated.targetUri), sourceContent);
	});

	test('contributes the Pinake agent skill install command and packaged skill', async () => {
		const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
		const skillPath = path.resolve(__dirname, '..', '..', 'resources', 'skills', 'pinake', 'SKILL.md');
		const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
			activationEvents: string[];
			contributes: {
				commands: { command: string; title: string; icon?: string }[];
				menus: { 'view/title': { command: string; when: string; group: string }[] };
				keybindings: { command: string; key: string; mac?: string; when?: string }[];
			};
		};
		const skill = await fs.readFile(skillPath, 'utf8');
		const command = packageJson.contributes.commands.find((item) => item.command === 'pinakes.installAgentSkill');
		const viewButton = packageJson.contributes.menus['view/title'].find((item) => item.command === 'pinakes.installAgentSkill');
		const primaryViewActions = packageJson.contributes.menus['view/title']
			.filter((item) => item.group.startsWith('navigation'))
			.map((item) => item.command);
		const primaryIcons = primaryViewActions.map((commandId) =>
			packageJson.contributes.commands.find((item) => item.command === commandId)?.icon);
		await vscode.commands.executeCommand('pinakes.refresh');
		const registeredCommands = await vscode.commands.getCommands(true);

		assert.ok(packageJson.activationEvents.includes('onCommand:pinakes.installAgentSkill'));
		assert.strictEqual(command?.title, 'Pinake: Install Agent Skill');
		assert.ok(packageJson.contributes.commands.every((item) => item.title.startsWith('Pinake: ')));
		assert.strictEqual(viewButton?.when, 'view == pinakesView');
		assert.strictEqual(viewButton?.group, '3_maintenance@6');
		assert.ok(packageJson.activationEvents.includes('onCommand:pinakes.export'));
		assert.ok(packageJson.activationEvents.includes('onCommand:pinakes.import'));
		assert.strictEqual(
			packageJson.contributes.commands.find((item) => item.command === 'pinakes.export')?.title,
			'Pinake: Export',
		);
		assert.strictEqual(
			packageJson.contributes.commands.find((item) => item.command === 'pinakes.import')?.title,
			'Pinake: Import Markdown',
		);
		assert.deepStrictEqual(primaryViewActions, [
			'pinakes.createPinake',
			'pinakes.newFile',
			'pinakes.newFolder',
			'pinakes.searchDocumentation',
			'pinakes.refresh',
		]);
		assert.deepStrictEqual(primaryIcons, ['$(add)', '$(new-file)', '$(new-folder)', '$(search)', '$(refresh)']);
		assertCommandKeybinding(packageJson.contributes.keybindings, 'pinake.openPreview', 'ctrl+alt+p');
		assertCommandKeybinding(packageJson.contributes.keybindings, 'pinake.editDocument', 'ctrl+alt+e');
		assertCommandKeybinding(packageJson.contributes.keybindings, 'pinakes.addFavorite', 'ctrl+alt+s');
		assertCommandKeybinding(packageJson.contributes.keybindings, 'pinakes.removeFavorite', 'ctrl+alt+s');
		assertCommandKeybinding(packageJson.contributes.keybindings, 'pinakes.revealInExplorer', 'ctrl+alt+r');
		assertCommandKeybinding(packageJson.contributes.keybindings, 'pinakes.copyPath', 'ctrl+alt+c');
		assertCommandKeybinding(packageJson.contributes.keybindings, 'pinakes.validate', 'ctrl+alt+v');
		assert.ok(registeredCommands.includes('pinakes.installAgentSkill'));
		assert.ok(registeredCommands.includes('pinakes.export'));
		assert.ok(registeredCommands.includes('pinakes.import'));
		assert.match(skill, /^name: pinake$/m);
		assert.match(skill, /^description: .*mentions Pinake.*create, maintain, validate, search, extend, import, export, repair, or organize project documentation/m);
		assert.ok(!/^license:/m.test(skill));
		assert.match(skill, /Pinake: Create Documentation/);
		assert.match(skill, /Pinake: Validate/);
		assert.match(skill, /## Create A New Pinake/);
		assert.match(skill, /When commands are unavailable/);
		assert.match(skill, /## Generate Modules And Extra Structure/);
		assert.match(skill, /references\/component-modules\.md/);
		assert.match(skill, /Pinake: Repair/);
		assert.match(skill, /Pinake: Import Markdown/);
		assert.match(skill, /Pinake: Export/);
		assert.match(skill, /Pinake: Generate CI Validation Workflow/);
		assert.match(skill, /## Completion Checklist/);
		assert.match(skill, /\.pinake\/docs/);
	});

	test('ships Pinake skill references and helper automation', async () => {
		const rootPath = path.resolve(__dirname, '..', '..');
		const helperPath = path.join(rootPath, 'resources', 'skills', 'pinake', 'scripts', 'pinake-docs-helper.mjs');
		const referencesPath = path.join(rootPath, 'resources', 'skills', 'pinake', 'references');
		const componentModules = await fs.readFile(path.join(referencesPath, 'component-modules.md'), 'utf8');
		const manualContract = await fs.readFile(path.join(referencesPath, 'manual-storage-contract.md'), 'utf8');
		const { stdout: inventoryStdout } = await execFileAsync(process.execPath, [helperPath, 'inventory', '--root', rootPath, '--format', 'json']);
		const { stdout: recommendationStdout } = await execFileAsync(process.execPath, [helperPath, 'recommend', '--root', rootPath, '--format', 'json']);
		const { stdout: syncStdout } = await execFileAsync(process.execPath, [helperPath, 'check-skill-sync', '--root', rootPath, '--format', 'json']);
		const inventory = JSON.parse(inventoryStdout) as { signals: Record<string, boolean>; packageManager?: string };
		const recommendation = JSON.parse(recommendationStdout) as { templateId: string; generatedModules: string[] };
		const sync = JSON.parse(syncStdout) as { ok: boolean; missingModules: string[]; missingPresets: string[] };
		const { root, fileService, scaffoldService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'index.md'),
			[
				'---',
				'title: "Wrong"',
				'type: reference',
				'status: stable',
				'order: 99',
				'---',
				'',
				'# Overview',
				'',
			].join('\n'),
		);
		const { stdout: dryRunStdout } = await execFileAsync(process.execPath, [helperPath, 'normalize-frontmatter', '--root', root.fsPath, '--format', 'json']);
		const dryRun = JSON.parse(dryRunStdout) as { wrote: boolean; changedCount: number; changed: string[] };
		await execFileAsync(process.execPath, [helperPath, 'normalize-frontmatter', '--root', root.fsPath, '--format', 'json', '--write']);
		const normalizedOverview = await fileService.readText(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'index.md'));

		assert.match(componentModules, /Frontend \(React\).*`Docker`/s);
		assert.match(componentModules, /Platform Services.*`Database`.*`Authentication`.*`OAuth`/s);
		assert.match(manualContract, /frontmatter aligned with the manifest/);
		assert.strictEqual(inventory.signals.node, true);
		assert.strictEqual(inventory.signals.typescript, true);
		assert.strictEqual(inventory.packageManager, 'npm');
		assert.ok(['api-service-docs', 'technical-architecture', 'minimal-internal-docs'].includes(recommendation.templateId));
		assert.ok(recommendation.generatedModules.includes('CLI'));
		assert.deepStrictEqual(sync, {
			ok: true,
			missingModules: [],
			missingPresets: [],
		});
		assert.strictEqual(dryRun.wrote, false);
		assert.strictEqual(dryRun.changedCount, 1);
		assert.deepStrictEqual(dryRun.changed, ['.pinake/docs/00_overview/index.md']);
		assert.match(normalizedOverview, /^---\ntitle: "Overview"\ntype: overview\nstatus: draft\norder: 1\n---/);
	});

	test('ships public Pinake specification docs and sample workspace', async () => {
		const rootPath = path.resolve(__dirname, '..', '..');
		const packageJson = JSON.parse(await fs.readFile(path.join(rootPath, 'package.json'), 'utf8')) as {
			files: string[];
		};
		const publicSpec = await fs.readFile(path.join(rootPath, 'docs', 'public-specification.md'), 'utf8');
		const scaffoldReference = await fs.readFile(path.join(rootPath, 'docs', 'scaffold-reference.md'), 'utf8');
		const flows = await fs.readFile(path.join(rootPath, 'docs', 'extension-architecture-and-flows.md'), 'utf8');
		const sampleRoot = path.join(rootPath, 'examples', 'sample-pinake-workspace');
		const sampleManifest = JSON.parse(await fs.readFile(path.join(sampleRoot, '.pinake', 'pinake.json'), 'utf8')) as {
			documents: { path: string }[];
		};

		assert.ok(packageJson.files.includes('docs/**'));
		assert.ok(packageJson.files.includes('examples/**'));
		assert.match(publicSpec, /## Manifest/);
		assert.match(publicSpec, /## State Files/);
		assert.match(scaffoldReference, /## Component Module Matrix/);
		assert.match(scaffoldReference, /## Setup Templates/);
		assert.match(flows, /## UI Flow Diagram/);
		assert.match(flows, /## Command Table/);

		for (const document of sampleManifest.documents) {
			assert.ok(await fileExists(path.join(sampleRoot, '.pinake', 'docs', document.path)), `Missing sample document ${document.path}`);
		}
	});

	test('documents architecture boundaries and keeps pure modules free of VS Code imports', async () => {
		const rootPath = path.resolve(__dirname, '..', '..');
		const boundaryDoc = await fs.readFile(path.join(rootPath, 'docs', 'clean-architecture-boundaries.md'), 'utf8');
		const allowedVscodeImports = new Set([
			'src/commands/PinakesCommands.ts',
			'src/commands/registerCommands.ts',
			'src/extension.ts',
			'src/services/AgentSkillInstaller.ts',
			'src/services/FileService.ts',
			'src/services/IndexService.ts',
			'src/services/ManifestService.ts',
			'src/services/PinakeTransferService.ts',
			'src/services/ScaffoldService.ts',
			'src/services/StateService.ts',
			'src/services/ValidationDiagnosticsService.ts',
			'src/services/ValidationService.ts',
			'src/services/WorkspaceService.ts',
			'src/services/uriUtils.ts',
			'src/tree/PinakeNode.ts',
			'src/tree/PinakeTreeDragAndDropController.ts',
			'src/tree/PinakeTreeProvider.ts',
		]);
		const pureModules = [
			'src/constants.ts',
			'src/modules/moduleDescriptors.ts',
			'src/services/FeedbackFormatter.ts',
			'src/services/JsonSchemaValidator.ts',
			'src/templates/coreTemplates.ts',
			'src/templates/pinakeTemplates.ts',
			'src/types.ts',
		];
		const sourceFiles = await collectSourceFiles(path.join(rootPath, 'src'));
		const vscodeImportPattern = /\bfrom\s+['"]vscode['"]/;
		const disallowedImports: string[] = [];

		assert.match(boundaryDoc, /## Layer Ownership/);
		assert.match(boundaryDoc, /## VS Code API Boundary/);
		assert.match(boundaryDoc, /Domain and definitions/);
		assert.match(boundaryDoc, /Template catalog/);

		for (const filePath of sourceFiles) {
			const relativePath = path.relative(rootPath, filePath).replace(/\\/g, '/');
			if (relativePath.startsWith('src/test/')) {
				continue;
			}

			const source = await fs.readFile(filePath, 'utf8');
			if (vscodeImportPattern.test(source) && !allowedVscodeImports.has(relativePath)) {
				disallowedImports.push(relativePath);
			}
		}
		assert.deepStrictEqual(disallowedImports, []);

		for (const relativePath of pureModules) {
			const source = await fs.readFile(path.join(rootPath, relativePath), 'utf8');
			assert.ok(!vscodeImportPattern.test(source), `${relativePath} must not import vscode.`);
		}
	});

	test('confirms setup summary before writing Pinake files', async () => {
		const fixture = await createFixture();
		const { root, fileService } = fixture;
		const { commands, outputChannel } = createCommandHarness(fixture);
		const summaryPrompts: { message: string; detail?: string }[] = [];

		try {
			await withDefaultSetupQuickPicks(() =>
				withShowInformationMessage('Cancel', summaryPrompts, () => commands.createPinake()));

			assert.ok(!(await fileService.exists(vscode.Uri.joinPath(root, '.pinake'))));
			const summary = summaryPrompts.find((prompt) => prompt.message === 'Create Pinake documentation?');
			assert.ok(summary);
			assert.ok(summary.detail?.includes(`Workspace: ${root.fsPath}`));
			assert.ok(summary.detail?.includes('Template: Minimal Internal Docs'));
			assert.ok(summary.detail?.includes('Explorer: Hide .pinake'));

			await withDefaultSetupQuickPicks(() =>
				withShowInformationMessage('Create Documentation', summaryPrompts, () => commands.createPinake()));

			assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'pinake.json')));
		} finally {
			outputChannel.dispose();
		}
	});

	test('generates CI validation workflow and standalone validator', async () => {
		const { root, fileService, scaffoldService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		const result = await scaffoldService.generateCiValidation(root);
		const workflow = await fileService.readText(vscode.Uri.joinPath(root, '.github', 'workflows', 'pinake-validate.yml'));
		const validatorUri = vscode.Uri.joinPath(root, '.pinake', 'tools', 'validate-pinake.mjs');
		const validator = await fileService.readText(validatorUri);
		const { stdout } = await execFileAsync(process.execPath, [validatorUri.fsPath, '--root', root.fsPath, '--format', 'json']);
		const report = JSON.parse(stdout) as { valid: boolean; issues: { message: string; path?: string; line?: number }[] };

		assert.ok(result.created.includes('.github/workflows/pinake-validate.yml'));
		assert.ok(result.created.includes('.pinake/tools/validate-pinake.mjs'));
		assert.match(workflow, /node \.pinake\/tools\/validate-pinake\.mjs --format github/);
		assert.match(validator, /Usage: node validate-pinake\.mjs/);
		assert.strictEqual(report.valid, true);

		await fileService.writeText(
			vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'index.md'),
			[
				'---',
				'title: "Wrong Overview"',
				'type: overview',
				'status: draft',
				'order: 1',
				'---',
				'',
				'# Overview',
				'github_token = "ghp_1234567890abcdefghijklmnopqrstuvwxyzAB"',
				'',
			].join('\n'),
		);
		const { stdout: warningStdout } = await execFileAsync(process.execPath, [validatorUri.fsPath, '--root', root.fsPath, '--format', 'json']);
		const warningReport = JSON.parse(warningStdout) as { valid: boolean; issues: { message: string; path?: string; line?: number }[] };

		assert.strictEqual(warningReport.valid, true);
		assert.ok(warningReport.issues.some((issue) =>
			issue.path === '.pinake/docs/00_overview/index.md'
			&& issue.message.includes('frontmatter title should match pinake.json'),
		));
		assert.ok(warningReport.issues.some((issue) =>
			issue.path === '.pinake/docs/00_overview/index.md'
			&& issue.line === 9
			&& issue.message.includes('GitHub token'),
		));
	});

	test('exports Pinake bundles and imports Markdown folders into the manifest', async () => {
		const { root, fileService, indexService, manifestService, scaffoldService, transferService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		const exportParentPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pinakes-export-'));
		tempRoots.push(exportParentPath);
		const exportResult = await transferService.exportWorkspace(root, vscode.Uri.file(exportParentPath));
		const exportRoot = vscode.Uri.file(exportResult.targetPath);
		const exportedManifest = await fileService.readJson<{ storage: { root: string } }>(vscode.Uri.joinPath(exportRoot, 'pinake.json'));
		const exportedIndex = await fileService.readText(vscode.Uri.joinPath(exportRoot, 'index.html'));

		assert.ok(exportResult.created.some((entry) => entry.endsWith('/pinake.json')));
		assert.strictEqual(exportedManifest?.storage.root, 'docs');
		assert.ok(await fileService.exists(vscode.Uri.joinPath(exportRoot, 'docs', '00_overview', 'index.md')));
		assert.match(exportedIndex, /SampleApp Pinake Export/);
		assert.match(exportedIndex, /docs\/00_overview\/index.md/);

		const sourcePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pinakes-import-'));
		tempRoots.push(sourcePath);
		await fs.mkdir(path.join(sourcePath, 'nested'), { recursive: true });
		await fs.writeFile(path.join(sourcePath, 'Guide.md'), '# Imported Guide\n\nUseful imported notes.\n');
		await fs.writeFile(path.join(sourcePath, 'nested', 'Runbook.md'), '# Imported Runbook\n\nOperational steps.\n');
		await fs.writeFile(path.join(sourcePath, 'ignore.txt'), 'Not Markdown.\n');

		const importResult = await transferService.importMarkdownDirectory(root, vscode.Uri.file(sourcePath));
		const manifest = await manifestService.readManifest(root);
		const index = await indexService.read(root);
		const importedGuide = await fileService.readText(vscode.Uri.joinPath(root, '.pinake', 'docs', 'imported', 'Guide.md'));

		assert.strictEqual(importResult.sourceCount, 2);
		assert.strictEqual(importResult.importedCount, 2);
		assert.ok(importResult.created.includes('.pinake/docs/imported/Guide.md'));
		assert.ok(importResult.created.includes('.pinake/docs/imported/nested/Runbook.md'));
		assert.ok(importResult.updated.includes('.pinake/pinake.json'));
		assert.ok(manifest?.documents.some((document) =>
			document.path === 'imported/Guide.md'
			&& document.title === 'Imported Guide'
			&& document.type === 'reference',
		));
		assert.ok(manifest?.documents.some((document) =>
			document.path === 'imported/nested/Runbook.md'
			&& document.title === 'Imported Runbook'
			&& document.type === 'runbook',
		));
		assert.match(importedGuide, /^---\ntitle: "Imported Guide"\ntype: reference\nstatus: draft\norder: \d+\n---\n\n# Imported Guide/m);
		assert.ok(index?.documents.some((document) => document.path === 'imported/Guide.md'));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', 'imported', 'nested', 'Runbook.md')));
	});

	test('rejects export destinations inside Pinake docs to avoid recursive self-copy', async () => {
		const { root, fileService, scaffoldService, transferService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		const docsDirectory = vscode.Uri.joinPath(root, '.pinake', 'docs');
		await assert.rejects(
			() => transferService.exportWorkspace(root, docsDirectory),
			/outside \.pinake\/docs/,
		);
		assert.ok(!(await fileService.exists(vscode.Uri.joinPath(docsDirectory, 'pinake-export-sampleapp'))));
	});

	test('exports Pinake bundles through the command folder picker', async () => {
		const fixture = await createFixture();
		const { fileService, scaffoldService } = fixture;
		await scaffoldService.initializePinake(fixture.root, 'SampleApp');

		const exportParentPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pinakes-command-export-'));
		tempRoots.push(exportParentPath);
		const messages: { message: string; detail?: string }[] = [];
		const { commands, outputChannel } = createCommandHarness(fixture);

		try {
			await withShowOpenDialog([vscode.Uri.file(exportParentPath)], () =>
				withShowInformationMessage(undefined, messages, () => commands.exportPinake()));

			const exportRoot = vscode.Uri.joinPath(vscode.Uri.file(exportParentPath), 'pinake-export-sampleapp');
			const exportedManifest = await fileService.readJson<{ storage: { root: string } }>(
				vscode.Uri.joinPath(exportRoot, 'pinake.json'),
			);

			assert.strictEqual(exportedManifest?.storage.root, 'docs');
			assert.ok(await fileService.exists(vscode.Uri.joinPath(exportRoot, 'docs', '00_overview', 'index.md')));
			assert.ok(await fileService.exists(vscode.Uri.joinPath(exportRoot, 'index.html')));
			assert.ok(messages.some((prompt) => prompt.message.startsWith('Pinake exported:')));
		} finally {
			outputChannel.dispose();
		}
	});

	test('imports Markdown through the command confirmation flow', async () => {
		const fixture = await createFixture();
		const { fileService, manifestService, scaffoldService } = fixture;
		await scaffoldService.initializePinake(fixture.root, 'SampleApp');

		const sourcePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pinakes-command-import-'));
		tempRoots.push(sourcePath);
		await fs.writeFile(path.join(sourcePath, 'CommandGuide.md'), '# Command Import Guide\n\nImported through the command handler.\n');
		const messages: { message: string; detail?: string }[] = [];
		const { commands, treeProvider, outputChannel } = createCommandHarness(fixture);

		try {
			await withShowOpenDialog([vscode.Uri.file(sourcePath)], () =>
				withShowInformationMessage('Import Documents', messages, () => commands.importDocumentation()));

			const manifest = await manifestService.readManifest(fixture.root);
			assert.ok(await fileService.exists(vscode.Uri.joinPath(fixture.root, '.pinake', 'docs', 'imported', 'CommandGuide.md')));
			assert.ok(manifest?.documents.some((document) =>
				document.path === 'imported/CommandGuide.md'
				&& document.title === 'Command Import Guide',
			));
			assert.ok(await treeProvider.getNodeByRelativePath('imported/CommandGuide.md'));
			assert.ok(messages.some((prompt) =>
				prompt.message === 'Import Markdown documents into Pinake?'
				&& prompt.detail?.includes('Target: .pinake/docs/imported'),
			));
			assert.ok(messages.some((prompt) => prompt.message.startsWith('Pinake import complete:')));
		} finally {
			outputChannel.dispose();
		}
	});

	test('does not import Markdown when the command confirmation is cancelled', async () => {
		const fixture = await createFixture();
		const { fileService, manifestService, scaffoldService } = fixture;
		await scaffoldService.initializePinake(fixture.root, 'SampleApp');

		const sourcePath = await fs.mkdtemp(path.join(os.tmpdir(), 'pinakes-command-import-cancel-'));
		tempRoots.push(sourcePath);
		await fs.writeFile(path.join(sourcePath, 'Cancelled.md'), '# Cancelled Import\n\nThis should not be copied.\n');
		const messages: { message: string; detail?: string }[] = [];
		const { commands, outputChannel } = createCommandHarness(fixture);

		try {
			await withShowOpenDialog([vscode.Uri.file(sourcePath)], () =>
				withShowInformationMessage('Cancel', messages, () => commands.importDocumentation()));

			const manifest = await manifestService.readManifest(fixture.root);
			assert.ok(!(await fileService.exists(vscode.Uri.joinPath(fixture.root, '.pinake', 'docs', 'imported', 'Cancelled.md'))));
			assert.ok(!manifest?.documents.some((document) => document.path === 'imported/Cancelled.md'));
			assert.ok(messages.some((prompt) => prompt.message === 'Import Markdown documents into Pinake?'));
			assert.ok(!messages.some((prompt) => prompt.message.startsWith('Pinake import complete:')));
		} finally {
			outputChannel.dispose();
		}
	});

	test('shows a no-results message for unmatched search command queries', async () => {
		const fixture = await createFixture();
		const { scaffoldService } = fixture;
		await scaffoldService.initializePinake(fixture.root, 'SampleApp');

		const messages: { message: string; detail?: string }[] = [];
		const { commands, outputChannel } = createCommandHarness(fixture);

		try {
			await withShowInputBox('tag:__pinakes_absent_tag__', () =>
				withShowInformationMessage(undefined, messages, () => commands.searchDocumentation()));

			assert.ok(messages.some((prompt) =>
				prompt.message === formatNoSearchResultsMessage('tag:__pinakes_absent_tag__')));
		} finally {
			outputChannel.dispose();
		}
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

	test('shows filesystem folders alongside manifest-backed tree children', async () => {
		const { root, fileService, scaffoldService, stateService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.ensureDirectory(vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'Scratch'));
		await fileService.ensureDirectory(vscode.Uri.joinPath(root, '.pinake', 'docs', '10_empty'));
		await fileService.writeText(vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'loose.md'), '# Loose\n');

		const provider = new PinakeTreeProvider(root, fileService, stateService);
		const rootChildren = await provider.getChildren();
		const development = await provider.getNodeByRelativePath('02_development');
		if (!development) {
			assert.fail('Expected development directory in tree.');
		}
		const developmentChildren = await provider.getChildren(development);

		assert.ok(rootChildren.some((node) => node.kind === 'directory' && node.relativePath === '10_empty'));
		assert.ok(developmentChildren.some((node) => node.kind === 'directory' && node.relativePath === '02_development/Scratch'));
		assert.ok(!developmentChildren.some((node) => node.relativePath === '02_development/loose.md'));
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

	test('keeps tree metadata usable with long paths, long titles, and many favorites', async () => {
		const countingFileService = new CountingFileService();
		const { root, fileService, manifestService, scaffoldService, stateService } = await createFixture(countingFileService);
		await scaffoldService.initializePinake(root, 'SampleApp');

		const longPath = '02_development/platform/domain/billing/subscriptions/reconciliation/quarterly-close-runbook.md';
		const longTitle = 'Quarterly Close Subscription Reconciliation Runbook With Regional Exceptions And Escalation Notes';
		const generatedDocuments: PinakeDocumentDefinition[] = [
			createTestDocument('stress-long-runbook', longTitle, longPath, 'runbook'),
		];
		for (let index = 1; index <= 24; index += 1) {
			const suffix = index.toString().padStart(2, '0');
			generatedDocuments.push(createTestDocument(
				`stress-favorite-${suffix}`,
				`Favorite Stress Document ${suffix}`,
				`02_development/stress/favorites/favorite-${suffix}.md`,
				'reference',
			));
		}

		for (const document of generatedDocuments) {
			await fileService.ensureDirectory(vscode.Uri.joinPath(root, '.pinake', 'docs', ...path.posix.dirname(document.path).split('/')));
			await fileService.writeText(vscode.Uri.joinPath(root, '.pinake', 'docs', ...document.path.split('/')), `# ${document.title}\n`);
		}

		const manifest = await manifestService.readManifest(root);
		if (!manifest) {
			assert.fail('Expected Pinake manifest.');
		}
		manifestService.addDocuments(manifest, generatedDocuments);
		await manifestService.writeManifest(root, manifest);
		for (const document of generatedDocuments) {
			await stateService.addFavorite(root, document.path);
		}

		const provider = new PinakeTreeProvider(root, fileService, stateService);
		const longNode = await provider.getNodeByRelativePath(longPath);
		if (!longNode) {
			assert.fail('Expected long-path document node.');
		}
		const longItem = provider.getTreeItem(longNode);

		assert.strictEqual(longNode.label, longTitle);
		assert.strictEqual(longItem.contextValue, 'pinakeDocument');
		assert.strictEqual(longItem.description, 'Runbook - Draft');
		assert.ok(String(longItem.tooltip).includes(longTitle));
		assert.ok(String(longItem.tooltip).includes(longPath));
		assert.strictEqual(longItem.command?.command, 'pinake.openPreview');
		assert.strictEqual((await provider.getParent(longNode))?.relativePath, path.posix.dirname(longPath));

		countingFileService.resetCounts();
		const rootChildren = await provider.getChildren();
		const favorites = rootChildren[0];
		assert.strictEqual(favorites?.label, 'Favorites');
		assert.strictEqual(countingFileService.pinakeManifestReads, 1);
		if (!favorites) {
			assert.fail('Expected favorites group.');
		}

		countingFileService.resetCounts();
		const favoriteChildren = await provider.getChildren(favorites);
		const favoriteLabels = favoriteChildren.map((node) => node.label);
		assert.strictEqual(countingFileService.pinakeManifestReads, 1);
		assert.strictEqual(favoriteChildren.length, generatedDocuments.length);
		assert.deepStrictEqual(favoriteLabels, [...favoriteLabels].sort((left, right) =>
			left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })));

		const favoriteItem = provider.getTreeItem(favoriteChildren[0]);
		assert.strictEqual(favoriteItem.contextValue, 'favoritePinakeDocument');
		assert.strictEqual(favoriteItem.command?.command, 'pinake.openPreview');
		assert.ok(typeof favoriteItem.description === 'string' && favoriteItem.description.endsWith('.md'));
	});

	test('renames Pinake documents and preserves related manifest, index, and UI state', async () => {
		const fixture = await createFixture();
		const { root, fileService, indexService, manifestService, scaffoldService, stateService } = fixture;
		await scaffoldService.initializePinake(root, 'SampleApp');
		await indexService.rebuild(root);
		await stateService.addFavorite(root, '00_overview/index.md');
		await stateService.recordLastOpened(root, '00_overview/index.md');

		const { commands, treeProvider, outputChannel } = createCommandHarness(fixture);
		try {
			const node = await treeProvider.getNodeByRelativePath('00_overview/index.md');
			if (!node) {
				assert.fail('Expected overview file node.');
			}

			await withShowInputBox('renamed-overview', () => commands.rename(node));

			const manifest = await manifestService.readManifest(root);
			const state = await stateService.readUiState(root);
			const index = await indexService.read(root);

			assert.ok(!(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'index.md'))));
			assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'renamed-overview.md')));
			assert.ok(manifest?.documents.some((document) =>
				document.path === '00_overview/renamed-overview.md'
				&& document.title === 'renamed-overview',
			));
			assert.ok(!manifest?.documents.some((document) => document.path === '00_overview/index.md'));
			assert.deepStrictEqual(state.favorites, ['00_overview/renamed-overview.md']);
			assert.strictEqual(state.lastOpened, '00_overview/renamed-overview.md');
			assert.ok(index?.documents.some((document) => document.path === '00_overview/renamed-overview.md'));
			assert.ok(!index?.documents.some((document) => document.path === '00_overview/index.md'));
		} finally {
			outputChannel.dispose();
		}
	});

	test('moves Pinake documents with tree drag and drop and refreshes metadata', async () => {
		const fixture = await createFixture();
		const { root, fileService, indexService, manifestService, scaffoldService, stateService, validationService } = fixture;
		await scaffoldService.initializePinake(root, 'SampleApp');
		const sourceRelativePath = '02_development/drag-source.md';
		const targetRelativePath = '00_overview/drag-source.md';
		const sourceUri = vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'drag-source.md');
		await fileService.writeText(sourceUri, '# Drag Source\n\nStandalone document for drag and drop.\n');
		const manifest = await manifestService.readManifest(root);
		if (!manifest) {
			assert.fail('Expected Pinake manifest.');
		}
		manifestService.addDocuments(manifest, [createTestDocument('drag-source', 'Drag Source', sourceRelativePath, 'reference')]);
		await manifestService.writeManifest(root, manifest);
		await indexService.rebuild(root);
		await stateService.addFavorite(root, sourceRelativePath);
		await stateService.recordLastOpened(root, sourceRelativePath);

		const treeProvider = new PinakeTreeProvider(root, fileService, stateService);
		const dragAndDrop = new PinakeTreeDragAndDropController(
			fileService,
			manifestService,
			stateService,
			indexService,
			validationService,
			treeProvider,
		);
		const source = await treeProvider.getNodeByRelativePath(sourceRelativePath);
		const target = await treeProvider.getNodeByRelativePath('00_overview');
		if (!source || !target) {
			assert.fail('Expected source document and target folder nodes.');
		}
		const dataTransfer = new vscode.DataTransfer();
		const tokenSource = new vscode.CancellationTokenSource();
		const messages: { message: string; detail?: string }[] = [];

		await withShowInformationMessage(undefined, messages, async () => {
			dragAndDrop.handleDrag([source], dataTransfer, tokenSource.token);
			await dragAndDrop.handleDrop(target, dataTransfer, tokenSource.token);
		});
		tokenSource.dispose();

		const nextManifest = await manifestService.readManifest(root);
		const state = await stateService.readUiState(root);
		const index = await indexService.read(root);

		assert.ok(!(await fileService.exists(sourceUri)));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'drag-source.md')));
		assert.ok(nextManifest?.documents.some((document) => document.path === targetRelativePath && document.title === 'Drag Source'));
		assert.ok(!nextManifest?.documents.some((document) => document.path === sourceRelativePath));
		assert.deepStrictEqual(state.favorites, [targetRelativePath]);
		assert.strictEqual(state.lastOpened, targetRelativePath);
		assert.ok(index?.documents.some((document) => document.path === targetRelativePath));
		assert.ok(!index?.documents.some((document) => document.path === sourceRelativePath));
		assert.ok(messages.some((prompt) => prompt.message === 'Moved 1 Pinake item.'));
	});

	test('moves Pinake directories with tree drag and drop and rewrites descendants', async () => {
		const fixture = await createFixture();
		const { root, fileService, indexService, manifestService, scaffoldService, stateService, validationService } = fixture;
		await scaffoldService.initializePinake(root, 'SampleApp');
		const sourceRelativePath = '02_development/DragFolder';
		const oldDocumentPath = `${sourceRelativePath}/Guide.md`;
		const newDocumentPath = '00_overview/DragFolder/Guide.md';
		const sourceDirectory = vscode.Uri.joinPath(root, '.pinake', 'docs', '02_development', 'DragFolder');
		await fileService.ensureDirectory(sourceDirectory);
		await fileService.writeText(vscode.Uri.joinPath(sourceDirectory, 'Guide.md'), '# Drag Folder Guide\n\nNested drag content.\n');
		const manifest = await manifestService.readManifest(root);
		if (!manifest) {
			assert.fail('Expected Pinake manifest.');
		}
		manifestService.addDocuments(manifest, [createTestDocument('drag-folder-guide', 'Drag Folder Guide', oldDocumentPath, 'reference')]);
		await manifestService.writeManifest(root, manifest);
		await indexService.rebuild(root);
		await stateService.recordExpanded(root, sourceRelativePath);
		await stateService.addFavorite(root, oldDocumentPath);
		await stateService.recordLastOpened(root, oldDocumentPath);

		const treeProvider = new PinakeTreeProvider(root, fileService, stateService);
		const dragAndDrop = new PinakeTreeDragAndDropController(
			fileService,
			manifestService,
			stateService,
			indexService,
			validationService,
			treeProvider,
		);
		const source = await treeProvider.getNodeByRelativePath(sourceRelativePath);
		const target = await treeProvider.getNodeByRelativePath('00_overview');
		if (!source || !target) {
			assert.fail('Expected source directory and target folder nodes.');
		}
		const dataTransfer = new vscode.DataTransfer();
		const tokenSource = new vscode.CancellationTokenSource();

		dragAndDrop.handleDrag([source], dataTransfer, tokenSource.token);
		await dragAndDrop.handleDrop(target, dataTransfer, tokenSource.token);
		tokenSource.dispose();

		const nextManifest = await manifestService.readManifest(root);
		const state = await stateService.readUiState(root);
		const index = await indexService.read(root);

		assert.ok(!(await fileService.exists(sourceDirectory)));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'DragFolder', 'Guide.md')));
		assert.ok(nextManifest?.documents.some((document) => document.path === newDocumentPath));
		assert.ok(!nextManifest?.documents.some((document) => document.path === oldDocumentPath));
		assert.deepStrictEqual(state.expanded, ['00_overview/DragFolder']);
		assert.deepStrictEqual(state.favorites, [newDocumentPath]);
		assert.strictEqual(state.lastOpened, newDocumentPath);
		assert.ok(index?.documents.some((document) => document.path === newDocumentPath));
		assert.ok(!index?.documents.some((document) => document.path === oldDocumentPath));
	});

	test('rejects drag and drop moves that would place a folder inside itself', async () => {
		const fixture = await createFixture();
		const { root, fileService, indexService, manifestService, scaffoldService, stateService, validationService } = fixture;
		await scaffoldService.initializePinake(root, 'SampleApp');

		const treeProvider = new PinakeTreeProvider(root, fileService, stateService);
		const dragAndDrop = new PinakeTreeDragAndDropController(
			fileService,
			manifestService,
			stateService,
			indexService,
			validationService,
			treeProvider,
		);
		const source = await treeProvider.getNodeByRelativePath('00_overview');
		const target = await treeProvider.getNodeByRelativePath('00_overview/index.md');
		if (!source || !target) {
			assert.fail('Expected overview folder and child document nodes.');
		}
		const dataTransfer = new vscode.DataTransfer();
		const tokenSource = new vscode.CancellationTokenSource();
		const warnings: string[] = [];

		await withShowWarningMessage(undefined, warnings, async () => {
			dragAndDrop.handleDrag([source], dataTransfer, tokenSource.token);
			await dragAndDrop.handleDrop(target, dataTransfer, tokenSource.token);
		});
		tokenSource.dispose();

		const manifest = await manifestService.readManifest(root);
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'index.md')));
		assert.ok(!(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', '00_overview'))));
		assert.ok(manifest?.documents.some((document) => document.path === '00_overview/index.md'));
		assert.ok(warnings.some((message) => message === 'Cannot move a Pinake folder into itself.'));
	});

	test('duplicates Pinake directories into manifest-backed tree documents', async () => {
		const fixture = await createFixture();
		const { root, fileService, indexService, manifestService, scaffoldService } = fixture;
		await scaffoldService.initializePinake(root, 'SampleApp');
		await indexService.rebuild(root);

		const { commands, treeProvider, outputChannel } = createCommandHarness(fixture);
		try {
			const node = await treeProvider.getNodeByRelativePath('00_overview');
			if (!node) {
				assert.fail('Expected overview directory node.');
			}

			await commands.duplicate(node);

			const manifest = await manifestService.readManifest(root);
			const index = await indexService.read(root);
			const copiedDirectory = await treeProvider.getNodeByRelativePath('00_overview copy');
			const copiedFile = await treeProvider.getNodeByRelativePath('00_overview copy/index.md');

			assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview copy', 'index.md')));
			assert.ok(manifest?.documents.some((document) => document.path === '00_overview copy/index.md'));
			assert.ok(index?.documents.some((document) => document.path === '00_overview copy/index.md'));
			assert.strictEqual(copiedDirectory?.kind, 'directory');
			assert.strictEqual(copiedFile?.kind, 'file');
		} finally {
			outputChannel.dispose();
		}
	});

	test('rejects unsafe Pinake rename input before moving files', async () => {
		const fixture = await createFixture();
		const { root, fileService, manifestService, scaffoldService } = fixture;
		await scaffoldService.initializePinake(root, 'SampleApp');

		const warnings: string[] = [];
		const { commands, treeProvider, outputChannel } = createCommandHarness(fixture);
		try {
			const node = await treeProvider.getNodeByRelativePath('00_overview/index.md');
			if (!node) {
				assert.fail('Expected overview file node.');
			}

			await withShowWarningMessage(undefined, warnings, () =>
				withShowInputBox('../Escape.md', () => commands.rename(node)));

			const manifest = await manifestService.readManifest(root);
			assert.ok(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview', 'index.md')));
			assert.ok(!(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'Escape.md'))));
			assert.ok(manifest?.documents.some((document) => document.path === '00_overview/index.md'));
			assert.ok(warnings.some((message) => message.includes('Use a file name only')));
		} finally {
			outputChannel.dispose();
		}
	});

	test('deletes Pinake directories and clears stale manifest, index, and UI state paths', async () => {
		const fixture = await createFixture();
		const { root, fileService, indexService, manifestService, scaffoldService, stateService } = fixture;
		await scaffoldService.initializePinake(root, 'SampleApp');
		await indexService.rebuild(root);
		await stateService.recordExpanded(root, '00_overview');
		await stateService.recordCollapsed(root, '00_overview/nested');
		await stateService.addFavorite(root, '00_overview/index.md');
		await stateService.recordLastOpened(root, '00_overview/index.md');

		const warnings: string[] = [];
		const { commands, treeProvider, outputChannel } = createCommandHarness(fixture);
		try {
			const node = await treeProvider.getNodeByRelativePath('00_overview');
			if (!node) {
				assert.fail('Expected overview directory node.');
			}

			await withShowWarningMessage('Delete', warnings, () => commands.delete(node));

			const manifest = await manifestService.readManifest(root);
			const state = await stateService.readUiState(root);
			const index = await indexService.read(root);

			assert.ok(!(await fileService.exists(vscode.Uri.joinPath(root, '.pinake', 'docs', '00_overview'))));
			assert.ok(!manifest?.documents.some((document) => document.path.startsWith('00_overview/')));
			assert.deepStrictEqual(state.expanded, []);
			assert.deepStrictEqual(state.collapsed, []);
			assert.deepStrictEqual(state.favorites, []);
			assert.strictEqual(state.lastOpened, undefined);
			assert.ok(!index?.documents.some((document) => document.path.startsWith('00_overview/')));
			assert.ok(warnings.some((message) => message === 'Delete 00_overview?'));
		} finally {
			outputChannel.dispose();
		}
	});

	async function createFixture(fileService: FileService = new FileService()): Promise<Fixture> {
		const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pinakes-test-'));
		tempRoots.push(rootPath);
		const root = vscode.Uri.file(rootPath);
		const manifestService = new ManifestService(fileService);
		const stateService = new StateService(fileService);
		const indexService = new IndexService(fileService);
		const scaffoldService = new ScaffoldService(fileService, manifestService, stateService, indexService);
		const transferService = new PinakeTransferService(fileService, manifestService, indexService);
		const validationService = new ValidationService(fileService, manifestService);

		return {
			root,
			fileService,
			indexService,
			manifestService,
			scaffoldService,
			transferService,
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

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function collectSourceFiles(directory: string): Promise<string[]> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const filePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...await collectSourceFiles(filePath));
			continue;
		}

		if (entry.isFile() && entry.name.endsWith('.ts')) {
			files.push(filePath);
		}
	}

	return files;
}

function createCommandHarness(fixture: Fixture, validationDiagnosticsService?: ValidationDiagnosticsService): CommandHarness {
	const treeProvider = new PinakeTreeProvider(fixture.root, fixture.fileService, fixture.stateService);
	const outputChannel = vscode.window.createOutputChannel('Pinakes Test');
	const commands = new PinakesCommands(
		new TestWorkspaceService(fixture.root),
		fixture.fileService,
		fixture.manifestService,
		fixture.scaffoldService,
		fixture.validationService,
		fixture.indexService,
		fixture.transferService,
		fixture.stateService,
		treeProvider,
		outputChannel,
		new AgentSkillInstaller(fixture.fileService, fixture.root),
		validationDiagnosticsService,
	);

	return {
		commands,
		treeProvider,
		outputChannel,
	};
}

function assertCommandKeybinding(
	keybindings: { command: string; key: string; mac?: string; when?: string }[],
	command: string,
	key: string,
): void {
	const keybinding = keybindings.find((item) => item.command === command);
	assert.ok(keybinding, `Expected keybinding for ${command}.`);
	assert.strictEqual(keybinding.key, key);
	assert.match(keybinding.when ?? '', /view == pinakesView/);
}

async function withDefaultSetupQuickPicks<T>(callback: () => Promise<T>): Promise<T> {
	return withShowQuickPick((items, options) => {
		if (options?.canPickMany) {
			return items.filter((item) => isPickedQuickPickItem(item));
		}

		return items[0];
	}, callback);
}

async function withShowQuickPick<T>(
	resolver: (items: readonly unknown[], options?: vscode.QuickPickOptions) => unknown,
	callback: () => Promise<T>,
): Promise<T> {
	const window = vscode.window as unknown as { showQuickPick: typeof vscode.window.showQuickPick };
	const original = window.showQuickPick;
	window.showQuickPick = (async (items: readonly unknown[], options?: vscode.QuickPickOptions) =>
		resolver(items, options)) as typeof vscode.window.showQuickPick;
	try {
		return await callback();
	} finally {
		window.showQuickPick = original;
	}
}

async function withShowOpenDialog<T>(value: vscode.Uri[] | undefined, callback: () => Promise<T>): Promise<T> {
	const window = vscode.window as unknown as { showOpenDialog: typeof vscode.window.showOpenDialog };
	const original = window.showOpenDialog;
	window.showOpenDialog = (async () => value) as typeof vscode.window.showOpenDialog;
	try {
		return await callback();
	} finally {
		window.showOpenDialog = original;
	}
}

async function withShowInformationMessage<T>(
	response: string | undefined,
	messages: { message: string; detail?: string }[],
	callback: () => Promise<T>,
): Promise<T> {
	const window = vscode.window as unknown as { showInformationMessage: typeof vscode.window.showInformationMessage };
	const original = window.showInformationMessage;
	window.showInformationMessage = (async (message: string, ...items: unknown[]) => {
		const options = items.find((item): item is vscode.MessageOptions =>
			typeof item === 'object' && item !== null && ('modal' in item || 'detail' in item));
		messages.push({ message, detail: options?.detail });
		return response;
	}) as typeof vscode.window.showInformationMessage;
	try {
		return await callback();
	} finally {
		window.showInformationMessage = original;
	}
}

async function withShowInputBox<T>(value: string | undefined, callback: () => Promise<T>): Promise<T> {
	const window = vscode.window as unknown as { showInputBox: typeof vscode.window.showInputBox };
	const original = window.showInputBox;
	window.showInputBox = (async () => value) as typeof vscode.window.showInputBox;
	try {
		return await callback();
	} finally {
		window.showInputBox = original;
	}
}

async function withShowWarningMessage<T>(response: string | undefined, messages: string[], callback: () => Promise<T>): Promise<T> {
	const window = vscode.window as unknown as { showWarningMessage: typeof vscode.window.showWarningMessage };
	const original = window.showWarningMessage;
	window.showWarningMessage = (async (message: string) => {
		messages.push(message);
		return response;
	}) as typeof vscode.window.showWarningMessage;
	try {
		return await callback();
	} finally {
		window.showWarningMessage = original;
	}
}

function isPickedQuickPickItem(item: unknown): boolean {
	return typeof item === 'object' && item !== null && 'picked' in item && Boolean((item as { picked?: boolean }).picked);
}

class TestWorkspaceService extends WorkspaceService {
	public constructor(private readonly root: vscode.Uri) {
		super();
	}

	public override getWorkspaceRoot(): vscode.Uri {
		return this.root;
	}

	public override async pickWorkspaceRoot(): Promise<vscode.Uri> {
		return this.root;
	}

	public override requireWorkspaceRoot(): vscode.Uri {
		return this.root;
	}
}

class CountingFileService extends FileService {
	public pinakeManifestReads = 0;

	public resetCounts(): void {
		this.pinakeManifestReads = 0;
	}

	public override async readJson<T>(uri: vscode.Uri): Promise<T | undefined> {
		if (uri.path.endsWith('/.pinake/pinake.json')) {
			this.pinakeManifestReads += 1;
		}

		return super.readJson<T>(uri);
	}
}

interface Fixture {
	root: vscode.Uri;
	fileService: FileService;
	indexService: IndexService;
	manifestService: ManifestService;
	scaffoldService: ScaffoldService;
	transferService: PinakeTransferService;
	stateService: StateService;
	validationService: ValidationService;
}

interface CommandHarness {
	commands: PinakesCommands;
	treeProvider: PinakeTreeProvider;
	outputChannel: vscode.OutputChannel;
}
