/**
 * 错误类型枚举
 * 定义应用程序中所有可能的错误类型
 */

export enum ErrorType {
    // 验证错误 - 输入数据验证失败
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    
    // 网络错误 - 网络请求失败
    NETWORK_ERROR = 'NETWORK_ERROR',
    
    // 配置错误 - 配置相关错误
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
    
    // 运行时错误 - 程序运行时错误
    RUNTIME_ERROR = 'RUNTIME_ERROR',
    
    // 引擎错误 - 图表引擎相关错误
    ENGINE_ERROR = 'ENGINE_ERROR',
    
    // AI模型错误 - AI模型相关错误
    AI_MODEL_ERROR = 'AI_MODEL_ERROR',
    
    // 状态错误 - 状态管理相关错误
    STATE_ERROR = 'STATE_ERROR',
    
    // UI错误 - 用户界面相关错误
    UI_ERROR = 'UI_ERROR',
    
    // 存储错误 - 数据存储相关错误
    STORAGE_ERROR = 'STORAGE_ERROR',
    
    // 权限错误 - 权限相关错误
    PERMISSION_ERROR = 'PERMISSION_ERROR'
}

/**
 * 错误代码枚举
 * 定义具体的错误代码，便于错误定位和处理
 */
export enum ErrorCode {
    // 验证错误代码
    EMPTY_MESSAGE = 'EMPTY_MESSAGE',
    INVALID_DIAGRAM_TYPE = 'INVALID_DIAGRAM_TYPE',
    MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
    INVALID_INPUT = 'INVALID_INPUT',
    
    // 网络错误代码
    NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
    API_RATE_LIMIT = 'API_RATE_LIMIT',
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    
    // 配置错误代码
    MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
    ENGINE_NOT_FOUND = 'ENGINE_NOT_FOUND',
    CONFIG_INVALID = 'CONFIG_INVALID',
    MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
    
    // 运行时错误代码
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    OPERATION_FAILED = 'OPERATION_FAILED',
    RESOURCE_NOT_AVAILABLE = 'RESOURCE_NOT_AVAILABLE',
    
    // 引擎错误代码
    ENGINE_NOT_AVAILABLE = 'ENGINE_NOT_AVAILABLE',
    RENDER_FAILED = 'RENDER_FAILED',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    
    // AI模型错误代码
    AI_MODEL_NOT_AVAILABLE = 'AI_MODEL_NOT_AVAILABLE',
    GENERATION_FAILED = 'GENERATION_FAILED',
    TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED',
    
    // 状态错误代码
    STATE_INVALID = 'STATE_INVALID',
    STATE_UPDATE_FAILED = 'STATE_UPDATE_FAILED',
    
    // UI错误代码
    WEBVIEW_CREATION_FAILED = 'WEBVIEW_CREATION_FAILED',
    UI_UPDATE_FAILED = 'UI_UPDATE_FAILED',
    
    // 存储错误代码
    STORAGE_ACCESS_FAILED = 'STORAGE_ACCESS_FAILED',
    DATA_CORRUPTION = 'DATA_CORRUPTION',
    
    // 权限错误代码
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
    ACCESS_DENIED = 'ACCESS_DENIED'
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
    LOW = 'LOW',           // 低 - 不影响主要功能
    MEDIUM = 'MEDIUM',     // 中 - 影响部分功能
    HIGH = 'HIGH',         // 高 - 影响主要功能
    CRITICAL = 'CRITICAL'  // 严重 - 导致程序崩溃
} 