/**
 * Generator Factory - Creates and manages different diagram generators
 */

import { UMLGenerator } from './generator';
import { MermaidGenerator } from './mermaidGenerator';
import { UMLRenderer } from './renderer';
import { MermaidRenderer } from './mermaidRenderer';
import { DiagramType, UMLGenerationResponse } from './types';

export type EngineType = 'plantuml' | 'mermaid';

export interface IGenerator {
    generateFromRequirement(
        requirement: string, 
        history: string[], 
        diagramType?: DiagramType
    ): Promise<UMLGenerationResponse>;
    
    generateSmartFilename(
        userMessages: string[], 
        diagramType?: DiagramType
    ): Promise<string>;
}

export interface IRenderer {
    renderToSVG(code: string): Promise<string>;
    openMermaidPreview?(code: string, title?: string): Promise<void>;
}

export class GeneratorFactory {
    private static instance: GeneratorFactory;
    private generators: Map<EngineType, IGenerator> = new Map();
    private renderers: Map<EngineType, IRenderer> = new Map();

    private constructor() {
        this.initializeGenerators();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): GeneratorFactory {
        if (!GeneratorFactory.instance) {
            GeneratorFactory.instance = new GeneratorFactory();
        }
        return GeneratorFactory.instance;
    }

    /**
     * Initialize generators
     */
    private initializeGenerators(): void {
        // Initialize PlantUML generator and renderer
        this.generators.set('plantuml', new UMLGenerator());
        this.renderers.set('plantuml', new UMLRenderer());

        // Initialize Mermaid generator and renderer
        this.generators.set('mermaid', new MermaidGenerator());
        this.renderers.set('mermaid', new MermaidRenderer());
    }

    /**
     * Get generator for specified engine type
     */
    getGenerator(engineType: EngineType): IGenerator {
        const generator = this.generators.get(engineType);
        if (!generator) {
            throw new Error(`Generator not found for engine type: ${engineType}`);
        }
        return generator;
    }

    /**
     * Get renderer for specified engine type
     */
    getRenderer(engineType: EngineType): IRenderer {
        const renderer = this.renderers.get(engineType);
        if (!renderer) {
            throw new Error(`Renderer not found for engine type: ${engineType}`);
        }
        return renderer;
    }

    /**
     * Generate diagram using specified engine
     */
    async generateDiagram(
        engineType: EngineType,
        requirement: string,
        history: string[],
        diagramType?: DiagramType
    ): Promise<UMLGenerationResponse> {
        const generator = this.getGenerator(engineType);
        return await generator.generateFromRequirement(requirement, history, diagramType);
    }

    /**
     * Render diagram using specified engine
     */
    async renderDiagram(
        engineType: EngineType,
        code: string
    ): Promise<string> {
        const renderer = this.getRenderer(engineType);
        return await renderer.renderToSVG(code);
    }

    /**
     * Open Mermaid preview panel (only works for Mermaid engine)
     */
    async openMermaidPreview(
        engineType: EngineType,
        code: string,
        title?: string
    ): Promise<void> {
        if (engineType !== 'mermaid') {
            throw new Error('Mermaid preview is only available for Mermaid engine');
        }
        
        const renderer = this.getRenderer(engineType) as MermaidRenderer;
        if (renderer.openMermaidPreview) {
            await renderer.openMermaidPreview(code, title);
        } else {
            throw new Error('Mermaid preview not supported by renderer');
        }
    }

    /**
     * Get available engine types
     */
    getAvailableEngines(): EngineType[] {
        return Array.from(this.generators.keys());
    }

    /**
     * Check if engine type is supported
     */
    isEngineSupported(engineType: string): engineType is EngineType {
        return this.generators.has(engineType as EngineType);
    }

    /**
     * Get default engine type
     */
    getDefaultEngine(): EngineType {
        return 'plantuml';
    }

    /**
     * Validate engine type and return default if invalid
     */
    validateEngineType(engineType: string): EngineType {
        if (this.isEngineSupported(engineType)) {
            return engineType as EngineType;
        }
        console.warn(`Unsupported engine type: ${engineType}, falling back to default`);
        return this.getDefaultEngine();
    }
} 