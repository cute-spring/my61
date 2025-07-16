/**
 * Core interface for state management
 * This interface defines the contract for managing application state
 */

import { DiagramType } from '../../tools/uml/types';

export interface IStateManager {
    /**
     * Get current application state
     */
    getState(): IApplicationState;
    
    /**
     * Update application state
     */
    updateState(updates: Partial<IApplicationState>): void;
    
    /**
     * Subscribe to state changes
     */
    subscribe(callback: (state: IApplicationState) => void): () => void;
    
    /**
     * Save state to persistent storage
     */
    saveState(): Promise<void>;
    
    /**
     * Load state from persistent storage
     */
    loadState(): Promise<void>;
    
    /**
     * Reset state to default values
     */
    resetState(): void;
}

export interface IApplicationState {
    /**
     * Chat-related state
     */
    chat: IChatState;
    
    /**
     * Diagram-related state
     */
    diagram: IDiagramState;
    
    /**
     * UI-related state
     */
    ui: IUIState;
    
    /**
     * User preferences
     */
    preferences: IUserPreferences;
    
    /**
     * Application settings
     */
    settings: IApplicationSettings;
}

export interface IChatState {
    /**
     * Chat history
     */
    messages: IChatMessage[];
    
    /**
     * Current input text
     */
    currentInput: string;
    
    /**
     * Whether chat is currently processing
     */
    isProcessing: boolean;
    
    /**
     * Selected diagram type
     */
    selectedDiagramType: DiagramType;
    
    /**
     * Last used diagram type
     */
    lastUsedDiagramType: DiagramType;
}

export interface IDiagramState {
    /**
     * Current diagram code
     */
    currentCode: string;
    
    /**
     * Current diagram type
     */
    currentType: DiagramType;
    
    /**
     * Current diagram SVG
     */
    currentSVG: string;
    
    /**
     * Whether diagram is loading
     */
    isLoading: boolean;
    
    /**
     * Diagram error if any
     */
    error?: string;
    
    /**
     * Diagram metadata
     */
    metadata?: IDiagramMetadata;
}

export interface IUIState {
    /**
     * Whether chat panel is expanded
     */
    isChatExpanded: boolean;
    
    /**
     * Whether onboarding is active
     */
    isOnboardingActive: boolean;
    
    /**
     * Current onboarding step
     */
    onboardingStep: number;
    
    /**
     * Whether tutorial is visible
     */
    isTutorialVisible: boolean;
    
    /**
     * Zoom level for diagram viewer
     */
    zoomLevel: number;
    
    /**
     * Panel layout (split ratio)
     */
    panelLayout: number;
}

export interface IUserPreferences {
    /**
     * Preferred AI model
     */
    preferredAIModel: string;
    
    /**
     * Preferred diagram engine
     */
    preferredDiagramEngine: string;
    
    /**
     * Auto-save enabled
     */
    autoSave: boolean;
    
    /**
     * Auto-export enabled
     */
    autoExport: boolean;
    
    /**
     * Theme preference
     */
    theme: 'light' | 'dark' | 'auto';
    
    /**
     * Language preference
     */
    language: string;
}

export interface IApplicationSettings {
    /**
     * Application version
     */
    version: string;
    
    /**
     * Last update check
     */
    lastUpdateCheck: number;
    
    /**
     * Whether to show welcome message
     */
    showWelcome: boolean;
    
    /**
     * Whether to show analytics
     */
    showAnalytics: boolean;
    
    /**
     * Debug mode enabled
     */
    debugMode: boolean;
}

export interface IChatMessage {
    /**
     * Message ID
     */
    id: string;
    
    /**
     * Message role
     */
    role: 'user' | 'assistant' | 'system';
    
    /**
     * Message content
     */
    content: string;
    
    /**
     * Message timestamp
     */
    timestamp: number;
    
    /**
     * Message metadata
     */
    metadata?: {
        diagramType?: DiagramType;
        diagramCode?: string;
        tokensUsed?: number;
        modelUsed?: string;
        [key: string]: any;
    };
}

export interface IDiagramMetadata {
    /**
     * Generation timestamp
     */
    generatedAt: number;
    
    /**
     * Generation time in milliseconds
     */
    generationTime: number;
    
    /**
     * Model used for generation
     */
    modelUsed?: string;
    
    /**
     * Tokens used for generation
     */
    tokensUsed?: number;
    
    /**
     * Diagram complexity score
     */
    complexityScore?: number;
    
    /**
     * Diagram validation status
     */
    validationStatus: 'valid' | 'invalid' | 'warning';
    
    /**
     * Validation warnings
     */
    validationWarnings?: string[];
}

/**
 * State change event
 */
export interface IStateChangeEvent {
    /**
     * Previous state
     */
    previousState: IApplicationState;
    
    /**
     * Current state
     */
    currentState: IApplicationState;
    
    /**
     * Changed properties
     */
    changedProperties: string[];
    
    /**
     * Timestamp of change
     */
    timestamp: number;
} 