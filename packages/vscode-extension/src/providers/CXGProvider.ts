import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from '../configuration/ConfigurationManager';
import { LocalAnalysisEngine, AnalysisResult } from '../analysis/LocalAnalysisEngine';
import { AnalysisResultsView } from '../views/AnalysisResultsView';
import { SecurityReportView } from '../views/SecurityReportView';

/**
 * CXGProvider manages the core functionality of the CXG extension
 * Coordinates between analysis engine, configuration, and user interface
 */
export class CXGProvider implements vscode.Disposable {
  private context: vscode.ExtensionContext;
  private config: ConfigurationManager;
  private analysisEngine: LocalAnalysisEngine;
  private statusBar: any;
  private disposables: vscode.Disposable[] = [];
  private isEnabled: boolean = true;

  constructor(
    context: vscode.ExtensionContext,
    config: ConfigurationManager,
    analysisEngine: LocalAnalysisEngine,
    statusBar?: any
  ) {
    this.context = context;
    this.config = config;
    this.analysisEngine = analysisEngine;
    this.statusBar = statusBar;

    this.setupEventHandlers();
    console.log('CXG Provider initialized');
  }

  /**
   * Set up event handlers for document changes and other VS Code events
   */
  private setupEventHandlers(): void {
    // Listen for configuration changes
    this.disposables.push(
      this.config.onConfigurationChanged(() => {
        this.isEnabled = this.config.isEnabled();
        this.updateStatusBar();
        console.log(`CXG enabled status changed: ${this.isEnabled}`);
      })
    );

    // Listen for document save events
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (this.isEnabled && this.shouldAnalyzeDocument(document)) {
          await this.analyzeDocument(document);
        }
      })
    );

    // Listen for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (this.isEnabled && editor && this.shouldAnalyzeDocument(editor.document)) {
          // Debounce analysis for editor changes
          setTimeout(() => this.analyzeDocument(editor.document), 1000);
        }
      })
    );
  }

  /**
   * Check if a document should be analyzed based on language and settings
   */
  private shouldAnalyzeDocument(document: vscode.TextDocument): boolean {
    const supportedLanguages = [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
      'python',
      'go',
      'java',
      'csharp',
      'php',
      'ruby',
    ];
    return (
      supportedLanguages.includes(document.languageId) &&
      document.uri.scheme === 'file' &&
      !document.fileName.includes('node_modules') &&
      !document.fileName.includes('.git')
    );
  }

  /**
   * Analyze a document and handle the results
   */
  private async analyzeDocument(document: vscode.TextDocument): Promise<AnalysisResult> {
    const code = document.getText();
    const language = document.languageId;
    const fileName = path.basename(document.fileName);

    console.log(`CXG: Analyzing document ${fileName} (${language})`);

    // Update status bar to show scanning
    this.updateStatusBar('scanning', `Scanning ${fileName}...`);

    try {
      const result = await this.analysisEngine.analyzeCode(code, language, fileName);

      // Update status bar based on results
      if (result.riskLevel === 'high') {
        this.updateStatusBar('warning', `High risk detected in ${fileName}`);

        // Show non-intrusive notification
        const action = await vscode.window.showWarningMessage(
          `🚨 CXG: High risk detected in ${fileName}`,
          { modal: false },
          'View Details',
          'Dismiss'
        );

        if (action === 'View Details') {
          AnalysisResultsView.show(result);
        }
      } else if (result.riskLevel === 'medium') {
        this.updateStatusBar('warning', `Medium risk detected in ${fileName}`);

        const action = await vscode.window.showInformationMessage(
          `⚠️ CXG: Security concerns found in ${fileName}`,
          { modal: false },
          'View Details'
        );

        if (action === 'View Details') {
          AnalysisResultsView.show(result);
        }
      } else {
        this.updateStatusBar('active', 'Code is secure');
      }

      return result;
    } catch (error) {
      console.error('CXG: Analysis failed:', error);
      this.updateStatusBar('error', `Analysis failed: ${error}`);

      vscode.window.showErrorMessage(`CXG: Analysis failed for ${fileName}`, { modal: false });
      throw error;
    }
  }

  /**
   * Update status bar with enhanced states
   */
  private updateStatusBar(status?: string, message?: string): void {
    if (this.statusBar) {
      const finalStatus = status || (this.isEnabled ? 'active' : 'inactive');
      this.statusBar.updateStatus(finalStatus, message);
    }
  }

  /**
   * Enable CXG protection
   */
  public async enable(): Promise<void> {
    await this.config.setEnabled(true);
    this.isEnabled = true;
    this.updateStatusBar('active', 'CXG protection enabled');

    vscode.window.showInformationMessage('🛡️ CXG protection enabled', { modal: false });
  }

  /**
   * Disable CXG protection
   */
  public async disable(): Promise<void> {
    await this.config.setEnabled(false);
    this.isEnabled = false;
    this.updateStatusBar('inactive', 'CXG protection disabled');

    vscode.window.showWarningMessage('🛡️ CXG protection disabled', { modal: false });
  }

  /**
   * Scan the currently active file
   */
  public async scanCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active file to scan', { modal: false });
      return;
    }

    try {
      const result = await this.analyzeDocument(editor.document);
      AnalysisResultsView.show(result);
    } catch (error) {
      // Error already handled in analyzeDocument
    }
  }

  /**
   * Show analysis report
   */
  public async showReport(): Promise<void> {
    const recentScans = this.analysisEngine.getRecentScans();
    const summary = this.analysisEngine.getSecuritySummary();
    const isServerOnline = this.analysisEngine.isServerAvailable();

    SecurityReportView.show(recentScans, summary, isServerOnline);
  }

  /**
   * Show CXG settings
   */
  public async showSettings(): Promise<void> {
    vscode.commands.executeCommand('workbench.action.openSettings', 'cxg');
  }

  /**
   * Set status bar reference
   */
  public setStatusBar(statusBar: any): void {
    this.statusBar = statusBar;
    this.updateStatusBar();
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
  }
}
