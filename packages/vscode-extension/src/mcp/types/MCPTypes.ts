/**
 * MCP (Model Context Protocol) type definitions for ContextExtendedGuard
 * Provides type safety for MCP server operations and AI assistant communication
 */

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: MCPInputSchema;
}

export interface MCPInputSchema {
  type: 'object';
  properties: Record<string, MCPProperty>;
  required?: string[];
}

export interface MCPProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  items?: MCPProperty;
}

export interface MCPRequest {
  method: string;
  params: {
    name?: string;
    arguments?: Record<string, any>;
  };
}

export interface MCPResponse {
  content: MCPContent[];
}

export interface MCPContent {
  type: 'text' | 'resource';
  text?: string;
  resource?: MCPResource;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
}

export interface MCPAnalysisRequest {
  code: string;
  language: string;
  fileName?: string;
  options?: MCPAnalysisOptions;
}

export interface MCPAnalysisOptions {
  sanitize?: boolean;
  riskLevel?: 'strict' | 'balanced' | 'permissive';
  skipPatterns?: string[];
  framework?: 'react' | 'vue' | 'angular' | 'node' | 'express';
}

export interface MCPAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high';
  hasSecrets: boolean;
  hasBusinessLogic: boolean;
  hasInfrastructureExposure: boolean;
  suggestions: string[];
  sanitizedCode?: string;
  detectedPatterns: string[];
  confidence: number;
  processed_in: string;
  source: 'local' | 'server' | 'edge';
}

export interface MCPServerConfig {
  name: string;
  version: string;
  description: string;
  tools: MCPToolDefinition[];
  capabilities: string[];
}

export interface MCPErrorResponse {
  error: string;
  code: number;
  details?: any;
}
