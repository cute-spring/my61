/**
 * Core interface for diagram engines
 * This interface defines the contract that all diagram engines must implement
 */

import { DiagramType } from '../../tools/uml/types';

export interface IDiagramEngine {
    /**
     * Unique identifier for the engine
     */
    readonly id: string;
    
    /**
     * Display name for the engine
     */
    readonly name: string;
    
    /**
     * Supported diagram types by this engine
     */
    readonly supportedTypes: DiagramType[];
    
    /**
     * Check if the engine is available and properly configured
     */
    isAvailable(): Promise<boolean>;
    
    /**
     * Generate diagram code from user requirement
     */
    generateDiagram(
        requirement: string,
        diagramType: DiagramType,
        context?: string[]
    ): Promise<IDiagramGenerationResult>;
    
    /**
     * Render diagram code to SVG
     */
    renderToSVG(diagramCode: string): Promise<string>;
    
    /**
     * Validate diagram code
     */
    validateDiagram(diagramCode: string): Promise<IValidationResult>;
    
    /**
     * Get engine configuration status
     */
    getConfigurationStatus(): IConfigurationStatus;
}

export interface IDiagramGenerationResult {
    /**
     * Generated diagram code
     */
    code: string;
    
    /**
     * Diagram type that was generated
     */
    diagramType: DiagramType;
    
    /**
     * Explanation of the generated diagram
     */
    explanation: string;
    
    /**
     * Any warnings or additional information
     */
    warnings?: string[];
    
    /**
     * Generation metadata
     */
    metadata?: {
        generationTime: number;
        modelUsed?: string;
        tokensUsed?: number;
    };
}

export interface IValidationResult {
    /**
     * Whether the diagram code is valid
     */
    isValid: boolean;
    
    /**
     * Error message if validation failed
     */
    error?: string;
    
    /**
     * Warning messages
     */
    warnings?: string[];
}

export interface IConfigurationStatus {
    /**
     * Whether the engine is properly configured
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
}

/**
 * Engine capabilities and features
 */
export interface IEngineCapabilities {
    /**
     * Whether the engine supports real-time preview
     */
    supportsRealTimePreview: boolean;
    
    /**
     * Whether the engine supports interactive editing
     */
    supportsInteractiveEditing: boolean;
    
    /**
     * Whether the engine supports export to multiple formats
     */
    supportedExportFormats: string[];
    
    /**
     * Whether the engine supports collaborative features
     */
    supportsCollaboration: boolean;
} 