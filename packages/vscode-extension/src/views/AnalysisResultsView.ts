import * as vscode from 'vscode';
import { AnalysisResult } from '../analysis/LocalAnalysisEngine';

// This class is responsible for displaying the analysis results in a webview panel
export class AnalysisResultsView {
    public static show(result: AnalysisResult): void {
        const panel = vscode.window.createWebviewPanel(
            'cxgAnalysisResults',
            `🛡️ CXG Analysis - ${result.fileName}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: []
            }
        );

        panel.webview.html = this.getHtml(result);
    }

    private static getHtml(result: AnalysisResult): string {
        const riskColors = {
            high: { bg: '#fef2f2', border: '#ef4444', icon: '🚨' },
            medium: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️' },
            low: { bg: '#f0fdf4', border: '#22c55e', icon: '✅' }
        };

        const colors = riskColors[result.riskLevel];

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CXG Analysis Results</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        line-height: 1.6;
                        padding: 24px;
                    }

                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                    }

                    .header {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                        margin-bottom: 32px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }

                    .header-icon {
                        font-size: 32px;
                        filter: grayscale(0%);
                    }

                    .header-content h1 {
                        font-size: 24px;
                        font-weight: 600;
                        margin-bottom: 4px;
                    }

                    .header-content .subtitle {
                        color: var(--vscode-descriptionForeground);
                        font-size: 14px;
                    }

                    .risk-banner {
                        background: ${colors.bg};
                        border: 2px solid ${colors.border};
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 24px;
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }

                    .risk-icon {
                        font-size: 28px;
                    }

                    .risk-content h2 {
                        color: ${colors.border};
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 4px;
                        text-transform: uppercase;
                    }

                    .risk-description {
                        color: var(--vscode-descriptionForeground);
                        font-size: 14px;
                    }

                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 16px;
                        margin-bottom: 32px;
                    }

                    .stat-card {
                        background: var(--vscode-sideBar-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 16px;
                        text-align: center;
                    }

                    .stat-value {
                        font-size: 24px;
                        font-weight: 700;
                        color: var(--vscode-charts-foreground);
                        display: block;
                    }

                    .stat-label {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-top: 4px;
                    }

                    .section {
                        background: var(--vscode-sideBar-background);
                        border-radius: 8px;
                        margin-bottom: 24px;
                        overflow: hidden;
                        border: 1px solid var(--vscode-panel-border);
                    }

                    .section-header {
                        background: var(--vscode-panel-background);
                        padding: 16px 20px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .section-header h3 {
                        font-size: 16px;
                        font-weight: 600;
                        margin: 0;
                    }

                    .section-content {
                        padding: 20px;
                    }

                    .match-item {
                        background: var(--vscode-editor-background);
                        border-radius: 6px;
                        padding: 16px;
                        margin-bottom: 12px;
                        border-left: 4px solid transparent;
                        transition: all 0.2s ease;
                    }

                    .match-item:hover {
                        background: var(--vscode-list-hoverBackground);
                    }

                    .match-item.severity-high {
                        border-left-color: #ef4444;
                    }

                    .match-item.severity-medium {
                        border-left-color: #f59e0b;
                    }

                    .match-item.severity-low {
                        border-left-color: #22c55e;
                    }

                    .match-header {
                        display: flex;
                        justify-content: between;
                        align-items: center;
                        margin-bottom: 8px;
                    }

                    .match-type {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }

                    .match-location {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        background: var(--vscode-badge-background);
                        padding: 2px 8px;
                        border-radius: 12px;
                    }

                    .match-code {
                        background: var(--vscode-textCodeBlock-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        padding: 12px;
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        font-size: 13px;
                        overflow-x: auto;
                        margin-top: 8px;
                    }

                    .suggestions-list {
                        list-style: none;
                    }

                    .suggestions-list li {
                        padding: 12px 0;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                    }

                    .suggestions-list li:last-child {
                        border-bottom: none;
                    }

                    .suggestion-icon {
                        color: var(--vscode-charts-blue);
                        margin-top: 2px;
                    }

                    .empty-state {
                        text-align: center;
                        padding: 40px 20px;
                        color: var(--vscode-descriptionForeground);
                    }

                    .empty-state-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                        opacity: 0.5;
                    }

                    .action-buttons {
                        display: flex;
                        gap: 12px;
                        margin-top: 24px;
                        justify-content: center;
                    }

                    .btn {
                        padding: 8px 16px;
                        border-radius: 6px;
                        border: 1px solid var(--vscode-button-border);
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        text-decoration: none;
                        font-size: 13px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }

                    .btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }

                    .btn-secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }

                    .btn-secondary:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="header-icon">🛡️</div>
                        <div class="header-content">
                            <h1>Security Analysis</h1>
                            <div class="subtitle">${result.fileName} • ${result.timestamp.toLocaleString()}</div>
                        </div>
                    </div>

                    <div class="risk-banner">
                        <div class="risk-icon">${colors.icon}</div>
                        <div class="risk-content">
                            <h2>${result.riskLevel} Risk</h2>
                            <div class="risk-description">
                                ${this.getRiskDescription(result.riskLevel)}
                            </div>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="stat-value">${result.matches.filter(m => m.severity === 'high').length}</span>
                            <div class="stat-label">High Priority</div>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${result.matches.filter(m => m.severity === 'medium').length}</span>
                            <div class="stat-label">Medium Priority</div>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${result.matches.filter(m => m.severity === 'low').length}</span>
                            <div class="stat-label">Low Priority</div>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${result.detectedPatterns.length}</span>
                            <div class="stat-label">Patterns Found</div>
                        </div>
                    </div>

                    ${result.matches.length > 0 ? `
                    <div class="section">
                        <div class="section-header">
                            <span>🔍</span>
                            <h3>Detected Issues</h3>
                        </div>
                        <div class="section-content">
                            ${result.matches.map(match => `
                                <div class="match-item severity-${match.severity}">
                                    <div class="match-header">
                                        <span class="match-type">${this.formatPatternName(match.pattern)}</span>
                                        <span class="match-location">Line ${match.line}:${match.column}</span>
                                    </div>
                                    <div class="match-code">${this.escapeHtml(match.text)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <div class="section">
                        <div class="section-header">
                            <span>💡</span>
                            <h3>Recommendations</h3>
                        </div>
                        <div class="section-content">
                            ${result.suggestions.length > 0 ? `
                                <ul class="suggestions-list">
                                    ${result.suggestions.map(suggestion => `
                                        <li>
                                            <span class="suggestion-icon">→</span>
                                            <span>${suggestion}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            ` : `
                                <div class="empty-state">
                                    <div class="empty-state-icon">✨</div>
                                    <div>No specific recommendations. Your code looks good!</div>
                                </div>
                            `}
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="btn" onclick="window.close()">Close</button>
                        <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(result)}, null, 2))">Copy Results</button>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    private static getRiskDescription(riskLevel: string): string {
        switch (riskLevel) {
            case 'high':
                return 'Critical security issues detected that require immediate attention';
            case 'medium':
                return 'Potential security concerns found that should be reviewed';
            case 'low':
                return 'Minor issues detected that are worth addressing';
            default:
                return 'Analysis completed successfully';
        }
    }

    private static formatPatternName(pattern: string): string {
        return pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    private static escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}