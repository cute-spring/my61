import { Logger } from '../logging/Logger';

export interface AppConfig {
  // Logging configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    enablePerformanceTracking: boolean;
    enableMemoryTracking: boolean;
  };

  // AI Model configuration
  ai: {
    defaultModel: string;
    fallbackModels: string[];
    maxRetries: number;
    timeout: number;
    temperature: number;
  };

  // Diagram engine configuration
  diagrams: {
    defaultEngine: string;
    availableEngines: string[];
    autoDetectFormat: boolean;
    enablePreview: boolean;
    maxPreviewSize: number;
  };

  // UI configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
    enableAnimations: boolean;
    maxChatHistory: number;
  };

  // Performance configuration
  performance: {
    enableCaching: boolean;
    cacheSize: number;
    enableLazyLoading: boolean;
    maxConcurrentRequests: number;
  };

  // Feature flags
  features: {
    enableAnalytics: boolean;
    enableTutorial: boolean;
    enableAdvancedFeatures: boolean;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private logger: Logger;
  private listeners: Array<(config: AppConfig) => void> = [];

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = this.getDefaultConfig();
    this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private getDefaultConfig(): AppConfig {
    return {
      logging: {
        level: 'info',
        enablePerformanceTracking: true,
        enableMemoryTracking: false
      },
      ai: {
        defaultModel: 'github-copilot',
        fallbackModels: ['copilot-chat'],
        maxRetries: 3,
        timeout: 30000,
        temperature: 0.7
      },
      diagrams: {
        defaultEngine: 'plantuml',
        availableEngines: ['plantuml', 'mermaid'],
        autoDetectFormat: true,
        enablePreview: true,
        maxPreviewSize: 1024 * 1024 // 1MB
      },
      ui: {
        theme: 'auto',
        compactMode: false,
        enableAnimations: true,
        maxChatHistory: 100
      },
      performance: {
        enableCaching: true,
        cacheSize: 100,
        enableLazyLoading: true,
        maxConcurrentRequests: 5
      },
      features: {
        enableAnalytics: true,
        enableTutorial: true,
        enableAdvancedFeatures: false
      }
    };
  }

  private loadConfig(): void {
    try {
      // Load from VS Code workspace settings
      const workspaceConfig = this.getWorkspaceConfig();
      this.config = this.mergeConfig(this.config, workspaceConfig);
      
      // Load from environment variables
      const envConfig = this.getEnvironmentConfig();
      this.config = this.mergeConfig(this.config, envConfig);
      
      this.logger.info('Configuration loaded successfully');
      this.notifyListeners();
    } catch (error) {
      this.logger.error('Failed to load configuration', { component: 'ConfigManager' }, error as Error);
    }
  }

  private getWorkspaceConfig(): Partial<AppConfig> {
    // This would integrate with VS Code's workspace configuration
    // For now, return empty object
    return {};
  }

  private getEnvironmentConfig(): Partial<AppConfig> {
    const envConfig: Partial<AppConfig> = {};
    
    // Parse environment variables
    if (process.env.UML_LOG_LEVEL) {
      envConfig.logging = { level: process.env.UML_LOG_LEVEL as any } as AppConfig['logging'];
    }
    
    if (process.env.UML_DEFAULT_AI_MODEL) {
      envConfig.ai = { defaultModel: process.env.UML_DEFAULT_AI_MODEL } as AppConfig['ai'];
    }
    
    if (process.env.UML_DEFAULT_ENGINE) {
      envConfig.diagrams = { defaultEngine: process.env.UML_DEFAULT_ENGINE } as AppConfig['diagrams'];
    }
    
    return envConfig;
  }

  private mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
    return {
      ...base,
      ...override,
      logging: override.logging ? { ...base.logging, ...override.logging } : base.logging,
      ai: override.ai ? { ...base.ai, ...override.ai } : base.ai,
      diagrams: override.diagrams ? { ...base.diagrams, ...override.diagrams } : base.diagrams,
      ui: override.ui ? { ...base.ui, ...override.ui } : base.ui,
      performance: override.performance ? { ...base.performance, ...override.performance } : base.performance,
      features: override.features ? { ...base.features, ...override.features } : base.features
    };
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getNested<K extends keyof AppConfig, S extends keyof AppConfig[K]>(
    section: K, 
    setting: S
  ): AppConfig[K][S] {
    return this.config[section][setting];
  }

  updateConfig(updates: Partial<AppConfig>): void {
    try {
      this.config = this.mergeConfig(this.config, updates);
      this.logger.info('Configuration updated', { updates });
      this.notifyListeners();
    } catch (error) {
      this.logger.error('Failed to update configuration', { component: 'ConfigManager' }, error as Error);
    }
  }

  updateSection<K extends keyof AppConfig>(section: K, updates: Partial<AppConfig[K]>): void {
    try {
      this.config[section] = { ...this.config[section], ...updates };
      this.logger.info(`Configuration section '${section}' updated`, { updates });
      this.notifyListeners();
    } catch (error) {
      this.logger.error(`Failed to update configuration section '${section}'`, { component: 'ConfigManager' }, error as Error);
    }
  }

  addListener(listener: (config: AppConfig) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (config: AppConfig) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        this.logger.error('Error in configuration listener', { component: 'ConfigManager' }, error as Error);
      }
    });
  }

  // Validation methods
  validateConfig(config: Partial<AppConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (config.logging?.level && !['debug', 'info', 'warn', 'error', 'fatal'].includes(config.logging.level)) {
      errors.push('Invalid logging level');
    }
    
    if (config.ai?.maxRetries && (config.ai.maxRetries < 0 || config.ai.maxRetries > 10)) {
      errors.push('AI max retries must be between 0 and 10');
    }
    
    if (config.ai?.timeout && (config.ai.timeout < 1000 || config.ai.timeout > 300000)) {
      errors.push('AI timeout must be between 1000ms and 300000ms');
    }
    
    if (config.diagrams?.maxPreviewSize && config.diagrams.maxPreviewSize <= 0) {
      errors.push('Max preview size must be positive');
    }
    
    if (config.ui?.maxChatHistory && (config.ui.maxChatHistory < 1 || config.ui.maxChatHistory > 1000)) {
      errors.push('Max chat history must be between 1 and 1000');
    }
    
    if (config.performance?.cacheSize && (config.performance.cacheSize < 1 || config.performance.cacheSize > 10000)) {
      errors.push('Cache size must be between 1 and 10000');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.logger.info('Configuration reset to defaults');
    this.notifyListeners();
  }

  // Export configuration for debugging
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }
} 