/**
 * Enhanced Strategy Pattern for Engine Selection
 * Phase 3 - Advanced Features Foundation
 */

import { container } from '../../base/dependencyInjection';
import { eventBus } from '../../base/eventBus';

export interface EngineCapabilities {
  supportsDiagramType: (diagramType: string) => boolean;
  supportsFeature: (feature: string) => boolean;
  getPerformanceMetrics: () => EnginePerformanceMetrics;
  getQualityScore: () => number;
}

export interface EnginePerformanceMetrics {
  averageRenderTime: number;
  memoryUsage: number;
  successRate: number;
  lastUsed: Date;
  totalRenders: number;
}

export interface EngineStrategy {
  id: string;
  name: string;
  description: string;
  capabilities: EngineCapabilities;
  
  // Core methods
  canHandle(diagramType: string, requirements: EngineRequirements): boolean;
  render(diagramCode: string, options: RenderOptions): Promise<RenderResult>;
  
  // Lifecycle methods
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
  
  // Performance methods
  warmup?(): Promise<void>;
  optimize?(): Promise<void>;
}

export interface EngineRequirements {
  diagramType: string;
  complexity: 'simple' | 'medium' | 'complex';
  features: string[];
  performance: 'speed' | 'quality' | 'balanced';
}

export interface RenderOptions {
  format: 'svg' | 'png' | 'pdf';
  theme?: string;
  scale?: number;
  timeout?: number;
}

export interface RenderResult {
  success: boolean;
  output: string | Buffer;
  format: string;
  metadata: {
    renderTime: number;
    engineUsed: string;
    warnings?: string[];
    errors?: string[];
  };
}

export interface StrategySelector {
  selectEngine(
    requirements: EngineRequirements,
    availableEngines: EngineStrategy[]
  ): EngineStrategy;
  
  rankEngines(
    requirements: EngineRequirements,
    engines: EngineStrategy[]
  ): EngineStrategy[];
}

export class EnhancedEngineManager {
  private strategies = new Map<string, EngineStrategy>();
  private selectors = new Map<string, StrategySelector>();
  private performanceCache = new Map<string, EnginePerformanceMetrics>();
  private disposed = false;

  constructor() {
    this.registerDefaultSelectors();
    this.setupEventHandlers();
  }

  /**
   * Register an engine strategy
   */
  registerStrategy(strategy: EngineStrategy): void {
    if (this.disposed) {
      throw new Error('EngineManager has been disposed');
    }

    this.strategies.set(strategy.id, strategy);
    
    // Register in DI container
    container.register(`engine.${strategy.id}`, () => strategy, {
      lifecycle: 'singleton',
      onInit: async (service: any) => {
        if (service.initialize) {
          await service.initialize();
        }
      },
      onDestroy: async (service: any) => {
        if (service.dispose) {
          await service.dispose();
        }
      }
    });

    // Publish strategy registered event
    eventBus.publish('engine.strategy.registered', {
      strategyId: strategy.id,
      strategy: strategy
    });
  }

