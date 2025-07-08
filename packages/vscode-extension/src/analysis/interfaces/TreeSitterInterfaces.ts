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

export interface SemanticContext {
  functions: FunctionInfo[];
  variables: VariableInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: ClassInfo[];
  businessLogicIndicators: BusinessLogicIndicator[];
}

export interface CodeComplexity {
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
