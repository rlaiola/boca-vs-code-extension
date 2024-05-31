import * as vscode from 'vscode';

import { RunProvider } from './run';
import { AuthProvider } from './auth';
import { FileSystemProvider } from './fileExplorer';

export async function activate(context: vscode.ExtensionContext) {
	vscode.commands.registerCommand(
		'bocaExplorer.openApiPathSetting',
		() => vscode.commands.executeCommand('workbench.action.openSettings', 'boca.api.path')
	);
	vscode.commands.registerCommand(
		'bocaExplorer.openApiSaltSetting',
		() => vscode.commands.executeCommand('workbench.action.openSettings', 'boca.api.salt')
	);
	// Overwrite entire parent setting
	vscode.workspace.getConfiguration().update(
		'explorer.decorations.colors',
		false,
		vscode.ConfigurationTarget.Global
	);
	const outputChannel = vscode.window.createOutputChannel('BOCA');
	const hasAccessToken = !!context.globalState.get<string>('accessToken');
	await vscode.commands.executeCommand('setContext', 'boca.showSignInView', !hasAccessToken);

	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const authProvider = new AuthProvider();
	vscode.commands.registerCommand('bocaExplorer.signIn', async () => {
		const accessToken = await authProvider.signIn();
		context.globalState.update('accessToken', accessToken);
		fileSystemProvider.refresh();
	});
	vscode.commands.registerCommand('bocaExplorer.signOut', async () => {
		context.globalState.update('accessToken', null);
		await vscode.commands.executeCommand('setContext', 'boca.showSignInView', true);
	});

	vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('boca.api')) {
			const { path: apiPath, salt: apiSalt } = vscode.workspace.getConfiguration().get<any>('boca.api');
			if (!!apiPath && !!apiSalt) {
				fileSystemProvider.refresh();
			}
		}
	});

	const fileSystemProvider = new FileSystemProvider(context, rootPath);
	if (hasAccessToken) {
		await fileSystemProvider.refresh();
	}
	vscode.window.registerTreeDataProvider('bocaExplorer', fileSystemProvider);
	vscode.commands.registerCommand('bocaExplorer.refreshEntry', () => fileSystemProvider.refresh());
	vscode.commands.registerCommand('bocaExplorer.openFile', (resource: vscode.Uri) => vscode.window.showTextDocument(resource));

	const runProvider = new RunProvider(context, rootPath);
	vscode.window.registerTreeDataProvider('runs', runProvider);
	
	vscode.commands.registerCommand('bocaExplorer.selectProblem', (contestNumber, problemNumber) => {
		runProvider.refresh(contestNumber, problemNumber);
	});
	
	vscode.commands.registerCommand('runs.selectRun', (resource: vscode.Uri, message: string) => {
		vscode.window.showTextDocument(resource);
		outputChannel.appendLine(message);
		outputChannel.show();
	});
}

export function deactivate() {}
