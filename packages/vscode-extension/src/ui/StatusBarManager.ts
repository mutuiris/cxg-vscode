import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'cxg.showReport';
        this.updateStatus('active', 'CXG is protecting your code');
        this.statusBarItem.show();
    }

    public updateStatus(status: 'active' | 'inactive' | 'scanning' | 'error', message?: string): void {
        switch (status) {
            case 'active':
                this.statusBarItem.text = '$(shield) CXG';
                this.statusBarItem.tooltip = message || 'CXG is active';
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'inactive':
                this.statusBarItem.text = '$(shield) CXG (Off)';
                this.statusBarItem.tooltip = message || 'CXG is disabled';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case 'scanning':
                this.statusBarItem.text = '$(loading~spin) CXG';
                this.statusBarItem.tooltip = message || 'Scanning for security issues...';
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'error':
                this.statusBarItem.text = '$(error) CXG';
                this.statusBarItem.tooltip = message || 'CXG encountered an error';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}