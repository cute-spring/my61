import { Logger } from '../logging/Logger';
import { ConfigManager } from '../config/ConfigManager';

export interface EngineContext {
  input: string;
  userPreferences?: Record<string, any>;
  sessionId?: string;
}

export interface EngineResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: {
    engine: string;
    processingTime: number;
    inputSize: number;
    outputSize?: number;
  };
}

export interface EngineStrategy {
  readonly name: string;
  readonly supportedFormats: string[];
  
  canHandle(input: string): boolean;
  process(context: EngineContext): Promise<EngineResult>;
  validate(input: string): { isValid: boolean; errors: string[] };
}

export abstract class BaseEngineStrategy implements EngineStrategy {
  protected logger: Logger;
  protected config: ConfigManager;

  constructor(
    public readonly name: string,
    public readonly supportedFormats: string[]
  ) {
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
  }

  abstract canHandle(input: string): boolean;
  abstract process(context: EngineContext): Promise<EngineResult>;

  validate(input: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!input || input.trim().length === 0) {
      errors.push('Input cannot be empty');
    }
    
    if (input.length > this.config.getNested('diagrams', 'maxPreviewSize')) {
      errors.push('Input exceeds maximum allowed size');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected logOperation(operation: string, context: Partial<EngineContext>): void {
    this.logger.info(`Engine '${this.name}' - ${operation}`, {
      component: 'EngineStrategy',
      engine: this.name,
      ...context
    });
  }

  protected logError(operation: string, error: Error, context?: Partial<EngineContext>): void {
    this.logger.error(`Engine '${this.name}' - ${operation} failed`, {
      component: 'EngineStrategy',
      engine: this.name,
      ...context
    }, error);
  }
}

export class EngineStrategyManager {
  private static instance: EngineStrategyManager;
  private strategies: Map<string, EngineStrategy> = new Map();
  private logger: Logger;
  private config: ConfigManager;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
  }

  static getInstance(): EngineStrategyManager {
    if (!EngineStrategyManager.instance) {
      EngineStrategyManager.instance = new EngineStrategyManager();
    }
    return EngineStrategyManager.instance;
  }

  registerStrategy(strategy: EngineStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.logger.info(`Engine strategy '${strategy.name}' registered`, {
      component: 'EngineStrategyManager',
      supportedFormats: strategy.supportedFormats
    });
  }

  unregisterStrategy(name: string): void {
    if (this.strategies.has(name)) {
      this.strategies.delete(name);
      this.logger.info(`Engine strategy '${name}' unregistered`, {
        component: 'EngineStrategyManager'
      });
    }
  }

  getStrategy(name: string): EngineStrategy | undefined {
    return this.strategies.get(name);
  }

  getAllStrategies(): EngineStrategy[] {
    return Array.from(this.strategies.values());
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  selectStrategy(input: string, preferredEngine?: string): EngineStrategy | null {
    // If preferred engine is specified and can handle the input, use it
    if (preferredEngine) {
      const strategy = this.strategies.get(preferredEngine);
      if (strategy && strategy.canHandle(input)) {
        this.logger.debug(`Selected preferred engine '${preferredEngine}'`, {
          component: 'EngineStrategyManager'
        });
        return strategy;
      }
    }

    // Auto-detect based on input content
    if (this.config.getNested('diagrams', 'autoDetectFormat')) {
      for (const strategy of this.strategies.values()) {
        if (strategy.canHandle(input)) {
          this.logger.debug(`Auto-detected engine '${strategy.name}'`, {
            component: 'EngineStrategyManager'
          });
          return strategy;
        }
      }
    }

    // Fallback to default engine
    const defaultEngine = this.config.getNested('diagrams', 'defaultEngine');
    const defaultStrategy = this.strategies.get(defaultEngine);
    
    if (defaultStrategy) {
      this.logger.debug(`Using default engine '${defaultEngine}'`, {
        component: 'EngineStrategyManager'
      });
      return defaultStrategy;
    }

    this.logger.warn('No suitable engine strategy found', {
      component: 'EngineStrategyManager',
      availableEngines: this.getAvailableStrategies()
    });
    
    return null;
  }

  async processWithStrategy(
    input: string, 
    context: Omit<EngineContext, 'input'> = {},
    preferredEngine?: string
  ): Promise<EngineResult> {
    const strategy = this.selectStrategy(input, preferredEngine);
    
    if (!strategy) {
      return {
        success: false,
        error: 'No suitable engine found for the input',
        metadata: {
          engine: 'none',
          processingTime: 0,
          inputSize: input.length
        }
      };
    }

    const engineContext: EngineContext = {
      input,
      ...context
    };

    try {
      this.logger.startTimer(`engine_${strategy.name}_process`);
      
      const result = await strategy.process(engineContext);
      
      const processingTime = this.logger.endTimer(`engine_${strategy.name}_process`, {
        component: 'EngineStrategyManager',
        engine: strategy.name
      });

      return {
        ...result,
        metadata: {
          engine: strategy.name,
          processingTime,
          inputSize: input.length,
          outputSize: result.output?.length
        }
      };
    } catch (error) {
      this.logger.error(`Engine processing failed`, {
        component: 'EngineStrategyManager',
        engine: strategy.name
      }, error as Error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          engine: strategy.name,
          processingTime: 0,
          inputSize: input.length
        }
      };
    }
  }

  validateInput(input: string, engineName?: string): { isValid: boolean; errors: string[] } {
    if (engineName) {
      const strategy = this.strategies.get(engineName);
      if (strategy) {
        return strategy.validate(input);
      }
    }

    // Validate with all strategies
    const allErrors: string[] = [];
    for (const strategy of this.strategies.values()) {
      const validation = strategy.validate(input);
      if (!validation.isValid) {
        allErrors.push(`[${strategy.name}]: ${validation.errors.join(', ')}`);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
} 