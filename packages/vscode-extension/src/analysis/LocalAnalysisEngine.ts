import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';

export interface AnalysisResult {
    hasSecrets: boolean;
    hasBusinessLogic: boolean;
    hasInfrastructureExposure: boolean;
    detectedPatterns: string[];
    riskLevel: 'low' | 'medium' | 'high';
    suggestions: string[];
    timestamp: Date;
    fileName: string;
    matches: Match[];
}

export interface Match {
    pattern: string;
    line: number;
    column: number;
    text: string;
    severity: 'high' | 'medium' | 'low';
}

export class LocalAnalysisEngine {
    private readonly context: vscode.ExtensionContext;
    private readonly dbPath: string;
    private readonly recentScans: AnalysisResult[] = [];
    private readonly maxRecentScans = 50; // Prevent memory bloat
    private saveOperationMutex = Promise.resolve(); // Prevent race conditions
    private disposed = false;
    
    // Performance optimizations
    private readonly patternCache = new Map<string, RegExp>();
    private readonly analysisCache = new Map<string, AnalysisResult>();
    private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.dbPath = path.join(context.globalStorageUri.fsPath, 'cxg-analysis.db');
        
        this.initializeAsync().catch(error => {
            console.error('CXG: Failed to initialize LocalAnalysisEngine:', error);
        });

