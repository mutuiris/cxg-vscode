import * as vscode from 'vscode';
import { ContextGuardProvider } from './providers/ContextGuardProvider';
import { StatusBarManager } from './ui/StatusBarManager';
import { ConfigurationManager } from './configuration/ConfigurationManager';
import { LocalAnalysisEngine } from './analysis/LocalAnalysisEngine';

export function activate(context: vscode.ExtensionContext) {
    console.log('ContextGuard is now active!');

    // Initialize core components
    const config = new ConfigurationManager();
    const statusBar = new StatusBarManager();
    const analysisEngine = new LocalAnalysisEngine(context);
    const provider = new ContextGuardProvider(context, config, analysisEngine);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('contextguard.enable', () => provider.enable()),
        vscode.commands.registerCommand('contextguard.disable', () => provider.disable()),
        vscode.commands.registerCommand('contextguard.scanFile', () => provider.scanCurrentFile()),
        vscode.commands.registerCommand('contextguard.showReport', () => provider.showReport())
    ];

    // Register providers
    const disposables = [
        ...commands,
        statusBar,
        provider
    ];

    disposables.forEach(disposable => context.subscriptions.push(disposable));

    // Show activation message
    vscode.window.showInformationMessage('ContextGuard is protecting your code!');
}

export function deactivate() {
    console.log('ContextGuard has been deactivated');
}