import * as vscode from 'vscode';
import { AnalysisResult } from '../analysis/LocalAnalysisEngine';

/**
 * SecurityReportView class to display the security dashboard in VS Code.
 * It shows recent scans, summary metrics, and server status.
 */
export class SecurityReportView {
    public static show(recentScans: AnalysisResult[], summary: any, isServerOnline: boolean): void {
        const panel = vscode.window.createWebviewPanel(
            'cxgSecurityReport',
            '🛡️ CXG Security Dashboard',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getHtml(recentScans, summary, isServerOnline);
    }

    private static getHtml(recentScans: AnalysisResult[], summary: any, isServerOnline: boolean): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CXG Security Dashboard</title>
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

                    .dashboard-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 32px;
                        padding-bottom: 16px;
                        border-bottom: 2px solid var(--vscode-panel-border);
                    }

                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }

                    .logo {
                        font-size: 32px;
                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                    }

                    .header-text h1 {
                        font-size: 28px;
                        font-weight: 700;
                        margin-bottom: 4px;
                    }

                    .header-text .tagline {
                        color: var(--vscode-descriptionForeground);
                        font-size: 14px;
                    }

                    .server-status {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .server-online {
                        background: #dcfce7;
                        color: #166534;
                        border: 1px solid #22c55e;
                    }

                    .server-offline {
                        background: #fef2f2;
                        color: #991b1b;
                        border: 1px solid #ef4444;
                    }

                    .metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 20px;
                        margin-bottom: 32px;
                    }

                    .metric-card {
                        background: var(--vscode-sideBar-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 12px;
                        padding: 24px;
                        position: relative;
                        overflow: hidden;
                        transition: all 0.2s ease;
                    }

                    .metric-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }

                    .metric-card.high-risk {
                        border-color: #ef4444;
                        background: linear-gradient(135deg, var(--vscode-sideBar-background) 0%, #fef2f2 100%);
                    }

                    .metric-card.medium-risk {
                        border-color: #f59e0b;
                        background: linear-gradient(135deg, var(--vscode-sideBar-background) 0%, #fffbeb 100%);
                    }

                    .metric-card.low-risk {
                        border-color: #22c55e;
                        background: linear-gradient(135deg, var(--vscode-sideBar-background) 0%, #f0fdf4 100%);
                    }

                    .metric-card.total {
                        border-color: #3b82f6;
                        background: linear-gradient(135deg, var(--vscode-sideBar-background) 0%, #eff6ff 100%);
                    }

                    .metric-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 16px;
                    }

                    .metric-icon {
                        font-size: 24px;
                        opacity: 0.8;
                    }

                    .metric-value {
                        font-size: 36px;
                        font-weight: 700;
                        line-height: 1;
                    }

                    .metric-label {
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 4px;
                    }

                    .recent-scans {
                        background: var(--vscode-sideBar-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 12px;
                        overflow: hidden;
                    }

                    .section-header {
                        background: var(--vscode-panel-background);
                        padding: 20px 24px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }

                    .section-title {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 18px;
                        font-weight: 600;
                    }

                    .scan-count {
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 600;
                    }

                    .scans-list {
                        max-height: 400px;
                        overflow-y: auto;
                    }

                    .scan-item {
                        padding: 16px 24px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        transition: background 0.2s ease;
                    }

                    .scan-item:hover {
                        background: var(--vscode-list-hoverBackground);
                    }

                    .scan-item:last-child {
                        border-bottom: none;
                    }

                    .scan-info {
                        flex: 1;
                    }

                    .scan-filename {
                        font-weight: 600;
                        margin-bottom: 4px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .file-icon {
                        font-size: 16px;
                        opacity: 0.7;
                    }

                    .scan-details {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        display: flex;
                        gap: 16px;
                    }

                    .risk-badge {
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .risk-high {
                        background: #fef2f2;
                        color: #991b1b;
                        border: 1px solid #fecaca;
                    }

                    .risk-medium {
                        background: #fffbeb;
                        color: #92400e;
                        border: 1px solid #fed7aa;
                    }

                    .risk-low {
                        background: #f0fdf4;
                        color: #166534;
                        border: 1px solid #bbf7d0;
                    }

                    .empty-state {
                        text-align: center;
                        padding: 60px 24px;
                        color: var(--vscode-descriptionForeground);
                    }

                    .empty-icon {
                        font-size: 64px;
                        margin-bottom: 16px;
                        opacity: 0.3;
                    }

                    .empty-title {
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 8px;
                    }

                    .empty-description {
                        font-size: 14px;
                        line-height: 1.5;
                    }

                    .quick-actions {
                        display: flex;
                        gap: 12px;
                        margin-top: 24px;
                        justify-content: center;
                        flex-wrap: wrap;
                    }

                    .action-btn {
                        padding: 10px 20px;
                        border-radius: 8px;
                        border: 1px solid var(--vscode-button-border);
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        text-decoration: none;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .action-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                        transform: translateY(-1px);
                    }

                    .action-btn-secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }

                    .action-btn-secondary:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }

                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }

                    .pulse {
                        animation: pulse 2s infinite;
                    }
                </style>
            </head>
            <body>
                <div class="dashboard-header">
                    <div class="header-left">
                        <div class="logo">🛡️</div>
                        <div class="header-text">
                            <h1>Security Dashboard</h1>
                            <div class="tagline">Real-time protection for your code</div>
                        </div>
                    </div>
                    <div class="server-status ${isServerOnline ? 'server-online' : 'server-offline'}">
                        <span>${isServerOnline ? '●' : '●'}</span>
                        Backend ${isServerOnline ? 'Online' : 'Offline'}
                    </div>
                </div>

                <div class="metrics-grid">
                    <div class="metric-card high-risk">
                        <div class="metric-header">
                            <div class="metric-icon">🚨</div>
                        </div>
                        <div class="metric-value ${summary.high > 0 ? 'pulse' : ''}">${summary.high}</div>
                        <div class="metric-label">High Risk Files</div>
                    </div>
                    <div class="metric-card medium-risk">
                        <div class="metric-header">
                            <div class="metric-icon">⚠️</div>
                        </div>
                        <div class="metric-value">${summary.medium}</div>
                        <div class="metric-label">Medium Risk Files</div>
                    </div>
                    <div class="metric-card low-risk">
                        <div class="metric-header">
                            <div class="metric-icon">✅</div>
                        </div>
                        <div class="metric-value">${summary.low}</div>
                        <div class="metric-label">Low Risk Files</div>
                    </div>
                    <div class="metric-card total">
                        <div class="metric-header">
                            <div class="metric-icon">📊</div>
                        </div>
                        <div class="metric-value">${summary.total}</div>
                        <div class="metric-label">Total Scans</div>
                    </div>
                </div>

                <div class="recent-scans">
                    <div class="section-header">
                        <div class="section-title">
                            <span>📋</span>
                            Recent Activity
                        </div>
                        <div class="scan-count">${recentScans.length} scans</div>
                    </div>
                    
                    ${recentScans.length > 0 ? `
                        <div class="scans-list">
                            ${recentScans.map(scan => `
                                <div class="scan-item">
                                    <div class="scan-info">
                                        <div class="scan-filename">
                                            <span class="file-icon">${this.getFileIcon(scan.fileName)}</span>
                                            ${scan.fileName}
                                        </div>
                                        <div class="scan-details">
                                            <span>📅 ${scan.timestamp.toLocaleString()}</span>
                                            <span>🔍 ${scan.detectedPatterns.length} patterns</span>
                                        </div>
                                    </div>
                                    <div class="risk-badge risk-${scan.riskLevel}">${scan.riskLevel}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-icon">🔍</div>
                            <div class="empty-title">No Scans Yet</div>
                            <div class="empty-description">
                                Start coding to see security analysis results here.<br>
                                CXG will automatically scan your files as you work.
                            </div>
                        </div>
                    `}
                </div>

                <div class="quick-actions">
                    <button class="action-btn" onclick="vscode.postMessage({command: 'scanCurrentFile'})">
                        <span>🔍</span>
                        Scan Current File
                    </button>
                    <button class="action-btn action-btn-secondary" onclick="vscode.postMessage({command: 'openSettings'})">
                        <span>⚙️</span>
                        Settings
                    </button>
                    <button class="action-btn action-btn-secondary" onclick="vscode.postMessage({command: 'refresh'})">
                        <span>🔄</span>
                        Refresh
                    </button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    // Handle message passing to VS Code
                    function sendCommand(command) {
                        vscode.postMessage({ command: command });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private static getFileIcon(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const iconMap: { [key: string]: string } = {
            'js': '📄',
            'ts': '📘',
            'jsx': '⚛️',
            'tsx': '⚛️',
            'py': '🐍',
            'go': '🔷',
            'java': '☕',
            'cs': '🔷',
            'php': '🐘',
            'rb': '💎',
            'cpp': '⚙️',
            'c': '⚙️',
            'h': '⚙️'
        };
        return iconMap[ext || ''] || '📄';
    }
}