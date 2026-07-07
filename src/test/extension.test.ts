import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { getModuleDescriptor } from '../modules/moduleDescriptors';
import { FileService } from '../services/FileService';
import { IndexService } from '../services/IndexService';
import { ManifestService } from '../services/ManifestService';
import { ScaffoldService } from '../services/ScaffoldService';
import { StateService } from '../services/StateService';
import { ValidationService } from '../services/ValidationService';
import { PinakeTreeProvider } from '../tree/PinakeTreeProvider';

suite('Pinakes v0.1', () => {
	const tempRoots: string[] = [];

	teardown(async () => {
		await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
	});

	test('creates the core Pinake scaffold and internal state', async () => {
		const { root, fileService, manifestService, scaffoldService } = await createFixture();

		const result = await scaffoldService.initializePinake(root, 'SampleApp');
		const manifest = await manifestService.readManifest(root);
		const gitignore = await fileService.readText(vscode.Uri.joinPath(root, 'Pinake', '.gitignore'));

		assert.ok(result.created.includes('Pinake/pinake.json'));
		assert.ok(result.created.includes('Pinake/00_Overview/Overview.md'));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, 'Pinake', '06_Decisions', 'ADR-0001-ExampleDecision.md')));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, 'Pinake', '.pinake', 'modules.json')));
		assert.ok(!(await fileService.exists(vscode.Uri.joinPath(root, 'pinake.json'))));
		assert.ok(!(await fileService.exists(vscode.Uri.joinPath(root, '.pinake'))));
		assert.strictEqual(manifest?.name, 'SampleApp');
		assert.match(gitignore, /^\.pinake\/$/m);
	});

	test('generates modules without overwriting edited documents', async () => {
		const { root, fileService, manifestService, scaffoldService } = await createFixture();
		const api = getModuleDescriptor('API');
		assert.ok(api);

		await scaffoldService.initializePinake(root, 'SampleApp');
		await scaffoldService.generateModules(root, [api]);

		const overviewUri = vscode.Uri.joinPath(root, 'Pinake', '03_Development', 'API', 'Overview.md');
		await fileService.writeText(overviewUri, '# Custom API Overview\n');
		await scaffoldService.generateModules(root, [api]);

		const manifest = await manifestService.readManifest(root);
		assert.strictEqual(await fileService.readText(overviewUri), '# Custom API Overview\n');
		assert.ok(manifest?.modules.some((moduleEntry) => moduleEntry.id === 'API' && moduleEntry.enabled));
		assert.ok(await fileService.exists(vscode.Uri.joinPath(root, 'Pinake', '.pinake', 'indexes.json')));
	});

	test('persists expanded and collapsed tree state in Pinake ui state', async () => {
		const { root, scaffoldService, stateService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		await stateService.recordExpanded(root, '00_Overview');
		await stateService.recordExpanded(root, '03_Development/API');
		await stateService.recordCollapsed(root, '00_Overview');
		await stateService.recordLastOpened(root, '03_Development/API/Overview.md');

		const state = await stateService.readUiState(root);
		assert.deepStrictEqual(state.expanded, ['03_Development/API']);
		assert.deepStrictEqual(state.collapsed, ['00_Overview']);
		assert.strictEqual(state.lastOpened, '03_Development/API/Overview.md');
	});

	test('searches the local Pinake index', async () => {
		const { root, fileService, indexService, scaffoldService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.writeText(
			vscode.Uri.joinPath(root, 'Pinake', '03_Development', 'Searchable.md'),
			'# Payments Gateway\n\nStripe checkout and invoice webhook handling.\n',
		);

		await indexService.rebuild(root);
		const results = await indexService.search(root, 'stripe invoice');

		assert.strictEqual(results[0]?.path, '03_Development/Searchable.md');
		assert.ok(results[0]?.matchedTerms.includes('stripe'));
	});

	test('repairs missing generated core and module files without overwriting existing docs', async () => {
		const { root, fileService, scaffoldService } = await createFixture();
		const api = getModuleDescriptor('API');
		assert.ok(api);

		await scaffoldService.initializePinake(root, 'SampleApp');
		await scaffoldService.generateModules(root, [api]);

		const overviewUri = vscode.Uri.joinPath(root, 'Pinake', '00_Overview', 'Overview.md');
		const endpointUri = vscode.Uri.joinPath(root, 'Pinake', '03_Development', 'API', 'Endpoints.md');
		const authUri = vscode.Uri.joinPath(root, 'Pinake', '03_Development', 'API', 'Authentication.md');
		await fileService.writeText(authUri, '# Custom Auth\n');
		await fs.rm(overviewUri.fsPath);
		await fs.rm(endpointUri.fsPath);

		const result = await scaffoldService.repairPinake(root, 'SampleApp');

		assert.ok(result.created.includes('Pinake/00_Overview/Overview.md'));
		assert.ok(result.created.includes('Pinake/03_Development/API/Endpoints.md'));
		assert.strictEqual(await fileService.readText(authUri), '# Custom Auth\n');
	});

	test('reports bad ADR names and broken Markdown links', async () => {
		const { root, fileService, scaffoldService, validationService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');
		await fileService.writeText(vscode.Uri.joinPath(root, 'Pinake', '06_Decisions', 'BadDecision.md'), '# Bad Decision\n');
		await fileService.writeText(vscode.Uri.joinPath(root, 'Pinake', '00_Overview', 'Broken.md'), '[Missing](../Missing.md)\n');

		const result = await validationService.validate(root);

		assert.ok(result.valid);
		assert.ok(result.issues.some((issue) => issue.message.includes('ADR file should match')));
		assert.ok(result.issues.some((issue) => issue.message.includes('Broken Markdown link')));
	});

	test('validates manifest shape', async () => {
		const { manifestService } = await createFixture();

		const issues = manifestService.validateManifestShape({
			name: 'SampleApp',
			version: '1.0.0',
			language: 'english',
			modules: [
				{ id: 'API' },
			],
		});

		assert.ok(issues.some((issue) => issue.includes('language')));
		assert.ok(issues.some((issue) => issue.includes('enabled')));
	});

	test('sorts tree children and assigns file context commands', async () => {
		const { root, fileService, scaffoldService } = await createFixture();
		await scaffoldService.initializePinake(root, 'SampleApp');

		const provider = new PinakeTreeProvider(root, fileService);
		const rootChildren = await provider.getChildren();
		assert.deepStrictEqual(
			rootChildren.slice(0, 4).map((node) => node.label),
			['00_Overview', '01_GettingStarted', '02_Architecture', '03_Development'],
		);
		assert.ok(!rootChildren.some((node) => node.label === '.pinake'));

		const overviewDirectory = rootChildren.find((node) => node.label === '00_Overview');
		if (!overviewDirectory) {
			assert.fail('Expected 00_Overview directory in tree.');
		}

		const directoryItem = provider.getTreeItem(overviewDirectory);
		assert.strictEqual(directoryItem.contextValue, 'directory');
		assert.strictEqual(overviewDirectory.relativePath, '00_Overview');

		const overviewChildren = await provider.getChildren(overviewDirectory);
		const overviewFile = overviewChildren.find((node) => node.label === 'Overview.md');
		if (!overviewFile) {
			assert.fail('Expected Overview.md in tree.');
		}

		const fileItem = provider.getTreeItem(overviewFile);
		assert.strictEqual(fileItem.contextValue, 'file');
		assert.strictEqual(fileItem.command?.command, 'pinakes.openFile');
		assert.strictEqual(overviewFile.relativePath, '00_Overview/Overview.md');

		const resolvedFile = await provider.getNodeByRelativePath('00_Overview/Overview.md');
		const parent = resolvedFile ? await provider.getParent(resolvedFile) : undefined;
		assert.strictEqual(resolvedFile?.label, 'Overview.md');
		assert.strictEqual(parent?.label, '00_Overview');
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

interface Fixture {
	root: vscode.Uri;
	fileService: FileService;
	indexService: IndexService;
	manifestService: ManifestService;
	scaffoldService: ScaffoldService;
	stateService: StateService;
	validationService: ValidationService;
}
