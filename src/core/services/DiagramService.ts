import { IDiagramService, IDiagramResult, IValidationResult } from '../interfaces/IServices';
import { StateManager } from '../managers/StateManager';
import { EngineManager } from '../managers/EngineManager';
import { DiagramType } from '../../tools/uml/types';

export class DiagramService implements IDiagramService {
    private stateManager: StateManager;
    private engineManager: EngineManager;

    constructor() {
        this.stateManager = StateManager.getInstance();
        this.engineManager = EngineManager.getInstance();
    }

    public async generateDiagram(code: string, type: string): Promise<IDiagramResult> {
        try {
            const diagramType = type as DiagramType;
            this.stateManager.setDiagramLoading(true);
            this.stateManager.setDiagramError(undefined);

            // Get current engine preference
            const state = this.stateManager.getState();
            const preferredEngine = state.preferences.preferredDiagramEngine;

            // Generate diagram using engine manager
            const startTime = Date.now();
            const result = await this.engineManager.renderDiagram(code, preferredEngine);
            const generationTime = Date.now() - startTime;

            // Update state
            this.stateManager.setCurrentCode(code);
            this.stateManager.setDiagramLoading(false);

            return {
                success: true,
                svg: result,
                metadata: {
                    generationTime,
                    validationStatus: 'valid'
                }
            };

        } catch (error) {
            this.stateManager.setDiagramLoading(false);
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.stateManager.setDiagramError(errorMessage);
            console.error('Diagram generation error:', error);

            return {
                success: false,
                error: errorMessage,
                metadata: {
                    generationTime: 0,
                    validationStatus: 'invalid'
                }
            };
        }
    }

    public async validateCode(code: string, type: string): Promise<IValidationResult> {
        try {
            const diagramType = type as DiagramType;
            
            // Get current engine preference
            const state = this.stateManager.getState();
            const preferredEngine = state.preferences.preferredDiagramEngine;

            // Validate using engine manager
            const result = await this.engineManager.validateDiagram(code, preferredEngine);

            return {
                isValid: result.isValid,
                errors: result.error ? [result.error] : [],
                warnings: result.warnings || [],
                suggestions: [] // Not supported by current interface
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Diagram validation error:', error);

            return {
                isValid: false,
                errors: [errorMessage],
                warnings: [],
                suggestions: []
            };
        }
    }



    public getSupportedTypes(): string[] {
        const engines = this.engineManager.getAllEngines();
        const supportedTypes = new Set<string>();
        
        engines.forEach(engine => {
            engine.supportedTypes.forEach(type => supportedTypes.add(type));
        });
        
        return Array.from(supportedTypes);
    }

    public async getPreview(code: string, type: string): Promise<string> {
        try {
            const diagramType = type as DiagramType;
            
            // Get current engine preference
            const state = this.stateManager.getState();
            const preferredEngine = state.preferences.preferredDiagramEngine;

            // Generate preview using engine manager
            const result = await this.engineManager.renderDiagram(code, preferredEngine);
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Diagram preview error:', error);
            throw new Error(`Failed to generate preview: ${errorMessage}`);
        }
    }
} 