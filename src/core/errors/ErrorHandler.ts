import { ApplicationError } from './ApplicationError';
import { ErrorType, ErrorSeverity } from './ErrorTypes';
import { Logger } from '../utils/Logger';

/**
 * 错误处理器
 * 
 * 提供统一的错误处理机制，包括错误日志记录、用户通知和错误恢复策略。
 * 
 * @example
 * ```typescript
 * const errorHandler = ErrorHandler.getInstance();
 * errorHandler.handleError(error);
 * ```
 */
export class ErrorHandler {
    private static instance: ErrorHandler;
    private logger: Logger;
    private errorCounts: Map<string, number> = new Map();
    private readonly MAX_ERROR_COUNT = 10; // 最大错误计数
    private readonly ERROR_RESET_INTERVAL = 60000; // 错误计数重置间隔（1分钟）

    private constructor() {
        this.logger = Logger.getInstance();
        this.startErrorCountReset();
    }

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * 处理应用程序错误
     */
    public handleError(error: ApplicationError): void {
        // 记录错误日志
        this.logError(error);
        
        // 更新错误计数
        this.updateErrorCount(error);
        
        // 根据错误类型采取不同的处理策略
        this.applyErrorStrategy(error);
        
        // 检查是否需要降级处理
        this.checkDegradation(error);
    }

    /**
     * 处理未知错误
     */
    public handleUnknownError(error: any, context?: string): void {
        const appError = ApplicationError.runtimeError(
            error instanceof Error ? error.message : String(error),
            'UNKNOWN_ERROR' as any,
            { context, originalError: error },
            error instanceof Error ? error : undefined
        );
        
        this.handleError(appError);
    }

    /**
     * 记录错误日志
     */
    private logError(error: ApplicationError): void {
        const logContext = 'ErrorHandler';
        const logData = {
            operation: 'handleError',
            errorType: error.type,
            errorCode: error.code,
            severity: error.severity,
            context: error.context
        };

        switch (error.severity) {
            case ErrorSeverity.LOW:
                this.logger.warn(error.message, logContext, logData);
                break;
            case ErrorSeverity.MEDIUM:
                this.logger.error(error.message, logContext, logData);
                break;
            case ErrorSeverity.HIGH:
            case ErrorSeverity.CRITICAL:
                this.logger.error(error.message, logContext, {
                    ...logData,
                    stackTrace: error.stackTrace,
                    originalError: error.originalError
                });
                break;
        }
    }

    /**
     * 更新错误计数
     */
    private updateErrorCount(error: ApplicationError): void {
        const key = `${error.type}:${error.code}`;
        const currentCount = this.errorCounts.get(key) || 0;
        this.errorCounts.set(key, currentCount + 1);
    }

    /**
     * 应用错误处理策略
     */
    private applyErrorStrategy(error: ApplicationError): void {
        switch (error.type) {
            case ErrorType.VALIDATION_ERROR:
                this.handleValidationError(error);
                break;
            case ErrorType.NETWORK_ERROR:
                this.handleNetworkError(error);
                break;
            case ErrorType.CONFIGURATION_ERROR:
                this.handleConfigurationError(error);
                break;
            case ErrorType.ENGINE_ERROR:
                this.handleEngineError(error);
                break;
            case ErrorType.AI_MODEL_ERROR:
                this.handleAIModelError(error);
                break;
            case ErrorType.RUNTIME_ERROR:
                this.handleRuntimeError(error);
                break;
            default:
                this.handleGenericError(error);
                break;
        }
    }

    /**
     * 处理验证错误
     */
    private handleValidationError(error: ApplicationError): void {
        // 验证错误通常不需要特殊处理，只需要显示用户友好的消息
        this.showUserNotification(error.getUserFriendlyMessage(), 'warning');
    }

    /**
     * 处理网络错误
     */
    private handleNetworkError(error: ApplicationError): void {
        // 网络错误可能需要重试机制
        this.showUserNotification(error.getUserFriendlyMessage(), 'error');
        
        // 记录网络错误统计
        this.logger.warn('Network error occurred', {
            component: 'ErrorHandler',
            operation: 'handleNetworkError',
            errorCode: error.code,
            context: error.context
        } as any);
    }

