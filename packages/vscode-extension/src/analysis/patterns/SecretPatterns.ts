/**
 * Secret Detection Patterns
 * Comprehensive patterns for detecting sensitive data and secrets in JavaScript/TypeScript code
 */

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: 'api_key' | 'password' | 'token' | 'private_key' | 'database' | 'cloud' | 'generic';
  falsePositives: RegExp[];
}

export interface SecretMatch {
  pattern: string;
  line: number;
  column: number;
  text: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  description: string;
  confidence: number;
  context?: string;
}

export interface SecretAnalysisResult {
  hasSecrets: boolean;
  matches: SecretMatch[];
  categories: string[];
  highestSeverity: 'low' | 'medium' | 'high' | 'none';
  recommendations: string[];
}

/**
 * Comprehensive secret detection patterns
 * Enhanced for JavaScript/TypeScript with context awareness
 */
export const SECRET_PATTERNS: Record<string, SecretPattern> = {
  // API Keys
  openai_api_key: {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    description: 'OpenAI API key pattern',
    severity: 'high',
    category: 'api_key',
    falsePositives: [/sk-test/gi, /sk-fake/gi, /sk-example/gi]
  },

  github_token: {
    name: 'GitHub Personal Access Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    description: 'GitHub personal access token',
    severity: 'high',
    category: 'token',
    falsePositives: [/ghp_test/gi, /ghp_fake/gi, /ghp_example/gi]
  },

  github_oauth_token: {
    name: 'GitHub OAuth Token',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    description: 'GitHub OAuth access token',
    severity: 'high',
    category: 'token',
    falsePositives: [/gho_test/gi, /gho_fake/gi]
  },

  aws_access_key: {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    description: 'AWS access key identifier',
    severity: 'high',
    category: 'cloud',
    falsePositives: [/AKIATEST/gi, /AKIAFAKE/gi]
  },

  aws_secret_key: {
    name: 'AWS Secret Key',
    pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)[\s]*[:=][\s]*["']?([A-Za-z0-9+/]{40})["']?/g,
    description: 'AWS secret access key',
    severity: 'high',
    category: 'cloud',
    falsePositives: [/test/gi, /fake/gi, /example/gi]
  },

  google_api_key: {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/g,
    description: 'Google API key',
    severity: 'high',
    category: 'api_key',
    falsePositives: [/AIzaTest/gi, /AIzaFake/gi]
  },

  stripe_api_key: {
    name: 'Stripe API Key',
    pattern: /sk_(?:live|test)_[0-9A-Za-z]{24}/g,
    description: 'Stripe API key (live or test)',
    severity: 'high',
    category: 'api_key',
    falsePositives: [/sk_test_test/gi, /sk_live_fake/gi]
  },

  stripe_webhook_secret: {
    name: 'Stripe Webhook Secret',
    pattern: /whsec_[0-9A-Za-z]{32}/g,
    description: 'Stripe webhook endpoint secret',
    severity: 'high',
    category: 'api_key',
    falsePositives: [/whsec_test/gi, /whsec_fake/gi]
  },

  slack_token: {
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9]{12}-[0-9]{12}-[0-9a-zA-Z]{24}/g,
    description: 'Slack API token',
    severity: 'high',
    category: 'token',
    falsePositives: [/xoxb-test/gi, /xoxb-fake/gi]
  },

  discord_token: {
    name: 'Discord Bot Token',
    pattern: /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/g,
    description: 'Discord bot token',
    severity: 'high',
    category: 'token',
    falsePositives: [/test/gi, /fake/gi]
  },

  twilio_api_key: {
    name: 'Twilio API Key',
    pattern: /SK[a-z0-9]{32}/g,
    description: 'Twilio API key',
    severity: 'high',
    category: 'api_key',
    falsePositives: [/SKtest/gi, /SKfake/gi]
  },

  mailgun_api_key: {
    name: 'Mailgun API Key',
    pattern: /key-[a-zA-Z0-9]{32}/g,
    description: 'Mailgun API key',
    severity: 'high',
    category: 'api_key',
    falsePositives: [/key-test/gi, /key-fake/gi]
  },

  sendgrid_api_key: {
    name: 'SendGrid API Key',
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
    description: 'SendGrid API key',
    severity: 'high',
    category: 'api_key',
    falsePositives: [/SG\.test/gi, /SG\.fake/gi]
  },

  // Database Connection Strings
  mongodb_connection: {
    name: 'MongoDB Connection String',
    pattern: /mongodb(?:\+srv)?:\/\/[^\s"']+/g,
    description: 'MongoDB connection string',
    severity: 'high',
    category: 'database',
    falsePositives: [/localhost/gi, /example\.com/gi]
  },

  mysql_connection: {
    name: 'MySQL Connection String',
    pattern: /mysql:\/\/[^\s"']+/g,
    description: 'MySQL connection string',
    severity: 'high',
    category: 'database',
    falsePositives: [/localhost/gi, /example\.com/gi]
  },

  postgresql_connection: {
    name: 'PostgreSQL Connection String',
    pattern: /postgresql:\/\/[^\s"']+/g,
    description: 'PostgreSQL connection string',
    severity: 'high',
    category: 'database',
    falsePositives: [/localhost/gi, /example\.com/gi]
  },

  redis_connection: {
    name: 'Redis Connection String',
    pattern: /redis:\/\/[^\s"']+/g,
    description: 'Redis connection string',
    severity: 'medium',
    category: 'database',
    falsePositives: [/localhost/gi, /example\.com/gi]
  },

  // Private Keys
  rsa_private_key: {
    name: 'RSA Private Key',
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
    description: 'RSA private key',
    severity: 'high',
    category: 'private_key',
    falsePositives: [/test/gi, /example/gi, /dummy/gi]
  },

  openssh_private_key: {
    name: 'OpenSSH Private Key',
    pattern: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+OPENSSH\s+PRIVATE\s+KEY-----/g,
    description: 'OpenSSH private key',
    severity: 'high',
    category: 'private_key',
    falsePositives: [/test/gi, /example/gi, /dummy/gi]
  },

  ec_private_key: {
    name: 'EC Private Key',
    pattern: /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+EC\s+PRIVATE\s+KEY-----/g,
    description: 'Elliptic curve private key',
    severity: 'high',
    category: 'private_key',
    falsePositives: [/test/gi, /example/gi, /dummy/gi]
  },

  // Generic Patterns
  generic_api_key: {
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey)[\s]*[:=][\s]*["']?([a-zA-Z0-9_\-\.]{20,})["']?/gi,
    description: 'Generic API key pattern',
    severity: 'medium',
    category: 'api_key',
    falsePositives: [/test/gi, /fake/gi, /example/gi, /placeholder/gi, /your_api_key/gi]
  },

  generic_password: {
    name: 'Generic Password',
    pattern: /(?:password|passwd|pwd)[\s]*[:=][\s]*["']?([^\s"']{8,})["']?/gi,
    description: 'Generic password pattern',
    severity: 'medium',
    category: 'password',
    falsePositives: [/password/gi, /test/gi, /fake/gi, /example/gi, /placeholder/gi, /your_password/gi]
  },

  generic_token: {
    name: 'Generic Token',
    pattern: /(?:token|bearer)[\s]*[:=][\s]*["']?([a-zA-Z0-9_\-\.]{20,})["']?/gi,
    description: 'Generic token pattern',
    severity: 'medium',
    category: 'token',
    falsePositives: [/test/gi, /fake/gi, /example/gi, /placeholder/gi, /your_token/gi]
  },

  generic_secret: {
    name: 'Generic Secret',
    pattern: /(?:secret|SECRET)[\s]*[:=][\s]*["']?([a-zA-Z0-9_\-\.]{12,})["']?/gi,
    description: 'Generic secret pattern',
    severity: 'medium',
    category: 'generic',
    falsePositives: [/secret/gi, /test/gi, /fake/gi, /example/gi, /placeholder/gi, /your_secret/gi]
  },

  jwt_token: {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    description: 'JSON Web Token',
    severity: 'high',
    category: 'token',
    falsePositives: [/test/gi, /fake/gi, /example/gi]
  },

  // Email with credentials
  email_with_password: {
    name: 'Email with Password',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[\s]*[:\/][\s]*[^\s"']{6,}/g,
    description: 'Email address with password or credentials',
    severity: 'medium',
    category: 'password',
    falsePositives: [/test@/gi, /fake@/gi, /example@/gi]
  },

  // Environment variable patterns
  env_secret: {
    name: 'Environment Secret',
    pattern: /(?:process\.env\.|ENV\[['"])[A-Z_]*(?:SECRET|KEY|TOKEN|PASSWORD|PASS)[A-Z_]*['"]?\]?/g,
    description: 'Environment variable containing secrets',
    severity: 'low',
    category: 'generic',
    falsePositives: [/test/gi, /fake/gi, /example/gi]
  }
};

/**
 * Secret detection engine with enhanced analysis
 */
export class SecretPatternMatcher {
  /**
   * Analyze code for secret patterns with confidence scoring
   */
  public static analyzeSecrets(code: string, fileName?: string): SecretAnalysisResult {
    const matches: SecretMatch[] = [];
    const categories: Set<string> = new Set();
    let highestSeverity: 'low' | 'medium' | 'high' | 'none' = 'none';

    const lines = code.split('\n');

    Object.entries(SECRET_PATTERNS).forEach(([patternName, patternConfig]) => {
      const globalPattern = new RegExp(patternConfig.pattern.source, 'g');
      let match: RegExpExecArray | null;

      while ((match = globalPattern.exec(code)) !== null) {
        const matchText = match[0];
        const lineIndex = this.getLineFromIndex(code, match.index);
        const columnIndex = this.getColumnFromIndex(code, match.index);
        
        // Check for false positives
        const isFalsePositive = patternConfig.falsePositives.some(fp => 
          fp.test(matchText)
        );

        if (!isFalsePositive) {
          // Calculate confidence based on context
          const confidence = this.calculateConfidence(
            matchText, 
            patternConfig, 
            lines[lineIndex - 1] || '', 
            fileName
          );

          if (confidence > 0.3) {
            matches.push({
              pattern: patternName,
              line: lineIndex,
              column: columnIndex,
              text: this.maskSecret(matchText, patternConfig.category),
              severity: patternConfig.severity,
              category: patternConfig.category,
              description: patternConfig.description,
              confidence,
              context: this.getContext(lines, lineIndex - 1)
            });

            categories.add(patternConfig.category);
            
            // Update highest severity
            if (this.getSeverityLevel(patternConfig.severity) > this.getSeverityLevel(highestSeverity)) {
              highestSeverity = patternConfig.severity;
            }
          }
        }
      }
    });

    return {
      hasSecrets: matches.length > 0,
      matches,
      categories: Array.from(categories),
      highestSeverity,
      recommendations: this.generateSecretRecommendations(matches, categories)
    };
  }

  /**
   * Calculate confidence score for a secret match
   */
  private static calculateConfidence(
    matchText: string, 
    pattern: SecretPattern, 
    line: string, 
    fileName?: string
  ): number {
    let confidence = 0.7; // Base confidence

    // Check if it's in a comment (reduce confidence)
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      confidence -= 0.3;
    }

    // Check if it's in a test file (reduce confidence)
    if (fileName && (fileName.includes('test') || fileName.includes('spec') || fileName.includes('mock'))) {
      confidence -= 0.4;
    }

    // Check if it's in a configuration context (increase confidence)
    if (line.includes('config') || line.includes('env') || line.includes('settings')) {
      confidence += 0.2;
    }

    // Check for obvious test/fake indicators
    const testIndicators = ['test', 'fake', 'example', 'placeholder', 'dummy', 'mock'];
    const lowerMatch = matchText.toLowerCase();
    const lowerLine = line.toLowerCase();
    
    if (testIndicators.some(indicator => lowerMatch.includes(indicator) || lowerLine.includes(indicator))) {
      confidence -= 0.5;
    }

    // High-confidence patterns get bonus
    if (pattern.severity === 'high') {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Mask secret for display
   */
  private static maskSecret(secret: string, category: string): string {
    if (secret.length <= 8) {
      return '*'.repeat(secret.length);
    }

    const visibleChars = Math.min(4, Math.floor(secret.length * 0.2));
    const start = secret.substring(0, visibleChars);
    const end = secret.substring(secret.length - visibleChars);
    const masked = '*'.repeat(secret.length - (visibleChars * 2));
    
    return `${start}${masked}${end}`;
  }

  /**
   * Get surrounding context for a match
   */
  private static getContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length, lineIndex + 2);
    
    return lines.slice(start, end)
      .map((line, idx) => `${start + idx + 1}: ${line}`)
      .join('\n');
  }

  /**
   * Get line number from character index
   */
  private static getLineFromIndex(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Get column number from character index
   */
  private static getColumnFromIndex(code: string, index: number): number {
    const lines = code.substring(0, index).split('\n');
    return lines[lines.length - 1].length + 1;
  }

  /**
   * Get numeric severity level for comparison
   */
  private static getSeverityLevel(severity: 'low' | 'medium' | 'high' | 'none'): number {
    switch (severity) {
      case 'none': return 0;
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      default: return 0;
    }
  }

  /**
   * Generate recommendations based on detected secrets
   */
  private static generateSecretRecommendations(
    matches: SecretMatch[], 
    categories: Set<string>
  ): string[] {
    const recommendations: string[] = [];

    if (matches.length === 0) {
      return ['No secrets detected - code appears safe for AI analysis'];
    }

    // General recommendations
    recommendations.push('Remove all hardcoded secrets from your code');
    recommendations.push('Use environment variables or secure configuration management');
    recommendations.push('Consider using a secrets management service (AWS Secrets Manager, Azure Key Vault, etc.)');

    // Category-specific recommendations
    if (categories.has('api_key')) {
      recommendations.push('Store API keys in environment variables or secure key management systems');
      recommendations.push('Rotate any exposed API keys immediately');
    }

    if (categories.has('password')) {
      recommendations.push('Never store passwords in plain text');
      recommendations.push('Use secure password hashing for stored credentials');
    }

    if (categories.has('token')) {
      recommendations.push('Store tokens securely and implement token rotation');
      recommendations.push('Use short-lived tokens where possible');
    }

    if (categories.has('private_key')) {
      recommendations.push('Store private keys in secure key management systems');
      recommendations.push('Never commit private keys to version control');
      recommendations.push('Generate new key pairs if private keys were exposed');
    }

    if (categories.has('database')) {
      recommendations.push('Use connection pooling and secure database configuration');
      recommendations.push('Implement database access controls and monitoring');
    }

    if (categories.has('cloud')) {
      recommendations.push('Use cloud-native identity and access management');
      recommendations.push('Implement least-privilege access policies');
    }

    // Severity-based recommendations
    const highSeverityMatches = matches.filter(m => m.severity === 'high');
    if (highSeverityMatches.length > 0) {
      recommendations.push('HIGH RISK: This code contains high-severity secrets that should never be shared');
      recommendations.push('Review and rotate all exposed credentials immediately');
    }

    return recommendations;
  }

  /**
   * Get pattern information for a specific secret type
   */
  public static getPatternInfo(patternName: string): SecretPattern | undefined {
    return SECRET_PATTERNS[patternName];
  }

  /**
   * Get all supported secret pattern names
   */
  public static getSupportedPatterns(): string[] {
    return Object.keys(SECRET_PATTERNS);
  }

  /**
   * Get patterns by category
   */
  public static getPatternsByCategory(category: string): Record<string, SecretPattern> {
    return Object.fromEntries(
      Object.entries(SECRET_PATTERNS).filter(([, pattern]) => pattern.category === category)
    );
  }

  /**
   * Check if code contains any secrets
   */
  public static hasSecrets(code: string): boolean {
    return this.analyzeSecrets(code).hasSecrets;
  }

  /**
   * Get quick secret scan (high-confidence patterns only)
   */
  public static quickSecretScan(code: string): SecretMatch[] {
    const result = this.analyzeSecrets(code);
    return result.matches.filter(match => 
      match.confidence > 0.7 && 
      (match.severity === 'high' || match.severity === 'medium')
    );
  }
}