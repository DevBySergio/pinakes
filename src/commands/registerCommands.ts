import * as vscode from 'vscode';
import { PinakesCommands } from './PinakesCommands';

export function registerPinakesCommands(context: vscode.ExtensionContext, commands: PinakesCommands): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('pinakes.createPinake', () => commands.createPinake()),
		vscode.commands.registerCommand('pinake.create', () => commands.createPinake()),
		vscode.commands.registerCommand('pinakes.refresh', () => commands.refresh()),
		vscode.commands.registerCommand('pinake.refresh', () => commands.refresh()),
		vscode.commands.registerCommand('pinakes.openFile', (node) => commands.openFile(node)),
		vscode.commands.registerCommand('pinakes.openPreview', (node) => commands.openPreview(node)),
		vscode.commands.registerCommand('pinake.openPreview', (node) => commands.openPreview(node)),
		vscode.commands.registerCommand('pinakes.openFileSide', (node) => commands.openFileSide(node)),
		vscode.commands.registerCommand('pinakes.editDocument', (node) => commands.editDocument(node)),
		vscode.commands.registerCommand('pinake.editDocument', (node) => commands.editDocument(node)),
		vscode.commands.registerCommand('pinakes.openManifest', () => commands.openManifest()),
		vscode.commands.registerCommand('pinakes.duplicate', (node) => commands.duplicate(node)),
		vscode.commands.registerCommand('pinakes.revealInExplorer', (node) => commands.revealInExplorer(node)),
		vscode.commands.registerCommand('pinakes.copyPath', (node) => commands.copyPath(node)),
		vscode.commands.registerCommand('pinakes.showProperties', (node) => commands.showProperties(node)),
		vscode.commands.registerCommand('pinakes.sortChildren', () => commands.sortChildren()),
		vscode.commands.registerCommand('pinakes.addFavorite', (node) => commands.addFavorite(node)),
		vscode.commands.registerCommand('pinakes.removeFavorite', (node) => commands.removeFavorite(node)),
		vscode.commands.registerCommand('pinakes.newFile', (node) => commands.newFile(node)),
		vscode.commands.registerCommand('pinakes.newFolder', (node) => commands.newFolder(node)),
		vscode.commands.registerCommand('pinakes.rename', (node) => commands.rename(node)),
		vscode.commands.registerCommand('pinakes.delete', (node) => commands.delete(node)),
		vscode.commands.registerCommand('pinakes.generateModule', () => commands.generateModule()),
		vscode.commands.registerCommand('pinakes.searchDocumentation', () => commands.searchDocumentation()),
		vscode.commands.registerCommand('pinakes.repair', () => commands.repairPinake()),
		vscode.commands.registerCommand('pinakes.upgrade', () => commands.upgradePinake()),
		vscode.commands.registerCommand('pinakes.generateCiValidation', () => commands.generateCiValidation()),
		vscode.commands.registerCommand('pinakes.export', () => commands.exportPinake()),
		vscode.commands.registerCommand('pinakes.import', () => commands.importDocumentation()),
		vscode.commands.registerCommand('pinakes.validate', () => commands.validate()),
		vscode.commands.registerCommand('pinakes.installAgentSkill', () => commands.installAgentSkill()),
	);
}
