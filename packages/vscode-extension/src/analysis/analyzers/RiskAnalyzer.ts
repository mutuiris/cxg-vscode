import { SemanticContext } from '../interfaces/TreeSitterInterfaces';
import { UnifiedPatternMatcher } from '../patterns';
import {
  RiskAnalysisResult,
  CategoryRisk,
  RiskItem,
  QuickRiskResult,
  OverallRisk,
} from '../interfaces/AnalysisInterfaces';

export type {
  RiskAnalysisResult,
  CategoryRisk,
  RiskItem,
  QuickRiskResult,
  OverallRisk,
} from '../interfaces/AnalysisInterfaces';

/**
 * Risk Analysis Engine
 * Provides comprehensive risk assessment for code security and quality
 */
export class RiskAnalyzer {
  /**
   * Perform comprehensive risk analysis on code
   */
  public static analyzeRisk(
    code: string,
    context: SemanticContext,
    fileName?: string
  ): RiskAnalysisResult {
    const securityRisk = this.analyzeSecurityRisk(code, context);
    const businessRisk = this.analyzeBusinessRisk(code, context);
    const technicalRisk = this.analyzeTechnicalRisk(context);
    const complianceRisk = this.analyzeComplianceRisk(code, context);

    const overallRisk = this.calculateOverallRisk([
      securityRisk,
      businessRisk,
      technicalRisk,
      complianceRisk,
    ]);

    const recommendations = this.generateRiskRecommendations(
      securityRisk,
      businessRisk,
      technicalRisk,
      complianceRisk
    );

    const mitigationStrategies = this.generateMitigationStrategies(overallRisk, context);

    return {
      overall: overallRisk,
      categories: {
        security: securityRisk,
        business: businessRisk,
        technical: technicalRisk,
        compliance: complianceRisk,
      },
      recommendations,
      mitigationStrategies,
      riskFactors: context.riskFactors || [],
      timestamp: new Date(),
      fileName: fileName || 'unknown',
    };
  }

