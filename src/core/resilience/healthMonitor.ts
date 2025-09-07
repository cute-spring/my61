/**
 * Health Monitor for the Resilience System
 * Monitors system health, performance metrics, and provides diagnostics
 */

export interface HealthMetrics {
  timestamp: number;
  renderingLatency: number;
  successRate: number;
  errorRate: number;
  memoryUsage: number;
  activeConnections: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: HealthMetrics;
  issues: string[];
  recommendations: string[];
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    renderer: 'healthy' | 'degraded' | 'unhealthy';
    retryManager: 'healthy' | 'degraded' | 'unhealthy';
    errorHandler: 'healthy' | 'degraded' | 'unhealthy';
  };
  lastCheck: number;
}

export class HealthMonitor {
  private static instance: HealthMonitor;
  private metrics: HealthMetrics[] = [];
  private maxMetricsHistory = 100;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private listeners: ((health: SystemHealth) => void)[] = [];

  private constructor() {
    this.startHealthChecks();
  }

  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Run health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Stop health monitoring
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Record a rendering operation metric
   */
  public recordRenderingMetric(latency: number, success: boolean): void {
    const metric: HealthMetrics = {
      timestamp: Date.now(),
      renderingLatency: latency,
      successRate: success ? 1 : 0,
      errorRate: success ? 0 : 1,
      memoryUsage: this.getMemoryUsage(),
      activeConnections: this.getActiveConnections()
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get current system health status
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    
    const rendererHealth = this.assessRendererHealth(recentMetrics);
    const retryManagerHealth = this.assessRetryManagerHealth();
    const errorHandlerHealth = this.assessErrorHandlerHealth();

    const overall = this.determineOverallHealth([
      rendererHealth,
      retryManagerHealth,
      errorHandlerHealth
    ]);

    const systemHealth: SystemHealth = {
      overall,
      components: {
        renderer: rendererHealth,
        retryManager: retryManagerHealth,
        errorHandler: errorHandlerHealth
      },
      lastCheck: Date.now()
    };

    // Notify listeners
    this.notifyListeners(systemHealth);

    return systemHealth;
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const recentMetrics = this.getRecentMetrics(10 * 60 * 1000); // Last 10 minutes
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Calculate aggregated metrics
    const avgLatency = this.calculateAverageLatency(recentMetrics);
    const successRate = this.calculateSuccessRate(recentMetrics);
    const errorRate = 1 - successRate;
    const memoryUsage = this.getMemoryUsage();
    const activeConnections = this.getActiveConnections();

    // Assess health issues
    if (avgLatency > 5000) {
      issues.push('High rendering latency detected');
      recommendations.push('Consider optimizing diagram complexity or system resources');
    }

    if (successRate < 0.8) {
      issues.push('Low success rate in rendering operations');
      recommendations.push('Check system dependencies and error logs');
    }

    if (memoryUsage > 0.8) {
      issues.push('High memory usage detected');
      recommendations.push('Consider restarting the extension or clearing cache');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2 && successRate > 0.5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const healthResult: HealthCheckResult = {
      status,
      metrics: {
        timestamp: Date.now(),
        renderingLatency: avgLatency,
        successRate,
        errorRate,
        memoryUsage,
        activeConnections
      },
      issues,
      recommendations
    };

    return healthResult;
  }

  /**
   * Add health status listener
   */
  public addHealthListener(listener: (health: SystemHealth) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove health status listener
   */
  public removeHealthListener(listener: (health: SystemHealth) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get recent metrics within time window
   */
  private getRecentMetrics(timeWindowMs: number): HealthMetrics[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.filter(metric => metric.timestamp >= cutoff);
  }

  /**
   * Calculate average latency from metrics
   */
  private calculateAverageLatency(metrics: HealthMetrics[]): number {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, metric) => sum + metric.renderingLatency, 0);
    return total / metrics.length;
  }

  /**
   * Calculate success rate from metrics
   */
  private calculateSuccessRate(metrics: HealthMetrics[]): number {
    if (metrics.length === 0) return 1;
    const totalSuccess = metrics.reduce((sum, metric) => sum + metric.successRate, 0);
    return totalSuccess / metrics.length;
  }

  /**
   * Get current memory usage (normalized 0-1)
   */
  private getMemoryUsage(): number {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        // Normalize to 0-1 based on reasonable limits (e.g., 512MB)
        return Math.min(usage.heapUsed / (512 * 1024 * 1024), 1);
      }
    } catch (error) {
      // Fallback for browser environments
    }
    return 0.1; // Default low usage
  }

  /**
   * Get active connections count
   */
  private getActiveConnections(): number {
    // This would be implemented based on actual connection tracking
    // For now, return a placeholder value
    return 1;
  }

  /**
   * Assess renderer component health
   */
  private assessRendererHealth(metrics: HealthMetrics[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.length === 0) return 'healthy';
    
    const avgLatency = this.calculateAverageLatency(metrics);
    const successRate = this.calculateSuccessRate(metrics);

    if (successRate < 0.5 || avgLatency > 10000) {
      return 'unhealthy';
    } else if (successRate < 0.8 || avgLatency > 5000) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Assess retry manager health
   */
  private assessRetryManagerHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    // This would check retry manager statistics
    // For now, assume healthy
    return 'healthy';
  }

  /**
   * Assess error handler health
   */
  private assessErrorHandlerHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    // This would check error handler statistics
    // For now, assume healthy
    return 'healthy';
  }

  /**
   * Determine overall health from component healths
   */
  private determineOverallHealth(componentHealths: ('healthy' | 'degraded' | 'unhealthy')[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (componentHealths.includes('unhealthy')) {
      return 'unhealthy';
    } else if (componentHealths.includes('degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Notify all health listeners
   */
  private notifyListeners(health: SystemHealth): void {
    this.listeners.forEach(listener => {
      try {
        listener(health);
      } catch (error) {
        console.error('Error notifying health listener:', error);
      }
    });
  }

  /**
   * Get health summary for display
   */
  public getHealthSummary(): string {
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000);
    if (recentMetrics.length === 0) {
      return 'No recent activity';
    }

    const avgLatency = this.calculateAverageLatency(recentMetrics);
    const successRate = this.calculateSuccessRate(recentMetrics);
    const memoryUsage = this.getMemoryUsage();

    return `Latency: ${avgLatency.toFixed(0)}ms | Success: ${(successRate * 100).toFixed(1)}% | Memory: ${(memoryUsage * 100).toFixed(1)}%`;
  }

  /**
   * Clear all metrics history
   */
  public clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Dispose of the health monitor
   */
  public dispose(): void {
    this.stopHealthChecks();
    this.listeners = [];
    this.metrics = [];
  }
}

// Export singleton instance
export const healthMonitor = HealthMonitor.getInstance();