import * as vscode from 'vscode';
import { CXGProvider } from './providers/CXGProvider';
import { StatusBarManager } from './ui/StatusBarManager';
import { initializeGlobalConfigManager } from './analysis/utils/ConfigurationManager';
import { LocalAnalysisEngine } from './analysis/LocalAnalysisEngine';
import { MCPServer } from './mcp/server/MCPServer';
import { ModernAnalysisEngine } from './analysis/integration/ModernAnalysisEngine';

/**
 * Adapter to satisfy existing CXGProvider/MCPServer constructors
 * while delegating to the new modular ConfigurationManager.
 */
class LegacyConfigAdapter implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private modernConfig: any) {
    // subscribe to modernConfig changes
    const sub = this.modernConfig.onConfigurationChanged(() => {
      this.changeListeners.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.error(e);
        }
      });
    });
    this.disposables.push(sub);
  }

  // legacy getters
  isEnabled() {
    return this.modernConfig.getConfiguration().enabled;
  }
  getSecurityLevel() {
    return this.modernConfig.getConfiguration().securityLevel;
  }
  isOfflineModeEnabled() {
    return this.modernConfig.getConfiguration().offlineMode;
  }
  isAutoScanEnabled() {
    return this.modernConfig.getConfiguration().autoScan;
  }
  getServerUrl() {
    return this.modernConfig.getConfiguration().serverUrl;
  }
  getServerTimeout() {
    return this.modernConfig.getConfiguration().serverTimeout;
  }

  // legacy setters
  async setEnabled(v: boolean) {
    await this.modernConfig.updateConfiguration({ enabled: v });
  }
  async setSecurityLevel(v: any) {
    await this.modernConfig.updateConfiguration({ securityLevel: v });
  }
  async setOfflineMode(v: boolean) {
    await this.modernConfig.updateConfiguration({ offlineMode: v });
  }
  async setAutoScan(v: boolean) {
    await this.modernConfig.updateConfiguration({ autoScan: v });
  }

  // legacy event
  private changeListeners: Array<() => void> = [];
  onConfigurationChanged(cb: () => void): vscode.Disposable {
    this.changeListeners.push(cb);
    const disposable = {
      dispose: () => {
        this.changeListeners = this.changeListeners.filter((fn) => fn !== cb);
      },
    };
    this.disposables.push(disposable);
    return disposable;
  }

  // modern extensions
  getConfigurationSummary() {
    return this.modernConfig.getConfigurationSummary();
  }
  async exportConfiguration(fp?: string) {
    return this.modernConfig.exportConfiguration(fp);
  }
  async resetToDefaults() {
    return this.modernConfig.resetToDefaults();
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.changeListeners = [];
  }
}

/**
 * Activate entrypoint
 */
export async function activate(context: vscode.ExtensionContext) {
  // Initializing components
  let modernConfig: any;
  try {
    modernConfig = initializeGlobalConfigManager(context);
  } catch (err) {
    vscode.window.showErrorMessage(`CXG: Failed to load configuration: ${err}`);
    return;
  }

  const legacyConfig = new LegacyConfigAdapter(modernConfig);
  context.subscriptions.push(legacyConfig);

  let statusBar: StatusBarManager;
  try {
    statusBar = new StatusBarManager();
    context.subscriptions.push(statusBar);
  } catch (err) {
    vscode.window.showErrorMessage(`CXG: Failed to initialize status bar: ${err}`);
    return;
  }

  let analysisEngine: LocalAnalysisEngine;
  try {
    analysisEngine = new LocalAnalysisEngine(context);
    context.subscriptions.push({ dispose: () => analysisEngine.reset() });
  } catch (err) {
    vscode.window.showErrorMessage(`CXG: Failed to initialize analysis engine: ${err}`);
    return;
  }

  let modernEngine: ModernAnalysisEngine;
  try {
    modernEngine = new ModernAnalysisEngine(context);
  } catch (err) {
    vscode.window.showErrorMessage(`CXG: Failed to initialize modern engine: ${err}`);
    return;
  }

  let mcpServer: MCPServer;
  try {
    mcpServer = new MCPServer(context, analysisEngine, legacyConfig as any);
    context.subscriptions.push(mcpServer);
  } catch (err) {
    vscode.window.showErrorMessage(`CXG: Failed to initialize MCP server: ${err}`);
    return;
  }

  // Setup provider
  const provider = new CXGProvider(context, legacyConfig as any, analysisEngine, statusBar);
  provider.setStatusBar(statusBar);
  context.subscriptions.push(provider);

  // Register all command groups
  context.subscriptions.push(
    ...registerCoreCommands(provider),
    ...registerMCPCommands(mcpServer, modernConfig),
    ...registerModernCommands(modernEngine, modernConfig),
    ...registerConfigCommands(modernConfig)
  );

  // Auto-start MCP if configured
  if (modernConfig.getConfiguration().enableMCPServer) {
    mcpServer.start().catch((err) => {
      vscode.window.showWarningMessage(`CXG MCP failed to start: ${err}`);
    });
  }

  vscode.window.showInformationMessage('CXG is now active');
}

