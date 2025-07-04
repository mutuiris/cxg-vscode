import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface AnalysisResult {
    hasSecrets: boolean;
    hasBusinessLogic: boolean;
    hasInfrastructureExposure: boolean;
    detectedPatterns: string[];
    riskLevel: 'low' | 'medium' | 'high';
    suggestions: string[];
    timestamp: Date;
    fileName: string;
    matches: Match[];
}

export interface Match {
    pattern: string;
    line: number;
    column: number;
    text: string;
    severity: 'high' | 'medium' | 'low';
}

/**
 * Server response type definitions for type safety
 */
interface ServerAnalysisResponse {
    success: boolean;
    result?: ServerDetectionResult;
    error?: string;
    timestamp: string;
    fileName?: string;
}

interface ServerDetectionResult {
    secrets: ServerSecretMatch[];
    businessLogic: ServerBusinessLogicMatch[];
    infrastructure: ServerInfrastructureMatch[];
    riskLevel: number;
}

interface ServerSecretMatch {
    type: string;
    value: string;
    line: number;
    column: number;
    confidence: number;
}

interface ServerBusinessLogicMatch {
    type: string;
    description: string;
    confidence: number;
}

interface ServerInfrastructureMatch {
    type: string;
    value: string;
    line: number;
    column: number;
    confidence: number;
}

/**
 * LocalAnalysisEngine handles code analysis both locally and via server
 * Provides fallback capability when server is unavailable
 */
export class LocalAnalysisEngine {
    private context: vscode.ExtensionContext;
    private dbPath: string;
    private recentScans: AnalysisResult[] = [];
    private readonly serverUrl = 'http://localhost:8080/api/v1';
    private serverAvailable: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.dbPath = path.join(context.globalStorageUri.fsPath, 'cxg-analysis.db');
        this.initializeDatabase();
        this.loadRecentScans();
        this.checkServerAvailability();
        
