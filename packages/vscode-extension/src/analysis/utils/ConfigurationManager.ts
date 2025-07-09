import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Configuration Manager for Analysis System
 * Provides centralized configuration management with validation, defaults, and change detection
 */

export interface AnalysisConfiguration {
  // Core settings
  enabled: boolean;
  securityLevel: 'strict' | 'balanced' | 'permissive';
  offlineMode: boolean;
  autoScan: boolean;

  // Performance settings
  maxCacheSize: number;
  analysisTimeout: number;
  maxConcurrentAnalyses: number;
  enablePerformanceMonitoring: boolean;

  // Security settings
  enableSecretDetection: boolean;
  enableBusinessLogicDetection: boolean;
  enableInfrastructureDetection: boolean;
  secretSensitivity: 'low' | 'medium' | 'high';

  // Framework detection
  enableFrameworkDetection: boolean;
  supportedFrameworks: string[];
  frameworkDetectionTimeout: number;

  // Server settings
  serverUrl: string;
  serverTimeout: number;
  enableServerFallback: boolean;
  serverApiKey?: string;

  // MCP settings
  enableMCPServer: boolean;
  mcpServerPort: number;
  mcpAutoStart: boolean;
  mcpAllowedOrigins: string[];

  // File patterns
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number;

  // Reporting
  enableReporting: boolean;
  reportFormat: 'json' | 'markdown' | 'html';
  reportOutputPath?: string;

  // Advanced
  enableTreeSitter: boolean;
  enableSemanticAnalysis: boolean;
  enableRiskAnalysis: boolean;
  enableIntelligenceAnalysis: boolean;
  debugMode: boolean;
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ConfigurationProfile {
  name: string;
  description: string;
  configuration: Partial<AnalysisConfiguration>;
  tags: string[];
  isDefault: boolean;
}

export class ConfigurationManager {
  private static readonly CONFIG_SECTION = 'cxg';
  private static readonly CONFIG_FILE_NAME = 'cxg.config.json';
  private static readonly PROFILES_FILE_NAME = 'cxg.profiles.json';

  private readonly context: vscode.ExtensionContext;
  private readonly configPath: string;
  private readonly profilesPath: string;

  private currentConfig: AnalysisConfiguration;
  private defaultConfig: AnalysisConfiguration;
  private availableProfiles: ConfigurationProfile[] = [];
  private changeListeners: Array<(config: AnalysisConfiguration) => void> = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.configPath = path.join(
      context.globalStorageUri.fsPath,
      ConfigurationManager.CONFIG_FILE_NAME
    );
    this.profilesPath = path.join(
      context.globalStorageUri.fsPath,
      ConfigurationManager.PROFILES_FILE_NAME
    );

    this.defaultConfig = this.createDefaultConfiguration();
    this.currentConfig = { ...this.defaultConfig };

    this.initialize();
  }

