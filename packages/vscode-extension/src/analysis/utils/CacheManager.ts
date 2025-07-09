/**
 * Cache Manager for Analysis Results
 * Provides caching with TTL, size limits, and cache invalidation
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheOptions {
  maxSize?: number;
  maxEntries?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
  };

  private readonly maxSize: number;
  private readonly maxEntries: number;
  private readonly defaultTTL: number;
  private readonly cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024;
    this.maxEntries = options.maxEntries || 1000;
    this.defaultTTL = options.defaultTTL || 30 * 60 * 1000;
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000;

    this.startCleanupTimer();
  }

  /**
   * Generate cache key from analysis parameters
   */
  public generateKey(code: string, language: string, options?: any): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    const content = code + language + optionsStr;

    // Simple hash function to generate a unique key
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `analysis_${Math.abs(hash).toString(36)}_${language}`;
  }

  /**
   * Get cached value
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hits++;
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Set cached value
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    const entryTTL = ttl || this.defaultTTL;
    const dataSize = this.calculateSize(data);

    // Check size limits before adding
    if (dataSize > this.maxSize) {
      console.warn(`CXG Cache: Entry too large (${dataSize} bytes), skipping cache`);
      return;
    }

    // Remove existing entry if updating
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Ensure we have space
    this.ensureSpace(dataSize);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: entryTTL,
      hits: 0,
      size: dataSize,
    };

    this.cache.set(key, entry);
    this.stats.totalSize += dataSize;
  }

  /**
   * Delete cached entry
   */
  public delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.totalSize -= entry.size;
      this.cache.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Check if key exists and is valid
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached entries
   */
  public clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      totalEntries: this.cache.size,
      totalSize: this.stats.totalSize,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      evictionCount: this.stats.evictions,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map((e) => e.timestamp)) : 0,
    };
  }

  /**
   * Get cache keys matching pattern
   */
  public getKeys(pattern?: RegExp): string[] {
    const keys = Array.from(this.cache.keys());
    return pattern ? keys.filter((key) => pattern.test(key)) : keys;
  }

  /**
   * Prune expired entries
   */
  public pruneExpired(): number {
    const now = Date.now();
    let prunedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        prunedCount++;
      }
    }

    return prunedCount;
  }

  /**
   * Optimize cache by removing least recently used entries
   */
  public optimize(): void {
    // Remove expired entries first
    this.pruneExpired();

    // If still over limits, remove LRU entries
    if (this.cache.size > this.maxEntries || this.stats.totalSize > this.maxSize) {
      const entries = Array.from(this.cache.entries());

      // Sort by last access time
      entries.sort(([, a], [, b]) => {
        const aScore = a.hits * 0.3 + (a.timestamp / 1000000) * 0.7;
        const bScore = b.hits * 0.3 + (b.timestamp / 1000000) * 0.7;
        return aScore - bScore;
      });

      // Remove oldest entries until under limits
      while (
        (this.cache.size > this.maxEntries || this.stats.totalSize > this.maxSize) &&
        entries.length > 0
      ) {
        const [key] = entries.shift()!;
        this.delete(key);
        this.stats.evictions++;
      }
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  public invalidate(pattern: RegExp | string): number {
    let invalidatedCount = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        invalidatedCount++;
      }
    }

    return invalidatedCount;
  }

  /**
   * Warm cache with analysis results
   */
  public async warmup(entries: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      this.set(entry.key, entry.data, entry.ttl);
    }
  }

  /**
   * Export cache data for persistence
   */
  public export(): { [key: string]: any } {
    const exported: { [key: string]: any } = {};

    for (const [key, entry] of this.cache.entries()) {
      // Only export non-expired entries
      if (Date.now() - entry.timestamp <= entry.ttl) {
        exported[key] = {
          data: entry.data,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          hits: entry.hits,
        };
      }
    }

    return exported;
  }

  /**
   * Import cache data from persistence
   */
  public import(data: { [key: string]: any }): void {
    const now = Date.now();

    for (const [key, entry] of Object.entries(data)) {
      // Only import non-expired entries
      if (entry.timestamp && entry.ttl && now - entry.timestamp <= entry.ttl) {
        const dataSize = this.calculateSize(entry.data);

        this.cache.set(key, {
          data: entry.data,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          hits: entry.hits || 0,
          size: dataSize,
        });

        this.stats.totalSize += dataSize;
      }
    }
  }

  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  // Private helper methods

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.optimize();
    }, this.cleanupInterval);
  }

  private ensureSpace(requiredSize: number): void {
    // Check if we need to make space
    while (
      (this.cache.size >= this.maxEntries || this.stats.totalSize + requiredSize > this.maxSize) &&
      this.cache.size > 0
    ) {
      this.evictLeastUsed();
    }
  }

  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastUsedScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Calculate usage score
      const score = entry.hits * 0.3 + (entry.timestamp / 1000000) * 0.7;

      if (score < leastUsedScore) {
        leastUsedScore = score;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.delete(leastUsedKey);
      this.stats.evictions++;
    }
  }

  private calculateSize(data: any): number {
    // Rough estimation of object size in bytes
    const str = JSON.stringify(data);
    return new Blob([str]).size;
  }
}

/**
 * Global cache instance for analysis results
 */
export const analysisCache = new CacheManager({
  maxSize: 100 * 1024 * 1024,
  maxEntries: 2000,
  defaultTTL: 45 * 60 * 1000,
  cleanupInterval: 10 * 60 * 1000, 
});

/**
 * Cache utilities
 */
export class CacheUtils {
  /**
   * Create cache key for file analysis
   */
  static createFileKey(filePath: string, language: string, lastModified?: number): string {
    const timestamp = lastModified || Date.now();
    return `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${language}_${timestamp}`;
  }

  /**
   * Create cache key for code snippet analysis
   */
  static createSnippetKey(codeHash: string, language: string, options?: any): string {
    const optionsHash = options ? CacheUtils.hashObject(options) : '';
    return `snippet_${codeHash}_${language}_${optionsHash}`;
  }

  /**
   * Create cache key for framework analysis
   */
  static createFrameworkKey(framework: string, version?: string): string {
    return `framework_${framework}_${version || 'latest'}`;
  }

  /**
   * Hash object for cache key generation
   */
  static hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cache entry is fresh enough for real-time analysis
   */
  static isFresh(timestamp: number, maxAge: number = 5 * 60 * 1000): boolean {
    return Date.now() - timestamp <= maxAge;
  }

  /**
   * Create cache tags for organized invalidation
   */
  static createTags(language: string, framework?: string, riskLevel?: string): string[] {
    const tags = [`lang:${language}`];

    if (framework) {
      tags.push(`framework:${framework}`);
    }

    if (riskLevel) {
      tags.push(`risk:${riskLevel}`);
    }

    return tags;
  }
}
