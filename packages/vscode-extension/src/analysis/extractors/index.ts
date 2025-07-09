/**
 * Extractors Module Barrel Export
 * Centralized export for all code extraction logic
 */

import { ClassExtractor } from './ClassExtractor';
import { FunctionExtractor } from './FunctionExtractor';
import { ImportExportExtractor } from './ImportExportExtractor';
import { VariableExtractor } from './VariableExtractor';

// Core Extractors
export * from './FunctionExtractor';
export { FunctionExtractor } from './FunctionExtractor';

export * from './VariableExtractor';
export { VariableExtractor } from './VariableExtractor';

export * from './ImportExportExtractor';
export { ImportExportExtractor } from './ImportExportExtractor';

export * from './ClassExtractor';
export { ClassExtractor } from './ClassExtractor';

// Re-export interfaces for convenience
export type {
  FunctionInfo,
  VariableInfo,
  ImportInfo,
  ExportInfo,
  ClassInfo,
} from '../interfaces/TreeSitterInterfaces';

/**
 * Unified Code Extraction Engine
 * Combines all extractors for comprehensive code analysis
 */
export class UnifiedCodeExtractor {
  /**
   * Extract all code elements from source code
   */
  public static extractAll(
    code: string,
    fileName?: string
  ): {
    functions: import('../interfaces/TreeSitterInterfaces').FunctionInfo[];
    variables: import('../interfaces/TreeSitterInterfaces').VariableInfo[];
    imports: import('../interfaces/TreeSitterInterfaces').ImportInfo[];
    exports: import('../interfaces/TreeSitterInterfaces').ExportInfo[];
    classes: import('../interfaces/TreeSitterInterfaces').ClassInfo[];
    metadata: {
      totalElements: number;
      complexity: number;
      dependencies: {
        external: string[];
        internal: string[];
      };
      apiSurface: {
        public: string[];
        exported: string[];
      };
      risks: {
        sensitiveVariables: number;
        sensitiveFunctions: number;
        riskyImports: number;
      };
    };
  } {
    // Extract all code elements
    const functions = FunctionExtractor.extractFunctions(code);
    const variables = VariableExtractor.extractVariables(code);
    const imports = ImportExportExtractor.extractImports(code);
    const exports = ImportExportExtractor.extractExports(code);
    const classes = ClassExtractor.extractClasses(code);

    // Calculate metadata
    const metadata = this.calculateMetadata(functions, variables, imports, exports, classes);

    return {
      functions,
      variables,
      imports,
      exports,
      classes,
      metadata,
    };
  }

  /**
   * Extract functions only
   */
  public static extractFunctions(
    code: string
  ): import('../interfaces/TreeSitterInterfaces').FunctionInfo[] {
    return FunctionExtractor.extractFunctions(code);
  }

  /**
   * Extract variables only
   */
  public static extractVariables(
    code: string
  ): import('../interfaces/TreeSitterInterfaces').VariableInfo[] {
    return VariableExtractor.extractVariables(code);
  }

  /**
   * Extract imports only
   */
  public static extractImports(
    code: string
  ): import('../interfaces/TreeSitterInterfaces').ImportInfo[] {
    return ImportExportExtractor.extractImports(code);
  }

  /**
   * Extract exports only
   */
  public static extractExports(
    code: string
  ): import('../interfaces/TreeSitterInterfaces').ExportInfo[] {
    return ImportExportExtractor.extractExports(code);
  }

  /**
   * Extract classes only
   */
  public static extractClasses(
    code: string
  ): import('../interfaces/TreeSitterInterfaces').ClassInfo[] {
    return ClassExtractor.extractClasses(code);
  }

