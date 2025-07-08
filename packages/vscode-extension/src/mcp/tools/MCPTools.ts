import { MCPToolDefinition } from '../types/MCPTypes';

/**
 * CXG MCP tool definition
 * Defines all available tools for AI assistant integration
 */
export class MCPTools {
  // Get all available MCP tools for CXG
  public static getAllTools(): MCPToolDefinition[] {
    return [
      this.getAnalyzeCodeTool(),
      this.getSanitizeCodeTool(),
      this.getCheckPolicyTool(),
      this.getSecurityContextTool(),
      this.getFrameworkAnalysisTool(),
    ];
  }

  /**
   * Primary code analysis tool for AI assistants
   */
  private static getAnalyzeCodeTool(): MCPToolDefinition {
    return {
      name: 'analyzeCode',
      description:
        'Analyze code for security vulnerabilities, secrets, and sensitive data before AI processing with CXG',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The source code to analyze',
          },
          language: {
            type: 'string',
            description: 'Programming language (javascript, typescript, python, go)',
            enum: ['javascript', 'typescript', 'python', 'go', 'java', 'csharp', 'php', 'ruby'],
          },
          fileName: {
            type: 'string',
            description: 'Optional file name for context',
          },
          options: {
            type: 'object',
            description: 'Analysis options',
            properties: {
              sanitize: {
                type: 'boolean',
                description: 'Whether to return the sanitize code',
              },
              riskLevel: {
                type: 'string',
                description: 'Security strictness level',
                enum: ['strict', 'balanced', 'permissive'],
              },
              framework: {
                type: 'string',
                description: 'Framework specific analysis',
                enum: ['react', 'vue', 'angular', 'node', 'express'],
              },
            },
          },
        },
        required: ['code', 'language'],
      },
    };
  }
  /**
   * Code Sanitize tool
   */
  private static getSanitizeCodeTool(): MCPToolDefinition {
    return {
      name: 'sanitizeCode',
      description:
        'Sanitize sensitive data from code while preserving functionality using ContextExtendedGuard',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The source code to sanitize',
          },
          language: {
            type: 'string',
            description: 'Programming language',
          },
          preserveStructure: {
            type: 'boolean',
            description: 'Whether to preserve code structure and formatting',
          },
        },
        required: ['code', 'language'],
      },
    };
  }
  /**
   * Policy Compliance checking tool
   */
  private static getCheckPolicyTool(): MCPToolDefinition {
    return {
      name: 'checkPolicy',
      description: 'Check code against organization security policies with ContextExtendedGuard',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The source code to check',
          },
          language: {
            type: 'string',
            description: 'Programming language',
          },
          policyLevel: {
            type: 'string',
            description: 'Policy strictness level',
            enum: ['basic', 'standard', 'strict', 'enterprise'],
          },
        },
        required: ['code', 'language'],
      },
    };
  }
  /**
   * Security context information tool
   */
  private static getSecurityContextTool(): MCPToolDefinition {
    return {
      name: 'getSecurityContext',
      description: 'Get current ContextExtendedGuard security settings and context information',
      inputSchema: {
        type: 'object',
        properties: {
          includeMetrics: {
            type: 'boolean',
            description: 'Include security metrics and statistics',
          },
          includePatterns: {
            type: 'boolean',
            description: 'Include available detection patterns',
          },
        },
      },
    };
  }
  /**
   * Framework-specific analysis tool
   */
  private static getFrameworkAnalysisTool(): MCPToolDefinition {
    return {
      name: 'analyzeFrameworkCode',
      description:
        'Perform framework-specific security analysis (React, Node.js, etc.) with ContextExtendedGuard',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The framework-specific code to analyze',
          },
          framework: {
            type: 'string',
            description: 'Framework type',
            enum: ['react', 'vue', 'angular', 'node', 'express', 'nextjs', 'nuxt'],
          },
          depth: {
            type: 'string',
            description: 'Analysis depth',
            enum: ['surface', 'deep', 'comprehensive'],
          },
        },
        required: ['code', 'framework'],
      },
    };
  }
}
