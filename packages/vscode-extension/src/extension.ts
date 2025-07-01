import * as vscode from 'vscode';
import { CXGProvider } from './providers/CXGProvider';
import { StatusBarManager } from './ui/StatusBarManager';
import { ConfigurationManager } from './configuration/ConfigurationManager';
import { LocalAnalysisEngine } from './analysis/LocalAnalysisEngine';

export function activate(context: vscode.ExtensionContext) {
    console.log('CXG (ContextExtendedGuard) is now active!');

    // Initialize core components
    const config = new ConfigurationManager();
    const statusBar = new StatusBarManager();
    const analysisEngine = new LocalAnalysisEngine(context);
    const provider = new CXGProvider(context, config, analysisEngine);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('cxg.enable', () => provider.enable()),
        vscode.commands.registerCommand('cxg.disable', () => provider.disable()),
        vscode.commands.registerCommand('cxg.scanFile', () => provider.scanCurrentFile()),
        vscode.commands.registerCommand('cxg.showReport', () => provider.showReport()),
        vscode.commands.registerCommand('cxg.showSettings', () => provider.showSettings())
    ];

    // Register providers
    const disposables = [
        ...commands,
        statusBar,
        provider
    ];

    disposables.forEach(disposable => context.subscriptions.push(disposable));

    // Show activation message
    vscode.window.showInformationMessage('🛡️ CXG is protecting your code!');
}

export function deactivate() {
    console.log('CXG (ContextExtendedGuard) has been deactivated');
}