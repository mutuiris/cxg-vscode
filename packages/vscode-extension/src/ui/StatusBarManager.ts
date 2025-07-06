import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private animationInterval?: NodeJS.Timeout;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'cxg.showReport';
    this.updateStatus('active', 'CXG is protecting your code');
    this.statusBarItem.show();
  }

  public updateStatus(
    status: 'active' | 'inactive' | 'scanning' | 'warning' | 'error',
    message?: string
  ): void {
    // Clear any existing animation
    this.clearAnimation();

    switch (status) {
      case 'active':
        this.statusBarItem.text = '$(shield-check) CXG';
        this.statusBarItem.tooltip = message || 'CXG Protection Active - Click for security report';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
        break;

      case 'inactive':
        this.statusBarItem.text = '$(shield-x) CXG';
        this.statusBarItem.tooltip = message || 'CXG Protection Disabled - Click to enable';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        break;

      case 'scanning':
        this.startScanningAnimation();
        this.statusBarItem.tooltip = message || 'Scanning for security issues...';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
        break;

      case 'warning':
        this.statusBarItem.text = '$(warning) CXG';
        this.statusBarItem.tooltip = message || 'Security issues detected - Click for details';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        this.pulseEffect();
        break;

      case 'error':
        this.statusBarItem.text = '$(error) CXG';
        this.statusBarItem.tooltip = message || 'CXG encountered an error - Click for help';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        break;
    }
  }

  private startScanningAnimation(): void {
    const frames = ['$(loading~spin)', '$(search)', '$(shield)'];
    let frameIndex = 0;

    this.animationInterval = setInterval(() => {
      this.statusBarItem.text = `${frames[frameIndex]} CXG`;
      frameIndex = (frameIndex + 1) % frames.length;
    }, 500);
  }

  private pulseEffect(): void {
    let isPulsing = false;
    this.animationInterval = setInterval(() => {
      if (isPulsing) {
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
      } else {
        this.statusBarItem.backgroundColor = undefined;
      }
      isPulsing = !isPulsing;
    }, 800);
  }

  private clearAnimation(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = undefined;
    }
  }

  public dispose(): void {
    this.clearAnimation();
    this.statusBarItem.dispose();
  }
}
