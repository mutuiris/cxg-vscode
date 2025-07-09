/**
 * Performance Monitor for Analysis Operations
 * Provides performance tracking, metrics collection, and optimization insights
 */

export interface PerformanceMeasurement {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
  tags?: string[];
}

export interface PerformanceMetrics {
  totalOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  operationsPerSecond: number;
  errorRate: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

export interface PerformanceStats {
  overall: PerformanceMetrics;
  byOperation: { [operation: string]: PerformanceMetrics };
  recent: PerformanceMeasurement[];
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
  hotspots: Array<{
    operation: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
}

export interface PerformanceOptions {
  maxMeasurements?: number;
  enableMemoryTracking?: boolean;
  enableTrendAnalysis?: boolean;
  alertThresholds?: {
    slowOperation: number; // milliseconds
    highMemory: number; // bytes
    errorRate: number; // percentage
  };
}

export class PerformanceMonitor {
  private measurements = new Map<string, PerformanceMeasurement>();
  private completedMeasurements: PerformanceMeasurement[] = [];
  private operationStats = new Map<string, PerformanceMeasurement[]>();
  private errorCount = 0;
  private totalOperations = 0;

  private readonly maxMeasurements: number;
  private readonly enableMemoryTracking: boolean;
  private readonly enableTrendAnalysis: boolean;
  private readonly alertThresholds: any;

  private trendData = {
    hourly: new Array(24).fill(0),
    daily: new Array(7).fill(0),
    weekly: new Array(4).fill(0),
  };

  private memoryBaseline?: NodeJS.MemoryUsage;
  private lastCleanup = Date.now();

  constructor(options: PerformanceOptions = {}) {
    this.maxMeasurements = options.maxMeasurements || 10000;
    this.enableMemoryTracking = options.enableMemoryTracking ?? true;
    this.enableTrendAnalysis = options.enableTrendAnalysis ?? true;
    this.alertThresholds = {
      slowOperation: 5000, // 5 seconds
      highMemory: 500 * 1024 * 1024, // 500MB
      errorRate: 0.05, // 5%
      ...options.alertThresholds,
    };

    if (this.enableMemoryTracking) {
      this.memoryBaseline = process.memoryUsage();
    }

    // Periodic cleanup and trend updates
    setInterval(() => this.performMaintenance(), 60000); // Every minute
  }

  /**
   * Start measuring a performance operation
   */
  public startMeasurement(operation: string, metadata?: any, tags?: string[]): string {
    const id = this.generateMeasurementId();
    const measurement: PerformanceMeasurement = {
      id,
      operation,
      startTime: Date.now(),
      metadata,
      tags,
    };

    this.measurements.set(id, measurement);
    return id;
  }

