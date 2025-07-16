import { Logger } from '../logging/Logger';
import { ConfigManager } from './ConfigManager';
import { EventBus } from '../events/EventBus';

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    default?: any;
    validator?: (value: any) => boolean | string;
    description?: string;
  };
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  dependencies?: string[];
  rolloutPercentage?: number; // For gradual rollout
}

export interface ConfigChangeEvent {
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

export class ConfigDriver {
  private static instance: ConfigDriver;
  private configManager: ConfigManager;
  private eventBus: EventBus;
  private logger: Logger;
  private schemas: Map<string, ConfigSchema> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private watchers: Map<string, Set<(change: ConfigChangeEvent) => void>> = new Map();

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.logger = Logger.getInstance();
    this.initializeEventListeners();
  }

  static getInstance(): ConfigDriver {
    if (!ConfigDriver.instance) {
      ConfigDriver.instance = new ConfigDriver();
    }
    return ConfigDriver.instance;
  }

  private initializeEventListeners(): void {
    // Listen for configuration changes
    this.configManager.addListener((newConfig) => {
      this.handleConfigChange(newConfig);
    });
  }

  /**
   * Register a configuration schema for validation
   */
  registerSchema(namespace: string, schema: ConfigSchema): void {
    this.schemas.set(namespace, schema);
    this.logger.info(`Configuration schema registered`, {
      component: 'ConfigDriver',
      namespace,
      fields: Object.keys(schema).length
    });
  }

  /**
   * Validate configuration against schema
   */
  validateConfig(namespace: string, config: any): { isValid: boolean; errors: string[] } {
    const schema = this.schemas.get(namespace);
    if (!schema) {
      return { isValid: true, errors: [] }; // No schema means no validation
    }

    const errors: string[] = [];

    for (const [key, fieldSchema] of Object.entries(schema)) {
      const value = config[key];

      // Check required fields
      if (fieldSchema.required && value === undefined) {
        errors.push(`Required field '${key}' is missing in namespace '${namespace}'`);
        continue;
      }

      // Skip validation if value is undefined and not required
      if (value === undefined) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== fieldSchema.type) {
        errors.push(`Field '${key}' in namespace '${namespace}' should be of type '${fieldSchema.type}', got '${actualType}'`);
        continue;
      }

      // Custom validator
      if (fieldSchema.validator) {
        const validationResult = fieldSchema.validator(value);
        if (validationResult !== true) {
          errors.push(`Field '${key}' in namespace '${namespace}' validation failed: ${validationResult}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration with schema validation
   */
  getConfig<T = any>(namespace: string): T {
    const config = this.configManager.get(namespace as any);
    const validation = this.validateConfig(namespace, config);

    if (!validation.isValid) {
      this.logger.warn(`Configuration validation failed for namespace '${namespace}'`, {
        component: 'ConfigDriver',
        namespace,
        errors: validation.errors
      });
    }

    return config as T;
  }

  /**
   * Update configuration with validation
   */
  updateConfig(namespace: string, updates: any): { success: boolean; errors: string[] } {
    const currentConfig = this.configManager.get(namespace as any);
    const newConfig = { ...currentConfig, ...updates };
    
    const validation = this.validateConfig(namespace, newConfig);
    
    if (validation.isValid) {
      this.configManager.updateSection(namespace as any, updates);
      return { success: true, errors: [] };
    } else {
      return { success: false, errors: validation.errors };
    }
  }

  /**
   * Register a feature flag
   */
  registerFeatureFlag(flag: FeatureFlag): void {
    this.featureFlags.set(flag.name, flag);
    this.logger.info(`Feature flag registered`, {
      component: 'ConfigDriver',
      flag: flag.name,
      enabled: flag.enabled
    });
  }

  /**
   * Check if a feature flag is enabled
   */
  isFeatureEnabled(flagName: string, userId?: string): boolean {
    const flag = this.featureFlags.get(flagName);
    if (!flag) {
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check dependencies
    if (flag.dependencies) {
      for (const dependency of flag.dependencies) {
        if (!this.isFeatureEnabled(dependency, userId)) {
          return false;
        }
      }
    }

    // Gradual rollout
    if (flag.rolloutPercentage && flag.rolloutPercentage < 100) {
      if (!userId) {
        return false;
      }
      
      // Simple hash-based rollout
      const hash = this.hashString(userId + flagName);
      const percentage = hash % 100;
      return percentage < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get all feature flags
   */
  getFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values());
  }

  /**
   * Watch for configuration changes
   */
  watchConfig(path: string, callback: (change: ConfigChangeEvent) => void): string {
    const watcherId = `watcher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.watchers.has(path)) {
      this.watchers.set(path, new Set());
    }
    
    this.watchers.get(path)!.add(callback);
    
    this.logger.debug(`Configuration watcher added`, {
      component: 'ConfigDriver',
      path,
      watcherId
    });
    
    return watcherId;
  }

  /**
   * Unwatch configuration changes
   */
  unwatchConfig(path: string, callback: (change: ConfigChangeEvent) => void): boolean {
    const watchers = this.watchers.get(path);
    if (watchers) {
      const removed = watchers.delete(callback);
      if (watchers.size === 0) {
        this.watchers.delete(path);
      }
      return removed;
    }
    return false;
  }

  /**
   * Get configuration metadata
   */
  getConfigMetadata(): {
    schemas: string[];
    featureFlags: string[];
    watchers: { path: string; count: number }[];
  } {
    const watchers = Array.from(this.watchers.entries()).map(([path, watchers]) => ({
      path,
      count: watchers.size
    }));

    return {
      schemas: Array.from(this.schemas.keys()),
      featureFlags: Array.from(this.featureFlags.keys()),
      watchers
    };
  }

  /**
   * Export configuration for backup
   */
  exportConfig(): string {
    const config = this.configManager.getConfig();
    const schemas = Object.fromEntries(this.schemas);
    const featureFlags = Array.from(this.featureFlags.values());
    
    return JSON.stringify({
      config,
      schemas,
      featureFlags
    }, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfig(backup: string): { success: boolean; errors: string[] } {
    try {
      const data = JSON.parse(backup);
      const errors: string[] = [];

      // Import schemas
      if (data.schemas) {
        for (const [namespace, schema] of Object.entries(data.schemas)) {
          this.registerSchema(namespace, schema as ConfigSchema);
        }
      }

      // Import feature flags
      if (data.featureFlags) {
        for (const flag of data.featureFlags) {
          this.registerFeatureFlag(flag);
        }
      }

      // Import configuration
      if (data.config) {
        this.configManager.updateConfig(data.config);
      }

      return { success: true, errors: [] };
    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to import configuration: ${error}`] 
      };
    }
  }

  private handleConfigChange(newConfig: any): void {
    // Notify watchers
    for (const [path, watchers] of Array.from(this.watchers.entries())) {
      const oldValue = this.getNestedValue(newConfig, path);
      const newValue = this.getNestedValue(newConfig, path);
      
      if (oldValue !== newValue) {
        const changeEvent: ConfigChangeEvent = {
          path,
          oldValue,
          newValue,
          timestamp: new Date()
        };

        watchers.forEach(callback => {
          try {
            callback(changeEvent);
          } catch (error) {
            this.logger.error(`Config watcher callback failed`, {
              component: 'ConfigDriver',
              path
            }, error as Error);
          }
        });
      }
    }

    // Publish event
    this.eventBus.publish('config.changed', {
      config: newConfig,
      timestamp: new Date()
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
} 