  /**
   * Initialize configuration manager
   */
  private async initialize(): Promise<void> {
    // Ensure storage directory exists
    const storageDir = path.dirname(this.configPath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // Load configurations
    await this.loadConfiguration();
    await this.loadProfiles();

    // Setup VS Code configuration watcher
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(ConfigurationManager.CONFIG_SECTION)) {
        this.handleVSCodeConfigurationChange();
      }
    });

    console.log('CXG Configuration Manager initialized');
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): AnalysisConfiguration {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration
   */
  public async updateConfiguration(
    updates: Partial<AnalysisConfiguration>,
    saveToFile: boolean = true
  ): Promise<void> {
    const newConfig = { ...this.currentConfig, ...updates };

    // Validate configuration
    const validation = this.validateConfiguration(newConfig);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      const showWarnings = await vscode.window.showWarningMessage(
        `Configuration warnings: ${validation.warnings.join(', ')}`,
        'Continue',
        'Cancel'
      );

      if (showWarnings !== 'Continue') {
        return;
      }
    }

    this.currentConfig = newConfig;

    // Save to file if requested
    if (saveToFile) {
      await this.saveConfiguration();
    }

    // Sync to VS Code settings
    await this.syncToVSCodeSettings();

    // Notify listeners
    this.notifyChangeListeners();
  }

  /**
   * Reset to default configuration
   */
  public async resetToDefaults(): Promise<void> {
    await this.updateConfiguration(this.defaultConfig);
  }

  /**
   * Get specific configuration value
   */
  public get<K extends keyof AnalysisConfiguration>(key: K): AnalysisConfiguration[K] {
    return this.currentConfig[key];
  }

  /**
   * Set specific configuration value
   */
  public async set<K extends keyof AnalysisConfiguration>(
    key: K,
    value: AnalysisConfiguration[K]
  ): Promise<void> {
    await this.updateConfiguration({ [key]: value } as Partial<AnalysisConfiguration>);
  }

  /**
   * Validate configuration
   */
  public validateConfiguration(config: AnalysisConfiguration): ConfigurationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate security level
    if (!['strict', 'balanced', 'permissive'].includes(config.securityLevel)) {
      errors.push('Invalid security level. Must be: strict, balanced, or permissive');
    }

    // Validate performance settings
    if (config.maxCacheSize < 1024 * 1024) {
      // 1MB minimum
      warnings.push('Cache size is very small, consider increasing for better performance');
    }

    if (config.analysisTimeout < 1000) {
      warnings.push('Analysis timeout is very short, may cause incomplete analysis');
    }

    if (config.maxConcurrentAnalyses < 1 || config.maxConcurrentAnalyses > 10) {
      errors.push('Max concurrent analyses must be between 1 and 10');
    }

    // Validate server settings
    if (config.serverUrl && !this.isValidUrl(config.serverUrl)) {
      errors.push('Invalid server URL format');
    }

    if (config.serverTimeout < 1000) {
      warnings.push('Server timeout is very short, may cause connection failures');
    }

    // Validate MCP settings
    if (config.mcpServerPort < 1024 || config.mcpServerPort > 65535) {
      errors.push('MCP server port must be between 1024 and 65535');
    }

    // Validate file size
    if (config.maxFileSize < 1024) {
      warnings.push('Max file size is very small, may exclude important files');
    }

    // Validate patterns
    config.includePatterns.forEach((pattern, index) => {
      if (!this.isValidGlob(pattern)) {
        errors.push(`Invalid include pattern at index ${index}: ${pattern}`);
      }
    });

    config.excludePatterns.forEach((pattern, index) => {
      if (!this.isValidGlob(pattern)) {
        errors.push(`Invalid exclude pattern at index ${index}: ${pattern}`);
      }
    });

    // Performance suggestions
    if (config.enablePerformanceMonitoring && config.maxConcurrentAnalyses > 5) {
      suggestions.push(
        'Consider reducing concurrent analyses when performance monitoring is enabled'
      );
    }

    if (config.securityLevel === 'strict' && config.offlineMode) {
      suggestions.push('Strict security mode works best with server connectivity enabled');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Get available configuration profiles
   */
  public getProfiles(): ConfigurationProfile[] {
    return [...this.availableProfiles];
  }

  /**
   * Apply configuration profile
   */
  public async applyProfile(profileName: string): Promise<void> {
    const profile = this.availableProfiles.find((p) => p.name === profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    await this.updateConfiguration(profile.configuration);

    vscode.window.showInformationMessage(`Applied configuration profile: ${profile.name}`, {
      modal: false,
    });
  }

  /**
   * Create new configuration profile
   */
  public async createProfile(
    name: string,
    description: string,
    config: Partial<AnalysisConfiguration>,
    tags: string[] = []
  ): Promise<void> {
    // Check if profile already exists
    if (this.availableProfiles.some((p) => p.name === name)) {
      throw new Error(`Profile already exists: ${name}`);
    }

    const profile: ConfigurationProfile = {
      name,
      description,
      configuration: config,
      tags,
      isDefault: false,
    };

    this.availableProfiles.push(profile);
    await this.saveProfiles();

    vscode.window.showInformationMessage(`Created configuration profile: ${name}`, {
      modal: false,
    });
  }

  /**
   * Delete configuration profile
   */
  public async deleteProfile(profileName: string): Promise<void> {
    const index = this.availableProfiles.findIndex((p) => p.name === profileName);
    if (index === -1) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    const profile = this.availableProfiles[index];
    if (profile.isDefault) {
      throw new Error('Cannot delete default profile');
    }

    this.availableProfiles.splice(index, 1);
    await this.saveProfiles();

    vscode.window.showInformationMessage(`Deleted configuration profile: ${profileName}`, {
      modal: false,
    });
  }

  /**
   * Export configuration to file
   */
  public async exportConfiguration(filePath?: string): Promise<string> {
    const exportData = {
      configuration: this.currentConfig,
      profiles: this.availableProfiles,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    const exportPath =
      filePath ||
      path.join(
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.context.globalStorageUri.fsPath,
        'cxg-config-export.json'
      );

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    vscode.window
      .showInformationMessage(`Configuration exported to: ${exportPath}`, 'Open File')
      .then((action) => {
        if (action === 'Open File') {
          vscode.commands.executeCommand('vscode.open', vscode.Uri.file(exportPath));
        }
      });

    return exportPath;
  }

  /**
   * Import configuration from file
   */
  public async importConfiguration(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    try {
      const importData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (importData.configuration) {
        const validation = this.validateConfiguration(importData.configuration);
        if (!validation.isValid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        await this.updateConfiguration(importData.configuration);
      }

      if (importData.profiles && Array.isArray(importData.profiles)) {
        // Merge profiles
        for (const profile of importData.profiles) {
          if (!this.availableProfiles.some((p) => p.name === profile.name)) {
            this.availableProfiles.push(profile);
          }
        }
        await this.saveProfiles();
      }

      vscode.window.showInformationMessage(
        `Configuration imported successfully from: ${filePath}`,
        { modal: false }
      );
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  /**
   * Register configuration change listener
   */
  public onConfigurationChanged(
    listener: (config: AnalysisConfiguration) => void
  ): vscode.Disposable {
    this.changeListeners.push(listener);

    return {
      dispose: () => {
        const index = this.changeListeners.indexOf(listener);
        if (index > -1) {
          this.changeListeners.splice(index, 1);
        }
      },
    };
  }

  /**
   * Get configuration summary for display
   */
  public getConfigurationSummary(): string {
    const config = this.currentConfig;

    return `
# CXG Configuration Summary

## Core Settings
- **Enabled**: ${config.enabled ? 'Yes' : 'No'}
- **Security Level**: ${config.securityLevel}
- **Offline Mode**: ${config.offlineMode ? 'Yes' : 'No'}
- **Auto Scan**: ${config.autoScan ? 'Yes' : 'No'}

## Performance
- **Max Cache Size**: ${this.formatBytes(config.maxCacheSize)}
- **Analysis Timeout**: ${config.analysisTimeout}ms
- **Max Concurrent**: ${config.maxConcurrentAnalyses}
- **Performance Monitoring**: ${config.enablePerformanceMonitoring ? 'Yes' : 'No'}

## Detection Features
- **Secret Detection**: ${config.enableSecretDetection ? 'Yes' : 'No'}
- **Business Logic**: ${config.enableBusinessLogicDetection ? 'Yes' : 'No'}
- **Infrastructure**: ${config.enableInfrastructureDetection ? 'Yes' : 'No'}
- **Framework Detection**: ${config.enableFrameworkDetection ? 'Yes' : 'No'}

## Server Integration
- **Server URL**: ${config.serverUrl || 'Not configured'}
- **Server Fallback**: ${config.enableServerFallback ? 'Yes' : 'No'}
- **MCP Server**: ${config.enableMCPServer ? `Yes (Port: ${config.mcpServerPort})` : 'No'}

## Advanced Features
- **Tree-sitter**: ${config.enableTreeSitter ? 'Yes' : 'No'}
- **Semantic Analysis**: ${config.enableSemanticAnalysis ? 'Yes' : 'No'}
- **Risk Analysis**: ${config.enableRiskAnalysis ? 'Yes' : 'No'}
- **Intelligence Analysis**: ${config.enableIntelligenceAnalysis ? 'Yes' : 'No'}
- **Debug Mode**: ${config.debugMode ? 'Yes' : 'No'}
    `.trim();
  }

  // Private helper methods

  private createDefaultConfiguration(): AnalysisConfiguration {
    return {
      // Core settings
      enabled: true,
      securityLevel: 'balanced',
      offlineMode: true,
      autoScan: true,

      // Performance settings
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      analysisTimeout: 30000, // 30 seconds
      maxConcurrentAnalyses: 3,
      enablePerformanceMonitoring: true,

      // Security settings
      enableSecretDetection: true,
      enableBusinessLogicDetection: true,
      enableInfrastructureDetection: true,
      secretSensitivity: 'medium',

      // Framework detection
      enableFrameworkDetection: true,
      supportedFrameworks: ['react', 'vue', 'angular', 'node', 'express', 'nextjs', 'nuxt'],
      frameworkDetectionTimeout: 5000,

      // Server settings
      serverUrl: 'http://localhost:8080',
      serverTimeout: 10000,
      enableServerFallback: true,

      // MCP settings
      enableMCPServer: true,
      mcpServerPort: 3000,
      mcpAutoStart: true,
      mcpAllowedOrigins: ['*'],

      // File patterns
      includePatterns: [
        '**/*.js',
        '**/*.jsx',
        '**/*.ts',
        '**/*.tsx',
        '**/*.vue',
        '**/*.py',
        '**/*.go',
        '**/*.java',
        '**/*.cs',
        '**/*.php',
        '**/*.rb',
      ],
      excludePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
        '**/*.min.js',
        '**/*.map',
      ],
      maxFileSize: 1024 * 1024, // 1MB

      // Reporting
      enableReporting: true,
      reportFormat: 'json',

      // Advanced
      enableTreeSitter: true,
      enableSemanticAnalysis: true,
      enableRiskAnalysis: true,
      enableIntelligenceAnalysis: false,
      debugMode: false,
    };
  }

  private async loadConfiguration(): Promise<void> {
    try {
      // Load from file
      if (fs.existsSync(this.configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.currentConfig = { ...this.defaultConfig, ...fileConfig };
      }

      // Override with VS Code settings
      const vscodeConfig = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
      const vscodeOverrides: Partial<AnalysisConfiguration> = {
        enabled: vscodeConfig.get('enabled', this.currentConfig.enabled),
        securityLevel: vscodeConfig.get('securityLevel', this.currentConfig.securityLevel),
        offlineMode: vscodeConfig.get('offlineMode', this.currentConfig.offlineMode),
        autoScan: vscodeConfig.get('autoScan', this.currentConfig.autoScan),
        enableMCPServer: vscodeConfig.get('enableMCPServer', this.currentConfig.enableMCPServer),
        debugMode: vscodeConfig.get('debugMode', this.currentConfig.debugMode),
      };

      this.currentConfig = { ...this.currentConfig, ...vscodeOverrides };
    } catch (error) {
      console.warn('Failed to load configuration, using defaults:', error);
      this.currentConfig = { ...this.defaultConfig };
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.currentConfig, null, 2));
    } catch (error) {
      console.error('Failed to save configuration:', error);
      vscode.window.showErrorMessage('Failed to save configuration to file');
    }
  }

  private async loadProfiles(): Promise<void> {
    try {
      if (fs.existsSync(this.profilesPath)) {
        this.availableProfiles = JSON.parse(fs.readFileSync(this.profilesPath, 'utf8'));
      } else {
        // Create default profiles
        this.availableProfiles = this.createDefaultProfiles();
        await this.saveProfiles();
      }
    } catch (error) {
      console.warn('Failed to load profiles, using defaults:', error);
      this.availableProfiles = this.createDefaultProfiles();
    }
  }

  private async saveProfiles(): Promise<void> {
    try {
      fs.writeFileSync(this.profilesPath, JSON.stringify(this.availableProfiles, null, 2));
    } catch (error) {
      console.error('Failed to save profiles:', error);
    }
  }

  private createDefaultProfiles(): ConfigurationProfile[] {
    return [
      {
        name: 'development',
        description: 'Optimized for development with fast feedback',
        configuration: {
          securityLevel: 'balanced',
          analysisTimeout: 15000,
          maxConcurrentAnalyses: 5,
          enableIntelligenceAnalysis: false,
          debugMode: true,
        },
        tags: ['development', 'fast'],
        isDefault: true,
      },
      {
        name: 'production',
        description: 'High security for production environments',
        configuration: {
          securityLevel: 'strict',
          analysisTimeout: 60000,
          maxConcurrentAnalyses: 2,
          enableIntelligenceAnalysis: true,
          secretSensitivity: 'high',
          debugMode: false,
        },
        tags: ['production', 'security'],
        isDefault: false,
      },
      {
        name: 'performance',
        description: 'Optimized for speed and resource usage',
        configuration: {
          securityLevel: 'permissive',
          analysisTimeout: 10000,
          maxConcurrentAnalyses: 1,
          enablePerformanceMonitoring: true,
          enableIntelligenceAnalysis: false,
          maxCacheSize: 50 * 1024 * 1024,
        },
        tags: ['performance', 'fast'],
        isDefault: false,
      },
    ];
  }

  private async syncToVSCodeSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);

    // Only sync core settings to VS Code
    await config.update('enabled', this.currentConfig.enabled, vscode.ConfigurationTarget.Global);
    await config.update(
      'securityLevel',
      this.currentConfig.securityLevel,
      vscode.ConfigurationTarget.Global
    );
    await config.update(
      'offlineMode',
      this.currentConfig.offlineMode,
      vscode.ConfigurationTarget.Global
    );
    await config.update('autoScan', this.currentConfig.autoScan, vscode.ConfigurationTarget.Global);
    await config.update(
      'enableMCPServer',
      this.currentConfig.enableMCPServer,
      vscode.ConfigurationTarget.Global
    );
  }

  private async handleVSCodeConfigurationChange(): Promise<void> {
    // Reload configuration from VS Code settings
    await this.loadConfiguration();
    this.notifyChangeListeners();
  }

  private notifyChangeListeners(): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener(this.getConfiguration());
      } catch (error) {
        console.error('Configuration change listener error:', error);
      }
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidGlob(pattern: string): boolean {
    // Basic glob pattern validation
    try {
      // Check for basic glob syntax issues
      if (pattern.includes('***/') || pattern.includes('/***')) return false;
      if (pattern.includes('[[') || pattern.includes(']]')) return false;
      return pattern.length > 0;
    } catch {
      return false;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

/**
 * Global configuration manager instance
 */
let globalConfigManager: ConfigurationManager | null = null;

/**
 * Initialize global configuration manager
 */
export function initializeGlobalConfigManager(
  context: vscode.ExtensionContext
): ConfigurationManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigurationManager(context);
  }
  return globalConfigManager;
}

/**
 * Get global configuration manager instance
 */
export function getGlobalConfigManager(): ConfigurationManager {
  if (!globalConfigManager) {
    throw new Error(
      'Configuration manager not initialized. Call initializeGlobalConfigManager first.'
    );
  }
  return globalConfigManager;
}

/**
 * Configuration utilities
 */
export class ConfigurationUtils {
  /**
   * Get environment-specific configuration
   */
  static getEnvironmentConfig(): Partial<AnalysisConfiguration> {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTest = process.env.NODE_ENV === 'test';

    if (isTest) {
      return {
        analysisTimeout: 5000,
        maxConcurrentAnalyses: 1,
        enablePerformanceMonitoring: false,
        debugMode: false,
      };
    }

    if (isDevelopment) {
      return {
        debugMode: true,
        analysisTimeout: 15000,
        enablePerformanceMonitoring: true,
      };
    }

    return {};
  }

  /**
   * Merge configurations with precedence
   */
  static mergeConfigurations(
    base: AnalysisConfiguration,
    ...overrides: Partial<AnalysisConfiguration>[]
  ): AnalysisConfiguration {
    const merged = overrides.reduce((acc, override) => ({ ...acc, ...override }), base);
    const result: AnalysisConfiguration = { ...base, ...merged };
    return result;
  }

  /**
   * Create workspace-specific configuration
   */
  static createWorkspaceConfig(
    workspacePath: string,
    baseConfig: AnalysisConfiguration
  ): AnalysisConfiguration {
    // Customize configuration based on workspace characteristics
    const packageJsonPath = path.join(workspacePath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Adjust based on project type
        if (packageJson.dependencies?.react) {
          return {
            ...baseConfig,
            supportedFrameworks: ['react', ...baseConfig.supportedFrameworks],
          };
        }

        if (packageJson.dependencies?.vue) {
          return {
            ...baseConfig,
            supportedFrameworks: ['vue', ...baseConfig.supportedFrameworks],
          };
        }
      } catch (error) {
        console.warn('Failed to read package.json for workspace config:', error);
      }
    }

    return baseConfig;
  }

  /**
   * Validate configuration against schema
   */
  static validateConfigurationSchema(config: any): boolean {
    // Basic schema validation
    const requiredKeys: (keyof AnalysisConfiguration)[] = [
      'enabled',
      'securityLevel',
      'offlineMode',
      'autoScan',
    ];

    return requiredKeys.every((key) => key in config);
  }
}
