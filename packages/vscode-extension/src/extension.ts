import * as vscode from 'vscode';
import { CXGProvider } from './providers/CXGProvider';
import { StatusBarManager } from './ui/StatusBarManager';
import { ConfigurationManager } from './configuration/ConfigurationManager';
import { LocalAnalysisEngine } from './analysis/LocalAnalysisEngine';
import { MCPServer } from './mcp/server/MCPServer';

export function activate(context: vscode.ExtensionContext) {
  console.log('🛡️ CXG (ContextExtendedGuard) is now active!');

  // Initialize core components
  const config = new ConfigurationManager();
  const statusBar = new StatusBarManager();
  const analysisEngine = new LocalAnalysisEngine(context);
  const provider = new CXGProvider(context, config, analysisEngine, statusBar);

  // Initialize MCP Server for AI integration
  const mcpServer = new MCPServer(context, analysisEngine, config);

  // Set status bar reference in provider
  provider.setStatusBar(statusBar);

  // Register existing commands
  const commands = [
    vscode.commands.registerCommand('cxg.enable', () => {
      provider.enable();
    }),
    vscode.commands.registerCommand('cxg.disable', () => {
      provider.disable();
    }),
    vscode.commands.registerCommand('cxg.scanFile', () => {
      provider.scanCurrentFile();
    }),
    vscode.commands.registerCommand('cxg.showReport', () => {
      provider.showReport();
    }),
    vscode.commands.registerCommand('cxg.showSettings', () => {
      provider.showSettings();
    }),

    // New JavaScript/TypeScript focused commands
    vscode.commands.registerCommand('cxg.scanReactProject', () => {
      provider.scanFrameworkProject('react');
    }),
    vscode.commands.registerCommand('cxg.scanNodeProject', () => {
      provider.scanFrameworkProject('node');
    }),
    vscode.commands.registerCommand('cxg.analyzePackageJson', () => {
      provider.analyzeConfigFile('package.json');
    }),
    vscode.commands.registerCommand('cxg.sanitizeAndCopy', async () => {
      await provider.sanitizeAndCopyToClipboard();
    }),

    // MCP Server commands
    vscode.commands.registerCommand('cxg.startMCPServer', async () => {
      try {
        await mcpServer.start();
        vscode.window.showInformationMessage(
          'ContextExtendedGuard MCP Server started - AI assistants can now access security analysis'
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to start ContextExtendedGuard MCP server: ${error}`);
      }
    }),
    vscode.commands.registerCommand('cxg.stopMCPServer', async () => {
      await mcpServer.stop();
    }),
    vscode.commands.registerCommand('cxg.mcpStatus', async () => {
      await vscode.commands.executeCommand('cxg.mcp.status');
    }),
    vscode.commands.registerCommand('cxg.analyzeForAI', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor to analyze');
        return;
      }

      const code = editor.document.getText();
      const language = editor.document.languageId;

      try {
        const result = await mcpServer.analyzeForAI(code, language);

        // Show analysis results in a new document
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result, null, 2),
          language: 'json',
        });

        await vscode.window.showTextDocument(doc);
      } catch (error) {
        vscode.window.showErrorMessage(`ContextExtendedGuard analysis failed: ${error}`);
      }
    }),
  ];

  // Auto-start MCP server if enabled in configuration
  const shouldAutoStartMCP = vscode.workspace.getConfiguration('cxg').get('enableMCPServer', true);
  if (shouldAutoStartMCP) {
    mcpServer.start().catch((error) => {
      console.warn('Failed to auto-start ContextExtendedGuard MCP server:', error);
    });
  }

  // Register all disposables
  const disposables = [...commands, statusBar, provider, mcpServer];
  disposables.forEach((disposable) => context.subscriptions.push(disposable));

  // Enhanced activation message
  vscode.window.showInformationMessage(
    '🛡️ ContextExtendedGuard is now protecting your code',
    { modal: false }
  );
}

export function deactivate() {
  console.log('🛡️ ContextExtendedGuard (CXG) has been deactivated');
}
