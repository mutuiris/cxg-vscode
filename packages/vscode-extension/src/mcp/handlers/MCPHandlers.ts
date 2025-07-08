import * as vscode from 'vscode';
import { LocalAnalysisEngine, AnalysisResult } from '../../analysis/LocalAnalysisEngine';
import { ConfigurationManager } from '../../configuration/ConfigurationManager';
import { MCPResponse, MCPErrorResponse } from '../types/MCPTypes';

/**
 * ContextExtendedGuard MCP Request Handlers
 * Handles specific MCP tool requests with detailed implementation
 */
export class MCPHandlers {
  private readonly analysisEngine: LocalAnalysisEngine;
  private readonly config: ConfigurationManager;
  private readonly context: vscode.ExtensionContext;

  constructor(
    context: vscode.ExtensionContext,
    analysisEngine: LocalAnalysisEngine,
    config: ConfigurationManager
  ) {
    this.context = context;
    this.analysisEngine = analysisEngine;
    this.config = config;
  }

  /**
   * Handle policy compliance checking
   */
  public async handleCheckPolicy(args: any): Promise<MCPResponse | MCPErrorResponse> {
    try {
      const { code, language, policyLevel = 'standard' } = args;

      if (!code || !language) {
        return this.createErrorResponse('Missing required parameters: code, language', 400);
      }

      console.log(`🛡️ ContextExtendedGuard: Checking policy compliance (${policyLevel} level)`);

      // Get current security level from configuration
      const currentSecurityLevel = this.config.getSecurityLevel();

      // Perform analysis
      const analysisResult = await this.analysisEngine.analyzeCode(code, language);

      // Policy compliance logic based on security level and detected patterns
      const policyCompliant = this.checkPolicyCompliance(
        analysisResult,
        currentSecurityLevel,
        policyLevel
      );

      const result = {
        compliant: policyCompliant.isCompliant,
        violations: policyCompliant.violations,
        riskLevel: analysisResult.riskLevel,
        policyLevel,
        currentSecurityLevel,
        recommendations: policyCompliant.recommendations,
        timestamp: new Date().toISOString(),
        detectedPatterns: analysisResult.detectedPatterns,
        confidence: this.calculateComplianceConfidence(policyCompliant),
      };

      console.log(
        `🛡️ Policy check complete: ${policyCompliant.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('ContextExtendedGuard policy check failed:', error);
      return this.createErrorResponse(`Policy check failed: ${error}`, 500);
    }
  }

  /**
   * Handle security context requests
   */
  public async handleGetSecurityContext(args: any): Promise<MCPResponse> {
    try {
      const { includeMetrics = true, includePatterns = false } = args;

      console.log('🛡️ ContextExtendedGuard: Getting security context');

      const context = {
        serverStatus: {
          name: 'ContextExtendedGuard MCP Server',
          version: '0.1.0',
          isRunning: true,
          uptime: this.getUptime(),
          capabilities: [
            'Real-time code analysis',
            'JavaScript/TypeScript framework detection',
            'Intelligent sanitization',
            'Policy compliance checking',
            'Security context awareness',
          ],
        },
        configuration: {
          securityLevel: this.config.getSecurityLevel(),
          enabled: this.config.isEnabled(),
          offlineMode: this.config.isOfflineModeEnabled(),
          autoScan: this.config.isAutoScanEnabled(),
          frameworkDetection: true,
          mcpIntegration: true,
        },
        backend: {
          serverAvailable: this.analysisEngine.isServerAvailable(),
          serverUrl: 'http://localhost:8080',
          analysisCapabilities: [
            'Pattern detection',
            'AST analysis',
            'Semantic analysis',
            'Cross-file analysis',
          ],
        },
      };

      if (includeMetrics) {
        const summary = this.analysisEngine.getSecuritySummary();
        (context as any).metrics = {
          totalScans: summary.total,
          highRiskFiles: summary.high,
          mediumRiskFiles: summary.medium,
          lowRiskFiles: summary.low,
          recentScans: this.analysisEngine
            .getRecentScans()
            .slice(-5)
            .map((scan) => ({
              fileName: scan.fileName,
              riskLevel: scan.riskLevel,
              timestamp: scan.timestamp,
              patternsFound: scan.detectedPatterns.length,
            })),
          scanTrends: this.calculateScanTrends(),
        };
      }

      if (includePatterns) {
        (context as any).supportedPatterns = {
          secrets: [
            'API keys and tokens',
            'Passwords and credentials',
            'Private keys and certificates',
            'OAuth tokens',
            'Database connection strings',
          ],
          businessLogic: [
            'Pricing algorithms',
            'Authentication flows',
            'Business rules',
            'Proprietary calculations',
          ],
          infrastructure: [
            'Internal URLs and endpoints',
            'Server configurations',
            'Network topology',
            'Service dependencies',
          ],
          frameworks: [
            'React environment variables',
            'Node.js server configurations',
            'Express middleware patterns',
            'Vue.js configurations',
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(context, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('ContextExtendedGuard security context failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: `Failed to get security context: ${error}`,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  /**
   * Handle framework-specific analysis
   */
  public async handleAnalyzeFrameworkCode(args: any): Promise<MCPResponse | MCPErrorResponse> {
    try {
      const { code, framework, depth = 'deep' } = args;

      if (!code || !framework) {
        return this.createErrorResponse('Missing required parameters: code, framework', 400);
      }

      console.log(`🛡️ ContextExtendedGuard: Analyzing ${framework} code (${depth} analysis)`);

      // Determine language based on framework
      const language = this.getLanguageForFramework(framework);

      // Perform base analysis
      const analysisResult = await this.analysisEngine.analyzeCode(code, language);

      // Add framework-specific insights
      const frameworkAnalysis = await this.analyzeFrameworkSpecific(
        code,
        framework,
        analysisResult,
        depth
      );

      const result = {
        ...analysisResult,
        framework,
        frameworkSpecific: frameworkAnalysis,
        analysisDepth: depth,
        language,
        recommendations: this.generateFrameworkRecommendations(framework, frameworkAnalysis),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `🛡️ Framework analysis complete: ${frameworkAnalysis.patterns.length} framework-specific patterns found`
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('ContextExtendedGuard framework analysis failed:', error);
      return this.createErrorResponse(`Framework analysis failed: ${error}`, 500);
    }
  }

  /**
   * Policy compliance checking logic
   */
  private checkPolicyCompliance(
    result: AnalysisResult,
    securityLevel: string,
    policyLevel: string
  ): {
    isCompliant: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check based on policy level
    switch (policyLevel) {
      case 'enterprise':
        if (result.hasSecrets) {
          violations.push('Hardcoded secrets detected - Enterprise policy violation');
          recommendations.push(
            'All secrets must be stored in secure credential management systems'
          );
        }
        if (result.hasBusinessLogic) {
          violations.push('Business logic detected - Enterprise review required');
          recommendations.push('Business logic requires security review before AI sharing');
        }
        if (result.hasInfrastructureExposure) {
          violations.push('Infrastructure exposure detected - Enterprise policy violation');
          recommendations.push('Infrastructure details must not be exposed in code');
        }
        break;

      case 'strict':
        if (result.hasSecrets) {
          violations.push('Hardcoded secrets detected');
          recommendations.push('Use environment variables for sensitive data');
        }
        if (result.hasBusinessLogic && securityLevel === 'strict') {
          violations.push('Proprietary business logic detected');
          recommendations.push('Consider code review before AI sharing');
        }
        break;

      case 'standard':
        if (result.riskLevel === 'high') {
          violations.push('High risk code detected');
          recommendations.push('Review and sanitize before sharing with AI');
        }
        break;

      case 'basic':
        if (result.hasSecrets && result.riskLevel === 'high') {
          violations.push('Critical secrets detected');
          recommendations.push('Remove secrets before sharing');
        }
        break;
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      recommendations,
    };
  }

  /**
   * Framework-specific analysis logic
   */
  private async analyzeFrameworkSpecific(
    code: string,
    framework: string,
    baseResult: AnalysisResult,
    depth: string
  ): Promise<any> {
    const analysis: any = {
      framework,
      patterns: [],
      configurations: [],
      dependencies: [],
      security: {
        frameworkSpecificRisks: [],
        bestPractices: [],
      },
    };

    switch (framework) {
      case 'react':
        analysis.patterns.push(...this.analyzeReactPatterns(code));
        analysis.configurations.push(...this.analyzeReactConfigurations(code));
        if (depth === 'comprehensive') {
          analysis.dependencies.push(...this.analyzeReactDependencies(code));
        }
        break;

      case 'node':
      case 'express':
        analysis.patterns.push(...this.analyzeNodePatterns(code));
        analysis.configurations.push(...this.analyzeNodeConfigurations(code));
        if (depth === 'comprehensive') {
          analysis.dependencies.push(...this.analyzeNodeDependencies(code));
        }
        break;

      case 'vue':
        analysis.patterns.push(...this.analyzeVuePatterns(code));
        analysis.configurations.push(...this.analyzeVueConfigurations(code));
        break;

      case 'angular':
        analysis.patterns.push(...this.analyzeAngularPatterns(code));
        analysis.configurations.push(...this.analyzeAngularConfigurations(code));
        break;
    }

    return analysis;
  }

  /**
   * React-specific pattern analysis
   */
  private analyzeReactPatterns(code: string): string[] {
    const patterns: string[] = [];

    if (code.includes('REACT_APP_')) {
      patterns.push('React environment variables detected');
    }
    if (code.includes('useState') || code.includes('useEffect')) {
      patterns.push('React hooks detected');
    }
    if (code.includes('process.env')) {
      patterns.push('Environment variable access detected');
    }
    if (/import.*from\s+['"]react['"]/g.test(code)) {
      patterns.push('React import detected');
    }
    if (code.includes('createContext') || code.includes('useContext')) {
      patterns.push('React Context usage detected');
    }

    return patterns;
  }

  private analyzeReactConfigurations(code: string): string[] {
    const configs: string[] = [];

    // Check for common React configuration patterns
    if (code.includes('PUBLIC_URL')) {
      configs.push('Public URL configuration found');
    }
    if (code.includes('homepage')) {
      configs.push('Homepage configuration found');
    }

    return configs;
  }

  private analyzeReactDependencies(code: string): string[] {
    const deps: string[] = [];

    // Analyze import statements for security-relevant dependencies
    const importMatches = code.match(/import.*from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach((importStmt) => {
        if (importStmt.includes('axios')) deps.push('HTTP client (axios) detected');
        if (importStmt.includes('react-router')) deps.push('Routing library detected');
        if (importStmt.includes('redux')) deps.push('State management (Redux) detected');
      });
    }

    return deps;
  }

  /**
   * Node.js-specific pattern analysis
   */
  private analyzeNodePatterns(code: string): string[] {
    const patterns: string[] = [];

    if (code.includes('require(') || code.includes('import ')) {
      patterns.push('Module imports detected');
    }
    if (code.includes('process.env')) {
      patterns.push('Environment variable access detected');
    }
    if (code.includes('fs.') || code.includes('path.')) {
      patterns.push('File system operations detected');
    }
    if (code.includes('http.') || code.includes('express.')) {
      patterns.push('HTTP server operations detected');
    }
    if (code.includes('crypto.') || code.includes('bcrypt')) {
      patterns.push('Cryptographic operations detected');
    }

    return patterns;
  }

  private analyzeNodeConfigurations(code: string): string[] {
    const configs: string[] = [];

    if (code.includes('PORT') || code.includes('HOST')) {
      configs.push('Server configuration detected');
    }
    if (code.includes('DATABASE_URL') || code.includes('DB_')) {
      configs.push('Database configuration detected');
    }
    if (code.includes('JWT_SECRET') || code.includes('SESSION_SECRET')) {
      configs.push('Authentication configuration detected');
    }

    return configs;
  }

  private analyzeNodeDependencies(code: string): string[] {
    const deps: string[] = [];

    // Analyze require/import statements
    const requireMatches = code.match(/require\(['"]([^'"]+)['"]\)/g);
    const importMatches = code.match(/import.*from\s+['"]([^'"]+)['"]/g);

    const allMatches = [...(requireMatches || []), ...(importMatches || [])];

    allMatches.forEach((match) => {
      if (match.includes('express')) deps.push('Express framework detected');
      if (match.includes('mongoose') || match.includes('sequelize'))
        deps.push('Database ORM detected');
      if (match.includes('passport')) deps.push('Authentication middleware detected');
      if (match.includes('cors')) deps.push('CORS middleware detected');
    });

    return deps;
  }

  /**
   * Vue.js-specific analysis (simplified)
   */
  private analyzeVuePatterns(code: string): string[] {
    const patterns: string[] = [];

    if (code.includes('Vue.') || code.includes('vue')) {
      patterns.push('Vue.js framework detected');
    }
    if (code.includes('$router') || code.includes('$route')) {
      patterns.push('Vue Router usage detected');
    }

    return patterns;
  }

  private analyzeVueConfigurations(code: string): string[] {
    // Simplified Vue configuration analysis
    return [];
  }

  /**
   * Angular-specific analysis (simplified)
   */
  private analyzeAngularPatterns(code: string): string[] {
    const patterns: string[] = [];

    if (code.includes('@Component') || code.includes('@Injectable')) {
      patterns.push('Angular decorators detected');
    }
    if (code.includes('HttpClient') || code.includes('http.')) {
      patterns.push('HTTP client usage detected');
    }

    return patterns;
  }

  private analyzeAngularConfigurations(code: string): string[] {
    // Simplified Angular configuration analysis
    return [];
  }

  /**
   * Generate framework-specific recommendations
   */
  private generateFrameworkRecommendations(framework: string, analysis: any): string[] {
    const recommendations: string[] = [];

    switch (framework) {
      case 'react':
        if (analysis.patterns.some((p: string) => p.includes('environment variables'))) {
          recommendations.push("Ensure REACT_APP_ variables don't contain secrets");
          recommendations.push('Use server-side environment variables for sensitive data');
        }
        if (analysis.patterns.some((p: string) => p.includes('Context'))) {
          recommendations.push('Review Context providers for sensitive data exposure');
        }
        break;

      case 'node':
      case 'express':
        if (analysis.patterns.some((p: string) => p.includes('environment'))) {
          recommendations.push('Use dotenv for development and secure vaults for production');
        }
        if (analysis.patterns.some((p: string) => p.includes('crypto'))) {
          recommendations.push('Ensure cryptographic operations use secure configurations');
        }
        break;
    }

    if (recommendations.length === 0) {
      recommendations.push(`${framework} code follows security best practices`);
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private getLanguageForFramework(framework: string): string {
    const mapping: Record<string, string> = {
      react: 'javascript',
      vue: 'javascript',
      angular: 'typescript',
      node: 'javascript',
      express: 'javascript',
      nextjs: 'typescript',
      nuxt: 'javascript',
    };
    return mapping[framework] || 'javascript';
  }

  private calculateComplianceConfidence(policyResult: any): number {
    // Calculate confidence based on number of checks and violations
    const totalChecks = policyResult.violations.length + policyResult.recommendations.length;
    const violationRatio = totalChecks > 0 ? policyResult.violations.length / totalChecks : 0;

    return Math.max(0.5, 1.0 - violationRatio * 0.5);
  }

  private calculateScanTrends(): any {
    const recentScans = this.analysisEngine.getRecentScans();
    const last7Days = recentScans.filter(
      (scan) => Date.now() - scan.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
    );

    return {
      last7Days: last7Days.length,
      averageRiskLevel: this.calculateAverageRiskLevel(last7Days),
      trendDirection: this.calculateTrendDirection(last7Days),
    };
  }

  private calculateAverageRiskLevel(scans: AnalysisResult[]): number {
    if (scans.length === 0) return 0;

    const riskValues = scans.map((scan) => {
      switch (scan.riskLevel) {
        case 'high':
          return 3;
        case 'medium':
          return 2;
        case 'low':
          return 1;
        default:
          return 1;
      }
    });

    return riskValues.reduce((sum, val) => sum + val, 0) / riskValues.length;
  }

  private calculateTrendDirection(scans: AnalysisResult[]): string {
    if (scans.length < 2) return 'stable';

    const recent = scans.slice(-5);
    const older = scans.slice(-10, -5);

    const recentAvg = this.calculateAverageRiskLevel(recent);
    const olderAvg = this.calculateAverageRiskLevel(older);

    if (recentAvg > olderAvg + 0.2) return 'increasing';
    if (recentAvg < olderAvg - 0.2) return 'decreasing';
    return 'stable';
  }

  private getUptime(): string {
    // TODO: Real implementation to track actual start time
    return '< 1 hour';
  }

  private createErrorResponse(message: string, code: number): MCPErrorResponse {
    return {
      error: message,
      code,
      details: {
        timestamp: new Date().toISOString(),
        handler: 'MCPHandlers',
      },
    };
  }
}
