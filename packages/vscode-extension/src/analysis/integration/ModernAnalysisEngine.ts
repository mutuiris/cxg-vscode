import { UnifiedAnalysisEngine } from '../analyzers';
import { analysisCache } from '../utils/CacheManager';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { LocalAnalysisEngine } from '../LocalAnalysisEngine';
import { getGlobalConfigManager } from '../utils/ConfigurationManager';

/**
 * Modern Analysis Engine
 * Integrates new modular architecture with existing LocalAnalysisEngine
 */
export class ModernAnalysisEngine {
  private legacyEngine: LocalAnalysisEngine;
  private configManager = getGlobalConfigManager();

  constructor(context: any) {
    this.legacyEngine = new LocalAnalysisEngine(context);
  }

  /**
   * Enhanced analysis using new modular architecture
   */
  public async analyzeCode(
    code: string,
    language: string,
    fileName?: string,
    options?: {
      useCache?: boolean;
      analysisLevel?: 'quick' | 'standard' | 'comprehensive';
    }
  ) {
    const opts = {
      useCache: this.configManager.get('enablePerformanceMonitoring'),
      analysisLevel: 'standard',
      ...options,
    };

    // Generate cache key
    const cacheKey = analysisCache.generateKey(code, language, opts);

    // Check cache first
    if (opts.useCache && analysisCache.has(cacheKey)) {
      const cached = analysisCache.get(cacheKey);
      if (cached) {
        console.log('CXG: Using cached analysis result');
        return cached;
      }
    }

    // Start performance monitoring
    const perfId = performanceMonitor.startMeasurement('modern_analysis', {
      level: opts.analysisLevel,
      language,
      cacheEnabled: opts.useCache,
    });

    try {
      let result;

      switch (opts.analysisLevel) {
        case 'quick':
          result = await this.quickAnalysis(code, language, fileName);
          break;
        case 'comprehensive':
          result = await this.comprehensiveAnalysis(code, language, fileName);
          break;
        default:
          result = await this.standardAnalysis(code, language, fileName);
      }

      // Cache result
      if (opts.useCache) {
        analysisCache.set(cacheKey, result, 30 * 60 * 1000);
      }

      return result;
    } finally {
      performanceMonitor.endMeasurement(perfId);
    }
  }

  private async quickAnalysis(code: string, language: string, fileName?: string) {
    const quickResult = await UnifiedAnalysisEngine.quickAnalyze(code, fileName);
    const legacyResult = await this.legacyEngine.analyzeCode(code, language, fileName);

    return {
      ...quickResult,
      legacyPatterns: legacyResult.detectedPatterns,
      timestamp: new Date(),
      analysisLevel: 'quick',
    };
  }

  private async standardAnalysis(code: string, language: string, fileName?: string) {
    const [modernResult, legacyResult] = await Promise.all([
      UnifiedAnalysisEngine.analyzeComprehensively(code, fileName),
      this.legacyEngine.analyzeCode(code, language, fileName),
    ]);

    return {
      ...modernResult,
      legacyAnalysis: legacyResult,
      analysisLevel: 'standard',
    };
  }

  private async comprehensiveAnalysis(code: string, language: string, fileName?: string) {
    // Full modular analysis with intelligence
    const comprehensiveResult = await UnifiedAnalysisEngine.analyzeComprehensively(code, fileName);

    // Include legacy analysis for compatibility
    const legacyResult = await this.legacyEngine.analyzeCode(code, language, fileName);

    return {
      ...comprehensiveResult,
      legacyAnalysis: legacyResult,
      analysisLevel: 'comprehensive',
    };
  }

  /**
   * AI-specific analysis for safe AI interactions
   */
  public async analyzeForAI(code: string, language: string, fileName?: string, aiContext?: any) {
    return UnifiedAnalysisEngine.analyzeForAI(code, fileName, aiContext);
  }

  /**
   * Get analysis statistics
   */
  public getAnalysisStats() {
    return {
      cache: analysisCache.getStats(),
      performance: performanceMonitor.getStats(),
      legacy: this.legacyEngine.getSecuritySummary(),
    };
  }
}
