import { ImportInfo, ExportInfo } from '../interfaces/TreeSitterInterfaces';

/**
 * Import/Export Extraction Logic
 * Handles extraction and analysis of import/export statements
 */
export class ImportExportExtractor {
  /**
   * Extract import information from code
   */
  public static extractImports(code: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    // Pattern definitions for different import types
    const patterns = [
      // ES6 default imports: import defaultExport from 'module'
      {
        pattern: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
        type: 'default'
      },
      // ES6 named imports: import { named1, named2 } from 'module'
      {
        pattern: /import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/g,
        type: 'named'
      },
      // ES6 namespace imports: import * as name from 'module'
      {
        pattern: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
        type: 'namespace'
      },
      // Mixed imports: import defaultExport, { named1, named2 } from 'module'
      {
        pattern: /import\s+(\w+)\s*,\s*{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/g,
        type: 'mixed'
      },
      // Side effect imports: import 'module'
      {
        pattern: /import\s+['"]([^'"]+)['"]/g,
        type: 'side_effect'
      },
      // Dynamic imports: import('module')
      {
        pattern: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        type: 'dynamic'
      },
      // CommonJS require: const name = require('module')
      {
        pattern: /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        type: 'require'
      },
      // CommonJS destructured require: const { name1, name2 } = require('module')
      {
        pattern: /(?:const|let|var)\s+{\s*([^}]+)\s*}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        type: 'require_destructured'
      }
    ];

    patterns.forEach(({ pattern, type }) => {
      let match: RegExpExecArray | null;
      
      while ((match = pattern.exec(code)) !== null) {
        this.processImportMatch(match, type, imports, code);
      }
    });

    // Remove duplicates and sort by line number
    return this.deduplicateImports(imports);
  }

  /**
   * Extract export information from code
   */
  public static extractExports(code: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    
    // Pattern definitions for different export types
    const patterns = [
      // Named function exports: export function name() {}
      {
        pattern: /export\s+(?:async\s+)?function\s+(\w+)/g,
        type: 'function'
      },
      // Named variable/const exports: export const name = value
      {
        pattern: /export\s+(?:const|let|var)\s+(\w+)/g,
        type: 'variable'
      },
      // Named class exports: export class Name {}
      {
        pattern: /export\s+class\s+(\w+)/g,
        type: 'class'
      },
      // Default function exports: export default function name() {}
      {
        pattern: /export\s+default\s+(?:async\s+)?function\s+(\w+)/g,
        type: 'default'
      },
      // Default class exports: export default class Name {}
      {
        pattern: /export\s+default\s+class\s+(\w+)/g,
        type: 'default'
      },
      // Default variable exports: export default name
      {
        pattern: /export\s+default\s+(\w+)/g,
        type: 'default'
      },
      // Named exports list: export { name1, name2 }
      {
        pattern: /export\s*{\s*([^}]+)\s*}/g,
        type: 'named_list'
      },
      // Re-exports: export { name1, name2 } from 'module'
      {
        pattern: /export\s*{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/g,
        type: 're_export'
      },
      // Re-export all: export * from 'module'
      {
        pattern: /export\s+\*\s+from\s+['"]([^'"]+)['"]/g,
        type: 're_export_all'
      },
      // Re-export default: export { default } from 'module'
      {
        pattern: /export\s*{\s*default(?:\s+as\s+(\w+))?\s*}\s+from\s+['"]([^'"]+)['"]/g,
        type: 're_export_default'
      },
      // CommonJS module.exports
      {
        pattern: /module\.exports\s*=\s*(\w+|{[^}]*})/g,
        type: 'commonjs'
      },
      // CommonJS exports.name
      {
        pattern: /exports\.(\w+)\s*=/g,
        type: 'commonjs_named'
      }
    ];

    patterns.forEach(({ pattern, type }) => {
      let match: RegExpExecArray | null;
      
      while ((match = pattern.exec(code)) !== null) {
        this.processExportMatch(match, type, exports, code);
      }
    });

