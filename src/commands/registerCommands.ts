import * as vscode from 'vscode';
import { PinakesCommands } from './PinakesCommands';

export function registerPinakesCommands(context: vscode.ExtensionContext, commands: PinakesCommands): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('pinakes.createPinake', () => commands.createPinake()),
		vscode.commands.registerCommand('pinakes.refresh', () => commands.refresh()),
		vscode.commands.registerCommand('pinakes.openFile', (node) => commands.openFile(node)),
		vscode.commands.registerCommand('pinakes.openFileSide', (node) => commands.openFileSide(node)),
		vscode.commands.registerCommand('pinakes.newFile', (node) => commands.newFile(node)),
		vscode.commands.registerCommand('pinakes.newFolder', (node) => commands.newFolder(node)),
		vscode.commands.registerCommand('pinakes.rename', (node) => commands.rename(node)),
		vscode.commands.registerCommand('pinakes.delete', (node) => commands.delete(node)),
		vscode.commands.registerCommand('pinakes.generateModule', () => commands.generateModule()),
		vscode.commands.registerCommand('pinakes.searchDocumentation', () => commands.searchDocumentation()),
		vscode.commands.registerCommand('pinakes.repair', () => commands.repairPinake()),
		vscode.commands.registerCommand('pinakes.validate', () => commands.validate()),
	);
}
