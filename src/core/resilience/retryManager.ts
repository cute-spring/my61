import * as vscode from 'vscode';
import { AppError, ErrorCode, createError } from '../errors';
import { ErrorHandler } from '../errorHandler';
import { trackUsage } from '../../analytics';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCode[];
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: AppError;
  attempts: number;
  totalTime: number;
  recoveryStrategy?: string;
}

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker for preventing cascading failures
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  constructor(private config: RetryConfig) {}

  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.config.circuitBreakerTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN state
    return true;
  }

  onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.circuitBreakerThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Enhanced retry manager with circuit breaker and adaptive strategies
 */
export class RetryManager {
  private static instance: RetryManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: RetryConfig;

  private constructor() {
    this.defaultConfig = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        ErrorCode.RENDER_FAILURE,
        ErrorCode.LLM_TIMEOUT,
        ErrorCode.LLM_FAILURE,
        ErrorCode.IO_SAVE_FAIL
      ],
      circuitBreakerThreshold: 5,
      circuitBreakerTimeoutMs: 30000
    };
  }

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  /**
   * Execute operation with retry logic and circuit breaker
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultConfig, ...customConfig };
    const circuitBreaker = this.getCircuitBreaker(context, config);
    const startTime = Date.now();
    let lastError: AppError;
    let attempts = 0;

    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      const error = createError(
        ErrorCode.RENDER_FAILURE,
        `Circuit breaker is open for ${context}`,
        { circuitState: circuitBreaker.getState() },
        'Service temporarily unavailable. Please try again later.'
      );
      
      trackUsage('retry.circuit_breaker_blocked', { context });
      return {
        success: false,
        error,
        attempts: 0,
        totalTime: Date.now() - startTime,
        recoveryStrategy: 'circuit_breaker_blocked'
      };
    }

    for (attempts = 1; attempts <= config.maxAttempts; attempts++) {
      try {
        const result = await operation();
        circuitBreaker.onSuccess();
        
        trackUsage('retry.success', { 
          context, 
          attempts, 
          totalTime: Date.now() - startTime 
        });
        
        return {
          success: true,
          result,
          attempts,
          totalTime: Date.now() - startTime,
          recoveryStrategy: attempts > 1 ? 'retry_success' : 'first_attempt_success'
        };
      } catch (error) {
        lastError = this.ensureAppError(error);
        circuitBreaker.onFailure();
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError, config)) {
          trackUsage('retry.non_retryable_error', { 
            context, 
            errorCode: lastError.code, 
            attempts 
          });
          
          return {
            success: false,
            error: lastError,
            attempts,
            totalTime: Date.now() - startTime,
            recoveryStrategy: 'non_retryable_error'
          };
        }

        // Don't wait after the last attempt
        if (attempts < config.maxAttempts) {
          const delay = this.calculateDelay(attempts, config);
          await this.sleep(delay);
        }

        ErrorHandler.handle(lastError, `${context} (attempt ${attempts})`);
      }
    }

    trackUsage('retry.max_attempts_exceeded', { 
      context, 
      attempts, 
      errorCode: lastError!.code 
    });

    return {
      success: false,
      error: lastError!,
      attempts,
      totalTime: Date.now() - startTime,
      recoveryStrategy: 'max_attempts_exceeded'
    };
  }

  /**
   * Execute with fallback strategies
   */
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperations: Array<() => Promise<T>>,
    context: string
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: AppError;

    // Try primary operation first
    try {
      attempts++;
      const result = await primaryOperation();
      
      trackUsage('fallback.primary_success', { context, attempts });
      
      return {
        success: true,
        result,
        attempts,
        totalTime: Date.now() - startTime,
        recoveryStrategy: 'primary_operation'
      };
    } catch (error) {
      lastError = this.ensureAppError(error);
      ErrorHandler.handle(lastError, `${context} (primary operation)`);
    }

    // Try fallback operations
    for (let i = 0; i < fallbackOperations.length; i++) {
      try {
        attempts++;
        const result = await fallbackOperations[i]();
        
        trackUsage('fallback.fallback_success', { 
          context, 
          attempts, 
          fallbackIndex: i 
        });
        
        return {
          success: true,
          result,
          attempts,
          totalTime: Date.now() - startTime,
          recoveryStrategy: `fallback_${i + 1}`
        };
      } catch (error) {
        lastError = this.ensureAppError(error);
        ErrorHandler.handle(lastError, `${context} (fallback ${i + 1})`);
      }
    }

    trackUsage('fallback.all_failed', { context, attempts });

    return {
      success: false,
      error: lastError!,
      attempts,
      totalTime: Date.now() - startTime,
      recoveryStrategy: 'all_fallbacks_failed'
    };
  }

  /**
   * Get or create circuit breaker for context
   */
  private getCircuitBreaker(context: string, config: RetryConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(context)) {
      this.circuitBreakers.set(context, new CircuitBreaker(config));
    }
    return this.circuitBreakers.get(context)!;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AppError, config: RetryConfig): boolean {
    return config.retryableErrors.includes(error.code);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ensure error is AppError
   */
  private ensureAppError(error: unknown): AppError {
    if (error && typeof error === 'object' && (error as any).code) {
      return error as AppError;
    }
    if (error instanceof Error) {
      return createError(ErrorCode.UNKNOWN, error.message);
    }
    return createError(ErrorCode.UNKNOWN, String(error));
  }

  /**
   * Reset circuit breaker for context
   */
  resetCircuitBreaker(context: string): void {
    this.circuitBreakers.delete(context);
    trackUsage('retry.circuit_breaker_reset', { context });
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(context: string): { state: string; failureCount: number } | null {
    const breaker = this.circuitBreakers.get(context);
    if (!breaker) {
      return null;
    }
    return {
      state: breaker.getState(),
      failureCount: (breaker as any).failureCount || 0
    };
  }

  /**
   * Update retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
  }
}