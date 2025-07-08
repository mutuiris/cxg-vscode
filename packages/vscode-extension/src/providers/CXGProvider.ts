import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from '../configuration/ConfigurationManager';
import { LocalAnalysisEngine, AnalysisResult } from '../analysis/LocalAnalysisEngine';
import { AnalysisResultsView } from '../views/AnalysisResultsView';
import { SecurityReportView } from '../views/SecurityReportView';

/**
 * CXGProvider manages the core functionality of the CXG extension
 * Coordinates between analysis engine, configuration, and user interface
 */
export class CXGProvider implements vscode.Disposable {
  private context: vscode.ExtensionContext;
  private config: ConfigurationManager;
  private analysisEngine: LocalAnalysisEngine;
  private statusBar: any;
  private disposables: vscode.Disposable[] = [];
  private isEnabled: boolean = true;

  constructor(
    context: vscode.ExtensionContext,
    config: ConfigurationManager,
    analysisEngine: LocalAnalysisEngine,
    statusBar?: any
  ) {
    this.context = context;
    this.config = config;
    this.analysisEngine = analysisEngine;
    this.statusBar = statusBar;

    this.setupEventHandlers();
    console.log('CXG Provider initialized');
  }

  /**
   * Set up event handlers for document changes and other VS Code events
   */
  private setupEventHandlers(): void {
    // Listen for configuration changes
    this.disposables.push(
      this.config.onConfigurationChanged(() => {
        this.isEnabled = this.config.isEnabled();
        this.updateStatusBar();
        console.log(`CXG enabled status changed: ${this.isEnabled}`);
      })
    );

    // Listen for document save events
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (this.isEnabled && this.shouldAnalyzeDocument(document)) {
          await this.analyzeDocument(document);
        }
      })
    );

    // Listen for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (this.isEnabled && editor && this.shouldAnalyzeDocument(editor.document)) {
          // Debounce analysis for editor changes
          setTimeout(() => this.analyzeDocument(editor.document), 1000);
        }
      })
    );
  }

  /**
   * Check if a document should be analyzed based on language and settings
   */
  private shouldAnalyzeDocument(document: vscode.TextDocument): boolean {
    const supportedLanguages = [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
      'python',
      'go',
      'java',
      'csharp',
      'php',
      'ruby',
    ];
    return (
      supportedLanguages.includes(document.languageId) &&
      document.uri.scheme === 'file' &&
      !document.fileName.includes('node_modules') &&
      !document.fileName.includes('.git')
    );
  }

  /**
   * Analyze a document and handle the results
   */
  private async analyzeDocument(document: vscode.TextDocument): Promise<AnalysisResult> {
    const code = document.getText();
    const language = document.languageId;
    const fileName = path.basename(document.fileName);

    console.log(`CXG: Analyzing document ${fileName} (${language})`);

    // Update status bar to show scanning
    this.updateStatusBar('scanning', `Scanning ${fileName}...`);

    try {
      const result = await this.analysisEngine.analyzeCode(code, language, fileName);

      // Update status bar based on results
      if (result.riskLevel === 'high') {
        this.updateStatusBar('warning', `High risk detected in ${fileName}`);

        // Show non-intrusive notification
        const action = await vscode.window.showWarningMessage(
          `🚨 CXG: High risk detected in ${fileName}`,
          { modal: false },
          'View Details',
          'Dismiss'
        );

        if (action === 'View Details') {
          AnalysisResultsView.show(result);
        }
      } else if (result.riskLevel === 'medium') {
        this.updateStatusBar('warning', `Medium risk detected in ${fileName}`);

        const action = await vscode.window.showInformationMessage(
          `⚠️ CXG: Security concerns found in ${fileName}`,
          { modal: false },
          'View Details'
        );

        if (action === 'View Details') {
          AnalysisResultsView.show(result);
        }
      } else {
        this.updateStatusBar('active', 'Code is secure');
      }

      return result;
    } catch (error) {
      console.error('CXG: Analysis failed:', error);
      this.updateStatusBar('error', `Analysis failed: ${error}`);

      vscode.window.showErrorMessage(`CXG: Analysis failed for ${fileName}`, { modal: false });
      throw error;
    }
  }

  /**
   * Update status bar with enhanced states
   */
  private updateStatusBar(status?: string, message?: string): void {
    if (this.statusBar) {
      const finalStatus = status || (this.isEnabled ? 'active' : 'inactive');
      this.statusBar.updateStatus(finalStatus, message);
    }
  }

  /**
   * Enable CXG protection
   */
  public async enable(): Promise<void> {
    await this.config.setEnabled(true);
    this.isEnabled = true;
    this.updateStatusBar('active', 'CXG protection enabled');

    vscode.window.showInformationMessage('🛡️ CXG protection enabled', { modal: false });
  }

  /**
   * Disable CXG protection
   */
  public async disable(): Promise<void> {
    await this.config.setEnabled(false);
    this.isEnabled = false;
    this.updateStatusBar('inactive', 'CXG protection disabled');

    vscode.window.showWarningMessage('🛡️ CXG protection disabled', { modal: false });
  }

  /**
   * Scan the currently active file
   */
  public async scanCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active file to scan', { modal: false });
      return;
    }

    try {
      const result = await this.analyzeDocument(editor.document);
      AnalysisResultsView.show(result);
    } catch (error) {
      // Error already handled in analyzeDocument
    }
  }

  /**
   * Show analysis report
   */
  public async showReport(): Promise<void> {
    const recentScans = this.analysisEngine.getRecentScans();
    const summary = this.analysisEngine.getSecuritySummary();
    const isServerOnline = this.analysisEngine.isServerAvailable();

    SecurityReportView.show(recentScans, summary, isServerOnline);
  }

  /**
   * Show CXG settings
   */
  public async showSettings(): Promise<void> {
    vscode.commands.executeCommand('workbench.action.openSettings', 'cxg');
  }

  /**
   * Set status bar reference
   */
  public setStatusBar(statusBar: any): void {
    this.statusBar = statusBar;
    this.updateStatusBar();
  }

  /**
   * Scan a Javascript framework project
   */
  public async scanFrameworkProject(framework: 'react' | 'node' | 'vue' | 'angular'): Promise<void> {
    console.log(`CXG: Starting ${framework} project scan...`);
    
    try {
      // Update status bar to show scanning
      this.updateStatusBar('scanning', `Scanning ${framework} project...`);

      // Get workspace folders
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder found to scan');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const results: AnalysisResult[] = [];
      let filesScanned = 0;

      // Framework-specific file patterns
      const frameWorkPatterns = this.getFrameworkFilePatterns(framework);
      
      // Find and analyze framework-specific files
      for (const pattern of frameWorkPatterns) {
        const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 50);
        
        for (const file of files) {
          try {
            const document = await vscode.workspace.openTextDocument(file);
            const result = await this.analyzeDocument(document);
            results.push(result);
            filesScanned++;
            
            // Update progress
            this.updateStatusBar('scanning', `Scanning ${framework} project... (${filesScanned} files)`);
          } catch (error) {
            console.warn(`Failed to analyze ${file.fsPath}:`, error);
          }
        }
      }

      // Show summary
      const highRisk = results.filter(r => r.riskLevel === 'high').length;
      const mediumRisk = results.filter(r => r.riskLevel === 'medium').length;
      
      this.updateStatusBar('active', 
        `${framework} scan complete: ${filesScanned} files, ${highRisk} high risk, ${mediumRisk} medium risk`
      );

      // Show results
      const message = `${framework.charAt(0).toUpperCase() + framework.slice(1)} Project Scan Complete\n\n` +
                   `Files Scanned: ${filesScanned}\n` +
                   `High Risk: ${highRisk}\n` +
                   `Medium Risk: ${mediumRisk}\n` +
                   `Low Risk: ${results.filter(r => r.riskLevel === 'low').length}`;

      const action = await vscode.window.showInformationMessage(
        message,
        { modal: false },
        'View Details',
        'Dismiss'
      );

      if (action === 'View Details') {
        await this.showReport();
      }

    } catch (error) {
      console.error(`CXG: Failed to scan ${framework} project:`, error);
      this.updateStatusBar('error', `Failed to scan ${framework} project`);
      vscode.window.showErrorMessage(`Failed to scan ${framework} project: ${error}`);
    }
  }

  /**
   * Analyze configuration files (package.json / tsconfig.json)
   */
  public async analyzeConfigFile(configType: 'package.json' | 'tsconfig.json'): Promise<void> {
    console.log(`CXG: Analyzing ${configType}...`);
    
    try {
      // Update status bar
      this.updateStatusBar('scanning', `Analyzing ${configType}...`);

      // Find the config file
      const files = await vscode.workspace.findFiles(`**/${configType}`, '**/node_modules/**', 10);
      
      if (files.length === 0) {
        vscode.window.showWarningMessage(`No ${configType} file found in workspace`);
        return;
      }

      const results: AnalysisResult[] = [];
      
      for (const file of files) {
        try {
          const document = await vscode.workspace.openTextDocument(file);
          const result = await this.analyzeConfigDocument(document, configType);
          results.push(result);
        } catch (error) {
          console.warn(`Failed to analyze ${file.fsPath}:`, error);
        }
      }

      // Show results
      const hasIssues = results.some(r => r.riskLevel === 'high' || r.riskLevel === 'medium');
      
      if (hasIssues) {
        const action = await vscode.window.showWarningMessage(
          `⚠️ Security issues found in ${configType}`,
          { modal: false },
          'View Details',
          'Dismiss'
        );
        
        if (action === 'View Details') {
          // Show the first result with issues
          const issueResult = results.find(r => r.riskLevel === 'high' || r.riskLevel === 'medium');
          if (issueResult) {
            AnalysisResultsView.show(issueResult);
          }
        }
      } else {
        this.updateStatusBar('active', `${configType} analysis complete - no issues found`);
        vscode.window.showInformationMessage(`✅ ${configType} analysis complete - no security issues found`);
      }

    } catch (error) {
      console.error(`CXG: Failed to analyze ${configType}:`, error);
      this.updateStatusBar('error', `Failed to analyze ${configType}`);
      vscode.window.showErrorMessage(`Failed to analyze ${configType}: ${error}`);
    }
  }

  /**
   * Sanitize selected code and copy to clipboard
   */
  public async sanitizeAndCopyToClipboard(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText || selectedText.trim().length === 0) {
      vscode.window.showWarningMessage('No text selected');
      return;
    }

    try {
      console.log('🛡️ CXG: Sanitizing selected code...');
      this.updateStatusBar('scanning', 'Sanitizing code...');

      // Analyze the selected code first
      const language = editor.document.languageId;
      const analysisResult = await this.analysisEngine.analyzeCode(selectedText, language, 'selection');

      let sanitizedCode = selectedText;

      // If high risk, attempt sanitization
      if (analysisResult.riskLevel === 'high') {
        if (this.analysisEngine.isServerAvailable()) {
          // Try server sanitization
          try {
            const response = await fetch('http://localhost:8080/api/v1/sanitize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                code: selectedText, 
                language: language 
              })
            });

            if (response.ok) {
              const data = await response.json();
              sanitizedCode = (data as { sanitized?: string }).sanitized || selectedText;
            }
          } catch (serverError) {
            console.warn('Server sanitization failed, using local patterns:', serverError);
            sanitizedCode = this.applyLocalSanitization(selectedText);
          }
        } else {
          // Local sanitization fallback
          sanitizedCode = this.applyLocalSanitization(selectedText);
        }
      }

      // Copy to clipboard
      await vscode.env.clipboard.writeText(sanitizedCode);

      // Show result
      const wasModified = selectedText !== sanitizedCode;
      const message = wasModified 
        ? `🛡️ Code sanitized and copied to clipboard (${analysisResult.riskLevel} risk detected)`
        : `📋 Code copied to clipboard (${analysisResult.riskLevel} risk - no sanitization needed)`;

      this.updateStatusBar('active', 'Code sanitized and copied');
      vscode.window.showInformationMessage(message);

      // Optionally show what was changed
      if (wasModified) {
        const action = await vscode.window.showInformationMessage(
          'Code was modified during sanitization',
          'Show Changes',
          'Dismiss'
        );

        if (action === 'Show Changes') {
          // Create a diff view
          const originalDoc = await vscode.workspace.openTextDocument({
            content: selectedText,
            language: language
          });
          
          const sanitizedDoc = await vscode.workspace.openTextDocument({
            content: sanitizedCode,
            language: language
          });

          await vscode.commands.executeCommand('vscode.diff', 
            originalDoc.uri, 
            sanitizedDoc.uri, 
            'Original ↔ Sanitized'
          );
        }
      }

    } catch (error) {
      console.error('CXG: Failed to sanitize and copy code:', error);
      this.updateStatusBar('error', 'Failed to sanitize code');
      vscode.window.showErrorMessage(`Failed to sanitize code: ${error}`);
    }
  }

  /**
   * Get file patterns for specific frameworks
   */
  private getFrameworkFilePatterns(framework: string): string[] {
    const patterns: Record<string, string[]> = {
      'react': [
        '**/*.jsx',
        '**/*.tsx',
        '**/src/**/*.js',
        '**/src/**/*.ts',
        '**/components/**/*.js',
        '**/components/**/*.ts'
      ],
      'node': [
        '**/server.js',
        '**/app.js',
        '**/index.js',
        '**/routes/**/*.js',
        '**/controllers/**/*.js',
        '**/middleware/**/*.js',
        '**/*.ts'
      ],
      'vue': [
        '**/*.vue',
        '**/src/**/*.js',
        '**/src/**/*.ts'
      ],
      'angular': [
        '**/*.component.ts',
        '**/*.service.ts',
        '**/*.module.ts',
        '**/src/**/*.ts'
      ]
    };

    return patterns[framework] || ['**/*.js', '**/*.ts'];
  }

  /**
   * Analyze configuration documents with specialized logic
   */
  private async analyzeConfigDocument(document: vscode.TextDocument, configType: string): Promise<AnalysisResult> {
    const content = document.getText();
    const fileName = path.basename(document.fileName);

    console.log(`CXG: Analyzing config file ${fileName} (${configType})`);

    // Special handling for different config types
    switch (configType) {
      case 'package.json':
        return this.analyzePackageJson(content, fileName);
      case '.env':
        return this.analyzeEnvFile(content, fileName);
      default:
        // Use regular analysis for other files
        return this.analysisEngine.analyzeCode(content, 'json', fileName);
    }
  }

  /**
   * Specialized package.json analysis
   */
  private async analyzePackageJson(content: string, fileName: string): Promise<AnalysisResult> {
    try {
      const packageData = JSON.parse(content);
      const patterns: string[] = [];
      const matches: any[] = [];
      
      // Check scripts for potential security issues
      if (packageData.scripts) {
        Object.entries(packageData.scripts).forEach(([scriptName, scriptValue]: [string, any]) => {
          if (typeof scriptValue === 'string') {
            // Check for suspicious script patterns
            if (this.containsSuspiciousScript(scriptValue)) {
              patterns.push('suspicious_script');
              matches.push({
                pattern: 'suspicious_script',
                line: 1,
                column: 1,
                text: `${scriptName}: ${scriptValue}`,
                severity: 'medium'
              });
            }
          }
        });
      }

      // Check dependencies for known vulnerable packages
      const deps = { ...packageData.dependencies, ...packageData.devDependencies };
      if (deps) {
        Object.keys(deps).forEach(depName => {
          if (this.isKnownVulnerablePackage(depName)) {
            patterns.push('vulnerable_dependency');
            matches.push({
              pattern: 'vulnerable_dependency',
              line: 1,
              column: 1,
              text: `${depName}: ${deps[depName]}`,
              severity: 'high'
            });
          }
        });
      }

      const riskLevel = patterns.some(p => p === 'vulnerable_dependency') ? 'high' :
                       patterns.length > 0 ? 'medium' : 'low';

      const suggestions = this.generateConfigSuggestions(patterns, 'package.json');

      return {
        hasSecrets: false,
        hasBusinessLogic: false,
        hasInfrastructureExposure: false,
        detectedPatterns: patterns,
        riskLevel,
        suggestions,
        timestamp: new Date(),
        fileName,
        matches
      };

    } catch (error) {
      // If JSON parsing fails, fall back to regular analysis
      return this.analysisEngine.analyzeCode(content, 'json', fileName);
    }
  }

  /**
   * Specialized .env file analysis
   */
  private async analyzeEnvFile(content: string, fileName: string): Promise<AnalysisResult> {
    const lines = content.split('\n');
    const patterns: string[] = [];
    const matches: any[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        // Check for potential secrets in environment variables
        if (this.containsEnvSecret(trimmed)) {
          patterns.push('env_secret');
          matches.push({
            pattern: 'env_secret',
            line: index + 1,
            column: 1,
            text: trimmed,
            severity: 'high'
          });
        }
      }
    });

    const riskLevel = patterns.length > 0 ? 'high' : 'low';
    const suggestions = this.generateConfigSuggestions(patterns, '.env');

    return {
      hasSecrets: patterns.includes('env_secret'),
      hasBusinessLogic: false,
      hasInfrastructureExposure: false,
      detectedPatterns: patterns,
      riskLevel,
      suggestions,
      timestamp: new Date(),
      fileName,
      matches
    };
  }

  /**
   * Apply local sanitization patterns
   */
  private applyLocalSanitization(code: string): string {
    let sanitized = code;

    // Basic sanitization patterns
    sanitized = sanitized.replace(/(['"`])sk-[a-zA-Z0-9]{48}\1/g, '$1[REDACTED_API_KEY]$1');
    sanitized = sanitized.replace(/(['"`])ghp_[a-zA-Z0-9]{36}\1/g, '$1[REDACTED_GITHUB_TOKEN]$1');
    sanitized = sanitized.replace(/(['"`])AKIA[0-9A-Z]{16}\1/g, '$1[REDACTED_AWS_KEY]$1');
    sanitized = sanitized.replace(/(password\s*[:=]\s*)(['"`])[^'"`]+\2/gi, '$1$2[REDACTED_PASSWORD]$2');
    sanitized = sanitized.replace(/(api[_-]?key\s*[:=]\s*)(['"`])[^'"`]+\2/gi, '$1$2[REDACTED_API_KEY]$2');

    return sanitized;
  }

  /**
   * Helper methods for config analysis
   */
  private containsSuspiciousScript(script: string): boolean {
    const suspiciousPatterns = [
      /curl.*\|.*sh/gi,
      /wget.*\|.*sh/gi,
      /rm\s+-rf/gi,
      /eval\s*\(/gi,
      /exec\s*\(/gi
    ];

    return suspiciousPatterns.some(pattern => pattern.test(script));
  }

  private isKnownVulnerablePackage(packageName: string): boolean {
    // Simple check for commonly known vulnerable packages
    const vulnerablePackages = [
      'event-stream',
      'flatmap-stream', 
      'eslint-scope',
      'getcookies'
    ];

    return vulnerablePackages.includes(packageName);
  }

  private containsEnvSecret(line: string): boolean {
    const secretPatterns = [
      /.*(?:key|secret|token|password)\s*=\s*.+/gi,
      /.*API.*=\s*.+/gi,
      /.*SECRET.*=\s*.+/gi,
      /.*TOKEN.*=\s*.+/gi
    ];

    return secretPatterns.some(pattern => pattern.test(line));
  }

  private generateConfigSuggestions(patterns: string[], configType: string): string[] {
    const suggestions: string[] = [];

    if (patterns.includes('env_secret')) {
      suggestions.push('Ensure .env files are never committed to version control');
      suggestions.push('Use a template .env.example file instead');
    }

    if (patterns.includes('vulnerable_dependency')) {
      suggestions.push('Update vulnerable dependencies to secure versions');
      suggestions.push('Run npm audit or yarn audit to check for vulnerabilities');
    }

    if (patterns.includes('suspicious_script')) {
      suggestions.push('Review npm scripts for potentially dangerous commands');
      suggestions.push('Avoid running remote scripts directly in npm scripts');
    }

    if (suggestions.length === 0) {
      suggestions.push(`${configType} appears safe`);
    }

    return suggestions;
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
  }
}