/**
 * Deactivate entrypoint
 */
export function deactivate() {
  console.log('CXG has been deactivated');
}

/**
 * Group: core provider commands
 */
function registerCoreCommands(provider: CXGProvider): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('cxg.enable', () => provider.enable()),
    vscode.commands.registerCommand('cxg.disable', () => provider.disable()),
    vscode.commands.registerCommand('cxg.scanFile', () => provider.scanCurrentFile()),
    vscode.commands.registerCommand('cxg.showReport', () => provider.showReport()),
    vscode.commands.registerCommand('cxg.showSettings', () => provider.showSettings()),
    vscode.commands.registerCommand('cxg.scanReactProject', () => provider.scanFrameworkProject('react')),
    vscode.commands.registerCommand('cxg.scanNodeProject', () => provider.scanFrameworkProject('node')),
    vscode.commands.registerCommand('cxg.analyzePackageJson', () => provider.analyzeConfigFile('package.json')),
    vscode.commands.registerCommand('cxg.sanitizeAndCopy', () => provider.sanitizeAndCopyToClipboard()),
  ];
}

/**
 * Group: MCP Server commands
 */
function registerMCPCommands(server: MCPServer, config: any): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('cxg.startMCPServer', () =>
      server.start().then(
        () => {
          vscode.window.showInformationMessage('MCP Server started');
        },
        (err) => {
          vscode.window.showErrorMessage(`Failed to start MCP: ${err}`);
        }
      )
    ),

    vscode.commands.registerCommand('cxg.stopMCPServer', () => server.stop()),
    vscode.commands.registerCommand('cxg.mcpStatus', () => vscode.commands.executeCommand('cxg.mcp.status')),
    vscode.commands.registerCommand('cxg.analyzeForAI', async () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed) return vscode.window.showWarningMessage('No active editor');
      try {
        const result = await server.analyzeForAI(ed.document.getText(), ed.document.languageId);
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      } catch (err) {
        vscode.window.showErrorMessage(`AI analysis failed: ${err}`);
      }
    }),
  ];
}

/**
 * Group: modern analysis commands
 */
function registerModernCommands(engine: ModernAnalysisEngine, config: any): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('cxg.analyzeWithModernEngine', async () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed) return vscode.window.showWarningMessage('No active editor');
      try {
        const result = await engine.analyzeCode(
          ed.document.getText(),
          ed.document.languageId,
          ed.document.fileName,
          { analysisLevel: config.getConfiguration().debugMode ? 'comprehensive' : 'standard' }
        );
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      } catch (err) {
        vscode.window.showErrorMessage(`Modern analysis failed: ${err}`);
      }
    }),

    vscode.commands.registerCommand('cxg.showModernPerformance', () => {
      const report = engine.getAnalysisStats();
      vscode.workspace
        .openTextDocument({
          content: JSON.stringify(report, null, 2),
          language: 'json',
        })
        .then((d) => vscode.window.showTextDocument(d));
    }),
  ];
}

/**
 * Group: configuration commands
 */
function registerConfigCommands(config: any): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('cxg.showConfigSummary', () => {
      const summary = config.getConfigurationSummary();
      vscode.window.showInformationMessage(summary, { modal: false });
    }),

    vscode.commands.registerCommand('cxg.exportConfig', async () => {
      try {
        const path = await config.exportConfiguration();
        vscode.window.showInformationMessage(`Config exported to ${path}`);
      } catch (err) {
        vscode.window.showErrorMessage(`Export failed: ${err}`);
      }
    }),

    vscode.commands.registerCommand('cxg.resetConfig', async () => {
      const choice = await vscode.window.showWarningMessage(
        'Reset configuration to defaults?',
        { modal: true },
        'Reset'
      );
      if (choice === 'Reset') {
        try {
          await config.resetToDefaults();
          vscode.window.showInformationMessage('Configuration reset');
        } catch (err) {
          vscode.window.showErrorMessage(`Reset failed: ${err}`);
        }
      }
    }),
  ];
}
