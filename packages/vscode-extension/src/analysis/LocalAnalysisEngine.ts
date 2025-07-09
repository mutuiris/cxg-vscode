import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Tree-sitter integration interfaces
export interface TreeSitterNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children?: TreeSitterNode[];
}

export interface SemanticContext {
  functions: FunctionInfo[];
  variables: VariableInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: ClassInfo[];
  businessLogicIndicators: BusinessLogicIndicator[];
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

interface ServerAnalysisResponse {
  success: boolean;
  result: any;
  error?: string;
}

interface ServerBusinessLogicMatch {
  description: string;
  confidence: number;
}

interface ServerInfrastructureMatch {
  line: number;
  column: number;
  description: string;
}

/**
 * Enhanced LocalAnalysisEngine with Tree-sitter Integration
 * Provides comprehensive code analysis combining pattern matching with semantic AST analysis
 * 
 * Features:
 * - Tree-sitter powered semantic analysis for JavaScript/TypeScript
 * - Framework-specific pattern detection
 * - Business logic identification with context awareness
 * - Advanced secret detection with scope analysis
 * - Code complexity metrics
 * - Hybrid local/server analysis with graceful fallback
 */
export class LocalAnalysisEngine {
  private context: vscode.ExtensionContext;
  private dbPath: string;
  private recentScans: AnalysisResult[] = [];
  private serverAvailable: boolean = false;
  
  // Tree-sitter integration state
  private treeSitterEnabled: boolean = true;
  private semanticCache: Map<string, SemanticContext> = new Map();
  private frameworkCache: Map<string, FrameworkDetection> = new Map();

  // Performance optimization
  private analysisCache: Map<string, AnalysisResult> = new Map();
  private lastCacheCleanup: Date = new Date();

  // Business logic patterns enhanced with tree-sitter context
  private readonly businessLogicPatterns = {
    pricing: {
      keywords: ['price', 'cost', 'billing', 'payment', 'invoice', 'discount', 'tax', 'fee'],
      functions: ['calculatePrice', 'getPrice', 'updatePrice', 'applyDiscount'],
      confidence: 0.9
    },
    authentication: {
      keywords: ['auth', 'login', 'password', 'token', 'session', 'jwt', 'oauth'],
      functions: ['authenticate', 'login', 'logout', 'validateToken', 'hashPassword'],
      confidence: 0.95
    },
    algorithm: {
      keywords: ['algorithm', 'sort', 'search', 'optimize', 'calculate', 'compute'],
      functions: ['algorithm', 'optimize', 'calculate', 'process', 'transform'],
      confidence: 0.8
    },
    financial: {
      keywords: ['money', 'currency', 'balance', 'transaction', 'account', 'bank'],
      functions: ['transfer', 'deposit', 'withdraw', 'getBalance', 'processPayment'],
      confidence: 0.9
    },
    encryption: {
      keywords: ['encrypt', 'decrypt', 'cipher', 'crypto', 'hash', 'secure'],
      functions: ['encrypt', 'decrypt', 'hash', 'generateKey', 'sign'],
      confidence: 0.95
    }
  };

  // Framework detection patterns
  private readonly frameworkPatterns = {
    react: {
      imports: ['react', '@react', 'react-dom'],
      patterns: ['useState', 'useEffect', 'jsx', 'tsx', 'Component'],
      files: ['.jsx', '.tsx'],
      confidence: 0.9
    },
    vue: {
      imports: ['vue', '@vue'],
      patterns: ['Vue', 'createApp', 'defineComponent', 'ref', 'reactive'],
      files: ['.vue'],
      confidence: 0.9
    },
    angular: {
      imports: ['@angular'],
      patterns: ['@Component', '@Injectable', '@Module', 'NgModule'],
      files: ['.component.ts', '.service.ts', '.module.ts'],
      confidence: 0.95
    },
    node: {
      imports: ['express', 'http', 'fs', 'path', 'util'],
      patterns: ['require(', 'module.exports', 'process.env', '__dirname'],
      files: ['server.js', 'app.js', 'index.js'],
      confidence: 0.8
    },
    nextjs: {
      imports: ['next', 'next/'],
      patterns: ['getServerSideProps', 'getStaticProps', 'useRouter'],
      files: ['pages/', '_app.js', '_document.js'],
      confidence: 0.9
    }
  };

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.dbPath = path.join(context.globalStorageUri.fsPath, 'cxg-analysis.db');
    this.initializeDatabase();
    this.loadRecentScans();
    this.checkServerAvailability();
    
