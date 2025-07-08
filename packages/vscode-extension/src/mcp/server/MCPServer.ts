import * as vscode from 'vscode';
import { LocalAnalysisEngine, AnalysisResult } from '../../analysis/LocalAnalysisEngine';
import { ConfigurationManager } from '../../configuration/ConfigurationManager';
import { MCPTools } from '../tools/MCPTools';
import {
  MCPRequest,
  MCPResponse,
  MCPAnalysisRequest,
  MCPAnalysisResult,
  MCPServerConfig,
  MCPErrorResponse,
} from '../types/MCPTypes';

/**
 * ContextExtendedGuard MCP Server Implementation
 * Provides AI assistant integration via Model Context Protocol
 *
 * Features:
 * - Real-time code analysis for AI assistants
 * - Intelligent sanitization before AI processing
 * - Framework-specific security analysis
 * - Policy compliance checking
 * - Audit trail for AI interactions
 */
export class MCPServer implements vscode.Disposable {
  private readonly analysisEngine: LocalAnalysisEngine;
  private readonly config: ConfigurationManager;
  private readonly context: vscode.ExtensionContext;

  private isRunning: boolean = false;
  private serverPort: number = 3000;
  private disposables: vscode.Disposable[] = [];

  // Performance monitoring
  private requestCount: number = 0;
  private totalAnalysisTime: number = 0;
  private lastStartTime: Date;

  constructor(
    context: vscode.ExtensionContext,
    analysisEngine: LocalAnalysisEngine,
    config: ConfigurationManager
  ) {
    this.context = context;
    this.analysisEngine = analysisEngine;
    this.config = config;
    this.lastStartTime = new Date();

    console.log('ContextExtendedGuard MCP Server initialized');
  }

  /**
   * Start the MCP server for AI assistant integration
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      vscode.window.showWarningMessage('ContextExtendedGuard MCP Server is already running');
      return;
    }

    try {
      // Initialize MCP server configuration
      await this.initializeServer();

      this.isRunning = true;
      this.lastStartTime = new Date();

      // Register MCP command handlers
      this.registerCommandHandlers();

      // Setup periodic health checks
      this.setupHealthMonitoring();

      console.log('ContextExtendedGuard MCP Server started successfully');
      vscode.window.showInformationMessage(
        'ContextExtendedGuard MCP Server is now running - AI assistants can access security analysis',
        { modal: false }
      );
    } catch (error) {
      console.error('Failed to start ContextExtendedGuard MCP server:', error);
      vscode.window.showErrorMessage(`Failed to start ContextExtendedGuard MCP server: ${error}`);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Cleanup all disposables
      this.disposables.forEach((disposable) => disposable.dispose());
      this.disposables = [];

      this.isRunning = false;

      console.log('ContextExtendedGuard MCP Server stopped');
      vscode.window.showInformationMessage('ContextExtendedGuard MCP Server stopped', {
        modal: false,
      });
    } catch (error) {
      console.error('Error stopping ContextExtendedGuard MCP server:', error);
    }
  }

  /**
   * Handle MCP requests from AI assistants
   */
  public async handleRequest(request: MCPRequest): Promise<MCPResponse | MCPErrorResponse> {
    const startTime = Date.now();
    this.requestCount++;

    try {
      console.log(`ContextExtendedGuard MCP Request: ${request.method}`, request.params);

      switch (request.method) {
        case 'tools/list':
          return this.handleListTools();

        case 'tools/call':
          return await this.handleToolCall(request);

        case 'resources/list':
          return this.handleListResources();

        default:
          return this.createErrorResponse(`Unknown method: ${request.method}`, 404);
      }
    } catch (error) {
      console.error('ContextExtendedGuard MCP request failed:', error);
      return this.createErrorResponse(`Request failed: ${error}`, 500);
    } finally {
      const processingTime = Date.now() - startTime;
      this.totalAnalysisTime += processingTime;
      console.log(`ContextExtendedGuard MCP Request completed in ${processingTime}ms`);
    }
  }

  /**
   * Initialize MCP server configuration
   */
  private async initializeServer(): Promise<void> {
    const serverConfig: MCPServerConfig = {
      name: 'contextextendedguard',
      version: '0.1.0',
      description: 'ContextExtendedGuard AI Code Security Analysis',
      tools: MCPTools.getAllTools(),
      capabilities: [
        'code_analysis',
        'sanitization',
        'policy_checking',
        'framework_detection',
        'real_time_protection',
      ],
    };

    // Store server configuration in context
    await this.context.globalState.update('mcpServerConfig', serverConfig);
    console.log('ContextExtendedGuard MCP Server configuration initialized');
  }

  /**
   * Register VS Code command handlers for MCP operations
   */
  private registerCommandHandlers(): void {
    // MCP-specific commands
    const mcpCommands = [
      vscode.commands.registerCommand('cxg.mcp.start', () => this.start()),
      vscode.commands.registerCommand('cxg.mcp.stop', () => this.stop()),
      vscode.commands.registerCommand('cxg.mcp.status', () => this.showStatus()),
      vscode.commands.registerCommand('cxg.mcp.analyzeForAI', (code: string, language: string) =>
        this.analyzeForAI(code, language)
      ),
    ];

    this.disposables.push(...mcpCommands);
  }

