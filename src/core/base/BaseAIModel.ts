import { 
    IAIModel, 
    IAIModelOptions, 
    IAIModelResponse, 
    IAIMessage,
    IModelConfigurationStatus,
    IModelCapabilities
} from '../interfaces/IAIModel';

export abstract class BaseAIModel implements IAIModel {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly provider: string;

    abstract isAvailable(): Promise<boolean>;
    abstract sendRequest(
        messages: IAIMessage[],
        options?: IAIModelOptions
    ): Promise<IAIModelResponse>;
    abstract getConfigurationStatus(): IModelConfigurationStatus;
    abstract getCapabilities(): IModelCapabilities;

    protected createResponse(
        content: string,
        metadata?: {
            modelUsed: string;
            tokensUsed?: number;
            generationTime?: number;
            finishReason?: string;
        },
        warnings?: string[]
    ): IAIModelResponse {
        return {
            content,
            metadata,
            warnings
        };
    }

    protected handleError(error: any, context: string): IAIModelResponse {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${this.name}] ${context}:`, error);
        
        return this.createResponse(
            '',
            { modelUsed: this.name, finishReason: 'error' },
            [`${context}: ${errorMessage}`]
        );
    }

    protected createMessage(
        role: 'user' | 'assistant' | 'system',
        content: string,
        metadata?: any
    ): IAIMessage {
        return {
            role,
            content,
            metadata: {
                timestamp: Date.now(),
                ...metadata
            }
        };
    }
} 