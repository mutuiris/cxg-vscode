import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'contextguard.showReport';
        this.updateStatus('active', 'ContextGuard is protecting your code');
        this.statusBarItem.show();
    }

    public updateStatus(status: 'active' | 'inactive' | 'scanning' | 'error', message?: string): void {
        switch (status) {
            case 'active':
                this.statusBarItem.text = '$(shield) ContextGuard';
                this.statusBarItem.tooltip = message || 'ContextGuard is active';
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'inactive':
                this.statusBarItem.text = '$(shield) ContextGuard (Off)';
                this.statusBarItem.tooltip = message || 'ContextGuard is disabled';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case 'scanning':
                this.statusBarItem.text = '$(loading~spin) ContextGuard';
                this.statusBarItem.tooltip = message || 'Scanning for security issues...';
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'error':
                this.statusBarItem.text = '$(error) ContextGuard';
                this.statusBarItem.tooltip = message || 'ContextGuard encountered an error';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}