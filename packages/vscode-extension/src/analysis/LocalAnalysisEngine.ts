import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fsp } from 'fs';
import { spawn } from 'child_process';

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

export class LocalAnalysisEngine {
  private context: vscode.ExtensionContext;
  private dbPath: string;
  private recentScans: AnalysisResult[] = [];
  private serverAvailable = false;
  private configManager: any;
  private readonly serverCheckInterval = 5 * 60 * 1000;
  private lastServerCheck = 0;

  // Request coalescing
  private pending = new Map<string, Promise<AnalysisResult>>();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.dbPath = path.join(context.globalStorageUri.fsPath, 'cxg-analysis.db');
    this.configManager = getGlobalConfigManager();
    this.initialize().catch((err) => console.error('Init error:', err));
  }

  private async initialize(): Promise<void> {
    await this.ensureStorage();
    await this.loadRecentScans();
    this.checkServerAvailability();
    console.log('CXG LocalAnalysisEngine initialized');
  }

  private async ensureStorage(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    await fsp.mkdir(dir, { recursive: true });
  }

  private async loadRecentScans(): Promise<void> {
    const file = path.join(path.dirname(this.dbPath), 'recent-scans.json');
    try {
      const json = await fsp.readFile(file, 'utf8');
      this.recentScans = JSON.parse(json).map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp),
      }));
    } catch {
      this.recentScans = [];
    }
  }

  private async saveRecentScans(): Promise<void> {
    const file = path.join(path.dirname(this.dbPath), 'recent-scans.json');
    const data = JSON.stringify(this.recentScans.slice(-50), null, 2);
    await fsp.writeFile(file, data, 'utf8');
  }

  /**
   * Main analysis method with caching, debouncing & async I/O
   */
  public async analyzeCode(
    code: string,
    language: string,
    fileName?: string
  ): Promise<AnalysisResult> {
    const key = analysisCache.generateKey(code, language, { mode: 'legacy' });
    if (analysisCache.has(key)) {
      return { ...analysisCache.get<AnalysisResult>(key)!, fromCache: true };
    }
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    const promise = this._analyzeCode(code, language, fileName)
      .then((result) => {
        analysisCache.set(key, result);
        return result;
      })
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  private async _analyzeCode(
    code: string,
    language: string,
    fileName?: string
  ): Promise<AnalysisResult> {
    const start = Date.now();
    const perfId = performanceMonitor.startMeasurement('legacy_analysis', { language, fileName });
    try {
      // Modular
      const modern = await UnifiedAnalysisEngine.analyzeComprehensively(code, fileName);
      if (modern) {
        const res = this.toLegacy(modern, start, 'standard');
        await this.store(res);
        return res;
      }

      // Server
      if (this.shouldTryServer()) {
        try {
          const srv = await this.analyzeWithServer(code, language, fileName);
          await this.store(srv);
          return srv;
        } catch {
          this.serverAvailable = false;
        }
      }

      // Local fallback; offloads CPU via setImmediate
      return await new Promise<AnalysisResult>((resolve) => {
        setImmediate(async () => {
          const loc = await this.analyzeLocally(code, language, fileName, start);
          await this.store(loc);
          resolve(loc);
        });
      });
    } finally {
      performanceMonitor.endMeasurement(perfId);
    }
  }

  private async store(result: AnalysisResult): Promise<void> {
    this.recentScans.push(result);
    if (this.recentScans.length > 50) {
      this.recentScans.shift();
    }
    await this.saveRecentScans();
  }

  public async analyzeCodeEnhanced(
    code: string,
    language: string,
    fileName?: string,
    options?: { analysisLevel?: 'quick' | 'standard' | 'comprehensive'; useCache?: boolean }
  ): Promise<AnalysisResult> {
    return this.analyzeCode(code, language, fileName);
  }

  public async quickAnalyze(code: string, fileName?: string): Promise<AnalysisResult> {
    // reuse cache key
    return this.analyzeCode(code, 'quick', fileName);
  }

  public async analyzeForAI(
    code: string,
    language: string,
    fileName?: string,
    aiContext?: any
  ): Promise<AnalysisResult> {
    return this.analyzeCode(code, language, fileName);
  }

  // Private helpers

  private toLegacy(
    modern: any,
    start: number,
    level: 'quick' | 'standard' | 'comprehensive'
  ): AnalysisResult {
    const elapsed = Date.now() - start;
    const {
      quickRisks = [],
      quickRecommendations = [],
      riskLevel = 'low',
      detectedPatterns = [],
    } = modern;
    const hasSecrets = quickRisks.some((r: string) => /secret/i.test(r)) || riskLevel === 'high';
    const hasBiz = quickRisks.some((r: string) => /business/i.test(r));
    const hasInfra = quickRisks.some((r: string) => /infrastructure|endpoint/i.test(r));

    const matches: Match[] = detectedPatterns.map((p: string, i: number) => ({
      pattern: p,
      line: i + 1,
      column: 1,
      text: p,
      severity: this.mapRisk(riskLevel),
    }));

    return {
      hasSecrets,
      hasBusinessLogic: hasBiz,
      hasInfrastructureExposure: hasInfra,
      detectedPatterns: quickRisks,
      riskLevel,
      suggestions: quickRecommendations,
      timestamp: new Date(),
      fileName: modern.fileName || 'unknown',
      matches,
      semanticContext: modern.originalAnalysis?.semantic,
      codeComplexity: modern.originalAnalysis?.complexity,
      frameworkDetection: modern.originalAnalysis?.framework,
      modernAnalysis: modern,
      analysisLevel: level,
      processingTime: elapsed,
      fromCache: false,
    };
  }

  private async analyzeWithServer(
    code: string,
    language: string,
    fileName?: string
  ): Promise<AnalysisResult> {
    const res = await fetch('http://localhost:8080/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, fileName }),
    });
    if (!res.ok) throw new Error(res.statusText);
    const json = (await res.json()) as { success: boolean; error?: string; result: any };
    if (!json.success) throw new Error(json.error || 'Server error');
    return this.convertServer(json.result, fileName || 'unknown');
  }

  private convertServer(result: any, fileName: string): AnalysisResult {
    const matches: Match[] = [];
    return {
      hasSecrets: result.secrets.length > 0,
      hasBusinessLogic: result.businessLogic.length > 0,
      hasInfrastructureExposure: result.infrastructure.length > 0,
      detectedPatterns: [
        ...result.secrets.map((_: any) => 'potential_secret'),
        ...result.businessLogic.map((_: any) => 'business_logic'),
        ...result.infrastructure.map((_: any) => 'infrastructure'),
      ],
      riskLevel: this.mapRiskLevel(result.riskLevel),
      suggestions: result.suggestions || [],
      timestamp: new Date(),
      fileName,
      matches,
      analysisLevel: 'standard',
      fromCache: false,
    };
  }

  private async analyzeLocally(
    code: string,
    language: string,
    fileName?: string,
    start?: number
  ): Promise<AnalysisResult> {
    const patterns = this.detectBasic(code);
    const matches = this.findBasic(code, patterns);
    const elapsed = start ? Date.now() - start : 0;
    return {
      hasSecrets: patterns.includes('potential_secret'),
      hasBusinessLogic: patterns.includes('business_logic'),
      hasInfrastructureExposure: patterns.includes('infrastructure'),
      detectedPatterns: patterns,
      riskLevel: this.calcRisk(patterns),
      suggestions: this.basicSuggestions(patterns),
      timestamp: new Date(),
      fileName: fileName || 'unknown',
      matches,
      analysisLevel: 'quick',
      processingTime: elapsed,
      fromCache: false,
    };
  }

  private detectBasic(code: string): string[] {
    const p: string[] = [];
    if (/(?:api[_-]?key|password|token|secret)[_\s]*[:=]/i.test(code)) p.push('potential_secret');
    if (/(?:calculate|price|auth|login|algorithm)/i.test(code)) p.push('business_logic');
    if (/(?:localhost|\d+\.\d+\.\d+\.\d+):\d+/i.test(code)) p.push('infrastructure');
    return p;
  }

  private findBasic(code: string, patterns: string[]): Match[] {
    return code
      .split('\n')
      .flatMap((ln, i) =>
        patterns
          .filter((p) => ln.toLowerCase().includes(p.replace('_', '')))
          .map((p) => ({
            pattern: p,
            line: i + 1,
            column: 1,
            text: ln.trim(),
            severity: p === 'potential_secret' ? 'high' : 'medium',
          }))
      );
  }

  private shouldTryServer(): boolean {
    const now = Date.now();
    if (now - this.lastServerCheck > this.serverCheckInterval) {
      this.checkServerAvailability();
      this.lastServerCheck = now;
    }
    return this.serverAvailable && this.configManager.get('enableServerFallback');
  }

  private async checkServerAvailability(): Promise<void> {
    try {
      const c = new AbortController();
      setTimeout(() => c.abort(), 2000);
      const r = await fetch('http://localhost:8080/api/v1/health', { signal: c.signal });
      this.serverAvailable = r.ok;
    } catch {
      this.serverAvailable = false;
    }
  }

  private mapRisk(r: string): 'low' | 'medium' | 'high' {
    return r === 'high' ? 'high' : r === 'medium' ? 'medium' : 'low';
  }
  private mapRiskLevel(l: number): 'low' | 'medium' | 'high' {
    return l >= 2 ? 'high' : l >= 1 ? 'medium' : 'low';
  }
  private calcRisk(p: string[]): 'low' | 'medium' | 'high' {
    if (p.includes('potential_secret')) return 'high';
    if (p.length > 1) return 'medium';
    return 'low';
  }
  private basicSuggestions(p: string[]): string[] {
    const s: string[] = [];
    if (p.includes('potential_secret')) s.push('Remove hardcoded secrets');
    if (p.includes('business_logic')) s.push('Review business logic before sharing');
    if (p.includes('infrastructure')) s.push('Avoid exposing infrastructure details');
    return s.length ? s : ['Code appears safe to share'];
  }

  public getRecentScans(): AnalysisResult[] {
    return this.recentScans.slice(-10);
  }
  public getSecuritySummary() {
    const r = this.getRecentScans();
    return {
      total: r.length,
      high: r.filter((x) => x.riskLevel === 'high').length,
      medium: r.filter((x) => x.riskLevel === 'medium').length,
      low: r.filter((x) => x.riskLevel === 'low').length,
    };
  }
  public isServerAvailable(): boolean {
    return this.serverAvailable;
  }
  public async refreshServerAvailability() {
    await this.checkServerAvailability();
  }
  public getAnalysisStats() {
    return {
      cache: analysisCache.getStats(),
      performance: performanceMonitor.getStats(),
      legacy: this.getSecuritySummary(),
    };
  }
  public reset(): void {
    this.recentScans = [];
    this.saveRecentScans().catch(console.error);
    analysisCache.clear();
    performanceMonitor.reset();
  }
}

/**
 * backward-compat factory
*/
export function createLocalAnalysisEngine(ctx: vscode.ExtensionContext) {
  return new LocalAnalysisEngine(ctx);
}