  /**
   * Handle tools/list requests from AI assistants
   */
  private handleListTools(): MCPResponse {
    const tools = MCPTools.getAllTools();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tools: tools,
              capabilities: [
                'Real-time code analysis with ContextExtendedGuard',
                'JavaScript/TypeScript framework detection',
                'Intelligent sanitization',
                'Policy compliance checking',
                'Security context awareness',
              ],
              status: 'active',
              uptime: Date.now() - this.lastStartTime.getTime(),
              requestsProcessed: this.requestCount,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle tool call requests from AI assistants
   */
  private async handleToolCall(request: MCPRequest): Promise<MCPResponse | MCPErrorResponse> {
    const { name, arguments: args } = request.params;

    if (!name || !args) {
      return this.createErrorResponse('Missing tool name or arguments', 400);
    }

    switch (name) {
      case 'analyzeCode':
        return await this.handleAnalyzeCode(args);

      case 'sanitizeCode':
        return await this.handleSanitizeCode(args);

      case 'checkPolicy':
        return await this.handleCheckPolicy(args);

      case 'getSecurityContext':
        return await this.handleGetSecurityContext(args);

      case 'analyzeFrameworkCode':
        return await this.handleAnalyzeFrameworkCode(args);

      default:
        return this.createErrorResponse(`Unknown tool: ${name}`, 404);
    }
  }

  /**
   * Handle code analysis requests from AI assistants
   */
  private async handleAnalyzeCode(args: any): Promise<MCPResponse | MCPErrorResponse> {
    try {
      const { code, language, fileName, options = {} } = args as MCPAnalysisRequest;

      if (!code || !language) {
        return this.createErrorResponse('Missing required parameters: code, language', 400);
      }

      // Perform analysis using LocalAnalysisEngine
      const analysisResult = await this.analysisEngine.analyzeCode(
        code,
        language,
        fileName || `ai-request-${Date.now()}.${this.getFileExtension(language)}`
      );

      // Convert to MCP format
      const mcpResult = await this.convertToMCPResult(analysisResult, options);

      // Log AI interaction for audit
      await this.logAIInteraction('analyzeCode', {
        language,
        fileName,
        riskLevel: mcpResult.riskLevel,
        hasSecrets: mcpResult.hasSecrets,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(mcpResult, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('ContextExtendedGuard code analysis failed:', error);
      return this.createErrorResponse(`Analysis failed: ${error}`, 500);
    }
  }

  /**
   * Handle code sanitization requests
   */
  private async handleSanitizeCode(args: any): Promise<MCPResponse | MCPErrorResponse> {
    try {
      const { code, language, preserveStructure = true } = args;

      if (!code || !language) {
        return this.createErrorResponse('Missing required parameters: code, language', 400);
      }

      // First analyze to identify risks
      const analysisResult = await this.analysisEngine.analyzeCode(code, language);

      let sanitizedCode = code;

      // If high risk, attempt to sanitize via server
      if (analysisResult.riskLevel === 'high' && this.analysisEngine.isServerAvailable()) {
        try {
          const response = await fetch('http://localhost:8080/api/v1/sanitize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language }),
          });

          if (response.ok) {
            const data = await response.json() as { sanitized?: string };
            sanitizedCode = data.sanitized || code;
          }
        } catch (serverError) {
          console.warn(
            'ContextExtendedGuard server sanitization failed, using local fallback:',
            serverError
          );
          // Use local sanitization patterns as fallback
          sanitizedCode = this.applySanitizationPatterns(code, language);
        }
      } else if (analysisResult.riskLevel === 'high') {
        // Local sanitization fallback
        sanitizedCode = this.applySanitizationPatterns(code, language);
      }

      const result = {
        success: true,
        originalCode: preserveStructure ? '[ORIGINAL_CODE_HIDDEN]' : undefined,
        sanitizedCode,
        modificationsApplied: code !== sanitizedCode,
        riskLevel: analysisResult.riskLevel,
        sanitizationMethod: this.analysisEngine.isServerAvailable() ? 'server' : 'local',
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('ContextExtendedGuard code sanitization failed:', error);
      return this.createErrorResponse(`Sanitization failed: ${error}`, 500);
    }
  }

  /**
   * Helper method to analyze for AI assistants
   */
  public async analyzeForAI(code: string, language: string): Promise<MCPAnalysisResult> {
    const analysisResult = await this.analysisEngine.analyzeCode(code, language);
    return this.convertToMCPResult(analysisResult, { sanitize: true });
  }

  /**
   * Convert AnalysisResult to MCP format
   */
  private async convertToMCPResult(
    result: AnalysisResult,
    options: any = {}
  ): Promise<MCPAnalysisResult> {
    let sanitizedCode: string | undefined;

    // Auto-sanitize if high risk and sanitization requested
    if (options.sanitize && result.riskLevel === 'high') {
      sanitizedCode = await this.getSanitizedCode(result.fileName, result);
    }

    return {
      riskLevel: result.riskLevel,
      hasSecrets: result.hasSecrets,
      hasBusinessLogic: result.hasBusinessLogic,
      hasInfrastructureExposure: result.hasInfrastructureExposure,
      suggestions: result.suggestions,
      sanitizedCode,
      detectedPatterns: result.detectedPatterns,
      confidence: this.calculateConfidence(result),
      processed_in: '< 100ms', // TODO: Add actual timing
      source: this.analysisEngine.isServerAvailable() ? 'server' : 'local',
    };
  }

  /**
   * Show MCP server status
   */
  private async showStatus(): Promise<void> {
    const uptime = Date.now() - this.lastStartTime.getTime();
    const avgResponseTime = this.requestCount > 0 ? this.totalAnalysisTime / this.requestCount : 0;

    const statusMessage = `
**ContextExtendedGuard MCP Server Status**

**Status:** ${this.isRunning ? '🟢 Running' : '🔴 Stopped'}
**Uptime:** ${Math.floor(uptime / 1000 / 60)} minutes
**Requests Processed:** ${this.requestCount}
**Average Response Time:** ${Math.round(avgResponseTime)}ms
**Backend Server:** ${this.analysisEngine.isServerAvailable() ? '🟢 Online' : '🔴 Offline'}

**Available Tools:**
- analyzeCode: Code security analysis
- sanitizeCode: Intelligent code sanitization  
- checkPolicy: Policy compliance checking
- getSecurityContext: Security metrics and context
- analyzeFrameworkCode: Framework-specific analysis
        `;

    vscode.window.showInformationMessage(statusMessage, { modal: true });
  }

  // Helper methods implementation
  private createErrorResponse(message: string, code: number): MCPErrorResponse {
    return {
      error: message,
      code,
      details: {
        timestamp: new Date().toISOString(),
        requestCount: this.requestCount,
      },
    };
  }

  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      go: 'go',
      java: 'java',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
    };
    return extensions[language] || 'txt';
  }

  private async getSanitizedCode(fileName: string, result: AnalysisResult): Promise<string> {
    // TODO: Implementation to call sanitization service
    return '[SANITIZED_CODE_PLACEHOLDER]';
  }

  private calculateConfidence(result: AnalysisResult): number {
    // Calculate confidence based on number of matches and risk level
    const baseConfidence =
      result.riskLevel === 'high' ? 0.9 : result.riskLevel === 'medium' ? 0.7 : 0.5;
    const patternBonus = Math.min(result.detectedPatterns.length * 0.1, 0.3);
    return Math.min(baseConfidence + patternBonus, 1.0);
  }

  private async logAIInteraction(tool: string, metadata: any): Promise<void> {
    // Log AI interactions for audit trail
    console.log(`ContextExtendedGuard AI Interaction: ${tool}`, metadata);
    // TODO: Store in audit database
  }

  private applySanitizationPatterns(code: string, language: string): string {
    // Basic local sanitization patterns
    let sanitized = code;

    // Replace common secret patterns
    sanitized = sanitized.replace(/(['"`])sk-[a-zA-Z0-9]{48}\1/g, '$1REDACTED_API_KEY$1');
    sanitized = sanitized.replace(/(['"`])[a-zA-Z0-9]{32,}\1/g, '$1REDACTED_TOKEN$1');
    sanitized = sanitized.replace(
      /(password\s*[:=]\s*)(['"`])[^'"`]+\2/gi,
      '$1$2REDACTED_PASSWORD$2'
    );

    return sanitized;
  }

  // TODO: Additional stub implementations for other handlers would go here...
  private async handleCheckPolicy(args: any): Promise<MCPResponse | MCPErrorResponse> {
    // Implementation stub
    return { content: [{ type: 'text', text: 'Policy check not implemented yet' }] };
  }

  private async handleGetSecurityContext(args: any): Promise<MCPResponse> {
    // Implementation stub
    return { content: [{ type: 'text', text: 'Security context not implemented yet' }] };
  }

  private async handleAnalyzeFrameworkCode(args: any): Promise<MCPResponse | MCPErrorResponse> {
    // Implementation stub
    return { content: [{ type: 'text', text: 'Framework analysis not implemented yet' }] };
  }

  private handleListResources(): MCPResponse {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              resources: [
                {
                  uri: 'contextextendedguard://security-dashboard',
                  name: 'Security Dashboard',
                  description: 'Real-time security metrics and scan results',
                },
                {
                  uri: 'contextextendedguard://patterns',
                  name: 'Detection Patterns',
                  description: 'Available security patterns and rules',
                },
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private setupHealthMonitoring(): void {
    const healthCheck = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(healthCheck);
        return;
      }

      // Check backend server availability
      await this.analysisEngine.refreshServerAvailability();

      // Log health status periodically
      if (this.requestCount % 100 === 0) {
        console.log(
          `ContextExtendedGuard MCP Server Health: ${this.requestCount} requests processed, avg ${Math.round(
            this.totalAnalysisTime / this.requestCount
          )}ms response time`
        );
      }
    }, 30000); // Every 30 seconds

    this.disposables.push({
      dispose: () => clearInterval(healthCheck),
    });
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.stop();
  }
}