  /**
   * Quick risk assessment for performance-critical scenarios
   */
  public static quickRiskScan(code: string, fileName?: string): QuickRiskResult {
    const quickScan = UnifiedPatternMatcher.quickSecurityScan?.(code, fileName) || {
      highRiskFindings: [],
      shouldBlock: false,
      quickRecommendations: [],
    };

    // Additional quick checks
    const hasEval = /\beval\s*\(|Function\s*\(/gi.test(code);
    const hasChildProcess = /child_process|spawn|exec/gi.test(code);
    const hasFileSystem = /\bfs\.|readFile|writeFile/gi.test(code);

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const findings = [...quickScan.highRiskFindings];

    if (hasEval) {
      findings.push('Dynamic code execution detected');
      riskLevel = 'high';
    }

    if (hasChildProcess) {
      findings.push('System command execution detected');
      riskLevel = 'high';
    }

    if (hasFileSystem && findings.length > 0) {
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }

    return {
      riskLevel,
      shouldBlock: quickScan.shouldBlock || riskLevel === 'high',
      findings,
      recommendations: quickScan.quickRecommendations,
      processingTime: Date.now(),
    };
  }

  /**
   * Analyze security-related risks
   */
  private static analyzeSecurityRisk(code: string, context: SemanticContext): CategoryRisk {
    const risks: RiskItem[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Secret exposure risks from patterns
    if (context.secrets?.hasSecrets) {
      context.secrets.matches?.forEach((secret) => {
        const severity = this.mapSeverity(secret.severity);
        risks.push({
          type: 'secret_exposure',
          severity,
          description: `Potential secret detected: ${secret.pattern}`,
          location: { line: secret.line, column: secret.column },
          impact: this.getSecretImpact('secret'),
          likelihood: severity === 'high' ? 'high' : severity === 'medium' ? 'medium' : 'low',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      });
    }

    // Dangerous import risks
    context.imports?.forEach((importInfo) => {
      // Check for dangerous modules using basic ImportInfo
      const dangerousModules = ['eval', 'vm', 'child_process', 'fs'];
      const isDangerous = dangerousModules.some((dangerous) =>
        importInfo.module.includes(dangerous)
      );

      if (isDangerous) {
        const severity: 'medium' | 'high' = 'high';
        risks.push({
          type: 'dangerous_import',
          severity,
          description: `High-risk module import: ${importInfo.module}`,
          location: { line: importInfo.line },
          impact: 'System compromise or data exposure',
          likelihood: 'medium',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      }
    });

    // Function security risks
    context.functions?.forEach((func) => {
      // Check for external calls using basic properties
      const hasExternalCall = /fetch|axios|http|api|request/i.test(func.name);

      if (hasExternalCall && func.containsSensitiveLogic) {
        const severity: 'medium' = 'medium';
        risks.push({
          type: 'external_call',
          severity,
          description: `Business function may make external calls: ${func.name}`,
          location: { line: func.startLine },
          impact: 'Data leakage or unauthorized access',
          likelihood: 'medium',
        });
      }

      // Check for DOM manipulation risks
      const hasDOMManipulation = /innerHTML|document\.|window\./i.test(func.name);
      if (hasDOMManipulation && func.containsSensitiveLogic) {
        const severity: 'high' = 'high';
        risks.push({
          type: 'injection_risk',
          severity,
          description: `Potential injection vulnerability in: ${func.name}`,
          location: { line: func.startLine },
          impact: 'Code execution or data manipulation',
          likelihood: 'medium',
        });
        maxSeverity = 'high';
      }
    });

    // Check for eval and dynamic code execution
    if (/\beval\s*\(|Function\s*\(/gi.test(code)) {
      risks.push({
        type: 'dynamic_execution',
        severity: 'critical',
        description: 'Dynamic code execution detected (eval/Function)',
        location: { line: this.findLineNumber(code, /\beval\s*\(|Function\s*\(/gi) },
        impact: 'Arbitrary code execution vulnerability',
        likelihood: 'high',
      });
      maxSeverity = 'critical';
    }

    return {
      level: maxSeverity,
      score: this.calculateCategoryScore(risks),
      risks,
      summary: this.generateCategorySummary('security', risks),
    };
  }

  /**
   * Analyze business logic related risks
   */
  private static analyzeBusinessRisk(code: string, context: SemanticContext): CategoryRisk {
    const risks: RiskItem[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Business logic exposure from patterns
    context.patterns?.forEach((pattern) => {
      if (pattern.riskLevel === 'high') {
        const severity: 'high' = 'high';
        risks.push({
          type: 'business_logic_exposure',
          severity,
          description: `High-risk business logic detected: ${pattern.type}`,
          location: { line: pattern.matches?.[0]?.line || 1 },
          impact: 'Intellectual property theft or competitive disadvantage',
          likelihood: 'high',
        });
        maxSeverity = 'high';
      }
    });

    // Proprietary algorithm detection
    context.functions?.forEach((func) => {
      // Estimate complexity from function size and parameters
      const estimatedComplexity = func.endLine - func.startLine + func.parameters.length;
      const isComplex = estimatedComplexity > 15;

      if (func.containsSensitiveLogic) {
        const severity: 'medium' | 'high' = isComplex ? 'high' : 'medium';
        risks.push({
          type: 'proprietary_algorithm',
          severity,
          description: `Potential proprietary algorithm: ${func.name}`,
          location: { line: func.startLine },
          impact: 'Loss of competitive advantage',
          likelihood: 'medium',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      }
    });

    // Financial calculation risks
    const financialFunctions =
      context.functions?.filter((f) =>
        /price|cost|payment|billing|financial|money|calculate/i.test(f.name)
      ) || [];

    financialFunctions.forEach((func) => {
      const hasValidation = /valid|check|verify|test/i.test(func.name);

      if (!hasValidation) {
        const severity: 'high' = 'high';
        risks.push({
          type: 'financial_calculation',
          severity,
          description: `Financial calculation without apparent validation: ${func.name}`,
          location: { line: func.startLine },
          impact: 'Financial loss or calculation errors',
          likelihood: 'medium',
        });
        maxSeverity = 'high';
      }
    });

    // Framework-specific business risks
    context.frameworks?.forEach((framework) => {
      if (['node', 'express'].includes(framework.framework) && context.patterns?.length > 0) {
        const severity: 'medium' = 'medium';
        risks.push({
          type: 'server_business_exposure',
          severity,
          description: `Server-side framework with business logic: ${framework.framework}`,
          location: { line: 1 },
          impact: 'Server-side business logic exposure',
          likelihood: 'medium',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      }
    });

    return {
      level: maxSeverity,
      score: this.calculateCategoryScore(risks),
      risks,
      summary: this.generateCategorySummary('business', risks),
    };
  }

  /**
   * Analyze technical debt and maintainability risks
   */
  private static analyzeTechnicalRisk(context: SemanticContext): CategoryRisk {
    const risks: RiskItem[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // High complexity functions
    context.functions?.forEach((func) => {
      const estimatedComplexity = func.endLine - func.startLine + func.parameters.length * 2;

      if (estimatedComplexity > 25) {
        const severity: 'medium' | 'high' = estimatedComplexity > 40 ? 'high' : 'medium';
        risks.push({
          type: 'high_complexity',
          severity,
          description: `High complexity function: ${func.name} (estimated: ${estimatedComplexity})`,
          location: { line: func.startLine },
          impact: 'Maintenance difficulties and potential bugs',
          likelihood: 'high',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      }

      // Too many parameters
      if (func.parameters.length > 5) {
        const severity: 'medium' = 'medium';
        risks.push({
          type: 'parameter_overload',
          severity,
          description: `Too many parameters: ${func.name} (${func.parameters.length})`,
          location: { line: func.startLine },
          impact: 'Reduced readability and maintainability',
          likelihood: 'high',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      }
    });

    // Class design issues
    context.classes?.forEach((cls) => {
      // Estimate coupling from class size
      const estimatedCoupling = cls.methods.length + cls.properties.length;
      const isTightlyCoupled = estimatedCoupling > 20;

      if (isTightlyCoupled) {
        const severity: 'medium' = 'medium';
        risks.push({
          type: 'tight_coupling',
          severity,
          description: `Potentially tightly coupled class: ${cls.name}`,
          location: { line: cls.startLine },
          impact: 'Difficult to modify and test',
          likelihood: 'high',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      }

      // Low cohesion; estimate from method to property ratio
      const hasLowCohesion = cls.methods.length > 15 && cls.properties.length < 3;
      if (hasLowCohesion) {
        const severity: 'low' | 'medium' = cls.methods.length > 20 ? 'medium' : 'low';
        risks.push({
          type: 'low_cohesion',
          severity,
          description: `Potentially low cohesion class: ${cls.name}`,
          location: { line: cls.startLine },
          impact: 'Unclear responsibilities and maintenance issues',
          likelihood: 'medium',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      }
    });

    // Check for unused variables; This is basic check
    context.variables?.forEach((variable) => {
      const hasGenericName = /temp|tmp|test|unused|placeholder/i.test(variable.name);
      if (hasGenericName) {
        const severity: 'low' = 'low';
        risks.push({
          type: 'unused_code',
          severity,
          description: `Potentially unused variable: ${variable.name}`,
          location: { line: variable.line },
          impact: 'Code bloat and confusion',
          likelihood: 'medium',
        });
      }
    });

    // Technical debt from complexity metrics
    if (context.complexity?.technical_debt && context.complexity.technical_debt > 20) {
      const severity: 'medium' | 'high' =
        context.complexity.technical_debt > 50 ? 'high' : 'medium';
      risks.push({
        type: 'technical_debt',
        severity,
        description: `High technical debt score: ${context.complexity.technical_debt}`,
        location: { line: 1 },
        impact: 'Increased development time and bugs',
        likelihood: 'high',
      });

      if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
        maxSeverity = severity;
      }
    }

    return {
      level: maxSeverity,
      score: this.calculateCategoryScore(risks),
      risks,
      summary: this.generateCategorySummary('technical', risks),
    };
  }

  /**
   * Analyze compliance and regulatory risks
   */
  private static analyzeComplianceRisk(code: string, context: SemanticContext): CategoryRisk {
    const risks: RiskItem[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // PII detection
    const piiPatterns = ['email', 'phone', 'ssn', 'credit_card', 'address', 'name', 'user'];
    context.variables?.forEach((variable) => {
      const varName = variable.name.toLowerCase();
      if (piiPatterns.some((pattern) => varName.includes(pattern))) {
        const severity: 'medium' | 'high' = variable.scope === 'global' ? 'high' : 'medium';
        risks.push({
          type: 'pii_handling',
          severity,
          description: `Potential PII in variable: ${variable.name}`,
          location: { line: variable.line },
          impact: 'GDPR/CCPA violations and privacy breaches',
          likelihood: 'medium',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      }
    });

    // Logging sensitive data
    context.functions?.forEach((func) => {
      const hasLogging = /log|console|print|debug/i.test(func.name);

      if (hasLogging && func.containsSensitiveLogic) {
        const severity: 'medium' = 'medium';
        risks.push({
          type: 'sensitive_logging',
          severity,
          description: `Potential sensitive data logging: ${func.name}`,
          location: { line: func.startLine },
          impact: 'Data exposure in logs',
          likelihood: 'medium',
        });

        if (this.getSeverityLevel(severity) > this.getSeverityLevel(maxSeverity)) {
          maxSeverity = severity;
        }
      }
    });

    // Financial regulation compliance
    const financialIndicators =
      context.patterns?.filter(
        (p) => p.pattern?.includes('financial') || p.pattern?.includes('payment')
      ) || [];

    if (financialIndicators.length > 0) {
      const severity: 'high' = 'high';
      risks.push({
        type: 'financial_compliance',
        severity,
        description: 'Financial operations may require PCI DSS compliance',
        location: { line: financialIndicators[0].matches?.[0]?.line || 1 },
        impact: 'Regulatory violations and fines',
        likelihood: 'medium',
      });
      maxSeverity = 'high';
    }

    // Data storage risks
    const storageUsage =
      context.functions?.filter((f) => /storage|save|store|persist|cache/i.test(f.name)) || [];

    if (storageUsage.length > 0 && context.secrets?.hasSecrets) {
      const severity: 'high' = 'high';
      risks.push({
        type: 'unencrypted_storage',
        severity,
        description: 'Potential unencrypted sensitive data storage',
        location: { line: storageUsage[0].startLine },
        impact: 'Data breach and compliance violations',
        likelihood: 'medium',
      });
      maxSeverity = 'high';
    }

    return {
      level: maxSeverity,
      score: this.calculateCategoryScore(risks),
      risks,
      summary: this.generateCategorySummary('compliance', risks),
    };
  }

  /**
   * Calculate overall risk level from category risks
   */
  private static calculateOverallRisk(categoryRisks: CategoryRisk[]): OverallRisk {
    const maxSeverity = categoryRisks.reduce(
      (max, category) => {
        return this.getSeverityLevel(category.level) > this.getSeverityLevel(max)
          ? category.level
          : max;
      },
      'low' as 'low' | 'medium' | 'high' | 'critical'
    );

    const averageScore =
      categoryRisks.reduce((sum, cat) => sum + cat.score, 0) / categoryRisks.length;

    const totalRisks = categoryRisks.reduce((sum, cat) => sum + cat.risks.length, 0);
    const criticalCount = categoryRisks.reduce(
      (sum, cat) => sum + cat.risks.filter((r) => r.severity === 'critical').length,
      0
    );
    const highCount = categoryRisks.reduce(
      (sum, cat) => sum + cat.risks.filter((r) => r.severity === 'high').length,
      0
    );

    let recommendation: string;
    if (maxSeverity === 'critical' || criticalCount > 0) {
      recommendation =
        'CRITICAL: Do not proceed with AI analysis. Address critical security issues immediately.';
    } else if (maxSeverity === 'high' || highCount > 3) {
      recommendation = 'HIGH RISK: Review and mitigate high-risk items before AI analysis.';
    } else if (maxSeverity === 'medium' || totalRisks > 10) {
      recommendation = 'MEDIUM RISK: Consider addressing identified risks before AI analysis.';
    } else {
      recommendation = 'LOW RISK: Generally safe for AI analysis with standard precautions.';
    }

    return {
      level: maxSeverity,
      score: Math.round(averageScore),
      confidence: this.calculateConfidence(totalRisks, averageScore),
      recommendation,
      shouldBlock: maxSeverity === 'critical' || criticalCount > 0,
      requiresReview: maxSeverity === 'high' || highCount > 2,
      riskFactors: {
        total: totalRisks,
        critical: criticalCount,
        high: highCount,
        medium: categoryRisks.reduce(
          (sum, cat) => sum + cat.risks.filter((r) => r.severity === 'medium').length,
          0
        ),
        low: categoryRisks.reduce(
          (sum, cat) => sum + cat.risks.filter((r) => r.severity === 'low').length,
          0
        ),
      },
    };
  }

  /**
   * Generate risk-specific recommendations
   */
  private static generateRiskRecommendations(
    security: CategoryRisk,
    business: CategoryRisk,
    technical: CategoryRisk,
    compliance: CategoryRisk
  ): string[] {
    const recommendations: string[] = [];

    // Security recommendations
    if (security.level === 'high' || security.level === 'critical') {
      recommendations.push('Immediately secure any exposed secrets or credentials');
      recommendations.push('Review and validate all external API calls and data handling');
    }
    if (security.risks.some((r) => r.type === 'dangerous_import')) {
      recommendations.push('Audit dangerous module imports and consider safer alternatives');
    }
    if (security.risks.some((r) => r.type === 'dynamic_execution')) {
      recommendations.push('Remove eval() and dynamic code execution - critical security risk');
    }

    // Business recommendations
    if (business.level === 'high') {
      recommendations.push('Abstract or remove proprietary business logic before AI analysis');
      recommendations.push('Ensure financial calculations have proper validation and testing');
    }
    if (business.risks.some((r) => r.type === 'business_logic_exposure')) {
      recommendations.push(
        'Consider creating sanitized versions of business-critical functions'
      );
    }

    // Technical recommendations
    if (technical.level === 'medium' || technical.level === 'high') {
      recommendations.push('Refactor high-complexity functions to improve maintainability');
      recommendations.push('Reduce coupling and improve cohesion in class design');
    }
    if (technical.risks.some((r) => r.type === 'unused_code')) {
      recommendations.push('Remove unused variables and dead code');
    }

    // Compliance recommendations
    if (compliance.level === 'high') {
      recommendations.push('Ensure PII handling complies with relevant privacy regulations');
      recommendations.push('Implement proper encryption for sensitive data storage');
    }
    if (compliance.risks.some((r) => r.type === 'financial_compliance')) {
      recommendations.push('Review financial operations for PCI DSS compliance requirements');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Code analysis complete - no major risks identified');
      recommendations.push('Consider regular security reviews as part of development process');
    }

    return recommendations;
  }

  /**
   * Generate mitigation strategies
   */
  private static generateMitigationStrategies(
    overallRisk: OverallRisk,
    context: SemanticContext
  ): string[] {
    const strategies: string[] = [];

    if (overallRisk.shouldBlock) {
      strategies.push('Block AI analysis until critical issues are resolved');
      strategies.push('Conduct manual security review');
      strategies.push('Implement immediate fixes for critical vulnerabilities');
    } else if (overallRisk.requiresReview) {
      strategies.push(' Require senior developer review before AI analysis');
      strategies.push('Create sanitized version for AI consumption');
      strategies.push('Implement additional access controls');
    } else {
      strategies.push('Proceed with standard AI analysis precautions');
      strategies.push('Monitor for new risks in future analyses');
    }

    // Context-specific strategies
    if (context.secrets?.hasSecrets) {
      strategies.push('Implement automated secret scanning in CI/CD pipeline');
      strategies.push('Use secure secret management services');
    }

    if (context.patterns?.some((p) => p.riskLevel === 'high')) {
      strategies.push('Create abstracted interfaces for sensitive business logic');
      strategies.push('Improve documentation for complex algorithms');
    }

    return strategies;
  }

  // Helper methods
  private static getSeverityLevel(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity];
  }

  private static mapSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  private static getSecretImpact(category: string): string {
    const impacts: Record<string, string> = {
      api_key: 'Unauthorized API access and potential data breach',
      password: 'Account compromise and unauthorized access',
      token: 'Session hijacking and identity theft',
      private_key: 'Complete system compromise',
      database: 'Data breach and system compromise',
      cloud: 'Infrastructure compromise and data loss',
      oauth: 'Account takeover and data access',
      jwt: 'Authentication bypass and privilege escalation',
    };
    return impacts[category] || 'Potential security compromise';
  }

  private static calculateCategoryScore(risks: RiskItem[]): number {
    if (risks.length === 0) return 0;

    const severityScores = { low: 1, medium: 3, high: 7, critical: 10 };
    const likelihoodMultipliers = { low: 0.3, medium: 0.6, high: 1.0 };

    const totalScore = risks.reduce((sum, risk) => {
      const baseScore = severityScores[risk.severity];
      const multiplier = likelihoodMultipliers[risk.likelihood];
      return sum + baseScore * multiplier;
    }, 0);

    return Math.min(100, Math.round((totalScore / risks.length) * 10));
  }

  private static generateCategorySummary(category: string, risks: RiskItem[]): string {
    if (risks.length === 0) {
      return `No ${category} risks detected`;
    }

    const criticalRisks = risks.filter((r) => r.severity === 'critical').length;
    const highRisks = risks.filter((r) => r.severity === 'high').length;
    const mediumRisks = risks.filter((r) => r.severity === 'medium').length;
    const lowRisks = risks.filter((r) => r.severity === 'low').length;

    let summary = `${risks.length} ${category} risk${risks.length > 1 ? 's' : ''} identified`;

    if (criticalRisks > 0) summary += ` (${criticalRisks} critical)`;
    if (highRisks > 0) summary += ` (${highRisks} high)`;
    if (mediumRisks > 0) summary += ` (${mediumRisks} medium)`;
    if (lowRisks > 0) summary += ` (${lowRisks} low)`;

    return summary;
  }

  private static calculateConfidence(totalRisks: number, averageScore: number): number {
    // Higher confidence with more data points and consistent scoring
    const dataConfidence = Math.min(totalRisks / 10, 1);
    const scoreConfidence = averageScore > 0 ? Math.min(averageScore / 100, 1) : 0.5;

    return Math.round((dataConfidence * 0.4 + scoreConfidence * 0.6) * 100);
  }

  private static findLineNumber(code: string, pattern: RegExp): number {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return i + 1;
      }
    }
    return 1;
  }
}
