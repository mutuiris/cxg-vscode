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
