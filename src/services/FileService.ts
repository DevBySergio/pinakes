import * as vscode from 'vscode';

export class FileService {
	private readonly encoder = new TextEncoder();
	private readonly decoder = new TextDecoder('utf-8');

	public async exists(uri: vscode.Uri): Promise<boolean> {
		try {
			await vscode.workspace.fs.stat(uri);
			return true;
		} catch {
			return false;
		}
	}

	public async isDirectory(uri: vscode.Uri): Promise<boolean> {
		try {
			const stat = await vscode.workspace.fs.stat(uri);
			return (stat.type & vscode.FileType.Directory) !== 0;
		} catch {
			return false;
		}
	}

	public async ensureDirectory(uri: vscode.Uri): Promise<void> {
		await vscode.workspace.fs.createDirectory(uri);
	}

	public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		return vscode.workspace.fs.readDirectory(uri);
	}

	public async readText(uri: vscode.Uri): Promise<string> {
		const bytes = await vscode.workspace.fs.readFile(uri);
		return this.decoder.decode(bytes);
	}

	public async writeText(uri: vscode.Uri, content: string): Promise<void> {
		await vscode.workspace.fs.writeFile(uri, this.encoder.encode(content));
	}

	public async writeTextIfMissing(uri: vscode.Uri, content: string): Promise<boolean> {
		if (await this.exists(uri)) {
			return false;
		}

		await this.writeText(uri, content);
		return true;
	}

	public async readJson<T>(uri: vscode.Uri): Promise<T | undefined> {
		if (!(await this.exists(uri))) {
			return undefined;
		}

		return JSON.parse(await this.readText(uri)) as T;
	}

	public async writeJson(uri: vscode.Uri, value: unknown): Promise<void> {
		await this.writeText(uri, `${JSON.stringify(value, null, 2)}\n`);
	}

	public async rename(source: vscode.Uri, target: vscode.Uri, overwrite: boolean): Promise<void> {
		await vscode.workspace.fs.rename(source, target, { overwrite });
	}

	public async delete(uri: vscode.Uri, recursive: boolean): Promise<void> {
		await vscode.workspace.fs.delete(uri, { recursive, useTrash: true });
	}
}
