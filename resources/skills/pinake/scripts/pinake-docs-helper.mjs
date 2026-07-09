#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ignoredDirectories = new Set([
	'.git',
	'.pinake/.state',
	'.vscode-test',
	'coverage',
	'dist',
	'node_modules',
	'out',
]);

const documentFields = ['title', 'type', 'status', 'order'];

const args = parseArgs(process.argv.slice(2));
const command = args.positionals[0];

try {
	if (command === 'inventory') {
		const inventory = await inspectProject(args.root);
		writeOutput(inventory, args.format, formatInventory);
	} else if (command === 'recommend') {
		const inventory = await inspectProject(args.root);
		const recommendation = recommendPinakeStructure(inventory);
		writeOutput(recommendation, args.format, formatRecommendation);
	} else if (command === 'normalize-frontmatter') {
		const result = await normalizePinakeFrontmatter(args.root, args.write);
		writeOutput(result, args.format, formatNormalizeResult);
	} else if (command === 'check-skill-sync') {
		const result = await checkSkillCatalogSync(args.root);
		writeOutput(result, args.format, formatSyncResult);
		process.exitCode = result.ok ? 0 : 1;
	} else {
		printUsage();
		process.exitCode = command ? 1 : 0;
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}

function parseArgs(argv) {
	const options = {
		root: process.cwd(),
		format: 'text',
		write: false,
		positionals: [],
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--root') {
			options.root = path.resolve(argv[index + 1] ?? options.root);
			index += 1;
		} else if (arg.startsWith('--root=')) {
			options.root = path.resolve(arg.slice('--root='.length));
		} else if (arg === '--format') {
			options.format = argv[index + 1] ?? options.format;
			index += 1;
		} else if (arg.startsWith('--format=')) {
			options.format = arg.slice('--format='.length);
		} else if (arg === '--write') {
			options.write = true;
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else {
			options.positionals.push(arg);
		}
	}

	if (!['json', 'text'].includes(options.format)) {
		throw new Error(`Unsupported format: ${options.format}`);
	}

	return options;
}

function printUsage() {
	console.log([
		'Usage: node pinake-docs-helper.mjs <command> [--root <workspace>] [--format text|json] [--write]',
		'',
		'Commands:',
		'  inventory              Inspect repository files and emit documentation signals.',
		'  recommend              Recommend a Pinake template and generated modules.',
		'  normalize-frontmatter  Add or update Markdown frontmatter from .pinake/pinake.json. Dry-run unless --write is set.',
		'  check-skill-sync       In the Pinake Editor repo, check skill references against source module/catalog ids.',
	].join('\n'));
}

async function inspectProject(root) {
	const files = await collectFiles(root, root);
	const fileSet = new Set(files);
	const packageJson = await readJsonIfExists(path.join(root, 'package.json'));
	const dependencies = {
		...(packageJson?.dependencies ?? {}),
		...(packageJson?.devDependencies ?? {}),
	};
	const dependencyNames = new Set(Object.keys(dependencies).map((name) => name.toLowerCase()));
	const hasFile = (...candidates) => candidates.some((candidate) => fileSet.has(candidate));
	const hasPathPart = (part) => files.some((file) => file.toLowerCase().includes(part.toLowerCase()));
	const hasDependency = (...names) => names.some((name) => dependencyNames.has(name.toLowerCase()));

	const signals = {
		node: Boolean(packageJson),
		typescript: hasFile('tsconfig.json') || hasPathPart('.ts'),
		frontend: hasDependency('react', 'vue', '@angular/core', 'svelte', 'next', 'vite') || hasPathPart('src/App.') || hasPathPart('pages/'),
		api: hasDependency('express', 'fastify', 'koa', 'hapi', '@nestjs/core') || hasPathPart('routes/') || hasPathPart('controllers/') || hasPathPart('openapi'),
		database: hasDependency('prisma', 'sequelize', 'typeorm', 'mongoose', 'knex') || hasPathPart('migrations/') || hasPathPart('schema.prisma'),
		docker: hasFile('Dockerfile', 'docker-compose.yml', 'docker-compose.yaml') || files.some((file) => path.basename(file).toLowerCase().startsWith('dockerfile')),
		kubernetes: hasPathPart('k8s/') || hasPathPart('kubernetes/') || files.some((file) => /(^|\/)(deployment|service|ingress)[^/]*\.ya?ml$/i.test(file)),
		ci: hasPathPart('.github/workflows/') || hasPathPart('.gitlab-ci.yml') || hasPathPart('azure-pipelines.yml'),
		auth: hasDependency('passport', 'next-auth', '@auth/core', 'jsonwebtoken', 'jose') || hasPathPart('auth'),
		graphql: hasDependency('graphql', '@apollo/server', 'apollo-server') || hasPathPart('graphql') || files.some((file) => file.endsWith('.graphql')),
		grpc: hasDependency('@grpc/grpc-js', 'grpc') || files.some((file) => file.endsWith('.proto')),
		websocket: hasDependency('ws', 'socket.io') || hasPathPart('websocket') || hasPathPart('socket'),
		cli: Boolean(packageJson?.bin) || hasDependency('commander', 'yargs', 'oclif'),
		iac: hasPathPart('terraform') || files.some((file) => file.endsWith('.tf')) || hasPathPart('pulumi'),
		monitoring: hasPathPart('prometheus') || hasPathPart('grafana') || hasPathPart('opentelemetry') || hasDependency('@opentelemetry/api'),
		security: hasPathPart('security') || hasPathPart('threat') || hasFile('SECURITY.md'),
		docs: hasFile('README.md') || hasPathPart('docs/'),
		tests: hasPathPart('test') || hasPathPart('__tests__') || hasDependency('jest', 'vitest', 'mocha', 'playwright', 'cypress'),
	};

	return {
		root,
		fileCount: files.length,
		keyFiles: files.filter(isKeyFile).slice(0, 80),
		packageManager: detectPackageManager(fileSet),
		scripts: packageJson?.scripts ?? {},
		dependencies: Array.from(dependencyNames).sort(),
		signals,
	};
}

async function collectFiles(root, directory) {
	let entries;
	try {
		entries = await fs.readdir(directory, { withFileTypes: true });
	} catch {
		return [];
	}

	const files = [];
	for (const entry of entries) {
		const absolutePath = path.join(directory, entry.name);
		const relativePath = normalizePath(path.relative(root, absolutePath));
		if (entry.isDirectory()) {
			if (shouldSkipDirectory(relativePath, entry.name)) {
				continue;
			}

			files.push(...await collectFiles(root, absolutePath));
		} else if (entry.isFile()) {
			files.push(relativePath);
		}
	}

	return files.sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));
}