        console.log('CXG LocalAnalysisEngine initialized');
    }

    /**
     * Check if the backend server is available
     */
    private async checkServerAvailability(): Promise<void> {
        try {
            const response = await fetch(`${this.serverUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            this.serverAvailable = response.ok;
            console.log(`CXG Server availability: ${this.serverAvailable}`);
        } catch (error) {
            this.serverAvailable = false;
            console.log('CXG Server not available, using local analysis only');
        }
    }

    /**
     * Initialize local database for storing scan results
     */
    private initializeDatabase(): void {
        try {
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            console.log(`CXG Database initialized at: ${this.dbPath}`);
        } catch (error) {
            console.error('Failed to initialize CXG database:', error);
        }
    }

    /**
     * Load recent scan results from local storage
     */
    private loadRecentScans(): void {
        const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
        try {
            if (fs.existsSync(scansPath)) {
                const data = fs.readFileSync(scansPath, 'utf8');
                this.recentScans = JSON.parse(data).map((scan: any) => ({
                    ...scan,
                    timestamp: new Date(scan.timestamp)
                }));
                console.log(`Loaded ${this.recentScans.length} recent scans`);
            }
        } catch (error) {
            console.log('Could not load recent scans:', error);
            this.recentScans = [];
        }
    }

    /**
     * Save recent scan results to local storage
     */
    private saveRecentScans(): void {
        const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
        try {
            // Keep only last 50 scans to manage storage
            const recentScans = this.recentScans.slice(-50);
            fs.writeFileSync(scansPath, JSON.stringify(recentScans, null, 2));
        } catch (error) {
            console.log('Could not save recent scans:', error);
        }
    }

    /**
     * Analyze code using server if available, fallback to local analysis
     */
    public async analyzeCode(code: string, language: string, fileName?: string): Promise<AnalysisResult> {
        console.log(`CXG: Analyzing ${fileName || 'unknown file'} (${language})`);
        
        // Try server analysis first if available
        if (this.serverAvailable) {
            try {
                const result = await this.analyzeWithServer(code, language, fileName);
                console.log(`CXG: Server analysis complete for ${fileName}`);
                return result;
            } catch (error) {
                console.warn(`CXG: Server analysis failed, falling back to local: ${error}`);
                this.serverAvailable = false; // Mark server as unavailable
            }
        }

        // Fallback to local analysis
        return this.analyzeLocally(code, language, fileName);
    }

    /**
     * Analyze code using the backend server
     */
    private async analyzeWithServer(code: string, language: string, fileName?: string): Promise<AnalysisResult> {
        const response = await fetch(`${this.serverUrl}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code,
                language,
                fileName: fileName || 'unknown'
            }),
        });

        if (!response.ok) {
            throw new Error(`Server analysis failed: ${response.statusText}`);
        }

        const serverResult = await response.json() as ServerAnalysisResponse;
        
        if (!serverResult.success) {
            throw new Error(serverResult.error || 'Server analysis failed');
        }

        const result = this.convertServerResult(serverResult, fileName || 'unknown');
        
        // Store the scan result
        this.recentScans.push(result);
        this.saveRecentScans();
        
        return result;
    }

    /**
     * Convert server response to local AnalysisResult format
     */
    private convertServerResult(serverResult: ServerAnalysisResponse, fileName: string): AnalysisResult {
        const patterns: string[] = [];
        const matches: Match[] = [];

        if (!serverResult.result) {
            throw new Error('Invalid server response: missing result');
        }

        const result = serverResult.result;
        
        // Convert server response to local format
        if (result.secrets && result.secrets.length > 0) {
            patterns.push('potential_secret');
            result.secrets.forEach((secret: ServerSecretMatch) => {
                matches.push({
                    pattern: 'potential_secret',
                    line: secret.line,
                    column: secret.column,
                    text: secret.value,
                    severity: 'high'
                });
            });
        }
        
        if (result.businessLogic && result.businessLogic.length > 0) {
            patterns.push('business_logic');
            result.businessLogic.forEach((bl: ServerBusinessLogicMatch) => {
                matches.push({
                    pattern: 'business_logic',
                    line: 1,
                    column: 1,
                    text: bl.description,
                    severity: 'medium'
                });
            });
        }
        
        if (result.infrastructure && result.infrastructure.length > 0) {
            patterns.push('infrastructure');
            result.infrastructure.forEach((infra: ServerInfrastructureMatch) => {
                matches.push({
                    pattern: 'infrastructure',
                    line: infra.line,
                    column: infra.column,
                    text: infra.value,
                    severity: 'medium'
                });
            });
        }

        return {
            hasSecrets: result.secrets?.length > 0 || false,
            hasBusinessLogic: result.businessLogic?.length > 0 || false,
            hasInfrastructureExposure: result.infrastructure?.length > 0 || false,
            detectedPatterns: patterns,
            riskLevel: this.convertRiskLevel(result.riskLevel),
            suggestions: this.generateSuggestions(patterns),
            timestamp: new Date(),
            fileName,
            matches
        };
    }

    /**
     * Analyze code using local patterns; fallback
     */
    private async analyzeLocally(code: string, language: string, fileName?: string): Promise<AnalysisResult> {
        const patterns = this.detectBasicPatterns(code);
        const matches = this.findMatches(code, patterns);
        
        const result: AnalysisResult = {
            hasSecrets: patterns.includes('potential_secret'),
            hasBusinessLogic: patterns.includes('business_logic'),
            hasInfrastructureExposure: patterns.includes('infrastructure'),
            detectedPatterns: patterns,
            riskLevel: this.calculateRiskLevel(patterns),
            suggestions: this.generateSuggestions(patterns),
            timestamp: new Date(),
            fileName: fileName || 'Unknown',
            matches: matches
        };

        // Store the scan result
        this.recentScans.push(result);
        this.saveRecentScans();

        console.log(`CXG: Local analysis complete. Risk level: ${result.riskLevel}, Patterns: ${patterns.join(', ')}`);
        
        return result;
    }

    /**
     * Detect basic patterns in code; local fallback implementation
     */
    private detectBasicPatterns(code: string): string[] {
        const patterns: string[] = [];
        const lowerCode = code.toLowerCase();

        // Secret detection patterns
        const secretPatterns = [
            /api[_-]?key[_\s]*[:=][_\s]*["']?[a-zA-Z0-9_\-\.]{15,}["']?/gi,
            /password[_\s]*[:=][_\s]*["']?[^"'\s\n]{6,}["']?/gi,
            /token[_\s]*[:=][_\s]*["']?[a-zA-Z0-9_\-\.]{20,}["']?/gi,
            /sk-[a-zA-Z0-9]{48}/g,
            /ghp_[a-zA-Z0-9]{36}/g,
            /AKIA[0-9A-Z]{16}/g,
            /-----BEGIN[\s\S]*?PRIVATE[\s\S]*?KEY-----/g
        ];

        for (const pattern of secretPatterns) {
            if (pattern.test(code)) {
                patterns.push('potential_secret');
                break;
            }
        }

        // Some Business logic patterns
        const businessLogicKeywords = [
            'calculateprice', 'pricingalgorithm', 'authenticate', 'authorization',
            'loginlogic', 'businessrule', 'algorithm', 'proprietary'
        ];

        for (const keyword of businessLogicKeywords) {
            if (lowerCode.includes(keyword)) {
                patterns.push('business_logic');
                break;
            }
        }

        // Infrastructure patterns
        const infrastructurePatterns = [
            /localhost:\d+/g,
            /127\.0\.0\.1:\d+/g,
            /192\.168\.\d+\.\d+/g,
            /10\.\d+\.\d+\.\d+/g,
            /internal[._-]/gi
        ];

        for (const pattern of infrastructurePatterns) {
            if (pattern.test(code)) {
                patterns.push('infrastructure');
                break;
            }
        }

        return patterns;
    }

    /**
     * Find specific matches in code for detected patterns
     */
    private findMatches(code: string, patterns: string[]): Match[] {
        const matches: Match[] = [];
        const lines = code.split('\n');

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            if (patterns.includes('potential_secret')) {
                // Check for secrets in this line
                const secretRegex = /(?:api[_-]?key|password|token|secret)[_\s]*[:=][_\s]*["']?[^"'\s\n]{6,}["']?/gi;
                let match;
                while ((match = secretRegex.exec(line)) !== null) {
                    matches.push({
                        pattern: 'potential_secret',
                        line: lineIndex + 1,
                        column: match.index + 1,
                        text: match[0],
                        severity: 'high'
                    });
                }
            }

            if (patterns.includes('infrastructure')) {
                // Check for infrastructure exposure
                const infraRegex = /(?:localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+/g;
                let match;
                while ((match = infraRegex.exec(line)) !== null) {
                    matches.push({
                        pattern: 'infrastructure',
                        line: lineIndex + 1,
                        column: match.index + 1,
                        text: match[0],
                        severity: 'medium'
                    });
                }
            }
        }

        return matches;
    }

    /**
     * Calculate risk level based on detected patterns
     */
    private calculateRiskLevel(patterns: string[]): 'low' | 'medium' | 'high' {
        if (patterns.includes('potential_secret')) {
            return 'high';
        }
        if (patterns.includes('business_logic') && patterns.includes('infrastructure')) {
            return 'medium';
        }
        if (patterns.length > 0) {
            return 'low';
        }
        return 'low';
    }

    /**
     * Generate suggestions based on detected patterns
     */
    private generateSuggestions(patterns: string[]): string[] {
        const suggestions: string[] = [];
        
        if (patterns.includes('potential_secret')) {
            suggestions.push('Consider using environment variables for sensitive data');
            suggestions.push('Remove hardcoded secrets from your code');
        }
        
        if (patterns.includes('business_logic')) {
            suggestions.push('Review if this business logic should be shared with AI assistants');
            suggestions.push('Consider if this contains proprietary algorithms');
        }
        
        if (patterns.includes('infrastructure')) {
            suggestions.push('Avoid exposing internal infrastructure details');
            suggestions.push('Use configuration files instead of hardcoded endpoints');
        }

        if (suggestions.length === 0) {
            suggestions.push('Code appears safe to share with AI assistants');
        }

        return suggestions;
    }

    /**
     * Convert server risk level to local format
     */
    private convertRiskLevel(level: number): 'low' | 'medium' | 'high' {
        switch (level) {
            case 0: return 'low';
            case 1: return 'medium';
            case 2: 
            case 3: return 'high';
            default: return 'medium';
        }
    }

    /**
     * Get recent scan results
     */
    public getRecentScans(): AnalysisResult[] {
        return this.recentScans.slice(-10); // Return last 10 scans
    }

    /**
     * Get security summary statistics
     */
    public getSecuritySummary(): { total: number; high: number; medium: number; low: number } {
        const recent = this.recentScans.slice(-20);
        return {
            total: recent.length,
            high: recent.filter(scan => scan.riskLevel === 'high').length,
            medium: recent.filter(scan => scan.riskLevel === 'medium').length,
            low: recent.filter(scan => scan.riskLevel === 'low').length
        };
    }

    /**
     * Get server availability status
     */
    public isServerAvailable(): boolean {
        return this.serverAvailable;
    }

    /**
     * Manually refresh server availability
     */
    public async refreshServerAvailability(): Promise<void> {
        await this.checkServerAvailability();
    }
}