    /**
     * 处理配置错误
     */
    private handleConfigurationError(error: ApplicationError): void {
        // 配置错误需要引导用户修复配置
        this.showUserNotification(error.getUserFriendlyMessage(), 'error');
        
        // 可以尝试自动修复某些配置问题
        this.attemptConfigurationFix(error);
    }

    /**
     * 处理引擎错误
     */
    private handleEngineError(error: ApplicationError): void {
        // 引擎错误可能需要切换到备用引擎
        this.showUserNotification(error.getUserFriendlyMessage(), 'error');
        
        // 记录引擎错误统计
        this.logger.error('Engine error occurred', {
            component: 'ErrorHandler',
            operation: 'handleEngineError',
            errorCode: error.code,
            context: error.context
        } as any);
    }

    /**
     * 处理AI模型错误
     */
    private handleAIModelError(error: ApplicationError): void {
        // AI模型错误可能需要切换到备用模型
        this.showUserNotification(error.getUserFriendlyMessage(), 'error');
        
        // 记录AI模型错误统计
        this.logger.error('AI model error occurred', {
            component: 'ErrorHandler',
            operation: 'handleAIModelError',
            errorCode: error.code,
            context: error.context
        } as any);
    }

    /**
     * 处理运行时错误
     */
    private handleRuntimeError(error: ApplicationError): void {
        // 运行时错误可能需要重启服务或降级处理
        this.showUserNotification(error.getUserFriendlyMessage(), 'error');
        
        // 记录运行时错误统计
        this.logger.error('Runtime error occurred', {
            component: 'ErrorHandler',
            operation: 'handleRuntimeError',
            errorCode: error.code,
            stackTrace: error.stackTrace,
            context: error.context
        } as any);
    }

    /**
     * 处理通用错误
     */
    private handleGenericError(error: ApplicationError): void {
        this.showUserNotification(error.getUserFriendlyMessage(), 'error');
    }

    /**
     * 尝试自动修复配置问题
     */
    private attemptConfigurationFix(error: ApplicationError): void {
        // 这里可以实现自动配置修复逻辑
        // 例如：重置到默认配置、检测缺失的依赖等
        this.logger.info('Attempting configuration fix', {
            component: 'ErrorHandler',
            operation: 'attemptConfigurationFix',
            errorCode: error.code
        } as any);
    }

    /**
     * 检查是否需要降级处理
     */
    private checkDegradation(error: ApplicationError): void {
        const key = `${error.type}:${error.code}`;
        const errorCount = this.errorCounts.get(key) || 0;
        
        if (errorCount >= this.MAX_ERROR_COUNT) {
            this.logger.warn('Error threshold exceeded, considering degradation', {
                component: 'ErrorHandler',
                operation: 'checkDegradation',
                errorType: error.type,
                errorCode: error.code,
                errorCount
            } as any);
            
            // 这里可以实现降级策略
            // 例如：禁用某些功能、切换到备用服务等
        }
    }

    /**
     * 显示用户通知
     */
    private showUserNotification(message: string, type: 'info' | 'warning' | 'error'): void {
        // 这里可以集成VS Code的通知API
        // 暂时使用控制台输出
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} ${message}`);
    }

    /**
     * 启动错误计数重置定时器
     */
    private startErrorCountReset(): void {
        setInterval(() => {
            this.errorCounts.clear();
            this.logger.debug('Error counts reset', {
                component: 'ErrorHandler',
                operation: 'startErrorCountReset'
            } as any);
        }, this.ERROR_RESET_INTERVAL);
    }

    /**
     * 获取错误统计信息
     */
    public getErrorStats(): Record<string, any> {
        const stats: Record<string, number> = {};
        this.errorCounts.forEach((count, key) => {
            stats[key] = count;
        });
        
        return {
            totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
            errorTypes: stats,
            maxErrorCount: this.MAX_ERROR_COUNT,
            resetInterval: this.ERROR_RESET_INTERVAL
        };
    }

    /**
     * 清除错误统计
     */
    public clearErrorStats(): void {
        this.errorCounts.clear();
        this.logger.info('Error stats cleared', {
            component: 'ErrorHandler',
            operation: 'clearErrorStats'
        } as any);
    }
} 