/**
 * Tree-sitter Integration Interfaces
 * Defines types for tree-sitter AST analysis and semantic context
 */

export interface TreeSitterNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children?: TreeSitterNode[];
}

export interface FunctionInfo {
  name: string;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  containsSensitiveLogic: boolean;
  startLine: number;
  endLine: number;
}

export interface VariableInfo {
  name: string;
  type?: string;
  scope: 'global' | 'function' | 'block';
  isConst: boolean;
  isPotentialSecret: boolean;
  value?: string;
  line: number;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isDefault: boolean;
  isDynamic: boolean;
  line: number;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'variable' | 'class' | 'default';
  line: number;
}

export interface ClassInfo {
  name: string;
  methods: string[];
  properties: string[];
  isExported: boolean;
  startLine: number;
  endLine: number;
}

export interface BusinessLogicIndicator {
  type: 'pricing' | 'authentication' | 'algorithm' | 'financial' | 'encryption' | 'validation';
  confidence: number;
  location: { line: number; column: number };
  description: string;
  severity: 'low' | 'medium' | 'high';
}

// Enhanced interfaces for SemanticAnalyzer
export interface BusinessLogicPattern {
  type: string;
  pattern: string;
  matches: Array<{
    line: number;
    column: number;
    text: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SemanticContext {
  functions: FunctionInfo[];
  variables: VariableInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: ClassInfo[];
  businessLogicIndicators: BusinessLogicIndicator[];
  patterns: BusinessLogicPattern[];
  frameworks: FrameworkDetection[];
  secrets: {
    hasSecrets: boolean;
    matches: Array<{
      pattern: string;
      line: number;
      column: number;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
  complexity: CodeComplexity;
  relationships: {
    functionCalls: Array<{ caller: string; callee: string; type: 'direct' | 'indirect' }>;
    dataFlow: Array<{ from: string; to: string; via: string }>;
    dependencies: Array<{ dependent: string; dependency: string; type: 'strong' | 'weak' }>;
    coupling: {
      afferent: number;
      efferent: number;
      instability: number;
    };
  };
  riskFactors: Array<{
    type: 'security' | 'maintainability' | 'performance' | 'reliability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location: { line: number; column?: number };
    recommendation: string;
  }>;
}

export interface CodeComplexity {
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  technical_debt: number;
  hotspots: Array<{ type: string; name: string; line: number; complexity: number }>;

  // Legacy properties for backward compatibility
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  functionCount: number;
  classCount: number;
}

export interface FrameworkDetection {
  framework: 'react' | 'vue' | 'angular' | 'node' | 'express' | 'nextjs' | 'nuxt' | 'none';
  confidence: number;
  indicators: string[];
  version?: string;
}
