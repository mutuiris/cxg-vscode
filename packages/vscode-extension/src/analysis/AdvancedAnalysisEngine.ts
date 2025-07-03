import * as vscode from 'vscode';
import { AnalysisResult } from './LocalAnalysisEngine';

export interface AdvancedAnalysisResult extends AnalysisResult {
    semanticAnalysis: SemanticAnalysis;
    mlConfidence: number;
    astAnalysis: ASTAnalysis;
}

export interface SemanticAnalysis {
    contextualSecrets: boolean;
    businessLogicComplexity: number;
    infrastructureExposure: string[];
}

export interface ASTAnalysis {
    functionCalls: string[];
    variableDeclarations: string[];
    importStatements: string[];
}

export class AdvancedAnalysisEngine {
    private readonly serverUrl = 'http://localhost:8080/api/v1';

    public async analyzeWithServer(code: string, language: string, fileName: string): Promise<AdvancedAnalysisResult> {
        try {
            const response = await fetch(`${this.serverUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    language,
                    fileName,
                }),
            });

            if (!response.ok) {
                throw new Error(`Analysis server error: ${response.statusText}`);
            }

            const result = await response.json();
            return this.convertToAdvancedResult(result);
        } catch (error) {
            console.error('Failed to analyze with server:', error);
            throw error;
        }
    }

    private convertToAdvancedResult(serverResult: any): AdvancedAnalysisResult {
        // Convert server response to this format
        return {
            hasSecrets: serverResult.result.secrets.length > 0,
            hasBusinessLogic: serverResult.result.businessLogic.length > 0,
            hasInfrastructureExposure: serverResult.result.infrastructure.length > 0,
            detectedPatterns: this.extractPatterns(serverResult.result),
            riskLevel: this.convertRiskLevel(serverResult.result.riskLevel),
            suggestions: this.generateSuggestions(serverResult.result),
            timestamp: new Date(),
            fileName: serverResult.fileName || 'unknown',
            matches: this.convertMatches(serverResult.result),
            semanticAnalysis: {
                contextualSecrets: serverResult.result.secrets.length > 0,
                businessLogicComplexity: serverResult.result.businessLogic.length,
                infrastructureExposure: serverResult.result.infrastructure.map((i: any) => i.type),
            },
            mlConfidence: serverResult.result.confidence || 0.5,
            astAnalysis: {
                functionCalls: serverResult.result.functionCalls || [],
                variableDeclarations: serverResult.result.variables || [],
                importStatements: serverResult.result.imports || [],
            },
        };
    }

    private extractPatterns(result: any): string[] {
        const patterns: string[] = [];
        if (result.secrets.length > 0) patterns.push('potential_secret');
        if (result.businessLogic.length > 0) patterns.push('business_logic');
        if (result.infrastructure.length > 0) patterns.push('infrastructure');
        return patterns;
    }

    private convertRiskLevel(level: number): 'low' | 'medium' | 'high' {
        switch (level) {
            case 0: return 'low';
            case 1: return 'medium';
            case 2: return 'high';
            default: return 'medium';
        }
    }

    private generateSuggestions(result: any): string[] {
        const suggestions: string[] = [];
        
        if (result.secrets.length > 0) {
            suggestions.push('Consider using environment variables for sensitive data');
        }
        
        if (result.businessLogic.length > 0) {
            suggestions.push('Review if this business logic should be shared with AI');
        }
        
        if (result.infrastructure.length > 0) {
            suggestions.push('Avoid exposing internal infrastructure details');
        }

        return suggestions;
    }

    private convertMatches(result: any): any[] {
        const matches: any[] = [];
        
        result.secrets.forEach((secret: any) => {
            matches.push({
                pattern: 'potential_secret',
                line: secret.line,
                column: secret.column,
                text: secret.value,
                severity: 'high',
            });
        });

        return matches;
    }
}