/**
 * Engine Manager - Manages multiple diagram engines
 * Provides a unified interface for working with different diagram engines
 */

import { IDiagramEngine, IDiagramGenerationResult, IValidationResult, IConfigurationStatus } from '../interfaces/IDiagramEngine';
import { DiagramType } from '../../tools/uml/types';

export class EngineManager {
    private static instance: EngineManager;
    private engines: Map<string, IDiagramEngine> = new Map();
    private defaultEngine: string | null = null;
    
    private constructor() {}
    
    /**
     * Get singleton instance
     */
    static getInstance(): EngineManager {
        if (!EngineManager.instance) {
            EngineManager.instance = new EngineManager();
        }
        return EngineManager.instance;
    }
    
    /**
     * Register a diagram engine
     */
    registerEngine(engine: IDiagramEngine): void {
        this.engines.set(engine.id, engine);
        console.log(`[EngineManager] Registered engine: ${engine.name} (${engine.id})`);
        
        // Set as default if it's the first engine
        if (!this.defaultEngine) {
            this.defaultEngine = engine.id;
        }
    }
    
    /**
     * Unregister a diagram engine
     */
    unregisterEngine(engineId: string): boolean {
        const engine = this.engines.get(engineId);
        if (engine) {
            this.engines.delete(engineId);
            console.log(`[EngineManager] Unregistered engine: ${engine.name} (${engineId})`);
            
            // Update default engine if needed
            if (this.defaultEngine === engineId) {
                const nextEngine = this.engines.keys().next();
                this.defaultEngine = nextEngine.done ? null : nextEngine.value;
            }
            
            return true;
        }
        return false;
    }
    
    /**
     * Get engine by ID
     */
    getEngine(engineId: string): IDiagramEngine | undefined {
        return this.engines.get(engineId);
    }
    
    /**
     * Get all registered engines
     */
    getAllEngines(): IDiagramEngine[] {
        return Array.from(this.engines.values());
    }
    
    /**
     * Get available engines (configured and ready)
     */
    async getAvailableEngines(): Promise<IDiagramEngine[]> {
        const availableEngines: IDiagramEngine[] = [];
        
        for (const engine of this.engines.values()) {
            if (await engine.isAvailable()) {
                availableEngines.push(engine);
            }
        }
        
        return availableEngines;
    }
    
    /**
     * Get engines that support a specific diagram type
     */
    async getEnginesForDiagramType(diagramType: DiagramType): Promise<IDiagramEngine[]> {
        const availableEngines = await this.getAvailableEngines();
        return availableEngines.filter(engine => 
            engine.supportedTypes.includes(diagramType)
        );
    }
    
    /**
     * Set default engine
     */
    setDefaultEngine(engineId: string): boolean {
        if (this.engines.has(engineId)) {
            this.defaultEngine = engineId;
            console.log(`[EngineManager] Set default engine: ${engineId}`);
            return true;
        }
        return false;
    }
    
    /**
     * Get default engine
     */
    getDefaultEngine(): IDiagramEngine | undefined {
        return this.defaultEngine ? this.engines.get(this.defaultEngine) : undefined;
    }
    
    /**
     * Generate diagram using the best available engine
     */
    async generateDiagram(
        requirement: string,
        diagramType: DiagramType,
        preferredEngineId?: string,
        context?: string[]
    ): Promise<IDiagramGenerationResult> {
        // Try preferred engine first
        if (preferredEngineId) {
            const preferredEngine = this.engines.get(preferredEngineId);
            if (preferredEngine && await preferredEngine.isAvailable()) {
                if (preferredEngine.supportedTypes.includes(diagramType)) {
                    console.log(`[EngineManager] Using preferred engine: ${preferredEngine.name}`);
                    return await preferredEngine.generateDiagram(requirement, diagramType, context);
                }
            }
        }
        
        // Try default engine
        const defaultEngine = this.getDefaultEngine();
        if (defaultEngine && await defaultEngine.isAvailable()) {
            if (defaultEngine.supportedTypes.includes(diagramType)) {
                console.log(`[EngineManager] Using default engine: ${defaultEngine.name}`);
                return await defaultEngine.generateDiagram(requirement, diagramType, context);
            }
        }
        
        // Try any available engine that supports the diagram type
        const availableEngines = await this.getEnginesForDiagramType(diagramType);
        if (availableEngines.length > 0) {
            const engine = availableEngines[0];
            console.log(`[EngineManager] Using available engine: ${engine.name}`);
            return await engine.generateDiagram(requirement, diagramType, context);
        }
        
        throw new Error(`No available engine found for diagram type: ${diagramType}`);
    }
    
