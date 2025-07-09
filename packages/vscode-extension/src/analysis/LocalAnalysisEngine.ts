import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';


import { UnifiedAnalysisEngine } from './analyzers';
import { analysisCache } from './utils/CacheManager';
import { performanceMonitor } from './utils/PerformanceMonitor';
import { getGlobalConfigManager } from './utils/ConfigurationManager';

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
  semanticContext?: any;
  syntaxErrors?: any[];
  codeComplexity?: any;
  frameworkDetection?: any;
  modernAnalysis?: any;
  analysisLevel?: 'quick' | 'standard' | 'comprehensive';
  processingTime?: number;
  fromCache?: boolean;
}

export interface Match {
  pattern: string;
  line: number;
  column: number;
  text: string;
  severity: 'low' | 'medium' | 'high';
  context?: string;
}

/**
 * LocalAnalysisEngine defines the core analysis engine for CXG
 * It integrates both legacy and modern analysis methods
 */
export class LocalAnalysisEngine {
  private context: vscode.ExtensionContext;
  private dbPath: string;
  private recentScans: AnalysisResult[] = [];
  private serverAvailable: boolean = false;
  private configManager: any;
  private readonly serverCheckInterval = 5 * 60 * 1000;
  private lastServerCheck = 0;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.dbPath = path.join(context.globalStorageUri.fsPath, 'cxg-analysis.db');
    this.configManager = getGlobalConfigManager();

    this.initializeStorage();
    this.loadRecentScans();
    this.checkServerAvailability();