        // Cleanup on extension deactivation
        context.subscriptions.push({
            dispose: () => this.dispose()
        });
    }

    private async initializeAsync(): Promise<void> {
        try {
            await this.ensureStorageDirectory();
            await this.loadRecentScans();
        } catch (error) {
            console.error('CXG: Initialization failed:', error);
            throw error;
        }
    }

    private async ensureStorageDirectory(): Promise<void> {
        const storageDir = path.dirname(this.dbPath);
        try {
            await fs.access(storageDir);
        } catch {
            await fs.mkdir(storageDir, { recursive: true });
        }
    }

    private async loadRecentScans(): Promise<void> {
        const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
        
        try {
            const data = await fs.readFile(scansPath, 'utf8');
            const scans = JSON.parse(data) as AnalysisResult[];
            
            // Validate and sanitize loaded data
            const validScans = scans
                .filter(scan => scan && typeof scan === 'object' && scan.timestamp)
                .slice(-this.maxRecentScans);
            
            this.recentScans.splice(0, this.recentScans.length, ...validScans);
        } catch (error) {
            // File doesn't exist or is corrupted; start fresh
            console.log('CXG: No existing scans found, starting fresh');
        }
    }

    private async saveRecentScans(): Promise<void> {
        if (this.disposed) return;

        // Using mutex to prevent race conditions
        this.saveOperationMutex = this.saveOperationMutex
            .then(async () => {
                if (this.disposed) return;

                const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
                
                try {
                    // Limit scans and ensure they are recent
                    const recentScans = this.recentScans
                        .slice(-this.maxRecentScans)
                        .filter(scan => {
                            const age = Date.now() - new Date(scan.timestamp).getTime();
                            return age < 7 * 24 * 60 * 60 * 1000; // Keep for 7 days
                        });

                    await fs.writeFile(scansPath, JSON.stringify(recentScans, null, 2));
                } catch (error) {
                    console.error('CXG: Failed to save recent scans:', error);
                    // Removed throw to avoid blocking the analysis process
                }
            })
            .catch(error => {
                console.error('CXG: Save operation failed:', error);
            });

        return this.saveOperationMutex;
    }

    public async analyzeCode(
        code: string, 
        language: string, 
        fileName?: string
    ): Promise<AnalysisResult> {
        if (this.disposed) {
            throw new Error('LocalAnalysisEngine has been disposed');
        }

        console.log(`CXG: Analyzing ${fileName || 'unknown file'} (${language})`);
        
        // Generate cache key
        const cacheKey = this.generateCacheKey(code, language, fileName);
        
        // Check cache first
        const cached = this.analysisCache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
            console.log('CXG: Using cached analysis result');
            return cached;
        }

        try {
            const patterns = this.detectBasicPatterns(code);
            const matches = this.findMatches(code, patterns);
            
            const result: AnalysisResult = {
                hasSecrets: patterns.includes('potential_secret'),
                hasBusinessLogic: patterns.includes('business_logic'),
                hasInfrastructureExposure: patterns.includes('infrastructure'),
                detectedPatterns: patterns,
                riskLevel: this.calculateRiskLevel(patterns),
                suggestions: this.generateSuggestions(patterns),
                timestamp: new Date(),
                fileName: fileName || 'Unknown',
                matches
            };

            // Cache result
            this.analysisCache.set(cacheKey, result);
            
            // Store scan result with memory management
            this.addRecentScan(result);
            
            // Async save
            this.saveRecentScans();

            console.log(`CXG: Analysis complete. Risk: ${result.riskLevel}, Patterns: ${patterns.join(', ')}`);
            return result;

        } catch (error) {
            console.error('CXG: Analysis failed:', error);
            throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private generateCacheKey(code: string, language: string, fileName?: string): string {
        const content = `${code}_${language}_${fileName || ''}`;
        return Buffer.from(content).toString('base64').slice(0, 32);
    }

    private isCacheValid(result: AnalysisResult): boolean {
        const age = Date.now() - new Date(result.timestamp).getTime();
        return age < this.cacheExpiry;
    }

    private addRecentScan(result: AnalysisResult): void {
        this.recentScans.push(result);
        
        // Maintain size limit
        if (this.recentScans.length > this.maxRecentScans) {
            this.recentScans.splice(0, this.recentScans.length - this.maxRecentScans);
        }
    }

    private detectBasicPatterns(code: string): string[] {
        const patterns: string[] = [];
        
        // Using cached regex patterns for performance
        if (this.getPattern('secrets').test(code)) {
            patterns.push('potential_secret');
        }
        
        if (this.getPattern('business').test(code)) {
            patterns.push('business_logic');
        }
        
        if (this.getPattern('infrastructure').test(code)) {
            patterns.push('infrastructure');
        }

        return patterns;
    }

    private getPattern(type: string): RegExp {
        if (this.patternCache.has(type)) {
            return this.patternCache.get(type)!;
        }

        let pattern: RegExp;
        switch (type) {
            case 'secrets':
                pattern = /(?:api[_-]?key|password|secret|token|private[_-]?key|ghp_|sk-|AKIA)[:=\s]/gi;
                break;
            case 'business':
                pattern = /(?:calculatePrice|algorithm|proprietary|pricing|revenue|profit)/gi;
                break;
            case 'infrastructure':
                pattern = /(?:localhost|127\.0\.0\.1|internal|private|\.local)/gi;
                break;
            default:
                pattern = /(?:)/;
        }

        this.patternCache.set(type, pattern);
        return pattern;
    }

    private findMatches(code: string, patterns: string[]): Match[] {
        const matches: Match[] = [];
        const lines = code.split('\n');

        lines.forEach((line, lineIndex) => {
            patterns.forEach(pattern => {
                const { severity, regex } = this.getPatternConfig(pattern);
                
                let match;
                while ((match = regex.exec(line)) !== null) {
                    matches.push({
                        pattern,
                        line: lineIndex + 1,
                        column: match.index,
                        text: match[0],
                        severity
                    });
                    
                    // Prevent infinite loops on global regex
                    if (!regex.global) break;
                }
                
                // Reset regex state
                regex.lastIndex = 0;
            });
        });

        return matches;
    }

    private getPatternConfig(pattern: string): { severity: 'high' | 'medium' | 'low'; regex: RegExp } {
        switch (pattern) {
            case 'potential_secret':
                return {
                    severity: 'high',
                    regex: /(?:api[_-]?key|password|secret|token|private[_-]?key)[:=]/gi
                };
            case 'business_logic':
                return {
                    severity: 'medium',
                    regex: /(?:calculatePrice|algorithm|proprietary)/gi
                };
            case 'infrastructure':
                return {
                    severity: 'medium',
                    regex: /(?:localhost|127\.0\.0\.1|internal)/gi
                };
            default:
                return {
                    severity: 'low',
                    regex: /(?:)/
                };
        }
    }

    private calculateRiskLevel(patterns: string[]): 'low' | 'medium' | 'high' {
        if (patterns.includes('potential_secret')) return 'high';
        if (patterns.length >= 2) return 'medium';
        if (patterns.length >= 1) return 'medium';
        return 'low';
    }

    private generateSuggestions(patterns: string[]): string[] {
        const suggestions: string[] = [];
        
        if (patterns.includes('potential_secret')) {
            suggestions.push(
                'Use environment variables for sensitive data',
                'Consider Azure Key Vault or AWS Secrets Manager',
                'Review .gitignore to prevent secret commits'
            );
        }
        
        if (patterns.includes('business_logic')) {
            suggestions.push(
                'Review if business logic should be shared with AI',
                'Consider abstracting proprietary algorithms'
            );
        }
        
        if (patterns.includes('infrastructure')) {
            suggestions.push(
                'Avoid exposing internal infrastructure details',
                'Use configuration files for environment settings'
            );
        }

        return suggestions;
    }

    public getRecentScans(): AnalysisResult[] {
      // Returning copy to prevent external mutation
        return [...this.recentScans];
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        
        // Clear caches
        this.patternCache.clear();
        this.analysisCache.clear();
        
        // Final save attempt
        this.saveRecentScans().catch(error => {
            console.error('CXG: Failed final save on dispose:', error);
        });
    }
}