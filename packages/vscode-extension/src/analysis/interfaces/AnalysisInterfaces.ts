import { SemanticContext, CodeComplexity, FrameworkDetection } from './TreeSitterInterfaces';

/**
 * Analysis Result Interfaces
 * Defines types for analysis results and server communication
 */

export interface Match {
  pattern: string;
  line: number;
  column: number;
  text: string;
  severity: 'low' | 'medium' | 'high';
  context?: string;
}

export interface SyntaxError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}

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

  // Enhanced with tree-sitter analysis
  semanticContext?: SemanticContext;
  syntaxErrors?: SyntaxError[];
  codeComplexity?: CodeComplexity;
  frameworkDetection?: FrameworkDetection;
}

export interface ServerAnalysisResponse {
  success: boolean;
  result: any;
  error?: string;
}

export interface ServerBusinessLogicMatch {
  description: string;
  confidence: number;
}

export interface ServerInfrastructureMatch {
  line: number;
  column: number;
  description: string;
}

export interface AnalysisOptions {
  enableTreeSitter?: boolean;
  cacheResults?: boolean;
  serverTimeout?: number;
  complexityThreshold?: number;
}

export interface SecuritySummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

// Type definitions for risk analysis

export interface RiskAnalysisResult {
  overall: OverallRisk;
  categories: {
    security: CategoryRisk;
    business: CategoryRisk;
    technical: CategoryRisk;
    compliance: CategoryRisk;
  };
  recommendations: string[];
  mitigationStrategies: string[];
  riskFactors: Array<{
    type: 'security' | 'maintainability' | 'performance' | 'reliability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location: { line: number; column?: number };
    recommendation: string;
  }>;
  timestamp: Date;
  fileName: string;
}

export interface OverallRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  confidence: number; // 0-100
  recommendation: string;
  shouldBlock: boolean;
  requiresReview: boolean;
  riskFactors: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface CategoryRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  risks: RiskItem[];
  summary: string;
}

export interface RiskItem {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: { line: number; column?: number };
  impact: string;
  likelihood: 'low' | 'medium' | 'high';
}

export interface QuickRiskResult {
  riskLevel: 'low' | 'medium' | 'high';
  shouldBlock: boolean;
  findings: string[];
  recommendations: string[];
  processingTime: number;
}

// Type definitions for Intelligence Analysis
export interface IntelligenceAnalysisResult {
  threatIntelligence: ThreatIntelligence;
  behaviorAnalysis: BehaviorAnalysis;
  intentAnalysis: IntentAnalysis;
  anomalyDetection: AnomalyDetection;
  contextualInsights: ContextualInsights;
  actionableRecommendations: ActionableRecommendations;
  overallAssessment: OverallAssessment;
  timestamp: Date;
}

export interface ThreatIntelligence {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  knownThreats: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }>;
  maliciousPatterns: Array<{ pattern: string; risk: 'low' | 'medium' | 'high'; explanation: string }>;
  suspiciousActivity: Array<{ activity: string; confidence: number; evidence: string[] }>;
  dataExfiltration: { risk: 'low' | 'medium' | 'high'; indicators: string[]; likelihood: number };
  codeInjection: { risk: 'low' | 'medium' | 'high'; vectors: string[]; mitigation: string[] };
  threatSources: string[];
  mitigationPriority: 'immediate' | 'urgent' | 'normal' | 'low';
}

export interface BehaviorAnalysis {
  accessPatterns: Array<{ pattern: string; frequency: number; risk: 'low' | 'medium' | 'high' }>;
  communicationPatterns: { type: string; destinations: string[]; protocols: string[]; risk: 'low' | 'medium' | 'high' };
  dataProcessingPatterns: { operations: string[]; sensitivity: 'low' | 'medium' | 'high'; volume: 'low' | 'medium' | 'high' };
  resourceUsagePatterns: any;
  timeBasedPatterns: any;
  behaviorScore: number;
  anomalies: string[];
}

export interface IntentAnalysis {
  primaryPurpose: string;
  secondaryPurposes: string[];
  hiddenFunctionality: any[];
  businessAlignment: number;
  technicalAlignment: number;
  intentClarity: number;
  legitimacyScore: number;
  suspicionIndicators: string[];
}

export interface AnomalyDetection {
  structuralAnomalies: any[];
  behavioralAnomalies: any[];
  patternAnomalies: any[];
  statisticalAnomalies: any[];
  anomalyScore: number;
  confidence: number;
}

export interface ContextualInsights {
  frameworkSpecificInsights: string[];
  businessContextInsights: string[];
  securityContextInsights: string[];
  complianceInsights: string[];
  performanceInsights: string[];
  keyFindings: string[];
  strategicRecommendations: string[];
}

export interface ActionableRecommendations {
  immediateActions: string[];
  shortTermActions: string[];
  longTermActions: string[];
  preventiveActions: string[];
  monitoringActions: string[];
  priorityMatrix: any;
  implementationRoadmap: any;
}

export interface OverallAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  actionRequired: boolean;
  urgency: 'immediate' | 'urgent' | 'normal' | 'low';
  summary: string;
}