import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { FileService } from './FileService';

export type AgentSkillInstallStatus = 'installed' | 'updated' | 'unchanged' | 'cancelled';

export interface AgentSkillInstallResult {
	status: AgentSkillInstallStatus;
	sourceUri: vscode.Uri;
	targetUri: vscode.Uri;
	targetHome: string;
	usedCodexHomeEnvironment: boolean;
}

export interface AgentSkillTarget {
	targetHome: string;
	targetUri: vscode.Uri;
	usedCodexHomeEnvironment: boolean;
}

export interface AgentSkillEnvironment {
	CODEX_HOME?: string;
}

export type ConfirmAgentSkillOverwrite = (targetUri: vscode.Uri) => Promise<boolean>;

const pinakeSkillPathSegments = ['resources', 'skills', 'pinake', 'SKILL.md'];

export class AgentSkillInstaller {
	public constructor(
		private readonly fileService: FileService,
		private readonly extensionUri: vscode.Uri,
	) {}

	public getPackagedPinakeSkillUri(): vscode.Uri {
		return getPackagedPinakeSkillUri(this.extensionUri);
	}

	public resolvePinakeAgentSkillTarget(
		env: AgentSkillEnvironment = process.env,
		homeDirectory = os.homedir(),
	): AgentSkillTarget {
		return resolvePinakeAgentSkillTarget(env, homeDirectory);
	}

	public async installPinakeSkill(
		confirmOverwrite: ConfirmAgentSkillOverwrite,
		env: AgentSkillEnvironment = process.env,
		homeDirectory = os.homedir(),
	): Promise<AgentSkillInstallResult> {
		const sourceUri = this.getPackagedPinakeSkillUri();
		const sourceContent = await this.fileService.readText(sourceUri);
		const target = this.resolvePinakeAgentSkillTarget(env, homeDirectory);

		let existingContent: string | undefined;
		if (await this.fileService.exists(target.targetUri)) {
			existingContent = await this.fileService.readText(target.targetUri);
			if (existingContent === sourceContent) {
				return {
					status: 'unchanged',
					sourceUri,
					...target,
				};
			}

			if (!(await confirmOverwrite(target.targetUri))) {
				return {
					status: 'cancelled',
					sourceUri,
					...target,
				};
			}
		}

		await this.fileService.ensureDirectory(vscode.Uri.file(path.dirname(target.targetUri.fsPath)));
		await this.fileService.writeText(target.targetUri, sourceContent);

		return {
			status: existingContent === undefined ? 'installed' : 'updated',
			sourceUri,
			...target,
		};
	}
}

export function getPackagedPinakeSkillUri(extensionUri: vscode.Uri): vscode.Uri {
	return vscode.Uri.joinPath(extensionUri, ...pinakeSkillPathSegments);
}

export function resolvePinakeAgentSkillTarget(
	env: AgentSkillEnvironment = process.env,
	homeDirectory = os.homedir(),
): AgentSkillTarget {
	const homePath = path.resolve(homeDirectory);
	const environmentHome = env.CODEX_HOME?.trim();
	const environmentPath = environmentHome ? resolveUserPath(environmentHome, homePath) : undefined;
	const useEnvironmentPath = environmentPath ? isInsideOrEqual(homePath, environmentPath) : false;
	const targetHome = useEnvironmentPath && environmentPath ? environmentPath : path.join(homePath, '.codex');

	return {
		targetHome,
		targetUri: vscode.Uri.file(path.join(targetHome, 'skills', 'pinake', 'SKILL.md')),
		usedCodexHomeEnvironment: useEnvironmentPath,
	};
}

function resolveUserPath(value: string, homePath: string): string {
	if (value === '~') {
		return homePath;
	}
	if (value.startsWith(`~${path.sep}`)) {
		return path.join(homePath, value.slice(2));
	}

	return path.resolve(value);
}

function isInsideOrEqual(parent: string, candidate: string): boolean {
	const relative = path.relative(parent, candidate);
	return relative === '' || (relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative));
}
