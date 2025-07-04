import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from '../configuration/ConfigurationManager';
import { LocalAnalysisEngine, AnalysisResult } from '../analysis/LocalAnalysisEngine';

/**
 * CXGProvider manages the core functionality of the CXG extension
 * Coordinates between analysis engine, configuration, and user interface
 */
export class CXGProvider implements vscode.Disposable {
    private context: vscode.ExtensionContext;
    private config: ConfigurationManager;
    private analysisEngine: LocalAnalysisEngine;
    private disposables: vscode.Disposable[] = [];
    private isEnabled: boolean = true;

    constructor(
        context: vscode.ExtensionContext,
        config: ConfigurationManager,
        analysisEngine: LocalAnalysisEngine
    ) {
        this.context = context;
        this.config = config;
        this.analysisEngine = analysisEngine;
        
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
                    await this.analyzeDocument(editor.document);
                }
            })
        );
    }

    /**
     * Check if a document should be analyzed based on language and settings
     */
    private shouldAnalyzeDocument(document: vscode.TextDocument): boolean {
        const supportedLanguages = ['javascript', 'typescript', 'python', 'go', 'java', 'csharp'];
        return supportedLanguages.includes(document.languageId) && 
               document.uri.scheme === 'file';
    }

    /**
     * Analyze a document and handle the results
     */
    private async analyzeDocument(document: vscode.TextDocument): Promise<AnalysisResult> {
        const code = document.getText();
        const language = document.languageId;
        const fileName = path.basename(document.fileName);

        console.log(`CXG: Analyzing document ${fileName} (${language})`);

        try {
            const result = await this.analysisEngine.analyzeCode(code, language, fileName);
            
            // Handle analysis results
            if (result.riskLevel === 'high') {
                vscode.window.showWarningMessage(
                    `CXG: High risk detected in ${fileName}. Click to view details.`,
                    'View Details'
                ).then(selection => {
                    if (selection === 'View Details') {
                        this.showAnalysisResults(result);
                    }
                });
            } else if (result.riskLevel === 'medium') {
                vscode.window.showInformationMessage(
                    `CXG: Medium risk detected in ${fileName}. Consider reviewing.`,
                    'View Details'
                ).then(selection => {
                    if (selection === 'View Details') {
                        this.showAnalysisResults(result);
                    }
                });
            }

            return result;
        } catch (error) {
            console.error('CXG: Analysis failed:', error);
            vscode.window.showErrorMessage(`CXG: Analysis failed for ${fileName}: ${error}`);
            throw error;
        }
    }

    /**
     * Show detailed analysis results to the user
     */
    private showAnalysisResults(result: AnalysisResult): void {
        const panel = vscode.window.createWebviewPanel(
            'cxgAnalysisResults',
            'CXG Analysis Results',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getAnalysisResultsHtml(result);
    }

    /**
     * Generate HTML for analysis results webview
     */
    private getAnalysisResultsHtml(result: AnalysisResult): string {
        const riskColor = result.riskLevel === 'high' ? '#e74c3c' : 
                         result.riskLevel === 'medium' ? '#f39c12' : '#27ae60';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
                    .risk-level { color: ${riskColor}; font-weight: bold; font-size: 18px; }
                    .section { margin: 20px 0; padding: 15px; border-left: 4px solid ${riskColor}; }
                    .match { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 4px; }
                    .severity-high { border-left: 4px solid #e74c3c; }
                    .severity-medium { border-left: 4px solid #f39c12; }
                    .severity-low { border-left: 4px solid #27ae60; }
                </style>
            </head>
            <body>
                <h1>🛡️ CXG Analysis Results</h1>
                <div class="section">
                    <h2>File: ${result.fileName}</h2>
                    <p><strong>Risk Level:</strong> <span class="risk-level">${result.riskLevel.toUpperCase()}</span></p>
                    <p><strong>Patterns Detected:</strong> ${result.detectedPatterns.join(', ') || 'None'}</p>
                    <p><strong>Scan Time:</strong> ${result.timestamp.toLocaleString()}</p>
                </div>

                ${result.matches.length > 0 ? `
                <div class="section">
                    <h3>Detected Issues:</h3>
                    ${result.matches.map(match => `
                        <div class="match severity-${match.severity}">
                            <strong>${match.pattern}</strong> (Line ${match.line}:${match.column})
                            <br><code>${match.text}</code>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                <div class="section">
                    <h3>Recommendations:</h3>
                    <ul>
                        ${result.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>

                <div class="section">
                    <h3>Summary:</h3>
                    <ul>
                        <li>Secrets: ${result.hasSecrets ? '⚠️ Detected' : '✅ None'}</li>
                        <li>Business Logic: ${result.hasBusinessLogic ? '⚠️ Detected' : '✅ None'}</li>
                        <li>Infrastructure: ${result.hasInfrastructureExposure ? '⚠️ Detected' : '✅ None'}</li>
                    </ul>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Enable CXG protection
     */
    public async enable(): Promise<void> {
        await this.config.setEnabled(true);
        this.isEnabled = true;
        vscode.window.showInformationMessage('🛡️ CXG protection enabled');
    }

    /**
     * Disable CXG protection
     */
    public async disable(): Promise<void> {
        await this.config.setEnabled(false);
        this.isEnabled = false;
        vscode.window.showInformationMessage('🛡️ CXG protection disabled');
    }

    /**
     * Scan the currently active file
     */
    public async scanCurrentFile(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active file to scan');
            return;
        }

        const result = await this.analyzeDocument(editor.document);
        this.showAnalysisResults(result);
    }

    /**
     * Show analysis report
     */
    public async showReport(): Promise<void> {
        const recentScans = this.analysisEngine.getRecentScans();
        const summary = this.analysisEngine.getSecuritySummary();

        const panel = vscode.window.createWebviewPanel(
            'cxgReport',
            'CXG Security Report',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getReportHtml(recentScans, summary);
    }

    /**
     * Generate HTML for security report
     */
    private getReportHtml(recentScans: AnalysisResult[], summary: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
                    .summary { display: flex; gap: 20px; margin: 20px 0; }
                    .card { flex: 1; padding: 15px; border-radius: 8px; text-align: center; }
                    .card-high { background: #ffe6e6; border: 2px solid #e74c3c; }
                    .card-medium { background: #fff3e0; border: 2px solid #f39c12; }
                    .card-low { background: #e8f5e8; border: 2px solid #27ae60; }
                    .scan-item { padding: 10px; margin: 10px 0; border-left: 4px solid #ddd; }
                    .server-status { float: right; padding: 5px 10px; border-radius: 4px; }
                    .server-online { background: #d4edda; color: #155724; }
                    .server-offline { background: #f8d7da; color: #721c24; }
                </style>
            </head>
            <body>
                <h1>🛡️ CXG Security Report</h1>
                
                <div class="server-status ${this.analysisEngine.isServerAvailable() ? 'server-online' : 'server-offline'}">
                    Backend: ${this.analysisEngine.isServerAvailable() ? 'Online' : 'Offline'}
                </div>

                <div class="summary">
                    <div class="card card-high">
                        <h3>High Risk</h3>
                        <p>${summary.high}</p>
                    </div>
                    <div class="card card-medium">
                        <h3>Medium Risk</h3>
                        <p>${summary.medium}</p>
                    </div>
                    <div class="card card-low">
                        <h3>Low Risk</h3>
                        <p>${summary.low}</p>
                    </div>
                </div>

                <h2>Recent Scans</h2>
                ${recentScans.length > 0 ? recentScans.map(scan => `
                    <div class="scan-item">
                        <strong>${scan.fileName}</strong> - ${scan.riskLevel.toUpperCase()}
                        <br><small>${scan.timestamp.toLocaleString()}</small>
                        <br>Patterns: ${scan.detectedPatterns.join(', ') || 'None'}
                    </div>
                `).join('') : '<p>No recent scans available</p>'}
            </body>
            </html>
        `;
    }

    /**
     * Show CXG settings
     */
    public async showSettings(): Promise<void> {
        vscode.commands.executeCommand('workbench.action.openSettings', 'cxg');
    }

    /**
     * Dispose of all resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
    }
}
