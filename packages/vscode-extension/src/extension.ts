import * as vscode from 'vscode';
import { CXGProvider } from './providers/CXGProvider';
import { StatusBarManager } from './ui/StatusBarManager';
import { initializeGlobalConfigManager } from './analysis/utils/ConfigurationManager';
import { LocalAnalysisEngine } from './analysis/LocalAnalysisEngine';
import { MCPServer } from './mcp/server/MCPServer';
import { ModernAnalysisEngine } from './analysis/integration/ModernAnalysisEngine';

class LegacyConfigAdapter {
  private changeListeners: Array<() => void> = [];

  constructor(private modernConfig: any) {
    this.modernConfig.onConfigurationChanged(() => {
      this.notifyChangeListeners();
    });
  }

  isEnabled(): boolean {
    return this.modernConfig.getConfiguration().enabled;
  }

  getSecurityLevel(): 'strict' | 'balanced' | 'permissive' {
    return this.modernConfig.getConfiguration().securityLevel;
  }

  isOfflineModeEnabled(): boolean {
    return this.modernConfig.getConfiguration().offlineMode;
  }

  isAutoScanEnabled(): boolean {
    return this.modernConfig.getConfiguration().autoScan;
  }

  getServerUrl(): string {
    return this.modernConfig.getConfiguration().serverUrl;
  }

  getServerTimeout(): number {
    return this.modernConfig.getConfiguration().serverTimeout;
  }

  // Methods used by CXGProvider
  async setEnabled(enabled: boolean): Promise<void> {
    await this.modernConfig.updateConfiguration({ enabled });
  }

  async setSecurityLevel(level: 'strict' | 'balanced' | 'permissive'): Promise<void> {
    await this.modernConfig.updateConfiguration({ securityLevel: level });
  }

  async setOfflineMode(offline: boolean): Promise<void> {
    await this.modernConfig.updateConfiguration({ offlineMode: offline });
  }

  async setAutoScan(autoScan: boolean): Promise<void> {
    await this.modernConfig.updateConfiguration({ autoScan });
  }

  // Event handling for CXGProvider
  onConfigurationChanged(callback: () => void): vscode.Disposable {
    this.changeListeners.push(callback);
    
    return {
      dispose: () => {
        const index = this.changeListeners.indexOf(callback);
        if (index > -1) {
          this.changeListeners.splice(index, 1);
        }
      }
    };
  }

  // Additional methods
  getMCPServerEnabled(): boolean {
    return this.modernConfig.getConfiguration().enableMCPServer;
  }

  getMCPServerPort(): number {
    return this.modernConfig.getConfiguration().mcpServerPort;
  }

  getDebugMode(): boolean {
    return this.modernConfig.getConfiguration().debugMode;
  }

  getAnalysisTimeout(): number {
    return this.modernConfig.getConfiguration().analysisTimeout;
  }

  getMaxConcurrentAnalyses(): number {
    return this.modernConfig.getConfiguration().maxConcurrentAnalyses;
  }

  getEnableSecretDetection(): boolean {
    return this.modernConfig.getConfiguration().enableSecretDetection;
  }

  getEnableBusinessLogicDetection(): boolean {
    return this.modernConfig.getConfiguration().enableBusinessLogicDetection;
  }

  getEnableInfrastructureDetection(): boolean {
    return this.modernConfig.getConfiguration().enableInfrastructureDetection;
  }

  getSecretSensitivity(): 'low' | 'medium' | 'high' {
    return this.modernConfig.getConfiguration().secretSensitivity;
  }

  // Bulk configuration getters
  getAllSettings(): any {
    return this.modernConfig.getConfiguration();
  }

  // Configuration validation
  async validateConfiguration(): Promise<boolean> {
    const config = this.modernConfig.getConfiguration();
    const validation = this.modernConfig.validateConfiguration(config);
    return validation.isValid;
  }

  // Configuration export/import methods if used
  async exportConfiguration(filePath?: string): Promise<string> {
    return this.modernConfig.exportConfiguration(filePath);
  }

  async importConfiguration(filePath: string): Promise<void> {
    return this.modernConfig.importConfiguration(filePath);
  }

