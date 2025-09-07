import * as vscode from 'vscode';
import { RetryManager, RetryResult, RetryConfig } from './retryManager.js';
import { AppError, ErrorCode, createError } from '../errors.js';
import { ErrorHandler } from '../errorHandler.js';
import { trackUsage } from '../../analytics.js';

/**
 * Rendering options with resilience configuration
 */
export interface ResilientRenderOptions {
  format: string;
  savePath?: string;
  timeout?: number;
  fallbackFormats?: string[];
  retryConfig?: Partial<RetryConfig>;
  enableGracefulDegradation?: boolean;
}

/**
 * Rendering result with resilience metadata
 */
export interface ResilientRenderResult {
  success: boolean;
  buffer?: Buffer;
  error?: AppError;
  metadata: {
    attempts: number;
    totalTime: number;
    recoveryStrategy: string;
    formatUsed: string;
    fallbacksAttempted: string[];
    warnings: string[];
  };
}

/**
 * Health check result for rendering service
 */
export interface HealthCheckResult {
  healthy: boolean;
  javaAvailable: boolean;
  jarAvailable: boolean;
  layoutEngineWorking: boolean;
  lastSuccessfulRender?: Date;
  issues: string[];
  recommendations: string[];
}

/**
 * Resilient renderer with automatic recovery and fallback strategies
 */
export class ResilientRenderer {
  private static instance: ResilientRenderer;
  private retryManager: RetryManager;
  private lastHealthCheck?: HealthCheckResult;
  private healthCheckInterval?: NodeJS.Timeout;
  private renderingQueue: Map<string, Promise<ResilientRenderResult>> = new Map();

  private constructor() {
    this.retryManager = RetryManager.getInstance();
    this.startHealthMonitoring();
  }

  static getInstance(): ResilientRenderer {
    if (!ResilientRenderer.instance) {
      ResilientRenderer.instance = new ResilientRenderer();
    }
    return ResilientRenderer.instance;
  }

  /**
   * Render diagram with comprehensive error recovery
   */
  async renderDiagram(
    diagram: any,
    options: ResilientRenderOptions
  ): Promise<ResilientRenderResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId(diagram, options);
    
    // Check if same request is already in progress
    if (this.renderingQueue.has(requestId)) {
      trackUsage('resilient_render.duplicate_request', { requestId });
      return await this.renderingQueue.get(requestId)!;
    }

    const renderPromise = this.executeRenderWithRecovery(diagram, options, startTime);
    this.renderingQueue.set(requestId, renderPromise);

