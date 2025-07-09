import { VariableInfo } from '../interfaces/TreeSitterInterfaces';

/**
 * Variable Extraction Logic
 * Handles extraction and analysis of variables from JavaScript/TypeScript code
 */
export class VariableExtractor {
  /**
   * Extract variable information from code
   */
  public static extractVariables(code: string): VariableInfo[] {
    const variables: VariableInfo[] = [];

    // Patterns for different variable declarations
    const patterns = [
      // const/let/var declarations
      {
        pattern: /(const|let|var)\s+(\w+)\s*=\s*([^;\n]+)/g,
        type: 'declaration',
      },
      // Destructuring assignments
      {
        pattern: /(const|let|var)\s*{\s*([^}]+)\s*}\s*=\s*([^;\n]+)/g,
        type: 'destructuring_object',
      },
      // Array destructuring
      {
        pattern: /(const|let|var)\s*\[\s*([^\]]+)\s*\]\s*=\s*([^;\n]+)/g,
        type: 'destructuring_array',
      },
      // Class properties
      {
        pattern: /(public|private|protected)?\s*(static\s+)?(\w+)\s*[=:]\s*([^;\n]+)/g,
        type: 'class_property',
      },
    ];

    patterns.forEach(({ pattern, type }) => {
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(code)) !== null) {
        if (type === 'destructuring_object') {
          this.processObjectDestructuring(match, variables, code);
        } else if (type === 'destructuring_array') {
          this.processArrayDestructuring(match, variables, code);
        } else {
          this.processSingleVariable(match, variables, code, type);
        }
      }
    });

    // Sort by line number and remove duplicates
    return this.deduplicateVariables(variables);
  }

  /**
   * Process single variable declaration
   */
  private static processSingleVariable(
    match: RegExpExecArray,
    variables: VariableInfo[],
    code: string,
    type: string
  ): void {
    const [, declarationType, name, value] = match;

    if (this.isValidVariableName(name)) {
      const isConst = declarationType === 'const' || type === 'class_property';
      const isPotentialSecret = this.isPotentialSecretValue(value, name);
      const scope = this.determineScope(code, match.index);

      variables.push({
        name,
        type: this.inferVariableType(value),
        scope,
        isConst,
        isPotentialSecret,
        value: isPotentialSecret ? '[REDACTED]' : value.trim(),
        line: this.getLineNumber(code, match.index),
      });
    }
  }

  /**
   * Process object destructuring
   */
  private static processObjectDestructuring(
    match: RegExpExecArray,
    variables: VariableInfo[],
    code: string
  ): void {
    const [, declarationType, destructuredVars, value] = match;
    const varNames = destructuredVars.split(',').map((v) => v.trim());

    varNames.forEach((varName) => {
      // Handle renamed destructuring
      const renameParts = varName.split(':');
      const actualName = renameParts.length > 1 ? renameParts[1].trim() : varName;

      if (this.isValidVariableName(actualName)) {
        const isConst = declarationType === 'const';
        const scope = this.determineScope(code, match.index);

        variables.push({
          name: actualName,
          type: 'object_property',
          scope,
          isConst,
          isPotentialSecret: false, // Destructured values are harder to analyze
          value: `destructured from ${value.trim()}`,
          line: this.getLineNumber(code, match.index),
        });
      }
    });
  }

  /**
   * Process array destructuring
   */
  private static processArrayDestructuring(
    match: RegExpExecArray,
    variables: VariableInfo[],
    code: string
  ): void {
    const [, declarationType, destructuredVars, value] = match;
    const varNames = destructuredVars
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v);

    varNames.forEach((varName, index) => {
      if (this.isValidVariableName(varName)) {
        const isConst = declarationType === 'const';
        const scope = this.determineScope(code, match.index);

        variables.push({
          name: varName,
          type: 'array_element',
          scope,
          isConst,
          isPotentialSecret: false,
          value: `destructured[${index}] from ${value.trim()}`,
          line: this.getLineNumber(code, match.index),
        });
      }
    });
  }

  /**
   * Check if variable name is valid
   */
  private static isValidVariableName(name: string): boolean {
    // Must be valid JavaScript identifier
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return false;
    }

    // Skip reserved words
    const reservedWords = [
      'const',
      'let',
      'var',
      'function',
      'class',
      'if',
      'else',
      'for',
      'while',
      'do',
      'switch',
      'case',
      'default',
      'break',
      'continue',
      'return',
      'try',
      'catch',
      'finally',
      'throw',
      'new',
      'this',
      'super',
      'typeof',
      'instanceof',
      'in',
      'of',
    ];

    return !reservedWords.includes(name);
  }

  /**
   * Check if value is potentially a secret
   */
  private static isPotentialSecretValue(value: string, name: string): boolean {
    const trimmedValue = value.trim();
    const lowerName = name.toLowerCase();
    const lowerValue = trimmedValue.toLowerCase();

    // Check variable name for secret indicators
    const secretNameIndicators = [
      'password',
      'secret',
      'token',
      'key',
      'api_key',
      'apikey',
      'auth',
      'credential',
      'private',
      'secret_key',
      'access_token',
      'refresh_token',
      'jwt',
      'bearer',
      'oauth',
    ];

    const hasSecretName = secretNameIndicators.some((indicator) => lowerName.includes(indicator));

    // Check value patterns for secrets
    const secretPatterns = [
      // Long strings that might be secrets
      /^['"][a-zA-Z0-9_\-\.]{20,}['"]$/,
      // API key patterns
      /^['"]sk-[a-zA-Z0-9]{48}['"]$/,
      /^['"]pk-[a-zA-Z0-9]{48}['"]$/,
      // GitHub tokens
      /^['"]ghp_[a-zA-Z0-9]{36}['"]$/,
      /^['"]gho_[a-zA-Z0-9]{36}['"]$/,
      // AWS keys
      /^['"]AKIA[0-9A-Z]{16}['"]$/,
      // JWT tokens
      /^['"]eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+['"]$/,
      // Uppercase tokens/keys
      /^['"][A-Z0-9_]{32,}['"]$/,
      // bcrypt hashes
      /^['"]\$2[ayb]\$.{56}['"]$/,
      // UUID-like strings (might be secret IDs)
      /^['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]$/,
    ];

    const hasSecretPattern = secretPatterns.some((pattern) => pattern.test(trimmedValue));

    // Check for environment variable access that might contain secrets
    const isEnvSecret = /process\.env\.[A-Z_]*(?:SECRET|KEY|TOKEN|PASSWORD|PASS)[A-Z_]*/i.test(
      trimmedValue
    );

    // Additional heuristics
    const isLongString = /^['"][^'"]{16,}['"]$/.test(trimmedValue);
    const hasRandomChars = /^['"][a-zA-Z0-9+/]{16,}['"]$/.test(trimmedValue);

    return (
      hasSecretName ||
      hasSecretPattern ||
      isEnvSecret ||
      (hasSecretName && (isLongString || hasRandomChars))
    );
  }

  /**
   * Infer variable type from value
   */
  private static inferVariableType(value: string): string | undefined {
    const trimmed = value.trim();

    // String literals
    if (trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith('`')) {
      return 'string';
    }

    // Number literals
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return 'number';
    }

    // Boolean literals
    if (trimmed === 'true' || trimmed === 'false') {
      return 'boolean';
    }

    // null and undefined
    if (trimmed === 'null') {
      return 'null';
    }
    if (trimmed === 'undefined') {
      return 'undefined';
    }

    // Array literals
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return 'array';
    }

    // Object literals
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return 'object';
    }

    // Function expressions
    if (trimmed.includes('=>') || trimmed.startsWith('function')) {
      return 'function';
    }

    // Regular expressions
    if (trimmed.startsWith('/') && trimmed.match(/\/[gimuy]*$/)) {
      return 'regexp';
    }

    // new expressions
    if (trimmed.startsWith('new ')) {
      const className = trimmed.match(/new\s+(\w+)/);
      return className ? className[1] : 'object';
    }

    // Environment variables
    if (trimmed.startsWith('process.env')) {
      return 'string';
    }

    // require/import calls
    if (trimmed.startsWith('require(') || trimmed.startsWith('import(')) {
      return 'module';
    }

    return undefined;
  }

  /**
   * Determine variable scope
   */
  private static determineScope(
    code: string,
    variableIndex: number
  ): 'global' | 'function' | 'block' {
    const beforeVariable = code.substring(0, variableIndex);

    // Count braces to determine nesting level
    let braceLevel = 0;
    let inFunction = false;
    let inBlock = false;

    for (let i = 0; i < beforeVariable.length; i++) {
      const char = beforeVariable[i];

      if (char === '{') {
        braceLevel++;
        inBlock = true;
      } else if (char === '}') {
        braceLevel--;
        if (braceLevel === 0) {
          inFunction = false;
          inBlock = false;
        }
      }

      // Check for function keywords
      const remaining = beforeVariable.substring(i);
      if (
        remaining.startsWith('function ') ||
        remaining.match(/=>\s*{/) ||
        remaining.match(/\w+\s*\([^)]*\)\s*{/)
      ) {
        inFunction = true;
      }
    }

    if (braceLevel === 0) {
      return 'global';
    } else if (inFunction) {
      return 'function';
    } else {
      return 'block';
    }
  }

  /**
   * Remove duplicate variables
   */
  private static deduplicateVariables(variables: VariableInfo[]): VariableInfo[] {
    const seen = new Set<string>();
    const unique: VariableInfo[] = [];

    variables.forEach((variable) => {
      const key = `${variable.name}:${variable.line}:${variable.scope}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(variable);
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
   * Analyze variable usage patterns
   */
  public static analyzeVariableUsage(
    code: string,
    variableName: string
  ): {
    readCount: number;
    writeCount: number;
    usageLines: number[];
    isModified: boolean;
    isPassedToFunctions: boolean;
  } {
    const usageLines: number[] = [];
    let readCount = 0;
    let writeCount = 0;
    let isModified = false;
    let isPassedToFunctions = false;

    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Skip the declaration line
      if (
        line.includes(`${variableName}=`) &&
        (line.includes('const ') || line.includes('let ') || line.includes('var '))
      ) {
        return;
      }

      // Count usage occurrences
      const regex = new RegExp(`\\b${variableName}\\b`, 'g');
      const matches = line.match(regex);

      if (matches) {
        usageLines.push(lineNum);

        // Determine if it's a read or write
        if (
          line.includes(`${variableName}=`) ||
          line.includes(`${variableName}++`) ||
          line.includes(`${variableName}--`) ||
          line.includes(`++${variableName}`) ||
          line.includes(`--${variableName}`)
        ) {
          writeCount += matches.length;
          isModified = true;
        } else {
          readCount += matches.length;
        }

        // Check if passed to functions
        if (line.match(new RegExp(`\\w+\\s*\\([^)]*\\b${variableName}\\b[^)]*\\)`))) {
          isPassedToFunctions = true;
        }
      }
    });

    return {
      readCount,
      writeCount,
      usageLines,
      isModified,
      isPassedToFunctions,
    };
  }

  /**
   * Extract variable dependencies
   */
  public static extractVariableDependencies(value: string): {
    referencedVariables: string[];
    referencedProperties: string[];
    functionCalls: string[];
  } {
    const referencedVariables: string[] = [];
    const referencedProperties: string[] = [];
    const functionCalls: string[] = [];

    // Extract variable references
    const varPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    let match: RegExpExecArray | null;

    while ((match = varPattern.exec(value)) !== null) {
      const varName = match[1];

      // Skip keywords and built-ins
      const skipWords = [
        'const',
        'let',
        'var',
        'function',
        'return',
        'if',
        'else',
        'true',
        'false',
        'null',
        'undefined',
        'typeof',
        'instanceof',
        'new',
        'this',
        'super',
        'console',
        'window',
        'document',
      ];

      if (!skipWords.includes(varName)) {
        if (!referencedVariables.includes(varName)) {
          referencedVariables.push(varName);
        }
      }
    }

    // Extract property access
    const propPattern = /(\w+)\.(\w+)/g;
    while ((match = propPattern.exec(value)) !== null) {
      const property = `${match[1]}.${match[2]}`;
      if (!referencedProperties.includes(property)) {
        referencedProperties.push(property);
      }
    }

    // Extract function calls
    const funcPattern = /(\w+)\s*\(/g;
    while ((match = funcPattern.exec(value)) !== null) {
      const funcName = match[1];
      if (!functionCalls.includes(funcName)) {
        functionCalls.push(funcName);
      }
    }

    return {
      referencedVariables,
      referencedProperties,
      functionCalls,
    };
  }
}
