/**
 * Patterns Module Barrel Export
 * Centralized export for all pattern definitions and matchers
 */

import { BusinessLogicContext, BusinessLogicPatternMatcher } from './BusinessLogicPatterns';
import { FrameworkDetectionResult, FrameworkPatternMatcher } from './FrameworkPatterns';
import { SecretAnalysisResult, SecretPatternMatcher } from './SecretPatterns';

// Business Logic Patterns
export * from './BusinessLogicPatterns';
export {
  BUSINESS_LOGIC_PATTERNS,
  BusinessLogicPatternMatcher,
  type BusinessLogicPattern,
  type BusinessLogicContext,
} from './BusinessLogicPatterns';

// Framework Detection Patterns
export * from './FrameworkPatterns';
export {
  FRAMEWORK_PATTERNS,
  FrameworkPatternMatcher,
  type FrameworkPattern,
  type FrameworkDetectionResult,
} from './FrameworkPatterns';

// Secret Detection Patterns
export * from './SecretPatterns';
export {
  SECRET_PATTERNS,
  SecretPatternMatcher,
  type SecretPattern,
  type SecretMatch,
  type SecretAnalysisResult,
} from './SecretPatterns';

/**
 * Unified Pattern Analysis Engine
 * Combines all pattern matching capabilities
 */
export class UnifiedPatternMatcher {
  /**
   * Comprehensive code analysis using all pattern matchers
   */
  public static analyzeCode(
    code: string,
    fileName?: string,
    dependencies?: string[]
  ): {
    businessLogic: BusinessLogicContext[];
    frameworks: FrameworkDetectionResult[];
    secrets: SecretAnalysisResult;
    summary: {
      hasBusinessLogic: boolean;
      hasFrameworks: boolean;
      hasSecrets: boolean;
      riskLevel: 'low' | 'medium' | 'high';
      recommendations: string[];
    };
  } {
    // Analyze business logic
    const businessLogic = BusinessLogicPatternMatcher.analyzeBusinessLogic(code);

    // Detect frameworks
    const frameworks = FrameworkPatternMatcher.detectFrameworks(code, fileName, dependencies);

    // Analyze secrets
    const secrets = SecretPatternMatcher.analyzeSecrets(code, fileName);

    // Calculate overall risk level
    const riskLevel = this.calculateOverallRisk(businessLogic, frameworks, secrets);

    // Generate combined recommendations
    const recommendations = this.generateCombinedRecommendations(
      businessLogic,
      frameworks,
      secrets
    );

    return {
      businessLogic,
      frameworks,
      secrets,
      summary: {
        hasBusinessLogic: businessLogic.length > 0,
        hasFrameworks: frameworks.length > 0,
        hasSecrets: secrets.hasSecrets,
        riskLevel,
        recommendations,
      },
    };
  }

  /**
   * Calculate overall risk level from all analyses
   */
  private static calculateOverallRisk(
    businessLogic: BusinessLogicContext[],
    frameworks: FrameworkDetectionResult[],
    secrets: SecretAnalysisResult
  ): 'low' | 'medium' | 'high' {
    // Secrets have highest priority
    if (secrets.hasSecrets && secrets.highestSeverity === 'high') {
      return 'high';
    }

    // High-risk business logic
    const highRiskBusiness = businessLogic.filter((bl) => bl.riskLevel === 'high');
    if (highRiskBusiness.length > 0) {
      return 'high';
    }

    // Medium risk conditions
    if (secrets.hasSecrets && secrets.highestSeverity === 'medium') {
      return 'medium';
    }

    const mediumRiskBusiness = businessLogic.filter((bl) => bl.riskLevel === 'medium');
    if (mediumRiskBusiness.length > 0) {
      return 'medium';
    }

    // Server-side frameworks with business logic
    const serverFrameworks = frameworks.filter((f) =>
      ['node', 'express', 'nextjs', 'nuxt'].includes(f.framework)
    );
    if (serverFrameworks.length > 0 && businessLogic.length > 0) {
      return 'medium';
    }

    // Any detection results in at least low risk
    if (businessLogic.length > 0 || frameworks.length > 0 || secrets.hasSecrets) {
      return 'low';
    }

    return 'low';
  }