  /**
   * End a performance measurement
   */
  public endMeasurement(id: string, error?: Error): PerformanceMeasurement | null {
    const measurement = this.measurements.get(id);
    if (!measurement) {
      console.warn(`CXG Performance: Measurement ${id} not found`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - measurement.startTime;

    measurement.endTime = endTime;
    measurement.duration = duration;

    if (error) {
      measurement.metadata = {
        ...measurement.metadata,
        error: error.message,
        errorType: error.constructor.name,
      };
      this.errorCount++;
    }

    // Move to completed measurements
    this.measurements.delete(id);
    this.completedMeasurements.push(measurement);
    this.totalOperations++;

    // Update operation-specific stats
    if (!this.operationStats.has(measurement.operation)) {
      this.operationStats.set(measurement.operation, []);
    }
    this.operationStats.get(measurement.operation)!.push(measurement);

    // Check for performance alerts
    this.checkAlerts(measurement);

    // Update trends
    if (this.enableTrendAnalysis) {
      this.updateTrends(measurement);
    }

    // Cleanup if needed
    this.cleanupIfNeeded();

    return measurement;
  }

  /**
   * Measure a function execution
   */
  public async measureFunction<T>(
    operation: string,
    func: () => Promise<T> | T,
    metadata?: any,
    tags?: string[]
  ): Promise<T> {
    const measurementId = this.startMeasurement(operation, metadata, tags);

    try {
      const result = await func();
      this.endMeasurement(measurementId);
      return result;
    } catch (error) {
      this.endMeasurement(measurementId, error as Error);
      throw error;
    }
  }

  /**
   * Get comprehensive performance statistics
   */
  public getStats(): PerformanceStats {
    const overall = this.calculateOverallMetrics();
    const byOperation: { [operation: string]: PerformanceMetrics } = {};

    // Calculate metrics for each operation type
    for (const [operation, measurements] of this.operationStats.entries()) {
      byOperation[operation] = this.calculateMetricsForMeasurements(measurements);
    }

    const hotspots = this.identifyPerformanceHotspots();
    const recent = this.completedMeasurements.slice(-50); // Last 50 measurements

    return {
      overall,
      byOperation,
      recent,
      trends: { ...this.trendData },
      hotspots,
    };
  }

  /**
   * Get metrics for a specific operation
   */
  public getOperationMetrics(operation: string): PerformanceMetrics | null {
    const measurements = this.operationStats.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    return this.calculateMetricsForMeasurements(measurements);
  }

  /**
   * Get current memory usage information
   */
  public getMemoryUsage(): {
    current: NodeJS.MemoryUsage;
    baseline?: NodeJS.MemoryUsage;
    delta?: NodeJS.MemoryUsage;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const current = process.memoryUsage();
    let delta: NodeJS.MemoryUsage | undefined;

    if (this.memoryBaseline) {
      delta = {
        rss: current.rss - this.memoryBaseline.rss,
        heapTotal: current.heapTotal - this.memoryBaseline.heapTotal,
        heapUsed: current.heapUsed - this.memoryBaseline.heapUsed,
        external: current.external - this.memoryBaseline.external,
        arrayBuffers: current.arrayBuffers - this.memoryBaseline.arrayBuffers,
      };
    }

    const trend = this.calculateMemoryTrend();

    return {
      current,
      baseline: this.memoryBaseline,
      delta,
      trend,
    };
  }

  /**
   * Get slow operations report
   */
  public getSlowOperations(threshold?: number): PerformanceMeasurement[] {
    const slowThreshold = threshold || this.alertThresholds.slowOperation;
    return this.completedMeasurements
      .filter((m) => m.duration && m.duration > slowThreshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  /**
   * Get error summary
   */
  public getErrorSummary(): {
    totalErrors: number;
    errorRate: number;
    errorsByType: { [type: string]: number };
    recentErrors: PerformanceMeasurement[];
  } {
    const errorMeasurements = this.completedMeasurements.filter((m) => m.metadata?.error);

    const errorsByType: { [type: string]: number } = {};
    errorMeasurements.forEach((m) => {
      const errorType = m.metadata?.errorType || 'Unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    return {
      totalErrors: this.errorCount,
      errorRate: this.totalOperations > 0 ? this.errorCount / this.totalOperations : 0,
      errorsByType,
      recentErrors: errorMeasurements.slice(-10),
    };
  }

  /**
   * Generate performance report
   */
  public generateReport(): string {
    const stats = this.getStats();
    const memory = this.getMemoryUsage();
    const errors = this.getErrorSummary();

    return `
# CXG Performance Report

## Overall Metrics
- **Total Operations**: ${stats.overall.totalOperations}
- **Average Duration**: ${stats.overall.averageDuration.toFixed(2)}ms
- **Operations/Second**: ${stats.overall.operationsPerSecond.toFixed(2)}
- **Error Rate**: ${(stats.overall.errorRate * 100).toFixed(2)}%

## Memory Usage
- **Current RSS**: ${this.formatBytes(memory.current.rss)}
- **Heap Used**: ${this.formatBytes(memory.current.heapUsed)}
- **Heap Total**: ${this.formatBytes(memory.current.heapTotal)}
- **Memory Trend**: ${memory.trend}

## Top Operations by Duration
${Object.entries(stats.byOperation)
  .sort(([, a], [, b]) => b.averageDuration - a.averageDuration)
  .slice(0, 5)
  .map(([op, metrics]) => `- **${op}**: ${metrics.averageDuration.toFixed(2)}ms avg`)
  .join('\n')}

## Performance Hotspots
${stats.hotspots.map((h) => `- **${h.operation}** (${h.impact}): ${h.recommendation}`).join('\n')}

## Recent Errors
${errors.recentErrors
  .slice(0, 3)
  .map((e) => `- ${e.operation}: ${e.metadata?.error} (${e.duration}ms)`)
  .join('\n')}
    `.trim();
  }

  /**
   * Reset all performance data
   */
  public reset(): void {
    this.measurements.clear();
    this.completedMeasurements.length = 0;
    this.operationStats.clear();
    this.errorCount = 0;
    this.totalOperations = 0;
    this.trendData = {
      hourly: new Array(24).fill(0),
      daily: new Array(7).fill(0),
      weekly: new Array(4).fill(0),
    };
    this.memoryBaseline = this.enableMemoryTracking ? process.memoryUsage() : undefined;
  }

  /**
   * Export performance data
   */
  public exportData(): any {
    return {
      measurements: this.completedMeasurements,
      operationStats: Object.fromEntries(this.operationStats),
      trendData: this.trendData,
      stats: {
        errorCount: this.errorCount,
        totalOperations: this.totalOperations,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Import performance data
   */
  public importData(data: any): void {
    if (data.measurements) {
      this.completedMeasurements = data.measurements;
    }
    if (data.operationStats) {
      this.operationStats = new Map(Object.entries(data.operationStats));
    }
    if (data.trendData) {
      this.trendData = data.trendData;
    }
    if (data.stats) {
      this.errorCount = data.stats.errorCount || 0;
      this.totalOperations = data.stats.totalOperations || 0;
    }
  }

  // Private helper methods

  private generateMeasurementId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateOverallMetrics(): PerformanceMetrics {
    return this.calculateMetricsForMeasurements(this.completedMeasurements);
  }

  private calculateMetricsForMeasurements(
    measurements: PerformanceMeasurement[]
  ): PerformanceMetrics {
    if (measurements.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        operationsPerSecond: 0,
        errorRate: 0,
      };
    }

    const durations = measurements
      .map((m) => m.duration || 0)
      .filter((d) => d > 0)
      .sort((a, b) => a - b);

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const errorCount = measurements.filter((m) => m.metadata?.error).length;

    // Time range for ops/sec calculation
    const timeRange =
      measurements.length > 1
        ? (measurements[measurements.length - 1].startTime - measurements[0].startTime) / 1000
        : 1;

    return {
      totalOperations: measurements.length,
      averageDuration: durations.length > 0 ? totalDuration / durations.length : 0,
      minDuration: durations.length > 0 ? durations[0] : 0,
      maxDuration: durations.length > 0 ? durations[durations.length - 1] : 0,
      p50Duration: this.calculatePercentile(durations, 0.5),
      p95Duration: this.calculatePercentile(durations, 0.95),
      p99Duration: this.calculatePercentile(durations, 0.99),
      operationsPerSecond: timeRange > 0 ? measurements.length / timeRange : 0,
      errorRate: measurements.length > 0 ? errorCount / measurements.length : 0,
      memoryUsage: this.enableMemoryTracking ? process.memoryUsage() : undefined,
    };
  }

  private calculatePercentile(sortedDurations: number[], percentile: number): number {
    if (sortedDurations.length === 0) return 0;

    const index = Math.ceil(sortedDurations.length * percentile) - 1;
    return sortedDurations[Math.max(0, index)];
  }

  private identifyPerformanceHotspots(): Array<{
    operation: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }> {
    const hotspots = [];

    for (const [operation, measurements] of this.operationStats.entries()) {
      const metrics = this.calculateMetricsForMeasurements(measurements);

      // Identify slow operations
      if (metrics.averageDuration > this.alertThresholds.slowOperation) {
        hotspots.push({
          operation,
          impact: 'high' as const,
          recommendation: `Average duration ${metrics.averageDuration.toFixed(2)}ms exceeds threshold. Consider optimization.`,
        });
      }

      // Identify high-frequency operations with moderate duration
      else if (metrics.operationsPerSecond > 10 && metrics.averageDuration > 1000) {
        hotspots.push({
          operation,
          impact: 'medium' as const,
          recommendation: `High frequency operation with ${metrics.averageDuration.toFixed(2)}ms duration. Consider caching.`,
        });
      }

      // Identify operations with high error rates
      else if (metrics.errorRate > this.alertThresholds.errorRate) {
        hotspots.push({
          operation,
          impact: 'high' as const,
          recommendation: `Error rate ${(metrics.errorRate * 100).toFixed(2)}% is above threshold. Investigate error causes.`,
        });
      }
    }

    return hotspots.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  private checkAlerts(measurement: PerformanceMeasurement): void {
    // Check for slow operation
    if (measurement.duration && measurement.duration > this.alertThresholds.slowOperation) {
      console.warn(
        `CXG Performance Alert: Slow operation "${measurement.operation}" took ${measurement.duration}ms`
      );
    }

    // Check memory usage
    if (this.enableMemoryTracking) {
      const memory = process.memoryUsage();
      if (memory.heapUsed > this.alertThresholds.highMemory) {
        console.warn(
          `CXG Performance Alert: High memory usage ${this.formatBytes(memory.heapUsed)}`
        );
      }
    }

    // Check error rate
    const recentErrorRate = this.calculateRecentErrorRate();
    if (recentErrorRate > this.alertThresholds.errorRate) {
      console.warn(`CXG Performance Alert: High error rate ${(recentErrorRate * 100).toFixed(2)}%`);
    }
  }

  private calculateRecentErrorRate(): number {
    const recentMeasurements = this.completedMeasurements.slice(-100);
    if (recentMeasurements.length === 0) return 0;

    const errorCount = recentMeasurements.filter((m) => m.metadata?.error).length;
    return errorCount / recentMeasurements.length;
  }

  private updateTrends(measurement: PerformanceMeasurement): void {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const week = Math.floor(now.getDate() / 7);

    // Update hourly trend
    this.trendData.hourly[hour] += measurement.duration || 0;

    // Update daily trend
    this.trendData.daily[day] += measurement.duration || 0;

    // Update weekly trend
    this.trendData.weekly[week % 4] += measurement.duration || 0;
  }

  private calculateMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (!this.enableMemoryTracking || !this.memoryBaseline) {
      return 'stable';
    }

    const current = process.memoryUsage();
    const delta = current.heapUsed - this.memoryBaseline.heapUsed;
    const threshold = 10 * 1024 * 1024;

    if (delta > threshold) return 'increasing';
    if (delta < -threshold) return 'decreasing';
    return 'stable';
  }

  private cleanupIfNeeded(): void {
    const now = Date.now();

    // Cleanup every 5 minutes
    if (now - this.lastCleanup < 5 * 60 * 1000) {
      return;
    }

    // Remove old measurements if it exceeds the limit
    if (this.completedMeasurements.length > this.maxMeasurements) {
      const excess = this.completedMeasurements.length - this.maxMeasurements;
      this.completedMeasurements.splice(0, excess);
    }

    // Cleanup operation stats
    for (const [operation, measurements] of this.operationStats.entries()) {
      if (measurements.length > this.maxMeasurements / 10) {
        const excess = measurements.length - Math.floor(this.maxMeasurements / 10);
        measurements.splice(0, excess);
      }
    }

    this.lastCleanup = now;
  }

  private performMaintenance(): void {
    this.cleanupIfNeeded();

    // Update memory baseline periodically
    if (this.enableMemoryTracking && Math.random() < 0.1) {
      // 10% chance
      this.memoryBaseline = process.memoryUsage();
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
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor({
  maxMeasurements: 5000,
  enableMemoryTracking: true,
  enableTrendAnalysis: true,
  alertThresholds: {
    slowOperation: 3000, // 3 seconds
    highMemory: 200 * 1024 * 1024, // 200MB
    errorRate: 0.03, // 3%
  },
});

/**
 * Performance monitoring utilities
 */
export class PerformanceUtils {
  /**
   * Decorator for automatic performance measurement
   */
  static measurePerformance(operation?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const operationName = operation || `${target.constructor.name}.${propertyKey}`;

      descriptor.value = async function (...args: any[]) {
        return performanceMonitor.measureFunction(
          operationName,
          () => originalMethod.apply(this, args),
          { className: target.constructor.name, methodName: propertyKey }
        );
      };

      return descriptor;
    };
  }

  /**
   * Create a performance aware throttled function
   */
  static createThrottledFunction<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
    operation: string
  ): T {
    let inThrottle = false;
    let lastExecution = 0;

    return ((...args: any[]) => {
      const now = Date.now();

      if (!inThrottle || now - lastExecution >= limit) {
        return performanceMonitor.measureFunction(
          `throttled_${operation}`,
          () => func.apply(this, args),
          { throttled: true, throttleLimit: limit }
        );
        lastExecution = now;
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
  }

  /**
   * Create a performance aware debounced function
   */
  static createDebouncedFunction<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    operation: string
  ): T {
    let timeout: NodeJS.Timeout;

    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        performanceMonitor.measureFunction(`debounced_${operation}`, () => func.apply(this, args), {
          debounced: true,
          debounceWait: wait,
        });
      }, wait);
    }) as T;
  }

  /**
   * Monitor memory usage during operation
   */
  static async monitorMemoryDuring<T>(
    operation: string,
    func: () => Promise<T> | T
  ): Promise<{ result: T; memoryDelta: NodeJS.MemoryUsage }> {
    const beforeMemory = process.memoryUsage();

    const result = await performanceMonitor.measureFunction(operation, func, {
      memoryMonitoring: true,
    });

    const afterMemory = process.memoryUsage();
    const memoryDelta = {
      rss: afterMemory.rss - beforeMemory.rss,
      heapTotal: afterMemory.heapTotal - beforeMemory.heapTotal,
      heapUsed: afterMemory.heapUsed - beforeMemory.heapUsed,
      external: afterMemory.external - beforeMemory.external,
      arrayBuffers: afterMemory.arrayBuffers - beforeMemory.arrayBuffers,
    };

    return { result, memoryDelta };
  }

  /**
   * Benchmark multiple functions
   */
  static async benchmark<T>(
    functions: Array<{ name: string; func: () => Promise<T> | T }>,
    iterations: number = 100
  ): Promise<Array<{ name: string; metrics: PerformanceMetrics }>> {
    const results = [];

    for (const { name, func } of functions) {
      const measurements: PerformanceMeasurement[] = [];

      for (let i = 0; i < iterations; i++) {
        const id = performanceMonitor.startMeasurement(`benchmark_${name}`, { iteration: i });
        try {
          await func();
          const measurement = performanceMonitor.endMeasurement(id);
          if (measurement) measurements.push(measurement);
        } catch (error) {
          performanceMonitor.endMeasurement(id, error as Error);
        }
      }

      // Calculate metrics for this function
      const durations = measurements.map((m) => m.duration || 0).sort((a, b) => a - b);
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);
      const errorCount = measurements.filter((m) => m.metadata?.error).length;

      const metrics: PerformanceMetrics = {
        totalOperations: measurements.length,
        averageDuration: durations.length > 0 ? totalDuration / durations.length : 0,
        minDuration: durations[0] || 0,
        maxDuration: durations[durations.length - 1] || 0,
        p50Duration: durations[Math.floor(durations.length * 0.5)] || 0,
        p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
        p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
        operationsPerSecond: measurements.length / (totalDuration / 1000),
        errorRate: measurements.length > 0 ? errorCount / measurements.length : 0,
      };

      results.push({ name, metrics });
    }

    return results.sort((a, b) => a.metrics.averageDuration - b.metrics.averageDuration);
  }
}
