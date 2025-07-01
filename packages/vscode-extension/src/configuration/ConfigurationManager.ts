import * as vscode from 'vscode';

export class ConfigurationManager {
    private static readonly CONFIG_SECTION = 'contextguard';

    public isEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<boolean>('enabled', true);
    }

    public getSecurityLevel(): 'strict' | 'balanced' | 'permissive' {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<'strict' | 'balanced' | 'permissive'>('securityLevel', 'balanced');
    }

    public isOfflineModeEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<boolean>('offlineMode', true);
    }

    public async setEnabled(enabled: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        await config.update('enabled', enabled, vscode.ConfigurationTarget.Global);
    }

    public async setSecurityLevel(level: 'strict' | 'balanced' | 'permissive'): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        await config.update('securityLevel', level, vscode.ConfigurationTarget.Global);
    }

    public onConfigurationChanged(listener: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(ConfigurationManager.CONFIG_SECTION)) {
                listener();
            }
        });
    }
}