    console.log('🔄 CXG LocalAnalysisEngine initialized (modular integration mode)');
  }

  /**
   * Main analysis method
   */
  public async analyzeCode(
    code: string,
    language: string,
    fileName?: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const perfId = performanceMonitor.startMeasurement('legacy_analysis', {
      language,
      fileName: fileName || 'unknown',
    });

    try {
      // Modular analysis first
      const modernResult = await this.analyzeWithModularArchitecture(code, language, fileName);

      if (modernResult) {
        const legacyResult = this.convertModernToLegacyFormat(modernResult, startTime);
        this.storeRecentScan(legacyResult);
        return legacyResult;
      }

      // Fallback to server if configured and available
      if (this.shouldTryServer()) {
        try {
          const serverResult = await this.analyzeWithServer(code, language, fileName);
          this.storeRecentScan(serverResult);
          return serverResult;
        } catch (error) {
          console.warn('CXG: Server analysis failed, falling back to local:', error);
          this.serverAvailable = false;
        }
      }

      // Final fallback to basic local analysis
      const localResult = await this.analyzeLocally(code, language, fileName, startTime);
      this.storeRecentScan(localResult);
      return localResult;
    } finally {
      performanceMonitor.endMeasurement(perfId);
    }
  }

  /**
   * Enhanced analysis using new modular architecture
   */
  public async analyzeCodeEnhanced(
    code: string,
    language: string,
    fileName?: string,
    options?: {
      analysisLevel?: 'quick' | 'standard' | 'comprehensive';
      useCache?: boolean;
    }
  ): Promise<AnalysisResult> {
    const opts = {
      analysisLevel: 'standard' as const,
      useCache: true,
      ...options,
    };

    const modernResult = await UnifiedAnalysisEngine.analyzeComprehensively(code, fileName);

    if (modernResult) {
      return this.convertModernToLegacyFormat(modernResult, Date.now(), opts.analysisLevel);
    }

    // Fallback to regular analysis
    return this.analyzeCode(code, language, fileName);
  }

  /**
   * Quick analysis for real-time feedback
   */
  public async quickAnalyze(code: string, fileName?: string): Promise<AnalysisResult> {
    try {
      const quickResult = await UnifiedAnalysisEngine.quickAnalyze(code, fileName);
      return this.convertModernToLegacyFormat(quickResult, Date.now(), 'quick');
    } catch (error) {
      console.warn('Quick analysis failed, using local fallback:', error);
      return this.analyzeLocally(code, 'javascript', fileName, Date.now());
    }
  }

  /**
   * AI-specific analysis
   */
  public async analyzeForAI(
    code: string,
    language: string,
    fileName?: string,
    aiContext?: any
  ): Promise<AnalysisResult> {
    try {
      const aiResult = await UnifiedAnalysisEngine.analyzeForAI(code, fileName, aiContext);
      return this.convertModernToLegacyFormat(aiResult, Date.now(), 'comprehensive');
    } catch (error) {
      console.warn('AI analysis failed, using standard analysis:', error);
      return this.analyzeCode(code, language, fileName);
    }
  }

  // Private methods

  /**
   * Use modular architecture for analysis
   */
  private async analyzeWithModularArchitecture(
    code: string,
    language: string,
    fileName?: string
  ): Promise<any> {
    try {
      return await UnifiedAnalysisEngine.analyzeComprehensively(code, fileName);
    } catch (error) {
      console.warn('Modular analysis failed:', error);
      return null;
    }
  }

  /**
   * Convert modern analysis result to legacy format
   */
  private convertModernToLegacyFormat(
    modernResult: any,
    startTime: number,
    analysisLevel: 'quick' | 'standard' | 'comprehensive' = 'standard'
  ): AnalysisResult {
    const processingTime = Date.now() - startTime;

    // Extract risk information from modern result
    const hasSecrets =
      modernResult.riskLevel === 'high' ||
      modernResult.quickRisks?.some((r: string) => r.toLowerCase().includes('secret'));

    const hasBusinessLogic = modernResult.quickRisks?.some(
      (r: string) => r.toLowerCase().includes('business') || r.toLowerCase().includes('logic')
    );

    const hasInfrastructure = modernResult.quickRisks?.some(
      (r: string) =>
        r.toLowerCase().includes('infrastructure') || r.toLowerCase().includes('endpoint')
    );

    // Convert to legacy match format
    const matches: Match[] = [];
    if (modernResult.detectedPatterns) {
      modernResult.detectedPatterns.forEach((pattern: string, index: number) => {
        matches.push({
          pattern: pattern,
          line: index + 1,
          column: 1,
          text: pattern,
          severity: this.mapRiskToSeverity(modernResult.riskLevel),
        });
      });
    }

    return {
      hasSecrets,
      hasBusinessLogic,
      hasInfrastructureExposure: hasInfrastructure,
      detectedPatterns: modernResult.quickRisks || [],
      riskLevel: modernResult.riskLevel || 'low',
      suggestions: modernResult.quickRecommendations || [],
      timestamp: new Date(),
      fileName: modernResult.fileName || 'unknown',
      matches,

      // Enhanced fields
      semanticContext: modernResult.originalAnalysis?.semantic,
      codeComplexity: modernResult.originalAnalysis?.complexity,
      frameworkDetection: modernResult.originalAnalysis?.framework,

      // New modular fields
      modernAnalysis: modernResult,
      analysisLevel,
      processingTime,
      fromCache: modernResult.fromCache || false,
    };
  }

  /**
   * Server analysis
   */
  private async analyzeWithServer(
    code: string,
    language: string,
    fileName?: string
  ): Promise<AnalysisResult> {
    const response = await fetch('http://localhost:8080/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, fileName: fileName || 'unknown' }),
    });

    if (!response.ok) {
      throw new Error(`Server analysis failed: ${response.statusText}`);
    }

    const serverResult = await response.json() as { success: boolean; error?: string; result?: any };

    if (!serverResult.success) {
      throw new Error(serverResult.error || 'Server analysis failed');
    }

    return this.convertServerResult(serverResult, fileName || 'unknown');
  }

  /**
   * Basic local analysis fallback
   */
  private async analyzeLocally(
    code: string,
    language: string,
    fileName?: string,
    startTime?: number
  ): Promise<AnalysisResult> {
    const patterns = this.detectBasicPatterns(code);
    const matches = this.findBasicMatches(code, patterns);

    return {
      hasSecrets: patterns.includes('potential_secret'),
      hasBusinessLogic: patterns.includes('business_logic'),
      hasInfrastructureExposure: patterns.includes('infrastructure'),
      detectedPatterns: patterns,
      riskLevel: this.calculateBasicRiskLevel(patterns),
      suggestions: this.generateBasicSuggestions(patterns),
      timestamp: new Date(),
      fileName: fileName || 'Unknown',
      matches,
      analysisLevel: 'quick',
      processingTime: startTime ? Date.now() - startTime : 0,
      fromCache: false,
    };
  }

  /**
   * Basic pattern detection
   */
  private detectBasicPatterns(code: string): string[] {
    const patterns: string[] = [];
    const lowerCode = code.toLowerCase();

    // Basic secret detection
    if (/(?:api[_-]?key|password|token|secret)[_\s]*[:=]/i.test(code)) {
      patterns.push('potential_secret');
    }

    // Basic business logic detection
    if (/(?:calculate|price|auth|login|algorithm)/i.test(code)) {
      patterns.push('business_logic');
    }

    // Basic infrastructure detection
    if (/(?:localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+):\d+/i.test(code)) {
      patterns.push('infrastructure');
    }

    return patterns;
  }

  /**
   * Find basic matches
   */
  private findBasicMatches(code: string, patterns: string[]): Match[] {
    const matches: Match[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      patterns.forEach((pattern) => {
        if (line.toLowerCase().includes(pattern.replace('_', ''))) {
          matches.push({
            pattern,
            line: index + 1,
            column: 1,
            text: line.trim().substring(0, 50),
            severity: pattern === 'potential_secret' ? 'high' : 'medium',
          });
        }
      });
    });

    return matches;
  }

  /**
   * Convert server result
   */
  private convertServerResult(serverResult: any, fileName: string): AnalysisResult {
    const result = serverResult.result;

    return {
      hasSecrets: result.secrets?.length > 0,
      hasBusinessLogic: result.businessLogic?.length > 0,
      hasInfrastructureExposure: result.infrastructure?.length > 0,
      detectedPatterns: [
        ...(result.secrets?.length > 0 ? ['potential_secret'] : []),
        ...(result.businessLogic?.length > 0 ? ['business_logic'] : []),
        ...(result.infrastructure?.length > 0 ? ['infrastructure'] : []),
      ],
      riskLevel: this.convertServerRiskLevel(result.riskLevel || 0),
      suggestions: result.suggestions || [],
      timestamp: new Date(),
      fileName,
      matches: [],
      analysisLevel: 'standard',
      fromCache: false,
    };
  }

  // Utility methods

  private shouldTryServer(): boolean {
    const now = Date.now();

    // Check server availability periodically
    if (now - this.lastServerCheck > this.serverCheckInterval) {
      this.checkServerAvailability();
      this.lastServerCheck = now;
    }

    return this.serverAvailable && this.configManager.get('enableServerFallback');
  }

  private async checkServerAvailability(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('http://localhost:8080/health', {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);
      this.serverAvailable = response.ok;

      if (this.serverAvailable) {
        console.log('CXG server available');
      }
    } catch (error) {
      this.serverAvailable = false;
    }
  }

  private mapRiskToSeverity(riskLevel: string): 'low' | 'medium' | 'high' {
    switch (riskLevel) {
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  private calculateBasicRiskLevel(patterns: string[]): 'low' | 'medium' | 'high' {
    if (patterns.includes('potential_secret')) return 'high';
    if (patterns.length > 1) return 'medium';
    return 'low';
  }

  private generateBasicSuggestions(patterns: string[]): string[] {
    const suggestions: string[] = [];

    if (patterns.includes('potential_secret')) {
      suggestions.push('Remove hardcoded secrets');
    }
    if (patterns.includes('business_logic')) {
      suggestions.push('Review business logic before sharing');
    }
    if (patterns.includes('infrastructure')) {
      suggestions.push('Avoid exposing infrastructure details');
    }

    return suggestions.length > 0 ? suggestions : ['Code appears safe to share'];
  }

  private convertServerRiskLevel(level: number): 'low' | 'medium' | 'high' {
    if (level >= 2) return 'high';
    if (level >= 1) return 'medium';
    return 'low';
  }

  private initializeStorage(): void {
    try {
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  private loadRecentScans(): void {
    const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
    try {
      if (fs.existsSync(scansPath)) {
        const data = fs.readFileSync(scansPath, 'utf8');
        this.recentScans = JSON.parse(data).map((scan: any) => ({
          ...scan,
          timestamp: new Date(scan.timestamp),
        }));
      }
    } catch (error) {
      console.warn('Could not load recent scans:', error);
      this.recentScans = [];
    }
  }

  private storeRecentScan(result: AnalysisResult): void {
    this.recentScans.push(result);

    // Keep only last 50 scans
    if (this.recentScans.length > 50) {
      this.recentScans = this.recentScans.slice(-50);
    }

    this.saveRecentScans();
  }

  private saveRecentScans(): void {
    const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
    try {
      fs.writeFileSync(scansPath, JSON.stringify(this.recentScans, null, 2));
    } catch (error) {
      console.warn('Could not save recent scans:', error);
    }
  }

  // Public API methods uses backward compatibility

  /**
   * Get recent scan results
   */
  public getRecentScans(): AnalysisResult[] {
    return this.recentScans.slice(-10);
  }

  /**
   * Get security summary statistics
   */
  public getSecuritySummary(): { total: number; high: number; medium: number; low: number } {
    const recentScans = this.getRecentScans();
    return {
      total: recentScans.length,
      high: recentScans.filter((scan) => scan.riskLevel === 'high').length,
      medium: recentScans.filter((scan) => scan.riskLevel === 'medium').length,
      low: recentScans.filter((scan) => scan.riskLevel === 'low').length,
    };
  }

  /**
   * Get server availability status
   */
  public isServerAvailable(): boolean {
    return this.serverAvailable;
  }

  /**
   * Manually refresh server availability
   */
  public async refreshServerAvailability(): Promise<void> {
    await this.checkServerAvailability();
  }

  /**
   * Get analysis statistics delegates to performance monitor
   */
  public getAnalysisStats() {
    return {
      cache: analysisCache.getStats(),
      performance: performanceMonitor.getStats(),
      legacy: this.getSecuritySummary(),
    };
  }

  /**
   * Clear caches and reset
   */
  public reset(): void {
    this.recentScans = [];
    this.saveRecentScans();
    analysisCache.clear();
    performanceMonitor.reset();
  }
}

/**
 * Factory functions for backward compatibility
 */
export function createLocalAnalysisEngine(context: vscode.ExtensionContext): LocalAnalysisEngine {
  return new LocalAnalysisEngine(context);
}