  /**
   * Calculate comprehensive metadata from extracted elements
   */
  private static calculateMetadata(
    functions: import('../interfaces/TreeSitterInterfaces').FunctionInfo[],
    variables: import('../interfaces/TreeSitterInterfaces').VariableInfo[],
    imports: import('../interfaces/TreeSitterInterfaces').ImportInfo[],
    exports: import('../interfaces/TreeSitterInterfaces').ExportInfo[],
    classes: import('../interfaces/TreeSitterInterfaces').ClassInfo[]
  ) {
    const totalElements =
      functions.length + variables.length + imports.length + exports.length + classes.length;

    // Calculate complexity score
    const functionComplexity = functions.length * 2;
    const classComplexity = classes.reduce(
      (sum, cls) => sum + cls.methods.length + cls.properties.length,
      0
    );
    const variableComplexity = variables.length * 0.5;
    const importComplexity = imports.length * 0.3;
    const complexity = functionComplexity + classComplexity + variableComplexity + importComplexity;

    // Categorize dependencies
    const external: string[] = [];
    const internal: string[] = [];

    imports.forEach((imp) => {
      if (imp.module.startsWith('.') || imp.module.startsWith('/')) {
        if (!internal.includes(imp.module)) {
          internal.push(imp.module);
        }
      } else {
        if (!external.includes(imp.module)) {
          external.push(imp.module);
        }
      }
    });

    // Build API surface
    const publicFunctions = functions.filter((f) => f.isExported).map((f) => f.name);
    const publicClasses = classes.filter((c) => c.isExported).map((c) => c.name);
    const exportedItems = exports.map((e) => e.name);

    const apiSurface = {
      public: [...publicFunctions, ...publicClasses],
      exported: exportedItems,
    };

    // Assess risks
    const sensitiveVariables = variables.filter((v) => v.isPotentialSecret).length;
    const sensitiveFunctions = functions.filter((f) => f.containsSensitiveLogic).length;

    // Count risky imports
    const riskyPatterns = ['fs', 'child_process', 'vm', 'eval', 'crypto', 'os', 'path'];
    const riskyImports = imports.filter((imp) =>
      riskyPatterns.some((pattern) => imp.module.includes(pattern))
    ).length;

    return {
      totalElements,
      complexity,
      dependencies: {
        external,
        internal,
      },
      apiSurface,
      risks: {
        sensitiveVariables,
        sensitiveFunctions,
        riskyImports,
      },
    };
  }

