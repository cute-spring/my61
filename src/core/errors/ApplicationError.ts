import { ErrorType, ErrorCode, ErrorSeverity } from './ErrorTypes';

/**
 * 应用程序错误类
 * 
 * 提供统一的错误处理机制，包含错误类型、代码、严重程度和上下文信息。
 * 所有应用程序错误都应该继承或使用此类。
 * 
 * @example
 * ```typescript
 * throw new ApplicationError(
 *   'AI模型不可用',
 *   ErrorType.AI_MODEL_ERROR,
 *   ErrorCode.AI_MODEL_NOT_AVAILABLE,
 *   { modelId: 'copilot' }
 * );
 * ```
 */
export class ApplicationError extends Error {
    /**
     * 错误类型
     */
    public readonly type: ErrorType;
    
    /**
     * 错误代码
     */
    public readonly code: ErrorCode;
    
    /**
     * 错误严重程度
     */
    public readonly severity: ErrorSeverity;
    
    /**
     * 错误上下文信息
     */
    public readonly context?: Record<string, any>;
    
    /**
     * 原始错误（如果有）
     */
    public readonly originalError?: Error;
    
    /**
     * 错误发生时间
     */
    public readonly timestamp: Date;
    
    /**
     * 错误堆栈信息
     */
    public readonly stackTrace: string;

    constructor(
        message: string,
        type: ErrorType,
        code: ErrorCode,
        context?: Record<string, any>,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        originalError?: Error
    ) {
        super(message);
        
        this.name = 'ApplicationError';
        this.type = type;
        this.code = code;
        this.severity = severity;
        this.context = context;
        this.originalError = originalError;
        this.timestamp = new Date();
        this.stackTrace = this.stack || '';

        // 确保错误堆栈信息正确
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApplicationError);
        }
    }

    /**
     * 获取用户友好的错误消息
     */
    public getUserFriendlyMessage(): string {
        const messages: Record<ErrorCode, string> = {
            // 验证错误
            [ErrorCode.EMPTY_MESSAGE]: '消息内容不能为空',
            [ErrorCode.INVALID_DIAGRAM_TYPE]: '不支持的图表类型',
            [ErrorCode.MESSAGE_TOO_LONG]: '消息内容过长，请缩短后重试',
            [ErrorCode.INVALID_INPUT]: '输入内容格式不正确',
            
            // 网络错误
            [ErrorCode.NETWORK_TIMEOUT]: '网络请求超时，请检查网络连接',
            [ErrorCode.API_RATE_LIMIT]: '请求过于频繁，请稍后重试',
            [ErrorCode.CONNECTION_FAILED]: '网络连接失败，请检查网络设置',
            
            // 配置错误
            [ErrorCode.MODEL_NOT_FOUND]: 'AI模型未找到，请检查配置',
            [ErrorCode.ENGINE_NOT_FOUND]: '图表引擎未找到，请检查配置',
            [ErrorCode.CONFIG_INVALID]: '配置信息无效，请检查设置',
            [ErrorCode.MISSING_DEPENDENCY]: '缺少必要的依赖项',
            
            // 运行时错误
            [ErrorCode.UNKNOWN_ERROR]: '发生未知错误，请重试',
            [ErrorCode.OPERATION_FAILED]: '操作失败，请重试',
            [ErrorCode.RESOURCE_NOT_AVAILABLE]: '资源不可用，请稍后重试',
            
            // 引擎错误
            [ErrorCode.ENGINE_NOT_AVAILABLE]: '图表引擎不可用，请检查安装',
            [ErrorCode.RENDER_FAILED]: '图表渲染失败，请检查图表代码',
            [ErrorCode.VALIDATION_FAILED]: '图表验证失败，请检查语法',
            
            // AI模型错误
            [ErrorCode.AI_MODEL_NOT_AVAILABLE]: 'AI模型不可用，请检查配置',
            [ErrorCode.GENERATION_FAILED]: '图表生成失败，请重试',
            [ErrorCode.TOKEN_LIMIT_EXCEEDED]: '内容过长，请缩短描述',
            
            // 状态错误
            [ErrorCode.STATE_INVALID]: '状态信息无效',
            [ErrorCode.STATE_UPDATE_FAILED]: '状态更新失败',
            
            // UI错误
            [ErrorCode.WEBVIEW_CREATION_FAILED]: '界面创建失败',
            [ErrorCode.UI_UPDATE_FAILED]: '界面更新失败',
            
            // 存储错误
            [ErrorCode.STORAGE_ACCESS_FAILED]: '存储访问失败',
            [ErrorCode.DATA_CORRUPTION]: '数据损坏，请重新初始化',
            
            // 权限错误
            [ErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足，请检查设置',
            [ErrorCode.ACCESS_DENIED]: '访问被拒绝，请检查权限'
        };

        return messages[this.code] || this.message;
    }

    /**
     * 获取错误详情信息
     */
    public getErrorDetails(): Record<string, any> {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            code: this.code,
            severity: this.severity,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            stackTrace: this.stackTrace,
            originalError: this.originalError ? {
                name: this.originalError.name,
                message: this.originalError.message,
                stack: this.originalError.stack
            } : undefined
        };
    }

    /**
     * 检查是否为特定类型的错误
     */
    public isType(type: ErrorType): boolean {
        return this.type === type;
    }

    /**
     * 检查是否为特定代码的错误
     */
    public isCode(code: ErrorCode): boolean {
        return this.code === code;
    }

    /**
     * 检查是否为严重错误
     */
    public isCritical(): boolean {
        return this.severity === ErrorSeverity.CRITICAL;
    }

    /**
     * 创建验证错误
     */
    public static validationError(message: string, code: ErrorCode, context?: Record<string, any>): ApplicationError {
        return new ApplicationError(message, ErrorType.VALIDATION_ERROR, code, context, ErrorSeverity.MEDIUM);
    }

    /**
     * 创建网络错误
     */
    public static networkError(message: string, code: ErrorCode, context?: Record<string, any>): ApplicationError {
        return new ApplicationError(message, ErrorType.NETWORK_ERROR, code, context, ErrorSeverity.HIGH);
    }

    /**
     * 创建配置错误
     */
    public static configurationError(message: string, code: ErrorCode, context?: Record<string, any>): ApplicationError {
        return new ApplicationError(message, ErrorType.CONFIGURATION_ERROR, code, context, ErrorSeverity.MEDIUM);
    }

    /**
     * 创建运行时错误
     */
    public static runtimeError(message: string, code: ErrorCode, context?: Record<string, any>, originalError?: Error): ApplicationError {
        return new ApplicationError(message, ErrorType.RUNTIME_ERROR, code, context, ErrorSeverity.HIGH, originalError);
    }

    /**
     * 创建引擎错误
     */
    public static engineError(message: string, code: ErrorCode, context?: Record<string, any>): ApplicationError {
        return new ApplicationError(message, ErrorType.ENGINE_ERROR, code, context, ErrorSeverity.HIGH);
    }

    /**
     * 创建AI模型错误
     */
    public static aiModelError(message: string, code: ErrorCode, context?: Record<string, any>): ApplicationError {
        return new ApplicationError(message, ErrorType.AI_MODEL_ERROR, code, context, ErrorSeverity.HIGH);
    }
} 