    // Remove duplicates and sort by line number
    return this.deduplicateExports(exports);
  }

  /**
   * Process import match based on type
   */
  private static processImportMatch(
    match: RegExpExecArray, 
    type: string, 
    imports: ImportInfo[], 
    code: string
  ): void {
    switch (type) {
      case 'default':
        this.processDefaultImport(match, imports, code);
        break;
      case 'named':
        this.processNamedImport(match, imports, code);
        break;
      case 'namespace':
        this.processNamespaceImport(match, imports, code);
        break;
      case 'mixed':
        this.processMixedImport(match, imports, code);
        break;
      case 'side_effect':
        this.processSideEffectImport(match, imports, code);
        break;
      case 'dynamic':
        this.processDynamicImport(match, imports, code);
        break;
      case 'require':
        this.processRequireImport(match, imports, code);
        break;
      case 'require_destructured':
        this.processRequireDestructuredImport(match, imports, code);
        break;
    }
  }

  /**
   * Process export match based on type
   */
  private static processExportMatch(
    match: RegExpExecArray, 
    type: string, 
    exports: ExportInfo[], 
    code: string
  ): void {
    switch (type) {
      case 'function':
      case 'variable':
      case 'class':
        this.processNamedExport(match, type, exports, code);
        break;
      case 'default':
        this.processDefaultExport(match, exports, code);
        break;
      case 'named_list':
        this.processNamedListExport(match, exports, code);
        break;
      case 're_export':
        this.processReExport(match, exports, code);
        break;
      case 're_export_all':
        this.processReExportAll(match, exports, code);
        break;
      case 're_export_default':
        this.processReExportDefault(match, exports, code);
        break;
      case 'commonjs':
        this.processCommonJSExport(match, exports, code);
        break;
      case 'commonjs_named':
        this.processCommonJSNamedExport(match, exports, code);
        break;
    }
  }

  /**
   * Process default import: import defaultExport from 'module'
   */
  private static processDefaultImport(
    match: RegExpExecArray, 
    imports: ImportInfo[], 
    code: string
  ): void {
    const [, defaultImport, moduleName] = match;
    
    if (this.isValidImport(moduleName, defaultImport)) {
      imports.push({
        module: moduleName,
        imports: [defaultImport],
        isDefault: true,
        isDynamic: false,
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Process named import: import { named1, named2 } from 'module'
   */
  private static processNamedImport(
    match: RegExpExecArray, 
    imports: ImportInfo[], 
    code: string
  ): void {
    const [, namedImports, moduleName] = match;
    
    if (this.isValidImport(moduleName)) {
      const importsList = this.parseNamedImports(namedImports);
      
      imports.push({
        module: moduleName,
        imports: importsList,
        isDefault: false,
        isDynamic: false,
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Process namespace import: import * as name from 'module'
   */
  private static processNamespaceImport(
    match: RegExpExecArray, 
    imports: ImportInfo[], 
    code: string
  ): void {
    const [, namespaceName, moduleName] = match;
    
    if (this.isValidImport(moduleName, namespaceName)) {
      imports.push({
        module: moduleName,
        imports: [`* as ${namespaceName}`],
        isDefault: false,
        isDynamic: false,
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Process mixed import: import defaultExport, { named1, named2 } from 'module'
   */
  private static processMixedImport(
    match: RegExpExecArray, 
    imports: ImportInfo[], 
    code: string
  ): void {
    const [, defaultImport, namedImports, moduleName] = match;
    
    if (this.isValidImport(moduleName, defaultImport)) {
      const importsList = [defaultImport, ...this.parseNamedImports(namedImports)];
      
      imports.push({
        module: moduleName,
        imports: importsList,
        isDefault: true,
        isDynamic: false,
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Process side effect import: import 'module'
   */
  private static processSideEffectImport(
    match: RegExpExecArray, 
    imports: ImportInfo[], 
    code: string
  ): void {
    const [, moduleName] = match;
    
    if (this.isValidImport(moduleName)) {
      imports.push({
        module: moduleName,
        imports: [],
        isDefault: false,
        isDynamic: false,
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Process dynamic import: import('module')
   */
  private static processDynamicImport(
    match: RegExpExecArray, 
    imports: ImportInfo[], 
    code: string
  ): void {
    const [, moduleName] = match;
    
    if (this.isValidImport(moduleName)) {
      imports.push({
        module: moduleName,
        imports: [],
        isDefault: false,
        isDynamic: true,
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Process require import: const name = require('module')
   */
  private static processRequireImport(
    match: RegExpExecArray, 
    imports: ImportInfo[], 
    code: string
  ): void {
    const [, variableName, moduleName] = match;
    
    if (this.isValidImport(moduleName, variableName)) {
      imports.push({
        module: moduleName,
        imports: [variableName],
        isDefault: true,
        isDynamic: false,
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Process destructured require: const { name1, name2 } = require('module')
   */
  private static processRequireDestructuredImport(
    match: RegExpExecArray, 
    imports: ImportInfo[], 
    code: string
  ): void {
    const [, destructuredImports, moduleName] = match;
    
    if (this.isValidImport(moduleName)) {
      const importsList = this.parseNamedImports(destructuredImports);
      
      imports.push({
        module: moduleName,
        imports: importsList,
        isDefault: false,
        isDynamic: false,
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Process named export: export function/const/class name
   */
  private static processNamedExport(
    match: RegExpExecArray, 
    type: string, 
    exports: ExportInfo[], 
    code: string
  ): void {
    const [, exportName] = match;
    
    if (this.isValidExport(exportName)) {
      exports.push({
        name: exportName,
        type: type as any,
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Process default export: export default name
   */
  private static processDefaultExport(
    match: RegExpExecArray, 
    exports: ExportInfo[], 
    code: string
  ): void {
    const [, exportName] = match;
    const name = exportName || 'default';
    
    exports.push({
      name,
      type: 'default',
      line: this.getLineNumber(code, match.index)
    });
  }

  /**
   * Process named list export: export { name1, name2 }
   */
  private static processNamedListExport(
    match: RegExpExecArray, 
    exports: ExportInfo[], 
    code: string
  ): void {
    const [, exportsList] = match;
    const exportNames = this.parseNamedExports(exportsList);
    
    exportNames.forEach(name => {
      if (this.isValidExport(name)) {
        exports.push({
          name,
          type: 'variable',
          line: this.getLineNumber(code, match.index)
        });
      }
    });
  }

  /**
   * Process re-export: export { name1, name2 } from 'module'
   */
  private static processReExport(
    match: RegExpExecArray, 
    exports: ExportInfo[], 
    code: string
  ): void {
    const [, exportsList, moduleName] = match;
    const exportNames = this.parseNamedExports(exportsList);
    
    exportNames.forEach(name => {
      if (this.isValidExport(name)) {
        exports.push({
          name: `${name} (from ${moduleName})`,
          type: 'variable',
          line: this.getLineNumber(code, match.index)
        });
      }
    });
  }

  /**
   * Process re-export all: export * from 'module'
   */
  private static processReExportAll(
    match: RegExpExecArray, 
    exports: ExportInfo[], 
    code: string
  ): void {
    const [, moduleName] = match;
    
    exports.push({
      name: `* (from ${moduleName})`,
      type: 'variable',
      line: this.getLineNumber(code, match.index)
    });
  }

  /**
   * Process re-export default: export { default } from 'module'
   */
  private static processReExportDefault(
    match: RegExpExecArray, 
    exports: ExportInfo[], 
    code: string
  ): void {
    const [, aliasName, moduleName] = match;
    const name = aliasName || `default (from ${moduleName})`;
    
    exports.push({
      name,
      type: 'default',
      line: this.getLineNumber(code, match.index)
    });
  }

  /**
   * Process CommonJS export: module.exports = value
   */
  private static processCommonJSExport(
    match: RegExpExecArray, 
    exports: ExportInfo[], 
    code: string
  ): void {
    const [, exportValue] = match;
    const name = exportValue.startsWith('{') ? 'object' : exportValue;
    
    exports.push({
      name,
      type: 'default',
      line: this.getLineNumber(code, match.index)
    });
  }

  /**
   * Process CommonJS named export: exports.name = value
   */
  private static processCommonJSNamedExport(
    match: RegExpExecArray, 
    exports: ExportInfo[], 
    code: string
  ): void {
    const [, exportName] = match;
    
    if (this.isValidExport(exportName)) {
      exports.push({
        name: exportName,
        type: 'variable',
        line: this.getLineNumber(code, match.index)
      });
    }
  }

  /**
   * Parse named imports from string
   */
  private static parseNamedImports(importsString: string): string[] {
    return importsString
      .split(',')
      .map(imp => {
        const trimmed = imp.trim();
        // Handle aliased imports: name as alias
        const aliasMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
        return aliasMatch ? aliasMatch[2] : trimmed;
      })
      .filter(imp => imp && this.isValidIdentifier(imp));
  }

  /**
   * Parse named exports from string
   */
  private static parseNamedExports(exportsString: string): string[] {
    return exportsString
      .split(',')
      .map(exp => {
        const trimmed = exp.trim();
        // Handle aliased exports: name as alias
        const aliasMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
        return aliasMatch ? aliasMatch[1] : trimmed;
      })
      .filter(exp => exp && this.isValidIdentifier(exp));
  }

  /**
   * Check if import is valid
   */
  private static isValidImport(moduleName: string, importName?: string): boolean {
    // Module name should not be empty
    if (!moduleName || moduleName.trim().length === 0) {
      return false;
    }

    // Skip test modules and mocks
    const testIndicators = ['test', 'spec', 'mock', '__tests__', '.test.', '.spec.'];
    if (testIndicators.some(indicator => moduleName.includes(indicator))) {
      return false;
    }

    // Check import name if provided
    if (importName && !this.isValidIdentifier(importName)) {
      return false;
    }

    return true;
  }

  /**
   * Check if export is valid
   */
  private static isValidExport(exportName: string): boolean {
    if (!exportName || exportName.trim().length === 0) {
      return false;
    }

    // Skip common false positives
    const falsePositives = ['default', 'undefined', 'null'];
    if (falsePositives.includes(exportName.toLowerCase())) {
      return false;
    }

    return this.isValidIdentifier(exportName);
  }

  /**
   * Check if identifier is valid
   */
  private static isValidIdentifier(identifier: string): boolean {
    // Must be valid JavaScript identifier
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(identifier.trim());
  }

  /**
   * Remove duplicate imports
   */
  private static deduplicateImports(imports: ImportInfo[]): ImportInfo[] {
    const seen = new Set<string>();
    const unique: ImportInfo[] = [];

    imports.forEach(importInfo => {
      const key = `${importInfo.module}:${importInfo.imports.join(',')}:${importInfo.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(importInfo);
      }
    });

    return unique.sort((a, b) => a.line - b.line);
  }

  /**
   * Remove duplicate exports
   */
  private static deduplicateExports(exports: ExportInfo[]): ExportInfo[] {
    const seen = new Set<string>();
    const unique: ExportInfo[] = [];

    exports.forEach(exportInfo => {
      const key = `${exportInfo.name}:${exportInfo.type}:${exportInfo.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(exportInfo);
      }
    });

    return unique.sort((a, b) => a.line - b.line);
  }

  /**
   * Get line number from character index
   */
  private static getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Analyze import security risks
   */
  public static analyzeImportSecurity(imports: ImportInfo[]): {
    riskyImports: ImportInfo[];
    externalDependencies: string[];
    internalModules: string[];
    dynamicImports: ImportInfo[];
    recommendations: string[];
  } {
    const riskyImports: ImportInfo[] = [];
    const externalDependencies: string[] = [];
    const internalModules: string[] = [];
    const dynamicImports: ImportInfo[] = [];
    const recommendations: string[] = [];

    // Risk patterns for potentially dangerous imports
    const riskyPatterns = [
      'eval', 'vm', 'child_process', 'fs', 'path', 'os', 'crypto',
      'http', 'https', 'net', 'dgram', 'dns', 'cluster', 'worker_threads'
    ];

    imports.forEach(importInfo => {
      const module = importInfo.module;

      // Check for dynamic imports
      if (importInfo.isDynamic) {
        dynamicImports.push(importInfo);
      }

      // Categorize as external or internal
      if (module.startsWith('.') || module.startsWith('/')) {
        internalModules.push(module);
      } else if (!module.startsWith('@types/')) {
        externalDependencies.push(module);
      }

      // Check for risky imports
      if (riskyPatterns.some(pattern => module.includes(pattern))) {
        riskyImports.push(importInfo);
      }

      // Check for specific security concerns
      if (module === 'eval' || importInfo.imports.includes('eval')) {
        recommendations.push('Avoid using eval() - it can execute arbitrary code');
      }

      if (module === 'child_process') {
        recommendations.push('child_process module can execute system commands - ensure input validation');
      }

      if (module === 'vm') {
        recommendations.push('vm module can run untrusted code - use with extreme caution');
      }
    });

    // Dynamic import recommendations
    if (dynamicImports.length > 0) {
      recommendations.push('Review dynamic imports for potential security risks');
    }

    // External dependency recommendations
    const uniqueExternal = [...new Set(externalDependencies)];
    if (uniqueExternal.length > 20) {
      recommendations.push('Large number of external dependencies - review for security vulnerabilities');
    }

    return {
      riskyImports,
      externalDependencies: uniqueExternal,
      internalModules: [...new Set(internalModules)],
      dynamicImports,
      recommendations
    };
  }

  /**
   * Analyze export patterns for potential information disclosure
   */
  public static analyzeExportSecurity(exports: ExportInfo[]): {
    sensitiveExports: ExportInfo[];
    publicApiSurface: string[];
    recommendations: string[];
  } {
    const sensitiveExports: ExportInfo[] = [];
    const publicApiSurface: string[] = [];
    const recommendations: string[] = [];

    // Patterns that might indicate sensitive information
    const sensitivePatterns = [
      'secret', 'key', 'password', 'token', 'auth', 'private',
      'internal', 'config', 'credential', 'admin', 'debug'
    ];

    exports.forEach(exportInfo => {
      const name = exportInfo.name.toLowerCase();

      // Add to public API surface
      if (exportInfo.type !== 'default') {
        publicApiSurface.push(exportInfo.name);
      }

      // Check for potentially sensitive exports
      if (sensitivePatterns.some(pattern => name.includes(pattern))) {
        sensitiveExports.push(exportInfo);
      }

      // Specific recommendations
      if (name.includes('debug') && exportInfo.type !== 'default') {
        recommendations.push(`Export '${exportInfo.name}' may expose debug information`);
      }

      if (name.includes('config') || name.includes('setting')) {
        recommendations.push(`Export '${exportInfo.name}' may expose configuration details`);
      }
    });

    // General recommendations
    if (exports.length > 15) {
      recommendations.push('Large number of exports - consider reducing public API surface');
    }

    if (sensitiveExports.length > 0) {
      recommendations.push('Review exports with potentially sensitive names');
    }

    return {
      sensitiveExports,
      publicApiSurface,
      recommendations
    };
  }

  /**
   * Get import/export dependency graph
   */
  public static getDependencyGraph(imports: ImportInfo[], exports: ExportInfo[]): {
    nodes: Array<{ id: string; type: 'module' | 'export' | 'import'; label: string }>;
    edges: Array<{ from: string; to: string; type: 'imports' | 'exports' }>;
  } {
    const nodes = new Map<string, { id: string; type: 'module' | 'export' | 'import'; label: string }>();
    const edges: Array<{ from: string; to: string; type: 'imports' | 'exports' }> = [];

    // Add import nodes and edges
    imports.forEach(importInfo => {
      const moduleId = `module:${importInfo.module}`;
      
      // Add module node
      if (!nodes.has(moduleId)) {
        nodes.set(moduleId, {
          id: moduleId,
          type: 'module',
          label: importInfo.module
        });
      }

      // Add import nodes and edges
      importInfo.imports.forEach(importName => {
        const importId = `import:${importName}`;
        
        if (!nodes.has(importId)) {
          nodes.set(importId, {
            id: importId,
            type: 'import',
            label: importName
          });
        }

        edges.push({
          from: moduleId,
          to: importId,
          type: 'imports'
        });
      });
    });

    // Add export nodes
    exports.forEach(exportInfo => {
      const exportId = `export:${exportInfo.name}`;
      
      if (!nodes.has(exportId)) {
        nodes.set(exportId, {
          id: exportId,
          type: 'export',
          label: exportInfo.name
        });
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      edges
    };
  }

  /**
   * Extract module metadata
   */
  public static extractModuleMetadata(imports: ImportInfo[], exports: ExportInfo[]): {
    moduleType: 'es6' | 'commonjs' | 'mixed';
    hasDefaultExport: boolean;
    hasNamedExports: boolean;
    hasDynamicImports: boolean;
    externalDependencyCount: number;
    internalModuleCount: number;
    complexityScore: number;
  } {
    const hasES6Imports = imports.some(imp => !imp.module.includes('require'));
    const hasCommonJS = imports.some(imp => imp.module.includes('require')) || 
                       exports.some(exp => exp.name.includes('module.exports') || exp.name.includes('exports.'));
    
    const moduleType = hasES6Imports && hasCommonJS ? 'mixed' : 
                      hasES6Imports ? 'es6' : 'commonjs';

    const hasDefaultExport = exports.some(exp => exp.type === 'default');
    const hasNamedExports = exports.some(exp => exp.type !== 'default');
    const hasDynamicImports = imports.some(imp => imp.isDynamic);

    const externalDependencyCount = imports.filter(imp => 
      !imp.module.startsWith('.') && !imp.module.startsWith('/')
    ).length;

    const internalModuleCount = imports.filter(imp => 
      imp.module.startsWith('.') || imp.module.startsWith('/')
    ).length;

    // Calculate complexity score based on various factors
    const complexityScore = (
      imports.length * 0.5 +
      exports.length * 0.3 +
      (hasDynamicImports ? 2 : 0) +
      (moduleType === 'mixed' ? 1 : 0) +
      externalDependencyCount * 0.2
    );

    return {
      moduleType,
      hasDefaultExport,
      hasNamedExports,
      hasDynamicImports,
      externalDependencyCount,
      internalModuleCount,
      complexityScore
    };
  }
}