    try {
      const result = await renderPromise;
      return result;
    } finally {
      this.renderingQueue.delete(requestId);
    }
  }

  /**
   * Execute rendering with comprehensive recovery strategies
   */
  private async executeRenderWithRecovery(
    diagram: any,
    options: ResilientRenderOptions,
    startTime: number
  ): Promise<ResilientRenderResult> {
    const warnings: string[] = [];
    const fallbacksAttempted: string[] = [];

    // Health check before rendering
    const healthCheck = await this.performHealthCheck();
    if (!healthCheck.healthy && !options.enableGracefulDegradation) {
      return {
        success: false,
        error: createError(
          ErrorCode.RENDER_FAILURE,
          'Rendering service is unhealthy',
          { healthCheck },
          'Diagram rendering is currently unavailable. Please check your PlantUML configuration.'
        ),
        metadata: {
          attempts: 0,
          totalTime: Date.now() - startTime,
          recoveryStrategy: 'health_check_failed',
          formatUsed: options.format,
          fallbacksAttempted: [],
          warnings: healthCheck.issues
        }
      };
    }

    if (!healthCheck.healthy) {
      warnings.push(...healthCheck.issues);
    }

    // Primary rendering attempt with retry
    const primaryResult = await this.retryManager.executeWithRetry(
      () => this.performRender(diagram, options.format, options.savePath, options.timeout),
      'diagram_render',
      options.retryConfig
    );

    if (primaryResult.success) {
      return {
        success: true,
        buffer: primaryResult.result,
        metadata: {
          attempts: primaryResult.attempts,
          totalTime: primaryResult.totalTime,
          recoveryStrategy: primaryResult.recoveryStrategy || 'primary_success',
          formatUsed: options.format,
          fallbacksAttempted,
          warnings
        }
      };
    }

    // Try fallback formats if available
    if (options.fallbackFormats && options.fallbackFormats.length > 0) {
      for (const fallbackFormat of options.fallbackFormats) {
        fallbacksAttempted.push(fallbackFormat);
        
        const fallbackResult = await this.retryManager.executeWithRetry(
          () => this.performRender(diagram, fallbackFormat, options.savePath, options.timeout),
          `diagram_render_fallback_${fallbackFormat}`,
          { ...options.retryConfig, maxAttempts: 2 } // Fewer attempts for fallbacks
        );

        if (fallbackResult.success) {
          warnings.push(`Primary format '${options.format}' failed, using fallback '${fallbackFormat}'`);
          
          return {
            success: true,
            buffer: fallbackResult.result,
            metadata: {
              attempts: primaryResult.attempts + fallbackResult.attempts,
              totalTime: Date.now() - startTime,
              recoveryStrategy: `fallback_format_${fallbackFormat}`,
              formatUsed: fallbackFormat,
              fallbacksAttempted,
              warnings
            }
          };
        }
      }
    }

    // Try layout engine fallback
    const layoutFallbackResult = await this.tryLayoutEngineFallback(diagram, options);
    if (layoutFallbackResult.success) {
      warnings.push('Primary layout engine failed, using fallback engine');
      
      return {
        success: true,
        buffer: layoutFallbackResult.buffer,
        metadata: {
          attempts: primaryResult.attempts + (layoutFallbackResult.metadata?.attempts || 1),
          totalTime: Date.now() - startTime,
          recoveryStrategy: 'layout_engine_fallback',
          formatUsed: options.format,
          fallbacksAttempted: [...fallbacksAttempted, 'layout_engine_fallback'],
          warnings
        }
      };
    }

    // Try graceful degradation if enabled
    if (options.enableGracefulDegradation) {
      const degradedResult = await this.tryGracefulDegradation(diagram, options);
      if (degradedResult.success) {
        warnings.push('Full rendering failed, providing degraded output');
        
        return {
          success: true,
          buffer: degradedResult.buffer,
          metadata: {
            attempts: primaryResult.attempts + (degradedResult.metadata?.attempts || 1),
            totalTime: Date.now() - startTime,
            recoveryStrategy: 'graceful_degradation',
            formatUsed: 'text',
            fallbacksAttempted: [...fallbacksAttempted, 'graceful_degradation'],
            warnings
          }
        };
      }
    }

    // All recovery strategies failed
    trackUsage('resilient_render.all_strategies_failed', {
      format: options.format,
      fallbacksAttempted,
      totalTime: Date.now() - startTime
    });

    return {
      success: false,
      error: primaryResult.error,
      metadata: {
        attempts: primaryResult.attempts,
        totalTime: Date.now() - startTime,
        recoveryStrategy: 'all_strategies_failed',
        formatUsed: options.format,
        fallbacksAttempted,
        warnings
      }
    };
  }

  /**
   * Perform actual rendering (to be integrated with existing LocalRender)
   */
  private async performRender(
    diagram: any,
    format: string,
    savePath?: string,
    timeout?: number
  ): Promise<Buffer> {
    // This will integrate with the existing LocalRender class
    // For now, we'll import and use the existing localRender instance
    const { localRender } = await import('../../tools/preview.js');
    
    const renderPromise = localRender.render(diagram, format, savePath).promise;
    
    if (timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(createError(
            ErrorCode.RENDER_FAILURE,
            `Rendering timeout after ${timeout}ms`,
            { timeout },
            'Diagram rendering took too long. Try simplifying your diagram or increasing the timeout.'
          ));
        }, timeout);
      });
      
      const buffers = await Promise.race([renderPromise, timeoutPromise]);
      if (!buffers || buffers.length === 0) {
        throw createError(
          ErrorCode.RENDER_FAILURE,
          'Rendering returned empty result',
          {},
          'Failed to generate diagram. Please check your PlantUML syntax.'
        );
      }
      return buffers[0];
    }
    
    const buffers = await renderPromise;
    if (!buffers || buffers.length === 0) {
      throw createError(
        ErrorCode.RENDER_FAILURE,
        'Rendering returned empty result',
        {},
        'Failed to generate diagram. Please check your PlantUML syntax.'
      );
    }
    return buffers[0];
  }

  /**
   * Try layout engine fallback (DOT -> Smetana or vice versa)
   */
  private async tryLayoutEngineFallback(
    diagram: any,
    options: ResilientRenderOptions
  ): Promise<Partial<ResilientRenderResult>> {
    try {
      // Get current layout engine
      const currentEngine = vscode.workspace.getConfiguration('plantuml').get<string>('layoutEngine', 'smetana');
      const fallbackEngine = currentEngine === 'dot' ? 'smetana' : 'dot';
      
      // Temporarily switch layout engine
      await vscode.workspace.getConfiguration('plantuml').update('layoutEngine', fallbackEngine, vscode.ConfigurationTarget.Workspace);
      
      try {
        const buffer = await this.performRender(diagram, options.format, options.savePath, options.timeout);
        
        trackUsage('resilient_render.layout_fallback_success', {
          originalEngine: currentEngine,
          fallbackEngine
        });
        
        return {
          success: true,
          buffer,
          metadata: {
            attempts: 1,
            totalTime: 0,
            recoveryStrategy: 'layout_fallback',
            formatUsed: options.format,
            fallbacksAttempted: [fallbackEngine],
            warnings: []
          }
        };
      } finally {
        // Restore original layout engine
        await vscode.workspace.getConfiguration('plantuml').update('layoutEngine', currentEngine, vscode.ConfigurationTarget.Workspace);
      }
    } catch (error) {
      trackUsage('resilient_render.layout_fallback_failed', { error: String(error) });
      return { success: false };
    }
  }

  /**
   * Try graceful degradation (return text representation)
   */
  private async tryGracefulDegradation(
    diagram: any,
    options: ResilientRenderOptions
  ): Promise<Partial<ResilientRenderResult>> {
    try {
      // Create a text representation of the diagram
      const textContent = `PlantUML Diagram (Text Representation)\n\n${diagram.content}\n\nNote: Visual rendering failed. This is the source code of your diagram.`;
      const buffer = Buffer.from(textContent, 'utf-8');
      
      trackUsage('resilient_render.graceful_degradation_used', {
        originalFormat: options.format
      });
      
      return {
        success: true,
        buffer,
        metadata: {
          attempts: 1,
          totalTime: 0,
          recoveryStrategy: 'graceful_degradation',
          formatUsed: 'text',
          fallbacksAttempted: ['text_representation'],
          warnings: ['Visual rendering failed, showing text representation']
        }
      };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let javaAvailable = false;
    let jarAvailable = false;
    let layoutEngineWorking = false;

    try {
      // Check Java availability
      const { spawn } = await import('child_process');
      const javaProcess = spawn('java', ['-version']);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          javaProcess.kill();
          reject(new Error('Java check timeout'));
        }, 5000);
        
        javaProcess.on('close', (code) => {
          clearTimeout(timeout);
          if (code === 0 || code === null) {
            javaAvailable = true;
            resolve();
          } else {
            reject(new Error(`Java process exited with code ${code}`));
          }
        });
        
        javaProcess.on('error', reject);
      });
    } catch (error) {
      issues.push('Java Runtime Environment not available');
      recommendations.push('Install Java JRE 8 or higher');
    }

    try {
      // Check PlantUML JAR availability
      const { localRender } = await import('../../tools/preview.js');
      const jarPath = (localRender as any).getJarPath?.() || '';
      
      if (jarPath) {
        const fs = await import('fs');
        if (fs.existsSync(jarPath)) {
          jarAvailable = true;
        } else {
          issues.push('PlantUML JAR file not found');
          recommendations.push('Download or configure PlantUML JAR file');
        }
      } else {
        issues.push('PlantUML JAR path not configured');
        recommendations.push('Configure PlantUML JAR path in settings');
      }
    } catch (error) {
      issues.push('Unable to check PlantUML JAR availability');
    }

    try {
      // Test layout engine with simple diagram
      if (javaAvailable && jarAvailable) {
        const testDiagram = {
          content: '@startuml\nA -> B\n@enduml',
          parentUri: vscode.Uri.file('test'),
          dir: '',
          pageCount: 1,
          path: '',
          name: 'health-check'
        };
        
        await this.performRender(testDiagram, 'svg', undefined, 10000);
        layoutEngineWorking = true;
      }
    } catch (error) {
      issues.push('Layout engine test failed');
      recommendations.push('Check PlantUML configuration and layout engine settings');
    }

    const healthy = javaAvailable && jarAvailable && layoutEngineWorking;
    
    this.lastHealthCheck = {
      healthy,
      javaAvailable,
      jarAvailable,
      layoutEngineWorking,
      lastSuccessfulRender: healthy ? new Date() : this.lastHealthCheck?.lastSuccessfulRender,
      issues,
      recommendations
    };

    trackUsage('resilient_render.health_check', {
      healthy,
      javaAvailable,
      jarAvailable,
      layoutEngineWorking,
      issueCount: issues.length
    });

    return this.lastHealthCheck;
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    // Perform initial health check
    this.performHealthCheck();
    
    // Schedule periodic health checks (every 5 minutes)
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Generate unique request ID for deduplication
   */
  private generateRequestId(diagram: any, options: ResilientRenderOptions): string {
    const content = diagram.content || '';
    const format = options.format || 'svg';
    const hash = this.simpleHash(content + format);
    return `render_${hash}`;
  }

  /**
   * Simple hash function for request deduplication
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear rendering queue (for cleanup)
   */
  clearQueue(): void {
    this.renderingQueue.clear();
  }

  /**
   * Get rendering queue status
   */
  getQueueStatus(): { activeRequests: number; requestIds: string[] } {
    return {
      activeRequests: this.renderingQueue.size,
      requestIds: Array.from(this.renderingQueue.keys())
    };
  }
}