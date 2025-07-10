import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

// Analysis ecosystem
import { UnifiedAnalysisEngine, ComprehensiveAnalysisResult } from './analyzers';
import { UnifiedPatternMatcher } from './patterns';
import { UnifiedCodeExtractor } from './extractors';
import { ModernAnalysisEngine } from './integration/ModernAnalysisEngine';
import { ConfigAnalyzer, ConfigAnalysisResult } from './ConfigAnalyzer';

export interface AnalysisResult {
    // Legacy compatibility
    hasSecrets: boolean;
    hasBusinessLogic: boolean;
    hasInfrastructureExposure: boolean;
    detectedPatterns: string[];
    riskLevel: 'low' | 'medium' | 'high';
    suggestions: string[];
    timestamp: Date;
    fileName: string;
    matches: Match[];
    comprehensiveAnalysis?: ComprehensiveAnalysisResult;
    extractedElements?: ReturnType<typeof UnifiedCodeExtractor.extractAll>;
    frameworkDetection?: any[];
    configAnalysis?: ConfigAnalysisResult[];
    semanticContext?: any;
    intelligence?: any;
}

export interface Match {
    pattern: string;
    line: number;
    column: number;
    text: string;
    severity: 'high' | 'medium' | 'low';
}

export interface AnalysisOptions {
    enableComprehensiveAnalysis?: boolean;
    enableConfigAnalysis?: boolean;
    enableFrameworkDetection?: boolean;
    enableSemanticAnalysis?: boolean;
    analysisLevel?: 'quick' | 'standard' | 'comprehensive';
}

export class LocalAnalysisEngine {
    private readonly context: vscode.ExtensionContext;
    private readonly dbPath: string;
    private readonly recentScans: AnalysisResult[] = [];
    private readonly maxRecentScans = 50;
    private saveOperationMutex = Promise.resolve();
    private disposed = false;
    
    // Performance optimizations
    private readonly patternCache = new Map<string, RegExp>();
    private readonly analysisCache = new Map<string, AnalysisResult>();
    private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    // Modern analysis integration
    private modernAnalysisEngine: ModernAnalysisEngine;
    private configAnalyzer: ConfigAnalyzer;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.dbPath = path.join(context.globalStorageUri.fsPath, 'cxg-analysis.db');
        
        // Initialize modern analysis components
        this.modernAnalysisEngine = new ModernAnalysisEngine(this);
        this.configAnalyzer = new ConfigAnalyzer();
        
        this.initializeAsync().catch(error => {
            console.error('CXG: Failed to initialize LocalAnalysisEngine:', error);
        });

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
            
            const validScans = scans
                .filter(scan => scan && typeof scan === 'object' && scan.timestamp)
                .slice(-this.maxRecentScans);
            
