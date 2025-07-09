import { FunctionInfo } from '../interfaces/TreeSitterInterfaces';

/**
 * Function Extraction Logic
 * Handles extraction and analysis of functions from JavaScript/TypeScript code
 */
export class FunctionExtractor {
  /**
   * Extract function information from code
   */
  public static extractFunctions(code: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    // Regex patterns for different function types
    const patterns = [
      // Function declarations: function name() {}
      {
        pattern: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
        type: 'declaration',
      },
      // Arrow functions: const name = () => {}
      {
        pattern: /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g,
        type: 'arrow',
      },
      // Method definitions: methodName() {}
      {
        pattern: /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g,
        type: 'method',
      },
      // Class methods: public/private methodName() {}
      {
        pattern:
          /(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g,
        type: 'class_method',
      },
      // Object methods: obj = { methodName() {} }
      {
        pattern: /(\w+)\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)/g,
        type: 'object_method',
      },
      // Shorthand object methods: obj = { methodName() {} }
      {
        pattern: /(\w+)\s*\(([^)]*)\)\s*\{/g,
        type: 'shorthand_method',
      },
    ];

    patterns.forEach(({ pattern, type }) => {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(code)) !== null) {
        const name = match[1];
        const params = match[2]
          ? match[2]
              .split(',')
              .map((p) => p.trim())
              .filter((p) => p)
          : [];
        const fullMatch = match[0];
        const isAsync = fullMatch.includes('async');
        const isExported = fullMatch.includes('export');

        // Skip if it's a constructor or common false positives
        if (this.isValidFunction(name, type, fullMatch)) {
          // Detect if function contains sensitive business logic
          const functionBody = this.extractFunctionBody(code, match.index);
          const containsSensitiveLogic = this.analyzeForSensitiveLogic(functionBody, name);
          const returnType = this.inferReturnType(functionBody, name);

          functions.push({
            name,
            parameters: params,
            returnType,
            isAsync,
            isExported,
            containsSensitiveLogic,
            startLine: this.getLineNumber(code, match.index),
            endLine: this.getLineNumber(code, match.index + functionBody.length),
          });
        }
      }
    });

    // Remove duplicates
    return this.deduplicateFunctions(functions);
  }

  /**
   * Extract function body from code starting at a given index
   */
  private static extractFunctionBody(code: string, startIndex: number): string {
    const fromStart = code.substring(startIndex);

    // Handle arrow functions
    if (fromStart.includes('=>')) {
      const arrowIndex = fromStart.indexOf('=>');
      const afterArrow = fromStart.substring(arrowIndex + 2).trim();

      // Single expression arrow function
      if (!afterArrow.startsWith('{')) {
        const lineEnd = afterArrow.indexOf('\n');
        const semicolonEnd = afterArrow.indexOf(';');
        const end = Math.min(
          lineEnd === -1 ? Infinity : lineEnd,
          semicolonEnd === -1 ? Infinity : semicolonEnd
        );
        return fromStart.substring(
          0,
          arrowIndex + 2 + (end === Infinity ? afterArrow.length : end)
        );
      }
    }

    // Handle block functions
    const braceStart = fromStart.indexOf('{');
    if (braceStart === -1) return fromStart.substring(0, 100); // This is a fallback for malformed code

    let braceCount = 1;
    let i = braceStart + 1;
    let inString = false;
    let stringChar = '';
    let escaped = false;

    while (i < fromStart.length && braceCount > 0) {
      const char = fromStart[i];

      if (escaped) {
        escaped = false;
      } else if (char === '\\' && inString) {
        escaped = true;
      } else if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
      } else if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      i++;
    }

    return fromStart.substring(0, i);
  }

  /**
   * Analyze function for sensitive business logic
   */
  private static analyzeForSensitiveLogic(functionBody: string, functionName: string): boolean {
    const sensitiveKeywords = [
      // Security-related
      'password',
      'secret',
      'token',
      'api_key',
      'private_key',
      'auth',
      'encrypt',
      'decrypt',
      'hash',
      'sign',
      'verify',
      'authenticate',
      'authorize',
      'permission',
      'credential',
      'jwt',
      'oauth',

      // Business logic
      'price',
      'cost',
      'payment',
      'billing',
      'invoice',
      'discount',
      'calculate',
      'algorithm',
      'formula',
      'business',
      'rule',
      'proprietary',
      'license',
      'subscription',
      'commission',

      // Financial
      'money',
      'currency',
      'balance',
      'transaction',
      'bank',
      'credit',
      'debit',
      'interest',
      'rate',
      'fee',

      // Infrastructure
      'database',
      'server',
      'config',
      'environment',
      'deploy',
      'internal',
      'admin',
      'system',
      'network',
    ];

    const lowerBody = functionBody.toLowerCase();
    const lowerName = functionName.toLowerCase();

    // Check function name
    const nameHasSensitive = sensitiveKeywords.some((keyword) => lowerName.includes(keyword));

    // Check function body
    const bodyHasSensitive = sensitiveKeywords.some((keyword) => lowerBody.includes(keyword));

    // Check for patterns that suggest business logic
    const businessPatterns = [
      /calculate.*price/gi,
      /process.*payment/gi,
      /validate.*user/gi,
      /generate.*token/gi,
      /encrypt.*data/gi,
      /business.*rule/gi,
      /proprietary.*algorithm/gi,
    ];

    const hasBusinessPatterns = businessPatterns.some((pattern) => pattern.test(functionBody));

    return nameHasSensitive || bodyHasSensitive || hasBusinessPatterns;
  }

  /**
   * Infer return type from function body and name
   */
  private static inferReturnType(functionBody: string, functionName: string): string | undefined {
    // Look for explicit return statements
    const returnMatches = functionBody.match(/return\s+([^;}\n]+)/g);

    if (returnMatches) {
      const lastReturn = returnMatches[returnMatches.length - 1];
      const returnValue = lastReturn.replace('return', '').trim();

      // Infer type from return value
      if (
        returnValue.startsWith('"') ||
        returnValue.startsWith("'") ||
        returnValue.startsWith('`')
      ) {
        return 'string';
      }
      if (/^\d+(\.\d+)?$/.test(returnValue)) {
        return 'number';
      }
      if (returnValue === 'true' || returnValue === 'false') {
        return 'boolean';
      }
      if (returnValue.startsWith('[')) {
        return 'array';
      }
      if (returnValue.startsWith('{')) {
        return 'object';
      }
      if (returnValue === 'null') {
        return 'null';
      }
      if (returnValue === 'undefined') {
        return 'undefined';
      }
    }

    // Infer from function name
    const lowerName = functionName.toLowerCase();
    if (lowerName.startsWith('is') || lowerName.startsWith('has') || lowerName.startsWith('can')) {
      return 'boolean';
    }
    if (lowerName.startsWith('get') && lowerName.includes('count')) {
      return 'number';
    }
    if (lowerName.startsWith('get') && lowerName.includes('list')) {
      return 'array';
    }

    return undefined;
  }

  /**
   * Check if extracted function is valid
   */
  private static isValidFunction(name: string, type: string, fullMatch: string): boolean {
    // Skip constructors
    if (name === 'constructor') {
      return false;
    }

    // Skip common false positives
    const falsePositives = [
      'if',
      'for',
      'while',
      'switch',
      'catch',
      'finally',
      'try',
      'else',
      'do',
      'break',
      'continue',
      'return',
    ];

    if (falsePositives.includes(name)) {
      return false;
    }

    // Skip single character names
    if (name.length < 2) {
      return false;
    }

    // For shorthand methods, be more restrictive
    if (type === 'shorthand_method') {
      // Only accept if it looks like a proper method call
      return /^\w+\s*\([^)]*\)\s*\{/.test(fullMatch);
    }

    return true;
  }

  /**
   * Remove duplicate function entries
   */
  private static deduplicateFunctions(functions: FunctionInfo[]): FunctionInfo[] {
    const seen = new Set<string>();
    const unique: FunctionInfo[] = [];

    functions.forEach((func) => {
      const key = `${func.name}:${func.startLine}:${func.parameters.length}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(func);
      }
    });

    return unique.sort((a, b) => a.startLine - b.startLine);
  }

  /**
   * Get line number from character index
   */
  private static getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Analyze function complexity
   */
  public static analyzeFunctionComplexity(functionBody: string): {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    parameterCount: number;
  } {
    const lines = functionBody.split('\n').filter((line) => line.trim());

    // Count decision points for cyclomatic complexity
    const decisionPoints = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*:/g,
      /&&/g,
      /\|\|/g,
    ];

    let cyclomaticComplexity = 1;
    decisionPoints.forEach((pattern) => {
      const matches = functionBody.match(pattern);
      if (matches) {
        cyclomaticComplexity += matches.length;
      }
    });

    // Cognitive complexity considers nesting
    let cognitiveComplexity = 0;
    let nestingLevel = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Increment nesting for blocks
      if (trimmed.includes('{')) {
        nestingLevel++;
      }
      if (trimmed.includes('}')) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }

      // Add complexity for decision points with nesting multiplier
      decisionPoints.forEach((pattern) => {
        const matches = trimmed.match(pattern);
        if (matches) {
          cognitiveComplexity += matches.length * (nestingLevel + 1);
        }
      });
    });

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode: lines.length,
      parameterCount: 0,
    };
  }

  /**
   * Extract function call graph
   */
  public static extractFunctionCalls(functionBody: string): string[] {
    const calls: string[] = [];

    // Pattern to match function calls
    const callPattern = /(\w+)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = callPattern.exec(functionBody)) !== null) {
      const functionName = match[1];

      // Skip common keywords and built-ins
      const skipKeywords = [
        'if',
        'for',
        'while',
        'switch',
        'catch',
        'typeof',
        'instanceof',
        'console',
        'parseInt',
        'parseFloat',
        'isNaN',
        'setTimeout',
        'setInterval',
        'require',
        'import',
      ];

      if (!skipKeywords.includes(functionName) && functionName.length > 1) {
        if (!calls.includes(functionName)) {
          calls.push(functionName);
        }
      }
    }

    return calls.sort();
  }

  /**
   * Detect function dependencies
   */
  public static detectDependencies(functionBody: string): {
    externalLibraries: string[];
    internalFunctions: string[];
    globalVariables: string[];
  } {
    const externalLibraries: string[] = [];
    const internalFunctions: string[] = [];
    const globalVariables: string[] = [];

    // Extract require/import statements within function
    const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const importPattern = /import\s+.*from\s+['"]([^'"]+)['"]/g;

    let match: RegExpExecArray | null;

    while ((match = requirePattern.exec(functionBody)) !== null) {
      externalLibraries.push(match[1]);
    }

    while ((match = importPattern.exec(functionBody)) !== null) {
      externalLibraries.push(match[1]);
    }

    // Extract global variable access
    const globalPattern = /(?:window\.|global\.|process\.)(\w+)/g;
    while ((match = globalPattern.exec(functionBody)) !== null) {
      if (!globalVariables.includes(match[1])) {
        globalVariables.push(match[1]);
      }
    }

    return {
      externalLibraries: [...new Set(externalLibraries)],
      internalFunctions,
      globalVariables,
    };
  }

  /**
   * Extract function documentation
   */
  public static extractDocumentation(
    code: string,
    functionStartIndex: number
  ): {
    jsDoc?: string;
    comments: string[];
    description?: string;
  } {
    const beforeFunction = code.substring(0, functionStartIndex);
    const lines = beforeFunction.split('\n');
    const comments: string[] = [];
    let jsDoc: string | undefined;

    // Look for JSDoc comment immediately before function
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();

      if (line === '') continue;

      if (line.startsWith('/**')) {
        // Start of JSDoc block
        const docLines: string[] = [];
        for (let j = i; j < lines.length; j++) {
          const docLine = lines[j].trim();
          docLines.push(docLine);
          if (docLine.endsWith('*/')) break;
        }
        jsDoc = docLines.join('\n');
        break;
      } else if (line.startsWith('//')) {
        // Single line comment
        comments.unshift(line.substring(2).trim());
      } else if (line.startsWith('/*') && line.endsWith('*/')) {
        // Single line block comment
        comments.unshift(line.substring(2, line.length - 2).trim());
      } else {
        // Non-comment line, stop looking
        break;
      }
    }

    // Extract description from JSDoc
    let description: string | undefined;
    if (jsDoc) {
      const descMatch = jsDoc.match(/\/\*\*\s*\n?\s*\*?\s*([^@\n]*)/);
      if (descMatch) {
        description = descMatch[1].trim();
      }
    }

    return {
      jsDoc,
      comments,
      description,
    };
  }
}
