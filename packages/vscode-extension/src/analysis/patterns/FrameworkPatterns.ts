/**
 * Framework Detection Patterns
 * Comprehensive patterns for detecting JavaScript/TypeScript frameworks
 */

export interface FrameworkPattern {
  imports: string[];
  patterns: string[];
  files: string[];
  dependencies: string[];
  confidence: number;
  description: string;
  version?: {
    patterns: RegExp[];
    extraction: RegExp;
  };
}

export interface FrameworkDetectionResult {
  framework: string;
  confidence: number;
  indicators: string[];
  version?: string;
  securityConsiderations: string[];
  recommendations: string[];
}

/**
 * Comprehensive framework detection patterns
 * Enhanced for JavaScript/TypeScript ecosystem
 */
export const FRAMEWORK_PATTERNS: Record<string, FrameworkPattern> = {
  react: {
    imports: [
      'react',
      '@react',
      'react-dom',
      'react-router',
      'react-router-dom',
      'react-redux',
      '@reduxjs/toolkit',
      'react-query',
      '@tanstack/react-query',
    ],
    patterns: [
      'useState',
      'useEffect',
      'useContext',
      'useReducer',
      'useMemo',
      'useCallback',
      'jsx',
      'tsx',
      'Component',
      'PureComponent',
      'createElement',
      'Fragment',
      'ReactDOM',
      'render',
      'createRoot',
      'StrictMode',
      'Suspense',
    ],
    files: [
      '.jsx',
      '.tsx',
      'App.jsx',
      'App.tsx',
      'index.jsx',
      'index.tsx',
      'components/',
      'hooks/',
      'contexts/',
    ],
    dependencies: ['react', 'react-dom', 'react-scripts', '@types/react', '@types/react-dom'],
    confidence: 0.9,
    description: 'React.js library for building user interfaces',
    version: {
      patterns: [/react@(\d+\.\d+\.\d+)/g, /"react":\s*"([^"]+)"/g],
      extraction: /(\d+\.\d+\.\d+)/,
    },
  },

  vue: {
    imports: ['vue', '@vue', 'vue-router', 'vuex', 'pinia', '@vue/composition-api'],
    patterns: [
      'Vue',
      'createApp',
      'defineComponent',
      'ref',
      'reactive',
      'computed',
      'watch',
      'watchEffect',
      'onMounted',
      'onUpdated',
      'setup',
      'provide',
      'inject',
      'nextTick',
      'createRouter',
      'useRouter',
      'useRoute',
    ],
    files: ['.vue', 'main.js', 'main.ts', 'App.vue', 'router/', 'store/', 'views/'],
    dependencies: ['vue', 'vue-router', 'vuex', 'pinia', '@vue/cli-service'],
    confidence: 0.9,
    description: 'Vue.js progressive framework for building user interfaces',
    version: {
      patterns: [/vue@(\d+\.\d+\.\d+)/g, /"vue":\s*"([^"]+)"/g],
      extraction: /(\d+\.\d+\.\d+)/,
    },
  },

  angular: {
    imports: [
      '@angular',
      '@angular/core',
      '@angular/common',
      '@angular/forms',
      '@angular/router',
      '@angular/http',
      '@angular/platform-browser',
    ],
    patterns: [
      '@Component',
      '@Injectable',
      '@Module',
      '@Directive',
      '@Pipe',
      'NgModule',
      'OnInit',
      'OnDestroy',
      'ViewChild',
      'Input',
      'Output',
      'EventEmitter',
      'Observable',
      'Subject',
      'BehaviorSubject',
    ],
    files: [
      '.component.ts',
      '.service.ts',
      '.module.ts',
      '.directive.ts',
      '.pipe.ts',
      'app.module.ts',
      'main.ts',
      'angular.json',
    ],
    dependencies: ['@angular/core', '@angular/cli', '@angular/common', 'typescript', 'rxjs'],
    confidence: 0.95,
    description: 'Angular platform for building mobile and desktop web applications',
    version: {
      patterns: [/@angular\/core@(\d+\.\d+\.\d+)/g, /"@angular\/core":\s*"([^"]+)"/g],
      extraction: /(\d+\.\d+\.\d+)/,
    },
  },

  node: {
    imports: [
      'express',
      'http',
      'https',
      'fs',
      'path',
      'util',
      'os',
      'crypto',
      'events',
      'stream',
      'buffer',
      'url',
      'querystring',
      'zlib',
    ],
    patterns: [
      'require(',
      'module.exports',
      'exports.',
      'process.env',
      '__dirname',
      '__filename',
      'Buffer',
      'global',
      'setImmediate',
      'clearImmediate',
      'server.listen',
      'app.listen',
      'createServer',
    ],
    files: [
      'server.js',
      'app.js',
      'index.js',
      'package.json',
      'node_modules/',
      'routes/',
      'controllers/',
      'middleware/',
      'models/',
    ],
    dependencies: ['express', 'nodemon', 'cors', 'body-parser', 'helmet', 'morgan'],
    confidence: 0.8,
    description: 'Node.js runtime for server-side JavaScript',
    version: {
      patterns: [/node@(\d+\.\d+\.\d+)/g, /"node":\s*"([^"]+)"/g],
      extraction: /(\d+\.\d+\.\d+)/,
    },
  },

  express: {
    imports: ['express', 'express-session', 'express-validator', 'express-rate-limit'],
    patterns: [
      'express()',
      'app.get',
      'app.post',
      'app.put',
      'app.delete',
      'app.use',
      'req.params',
      'req.query',
      'req.body',
      'res.json',
      'res.send',
      'res.status',
      'next()',
      'middleware',
      'router',
    ],
    files: ['app.js', 'server.js', 'routes/', 'middleware/', 'controllers/'],
    dependencies: ['express', 'body-parser', 'cors', 'helmet', 'compression'],
    confidence: 0.85,
    description: 'Express.js web application framework for Node.js',
    version: {
      patterns: [/express@(\d+\.\d+\.\d+)/g, /"express":\s*"([^"]+)"/g],
      extraction: /(\d+\.\d+\.\d+)/,
    },
  },

  nextjs: {
    imports: [
      'next',
      'next/',
      'next/app',
      'next/document',
      'next/head',
      'next/image',
      'next/link',
      'next/router',
      'next/dynamic',
    ],
    patterns: [
      'getServerSideProps',
      'getStaticProps',
      'getStaticPaths',
      'useRouter',
      'Head',
      'Image',
      'Link',
      'dynamic',
      'App',
      'Document',
      '_app',
      '_document',
    ],
    files: [
      'pages/',
      '_app.js',
      '_app.tsx',
      '_document.js',
      '_document.tsx',
      'next.config.js',
      'public/',
      'styles/',
      'api/',
    ],
    dependencies: ['next', 'react', 'react-dom'],
    confidence: 0.9,
    description: 'Next.js React framework for production',
    version: {
      patterns: [/next@(\d+\.\d+\.\d+)/g, /"next":\s*"([^"]+)"/g],
      extraction: /(\d+\.\d+\.\d+)/,
    },
  },

  nuxt: {
    imports: ['nuxt', '@nuxt', 'nuxt3', '@nuxt/kit'],
    patterns: [
      'defineNuxtConfig',
      'useNuxtApp',
      'navigateTo',
      'useFetch',
      'useAsyncData',
      'useState',
      'useCookie',
      'useHead',
      'NuxtLayout',
      'NuxtPage',
    ],
    files: [
      'nuxt.config.js',
      'nuxt.config.ts',
      'pages/',
      'layouts/',
      'components/',
      'plugins/',
      'middleware/',
      'server/',
      'assets/',
      'static/',
    ],
    dependencies: ['nuxt', '@nuxt/kit', 'vue'],
    confidence: 0.9,
    description: 'Nuxt.js Vue.js framework for universal applications',
    version: {
      patterns: [/nuxt@(\d+\.\d+\.\d+)/g, /"nuxt":\s*"([^"]+)"/g],
      extraction: /(\d+\.\d+\.\d+)/,
    },
  },

  svelte: {
    imports: ['svelte', 'svelte/', '@sveltejs/kit'],
    patterns: [
      'onMount',
      'onDestroy',
      'beforeUpdate',
      'afterUpdate',
      'tick',
      'createEventDispatcher',
      'getContext',
      'setContext',
      '$:',
      'bind:',
    ],
    files: ['.svelte', 'svelte.config.js', 'app.html', 'routes/', 'lib/'],
    dependencies: ['svelte', '@sveltejs/kit', '@sveltejs/adapter-auto'],
    confidence: 0.9,
    description: 'Svelte framework for building user interfaces',
    version: {
      patterns: [/svelte@(\d+\.\d+\.\d+)/g, /"svelte":\s*"([^"]+)"/g],
      extraction: /(\d+\.\d+\.\d+)/,
    },
  },
};