function shouldSkipDirectory(relativePath, name) {
	return ignoredDirectories.has(name) || ignoredDirectories.has(relativePath);
}

function isKeyFile(file) {
	return /(^|\/)(README|CHANGELOG|SECURITY|CONTRIBUTING|Dockerfile|docker-compose|package|tsconfig|vite|next|astro|angular|pom|build.gradle|Cargo|pyproject|requirements|go\.mod)/i.test(file)
		|| file.startsWith('.github/workflows/')
		|| file.startsWith('docs/')
		|| file.startsWith('src/');
}

function detectPackageManager(fileSet) {
	if (fileSet.has('pnpm-lock.yaml')) {
		return 'pnpm';
	}
	if (fileSet.has('yarn.lock')) {
		return 'yarn';
	}
	if (fileSet.has('package-lock.json')) {
		return 'npm';
	}
	return undefined;
}

async function readJsonIfExists(filePath) {
	try {
		return JSON.parse(await fs.readFile(filePath, 'utf8'));
	} catch {
		return undefined;
	}
}

function recommendPinakeStructure(inventory) {
	const modules = new Set();
	const reasons = [];
	const signals = inventory.signals;

	if (signals.api) {
		modules.add('API');
		reasons.push('API-like source or dependencies detected.');
	}
	if (signals.database) {
		modules.add('Database');
	}
	if (signals.docker) {
		modules.add('Docker');
	}
	if (signals.kubernetes) {
		modules.add('Kubernetes');
	}
	if (signals.ci) {
		modules.add('CI/CD');
	}
	if (signals.frontend) {
		modules.add('Frontend');
	}
	if (signals.auth) {
		modules.add('Authentication');
	}
	if (signals.graphql) {
		modules.add('GraphQL');
	}
	if (signals.grpc) {
		modules.add('gRPC');
	}
	if (signals.websocket) {
		modules.add('WebSocket');
	}
	if (signals.cli) {
		modules.add('CLI');
	}
	if (signals.iac) {
		modules.add('IaC');
	}
	if (signals.monitoring) {
		modules.add('Monitoring');
	}
	if (signals.security) {
		modules.add('Security');
	}

	let templateId = 'minimal-internal-docs';
	if (signals.api || signals.database || signals.auth) {
		templateId = 'api-service-docs';
	} else if (signals.docker || signals.kubernetes || signals.iac || signals.monitoring) {
		templateId = 'operations-runbook';
	} else if (signals.frontend && signals.docs) {
		templateId = 'product-project-docs';
	}
	if ((signals.kubernetes || signals.iac) && (signals.api || signals.database || signals.monitoring)) {
		templateId = 'technical-architecture';
	}

	return {
		templateId,
		generatedModules: Array.from(modules).sort(),
		reasons,
		followUpDocuments: suggestFollowUpDocuments(inventory),
	};
}

function suggestFollowUpDocuments(inventory) {
	const suggestions = [];
	if (inventory.signals.tests) {
		suggestions.push('05_quality/testing-strategy.md');
	}
	if (inventory.signals.ci) {
		suggestions.push('05_Operations/CI-CD/Workflows.md');
	}
	if (inventory.signals.docker) {
		suggestions.push('05_Operations/Docker/Compose.md');
	}
	if (inventory.signals.api) {
		suggestions.push('03_Development/API/Endpoints.md');
	}
	if (inventory.signals.security || inventory.signals.auth) {
		suggestions.push('04_Architecture/Security/ThreatModel.md');
	}
	return suggestions;
}