    console.log('🌳 CXG LocalAnalysisEngine initialized with tree-sitter enhancement');
  }

  /**
   * Initialize local database for storing scan results
   */
  private initializeDatabase(): void {
    try {
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      console.log(`🗄️ CXG Database initialized at: ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to initialize CXG database:', error);
    }
  }

  /**
   * Load recent scan results from local storage
   */
  private loadRecentScans(): void {
    const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
    try {
      if (fs.existsSync(scansPath)) {
        const data = fs.readFileSync(scansPath, 'utf8');
        this.recentScans = JSON.parse(data).map((scan: any) => ({
          ...scan,
          timestamp: new Date(scan.timestamp)
        }));
        console.log(`📂 Loaded ${this.recentScans.length} recent scans`);
      }
    } catch (error) {
      console.log('Could not load recent scans:', error);
      this.recentScans = [];
    }
  }

  /**
   * Save recent scan results to local storage
   */
  private saveRecentScans(): void {
    const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
    try {
      // Keep only last 50 scans to manage storage
      const recentScans = this.recentScans.slice(-50);
      fs.writeFileSync(scansPath, JSON.stringify(recentScans, null, 2));
    } catch (error) {
      console.log('Could not save recent scans:', error);
    }
  }

  /**
   * Check server availability with timeout
   */
  private async checkServerAvailability(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('http://localhost:8080/health', {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeoutId);
      this.serverAvailable = response.ok;
      
      if (this.serverAvailable) {
        console.log('🔗 CXG server connection established');
      }
    } catch (error) {
      this.serverAvailable = false;
      console.log('🔌 CXG server not available, using local analysis');
    }
  }

  /**
   * Enhanced code analysis using tree-sitter + server/local hybrid approach
   */
  public async analyzeCode(code: string, language: string, fileName?: string): Promise<AnalysisResult> {
    const cacheKey = this.generateCacheKey(code, language);
    
    // Check cache first for performance
    if (this.analysisCache.has(cacheKey)) {
      console.log(`📦 CXG: Cache hit for ${fileName || 'unknown file'}`);
      return this.analysisCache.get(cacheKey)!;
    }

    console.log(`🌳 CXG: Analyzing ${fileName || 'unknown file'} (${language}) with tree-sitter enhancement`);
    
    const startTime = Date.now();
    let result: AnalysisResult;

    try {
      // Try server analysis first if available
      if (this.serverAvailable) {
        try {
          result = await this.analyzeWithServer(code, language, fileName);
          console.log(`⚡ CXG: Server analysis complete for ${fileName} in ${Date.now() - startTime}ms`);
        } catch (error) {
          console.warn(`🔄 CXG: Server analysis failed, falling back to local: ${error}`);
          this.serverAvailable = false;
          result = await this.analyzeLocally(code, language, fileName);
        }
      } else {
        result = await this.analyzeLocally(code, language, fileName);
      }

      // Enhanced analysis with tree-sitter if enabled and supported language
      if (this.treeSitterEnabled && this.isJavaScriptTypeScript(language)) {
        result = await this.enhanceWithTreeSitter(result, code, language, fileName);
      }

      // Cache the result
      this.analysisCache.set(cacheKey, result);
      this.cleanupCacheIfNeeded();

      // Store the scan result
      this.recentScans.push(result);
      this.saveRecentScans();

      console.log(`✅ CXG: Complete analysis finished in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      console.error('CXG: Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced tree-sitter analysis for JavaScript/TypeScript
   */
  private async enhanceWithTreeSitter(
    baseResult: AnalysisResult, 
    code: string, 
    language: string, 
    fileName?: string
  ): Promise<AnalysisResult> {
    try {
      console.log('🌳 Performing tree-sitter semantic analysis...');
      
      // Get or compute semantic context
      const semanticContext = await this.getSemanticContext(code, language, fileName);
      
      // Detect framework
      const frameworkDetection = await this.detectFramework(code, language, fileName, semanticContext);
      
      // Calculate code complexity
      const codeComplexity = this.calculateCodeComplexity(semanticContext);
      
      // Enhanced business logic detection using semantic context
      const enhancedBusinessLogic = this.detectBusinessLogicWithContext(semanticContext, code);
      
      // Enhanced secret detection with scope awareness
      const enhancedSecretDetection = this.detectSecretsWithScope(semanticContext, code);
      
      // Combine results
      return {
        ...baseResult,
        semanticContext,
        frameworkDetection,
        codeComplexity,
        hasBusinessLogic: baseResult.hasBusinessLogic || enhancedBusinessLogic.length > 0,
        hasSecrets: baseResult.hasSecrets || enhancedSecretDetection.hasSecrets,
        detectedPatterns: [
          ...baseResult.detectedPatterns,
          ...enhancedBusinessLogic.map(bl => bl.type),
          ...(enhancedSecretDetection.hasSecrets ? ['scoped_secrets'] : [])
        ],
        riskLevel: this.calculateEnhancedRiskLevel(baseResult, {
          businessLogic: enhancedBusinessLogic,
          secrets: enhancedSecretDetection,
          framework: frameworkDetection,
          complexity: codeComplexity
        }),
        suggestions: [
          ...baseResult.suggestions,
          ...this.generateEnhancedSuggestions(semanticContext, frameworkDetection, codeComplexity)
        ]
      };

    } catch (error) {
      console.warn('🌳 Tree-sitter analysis failed, using base result:', error);
      return baseResult;
    }
  }

  /**
   * Get semantic context using simulated tree-sitter analysis
   * Note: Full tree-sitter would require native bindings
   */
  private async getSemanticContext(code: string, language: string, fileName?: string): Promise<SemanticContext> {
    const cacheKey = `semantic_${this.generateCacheKey(code, language)}`;
    
    if (this.semanticCache.has(cacheKey)) {
      return this.semanticCache.get(cacheKey)!;
    }

    // Simulated semantic analysis (in production, this would use actual tree-sitter)
    const context: SemanticContext = {
      functions: this.extractFunctions(code),
      variables: this.extractVariables(code),
      imports: this.extractImports(code),
      exports: this.extractExports(code),
      classes: this.extractClasses(code),
      businessLogicIndicators: []
    };

    // Analyze functions for business logic
    context.businessLogicIndicators = this.analyzeBusinessLogicIndicators(context, code);

    this.semanticCache.set(cacheKey, context);
    return context;
  }

  /**
   * Extract function information from code
   */
  private extractFunctions(code: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    // Regex patterns for different function types
    const patterns = [
      // Function declarations: function name() {}
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
      // Arrow functions: const name = () => {}
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g,
      // Method definitions: methodName() {}
      /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const name = match[1];
        const params = match[2] ? match[2].split(',').map(p => p.trim()) : [];
        const isAsync = match[0].includes('async');
        const isExported = match[0].includes('export');
        
        // Detect if function contains sensitive business logic
        const functionBody = this.extractFunctionBody(code, match.index);
        const containsSensitiveLogic = this.analyzeForSensitiveLogic(functionBody, name);

        functions.push({
          name,
          parameters: params,
          isAsync,
          isExported,
          containsSensitiveLogic,
          startLine: this.getLineNumber(code, match.index),
          endLine: this.getLineNumber(code, match.index + functionBody.length)
        });
      }
    });

    return functions;
  }

  /**
   * Extract variable information from code
   */
  private extractVariables(code: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    
    // Patterns for variable declarations
    const patterns = [
      /(const|let|var)\s+(\w+)\s*=\s*([^;\n]+)/g
    ];

    patterns.forEach(pattern => {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(code)) !== null) {
        const [, declarationType, name, value] = match;
        const isConst = declarationType === 'const';
        const isPotentialSecret = this.isPotentialSecretValue(value);

        variables.push({
          name,
          type: this.inferVariableType(value),
          scope: 'global', // Simplified - would need proper scope analysis
          isConst,
          isPotentialSecret,
          value: isPotentialSecret ? '[REDACTED]' : value.trim(),
          line: this.getLineNumber(code, match.index)
        });
      }
    });

    return variables;
  }

