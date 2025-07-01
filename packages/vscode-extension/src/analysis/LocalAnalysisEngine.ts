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

export class LocalAnalysisEngine {
    private context: vscode.ExtensionContext;
    private dbPath: string;
    private recentScans: AnalysisResult[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.dbPath = path.join(context.globalStorageUri.fsPath, 'cxg.db');
        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        // Create storage directory if it doesn't exist
        const storageDir = path.dirname(this.dbPath);
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        
        // Initialize SQLite database (placeholder for now)
        console.log(`CXG Database initialized at: ${this.dbPath}`);
        
        // Load recent scans from storage if available
        this.loadRecentScans();
    }

    private loadRecentScans(): void {
        const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
        try {
            if (fs.existsSync(scansPath)) {
                const data = fs.readFileSync(scansPath, 'utf8');
                this.recentScans = JSON.parse(data).map((scan: any) => ({
                    ...scan,
                    timestamp: new Date(scan.timestamp)
                }));
            }
        } catch (error) {
            console.log('Could not load recent scans:', error);
            this.recentScans = [];
        }
    }

    private saveRecentScans(): void {
        const scansPath = path.join(path.dirname(this.dbPath), 'recent-scans.json');
        try {
            // Keep only last 50 scans
            const recentScans = this.recentScans.slice(-50);
            fs.writeFileSync(scansPath, JSON.stringify(recentScans, null, 2));
        } catch (error) {
            console.log('Could not save recent scans:', error);
        }
    }

    public async analyzeCode(code: string, language: string, fileName?: string): Promise<AnalysisResult> {
        console.log(`CXG: Analyzing ${fileName || 'unknown file'} (${language})`);
        
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

        console.log(`CXG: Analysis complete. Risk level: ${result.riskLevel}, Patterns: ${patterns.join(', ')}`);
        
        return result;
    }

    private detectBasicPatterns(code: string): string[] {
        const patterns: string[] = [];
        
        // Enhanced secret detection patterns
        const secretPatterns = [
            { regex: /api[_-]?key[_-]?[:=]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi, name: 'potential_secret' },
            { regex: /password[_-]?[:=]\s*["']?[^"'\s]{6,}["']?/gi, name: 'potential_secret' },
            { regex: /secret[_-]?[:=]\s*["']?[^"'\s]{8,}["']?/gi, name: 'potential_secret' },
            { regex: /token[_-]?[:=]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi, name: 'potential_secret' },
            { regex: /private[_-]?key/gi, name: 'potential_secret' },
            { regex: /sk-[a-zA-Z0-9]{20,}/gi, name: 'potential_secret' },
            { regex: /ghp_[a-zA-Z0-9]{36}/gi, name: 'potential_secret' }
        ];

        secretPatterns.forEach(({ regex, name }) => {
            if (regex.test(code)) {
                patterns.push(name);
            }
        });

        // Enhanced business logic detection
        const businessKeywords = [
            'calculatePrice', 'algorithm', 'proprietary', 'secret sauce',
            'business logic', 'competitive advantage', 'trade secret'
        ];
        
        businessKeywords.forEach(keyword => {
            if (code.toLowerCase().includes(keyword.toLowerCase())) {
                patterns.push('business_logic');
            }
        });

        // Enhanced infrastructure detection
        const infraPatterns = [
            /localhost/gi,
            /127\.0\.0\.1/gi,
            /192\.168\./gi,
            /10\.\d+\.\d+\.\d+/gi,
            /internal[._-]/gi,
            /:\/\/[^\/]*internal/gi
        ];

        infraPatterns.forEach(pattern => {
            if (pattern.test(code)) {
                patterns.push('infrastructure');
            }
        });

        return [...new Set(patterns)]; // Remove duplicates
    }

    private findMatches(code: string, patterns: string[]): Match[] {
        const matches: Match[] = [];
        const lines = code.split('\n');

        lines.forEach((line, lineIndex) => {
            patterns.forEach(pattern => {
                let severity: 'high' | 'medium' | 'low' = 'low';
                let regex: RegExp;

                switch (pattern) {
                    case 'potential_secret':
                        severity = 'high';
                        regex = /(?:api[_-]?key|password|secret|token|private[_-]?key)[:=]/gi;
                        break;
                    case 'business_logic':
                        severity = 'medium';
                        regex = /(?:calculatePrice|algorithm|proprietary)/gi;
                        break;
                    case 'infrastructure':
                        severity = 'medium';
                        regex = /(?:localhost|127\.0\.0\.1|internal)/gi;
                        break;
                    default:
                        return;
                }

                const match = regex.exec(line);
                if (match) {
                    matches.push({
                        pattern,
                        line: lineIndex + 1,
                        column: match.index + 1,
                        text: match[0],
                        severity
                    });
                }
            });
        });

        return matches;
    }

    private calculateRiskLevel(patterns: string[]): 'low' | 'medium' | 'high' {
        if (patterns.includes('potential_secret')) {
            return 'high';
        }
        if (patterns.includes('business_logic') || patterns.includes('infrastructure')) {
            return 'medium';
        }
        return 'low';
    }

    private generateSuggestions(patterns: string[]): string[] {
        const suggestions: string[] = [];
        
        if (patterns.includes('potential_secret')) {
            suggestions.push('Consider using environment variables for sensitive data');
            suggestions.push('Use a secrets management system like Azure Key Vault or AWS Secrets Manager');
            suggestions.push('Review your .gitignore to ensure secrets are not committed');
        }
        
        if (patterns.includes('business_logic')) {
            suggestions.push('Review if this business logic should be shared with AI assistants');
            suggestions.push('Consider abstracting proprietary algorithms');
        }
        
        if (patterns.includes('infrastructure')) {
            suggestions.push('Avoid exposing internal infrastructure details');
            suggestions.push('Use configuration files for environment-specific settings');
        }

        return suggestions;
    }

    public getRecentScans(): AnalysisResult[] {
        return this.recentScans.slice(-10); // Return last 10 scans
    }

    public getSecuritySummary(): { total: number; high: number; medium: number; low: number } {
        const recent = this.recentScans.slice(-20);
        return {
            total: recent.length,
            high: recent.filter(scan => scan.riskLevel === 'high').length,
            medium: recent.filter(scan => scan.riskLevel === 'medium').length,
            low: recent.filter(scan => scan.riskLevel === 'low').length
        };
    }
}