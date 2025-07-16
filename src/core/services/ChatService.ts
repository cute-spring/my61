import { IChatService, IChatResponse, IChatMessage } from '../interfaces/IServices';
import { StateManager } from '../managers/StateManager';
import { EngineManager } from '../managers/EngineManager';
import { IAIModel } from '../interfaces/IAIModel';
import { v4 as uuidv4 } from 'uuid';

export class ChatService implements IChatService {
    private stateManager: StateManager;
    private engineManager: EngineManager;
    private aiModels: Map<string, IAIModel> = new Map();

    constructor() {
        this.stateManager = StateManager.getInstance();
        this.engineManager = EngineManager.getInstance();
    }

    public registerAIModel(model: IAIModel): void {
        this.aiModels.set(model.id, model);
        console.log(`[ChatService] Registered AI model: ${model.name} (${model.id})`);
    }

    public getAIModel(modelId: string): IAIModel | undefined {
        return this.aiModels.get(modelId);
    }

    public async sendMessage(message: string, diagramType?: string): Promise<IChatResponse> {
        try {
            // Update state to show processing
            this.stateManager.setProcessing(true);
            this.stateManager.setCurrentInput(message);

            // Add user message to history
            const userMessage: IChatMessage = {
                id: uuidv4(),
                role: 'user',
                content: message,
                timestamp: Date.now(),
                metadata: { diagramType }
            };
            this.stateManager.addMessage(userMessage);

            // Get current AI model
            const state = this.stateManager.getState();
            const currentModel = state.preferences.preferredAIModel;
            
            // Get AI model
            const aiModel = this.getAIModel(currentModel);
            if (!aiModel) {
                throw new Error(`AI model '${currentModel}' not found`);
            }

            // Check if model is available
            const isAvailable = await aiModel.isAvailable();
            if (!isAvailable) {
                throw new Error(`AI model '${currentModel}' is not available`);
            }

            // Create system message for diagram generation
            const systemMessage = this.createSystemMessage(diagramType);
            
            // Send request to AI model
            const startTime = Date.now();
            const response = await aiModel.sendRequest([
                { role: 'system', content: systemMessage },
                { role: 'user', content: message }
            ]);
            const generationTime = Date.now() - startTime;

            // Parse response for diagram code
            const { diagramCode, content } = this.parseAIResponse(response.content);

            // Add assistant message to history
            const assistantMessage: IChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: response.content,
                timestamp: Date.now(),
                metadata: {
                    diagramType,
                    diagramCode,
                    modelUsed: currentModel,
                    generationTime,
                    tokensUsed: response.metadata?.tokensUsed
                }
            };
            this.stateManager.addMessage(assistantMessage);

            // Update state
            this.stateManager.setProcessing(false);
            this.stateManager.setCurrentInput('');

            return {
                success: true,
                content: response.content,
                diagramCode,
                diagramType,
                metadata: {
                    modelUsed: currentModel,
                    tokensUsed: response.metadata?.tokensUsed,
                    generationTime
                }
            };

        } catch (error) {
            this.stateManager.setProcessing(false);
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Chat service error:', error);

            return {
                success: false,
                content: '',
                error: errorMessage
            };
        }
    }

    public getHistory(): IChatMessage[] {
        const state = this.stateManager.getState();
        return state.chat.messages.map(msg => ({
            id: msg.id,
            role: msg.role === 'system' ? 'user' : msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata
        }));
    }

    public clearHistory(): void {
        const state = this.stateManager.getState();
        this.stateManager.updateState({
            chat: { ...state.chat, messages: [] }
        });
    }

    public async exportHistory(format: 'json' | 'txt' | 'md'): Promise<string> {
        const history = this.getHistory();
        
        switch (format) {
            case 'json':
                return JSON.stringify(history, null, 2);
            
            case 'txt':
                return history.map(msg => 
                    `[${new Date(msg.timestamp).toISOString()}] ${msg.role.toUpperCase()}: ${msg.content}`
                ).join('\n\n');
            
            case 'md':
                return history.map(msg => 
                    `### ${msg.role === 'user' ? '👤 User' : '🤖 Assistant'} - ${new Date(msg.timestamp).toLocaleString()}\n\n${msg.content}`
                ).join('\n\n---\n\n');
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    private createSystemMessage(diagramType?: string): string {
        const baseMessage = `You are an expert UML diagram designer. Your task is to help users create clear, accurate, and well-structured UML diagrams.`;

        if (diagramType) {
            return `${baseMessage} The user wants to create a ${diagramType} diagram. Please provide the diagram code in the appropriate format.`;
        }

        return `${baseMessage} When the user requests a diagram, determine the most appropriate diagram type and provide the code.`;
    }

    private parseAIResponse(content: string): { diagramCode?: string; content: string } {
        // Look for code blocks in the response
        const codeBlockRegex = /```(?:plantuml|mermaid|puml)?\s*\n([\s\S]*?)\n```/gi;
        const matches = Array.from(content.matchAll(codeBlockRegex));
        
        if (matches.length > 0) {
            const diagramCode = matches[0][1].trim();
            return { diagramCode, content };
        }

        // If no code block found, return the content as-is
        return { content };
    }
} 