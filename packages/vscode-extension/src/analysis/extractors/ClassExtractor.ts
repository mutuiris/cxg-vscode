import { ClassInfo } from '../interfaces/TreeSitterInterfaces';

/**
 * Class Extraction Logic
 * Handles extraction and analysis of classes
 */
export class ClassExtractor {
  /**
   * Extract class information from code
   */
  public static extractClasses(code: string): ClassInfo[] {
    const classes: ClassInfo[] = [];

    // Pattern definitions for different class types
    const patterns = [
      // Regular class: class Name {}
      {
        pattern:
          /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g,
        type: 'regular',
      },
      // Abstract class: abstract class Name {}
      {
        pattern:
          /(?:export\s+)?abstract\s+class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g,
        type: 'abstract',
      },
      // Class expression: const Name = class {}
      {
        pattern:
          /(?:const|let|var)\s+(\w+)\s*=\s*class(?:\s+(\w+))?\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g,
        type: 'expression',
      },
    ];

    patterns.forEach(({ pattern, type }) => {
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(code)) !== null) {
        this.processClassMatch(match, type, classes, code);
      }
    });

    // Remove duplicates and sort by line number
    return this.deduplicateClasses(classes);
  }

  /**
   * Process class match based on type
   */
  private static processClassMatch(
    match: RegExpExecArray,
    type: string,
    classes: ClassInfo[],
    code: string
  ): void {
    const [fullMatch, className, extendsClass, classBody] = match;

    if (!this.isValidClassName(className)) {
      return;
    }

    const isExported = fullMatch.includes('export');
    const methods = this.extractMethods(classBody);
    const properties = this.extractProperties(classBody);

    const classInfo: ClassInfo = {
      name: className,
      methods: methods.map((m) => m.name),
      properties: properties.map((p) => p.name),
      isExported,
      startLine: this.getLineNumber(code, match.index),
      endLine: this.getLineNumber(code, match.index + fullMatch.length),
    };

    classes.push(classInfo);
  }

  /**
   * Extract methods from class body
   */
  private static extractMethods(classBody: string): Array<{
    name: string;
    isAsync: boolean;
    isStatic: boolean;
    visibility: 'public' | 'private' | 'protected';
    parameters: string[];
    returnType?: string;
    isAbstract: boolean;
    isGetter: boolean;
    isSetter: boolean;
  }> {
    const methods: Array<{
      name: string;
      isAsync: boolean;
      isStatic: boolean;
      visibility: 'public' | 'private' | 'protected';
      parameters: string[];
      returnType?: string;
      isAbstract: boolean;
      isGetter: boolean;
      isSetter: boolean;
    }> = [];

    // Method patterns
    const patterns = [
      // Regular methods: methodName() {}
      {
        pattern:
          /(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(async)\s+)?(?:(abstract)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*{/g,
        type: 'method',
      },
      // Getters: get methodName() {}
      {
        pattern:
          /(?:(public|private|protected)\s+)?(?:(static)\s+)?get\s+(\w+)\s*\(\s*\)(?:\s*:\s*([^{]+))?\s*{/g,
        type: 'getter',
      },
      // Setters: set methodName(value) {}
      {
        pattern: /(?:(public|private|protected)\s+)?(?:(static)\s+)?set\s+(\w+)\s*\(([^)]*)\)\s*{/g,
        type: 'setter',
      },
      // Arrow function methods: methodName = () => {}
      {
        pattern:
          /(?:(public|private|protected)\s+)?(?:(static)\s+)?(\w+)\s*=\s*(?:(async)\s+)?\([^)]*\)\s*=>/g,
        type: 'arrow',
      },
    ];

    patterns.forEach(({ pattern, type }) => {
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(classBody)) !== null) {
        const methodInfo = this.parseMethodMatch(match, type);
        if (methodInfo && this.isValidMethodName(methodInfo.name)) {
          methods.push(methodInfo);
        }
      }
    });

    return methods;
  }

  /**
   * Parse method match based on type
   */
  private static parseMethodMatch(match: RegExpExecArray, type: string): any {
    switch (type) {
      case 'method':
        return this.parseRegularMethod(match);
      case 'getter':
        return this.parseGetter(match);
      case 'setter':
        return this.parseSetter(match);
      case 'arrow':
        return this.parseArrowMethod(match);
      default:
        return null;
    }
  }

  /**
   * Parse regular method
   */
  private static parseRegularMethod(match: RegExpExecArray): any {
    const [, visibility, static_, async_, abstract_, name, params, returnType] = match;

    return {
      name,
      isAsync: !!async_,
      isStatic: !!static_,
      visibility: (visibility as any) || 'public',
      parameters: this.parseParameters(params || ''),
      returnType: returnType?.trim(),
      isAbstract: !!abstract_,
      isGetter: false,
      isSetter: false,
    };
  }

  /**
   * Parse getter method
   */
  private static parseGetter(match: RegExpExecArray): any {
    const [, visibility, static_, name, returnType] = match;

    return {
      name,
      isAsync: false,
      isStatic: !!static_,
      visibility: (visibility as any) || 'public',
      parameters: [],
      returnType: returnType?.trim(),
      isAbstract: false,
      isGetter: true,
      isSetter: false,
    };
  }

  /**
   * Parse setter method
   */
  private static parseSetter(match: RegExpExecArray): any {
    const [, visibility, static_, name, params] = match;

    return {
      name,
      isAsync: false,
      isStatic: !!static_,
      visibility: (visibility as any) || 'public',
      parameters: this.parseParameters(params || ''),
      returnType: 'void',
      isAbstract: false,
      isGetter: false,
      isSetter: true,
    };
  }

  /**
   * Parse arrow method
   */
  private static parseArrowMethod(match: RegExpExecArray): any {
    const [, visibility, static_, name, async_] = match;

    return {
      name,
      isAsync: !!async_,
      isStatic: !!static_,
      visibility: (visibility as any) || 'public',
      parameters: [], // TODO: Do more complex parsing
      returnType: undefined,
      isAbstract: false,
      isGetter: false,
      isSetter: false,
    };
  }

  /**
   * Extract properties from class body
   */
  private static extractProperties(classBody: string): Array<{
    name: string;
    isStatic: boolean;
    visibility: 'public' | 'private' | 'protected';
    type?: string;
    hasInitializer: boolean;
    isReadonly: boolean;
  }> {
    const properties: Array<{
      name: string;
      isStatic: boolean;
      visibility: 'public' | 'private' | 'protected';
      type?: string;
      hasInitializer: boolean;
      isReadonly: boolean;
    }> = [];

    // Property patterns
    const patterns = [
      // Declared properties: public name: type = value;
      {
        pattern:
          /(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(readonly)\s+)?(\w+)(?:\s*:\s*([^=\n;]+))?(?:\s*=\s*([^;\n]+))?[;\n]/g,
        type: 'declared',
      },
      // This assignments: this.name = value;
      {
        pattern: /this\.(\w+)\s*=\s*([^;\n]+)/g,
        type: 'this_assignment',
      },
    ];

    patterns.forEach(({ pattern, type }) => {
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(classBody)) !== null) {
        const propertyInfo = this.parsePropertyMatch(match, type);
        if (propertyInfo && this.isValidPropertyName(propertyInfo.name)) {
          // Avoid duplicates
          if (!properties.some((p) => p.name === propertyInfo.name)) {
            properties.push(propertyInfo);
          }
        }
      }
    });

    return properties;
  }

  /**
   * Parse property match based on type
   */
  private static parsePropertyMatch(match: RegExpExecArray, type: string): any {
    switch (type) {
      case 'declared':
        return this.parseDeclaredProperty(match);
      case 'this_assignment':
        return this.parseThisAssignment(match);
      default:
        return null;
    }
  }

  /**
   * Parse declared property
   */
  private static parseDeclaredProperty(match: RegExpExecArray): any {
    const [, visibility, static_, readonly_, name, type_, initializer] = match;

    return {
      name,
      isStatic: !!static_,
      visibility: (visibility as any) || 'public',
      type: type_?.trim(),
      hasInitializer: !!initializer,
      isReadonly: !!readonly_,
    };
  }

  /**
   * Parse this assignment
   */
  private static parseThisAssignment(match: RegExpExecArray): any {
    const [, name] = match;

    return {
      name,
      isStatic: false,
      visibility: 'public' as const,
      type: undefined,
      hasInitializer: true,
      isReadonly: false,
    };
  }

  /**
   * Extract static members from class body
   */
  private static extractStaticMembers(classBody: string): string[] {
    const staticMembers: string[] = [];

    // Match static members
    const staticPattern = /static\s+(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = staticPattern.exec(classBody)) !== null) {
      const memberName = match[1];
      if (this.isValidMemberName(memberName) && !staticMembers.includes(memberName)) {
        staticMembers.push(memberName);
      }
    }

    return staticMembers;
  }


  /**
   * Parse parameters from parameter string
   */
  private static parseParameters(paramString: string): string[] {
    if (!paramString.trim()) {
      return [];
    }

    return paramString
      .split(',')
      .map((param) => {
        // Extract parameter name
        const trimmed = param.trim();
        const colonIndex = trimmed.indexOf(':');
        const equalsIndex = trimmed.indexOf('=');

        let endIndex = trimmed.length;
        if (colonIndex !== -1) endIndex = Math.min(endIndex, colonIndex);
        if (equalsIndex !== -1) endIndex = Math.min(endIndex, equalsIndex);

        return trimmed.substring(0, endIndex).trim();
      })
      .filter((param) => param && this.isValidParameterName(param));
  }

  /**
   * Check if class name is valid
   */
  private static isValidClassName(name: string): boolean {
    // Must be valid JavaScript identifier and start with uppercase
    return /^[A-Z][a-zA-Z0-9_$]*$/.test(name) && name.length >= 2;
  }

  /**
   * Check if method name is valid
   */
  private static isValidMethodName(name: string): boolean {
    // Must be valid JavaScript identifier
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return false;
    }

    // Skip reserved words and common false positives
    const reservedWords = [
      'constructor',
      'prototype',
      'class',
      'extends',
      'super',
      'static',
      'public',
      'private',
      'protected',
      'abstract',
      'get',
      'set',
      'async',
      'await',
    ];

    return !reservedWords.includes(name);
  }

  /**
   * Check if property name is valid
   */
  private static isValidPropertyName(name: string): boolean {
    // Must be valid JavaScript identifier
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return false;
    }

    // Skip reserved words and common false positives
    const reservedWords = [
      'constructor',
      'prototype',
      'length',
      'name',
      'toString',
      'valueOf',
      'hasOwnProperty',
      '__proto__',
    ];

    return !reservedWords.includes(name);
  }

  /**
   * Check if member name is valid
   */
  private static isValidMemberName(name: string): boolean {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
  }

  /**
   * Check if parameter name is valid
   */
  private static isValidParameterName(name: string): boolean {
    // Handle destructuring parameters
    if (name.includes('{') || name.includes('[')) {
      return true; // Skip validation for complex destructuring
    }

    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
  }

  /**
   * Remove duplicate classes
   */
  private static deduplicateClasses(classes: ClassInfo[]): ClassInfo[] {
    const seen = new Set<string>();
    const unique: ClassInfo[] = [];

    classes.forEach((classInfo) => {
      const key = `${classInfo.name}:${classInfo.startLine}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(classInfo);
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
   * Analyze class complexity
   */
  public static analyzeClassComplexity(classBody: string): {
    methodCount: number;
    propertyCount: number;
    staticMemberCount: number;
    complexityScore: number;
    cohesion: number;
  } {
    const methods = this.extractMethods(classBody);
    const properties = this.extractProperties(classBody);
    const staticMembers = this.extractStaticMembers(classBody);

    const methodCount = methods.length;
    const propertyCount = properties.length;
    const staticMemberCount = staticMembers.length;

    // Calculate complexity score
    const complexityScore =
      methodCount * 1.5 +
      propertyCount * 1.0 +
      staticMemberCount * 0.5 +
      methods.filter((m) => m.isAsync).length * 0.5 +
      methods.filter((m) => m.isAbstract).length * 1.0;

    // Simple cohesion metric
    const cohesion =
      propertyCount > 0 && methodCount > 0 ? Math.min(propertyCount / methodCount, 1.0) : 0;

    return {
      methodCount,
      propertyCount,
      staticMemberCount,
      complexityScore,
      cohesion,
    };
  }

  /**
   * Analyze class inheritance structure
   */
  public static analyzeInheritance(code: string): {
    baseClasses: string[];
    derivedClasses: Array<{ name: string; extends: string }>;
    inheritanceDepth: number;
  } {
    const baseClasses: string[] = [];
    const derivedClasses: Array<{ name: string; extends: string }> = [];

    // Find inheritance relationships
    const inheritancePattern = /class\s+(\w+)\s+extends\s+(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = inheritancePattern.exec(code)) !== null) {
      const [, derivedClass, baseClass] = match;

      derivedClasses.push({ name: derivedClass, extends: baseClass });

      if (!baseClasses.includes(baseClass)) {
        baseClasses.push(baseClass);
      }
    }

    // Calculate maximum inheritance depth
    const inheritanceDepth =
      derivedClasses.length > 0 ? Math.max(...derivedClasses.map(() => 1)) + 1 : 1;

    return {
      baseClasses,
      derivedClasses,
      inheritanceDepth,
    };
  }

  /**
   * Detect design patterns in classes
   */
  public static detectDesignPatterns(classInfo: ClassInfo, classBody: string): string[] {
    const patterns: string[] = [];

    // Singleton pattern
    if (this.isSingletonPattern(classBody)) {
      patterns.push('Singleton');
    }

    // Factory pattern
    if (this.isFactoryPattern(classInfo, classBody)) {
      patterns.push('Factory');
    }

    // Observer pattern
    if (this.isObserverPattern(classInfo, classBody)) {
      patterns.push('Observer');
    }

    // Builder pattern
    if (this.isBuilderPattern(classInfo, classBody)) {
      patterns.push('Builder');
    }

    return patterns;
  }

  /**
   * Check if class implements Singleton pattern
   */
  private static isSingletonPattern(classBody: string): boolean {
    // Look for private constructor and getInstance method
    const hasPrivateConstructor = /private\s+constructor/.test(classBody);
    const hasGetInstance = /(?:static\s+)?getInstance/.test(classBody);
    const hasStaticInstance = /static.*instance/.test(classBody);

    return hasPrivateConstructor || (hasGetInstance && hasStaticInstance);
  }

  /**
   * Check if class implements Factory pattern
   */
  private static isFactoryPattern(classInfo: ClassInfo, classBody: string): boolean {
    const hasCreateMethod = classInfo.methods.some(
      (method) => method.toLowerCase().includes('create') || method.toLowerCase().includes('make')
    );

    const hasFactoryMethods = /(?:create|make|build)\w*\s*\(/gi.test(classBody);

    return hasCreateMethod || hasFactoryMethods;
  }

  /**
   * Check if class implements Observer pattern
   */
  private static isObserverPattern(classInfo: ClassInfo, classBody: string): boolean {
    const observerMethods = [
      'subscribe',
      'unsubscribe',
      'notify',
      'update',
      'addObserver',
      'removeObserver',
    ];

    const hasObserverMethods = classInfo.methods.some((method) =>
      observerMethods.some((observer) => method.toLowerCase().includes(observer.toLowerCase()))
    );

    return hasObserverMethods;
  }

  /**
   * Check if class implements Builder pattern
   */
  private static isBuilderPattern(classInfo: ClassInfo, classBody: string): boolean {
    const hasBuildMethod = classInfo.methods.some((method) => method.toLowerCase() === 'build');

    const hasFluentInterface =
      classInfo.methods.filter((method) => /^set\w+|^with\w+/.test(method)).length >= 2;

    return hasBuildMethod || hasFluentInterface;
  }
}
