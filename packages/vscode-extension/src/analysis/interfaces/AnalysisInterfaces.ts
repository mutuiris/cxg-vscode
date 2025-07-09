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