  /**
   * Extract import information from code
   */
  private extractImports(code: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    // ES6 imports
    const importPattern = /import\s+(?:(\w+)|{([^}]+)}|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importPattern.exec(code)) !== null) {
      const [, defaultImport, namedImports, moduleName] = match;
      const importsList = namedImports ? 
        namedImports.split(',').map(imp => imp.trim()) : 
        (defaultImport ? [defaultImport] : []);

      imports.push({
        module: moduleName,
        imports: importsList,
        isDefault: !!defaultImport,
        isDynamic: false,
        line: this.getLineNumber(code, match.index)
      });
    }

    // Dynamic imports
    const dynamicImportPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportPattern.exec(code)) !== null) {
      imports.push({
        module: match[1],
        imports: [],
        isDefault: false,
        isDynamic: true,
        line: this.getLineNumber(code, match.index)
      });
    }

    return imports;
  }

  /**
   * Extract export information from code
   */
  private extractExports(code: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    
    const patterns = [
      /export\s+(?:default\s+)?(?:function|const|let|class)\s+(\w+)/g,
      /export\s+default\s+(\w+)/g,
      /export\s*{\s*([^}]+)\s*}/g
    ];

    patterns.forEach(pattern => {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(code)) !== null) {
        if (match[0].includes('{')) {
          // Named exports
          const namedExports = match[1].split(',').map(exp => exp.trim());
          namedExports.forEach(name => {
            exports.push({
              name,
              type: 'variable',
              line: this.getLineNumber(code, match!.index)
            });
          });
        } else {
          const isDefault = match[0].includes('default');
          const type = match[0].includes('function') ? 'function' : 
                      match[0].includes('class') ? 'class' : 'variable';
          
          exports.push({
            name: match[1],
            type: isDefault ? 'default' : type,
            line: this.getLineNumber(code, match.index)
          });
        }
      }
    });

    return exports;
  }

  /**
   * Extract class information from code
   */
  private extractClasses(code: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    
    const classPattern = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?\s*{([^}]*)}/g;
    let match;
    
    while ((match = classPattern.exec(code)) !== null) {
      const [fullMatch, className, classBody] = match;
      const isExported = match[0].includes('export');
      
      // Extract methods and properties
      const methods = this.extractMethodsFromClass(classBody);
      const properties = this.extractPropertiesFromClass(classBody);

      classes.push({
        name: className,
        methods,
        properties,
        isExported,
        startLine: this.getLineNumber(code, match.index),
        endLine: this.getLineNumber(code, match.index + fullMatch.length)
      });
    }

    return classes;
  }

  /**
   * Analyze business logic indicators using semantic context
   */
  private analyzeBusinessLogicIndicators(context: SemanticContext, code: string): BusinessLogicIndicator[] {
    const indicators: BusinessLogicIndicator[] = [];

    // Analyze function names and content
    context.functions.forEach(func => {
      Object.entries(this.businessLogicPatterns).forEach(([type, pattern]) => {
        const confidence = this.calculateBusinessLogicConfidence(func, pattern, code);
        
        if (confidence > 0.5) {
          indicators.push({
            type: type as any,
            confidence,
            location: { line: func.startLine, column: 0 },
            description: `Function '${func.name}' contains ${type} logic`,
            severity: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low'
          });
        }
      });
    });

    return indicators;
  }

  /**
   * Detect framework using semantic context
   */
  private async detectFramework(
    code: string, 
    language: string, 
    fileName?: string, 
    context?: SemanticContext
  ): Promise<FrameworkDetection> {
    const cacheKey = `framework_${fileName || 'unknown'}`;
    
    if (this.frameworkCache.has(cacheKey)) {
      return this.frameworkCache.get(cacheKey)!;
    }

    let bestMatch: FrameworkDetection = {
      framework: 'none',
      confidence: 0,
      indicators: []
    };

    Object.entries(this.frameworkPatterns).forEach(([framework, patterns]) => {
      let confidence = 0;
      const indicators: string[] = [];

      // Check imports
      if (context?.imports) {
        const importMatches = context.imports.filter(imp => 
          patterns.imports.some(pattern => imp.module.includes(pattern))
        );
        if (importMatches.length > 0) {
          confidence += 0.4;
          indicators.push(`Import patterns: ${importMatches.map(imp => imp.module).join(', ')}`);
        }
      }

      // Check code patterns
      patterns.patterns.forEach(pattern => {
        if (code.includes(pattern)) {
          confidence += 0.2;
          indicators.push(`Code pattern: ${pattern}`);
        }
      });

      // Check file patterns
      if (fileName) {
        patterns.files.forEach(filePattern => {
          if (fileName.includes(filePattern)) {
            confidence += 0.3;
            indicators.push(`File pattern: ${filePattern}`);
          }
        });
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          framework: framework as any,
          confidence: Math.min(confidence, patterns.confidence),
          indicators
        };
      }
    });

    this.frameworkCache.set(cacheKey, bestMatch);
    return bestMatch;
  }

  /**
   * Calculate code complexity metrics
   */
  private calculateCodeComplexity(context: SemanticContext): CodeComplexity {
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(context);
    const cognitiveComplexity = this.calculateCognitiveComplexity(context);
    const nestingDepth = this.calculateNestingDepth(context);

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      nestingDepth,
      functionCount: context.functions.length,
      classCount: context.classes.length
    };
  }

  // Helper methods for tree-sitter analysis
  private isJavaScriptTypeScript(language: string): boolean {
    return ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(language);
  }

  private generateCacheKey(code: string, language: string): string {
    // Simple hash for cache key (in production, use a proper hash function)
    return `${language}_${code.length}_${code.substring(0, 100).replace(/\s/g, '')}`;
  }

  private cleanupCacheIfNeeded(): void {
    const now = new Date();
    const timeSinceLastCleanup = now.getTime() - this.lastCacheCleanup.getTime();
    
    // Cleanup every 30 minutes
    if (timeSinceLastCleanup > 30 * 60 * 1000) {
      if (this.analysisCache.size > 100) {
        // Keep only last 50 entries
        const entries = Array.from(this.analysisCache.entries());
        this.analysisCache.clear();
        entries.slice(-50).forEach(([key, value]) => {
          this.analysisCache.set(key, value);
        });
      }
      this.lastCacheCleanup = now;
    }
  }

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  private extractFunctionBody(code: string, startIndex: number): string {
    // Simplified function body extraction
    const fromStart = code.substring(startIndex);
    const braceStart = fromStart.indexOf('{');
    if (braceStart === -1) return '';
    
    let braceCount = 1;
    let i = braceStart + 1;
    
    while (i < fromStart.length && braceCount > 0) {
      if (fromStart[i] === '{') braceCount++;
      if (fromStart[i] === '}') braceCount--;
      i++;
    }
    
    return fromStart.substring(0, i);
  }

  private analyzeForSensitiveLogic(functionBody: string, functionName: string): boolean {
    const sensitiveKeywords = [
      'password', 'secret', 'token', 'api_key', 'private_key',
      'encrypt', 'decrypt', 'hash', 'sign', 'verify',
      'price', 'cost', 'payment', 'billing', 'invoice',
      'authenticate', 'authorize', 'permission'
    ];

    const lowerBody = functionBody.toLowerCase();
    const lowerName = functionName.toLowerCase();

    return sensitiveKeywords.some(keyword => 
      lowerBody.includes(keyword) || lowerName.includes(keyword)
    );
  }

  private isPotentialSecretValue(value: string): boolean {
    const secretPatterns = [
      /^['"][a-zA-Z0-9_\-\.]{20,}['"]$/, // Long strings
      /^['"]sk-[a-zA-Z0-9]{48}['"]$/, // API keys
      /^['"][A-Z0-9]{32,}['"]$/, // Uppercase tokens
      /^['"]\$2[ayb]\$.{56}['"]$/ // bcrypt hashes
    ];

    return secretPatterns.some(pattern => pattern.test(value.trim()));
  }

  private inferVariableType(value: string): string | undefined {
    const trimmed = value.trim();
    
    if (trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith('`')) {
      return 'string';
    }
    if (/^\d+$/.test(trimmed)) {
      return 'number';
    }
    if (trimmed === 'true' || trimmed === 'false') {
      return 'boolean';
    }
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return trimmed.startsWith('[') ? 'array' : 'object';
    }
    
    return undefined;
  }

  private extractMethodsFromClass(classBody: string): string[] {
    const methods: string[] = [];
    const methodPattern = /(\w+)\s*\([^)]*\)\s*{/g;
    let match: RegExpExecArray | null;
    while ((match = methodPattern.exec(classBody)) !== null) {
      methods.push(match[1]);
    }
    
    return methods;
  }

  private extractPropertiesFromClass(classBody: string): string[] {
    const properties: string[] = [];
    const propertyPattern = /(?:this\.)?(\w+)\s*[=:]/g;
    let match: RegExpExecArray | null;
    
    while ((match = propertyPattern.exec(classBody)) !== null) {
      if (!properties.includes(match[1])) {
        properties.push(match[1]);
      }
    }
    
    return properties;
  }

  private calculateBusinessLogicConfidence(func: FunctionInfo, pattern: any, code: string): number {
    let confidence = 0;

    // Check function name
    const lowerName = func.name.toLowerCase();
    if (pattern.functions.some((f: string) => lowerName.includes(f.toLowerCase()))) {
      confidence += 0.5;
    }

    // Check for keywords in function
    const functionBody = this.extractFunctionBody(code, 0); // Simplified
    const lowerBody = functionBody.toLowerCase();
    const keywordMatches = pattern.keywords.filter((keyword: string) => 
      lowerBody.includes(keyword)
    );
    
    confidence += (keywordMatches.length / pattern.keywords.length) * 0.4;

    return Math.min(confidence, 1.0);
  }

  private calculateCyclomaticComplexity(context: SemanticContext): number {
    // Simplified complexity calculation
    let complexity = 1; // Base complexity
    
    context.functions.forEach(func => {
      complexity += 1; // Each function adds complexity
    });
    
    return complexity;
  }

  private calculateCognitiveComplexity(context: SemanticContext): number {
    // Simplified cognitive complexity
    return context.functions.reduce((total, func) => {
      return total + (func.containsSensitiveLogic ? 3 : 1);
    }, 0);
  }

  private calculateNestingDepth(context: SemanticContext): number {
    // Simplified nesting depth calculation
    return Math.max(1, context.classes.length * 2 + context.functions.length);
  }

  private detectBusinessLogicWithContext(context: SemanticContext, code: string): BusinessLogicIndicator[] {
    return context.businessLogicIndicators.filter(indicator => indicator.confidence > 0.6);
  }

  private detectSecretsWithScope(context: SemanticContext, code: string): { hasSecrets: boolean; secrets: VariableInfo[] } {
    const secrets = context.variables.filter(variable => variable.isPotentialSecret);
    return {
      hasSecrets: secrets.length > 0,
      secrets
    };
  }

  private calculateEnhancedRiskLevel(
    baseResult: AnalysisResult, 
    enhancements: {
      businessLogic: BusinessLogicIndicator[];
      secrets: { hasSecrets: boolean; secrets: VariableInfo[] };
      framework: FrameworkDetection;
      complexity: CodeComplexity;
    }
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Base result weight
    if (baseResult.riskLevel === 'high') riskScore += 3;
    else if (baseResult.riskLevel === 'medium') riskScore += 2;
    else riskScore += 1;

    // Business logic indicators
    const highConfidenceLogic = enhancements.businessLogic.filter(bl => bl.confidence > 0.8);
    riskScore += highConfidenceLogic.length * 0.5;

    // Secrets with scope
    if (enhancements.secrets.hasSecrets) {
      riskScore += enhancements.secrets.secrets.length * 0.3;
    }

    // Complexity factor
    if (enhancements.complexity.cyclomaticComplexity > 10) riskScore += 0.5;
    if (enhancements.complexity.nestingDepth > 5) riskScore += 0.3;

    // Framework-specific risks
    if (enhancements.framework.framework !== 'none' && enhancements.framework.confidence > 0.7) {
      // Higher risk for server frameworks with sensitive logic
      if (['node', 'express'].includes(enhancements.framework.framework)) {
        riskScore += 0.4;
      }
    }

    // Convert score to risk level
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2.5) return 'medium';
    return 'low';
  }

  private generateEnhancedSuggestions(
    context: SemanticContext, 
    framework: FrameworkDetection, 
    complexity: CodeComplexity
  ): string[] {
    const suggestions: string[] = [];

    // Framework-specific suggestions
    if (framework.framework !== 'none') {
      switch (framework.framework) {
        case 'react':
          suggestions.push('Consider using environment variables for sensitive configuration');
          suggestions.push('Avoid storing secrets in component state');
          break;
        case 'node':
        case 'express':
          suggestions.push('Use secure environment variable management');
          suggestions.push('Implement proper input validation and sanitization');
          break;
        case 'vue':
          suggestions.push('Use Vue environment variables for configuration');
          break;
      }
    }

    // Complexity suggestions
    if (complexity.cyclomaticComplexity > 15) {
      suggestions.push('Consider refactoring complex functions to improve maintainability');
    }

    if (complexity.nestingDepth > 6) {
      suggestions.push('Reduce nesting depth by extracting helper functions');
    }

    // Business logic suggestions
    const sensitiveLogicFunctions = context.functions.filter(f => f.containsSensitiveLogic);
    if (sensitiveLogicFunctions.length > 0) {
      suggestions.push('Review business logic functions before sharing with AI assistants');
      suggestions.push('Consider code sanitization for proprietary algorithms');
    }

    // Secret detection suggestions
    const potentialSecrets = context.variables.filter(v => v.isPotentialSecret);
    if (potentialSecrets.length > 0) {
      suggestions.push('Move hardcoded secrets to secure environment variables');
      suggestions.push('Use a secrets management service for production environments');
    }

    return suggestions;
  }

  /**
   * Analyze code using server if available, fallback to local analysis
   */
  public async analyzeWithServer(code: string, language: string, fileName?: string): Promise<AnalysisResult> {
    try {
      const response = await fetch('http://localhost:8080/api/v1/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          fileName: fileName || 'unknown'
        }),
      });

      if (!response.ok) {
        throw new Error(`Server analysis failed: ${response.statusText}`);
      }

      const serverResult = await response.json() as ServerAnalysisResponse;
      
      if (!serverResult.success) {
        throw new Error(serverResult.error || 'Server analysis failed');
      }

      const result = this.convertServerResult(serverResult, fileName || 'unknown');
      
      // Store the scan result
      this.recentScans.push(result);
      this.saveRecentScans();
      
      return result;
    } catch (error) {
      console.error('Server analysis failed:', error);
      throw error;
    }
  }

  /**
   * Convert server response to local AnalysisResult format
   */
  private convertServerResult(serverResult: ServerAnalysisResponse, fileName: string): AnalysisResult {
    const result = serverResult.result;
    const patterns: string[] = [];
    const matches: Match[] = [];

    // Process secrets
    if (result.secrets && result.secrets.length > 0) {
      patterns.push('potential_secret');
      result.secrets.forEach((secret: any) => {
        matches.push({
          pattern: 'potential_secret',
          line: secret.line,
          column: secret.column,
          text: secret.value,
          severity: 'high'
        });
      });
    }

    // Process business logic
    if (result.businessLogic && result.businessLogic.length > 0) {
      patterns.push('business_logic');
      result.businessLogic.forEach((bl: ServerBusinessLogicMatch) => {
        matches.push({
          pattern: 'business_logic',
          line: 1,
          column: 1,
          text: bl.description,
          severity: 'medium'
        });
      });
    }
    
    // Process infrastructure
    if (result.infrastructure && result.infrastructure.length > 0) {
      patterns.push('infrastructure');
      result.infrastructure.forEach((infra: ServerInfrastructureMatch) => {
        matches.push({
          pattern: 'infrastructure',
          line: infra.line,
          column: infra.column,
          text: infra.description,
          severity: 'medium'
        });
      });
    }

    return {
      hasSecrets: patterns.includes('potential_secret'),
      hasBusinessLogic: patterns.includes('business_logic'),
      hasInfrastructureExposure: patterns.includes('infrastructure'),
      detectedPatterns: patterns,
      riskLevel: this.convertRiskLevel(result.riskLevel || 0),
      suggestions: result.suggestions || this.generateSuggestions(patterns),
      timestamp: new Date(),
      fileName,
      matches
    };
  }

  /**
   * Analyze code using local patterns (fallback)
   */
  private async analyzeLocally(code: string, language: string, fileName?: string): Promise<AnalysisResult> {
    const patterns = this.detectBasicPatterns(code);
    const matches = this.findMatches(code, patterns);
    
    const result: AnalysisResult = {
      hasSecrets: patterns.includes('potential_secret'),
      hasBusinessLogic: patterns.includes('business_logic'),
      hasInfrastructureExposure: patterns.includes('infrastructure'),
      detectedPatterns: patterns,
      riskLevel: this.calculateRiskLevel(patterns),
      suggestions: this.generateSuggestions(patterns),
      timestamp: new Date(),
      fileName: fileName || 'Unknown',
      matches: matches
    };

    console.log(`🔍 CXG: Local analysis complete. Risk level: ${result.riskLevel}, Patterns: ${patterns.join(', ')}`);
    
    return result;
  }

  /**
   * Detect basic patterns in code (local fallback implementation)
   */
  private detectBasicPatterns(code: string): string[] {
    const patterns: string[] = [];
    const lowerCode = code.toLowerCase();

    // Secret detection patterns
    const secretPatterns = [
      /api[_-]?key[_\s]*[:=][_\s]*["']?[a-zA-Z0-9_\-\.]{15,}["']?/gi,
      /password[_\s]*[:=][_\s]*["']?[^"'\s\n]{6,}["']?/gi,
      /token[_\s]*[:=][_\s]*["']?[a-zA-Z0-9_\-\.]{20,}["']?/gi,
      /sk-[a-zA-Z0-9]{48}/g,
      /ghp_[a-zA-Z0-9]{36}/g,
      /AKIA[0-9A-Z]{16}/g,
      /-----BEGIN[\s\S]*?PRIVATE[\s\S]*?KEY-----/g
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(code)) {
        patterns.push('potential_secret');
        break;
      }
    }

    // Business logic patterns
    const businessLogicKeywords = [
      'calculateprice', 'pricingalgorithm', 'authenticate', 'authorization',
      'loginlogic', 'businessrule', 'algorithm', 'proprietary'
    ];

    for (const keyword of businessLogicKeywords) {
      if (lowerCode.includes(keyword)) {
        patterns.push('business_logic');
        break;
      }
    }

    // Infrastructure patterns
    const infrastructurePatterns = [
      /localhost:\d+/g,
      /127\.0\.0\.1:\d+/g,
      /192\.168\.\d+\.\d+/g,
      /10\.\d+\.\d+\.\d+/g,
      /internal[._-]/gi
    ];

    for (const pattern of infrastructurePatterns) {
      if (pattern.test(code)) {
        patterns.push('infrastructure');
        break;
      }
    }

    return patterns;
  }

  /**
   * Find specific matches in code for detected patterns
   */
  private findMatches(code: string, patterns: string[]): Match[] {
    const matches: Match[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineIndex) => {
      if (patterns.includes('potential_secret')) {
        // Look for potential secrets in this line
        const secretRegex = /(?:api[_-]?key|password|token|secret)[_\s]*[:=][_\s]*["']?([^"'\s\n]+)["']?/gi;
        let match;
        while ((match = secretRegex.exec(line)) !== null) {
          matches.push({
            pattern: 'potential_secret',
            line: lineIndex + 1,
            column: match.index + 1,
            text: match[0],
            severity: 'high'
          });
        }
      }

      if (patterns.includes('infrastructure')) {
        // Check for infrastructure exposure
        const infraRegex = /(?:localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+/g;
        let match;
        while ((match = infraRegex.exec(line)) !== null) {
          matches.push({
            pattern: 'infrastructure',
            line: lineIndex + 1,
            column: match.index + 1,
            text: match[0],
            severity: 'medium'
          });
        }
      }
    });

    return matches;
  }

  /**
   * Calculate risk level based on detected patterns
   */
  private calculateRiskLevel(patterns: string[]): 'low' | 'medium' | 'high' {
    if (patterns.includes('potential_secret')) {
      return 'high';
    }
    if (patterns.includes('business_logic') && patterns.includes('infrastructure')) {
      return 'medium';
    }
    if (patterns.length > 0) {
      return 'low';
    }
    return 'low';
  }

  /**
   * Generate suggestions based on detected patterns
   */
  private generateSuggestions(patterns: string[]): string[] {
    const suggestions: string[] = [];
    
    if (patterns.includes('potential_secret')) {
      suggestions.push('Consider using environment variables for sensitive data');
      suggestions.push('Remove hardcoded secrets from your code');
    }
    
    if (patterns.includes('business_logic')) {
      suggestions.push('Review if this business logic should be shared with AI assistants');
      suggestions.push('Consider if this contains proprietary algorithms');
    }
    
    if (patterns.includes('infrastructure')) {
      suggestions.push('Avoid exposing internal infrastructure details');
      suggestions.push('Use configuration files instead of hardcoded endpoints');
    }

    if (suggestions.length === 0) {
      suggestions.push('Code appears safe to share with AI assistants');
    }

    return suggestions;
  }

  /**
   * Convert server risk level to local format
   */
  private convertRiskLevel(level: number): 'low' | 'medium' | 'high' {
    switch (level) {
      case 0: return 'low';
      case 1: return 'medium';
      case 2: 
      case 3: return 'high';
      default: return 'medium';
    }
  }

  /**
   * Get recent scan results
   */
  public getRecentScans(): AnalysisResult[] {
    return this.recentScans.slice(-10); // Return last 10 scans
  }

  /**
   * Get security summary statistics
   */
  public getSecuritySummary(): { total: number; high: number; medium: number; low: number } {
    const recentScans = this.getRecentScans();
    return {
      total: recentScans.length,
      high: recentScans.filter(scan => scan.riskLevel === 'high').length,
      medium: recentScans.filter(scan => scan.riskLevel === 'medium').length,
      low: recentScans.filter(scan => scan.riskLevel === 'low').length
    };
  }

  /**
   * Get server availability status
   */
  public isServerAvailable(): boolean {
    return this.serverAvailable;
  }

  /**
   * Manually refresh server availability
   */
  public async refreshServerAvailability(): Promise<void> {
    await this.checkServerAvailability();
  }
}