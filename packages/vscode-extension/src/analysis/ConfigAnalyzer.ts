import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface ConfigAnalysisResult {
    configType: 'package.json' | 'tsconfig.json' | '.env' | 'webpack.config.js' | 'other';
    fileName: string;
    risks: ConfigRisk[];
    suggestions: string[];
    frameworkDetected?: string;
}

export interface ConfigRisk {
    type: 'exposed_script' | 'dev_dependency_in_prod' | 'insecure_config' | 'credential_exposure';
    severity: 'high' | 'medium' | 'low';
    description: string;
    location?: string;
    line?: number;
}

export class ConfigAnalyzer {
    
    public async analyzeWorkspaceConfigs(): Promise<ConfigAnalysisResult[]> {
        const results: ConfigAnalysisResult[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders) return results;
        
        for (const folder of workspaceFolders) {
            const configFiles = await this.findConfigFiles(folder.uri.fsPath);
            
            for (const configFile of configFiles) {
                const analysis = await this.analyzeConfigFile(configFile);
                if (analysis) {
                    results.push(analysis);
                }
            }
        }
        
        return results;
    }
    
    private async findConfigFiles(rootPath: string): Promise<string[]> {
        const configFiles: string[] = [];
        
        try {
            const packageJsonPath = path.join(rootPath, 'package.json');
            await fs.access(packageJsonPath);
            configFiles.push(packageJsonPath);
        } catch {
            // File doesn't exist
        }
        
        return configFiles;
    }
    
    private async analyzeConfigFile(filePath: string): Promise<ConfigAnalysisResult | null> {
        const fileName = path.basename(filePath);
        
        if (fileName === 'package.json') {
            return this.analyzePackageJson(filePath);
        }
        
        return null;
    }
    
    public async analyzePackageJson(filePath: string): Promise<ConfigAnalysisResult> {
        const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
        const risks: ConfigRisk[] = [];
        const suggestions: string[] = [];
        
        // Detect framework
        let frameworkDetected = 'unknown';
        if (content.dependencies?.react || content.devDependencies?.react) {
            frameworkDetected = 'react';
        } else if (content.dependencies?.['@angular/core']) {
            frameworkDetected = 'angular';
        } else if (content.dependencies?.next) {
            frameworkDetected = 'nextjs';
        } else if (content.dependencies?.express) {
            frameworkDetected = 'nodejs-express';
        }
        
        // Check for exposed scripts
        if (content.scripts) {
            for (const [scriptName, scriptValue] of Object.entries(content.scripts as Record<string, string>)) {
                if (scriptValue.includes('password') || scriptValue.includes('token') || scriptValue.includes('api_key')) {
                    risks.push({
                        type: 'exposed_script',
                        severity: 'high',
                        description: `Script "${scriptName}" may contain sensitive credentials`,
                        location: `scripts.${scriptName}`
                    });
                }
            }
        }
        
        // Generate suggestions based on framework
        if (frameworkDetected === 'react') {
            suggestions.push('Consider using environment variables for API endpoints');
            suggestions.push('Review build output for exposed secrets');
        }
        
        return {
            configType: 'package.json',
            fileName: path.basename(filePath),
            risks,
            suggestions,
            frameworkDetected
        };
    }
}