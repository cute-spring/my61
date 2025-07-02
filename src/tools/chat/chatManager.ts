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