/**
 * Framework detection engine with enhanced analysis
 */
export class FrameworkPatternMatcher {
  /**
   * Detect frameworks in code with confidence scoring
   */
  public static detectFrameworks(
    code: string,
    fileName?: string,
    dependencies?: string[],
    imports?: string[]
  ): FrameworkDetectionResult[] {
    const results: FrameworkDetectionResult[] = [];
    const lowerCode = code.toLowerCase();

    Object.entries(FRAMEWORK_PATTERNS).forEach(([framework, pattern]) => {
      const indicators: string[] = [];
      let confidence = 0;

      // Check imports in code
      if (imports && imports.length > 0) {
        const importMatches = imports.filter((imp) =>
          pattern.imports.some((patternImport) => imp.includes(patternImport))
        );
        if (importMatches.length > 0) {
          confidence += 0.4;
          indicators.push(`Imports: ${importMatches.join(', ')}`);
        }
      }

      // Check code patterns
      const codePatternMatches = pattern.patterns.filter((p) =>
        lowerCode.includes(p.toLowerCase())
      );
      if (codePatternMatches.length > 0) {
        confidence += (codePatternMatches.length / pattern.patterns.length) * 0.3;
        indicators.push(`Code patterns: ${codePatternMatches.join(', ')}`);
      }

      // Check file patterns
      if (fileName) {
        const fileMatches = pattern.files.filter((filePattern) => fileName.includes(filePattern));
        if (fileMatches.length > 0) {
          confidence += 0.2;
          indicators.push(`File patterns: ${fileMatches.join(', ')}`);
        }
      }

      // Check dependencies
      if (dependencies) {
        const depMatches = dependencies.filter((dep) =>
          pattern.dependencies.some((patternDep) => dep.includes(patternDep))
        );
        if (depMatches.length > 0) {
          confidence += 0.1;
          indicators.push(`Dependencies: ${depMatches.join(', ')}`);
        }
      }

      // Apply framework confidence multiplier
      confidence = Math.min(confidence * pattern.confidence, 1.0);

      if (confidence > 0.3 && indicators.length > 0) {
        // Try to extract version
        const version = this.extractVersion(code, pattern.version);

        results.push({
          framework,
          confidence,
          indicators,
          version,
          securityConsiderations: this.getSecurityConsiderations(framework),
          recommendations: this.getFrameworkRecommendations(framework, confidence),
        });
      }
    });

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract version information from code
   */
  private static extractVersion(
    code: string,
    versionConfig?: { patterns: RegExp[]; extraction: RegExp }
  ): string | undefined {
    if (!versionConfig) return undefined;

    for (const pattern of versionConfig.patterns) {
      const match = pattern.exec(code);
      if (match) {
        const versionMatch = versionConfig.extraction.exec(match[1] || match[0]);
        if (versionMatch) {
          return versionMatch[1];
        }
      }
    }

    return undefined;
  }

  /**
   * Get security considerations for a framework
   */
  private static getSecurityConsiderations(framework: string): string[] {
    const considerations: Record<string, string[]> = {
      react: [
        'Avoid exposing sensitive data in component state',
        'Be cautious with dangerouslySetInnerHTML',
        'Sanitize user inputs properly',
        'Use environment variables for configuration',
      ],
      vue: [
        'Sanitize v-html content',
        'Be careful with dynamic component rendering',
        'Validate props and data',
        'Use secure state management',
      ],
      angular: [
        'Sanitize template content',
        'Use proper input validation',
        'Secure HTTP interceptors',
        'Implement proper authentication guards',
      ],
      node: [
        'Validate and sanitize all inputs',
        'Use secure environment variable management',
        'Implement proper error handling',
        'Use security middleware (helmet, etc.)',
      ],
      express: [
        'Implement rate limiting',
        'Use CORS properly',
        'Sanitize request parameters',
        'Implement proper session management',
      ],
      nextjs: [
        'Secure API routes',
        'Be careful with getServerSideProps data',
        'Validate environment variables',
        'Implement proper CSP headers',
      ],
      nuxt: [
        'Secure server-side rendering',
        'Validate asyncData and fetch',
        'Implement proper middleware',
        'Use secure module configuration',
      ],
      svelte: [
        'Sanitize dynamic content',
        'Validate component props',
        'Secure server-side logic',
        'Implement proper state management',
      ],
    };

    return (
      considerations[framework] || [
        'Review framework-specific security best practices',
        'Validate all user inputs',
        'Implement proper error handling',
      ]
    );
  }

  /**
   * Get framework-specific recommendations
   */
  private static getFrameworkRecommendations(framework: string, confidence: number): string[] {
    const recommendations: string[] = [];

    const baseRecommendations: Record<string, string[]> = {
      react: [
        'Review component logic before AI analysis',
        'Check for exposed API keys in environment variables',
        "Ensure state management doesn't contain sensitive data",
      ],
      vue: [
        'Review component composition and data flow',
        'Check for sensitive data in Vuex/Pinia stores',
        'Validate prop types and data structures',
      ],
      angular: [
        'Review service implementations and dependency injection',
        'Check for sensitive data in component properties',
        'Validate HTTP client configurations',
      ],
      node: [
        'Review server configuration and middleware',
        'Check for exposed environment variables',
        'Validate file system operations',
      ],
      express: [
        'Review route handlers and middleware',
        'Check for exposed configuration',
        'Validate request processing logic',
      ],
      nextjs: [
        'Review API route implementations',
        'Check getServerSideProps for data exposure',
        'Validate build-time and runtime configuration',
      ],
      nuxt: [
        'Review server-side rendering logic',
        'Check asyncData and fetch implementations',
        'Validate module configurations',
      ],
      svelte: [
        'Review component logic and stores',
        'Check for sensitive data in component state',
        'Validate server-side kit configurations',
      ],
    };

    const base = baseRecommendations[framework] || [
      'Review framework-specific implementation details',
      'Check for framework configuration exposure',
    ];

    recommendations.push(...base);

    if (confidence > 0.8) {
      recommendations.push('High confidence framework detection - thorough review recommended');
    }

    return recommendations;
  }

  /**
   * Get the most likely framework
   */
  public static getPrimaryFramework(
    code: string,
    fileName?: string,
    dependencies?: string[]
  ): FrameworkDetectionResult | null {
    const results = this.detectFrameworks(code, fileName, dependencies);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Check if code uses any supported framework
   */
  public static hasFramework(code: string): boolean {
    return this.detectFrameworks(code).length > 0;
  }

  /**
   * Get framework pattern information
   */
  public static getFrameworkPattern(framework: string): FrameworkPattern | undefined {
    return FRAMEWORK_PATTERNS[framework];
  }

  /**
   * Get all supported frameworks
   */
  public static getSupportedFrameworks(): string[] {
    return Object.keys(FRAMEWORK_PATTERNS);
  }
}