  // Profile management if used
  getProfiles(): any[] {
    return this.modernConfig.getProfiles();
  }

  async applyProfile(profileName: string): Promise<void> {
    return this.modernConfig.applyProfile(profileName);
  }

  // Reset functionality
  async resetToDefaults(): Promise<void> {
    return this.modernConfig.resetToDefaults();
  }

  // Configuration summary
  getConfigurationSummary(): string {
    return this.modernConfig.getConfigurationSummary();
  }

  // Private helper to notify change listeners
  private notifyChangeListeners(): void {
    this.changeListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Configuration change listener error:', error);
      }
    });
  }

  // Dispose method for cleanup
  dispose(): void {
    this.changeListeners.length = 0;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('🛡️ CXG (ContextExtendedGuard) is now active!');

  // Initialize core components
  const modernConfig = initializeGlobalConfigManager(context);
  const legacyConfig = new LegacyConfigAdapter(modernConfig);
  
  const statusBar = new StatusBarManager();
  const modernAnalysisEngine = new ModernAnalysisEngine(context);
  const analysisEngine = new LocalAnalysisEngine(context);
  const provider = new CXGProvider(context, legacyConfig as any, analysisEngine, statusBar);

  // Initialize MCP Server for AI integration
  const mcpServer = new MCPServer(context, analysisEngine, legacyConfig as any);

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
    vscode.commands.registerCommand('cxg.analyzeWithModernEngine', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor to analyze');
        return;
      }
      const code = editor.document.getText();
      const language = editor.document.languageId;
      const fileName = editor.document.fileName;

      try {
        const result = await modernAnalysisEngine.analyzeCode(code, language, fileName, {
          analysisLevel: modernConfig.getConfiguration().debugMode ? 'comprehensive' : 'standard',
        });
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      } catch (error) {
        vscode.window.showErrorMessage(`Modern analysis failed: ${error}`);
      }
    }),
    vscode.commands.registerCommand('cxg.showModernPerformance', () => {
      const report = modernAnalysisEngine.getAnalysisStats();
      vscode.workspace.openTextDocument({
        content: JSON.stringify(report, null, 2),
        language: 'json',
      }).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    }),

    // Additional modern configuration commands
    vscode.commands.registerCommand('cxg.showConfigSummary', () => {
      const summary = modernConfig.getConfigurationSummary();
      vscode.workspace.openTextDocument({
        content: summary,
        language: 'markdown',
      }).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    }),
    vscode.commands.registerCommand('cxg.exportConfig', async () => {
      try {
        const exportPath = await modernConfig.exportConfiguration();
        vscode.window.showInformationMessage(`Configuration exported to: ${exportPath}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to export configuration: ${error}`);
      }
    }),
    vscode.commands.registerCommand('cxg.resetConfig', async () => {
      const choice = await vscode.window.showWarningMessage(
        'Reset CXG configuration to defaults?',
        { modal: true },
        'Reset',
        'Cancel'
      );
      
      if (choice === 'Reset') {
        try {
          await modernConfig.resetToDefaults();
          vscode.window.showInformationMessage('Configuration reset to defaults');
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to reset configuration: ${error}`);
        }
      }
    }),
  ];

  // Auto-start MCP server if enabled in configuration
  const shouldAutoStartMCP = modernConfig.getConfiguration().enableMCPServer;
  if (shouldAutoStartMCP) {
    mcpServer.start().catch((error) => {
      console.warn('Failed to auto-start ContextExtendedGuard MCP server:', error);
    });
  }

  // Register all disposables
  const disposables = [...commands, statusBar, provider, mcpServer, legacyConfig];
  disposables.forEach((disposable) => context.subscriptions.push(disposable));

  // Enhanced activation message with configuration status
  const configSummary = modernConfig.getConfiguration();
  console.log('CXG Configuration:', {
    enabled: configSummary.enabled,
    securityLevel: configSummary.securityLevel,
    offlineMode: configSummary.offlineMode,
    mcpEnabled: configSummary.enableMCPServer
  });

  vscode.window.showInformationMessage(
    'ContextExtendedGuard is now protecting your code',
    { modal: false }
  );
}

export function deactivate() {
  console.log('ContextExtendedGuard (CXG) has been deactivated');
}