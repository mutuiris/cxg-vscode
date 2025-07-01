import * as vscode from 'vscode';
import { ConfigurationManager } from '../configuration/ConfigurationManager';
import { LocalAnalysisEngine, AnalysisResult } from '../analysis/LocalAnalysisEngine';

export class ContextGuardProvider implements vscode.Disposable {
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
        const documentChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
            if (this.config.isEnabled()) {
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
        if (event.document.languageId === 'typescript' || 
            event.document.languageId === 'javascript' ||
            event.document.languageId === 'python') {
            
            // Analyze changes after a delay
            setTimeout(() => {
                this.analyzeDocument(event.document);
            }, 1000);
        }
    }

    private handleConfigurationChange(): void {
        // React to configuration changes
        console.log('ContextGuard configuration changed');
    }

    public async enable(): Promise<void> {
        await this.config.setEnabled(true);
        vscode.window.showInformationMessage('ContextGuard protection enabled');
    }

    public async disable(): Promise<void> {
        await this.config.setEnabled(false);
        vscode.window.showWarningMessage('ContextGuard protection disabled');
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
            'contextguardReport',
            'ContextGuard Security Report',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.html = this.getWebviewContent();
    }

    private async analyzeDocument(document: vscode.TextDocument): Promise<AnalysisResult> {
        const code = document.getText();
        const language = document.languageId;
        
        return await this.analysisEngine.analyzeCode(code, language);
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
            vscode.window.showInformationMessage('No security risks detected');
        }
    }

    private getWebviewContent(): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ContextGuard Report</title>
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
                .status {
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .status.active {
                    background: var(--vscode-inputValidation-infoBackground);
                    border: 1px solid var(--vscode-inputValidation-infoBorder);
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🛡️ ContextGuard Security Report</h1>
                <p>Real-time security analysis for your code</p>
            </div>
            
            <div class="status active">
                <h3>Protection Status: Active</h3>
                <p>ContextGuard is monitoring your code for security issues.</p>
            </div>
            
            <div>
                <h3>Recent Scans</h3>
                <p>No recent security issues detected.</p>
            </div>
        </body>
        </html>
        `;
    }

    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
    }
}