    /**
     * Render diagram using the best available engine
     */
    async renderDiagram(
        diagramCode: string,
        preferredEngineId?: string
    ): Promise<string> {
        // Try preferred engine first
        if (preferredEngineId) {
            const preferredEngine = this.engines.get(preferredEngineId);
            if (preferredEngine && await preferredEngine.isAvailable()) {
                console.log(`[EngineManager] Rendering with preferred engine: ${preferredEngine.name}`);
                return await preferredEngine.renderToSVG(diagramCode);
            }
        }
        
        // Try default engine
        const defaultEngine = this.getDefaultEngine();
        if (defaultEngine && await defaultEngine.isAvailable()) {
            console.log(`[EngineManager] Rendering with default engine: ${defaultEngine.name}`);
            return await defaultEngine.renderToSVG(diagramCode);
        }
        
        // Try any available engine
        const availableEngines = await this.getAvailableEngines();
        if (availableEngines.length > 0) {
            const engine = availableEngines[0];
            console.log(`[EngineManager] Rendering with available engine: ${engine.name}`);
            return await engine.renderToSVG(diagramCode);
        }
        
        throw new Error('No available engine found for rendering');
    }
    
    /**
     * Validate diagram using the best available engine
     */
    async validateDiagram(
        diagramCode: string,
        preferredEngineId?: string
    ): Promise<IValidationResult> {
        // Try preferred engine first
        if (preferredEngineId) {
            const preferredEngine = this.engines.get(preferredEngineId);
            if (preferredEngine && await preferredEngine.isAvailable()) {
                return await preferredEngine.validateDiagram(diagramCode);
            }
        }
        
        // Try default engine
        const defaultEngine = this.getDefaultEngine();
        if (defaultEngine && await defaultEngine.isAvailable()) {
            return await defaultEngine.validateDiagram(diagramCode);
        }
        
        // Try any available engine
        const availableEngines = await this.getAvailableEngines();
        if (availableEngines.length > 0) {
            const engine = availableEngines[0];
            return await engine.validateDiagram(diagramCode);
        }
        
        return {
            isValid: false,
            error: 'No available engine found for validation'
        };
    }
    
    /**
     * Get configuration status for all engines
     */
    async getConfigurationStatus(): Promise<Map<string, IConfigurationStatus>> {
        const status = new Map<string, IConfigurationStatus>();
        
        for (const [engineId, engine] of this.engines) {
            status.set(engineId, engine.getConfigurationStatus());
        }
        
        return status;
    }
    
    /**
     * Get engine statistics
     */
    getEngineStats(): {
        totalEngines: number;
        availableEngines: number;
        defaultEngine: string | null;
        supportedDiagramTypes: DiagramType[];
    } {
        const supportedTypes = new Set<DiagramType>();
        
        for (const engine of this.engines.values()) {
            engine.supportedTypes.forEach(type => supportedTypes.add(type));
        }
        
        return {
            totalEngines: this.engines.size,
            availableEngines: 0, // Will be updated when getAvailableEngines is called
            defaultEngine: this.defaultEngine,
            supportedDiagramTypes: Array.from(supportedTypes)
        };
    }
    
    /**
     * Clear all engines
     */
    clearEngines(): void {
        this.engines.clear();
        this.defaultEngine = null;
        console.log('[EngineManager] Cleared all engines');
    }
} 