  /**
   * Generate extraction summary report
   */
  public static generateSummary(
    code: string,
    fileName?: string
  ): {
    summary: string;
    details: {
      functions: number;
      variables: number;
      imports: number;
      exports: number;
      classes: number;
    };
    risks: string[];
    recommendations: string[];
  } {
    const extracted = this.extractAll(code, fileName);
    const { functions, variables, imports, exports, classes, metadata } = extracted;

    // Generate summary text
    const summary =
      `Code contains ${metadata.totalElements} total elements: ` +
      `${functions.length} functions, ${variables.length} variables, ` +
      `${imports.length} imports, ${exports.length} exports, ${classes.length} classes. ` +
      `Complexity score: ${Math.round(metadata.complexity)}.`;

    // Identify risks
    const risks: string[] = [];
    if (metadata.risks.sensitiveVariables > 0) {
      risks.push(`${metadata.risks.sensitiveVariables} potentially sensitive variables detected`);
    }
    if (metadata.risks.sensitiveFunctions > 0) {
      risks.push(`${metadata.risks.sensitiveFunctions} functions with sensitive business logic`);
    }
    if (metadata.risks.riskyImports > 0) {
      risks.push(`${metadata.risks.riskyImports} potentially risky imports detected`);
    }
    if (metadata.dependencies.external.length > 20) {
      risks.push(`High number of external dependencies (${metadata.dependencies.external.length})`);
    }
    if (metadata.complexity > 100) {
      risks.push(`High code complexity (${Math.round(metadata.complexity)})`);
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (risks.length === 0) {
      recommendations.push('Code structure looks good - no major concerns detected');
    } else {
      recommendations.push('Review detected risks before sharing with AI assistants');
    }

    if (metadata.risks.sensitiveVariables > 0) {
      recommendations.push('Move sensitive values to environment variables or secure storage');
    }

    if (metadata.risks.sensitiveFunctions > 0) {
      recommendations.push('Consider abstracting or removing business logic before AI analysis');
    }

    if (metadata.dependencies.external.length > 10) {
      recommendations.push('Consider dependency reduction for better security');
    }

    if (functions.length > 50) {
      recommendations.push('Consider breaking down large files for better maintainability');
    }

    if (metadata.apiSurface.exported.length > 20) {
      recommendations.push('Consider reducing public API surface area');
    }

    return {
      summary,
      details: {
        functions: functions.length,
        variables: variables.length,
        imports: imports.length,
        exports: exports.length,
        classes: classes.length,
      },
      risks,
      recommendations,
    };
  }

  /**
   * Analyze code quality metrics
   */
  public static analyzeQuality(code: string): {
    maintainability: 'high' | 'medium' | 'low';
    testability: 'high' | 'medium' | 'low';
    reusability: 'high' | 'medium' | 'low';
    security: 'high' | 'medium' | 'low';
    scores: {
      maintainability: number;
      testability: number;
      reusability: number;
      security: number;
      overall: number;
    };
    suggestions: string[];
  } {
    const extracted = this.extractAll(code);
    const { functions, variables, imports, exports, classes, metadata } = extracted;

    // Calculate quality scores
    let maintainabilityScore = 100;
    let testabilityScore = 100;
    let reusabilityScore = 100;
    let securityScore = 100;

    // Maintainability factors
    if (metadata.complexity > 100) maintainabilityScore -= 30;
    if (functions.some((f) => f.parameters.length > 5)) maintainabilityScore -= 20;
    if (metadata.totalElements > 100) maintainabilityScore -= 20;
    if (classes.some((c) => c.methods.length > 15)) maintainabilityScore -= 15;

    // Testability factors
    const pureFunction = functions.filter(
      (f) => !f.containsSensitiveLogic && f.parameters.length <= 3
    );
    if (pureFunction.length / functions.length < 0.5) testabilityScore -= 25;
    if (metadata.dependencies.external.length > 10) testabilityScore -= 20;
    if (classes.length > functions.length) testabilityScore -= 15;

    // Reusability factors
    if (exports.length === 0) reusabilityScore -= 40;
    if (metadata.apiSurface.public.length === 0) reusabilityScore -= 20;
    if (metadata.risks.sensitiveFunctions > 0) reusabilityScore -= 30;
    if (imports.filter((i) => i.module.startsWith('.')).length > 5) reusabilityScore -= 15;

    // Security factors
    securityScore -= metadata.risks.sensitiveVariables * 15;
    securityScore -= metadata.risks.sensitiveFunctions * 10;
    securityScore -= metadata.risks.riskyImports * 20;
    if (variables.some((v) => v.scope === 'global')) securityScore -= 10;

    // Normalize scores
    maintainabilityScore = Math.max(0, Math.min(100, maintainabilityScore));
    testabilityScore = Math.max(0, Math.min(100, testabilityScore));
    reusabilityScore = Math.max(0, Math.min(100, reusabilityScore));
    securityScore = Math.max(0, Math.min(100, securityScore));

    const overallScore =
      (maintainabilityScore + testabilityScore + reusabilityScore + securityScore) / 4;

    // Convert to ratings
    const getRating = (score: number): 'high' | 'medium' | 'low' => {
      if (score >= 75) return 'high';
      if (score >= 50) return 'medium';
      return 'low';
    };

    // Generate suggestions
    const suggestions: string[] = [];

    if (maintainabilityScore < 60) {
      suggestions.push('Reduce complexity by breaking down large functions and classes');
    }
    if (testabilityScore < 60) {
      suggestions.push('Improve testability by reducing dependencies and function parameters');
    }
    if (reusabilityScore < 60) {
      suggestions.push(
        'Enhance reusability by creating clear public APIs and reducing tight coupling'
      );
    }
    if (securityScore < 60) {
      suggestions.push(
        'Improve security by removing hardcoded secrets and reducing risky dependencies'
      );
    }

    return {
      maintainability: getRating(maintainabilityScore),
      testability: getRating(testabilityScore),
      reusability: getRating(reusabilityScore),
      security: getRating(securityScore),
      scores: {
        maintainability: Math.round(maintainabilityScore),
        testability: Math.round(testabilityScore),
        reusability: Math.round(reusabilityScore),
        security: Math.round(securityScore),
        overall: Math.round(overallScore),
      },
      suggestions,
    };
  }

  /**
   * Extract code dependencies and relationships
   */
  public static analyzeDependencies(code: string): {
    modules: {
      external: Array<{ name: string; usage: string[]; isDynamic: boolean }>;
      internal: Array<{ name: string; usage: string[]; isDynamic: boolean }>;
    };
    functionCalls: Array<{ caller: string; callee: string; line: number }>;
    classHierarchy: Array<{ child: string; parent: string }>;
    exports: Array<{ name: string; type: string; isDefault: boolean }>;
    complexity: {
      cyclomaticComplexity: number;
      cognitiveComplexity: number;
      dependencies: number;
    };
  } {
    const extracted = this.extractAll(code);
    const { functions, imports, exports, classes } = extracted;

    // Analyze modules
    const externalModules: Array<{ name: string; usage: string[]; isDynamic: boolean }> = [];
    const internalModules: Array<{ name: string; usage: string[]; isDynamic: boolean }> = [];

    imports.forEach((imp) => {
      const isInternal = imp.module.startsWith('.') || imp.module.startsWith('/');
      const moduleList = isInternal ? internalModules : externalModules;

      const existing = moduleList.find((m) => m.name === imp.module);
      if (existing) {
        existing.usage.push(...imp.imports);
        existing.isDynamic = existing.isDynamic || imp.isDynamic;
      } else {
        moduleList.push({
          name: imp.module,
          usage: [...imp.imports],
          isDynamic: imp.isDynamic,
        });
      }
    });

    // Extract function call relationships
    const functionCalls: Array<{ caller: string; callee: string; line: number }> = [];
    functions.forEach((func) => {
      // TODO: more sophisticated parsing to extract actual call relationships
      // This is a basic structure
    });

    // Extract class hierarchy
    const classHierarchy: Array<{ child: string; parent: string }> = [];
    const inheritanceInfo = ClassExtractor.analyzeInheritance(code);
    inheritanceInfo.derivedClasses.forEach((derived) => {
      classHierarchy.push({
        child: derived.name,
        parent: derived.extends,
      });
    });

    // Analyze exports
    const exportAnalysis = exports.map((exp) => ({
      name: exp.name,
      type: exp.type,
      isDefault: exp.type === 'default',
    }));

    // Calculate complexity metrics
    const cyclomaticComplexity = functions.length + classes.length; // Simplified
    const cognitiveComplexity = functions.length * 1.5 + classes.length * 2; // Simplified
    const dependencyComplexity = imports.length + exports.length;

    return {
      modules: {
        external: externalModules,
        internal: internalModules,
      },
      functionCalls,
      classHierarchy,
      exports: exportAnalysis,
      complexity: {
        cyclomaticComplexity,
        cognitiveComplexity,
        dependencies: dependencyComplexity,
      },
    };
  }

  /**
   * Quick extraction for performance-critical scenarios
   */
  public static quickExtract(code: string): {
    hasClasses: boolean;
    hasFunctions: boolean;
    hasImports: boolean;
    hasExports: boolean;
    hasVariables: boolean;
    estimatedComplexity: 'low' | 'medium' | 'high';
    quickRisks: string[];
  } {
    // Quick regex-based detection
    const hasClasses = /\bclass\s+\w+/g.test(code);
    const hasFunctions = /\bfunction\s+\w+|\w+\s*=\s*\([^)]*\)\s*=>/g.test(code);
    const hasImports = /\bimport\s+.*from|require\s*\(/g.test(code);
    const hasExports = /\bexport\s+|module\.exports/g.test(code);
    const hasVariables = /\b(?:const|let|var)\s+\w+/g.test(code);

    // Quick complexity estimation
    const lineCount = code.split('\n').length;
    const functionCount = (code.match(/\bfunction\s+\w+|\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length;
    const classCount = (code.match(/\bclass\s+\w+/g) || []).length;

    let estimatedComplexity: 'low' | 'medium' | 'high' = 'low';
    if (lineCount > 500 || functionCount > 20 || classCount > 5) {
      estimatedComplexity = 'high';
    } else if (lineCount > 200 || functionCount > 10 || classCount > 2) {
      estimatedComplexity = 'medium';
    }

    // Quick risk assessment
    const quickRisks: string[] = [];
    if (/password|secret|token|api_key/gi.test(code)) {
      quickRisks.push('Potential secrets detected');
    }
    if (/eval\s*\(|Function\s*\(/g.test(code)) {
      quickRisks.push('Dynamic code execution detected');
    }
    if (/require\s*\(\s*['"](?:fs|child_process|vm)/g.test(code)) {
      quickRisks.push('Potentially risky Node.js modules detected');
    }

    return {
      hasClasses,
      hasFunctions,
      hasImports,
      hasExports,
      hasVariables,
      estimatedComplexity,
      quickRisks,
    };
  }
}

/**
 * Extraction utilities and helpers
 */
export class ExtractionUtils {
  /**
   * Clean extracted code for safe display
   */
  public static sanitizeExtractedCode(code: string): string {
    // Remove potential secrets
    return code
      .replace(/(['"])[a-zA-Z0-9_\-\.]{20,}\1/g, '$1[REDACTED]$1')
      .replace(/password\s*[:=]\s*(['"])[^'"]+\1/gi, 'password$1[REDACTED]$1')
      .replace(/token\s*[:=]\s*(['"])[^'"]+\1/gi, 'token$1[REDACTED]$1')
      .replace(/key\s*[:=]\s*(['"])[^'"]+\1/gi, 'key$1[REDACTED]$1');
  }

  /**
   * Format extraction results for display
   */
  public static formatExtractionResults(
    extracted: ReturnType<typeof UnifiedCodeExtractor.extractAll>
  ): string {
    const { functions, variables, imports, exports, classes, metadata } = extracted;

    const sections = [
      `**Extraction Summary**`,
      `- Functions: ${functions.length}`,
      `- Variables: ${variables.length}`,
      `- Imports: ${imports.length}`,
      `- Exports: ${exports.length}`,
      `- Classes: ${classes.length}`,
      `- Complexity: ${Math.round(metadata.complexity)}`,
      '',
      `**Dependencies**`,
      `- External: ${metadata.dependencies.external.length}`,
      `- Internal: ${metadata.dependencies.internal.length}`,
      '',
      `**Risk Assessment**`,
      `- Sensitive Variables: ${metadata.risks.sensitiveVariables}`,
      `- Sensitive Functions: ${metadata.risks.sensitiveFunctions}`,
      `- Risky Imports: ${metadata.risks.riskyImports}`,
    ];

    return sections.join('\n');
  }

  /**
   * Get file type from filename
   */
  public static getFileType(
    fileName: string
  ): 'javascript' | 'typescript' | 'jsx' | 'tsx' | 'unknown' {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'js':
        return 'javascript';
      case 'jsx':
        return 'jsx';
      case 'ts':
        return 'typescript';
      case 'tsx':
        return 'tsx';
      default:
        return 'unknown';
    }
  }

  /**
   * Estimate extraction performance impact
   */
  public static estimatePerformance(codeLength: number): {
    estimatedTime: number; // milliseconds
    recommendation: 'fast' | 'normal' | 'slow';
    shouldUseQuickExtract: boolean;
  } {
    // Very rough estimates based on code length
    const estimatedTime = Math.max(10, (codeLength / 1000) * 5);

    let recommendation: 'fast' | 'normal' | 'slow' = 'fast';
    if (codeLength > 50000) recommendation = 'slow';
    else if (codeLength > 10000) recommendation = 'normal';

    const shouldUseQuickExtract = codeLength > 100000;

    return {
      estimatedTime,
      recommendation,
      shouldUseQuickExtract,
    };
  }
}