async function normalizePinakeFrontmatter(root, write) {
	const manifestPath = path.join(root, '.pinake', 'pinake.json');
	const manifest = await readJsonIfExists(manifestPath);
	if (!manifest || !Array.isArray(manifest.documents)) {
		throw new Error('Missing .pinake/pinake.json with a documents array.');
	}

	const changes = [];
	for (const document of manifest.documents) {
		if (!document.path?.toLowerCase().endsWith('.md')) {
			continue;
		}

		const documentPath = path.join(root, '.pinake', 'docs', document.path);
		let content;
		try {
			content = await fs.readFile(documentPath, 'utf8');
		} catch {
			continue;
		}

		const nextContent = upsertFrontmatter(document, content);
		if (nextContent === content) {
			continue;
		}

		changes.push(`.pinake/docs/${document.path}`);
		if (write) {
			await fs.writeFile(documentPath, nextContent);
		}
	}

	return {
		wrote: write,
		changedCount: changes.length,
		changed: changes,
	};
}

function upsertFrontmatter(document, content) {
	const fields = [
		`title: ${JSON.stringify(document.title)}`,
		`type: ${document.type}`,
		`status: ${document.status}`,
		`order: ${document.order}`,
	];
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content.replace(/^\uFEFF/, ''));
	if (match) {
		const remaining = match[1]
			.split(/\r?\n/)
			.filter((line) => !documentFields.some((field) => new RegExp(`^${field}\\s*:`).test(line)));
		const body = match[2];
		return ['---', ...fields, ...remaining, '---', body].join('\n');
	}

	const trimmed = content.trimStart();
	const heading = /^#\s+.+$/m.test(trimmed) ? '' : `# ${document.title}\n\n`;
	return ['---', ...fields, '---', '', `${heading}${trimmed}`].join('\n');
}

async function checkSkillCatalogSync(root) {
	const modulesPath = path.join(root, 'src', 'modules', 'moduleDescriptors.ts');
	const referencePath = path.join(root, 'resources', 'skills', 'pinake', 'references', 'component-modules.md');
	const [source, reference] = await Promise.all([
		fs.readFile(modulesPath, 'utf8'),
		fs.readFile(referencePath, 'utf8'),
	]);
	const descriptorsBlock = source.split('export const modulePresets')[0] ?? source;
	const moduleIds = extractIds(descriptorsBlock);
	const missingModules = moduleIds.filter((id) => !reference.includes(`\`${id}\``));
	const presetBlock = source.split('export const modulePresets')[1] ?? '';
	const presetTitles = Array.from(presetBlock.matchAll(/title: '([^']+)'/g)).map((match) => match[1]);
	const missingPresets = presetTitles.filter((title) => !reference.includes(title));

	return {
		ok: missingModules.length === 0 && missingPresets.length === 0,
		missingModules,
		missingPresets,
	};
}

function extractIds(source) {
	return Array.from(source.matchAll(/^\s*id: '([^']+)'/gm))
		.map((match) => match[1])
		.filter((id, index, ids) => ids.indexOf(id) === index);
}

function writeOutput(value, format, formatter) {
	if (format === 'json') {
		console.log(JSON.stringify(value, null, 2));
		return;
	}

	console.log(formatter(value));
}

function formatInventory(inventory) {
	const signals = Object.entries(inventory.signals)
		.filter(([, active]) => active)
		.map(([name]) => name)
		.join(', ') || 'none';
	return [
		`Root: ${inventory.root}`,
		`Files scanned: ${inventory.fileCount}`,
		`Package manager: ${inventory.packageManager ?? 'unknown'}`,
		`Signals: ${signals}`,
		'',
		'Key files:',
		...inventory.keyFiles.slice(0, 40).map((file) => `- ${file}`),
	].join('\n');
}

function formatRecommendation(recommendation) {
	return [
		`Template: ${recommendation.templateId}`,
		`Generated modules: ${recommendation.generatedModules.length > 0 ? recommendation.generatedModules.join(', ') : 'none'}`,
		'',
		'Follow-up documents:',
		...(recommendation.followUpDocuments.length > 0 ? recommendation.followUpDocuments.map((file) => `- ${file}`) : ['- none']),
		'',
		'Reasons:',
		...(recommendation.reasons.length > 0 ? recommendation.reasons.map((reason) => `- ${reason}`) : ['- Defaulted from available signals.']),
	].join('\n');
}

function formatNormalizeResult(result) {
	return [
		`${result.wrote ? 'Updated' : 'Would update'} ${result.changedCount} Markdown document(s).`,
		...result.changed.map((file) => `- ${file}`),
	].join('\n');
}

function formatSyncResult(result) {
	return [
		result.ok ? 'Skill component catalog is in sync.' : 'Skill component catalog drift detected.',
		...result.missingModules.map((id) => `Missing module: ${id}`),
		...result.missingPresets.map((title) => `Missing preset: ${title}`),
	].join('\n');
}

function normalizePath(value) {
	return value.replace(/\\/g, '/');
}
