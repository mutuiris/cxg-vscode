/**
 * Analyzers Module Barrel Export
 * Centralized export for all analysis engines
 */

import { IntelligenceAnalyzer } from './IntelligenceAnalyzer';
import { RiskAnalyzer } from './RiskAnalyzer';
import { SemanticAnalyzer } from './SemanticAnalyzer';

// Core Analyzers
export * from './SemanticAnalyzer';
export { SemanticAnalyzer } from './SemanticAnalyzer';

export * from './RiskAnalyzer';
export { 
  RiskAnalyzer,
  type RiskAnalysisResult,
  type OverallRisk,
  type CategoryRisk,
  type RiskItem
} from './RiskAnalyzer';

export * from './IntelligenceAnalyzer';
export { 
  IntelligenceAnalyzer,
  type IntelligenceAnalysisResult,
  type ThreatIntelligence,
  type BehaviorAnalysis,
  type IntentAnalysis,
  type AnomalyDetection,
  type ContextualInsights,
  type ActionableRecommendations,
  type OverallAssessment
} from './IntelligenceAnalyzer';

/**
 * Unified Analysis Engine
 * Orchestrates all analysis capabilities for comprehensive code assessment
 */
export class UnifiedAnalysisEngine {
  /**
   * Perform comprehensive analysis using all analyzers
   */
  public static async analyzeComprehensively(
    code: string,
    fileName?: string,
    dependencies?: string[]
  ): Promise<ComprehensiveAnalysisResult> {
    // Perform semantic analysis first
    const semanticContext = SemanticAnalyzer.analyzeSemantics(code, fileName, dependencies);

    // Perform risk analysis based on semantic context
    const riskAnalysis = RiskAnalyzer.analyzeRisk(code, semanticContext, fileName);

    // Perform intelligence analysis for deeper insights
    const intelligenceAnalysis = IntelligenceAnalyzer.analyzeIntelligence(
      code,
      semanticContext,
      riskAnalysis,
      fileName
    );

    // Calculate comprehensive metrics
    const comprehensiveMetrics = this.calculateComprehensiveMetrics(
      semanticContext,
      riskAnalysis,
      intelligenceAnalysis
    );

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(
      semanticContext,
      riskAnalysis,
      intelligenceAnalysis
    );

    // Generate consolidated recommendations
    const consolidatedRecommendations = this.consolidateRecommendations(
      riskAnalysis,
      intelligenceAnalysis
    );

    return {
      semanticContext,
      riskAnalysis,
      intelligenceAnalysis,
      comprehensiveMetrics,
      executiveSummary,
      consolidatedRecommendations,
      analysisMetadata: {
        timestamp: new Date(),
        fileName: fileName || 'unknown',
        codeLength: code.length,
        analysisVersion: '1.0.0',
        processingTime: Date.now() // Would be calculated in real implementation
      }
    };
  }

