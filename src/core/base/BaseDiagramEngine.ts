/**
 * Base abstract class for diagram engines
 * Provides common functionality and enforces interface contract
 */

import { IDiagramEngine, IDiagramGenerationResult, IValidationResult, IConfigurationStatus } from '../interfaces/IDiagramEngine';
import { DiagramType } from '../../tools/uml/types';

export abstract class BaseDiagramEngine implements IDiagramEngine {
    /**
     * Engine identifier
     */
    abstract readonly id: string;
    
    /**
     * Engine display name
     */
    abstract readonly name: string;
    
    /**
     * Supported diagram types
     */
    abstract readonly supportedTypes: DiagramType[];
    
    /**
     * Engine capabilities
     */
    protected abstract capabilities: {
        supportsRealTimePreview: boolean;
        supportsInteractiveEditing: boolean;
        supportedExportFormats: string[];
        supportsCollaboration: boolean;
    };
    
    /**
     * Check if the engine is available and properly configured
     */
    abstract isAvailable(): Promise<boolean>;
    
    /**
     * Generate diagram code from user requirement
     */
    abstract generateDiagram(
        requirement: string,
        diagramType: DiagramType,
        context?: string[]
    ): Promise<IDiagramGenerationResult>;
    
    /**
     * Render diagram code to SVG
     */
    abstract renderToSVG(diagramCode: string): Promise<string>;
    
    /**
     * Validate diagram code
     */
    abstract validateDiagram(diagramCode: string): Promise<IValidationResult>;
    
    /**
     * Get engine configuration status
     */
    abstract getConfigurationStatus(): IConfigurationStatus;
    
    /**
     * Get engine capabilities
     */
    getCapabilities() {
        return this.capabilities;
    }
    
    /**
     * Check if diagram type is supported
     */
    isDiagramTypeSupported(diagramType: DiagramType): boolean {
        return this.supportedTypes.includes(diagramType);
    }
    
    /**
     * Get supported export formats
     */
    getSupportedExportFormats(): string[] {
        return this.capabilities.supportedExportFormats;
    }
    
    /**
     * Check if real-time preview is supported
     */
    supportsRealTimePreview(): boolean {
        return this.capabilities.supportsRealTimePreview;
    }
    
    /**
     * Check if interactive editing is supported
     */
    supportsInteractiveEditing(): boolean {
        return this.capabilities.supportsInteractiveEditing;
    }
    
    /**
     * Check if collaboration is supported
     */
    supportsCollaboration(): boolean {
        return this.capabilities.supportsCollaboration;
    }
    
    /**
     * Validate diagram type before generation
     */
    protected validateDiagramType(diagramType: DiagramType): void {
        if (!this.isDiagramTypeSupported(diagramType)) {
            throw new Error(`Diagram type '${diagramType}' is not supported by engine '${this.name}'`);
        }
    }
    
    /**
     * Validate requirement input
     */
    protected validateRequirement(requirement: string): void {
        if (!requirement || requirement.trim().length === 0) {
            throw new Error('Requirement cannot be empty');
        }
        
        if (requirement.length > 10000) {
            throw new Error('Requirement is too long (maximum 10,000 characters)');
        }
    }
    
    /**
     * Create a basic validation result
     */
    protected createValidationResult(
        isValid: boolean,
        error?: string,
        warnings?: string[]
    ): IValidationResult {
        return {
            isValid,
            error,
            warnings
        };
    }
    
    /**
     * Create a basic configuration status
     */
    protected createConfigurationStatus(
        isConfigured: boolean,
        issues?: string[],
        setupInstructions?: string[]
    ): IConfigurationStatus {
        return {
            isConfigured,
            issues,
            setupInstructions
        };
    }
    
    /**
     * Create a basic generation result
     */
    protected createGenerationResult(
        code: string,
        diagramType: DiagramType,
        explanation: string,
        warnings?: string[],
        metadata?: any
    ): IDiagramGenerationResult {
        return {
            code,
            diagramType,
            explanation,
            warnings,
            metadata: {
                generationTime: Date.now(),
                ...metadata
            }
        };
    }
    
    /**
     * Log engine activity
     */
    protected logActivity(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
        const logMessage = `[${this.name}] ${message}`;
        
        switch (level) {
            case 'info':
                console.log(logMessage, data);
                break;
            case 'warn':
                console.warn(logMessage, data);
                break;
            case 'error':
                console.error(logMessage, data);
                break;
        }
    }
    
    /**
     * Measure execution time
     */
    protected async measureExecutionTime<T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        const startTime = Date.now();
        
        try {
            const result = await operation();
            const executionTime = Date.now() - startTime;
            
            this.logActivity('info', `${operationName} completed in ${executionTime}ms`);
            
            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            this.logActivity('error', `${operationName} failed after ${executionTime}ms`, error);
            
            throw error;
        }
    }
} 