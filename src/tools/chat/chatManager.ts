/**
 * Chat Manager - Handles chat history and session management
 */

import { ChatMessage, SessionData, DiagramType } from '../uml/types';
import { UML_TEMPLATES } from '../uml/constants';

export class ChatManager {
    private chatHistory: ChatMessage[] = [];
    private currentPlantUML: string = UML_TEMPLATES.DEFAULT_PLANTUML;
    private lastDiagramType: DiagramType = '';

    /**
     * Add a user message to chat history
     */
    addUserMessage(message: string): void {
        this.chatHistory.push({ 
            role: 'user', 
            message, 
            timestamp: Date.now(),
            id: this.generateId()
        });
    }

    /**
     * Add a bot message to chat history
     */
    addBotMessage(message: string): void {
        this.chatHistory.push({ 
            role: 'bot', 
            message, 
            timestamp: Date.now(),
            id: this.generateId()
        });
    }

    /**
     * Add a loading message to indicate processing
     */
    addLoadingMessage(): void {
        this.chatHistory.push({ 
            role: 'bot', 
            message: 'Generating diagram, please wait...',
            timestamp: Date.now(),
            id: 'loading'
        });
    }

    /**
     * Remove the loading message from chat history
     */
    removeLoadingMessage(): boolean {
        const lastIndex = this.chatHistory.length - 1;
        const lastMessage = this.chatHistory[lastIndex];
        if (lastMessage?.message === 'Generating diagram, please wait...') {
            this.chatHistory.splice(lastIndex, 1);
            return true;
        }
        return false;
    }

    /**
     * Edit a user message and remove all subsequent messages
     */
    editUserMessage(index: number, newText: string): void {
        if (index >= 0 && index < this.chatHistory.length && this.chatHistory[index].role === 'user') {
            this.chatHistory[index].message = newText;
            // Remove all messages after this user message
            this.chatHistory = this.chatHistory.slice(0, index + 1);
            
            // Update the current PlantUML to match the last remaining bot message
            this.updatePlantUMLFromLastBotMessage();
        }
    }

    /**
     * Delete a user message and all subsequent messages
     */
    deleteUserMessage(index: number): void {
        if (index >= 0 && index < this.chatHistory.length && this.chatHistory[index].role === 'user') {
            // Remove all messages from this user message onwards
            this.chatHistory = this.chatHistory.slice(0, index);
            
            // Update the current PlantUML to match the last remaining bot message
            this.updatePlantUMLFromLastBotMessage();
        }
    }

    /**
     * Update the current PlantUML based on the last remaining bot message
     */
    private updatePlantUMLFromLastBotMessage(): void {
        // Find the last bot message in the remaining history
        const lastBotMessage = this.chatHistory
            .slice()
            .reverse()
            .find(msg => msg.role === 'bot' && msg.message !== 'Generating diagram, please wait...');
        
        if (lastBotMessage) {
            // Extract PlantUML from the bot message using the proper format
            // The message format is: Explanation + Diagram Type + @startuml...@enduml
            const plantUMLMatch = lastBotMessage.message.match(/@startuml\s*\n([\s\S]*?)\n@enduml/);
            if (plantUMLMatch) {
                this.currentPlantUML = plantUMLMatch[1].trim();
                console.log('Updated PlantUML from last bot message');
            } else {
                // If no PlantUML found in the message, keep the current one
                // This handles cases where the message might be in a different format
                console.log('No PlantUML found in last bot message, keeping current PlantUML');
            }
            
            // Extract diagram type from the bot message
            const diagramTypeMatch = lastBotMessage.message.match(/Diagram Type:\s*([^\n\r]+)/i);
            if (diagramTypeMatch) {
                const type = diagramTypeMatch[1].trim().toLowerCase();
                const typeMap: Record<string, DiagramType> = {
                    'activity': 'activity',
                    'sequence': 'sequence', 
                    'usecase': 'usecase',
                    'use case': 'usecase',
                    'class': 'class',
                    'component': 'component'
                };
                
                for (const [key, value] of Object.entries(typeMap)) {
                    if (type === key || type.includes(key)) {
                        this.lastDiagramType = value;
                        console.log('Updated diagram type from last bot message:', value);
                        break;
                    }
                }
            }
        } else {
            // No bot messages remaining, reset to default
            this.currentPlantUML = UML_TEMPLATES.DEFAULT_PLANTUML;
            this.lastDiagramType = '';
            console.log('No bot messages remaining, reset to default PlantUML and diagram type');
        }
    }

