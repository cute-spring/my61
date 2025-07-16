/**
 * Core interface for AI models
 * This interface defines the contract that all AI models must implement
 */

export interface IAIModel {
    /**
     * Unique identifier for the model
     */
    readonly id: string;
    
    /**
     * Display name for the model
     */
    readonly name: string;
    
    /**
     * Model provider (e.g., 'copilot', 'openai', 'anthropic')
     */
    readonly provider: string;
    
    /**
     * Check if the model is available and properly configured
     */
    isAvailable(): Promise<boolean>;
    
    /**
     * Send a request to the AI model
     */
    sendRequest(
        messages: IAIMessage[],
        options?: IAIModelOptions
    ): Promise<IAIModelResponse>;
    
    /**
     * Get model configuration status
     */
    getConfigurationStatus(): IModelConfigurationStatus;
    
    /**
     * Get model capabilities
     */
    getCapabilities(): IModelCapabilities;
}

export interface IAIMessage {
    /**
     * Message role (user, assistant, system)
     */
    role: 'user' | 'assistant' | 'system';
    
    /**
     * Message content
     */
    content: string;
    
    /**
     * Optional message metadata
     */
    metadata?: {
        timestamp?: number;
        messageId?: string;
        [key: string]: any;
    };
}

export interface IAIModelOptions {
    /**
     * Maximum tokens to generate
     */
    maxTokens?: number;
    
    /**
     * Temperature for response randomness (0-1)
     */
    temperature?: number;
    
    /**
     * Top-p sampling parameter
     */
    topP?: number;
    
    /**
     * Whether to stream the response
     */
    stream?: boolean;
    
    /**
     * Custom model parameters
     */
    customParams?: Record<string, any>;
}

export interface IAIModelResponse {
    /**
     * Generated text content
     */
    content: string;
    
    /**
     * Response metadata
     */
    metadata?: {
        modelUsed: string;
        tokensUsed?: number;
        generationTime?: number;
        finishReason?: string;
    };
    
    /**
     * Any warnings or additional information
     */
    warnings?: string[];
}

export interface IModelConfigurationStatus {
    /**
     * Whether the model is properly configured
     */
    isConfigured: boolean;
    
    /**
     * Configuration issues if any
     */
    issues?: string[];
    
    /**
     * Setup instructions for the user
     */
    setupInstructions?: string[];
    
    /**
     * API key status
     */
    apiKeyStatus?: 'configured' | 'missing' | 'invalid';
}

export interface IModelCapabilities {
    /**
     * Maximum input tokens supported
     */
    maxInputTokens: number;
    
    /**
     * Maximum output tokens supported
     */
    maxOutputTokens: number;
    
    /**
     * Supported message roles
     */
    supportedRoles: ('user' | 'assistant' | 'system')[];
    
    /**
     * Whether the model supports streaming
     */
    supportsStreaming: boolean;
    
    /**
     * Whether the model supports function calling
     */
    supportsFunctionCalling: boolean;
    
    /**
     * Whether the model supports vision (image input)
     */
    supportsVision: boolean;
    
    /**
     * Supported languages
     */
    supportedLanguages: string[];
}

/**
 * AI model factory interface
 */
export interface IAIModelFactory {
    /**
     * Create an AI model instance
     */
    createModel(modelId: string, options?: any): Promise<IAIModel>;
    
    /**
     * Get available models
     */
    getAvailableModels(): Promise<IAIModelInfo[]>;
    
    /**
     * Get model information
     */
    getModelInfo(modelId: string): Promise<IAIModelInfo | null>;
}

export interface IAIModelInfo {
    /**
     * Model identifier
     */
    id: string;
    
    /**
     * Model display name
     */
    name: string;
    
    /**
     * Model provider
     */
    provider: string;
    
    /**
     * Model description
     */
    description: string;
    
    /**
     * Model capabilities
     */
    capabilities: IModelCapabilities;
    
    /**
     * Whether the model is available
     */
    isAvailable: boolean;
} 