  /**
   * Generate combined recommendations from all analyses
   */
  private static generateCombinedRecommendations(
    businessLogic: BusinessLogicContext[],
    frameworks: FrameworkDetectionResult[],
    secrets: SecretAnalysisResult
  ): string[] {
    const recommendations = new Set<string>();

    // Add secret recommendations with the highest priority
    if (secrets.hasSecrets) {
      secrets.recommendations.forEach((rec) => recommendations.add(rec));
    }

    // Add business logic recommendations
    businessLogic.forEach((bl) => {
      bl.recommendations.forEach((rec) => recommendations.add(rec));
    });

    // Add framework recommendations
    frameworks.forEach((fw) => {
      fw.recommendations.forEach((rec) => recommendations.add(rec));
    });

    // Add general recommendations if none exist
    if (recommendations.size === 0) {
      recommendations.add('Code analysis complete - no major security concerns detected');
      recommendations.add('Consider regular security reviews as part of your development process');
    }

    return Array.from(recommendations);
  }

  /**
   * Quick security scan; high-confidence patterns only
   */
  public static quickSecurityScan(
    code: string,
    fileName?: string
  ): {
    highRiskFindings: string[];
    quickRecommendations: string[];
    shouldBlock: boolean;
  } {
    const highRiskFindings: string[] = [];
    let shouldBlock = false;

    // Quick secret scan
    const secretMatches = SecretPatternMatcher.quickSecretScan(code);
    if (secretMatches.length > 0) {
      highRiskFindings.push(`${secretMatches.length} high-confidence secrets detected`);
      shouldBlock = true;
    }

    // Quick business logic scan
    const businessLogic = BusinessLogicPatternMatcher.analyzeBusinessLogic(code);
    const highRiskBusiness = businessLogic.filter((bl) => bl.riskLevel === 'high');
    if (highRiskBusiness.length > 0) {
      highRiskFindings.push(
        `${highRiskBusiness.length} high-risk business logic patterns detected`
      );
      shouldBlock = true;
    }

    // Quick framework scan for server-side risks
    const frameworks = FrameworkPatternMatcher.detectFrameworks(code, fileName);
    const serverFrameworks = frameworks.filter(
      (f) => ['node', 'express'].includes(f.framework) && f.confidence > 0.8
    );
    if (serverFrameworks.length > 0 && businessLogic.length > 0) {
      highRiskFindings.push('Server-side framework with business logic detected');
    }

    const quickRecommendations = shouldBlock
      ? [
          'HIGH RISK: Do not share this code with AI assistants',
          'Review and sanitize sensitive content',
        ]
      : ['Code passed quick security scan', 'Safe for AI analysis with standard precautions'];

    return {
      highRiskFindings,
      quickRecommendations,
      shouldBlock,
    };
  }
}

/**
 * Pattern matching utilities
 */
export class PatternUtils {
  /**
   * Extract imports from code
   */
  public static extractImports(code: string): string[] {
    const imports: string[] = [];

    // ES6 imports
    const importRegex = /import\s+(?:[\w\s{},*]*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    // CommonJS requires
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extract dependencies from package.json content
   */
  public static extractDependencies(packageJsonContent: string): string[] {
    try {
      const packageJson = JSON.parse(packageJsonContent);
      const dependencies = [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {}),
        ...Object.keys(packageJson.peerDependencies || {}),
      ];
      return dependencies;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get file type from filename
   */
  public static getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'js':
        return 'javascript';
      case 'jsx':
        return 'javascriptreact';
      case 'ts':
        return 'typescript';
      case 'tsx':
        return 'typescriptreact';
      case 'vue':
        return 'vue';
      case 'svelte':
        return 'svelte';
      case 'json':
        return 'json';
      default:
        return 'javascript';
    }
  }

  /**
   * Check if filename suggests test file
   */
  public static isTestFile(fileName: string): boolean {
    const testIndicators = ['test', 'spec', 'mock', '__tests__', '.test.', '.spec.'];
    return testIndicators.some((indicator) => fileName.includes(indicator));
  }

  /**
   * Check if filename suggests configuration file
   */
  public static isConfigFile(fileName: string): boolean {
    const configIndicators = [
      'config',
      'settings',
      '.env',
      'package.json',
      'tsconfig',
      'webpack',
      'babel',
    ];
    return configIndicators.some((indicator) => fileName.includes(indicator));
  }
}
