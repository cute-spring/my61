import { EngineStrategy, EngineRequirements, RenderOptions, RenderResult } from './strategy/engineStrategy';
import { FeatureFlagManager } from '../config/featureFlags';
import { MermaidEngine } from './engines/mermaidEngine';

export class EngineManager {
  private engines: Map<string, EngineStrategy> = new Map();
  private featureFlags: FeatureFlagManager;
  private isInitialized: boolean = false;

  constructor() {
    this.featureFlags = FeatureFlagManager.getInstance();
    this.registerDefaultEngines();
  }

  /**
   * Register default engines safely
   */
  private registerDefaultEngines(): void {
    try {
      // Always register PlantUML engine first (existing functionality)
      this.registerEngine({
        id: 'plantuml',
        name: 'PlantUML',
        description: 'PlantUML diagram rendering engine',
        capabilities: {
          supportsDiagramType: (diagramType: string) => {
            const plantUMLFormats = ['activity', 'sequence', 'class', 'component', 'usecase'];
            return plantUMLFormats.includes(diagramType.toLowerCase());
          },
          supportsFeature: (feature: string) => {
            const supportedFeatures = ['svg', 'png', 'pdf', 'themes'];
            return supportedFeatures.includes(feature.toLowerCase());
          },
          getPerformanceMetrics: () => ({
            averageRenderTime: 0,
            memoryUsage: 0,
            successRate: 1.0,
            lastUsed: new Date(),
            totalRenders: 0
          }),
          getQualityScore: () => 1.0
        },
        canHandle: (diagramType: string, requirements: any) => {
          const plantUMLFormats = ['activity', 'sequence', 'class', 'component', 'usecase'];
          return plantUMLFormats.includes(diagramType.toLowerCase());
        },
        render: async (diagramCode: string, options: RenderOptions): Promise<RenderResult> => {
          // Placeholder for existing PlantUML functionality
          return {
            success: true,
            output: `<svg>PlantUML placeholder for: ${diagramCode.substring(0, 50)}...</svg>`,
            format: options.format || 'svg',
            metadata: {
              renderTime: 0,
              engineUsed: 'plantuml',
              warnings: ['Using placeholder PlantUML renderer']
            }
          };
        }
      });

      console.log('PlantUML engine registered successfully');

      // Conditionally register Mermaid engine
      if (this.featureFlags.isFeatureEnabled('mermaidEngine')) {
        try {
          const mermaidEngine = new MermaidEngine();
          this.registerEngine(mermaidEngine);
          console.log('Mermaid engine registered successfully');
        } catch (error) {
          console.warn('Failed to register Mermaid engine:', error);
          // Don't throw - PlantUML should still work
        }
      } else {
        console.log('Mermaid engine not registered (feature disabled)');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to register default engines:', error);
      throw error;
    }
  }

  /**
   * Register an engine strategy
   */
  registerEngine(engine: EngineStrategy): void {
    if (this.engines.has(engine.id)) {
      console.warn(`Engine '${engine.id}' already registered, overwriting`);
    }

    this.engines.set(engine.id, engine);
    console.log(`Engine '${engine.id}' registered successfully`);
  }

  /**
   * Unregister an engine strategy
   */
  unregisterEngine(engineId: string): void {
    if (this.engines.has(engineId)) {
      this.engines.delete(engineId);
      console.log(`Engine '${engineId}' unregistered successfully`);
    } else {
      console.warn(`Engine '${engineId}' not found for unregistration`);
    }
  }

  /**
   * Select the best engine for given requirements
   */
  async selectEngine(requirements: EngineRequirements, selectorName: string = 'default'): Promise<EngineStrategy> {
    if (!this.isInitialized) {
      throw new Error('EngineManager not initialized');
    }

    const availableEngines = Array.from(this.engines.values());
    
    if (availableEngines.length === 0) {
      throw new Error('No engines available');
    }

    // Phase 1: Simple selection logic
    for (const engine of availableEngines) {
      if (engine.canHandle(requirements.diagramType, requirements)) {
        console.log(`Selected engine '${engine.id}' for diagram type '${requirements.diagramType}'`);
        return engine;
      }
    }

    // Fallback to PlantUML if available
    const plantUMLEngine = this.engines.get('plantuml');
    if (plantUMLEngine) {
      console.log('Falling back to PlantUML engine');
      return plantUMLEngine;
    }

    // Last resort: return first available engine
    const firstEngine = availableEngines[0];
    console.log(`No suitable engine found, using first available: ${firstEngine.id}`);
    return firstEngine;
  }

  /**
   * Render a diagram using the best available engine
   */
  async renderDiagram(
    diagramCode: string,
    requirements: EngineRequirements,
    options: RenderOptions
  ): Promise<RenderResult> {
    try {
      const engine = await this.selectEngine(requirements);
      const result = await engine.render(diagramCode, options);
      
      console.log(`Diagram rendered successfully using engine '${engine.id}'`);
      return result;
    } catch (error) {
      console.error('Failed to render diagram:', error);
      
      // Return error result
      return {
        success: false,
        output: `<svg>Error: ${error instanceof Error ? error.message : String(error)}</svg>`,
        format: options.format || 'svg',
        metadata: {
          renderTime: 0,
          engineUsed: 'unknown',
          errors: [error instanceof Error ? error.message : String(error)]
        }
      };
    }
  }

  /**
   * Get all registered engines
   */
  getRegisteredEngines(): EngineStrategy[] {
    return Array.from(this.engines.values());
  }

  /**
   * Get engine by ID
   */
  getEngine(engineId: string): EngineStrategy | undefined {
    return this.engines.get(engineId);
  }

  /**
   * Check if an engine is registered
   */
  hasEngine(engineId: string): boolean {
    return this.engines.has(engineId);
  }

  /**
   * Get engine statistics
   */
  getEngineStats(): {
    totalEngines: number;
    availableEngines: string[];
    mermaidEnabled: boolean;
  } {
    return {
      totalEngines: this.engines.size,
      availableEngines: Array.from(this.engines.keys()),
      mermaidEnabled: this.featureFlags.isFeatureEnabled('mermaidEngine')
    };
  }

  /**
   * Warmup all engines
   */
  async warmupEngines(): Promise<void> {
    const engines = Array.from(this.engines.values());
    
    for (const engine of engines) {
      try {
        if (engine.warmup) {
          await engine.warmup();
        }
      } catch (error) {
        console.warn(`Failed to warmup engine '${engine.id}':`, error);
      }
    }
  }

  /**
   * Optimize all engines
   */
  async optimizeEngines(): Promise<void> {
    const engines = Array.from(this.engines.values());
    
    for (const engine of engines) {
      try {
        if (engine.optimize) {
          await engine.optimize();
        }
      } catch (error) {
        console.warn(`Failed to optimize engine '${engine.id}':`, error);
      }
    }
  }

  /**
   * Dispose all engines
   */
  async dispose(): Promise<void> {
    const engines = Array.from(this.engines.values());
    
    for (const engine of engines) {
      try {
        if (engine.dispose) {
          await engine.dispose();
        }
      } catch (error) {
        console.warn(`Failed to dispose engine '${engine.id}':`, error);
      }
    }

    this.engines.clear();
    this.isInitialized = false;
    console.log('EngineManager disposed');
  }
} 