import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface AnalysisResult {
    hasSecrets: boolean;
    hasBusinessLogic: boolean;
    hasInfrastructureExposure: boolean;
    detectedPatterns: string[];
    riskLevel: 'low' | 'medium' | 'high';
    suggestions: string[];
}

export class LocalAnalysisEngine {
    private context: vscode.ExtensionContext;
    private dbPath: string;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.dbPath = path.join(context.globalStorageUri.fsPath, 'contextguard.db');
        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        // Create storage directory if it doesn't exist
        const storageDir = path.dirname(this.dbPath);
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        
        // Initialize SQLite database (placeholder for now)
        console.log(`Database initialized at: ${this.dbPath}`);
    }

    public async analyzeCode(code: string, language: string): Promise<AnalysisResult> {
        // Placeholder implementation - will be replaced with actual analysis
        const patterns = this.detectBasicPatterns(code);
        
        return {
            hasSecrets: patterns.includes('potential_secret'),
            hasBusinessLogic: patterns.includes('business_logic'),
            hasInfrastructureExposure: patterns.includes('infrastructure'),
            detectedPatterns: patterns,
            riskLevel: this.calculateRiskLevel(patterns),
            suggestions: this.generateSuggestions(patterns)
        };
    }

    private detectBasicPatterns(code: string): string[] {
        const patterns: string[] = [];
        
        // Basic secret detection patterns
        const secretPatterns = [
            /api[_-]?key[_-]?=.+/i,
            /password[_-]?=.+/i,
            /secret[_-]?=.+/i,
            /token[_-]?=.+/i,
            /private[_-]?key/i
        ];

        secretPatterns.forEach(pattern => {
            if (pattern.test(code)) {
                patterns.push('potential_secret');
            }
        });

        // Basic business logic detection
        if (code.includes('calculatePrice') || code.includes('algorithm') || code.includes('proprietary')) {
            patterns.push('business_logic');
        }

        // Basic infrastructure detection
        if (code.includes('localhost') || code.includes('127.0.0.1') || code.includes('internal')) {
            patterns.push('infrastructure');
        }

        return patterns;
    }

    private calculateRiskLevel(patterns: string[]): 'low' | 'medium' | 'high' {
        if (patterns.includes('potential_secret')) {
            return 'high';
        }
        if (patterns.includes('business_logic') || patterns.includes('infrastructure')) {
            return 'medium';
        }
        return 'low';
    }

    private generateSuggestions(patterns: string[]): string[] {
        const suggestions: string[] = [];
        
        if (patterns.includes('potential_secret')) {
            suggestions.push('Consider using environment variables for sensitive data');
            suggestions.push('Use a secrets management system');
        }
        
        if (patterns.includes('business_logic')) {
            suggestions.push('Review if this business logic should be shared with AI');
        }
        
        if (patterns.includes('infrastructure')) {
            suggestions.push('Avoid exposing internal infrastructure details');
        }

        return suggestions;
    }
}