    /**
     * Clear all chat history and reset state
     */
    clearHistory(): void {
        this.chatHistory = [];
        this.currentPlantUML = UML_TEMPLATES.DEFAULT_PLANTUML;
        this.lastDiagramType = '';
    }

    /**
     * Update the current PlantUML diagram
     */
    updatePlantUML(plantUML: string): void {
        this.currentPlantUML = plantUML;
    }

    /**
     * Clear the current PlantUML diagram (reset to default)
     */
    clearPlantUML(): void {
        this.currentPlantUML = UML_TEMPLATES.DEFAULT_PLANTUML;
    }

    /**
     * Update the last diagram type
     */
    updateDiagramType(type: DiagramType): void {
        this.lastDiagramType = type;
    }

    /**
     * Get a copy of chat history to prevent external modification
     */
    getChatHistory(): ChatMessage[] {
        return [...this.chatHistory];
    }

    /**
     * Get the current PlantUML diagram
     */
    getCurrentPlantUML(): string {
        return this.currentPlantUML;
    }

    /**
     * Get the last diagram type
     */
    getLastDiagramType(): DiagramType {
        return this.lastDiagramType;
    }

    /**
     * Get all user messages for context building
     */
    getUserMessages(): string[] {
        return this.chatHistory
            .filter(msg => msg.role === 'user')
            .map(msg => msg.message);
    }

    /**
     * Export current session to a serializable format
     */
    exportSession(): SessionData {
        return {
            version: 1,
            chatHistory: this.getChatHistory(),
            currentPlantUML: this.currentPlantUML,
            lastDiagramType: this.lastDiagramType
        };
    }

    /**
     * Generate a smart filename based on chat content
     */
    generateSmartFilename(): string {
        const userMessages = this.getUserMessages();
        if (userMessages.length === 0) {
            return 'uml-chat-session';
        }

        // Get the first user message as the primary context
        const primaryMessage = userMessages[0];
        
        // Extract key terms for filename
        const keyTerms = this.extractKeyTerms(primaryMessage);
        
        // Get diagram type for context
        const diagramType = this.lastDiagramType || 'diagram';
        
        // Combine terms to create filename
        const filename = this.buildFilename(keyTerms, diagramType);
        
        return filename;
    }

    /**
     * Extract key terms from user message for filename generation
     */
    private extractKeyTerms(message: string): string[] {
        // Remove common words and extract meaningful terms
        const commonWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
            'system', 'process', 'design', 'create', 'show', 'generate', 'make', 'build', 'develop'
        ]);

        // Split message into words and filter
        const words = message.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => 
                word.length > 2 && 
                !commonWords.has(word) &&
                !/^\d+$/.test(word)
            );

        // Return unique words, limited to 3-4 most relevant
        return [...new Set(words)].slice(0, 4);
    }

    /**
     * Build filename from key terms and diagram type
     */
    private buildFilename(keyTerms: string[], diagramType: string): string {
        if (keyTerms.length === 0) {
            return `uml-${diagramType}-session`;
        }

        // Create a descriptive filename
        const baseName = keyTerms.join('-');
        const cleanName = baseName
            .replace(/[^a-zA-Z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        return `${cleanName}-${diagramType}`;
    }

    /**
     * Import session data and restore state
     */
    importSession(data: SessionData): void {
        if (this.validateSessionData(data)) {
            this.chatHistory = data.chatHistory.map(msg => ({
                ...msg,
                id: msg.id || this.generateId()
            }));
            this.currentPlantUML = data.currentPlantUML;
            this.lastDiagramType = (data.lastDiagramType as DiagramType) || '';
        } else {
            throw new Error('Invalid session data format');
        }
    }

    /**
     * Get the number of messages in chat history
     */
    getMessageCount(): number {
        return this.chatHistory.length;
    }

    /**
     * Check if chat history is empty
     */
    isEmpty(): boolean {
        return this.chatHistory.length === 0;
    }

    /**
     * Validate session data structure
     */
    private validateSessionData(data: any): data is SessionData {
        return data && 
               typeof data.version === 'number' &&
               Array.isArray(data.chatHistory) &&
               typeof data.currentPlantUML === 'string' &&
               data.chatHistory.every((msg: any) => 
                   msg && 
                   typeof msg.role === 'string' && 
                   (msg.role === 'user' || msg.role === 'bot') &&
                   typeof msg.message === 'string'
               );
    }

    /**
     * Generate a unique ID for messages
     */
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
