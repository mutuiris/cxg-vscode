/**
 * Business Logic Pattern Definitions
 * Comprehensive patterns for detecting sensitive business logic in JavaScript/TypeScript code
 */

export interface BusinessLogicPattern {
  keywords: string[];
  functions: string[];
  patterns: RegExp[];
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface BusinessLogicContext {
  type: 'pricing' | 'authentication' | 'algorithm' | 'financial' | 'encryption' | 'validation';
  indicators: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Comprehensive business logic pattern definitions
 * Enhanced for JavaScript/TypeScript specific patterns
 */
export const BUSINESS_LOGIC_PATTERNS: Record<string, BusinessLogicPattern> = {
  pricing: {
    keywords: [
      'price',
      'cost',
      'billing',
      'payment',
      'invoice',
      'discount',
      'tax',
      'fee',
      'subscription',
      'plan',
      'tier',
      'premium',
      'enterprise',
      'revenue',
      'margin',
      'profit',
      'commission',
      'refund',
      'checkout',
      'cart',
    ],
    functions: [
      'calculatePrice',
      'getPrice',
      'updatePrice',
      'applyDiscount',
      'calculateTax',
      'processPayment',
      'generateInvoice',
      'validatePayment',
      'calculateTotal',
      'applyPromoCode',
      'calculateShipping',
      'processRefund',
      'updateSubscription',
    ],
    patterns: [
      /calculate.*price/gi,
      /pricing.*algorithm/gi,
      /price.*calculation/gi,
      /discount.*logic/gi,
      /tax.*calculation/gi,
      /billing.*process/gi,
      /payment.*flow/gi,
      /subscription.*model/gi,
    ],
    confidence: 0.9,
    severity: 'high',
    description: 'Pricing and billing logic that may contain proprietary business rules',
  },

  authentication: {
    keywords: [
      'auth',
      'login',
      'password',
      'token',
      'session',
      'jwt',
      'oauth',
      'authenticate',
      'authorize',
      'permission',
      'role',
      'access',
      'security',
      'credential',
      'identity',
      'verification',
      'validation',
      'saml',
      'sso',
    ],
    functions: [
      'authenticate',
      'login',
      'logout',
      'validateToken',
      'hashPassword',
      'generateToken',
      'verifyPassword',
      'checkPermissions',
      'authorizeUser',
      'validateSession',
      'refreshToken',
      'encryptPassword',
      'validateUser',
      'generateApiKey',
      'verifyApiKey',
      'createSession',
      'destroySession',
    ],
    patterns: [
      /auth.*logic/gi,
      /login.*process/gi,
      /password.*validation/gi,
      /token.*generation/gi,
      /session.*management/gi,
      /permission.*check/gi,
      /role.*based/gi,
      /access.*control/gi,
    ],
    confidence: 0.95,
    severity: 'high',
    description:
      'Authentication and authorization logic containing security-critical business rules',
  },

  algorithm: {
    keywords: [
      'algorithm',
      'sort',
      'search',
      'optimize',
      'calculate',
      'compute',
      'formula',
      'equation',
      'model',
      'prediction',
      'recommendation',
      'scoring',
      'ranking',
      'matching',
      'filtering',
      'clustering',
      'ml',
    ],
    functions: [
      'algorithm',
      'optimize',
      'calculate',
      'process',
      'transform',
      'analyze',
      'predict',
      'recommend',
      'score',
      'rank',
      'match',
      'filter',
      'cluster',
      'classify',
      'segment',
      'aggregate',
    ],
    patterns: [
      /proprietary.*algorithm/gi,
      /custom.*algorithm/gi,
      /optimization.*logic/gi,
      /recommendation.*engine/gi,
      /scoring.*algorithm/gi,
      /matching.*logic/gi,
      /prediction.*model/gi,
      /ranking.*algorithm/gi,
    ],
    confidence: 0.8,
    severity: 'medium',
    description: 'Proprietary algorithms and computational logic',
  },

  financial: {
    keywords: [
      'money',
      'currency',
      'balance',
      'transaction',
      'account',
      'bank',
      'credit',
      'debit',
      'transfer',
      'exchange',
      'rate',
      'interest',
      'loan',
      'investment',
      'portfolio',
      'risk',
      'compliance',
      'audit',
    ],
    functions: [
      'transfer',
      'deposit',
      'withdraw',
      'getBalance',
      'processPayment',
      'calculateInterest',
      'exchangeCurrency',
      'validateTransaction',
      'processTransfer',
      'updateBalance',
      'checkFunds',
      'auditTransaction',
      'calculateRisk',
      'processLoan',
      'updatePortfolio',
    ],
    patterns: [
      /financial.*calculation/gi,
      /transaction.*processing/gi,
      /balance.*calculation/gi,
      /interest.*calculation/gi,
      /currency.*conversion/gi,
      /risk.*assessment/gi,
      /compliance.*check/gi,
      /audit.*trail/gi,
    ],
    confidence: 0.9,
    severity: 'high',
    description: 'Financial calculations and transaction processing logic',
  },

  encryption: {
    keywords: [
      'encrypt',
      'decrypt',
      'cipher',
      'crypto',
      'hash',
      'secure',
      'key',
      'certificate',
      'signature',
      'digest',
      'salt',
      'iv',
      'aes',
      'rsa',
      'sha',
      'md5',
      'hmac',
      'pbkdf2',
      'scrypt',
    ],
    functions: [
      'encrypt',
      'decrypt',
      'hash',
      'generateKey',
      'sign',
      'verify',
      'createCipher',
      'createHash',
      'generateSalt',
      'deriveKey',
      'createSignature',
      'verifySignature',
      'encryptData',
      'decryptData',
    ],
    patterns: [
      /encryption.*algorithm/gi,
      /crypto.*implementation/gi,
      /key.*generation/gi,
      /signature.*verification/gi,
      /hash.*function/gi,
      /cipher.*implementation/gi,
      /secure.*communication/gi,
      /digital.*signature/gi,
    ],
    confidence: 0.95,
    severity: 'high',
    description: 'Cryptographic implementations and security algorithms',
  },

  validation: {
    keywords: [
      'validate',
      'sanitize',
      'filter',
      'clean',
      'escape',
      'normalize',
      'verify',
      'check',
      'constraint',
      'rule',
      'policy',
      'compliance',
      'regex',
      'pattern',
      'format',
      'schema',
      'whitelist',
      'blacklist',
    ],
    functions: [
      'validate',
      'sanitize',
      'filter',
      'clean',
      'escape',
      'normalize',
      'verifyInput',
      'checkFormat',
      'validateEmail',
      'validatePhone',
      'sanitizeHtml',
      'escapeString',
      'validateSchema',
      'checkConstraints',
    ],
    patterns: [
      /validation.*logic/gi,
      /input.*sanitization/gi,
      /data.*validation/gi,
      /format.*checking/gi,
      /constraint.*validation/gi,
      /policy.*enforcement/gi,
      /compliance.*check/gi,
      /security.*validation/gi,
    ],
    confidence: 0.7,
    severity: 'medium',
    description: 'Data validation and sanitization business rules',
  },
};

/**
 * Enhanced business logic detection with context awareness
 */
export class BusinessLogicPatternMatcher {
  /**
   * Analyze code for business logic patterns with confidence scoring
   */
  public static analyzeBusinessLogic(
    code: string,
    functionNames: string[] = []
  ): BusinessLogicContext[] {
    const contexts: BusinessLogicContext[] = [];
    const lowerCode = code.toLowerCase();

    Object.entries(BUSINESS_LOGIC_PATTERNS).forEach(([type, pattern]) => {
      const indicators: string[] = [];
      let confidence = 0;

      // Check keywords
      const keywordMatches = pattern.keywords.filter((keyword) =>
        lowerCode.includes(keyword.toLowerCase())
      );
      if (keywordMatches.length > 0) {
        confidence += (keywordMatches.length / pattern.keywords.length) * 0.4;
        indicators.push(`Keywords: ${keywordMatches.join(', ')}`);
      }

      // Check function names
      const functionMatches = pattern.functions.filter(
        (func) =>
          functionNames.some((name) => name.toLowerCase().includes(func.toLowerCase())) ||
          lowerCode.includes(func.toLowerCase())
      );
      if (functionMatches.length > 0) {
        confidence += (functionMatches.length / pattern.functions.length) * 0.4;
        indicators.push(`Functions: ${functionMatches.join(', ')}`);
      }

      // Check regex patterns
      const regexMatches = pattern.patterns.filter((regex) => regex.test(code));
      if (regexMatches.length > 0) {
        confidence += (regexMatches.length / pattern.patterns.length) * 0.2;
        indicators.push(`Patterns: ${regexMatches.length} matches`);
      }

      // Apply pattern confidence multiplier
      confidence *= pattern.confidence;

      if (confidence > 0.3 && indicators.length > 0) {
        contexts.push({
          type: type as any,
          indicators,
          riskLevel: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
          recommendations: this.generateRecommendations(type, confidence),
        });
      }
    });

    return contexts;
  }

  /**
   * Generate context-specific recommendations
   */
  private static generateRecommendations(type: string, confidence: number): string[] {
    const recommendations: string[] = [];

    const baseRecommendations: Record<string, string[]> = {
      pricing: [
        'Review pricing logic before sharing with AI assistants',
        'Consider if pricing algorithms contain trade secrets',
        'Ensure pricing calculations are properly tested',
      ],
      authentication: [
        'Never share authentication logic with external systems',
        'Review security implications before AI analysis',
        'Ensure proper access controls are in place',
      ],
      algorithm: [
        'Assess if algorithms contain proprietary intellectual property',
        'Consider patentability of novel algorithms',
        'Review competitive advantages before sharing',
      ],
      financial: [
        'Ensure compliance with financial regulations',
        'Review transaction processing logic carefully',
        'Consider regulatory implications of data sharing',
      ],
      encryption: [
        'Never expose cryptographic keys or secrets',
        'Review security implications thoroughly',
        'Ensure implementation follows security best practices',
      ],
      validation: [
        'Review validation rules for business logic exposure',
        'Consider if validation logic reveals system architecture',
        'Ensure proper input sanitization',
      ],
    };

    const base = baseRecommendations[type] || ['Review business logic carefully before sharing'];
    recommendations.push(...base);

    if (confidence > 0.8) {
      recommendations.push('High confidence detection - requires senior review');
    }

    if (confidence > 0.6) {
      recommendations.push('Consider code sanitization before AI interaction');
    }

    return recommendations;
  }

  /**
   * Get pattern information for a specific type
   */
  public static getPatternInfo(type: string): BusinessLogicPattern | undefined {
    return BUSINESS_LOGIC_PATTERNS[type];
  }

  /**
   * Get all supported business logic types
   */
  public static getSupportedTypes(): string[] {
    return Object.keys(BUSINESS_LOGIC_PATTERNS);
  }

  /**
   * Check if code contains any business logic patterns
   */
  public static hasBusinessLogic(code: string): boolean {
    return this.analyzeBusinessLogic(code).length > 0;
  }

  /**
   * Get the highest risk level from detected patterns
   */
  public static getHighestRiskLevel(code: string): 'low' | 'medium' | 'high' | 'none' {
    const contexts = this.analyzeBusinessLogic(code);

    if (contexts.length === 0) return 'none';

    if (contexts.some((c) => c.riskLevel === 'high')) return 'high';
    if (contexts.some((c) => c.riskLevel === 'medium')) return 'medium';
    return 'low';
  }
}