  /**
   * Unregister an engine strategy
   */
  unregisterStrategy(strategyId: string): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy '${strategyId}' not found`);
    }

    this.strategies.delete(strategyId);
    
    // Unregister from DI container
    // In a real implementation, you would unregister from the container
    
    // Publish strategy unregistered event
    eventBus.publish('engine.strategy.unregistered', {
      strategyId: strategyId
    });
  }

  /**
   * Register a strategy selector
   */
  registerSelector(name: string, selector: StrategySelector): void {
    this.selectors.set(name, selector);
  }

  /**
   * Select the best engine for given requirements
   */
  async selectEngine(
    requirements: EngineRequirements,
    selectorName: string = 'default'
  ): Promise<EngineStrategy> {
    const selector = this.selectors.get(selectorName);
    if (!selector) {
      throw new Error(`Selector '${selectorName}' not found`);
    }

    const availableEngines = Array.from(this.strategies.values());
    const selectedEngine = selector.selectEngine(requirements, availableEngines);

    if (!selectedEngine) {
      throw new Error('No suitable engine found for requirements');
    }

    // Update performance metrics
    this.updatePerformanceMetrics(selectedEngine.id);

    // Publish engine selected event
    await eventBus.publish('engine.selected', {
      strategyId: selectedEngine.id,
      requirements: requirements
    });

    return selectedEngine;
  }

  /**
   * Render a diagram using the best available engine
   */
  async renderDiagram(
    diagramCode: string,
    requirements: EngineRequirements,
    options: RenderOptions
  ): Promise<RenderResult> {
    const engine = await this.selectEngine(requirements);
    
    try {
      const result = await engine.render(diagramCode, options);
      
      // Update performance metrics
      this.updatePerformanceMetrics(engine.id, result.metadata.renderTime);
      
      // Publish render completed event
      await eventBus.publish('engine.render.completed', {
        strategyId: engine.id,
        result: result,
        requirements: requirements
      });

      return result;
    } catch (error) {
      // Try fallback engines
      const fallbackEngines = this.getFallbackEngines(requirements, engine.id);
      
      for (const fallbackEngine of fallbackEngines) {
        try {
          const result = await fallbackEngine.render(diagramCode, options);
          
          // Publish fallback used event
          await eventBus.publish('engine.render.fallback', {
            originalStrategyId: engine.id,
            fallbackStrategyId: fallbackEngine.id,
            result: result,
            requirements: requirements
          });

          return result;
        } catch (fallbackError) {
          console.warn(`Fallback engine ${fallbackEngine.id} also failed:`, fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Get engine performance statistics
   */
  getEngineStats(): {
    totalEngines: number;
    activeEngines: number;
    averageRenderTime: number;
    totalRenders: number;
  } {
    let totalRenderTime = 0;
    let totalRenders = 0;

    for (const metrics of this.performanceCache.values()) {
      totalRenderTime += metrics.averageRenderTime * metrics.totalRenders;
      totalRenders += metrics.totalRenders;
    }

    return {
      totalEngines: this.strategies.size,
      activeEngines: this.strategies.size,
      averageRenderTime: totalRenders > 0 ? totalRenderTime / totalRenders : 0,
      totalRenders: totalRenders
    };
  }

  /**
   * Warm up engines for better performance
   */
  async warmupEngines(): Promise<void> {
    const warmupPromises = Array.from(this.strategies.values()).map(async (strategy) => {
      if (strategy.warmup) {
        try {
          await strategy.warmup();
          console.log(`Warmed up engine: ${strategy.id}`);
        } catch (error) {
          console.warn(`Failed to warm up engine ${strategy.id}:`, error);
        }
      }
    });

    await Promise.allSettled(warmupPromises);
  }

  /**
   * Optimize engines based on usage patterns
   */
  async optimizeEngines(): Promise<void> {
    const optimizePromises = Array.from(this.strategies.values()).map(async (strategy) => {
      if (strategy.optimize) {
        try {
          await strategy.optimize();
          console.log(`Optimized engine: ${strategy.id}`);
        } catch (error) {
          console.warn(`Failed to optimize engine ${strategy.id}:`, error);
        }
      }
    });

    await Promise.allSettled(optimizePromises);
  }

  /**
   * Dispose the engine manager
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Dispose all strategies
    for (const strategy of this.strategies.values()) {
      if (strategy.dispose) {
        try {
          await strategy.dispose();
        } catch (error) {
          console.error(`Failed to dispose strategy ${strategy.id}:`, error);
        }
      }
    }

    this.strategies.clear();
    this.selectors.clear();
    this.performanceCache.clear();
  }

  private registerDefaultSelectors(): void {
    // Register default selector
    this.registerSelector('default', new DefaultStrategySelector());
    
    // Register performance-based selector
    this.registerSelector('performance', new PerformanceBasedSelector());
    
    // Register quality-based selector
    this.registerSelector('quality', new QualityBasedSelector());
  }

  private setupEventHandlers(): void {
    // Monitor engine performance
    eventBus.subscribe('engine.render.completed', (event: any) => {
      this.updatePerformanceMetrics(event.strategyId, event.result.metadata.renderTime);
    }, { async: true });

    // Monitor engine failures
    eventBus.subscribe('engine.render.failed', (event: any) => {
      this.updatePerformanceMetrics(event.strategyId, 0, false);
    }, { async: true });
  }

  private updatePerformanceMetrics(
    engineId: string, 
    renderTime: number = 0, 
    success: boolean = true
  ): void {
    const current = this.performanceCache.get(engineId) || {
      averageRenderTime: 0,
      memoryUsage: 0,
      successRate: 1,
      lastUsed: new Date(),
      totalRenders: 0
    };

    const newTotalRenders = current.totalRenders + 1;
    const newSuccessRate = success 
      ? (current.successRate * current.totalRenders + 1) / newTotalRenders
      : (current.successRate * current.totalRenders) / newTotalRenders;

    const newAverageRenderTime = renderTime > 0
      ? (current.averageRenderTime * current.totalRenders + renderTime) / newTotalRenders
      : current.averageRenderTime;

    this.performanceCache.set(engineId, {
      averageRenderTime: newAverageRenderTime,
      memoryUsage: current.memoryUsage, // Would be updated by actual monitoring
      successRate: newSuccessRate,
      lastUsed: new Date(),
      totalRenders: newTotalRenders
    });
  }

  private getFallbackEngines(
    requirements: EngineRequirements, 
    excludeEngineId: string
  ): EngineStrategy[] {
    return Array.from(this.strategies.values())
      .filter(engine => engine.id !== excludeEngineId)
      .filter(engine => engine.canHandle(requirements.diagramType, requirements))
      .sort((a, b) => {
        const aMetrics = this.performanceCache.get(a.id);
        const bMetrics = this.performanceCache.get(b.id);
        
        if (!aMetrics || !bMetrics) {return 0;}
        
        // Prefer engines with higher success rate
        if (aMetrics.successRate !== bMetrics.successRate) {
          return bMetrics.successRate - aMetrics.successRate;
        }
        
        // Then prefer faster engines
        return aMetrics.averageRenderTime - bMetrics.averageRenderTime;
      });
  }
}

// Strategy Selector Implementations

export class DefaultStrategySelector implements StrategySelector {
  selectEngine(requirements: EngineRequirements, engines: EngineStrategy[]): EngineStrategy {
    const suitableEngines = engines.filter(engine => 
      engine.canHandle(requirements.diagramType, requirements)
    );

    if (suitableEngines.length === 0) {
      throw new Error('No suitable engine found');
    }

    // Simple selection: first suitable engine
    return suitableEngines[0];
  }

  rankEngines(requirements: EngineRequirements, engines: EngineStrategy[]): EngineStrategy[] {
    return engines
      .filter(engine => engine.canHandle(requirements.diagramType, requirements))
      .sort((a, b) => {
        const aScore = a.capabilities.getQualityScore();
        const bScore = b.capabilities.getQualityScore();
        return bScore - aScore;
      });
  }
}

export class PerformanceBasedSelector implements StrategySelector {
  selectEngine(requirements: EngineRequirements, engines: EngineStrategy[]): EngineStrategy {
    const suitableEngines = engines.filter(engine => 
      engine.canHandle(requirements.diagramType, requirements)
    );

    if (suitableEngines.length === 0) {
      throw new Error('No suitable engine found');
    }

    // Select based on performance requirements
    if (requirements.performance === 'speed') {
      return suitableEngines.reduce((fastest, current) => {
        const fastestMetrics = fastest.capabilities.getPerformanceMetrics();
        const currentMetrics = current.capabilities.getPerformanceMetrics();
        return currentMetrics.averageRenderTime < fastestMetrics.averageRenderTime ? current : fastest;
      });
    } else if (requirements.performance === 'quality') {
      return suitableEngines.reduce((best, current) => {
        const bestScore = best.capabilities.getQualityScore();
        const currentScore = current.capabilities.getQualityScore();
        return currentScore > bestScore ? current : best;
      });
    } else {
      // Balanced approach
      return suitableEngines.reduce((balanced, current) => {
        const balancedMetrics = balanced.capabilities.getPerformanceMetrics();
        const currentMetrics = current.capabilities.getPerformanceMetrics();
        const balancedScore = balanced.capabilities.getQualityScore();
        const currentScore = current.capabilities.getQualityScore();
        
        // Weighted score: 70% quality, 30% performance
        const balancedWeighted = balancedScore * 0.7 + (1 / balancedMetrics.averageRenderTime) * 0.3;
        const currentWeighted = currentScore * 0.7 + (1 / currentMetrics.averageRenderTime) * 0.3;
        
        return currentWeighted > balancedWeighted ? current : balanced;
      });
    }
  }

  rankEngines(requirements: EngineRequirements, engines: EngineStrategy[]): EngineStrategy[] {
    return engines
      .filter(engine => engine.canHandle(requirements.diagramType, requirements))
      .sort((a, b) => {
        const aMetrics = a.capabilities.getPerformanceMetrics();
        const bMetrics = b.capabilities.getPerformanceMetrics();
        const aScore = a.capabilities.getQualityScore();
        const bScore = b.capabilities.getQualityScore();
        
        if (requirements.performance === 'speed') {
          return aMetrics.averageRenderTime - bMetrics.averageRenderTime;
        } else if (requirements.performance === 'quality') {
          return bScore - aScore;
        } else {
          // Balanced ranking
          const aWeighted = aScore * 0.7 + (1 / aMetrics.averageRenderTime) * 0.3;
          const bWeighted = bScore * 0.7 + (1 / bMetrics.averageRenderTime) * 0.3;
          return bWeighted - aWeighted;
        }
      });
  }
}

export class QualityBasedSelector implements StrategySelector {
  selectEngine(requirements: EngineRequirements, engines: EngineStrategy[]): EngineStrategy {
    const suitableEngines = engines.filter(engine => 
      engine.canHandle(requirements.diagramType, requirements)
    );

    if (suitableEngines.length === 0) {
      throw new Error('No suitable engine found');
    }

    // Always select the highest quality engine
    return suitableEngines.reduce((best, current) => {
      const bestScore = best.capabilities.getQualityScore();
      const currentScore = current.capabilities.getQualityScore();
      return currentScore > bestScore ? current : best;
    });
  }

  rankEngines(requirements: EngineRequirements, engines: EngineStrategy[]): EngineStrategy[] {
    return engines
      .filter(engine => engine.canHandle(requirements.diagramType, requirements))
      .sort((a, b) => {
        const aScore = a.capabilities.getQualityScore();
        const bScore = b.capabilities.getQualityScore();
        return bScore - aScore;
      });
  }
}

// Global engine manager instance
export const engineManager = new EnhancedEngineManager(); 