  /**
   * Quick analysis for performance-critical scenarios
   */
  public static quickAnalyze(
    code: string,
    fileName?: string
  ): QuickAnalysisResult {
    // Quick semantic analysis
    const quickSemantic = {
      functionCount: (code.match(/function\s+\w+|\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length,
      classCount: (code.match(/class\s+\w+/g) || []).length,
      importCount: (code.match(/import\s+.*from|require\s*\(/g) || []).length,
      hasSecrets: /password|secret|token|key/gi.test(code),
      hasDynamicCode: /eval\s*\(|Function\s*\(/gi.test(code)
    };

    // Quick risk assessment
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const quickRisks = [];

    if (quickSemantic.hasSecrets) {
      quickRisks.push('Potential secrets detected');
      riskLevel = 'medium';
    }

    if (quickSemantic.hasDynamicCode) {
      quickRisks.push('Dynamic code execution detected');
      riskLevel = 'high';
    }

    if (/child_process|fs\.|eval|vm\./gi.test(code)) {
      quickRisks.push('Potentially dangerous operations');
      riskLevel = 'high';
    }

    // Quick recommendations
    const quickRecommendations = [];
    if (riskLevel === 'high') {
      quickRecommendations.push('Conduct detailed security review before AI analysis');
    }
    if (quickSemantic.hasSecrets) {
      quickRecommendations.push('Remove or mask sensitive values');
    }

    return {
      riskLevel,
      quickRisks,
      quickRecommendations,
      shouldBlock: riskLevel === 'high',
      metrics: quickSemantic,
      processingTime: Date.now() // Would be calculated in real implementation
    };
  }

  /**
   * Specialized analysis for AI assistant integration
   */
  public static analyzeForAI(
    code: string,
    fileName?: string,
    aiContext?: AIAnalysisContext
  ): AIAnalysisResult {
    // Perform targeted analysis for AI safety
    const semanticContext = SemanticAnalyzer.analyzeSemantics(code, fileName);
    const riskAnalysis = RiskAnalyzer.analyzeRisk(code, semanticContext, fileName);

    // AI-specific risk assessment
    const aiRisks = this.assessAISpecificRisks(semanticContext, riskAnalysis, aiContext);

    // Sanitization recommendations
    const sanitizationPlan = this.generateSanitizationPlan(riskAnalysis, aiRisks);

    // AI interaction guidelines
    const aiGuidelines = this.generateAIGuidelines(riskAnalysis, aiRisks);

    return {
      overallSafety: this.calculateAISafety(riskAnalysis, aiRisks),
      aiRisks,
      sanitizationPlan,
      aiGuidelines,
      originalAnalysis: {
        semantic: semanticContext,
        risk: riskAnalysis
      },
      metadata: {
        analysisDate: new Date(),
        aiContextProvided: !!aiContext,
        riskFactorCount: riskAnalysis.riskFactors.length
      }
    };
  }

  /**
   * Calculate comprehensive metrics across all analyses
   */
  private static calculateComprehensiveMetrics(
    semantic: any,
    risk: any,
    intelligence: any
  ): ComprehensiveMetrics {
    return {
      overallComplexity: {
        semantic: semantic.complexity?.cognitive || 0,
        risk: risk.overall.score,
        intelligence: intelligence.behaviorAnalysis.behaviorScore * 100
      },
      securityPosture: {
        vulnerabilityCount: risk.riskFactors.filter((r: any) => r.type === 'security').length,
        threatLevel: intelligence.threatIntelligence.threatLevel,
        mitigationCoverage: this.calculateMitigationCoverage(risk, intelligence)
      },
      maintainabilityIndex: {
        codeQuality: semantic.complexity?.maintainability || 0,
        technicalDebt: semantic.complexity?.technical_debt || 0,
        refactoringPriority: this.calculateRefactoringPriority(semantic, risk)
      },
      businessImpact: {
        businessLogicExposure: semantic.patterns?.filter((p: any) => p.riskLevel === 'high').length || 0,
        complianceRisk: risk.categories.compliance.level,
        intellectualPropertyRisk: this.calculateIPRisk(semantic, intelligence)
      }
    };
  }

  /**
   * Generate executive summary
   */
  private static generateExecutiveSummary(
    semantic: any,
    risk: any,
    intelligence: any
  ): ExecutiveSummary {
    const keyFindings = [
      `Overall risk level: ${risk.overall.level}`,
      `Security score: ${risk.overall.score}/100`,
      `Threat level: ${intelligence.threatIntelligence.threatLevel}`,
      `Code complexity: ${semantic.complexity?.cognitive || 'unknown'}`
    ];

    const criticalIssues = risk.riskFactors
      .filter((r: any) => r.severity === 'critical' || r.severity === 'high')
      .map((r: any) => r.description);

    const businessImpact = intelligence.intentAnalysis.businessAlignment > 0.7 
      ? 'High business logic exposure detected'
      : 'Limited business logic exposure';

    const recommendedActions = intelligence.actionableRecommendations.immediateActions
      .concat(risk.recommendations)
      .slice(0, 5);

    return {
      overallAssessment: risk.overall.level,
      keyFindings,
      criticalIssues,
      businessImpact,
      recommendedActions,
      executiveRecommendation: this.generateExecutiveRecommendation(risk.overall.level, criticalIssues.length)
    };
  }

  /**
   * Consolidate recommendations from all analyzers
   */
  private static consolidateRecommendations(
    risk: any,
    intelligence: any
  ): ConsolidatedRecommendations {
    // Combine and deduplicate recommendations
    const allRecommendations = [
      ...risk.recommendations,
      ...intelligence.actionableRecommendations.immediateActions,
      ...intelligence.actionableRecommendations.shortTermActions
    ];

    const uniqueRecommendations = [...new Set(allRecommendations)];

    // Prioritize recommendations
    const prioritized = this.prioritizeRecommendations(uniqueRecommendations, risk, intelligence);

    return {
      immediate: prioritized.filter(r => r.priority === 'immediate').map(r => r.recommendation),
      shortTerm: prioritized.filter(r => r.priority === 'short-term').map(r => r.recommendation),
      longTerm: prioritized.filter(r => r.priority === 'long-term').map(r => r.recommendation),
      strategic: intelligence.contextualInsights.strategicRecommendations
    };
  }

  /**
   * Assess AI-specific risks
   */
  private static assessAISpecificRisks(
    semantic: any,
    risk: any,
    aiContext?: AIAnalysisContext
  ): AIRisk[] {
    const aiRisks: AIRisk[] = [];

    // Data exposure risks
    if (semantic.variables?.filter((v: any) => v.isPotentialSecret).length > 0) {
      aiRisks.push({
        type: 'data_exposure',
        severity: 'high',
        description: 'Code contains potential secrets that could be exposed to AI',
        mitigation: 'Remove or mask sensitive values before AI analysis'
      });
    }

    // Business logic exposure
    if (semantic.patterns?.some((p: any) => p.riskLevel === 'high')) {
      aiRisks.push({
        type: 'business_logic_exposure',
        severity: 'medium',
        description: 'Proprietary business logic may be exposed to AI systems',
        mitigation: 'Abstract or generalize business logic before sharing'
      });
    }

    // Infrastructure exposure
    if (risk.categories.security.risks.some((r: any) => r.type === 'infrastructure_exposure')) {
      aiRisks.push({
        type: 'infrastructure_exposure',
        severity: 'medium',
        description: 'Infrastructure details may be revealed to AI',
        mitigation: 'Remove infrastructure-specific configurations'
      });
    }

    return aiRisks;
  }

  /**
   * Generate sanitization plan for AI analysis
   */
  private static generateSanitizationPlan(
    risk: any,
    aiRisks: AIRisk[]
  ): SanitizationPlan {
    const steps = [];
    
    if (aiRisks.some(r => r.type === 'data_exposure')) {
      steps.push({
        step: 'Remove sensitive data',
        action: 'Replace secrets, API keys, and passwords with placeholders',
        automated: true
      });
    }

    if (aiRisks.some(r => r.type === 'business_logic_exposure')) {
      steps.push({
        step: 'Abstract business logic',
        action: 'Generalize proprietary algorithms and business rules',
        automated: false
      });
    }

    return {
      requiredSteps: steps,
      automationLevel: steps.filter(s => s.automated).length / steps.length,
      estimatedEffort: this.estimateSanitizationEffort(steps),
      riskReduction: this.calculateRiskReduction(steps, aiRisks)
    };
  }

  /**
   * Generate AI interaction guidelines
   */
  private static generateAIGuidelines(
    risk: any,
    aiRisks: AIRisk[]
  ): AIGuidelines {
    const guidelines = [];
    
    if (risk.overall.level === 'high') {
      guidelines.push('Avoid sharing this code with AI until security issues are resolved');
    }

    if (aiRisks.some(r => r.type === 'business_logic_exposure')) {
      guidelines.push('Focus AI questions on general programming concepts rather than specific logic');
    }

    return {
      allowedInteractions: this.determineAllowedInteractions(risk.overall.level),
      restrictedTopics: this.identifyRestrictedTopics(aiRisks),
      recommendations: guidelines,
      monitoringRequirements: this.generateMonitoringRequirements(risk, aiRisks)
    };
  }

  // Helper method implementations
  private static calculateAISafety(risk: any, aiRisks: AIRisk[]): 'safe' | 'caution' | 'unsafe' {
    if (risk.overall.level === 'high' || aiRisks.some(r => r.severity === 'high')) {
      return 'unsafe';
    }
    if (risk.overall.level === 'medium' || aiRisks.length > 0) {
      return 'caution';
    }
    return 'safe';
  }

  private static calculateMitigationCoverage(risk: any, intelligence: any): number {
    const totalRisks = risk.riskFactors.length;
    const mitigatedRisks = intelligence.actionableRecommendations.immediateActions.length;
    return totalRisks > 0 ? mitigatedRisks / totalRisks : 1;
  }

  private static calculateRefactoringPriority(semantic: any, risk: any): 'low' | 'medium' | 'high' {
    const complexity = semantic.complexity?.cognitive || 0;
    const riskLevel = risk.overall.level;
    
    if (complexity > 20 || riskLevel === 'high') return 'high';
    if (complexity > 10 || riskLevel === 'medium') return 'medium';
    return 'low';
  }

  private static calculateIPRisk(semantic: any, intelligence: any): 'low' | 'medium' | 'high' {
    const businessLogic = semantic.patterns?.filter((p: any) => p.riskLevel === 'high').length || 0;
    const intentClarity = intelligence.intentAnalysis.intentClarity;
    
    if (businessLogic > 2 && intentClarity < 0.5) return 'high';
    if (businessLogic > 0 || intentClarity < 0.7) return 'medium';
    return 'low';
  }

  private static generateExecutiveRecommendation(
    riskLevel: string,
    criticalIssueCount: number
  ): string {
    if (riskLevel === 'high' || criticalIssueCount > 0) {
      return 'Immediate action required - do not proceed with AI analysis until issues are resolved';
    }
    if (riskLevel === 'medium') {
      return 'Proceed with caution - address identified risks before AI analysis';
    }
    return 'Safe to proceed with AI analysis using standard security precautions';
  }

  private static prioritizeRecommendations(
    recommendations: string[],
    risk: any,
    intelligence: any
  ): Array<{ recommendation: string; priority: 'immediate' | 'short-term' | 'long-term' }> {
    return recommendations.map(rec => ({
      recommendation: rec,
      priority: this.determinePriority(rec, risk, intelligence)
    }));
  }

  private static determinePriority(
    recommendation: string,
    risk: any,
    intelligence: any
  ): 'immediate' | 'short-term' | 'long-term' {
    if (recommendation.includes('secret') || recommendation.includes('security')) {
      return 'immediate';
    }
    if (recommendation.includes('refactor') || recommendation.includes('complexity')) {
      return 'short-term';
    }
    return 'long-term';
  }

  private static estimateSanitizationEffort(steps: any[]): 'low' | 'medium' | 'high' {
    const manualSteps = steps.filter(s => !s.automated).length;
    if (manualSteps > 3) return 'high';
    if (manualSteps > 1) return 'medium';
    return 'low';
  }

  private static calculateRiskReduction(steps: any[], aiRisks: AIRisk[]): number {
    // Estimate risk reduction based on sanitization steps
    return Math.min(steps.length / aiRisks.length, 1);
  }

  private static determineAllowedInteractions(riskLevel: string): string[] {
    if (riskLevel === 'high') return ['general_questions'];
    if (riskLevel === 'medium') return ['general_questions', 'syntax_help'];
    return ['general_questions', 'syntax_help', 'code_review', 'optimization'];
  }

  private static identifyRestrictedTopics(aiRisks: AIRisk[]): string[] {
    const restricted = [];
    if (aiRisks.some(r => r.type === 'data_exposure')) {
      restricted.push('sensitive_data_handling');
    }
    if (aiRisks.some(r => r.type === 'business_logic_exposure')) {
      restricted.push('proprietary_algorithms');
    }
    return restricted;
  }

  private static generateMonitoringRequirements(risk: any, aiRisks: AIRisk[]): string[] {
    const requirements = [];
    if (risk.overall.level === 'high') {
      requirements.push('Log all AI interactions');
    }
    if (aiRisks.length > 0) {
      requirements.push('Monitor for data leakage');
    }
    return requirements;
  }
}

// Type definitions for comprehensive analysis

export interface ComprehensiveAnalysisResult {
  semanticContext: any;
  riskAnalysis: any;
  intelligenceAnalysis: any;
  comprehensiveMetrics: ComprehensiveMetrics;
  executiveSummary: ExecutiveSummary;
  consolidatedRecommendations: ConsolidatedRecommendations;
  analysisMetadata: {
    timestamp: Date;
    fileName: string;
    codeLength: number;
    analysisVersion: string;
    processingTime: number;
  };
}

export interface QuickAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high';
  quickRisks: string[];
  quickRecommendations: string[];
  shouldBlock: boolean;
  metrics: {
    functionCount: number;
    classCount: number;
    importCount: number;
    hasSecrets: boolean;
    hasDynamicCode: boolean;
  };
  processingTime: number;
}

export interface AIAnalysisResult {
  overallSafety: 'safe' | 'caution' | 'unsafe';
  aiRisks: AIRisk[];
  sanitizationPlan: SanitizationPlan;
  aiGuidelines: AIGuidelines;
  originalAnalysis: {
    semantic: any;
    risk: any;
  };
  metadata: {
    analysisDate: Date;
    aiContextProvided: boolean;
    riskFactorCount: number;
  };
}

export interface ComprehensiveMetrics {
  overallComplexity: {
    semantic: number;
    risk: number;
    intelligence: number;
  };
  securityPosture: {
    vulnerabilityCount: number;
    threatLevel: string;
    mitigationCoverage: number;
  };
  maintainabilityIndex: {
    codeQuality: number;
    technicalDebt: number;
    refactoringPriority: 'low' | 'medium' | 'high';
  };
  businessImpact: {
    businessLogicExposure: number;
    complianceRisk: string;
    intellectualPropertyRisk: 'low' | 'medium' | 'high';
  };
}

export interface ExecutiveSummary {
  overallAssessment: string;
  keyFindings: string[];
  criticalIssues: string[];
  businessImpact: string;
  recommendedActions: string[];
  executiveRecommendation: string;
}

export interface ConsolidatedRecommendations {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  strategic: string[];
}

export interface AIAnalysisContext {
  assistantType?: string;
  intendedUse?: string;
  sensitivityLevel?: 'low' | 'medium' | 'high';
  complianceRequirements?: string[];
}

export interface AIRisk {
  type: 'data_exposure' | 'business_logic_exposure' | 'infrastructure_exposure';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

export interface SanitizationPlan {
  requiredSteps: Array<{
    step: string;
    action: string;
    automated: boolean;
  }>;
  automationLevel: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  riskReduction: number;
}

export interface AIGuidelines {
  allowedInteractions: string[];
  restrictedTopics: string[];
  recommendations: string[];
  monitoringRequirements: string[];
}