            this.recentScans.splice(0, this.recentScans.length, ...validScans);
        } catch (error) {
            console.log('CXG: No existing scans found, starting fresh');
        }
    }

    private async saveRecentScans(): Promise<void> {
        if (this.disposed) return;

        this.saveOperationMutex = this.saveOperationMutex
            .then(async () => {
                if (this.disposed) return;

                const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
                
                try {
                    const recentScans = this.recentScans
                        .slice(-this.maxRecentScans)
                        .filter(scan => {
                            const age = Date.now() - new Date(scan.timestamp).getTime();
                            return age < 7 * 24 * 60 * 60 * 1000;
                        });

                    await fs.writeFile(scansPath, JSON.stringify(recentScans, null, 2));
                } catch (error) {
                    console.error('CXG: Failed to save recent scans:', error);
                }
            })
            .catch(error => {
                console.error('CXG: Save operation failed:', error);
            });

        return this.saveOperationMutex;
    }

    /**
   * Main analysis method with caching, debouncing & async I/O
   */
    public async analyzeCode(
        code: string, 
        language: string, 
        fileName?: string,
        options: AnalysisOptions = {}
    ): Promise<AnalysisResult> {
        if (this.disposed) {
            throw new Error('LocalAnalysisEngine has been disposed');
        }

        console.log(`CXG: Analyzing ${fileName || 'unknown file'} (${language}) with ${options.analysisLevel || 'standard'} analysis`);
        
        const cacheKey = this.generateCacheKey(code, language, fileName, options);
        
        // Check cache first
        const cached = this.analysisCache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
            console.log('CXG: Using cached analysis result');
            return cached;
        }

        try {
            // Starting with legacy pattern detection for backward compatibility
            const legacyPatterns = this.detectBasicPatterns(code);
            const legacyMatches = this.findMatches(code, legacyPatterns);
            
            let result: AnalysisResult = {
                hasSecrets: legacyPatterns.includes('potential_secret'),
                hasBusinessLogic: legacyPatterns.includes('business_logic'),
                hasInfrastructureExposure: legacyPatterns.includes('infrastructure'),
                detectedPatterns: legacyPatterns,
                riskLevel: this.calculateRiskLevel(legacyPatterns),
                suggestions: this.generateSuggestions(legacyPatterns),
                timestamp: new Date(),
                fileName: fileName || 'Unknown',
                matches: legacyMatches
            };
            
            // If comprehensive analysis is enabled, perform modern analysis
            if (options.enableComprehensiveAnalysis !== false) {
                result = await this.performEnhancedAnalysis(result, code, language, fileName, options);
            }

            // Cache result
            this.analysisCache.set(cacheKey, result);
            
            // Store scan result
            this.addRecentScan(result);
            
            // Async save
            this.saveRecentScans();

            console.log(`CXG: Enhanced analysis complete. Risk: ${result.riskLevel}, Patterns: ${result.detectedPatterns.join(', ')}`);
            return result;

        } catch (error) {
            console.error('CXG: Analysis failed:', error);
            throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Perform enhanced analysis using the modern analysis ecosystem
     */
    private async performEnhancedAnalysis(
        baseResult: AnalysisResult,
        code: string,
        language: string,
        fileName?: string,
        options: AnalysisOptions = {}
    ): Promise<AnalysisResult> {
        
        // Using UnifiedPatternMatcher for comprehensive pattern analysis
        const patternAnalysis = UnifiedPatternMatcher.analyzeCode(code, fileName);

        // Using UnifiedCodeExtractor for code element extraction
        const extractedElements = UnifiedCodeExtractor.extractAll(code, fileName);

        // Performing UnifiedAnalysisEngine for comprehensive analysis if requested
        let comprehensiveAnalysis: ComprehensiveAnalysisResult | undefined;
        if (options.analysisLevel === 'comprehensive') {
            comprehensiveAnalysis = await UnifiedAnalysisEngine.analyzeComprehensively(
                code, 
                fileName,
                this.extractDependenciesFromCode(extractedElements)
            );
        }
        
        // Configuration analysis for config files
        let configAnalysis: ConfigAnalysisResult[] | undefined;
        if (options.enableConfigAnalysis !== false && fileName && this.isConfigFile(fileName)) {
            try {
                configAnalysis = await this.configAnalyzer.analyzeWorkspaceConfigs();
            } catch (error) {
                console.warn('CXG: Config analysis failed:', error);
            }
        }
        
        // 5. Integrate results with legacy format
        return this.integrateAnalysisResults(
            baseResult,
            patternAnalysis,
            extractedElements,
            comprehensiveAnalysis,
            configAnalysis
        );
    }

    /**
     * Integrate modern analysis results with legacy format
     */
    private integrateAnalysisResults(
        baseResult: AnalysisResult,
        patternAnalysis: any,
        extractedElements: any,
        comprehensiveAnalysis?: ComprehensiveAnalysisResult,
        configAnalysis?: ConfigAnalysisResult[]
    ): AnalysisResult {
        
        // Enhanced pattern detection
        const enhancedPatterns = [
            ...baseResult.detectedPatterns,
            ...patternAnalysis.frameworks.map((f: any) => `framework_${f.framework}`),
            ...(patternAnalysis.secrets.hasSecrets ? ['advanced_secrets'] : [])
        ];

        // Enhanced risk calculation
        const enhancedRiskLevel = this.calculateEnhancedRiskLevel(
            baseResult.riskLevel,
            patternAnalysis,
            comprehensiveAnalysis
        );

        // Enhanced suggestions
        const enhancedSuggestions = [
            ...baseResult.suggestions,
            ...patternAnalysis.summary.recommendations,
            ...(comprehensiveAnalysis?.consolidatedRecommendations.immediate || [])
        ];

        // Enhanced matches with semantic information
        const enhancedMatches = [
            ...baseResult.matches,
            ...this.convertPatternMatchesToLegacyFormat(patternAnalysis)
        ];

        return {
            ...baseResult,
            detectedPatterns: [...new Set(enhancedPatterns)],
            riskLevel: enhancedRiskLevel,
            suggestions: [...new Set(enhancedSuggestions)],
            matches: enhancedMatches,
            
            // Enhanced data
            comprehensiveAnalysis,
            extractedElements,
            frameworkDetection: patternAnalysis.frameworks,
            configAnalysis,
            semanticContext: comprehensiveAnalysis?.semanticContext,
            intelligence: comprehensiveAnalysis?.intelligenceAnalysis
        };
    }

    /**
     * Convert modern pattern matches to legacy Match format
     */
    private convertPatternMatchesToLegacyFormat(patternAnalysis: any): Match[] {
        const matches: Match[] = [];
        
        // Convert business logic patterns
        patternAnalysis.businessLogic.forEach((bl: any) => {
            bl.indicators?.forEach((indicator: any) => {
                matches.push({
                    pattern: bl.type,
                    line: indicator.line || 1,
                    column: indicator.column || 0,
                    text: indicator.text || indicator,
                    severity: bl.riskLevel === 'high' ? 'high' : 'medium'
                });
            });
        });

        // Convert secret matches
        if (patternAnalysis.secrets.matches) {
            patternAnalysis.secrets.matches.forEach((secret: any) => {
                matches.push({
                    pattern: 'secret',
                    line: secret.line || 1,
                    column: secret.column || 0,
                    text: secret.redactedText || '[REDACTED]',
                    severity: 'high'
                });
            });
        }

        return matches;
    }

    /**
     * Calculate enhanced risk level considering all analysis results
     */
    private calculateEnhancedRiskLevel(
        baseRisk: 'low' | 'medium' | 'high',
        patternAnalysis: any,
        comprehensiveAnalysis?: ComprehensiveAnalysisResult
    ): 'low' | 'medium' | 'high' {
        
        // Start with base risk
        let riskScore = baseRisk === 'high' ? 3 : baseRisk === 'medium' ? 2 : 1;
        
        // Factor in pattern analysis
        if (patternAnalysis.summary.riskLevel === 'high') riskScore += 2;
        else if (patternAnalysis.summary.riskLevel === 'medium') riskScore += 1;
        
        // Factor in comprehensive analysis
        if (comprehensiveAnalysis?.riskAnalysis?.overall?.level === 'high') riskScore += 2;
        else if (comprehensiveAnalysis?.riskAnalysis?.overall?.level === 'medium') riskScore += 1;
        
        // Factor in high risk business logic
        const highRiskBusiness = patternAnalysis.businessLogic.filter((bl: any) => bl.riskLevel === 'high');
        if (highRiskBusiness.length > 0) riskScore += 1;
        
        // Factor in framework specific risks
        const serverFrameworks = patternAnalysis.frameworks.filter(
            (f: any) => ['node', 'express'].includes(f.framework) && f.confidence > 0.8
        );
        if (serverFrameworks.length > 0 && patternAnalysis.businessLogic.length > 0) {
            riskScore += 1;
        }
        
        // Convert score back to risk level
        if (riskScore >= 5) return 'high';
        if (riskScore >= 3) return 'medium';
        return 'low';
    }

    /**
     * Extract dependencies from extracted code elements
     */
    private extractDependenciesFromCode(extractedElements: any): string[] {
        if (!extractedElements?.imports) return [];
        
        return extractedElements.imports
            .map((imp: any) => imp.module)
            .filter((module: string) => !module.startsWith('.') && !module.startsWith('/'));
    }

    /**
     * Check if filename suggests a configuration file
     */
    private isConfigFile(fileName: string): boolean {
        const configIndicators = [
            'config', 'settings', '.env', 'package.json', 'tsconfig', 'webpack', 'babel'
        ];
        return configIndicators.some(indicator => fileName.includes(indicator));
    }

    // Legacy methods maintained for backward compatibility
    private generateCacheKey(code: string, language: string, fileName?: string, options?: AnalysisOptions): string {
        const content = `${code}_${language}_${fileName || ''}_${JSON.stringify(options || {})}`;
        return Buffer.from(content).toString('base64').slice(0, 32);
    }

    private isCacheValid(result: AnalysisResult): boolean {
        const age = Date.now() - new Date(result.timestamp).getTime();
        return age < this.cacheExpiry;
    }

    private addRecentScan(result: AnalysisResult): void {
        this.recentScans.push(result);
        
        if (this.recentScans.length > this.maxRecentScans) {
            this.recentScans.splice(0, this.recentScans.length - this.maxRecentScans);
        }
    }

    private detectBasicPatterns(code: string): string[] {
        const patterns: string[] = [];
        
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
                    
                    if (!regex.global) break;
                }
                
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
        return [...this.recentScans];
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        
        this.patternCache.clear();
        this.analysisCache.clear();
        
        this.saveRecentScans().catch(error => {
            console.error('CXG: Failed final save on dispose:', error);
        });
    }
}