import * as vscode from 'vscode';
import { ConfigurationManager } from '../configuration/ConfigurationManager';
import { LocalAnalysisEngine, AnalysisResult } from '../analysis/LocalAnalysisEngine';
import * as path from 'path';

export class CXGProvider implements vscode.Disposable {
  private context: vscode.ExtensionContext;
  private config: ConfigurationManager;
  private analysisEngine: LocalAnalysisEngine;
  private disposables: vscode.Disposable[] = [];

  constructor(
    context: vscode.ExtensionContext,
    config: ConfigurationManager,
    analysisEngine: LocalAnalysisEngine
  ) {
    this.context = context;
    this.config = config;
    this.analysisEngine = analysisEngine;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for document changes
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
      if (this.config.isEnabled() && this.config.isAutoScanEnabled()) {
        this.handleDocumentChange(event);
      }
    });

    // Listen for configuration changes
    const configChangeListener = this.config.onConfigurationChanged(() => {
      this.handleConfigurationChange();
    });

    this.disposables.push(documentChangeListener, configChangeListener);
  }

  private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    // Debounce analysis to avoid too frequent calls
    const supportedLanguages = ['typescript', 'javascript', 'python', 'go', 'java', 'csharp'];

    if (supportedLanguages.includes(event.document.languageId)) {
      // Analyze changes after a delay
      setTimeout(() => {
        this.analyzeDocument(event.document);
      }, 1000);
    }
  }

  private handleConfigurationChange(): void {
    console.log('CXG configuration changed');
  }

  public async enable(): Promise<void> {
    await this.config.setEnabled(true);
    vscode.window.showInformationMessage('🛡️ CXG protection enabled');
  }

  public async disable(): Promise<void> {
    await this.config.setEnabled(false);
    vscode.window.showWarningMessage('⚠️ CXG protection disabled');
  }

  public async scanCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return;
    }

    const result = await this.analyzeDocument(editor.document);
    this.showAnalysisResults(result);
  }

  public async showReport(): Promise<void> {
    // Create and show a webview with detailed report
    const panel = vscode.window.createWebviewPanel(
      'cxgReport',
      'CXG Security Report',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    panel.webview.html = this.getWebviewContent();
  }

  public async showSettings(): Promise<void> {
    // Open CXG settings
    vscode.commands.executeCommand('workbench.action.openSettings', 'cxg');
  }

  private async analyzeDocument(document: vscode.TextDocument): Promise<AnalysisResult> {
    const code = document.getText();
    const language = document.languageId;
    const fileName = path.basename(document.fileName);

    return await this.analysisEngine.analyzeCode(code, language, fileName);
  }

  private showAnalysisResults(result: AnalysisResult): void {
    if (result.riskLevel === 'high') {
      vscode.window.showErrorMessage(
        `High risk detected: ${result.detectedPatterns.join(', ')}`
      );
    } else if (result.riskLevel === 'medium') {
      vscode.window.showWarningMessage(
        `Medium risk detected: ${result.detectedPatterns.join(', ')}`
      );
    } else {
      vscode.window.showInformationMessage('✅ No security risks detected');
    }
  }

  private getWebviewContent(): string {
    const recentScans = this.analysisEngine.getRecentScans();
    const summary = this.analysisEngine.getSecuritySummary();

    const scanRows = recentScans
      .map(
        (scan) => `
        <tr class="scan-row ${scan.riskLevel}">
            <td>${scan.fileName}</td>
            <td>${scan.timestamp.toLocaleString()}</td>
            <td><span class="risk-badge ${scan.riskLevel}">${scan.riskLevel.toUpperCase()}</span></td>
            <td>${scan.detectedPatterns.join(', ') || 'None'}</td>
        </tr>
    `
      )
      .join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CXG Security Report</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    padding: 20px;
                }
                .header {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                }
                .summary-card {
                    padding: 15px;
                    border-radius: 6px;
                    border: 1px solid var(--vscode-panel-border);
                    text-align: center;
                }
                .summary-card h3 {
                    margin: 0 0 5px 0;
                    font-size: 24px;
                }
                .summary-card p {
                    margin: 0;
                    opacity: 0.8;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                th {
                    background: var(--vscode-editor-selectionBackground);
                    font-weight: 600;
                }
                .risk-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .risk-badge.high {
                    background: var(--vscode-errorBackground);
                    color: var(--vscode-errorForeground);
                }
                .risk-badge.medium {
                    background: var(--vscode-warningBackground);
                    color: var(--vscode-warningForeground);
                }
                .risk-badge.low {
                    background: var(--vscode-inputValidation-infoBackground);
                    color: var(--vscode-inputValidation-infoForeground);
                }
                .scan-row.high {
                    background: rgba(255, 0, 0, 0.1);
                }
                .scan-row.medium {
                    background: rgba(255, 165, 0, 0.1);
                }
                .no-scans {
                    text-align: center;
                    padding: 40px;
                    opacity: 0.6;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🛡️ CXG Security Report</h1>
                <p>Real-time security analysis for your code</p>
            </div>
            
            <div class="summary">
                <div class="summary-card">
                    <h3>${summary.total}</h3>
                    <p>Total Scans</p>
                </div>
                <div class="summary-card">
                    <h3>${summary.high}</h3>
                    <p>High Risk</p>
                </div>
                <div class="summary-card">
                    <h3>${summary.medium}</h3>
                    <p>Medium Risk</p>
                </div>
                <div class="summary-card">
                    <h3>${summary.low}</h3>
                    <p>Low Risk</p>
                </div>
            </div>
            
            <h3>Recent Scans</h3>
            ${
              recentScans.length > 0
                ? `
                <table>
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Timestamp</th>
                            <th>Risk Level</th>
                            <th>Detected Patterns</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scanRows}
                    </tbody>
                </table>
            `
                : `
                <div class="no-scans">
                    <p>No scans performed yet. Create and edit some files to see security analysis.</p>
                </div>
            `
            }
        </body>
        </html>
        `;
  }
  public dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
  }
}
