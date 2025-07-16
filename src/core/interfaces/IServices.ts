/**
 * Core service interfaces
 * These interfaces define the contract for various application services
 */

import { IApplicationState } from './IStateManager';
import { IDiagramEngine } from './IDiagramEngine';
import { IAIModel } from './IAIModel';

/**
 * Chat service interface
 */
export interface IChatService {
    /**
     * Send a message to the AI model
     */
    sendMessage(message: string, diagramType?: string): Promise<IChatResponse>;
    
    /**
     * Get chat history
     */
    getHistory(): IChatMessage[];
    
    /**
     * Clear chat history
     */
    clearHistory(): void;
    
    /**
     * Export chat history
     */
    exportHistory(format: 'json' | 'txt' | 'md'): Promise<string>;
}

/**
 * Diagram service interface
 */
export interface IDiagramService {
    /**
     * Generate diagram from code
     */
    generateDiagram(code: string, type: string): Promise<IDiagramResult>;
    
    /**
     * Validate diagram code
     */
    validateCode(code: string, type: string): Promise<IValidationResult>;
    
    /**
     * Export diagram
     */
    exportDiagram(code: string, type: string, format: string): Promise<string>;
    
    /**
     * Get supported diagram types
     */
    getSupportedTypes(): string[];
    
    /**
     * Get diagram preview
     */
    getPreview(code: string, type: string): Promise<string>;
}

/**
 * Analytics service interface
 */
export interface IAnalyticsService {
    /**
     * Track an event
     */
    trackEvent(eventName: string, properties?: Record<string, any>): void;
    
    /**
     * Track user action
     */
    trackUserAction(action: string, context?: Record<string, any>): void;
    
    /**
     * Track diagram generation
     */
    trackDiagramGeneration(type: string, success: boolean, metadata?: Record<string, any>): void;
    
    /**
     * Get analytics data
     */
    getAnalyticsData(): Promise<IAnalyticsData>;
    
    /**
     * Clear analytics data
     */
    clearAnalyticsData(): void;
}

/**
 * Storage service interface
 */
export interface IStorageService {
    /**
     * Save data to storage
     */
    save(key: string, data: any): Promise<void>;
    
    /**
     * Load data from storage
     */
    load<T>(key: string): Promise<T | null>;
    
    /**
     * Delete data from storage
     */
    delete(key: string): Promise<void>;
    
    /**
     * Check if key exists
     */
    exists(key: string): Promise<boolean>;
    
    /**
     * Get all keys
     */
    getKeys(): Promise<string[]>;
}

/**
 * Configuration service interface
 */
export interface IConfigurationService {
    /**
     * Get configuration value
     */
    get<T>(key: string, defaultValue?: T): T;
    
    /**
     * Set configuration value
     */
    set(key: string, value: any): void;
    
    /**
     * Get all configuration
     */
    getAll(): Record<string, any>;
    
    /**
     * Reset configuration to defaults
     */
    reset(): void;
    
    /**
     * Export configuration
     */
    export(): Promise<string>;
    
    /**
     * Import configuration
     */
    import(config: string): Promise<void>;
}

// Response and result types

export interface IChatResponse {
    success: boolean;
    content: string;
    diagramCode?: string;
    diagramType?: string;
    error?: string;
    metadata?: {
        modelUsed: string;
        tokensUsed?: number;
        generationTime?: number;
    };
}

export interface IChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface IDiagramResult {
    success: boolean;
    svg?: string;
    error?: string;
    metadata?: {
        generationTime: number;
        complexityScore?: number;
        validationStatus: 'valid' | 'invalid' | 'warning';
        warnings?: string[];
    };
}

export interface IValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}

export interface IAnalyticsData {
    events: IAnalyticsEvent[];
    userActions: IUserAction[];
    diagramGenerations: IDiagramGeneration[];
    summary: {
        totalEvents: number;
        totalActions: number;
        totalGenerations: number;
        successRate: number;
        averageGenerationTime: number;
    };
}

export interface IAnalyticsEvent {
    name: string;
    timestamp: number;
    properties?: Record<string, any>;
}

export interface IUserAction {
    action: string;
    timestamp: number;
    context?: Record<string, any>;
}

export interface IDiagramGeneration {
    type: string;
    timestamp: number;
    success: boolean;
    generationTime: number;
    metadata?: Record<string, any>;
} 