import { Logger } from '../logging/Logger';
import { ConfigManager } from '../config/ConfigManager';
import { ErrorHandler } from '../errors/ErrorHandler';

export interface ServiceProvider<T> {
  (container: Container): T;
}

export interface ServiceDefinition<T = any> {
  provider: ServiceProvider<T>;
  singleton: boolean;
  instance?: T;
  dependencies?: string[];
  lifecycle?: 'singleton' | 'transient' | 'scoped';
  priority?: number; // For dependency resolution order
}

export interface ServiceMetadata {
  name: string;
  type: string;
  singleton: boolean;
  dependencies: string[];
  lifecycle: string;
  priority: number;
}

export class Container {
  private static instance: Container;
  private services: Map<string, ServiceDefinition> = new Map();
  private logger: Logger;
  private resolvingServices: Set<string> = new Set(); // For circular dependency detection
  private scopedInstances: Map<string, Map<string, any>> = new Map(); // For scoped services

  private constructor() {
    this.logger = Logger.getInstance();
    this.registerCoreServices();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private registerCoreServices(): void {
    // Register core services as singletons with high priority
    this.register('logger', () => Logger.getInstance(), true, [], 'singleton', 1);
    this.register('config', () => ConfigManager.getInstance(), true, [], 'singleton', 1);
    this.register('errorHandler', () => ErrorHandler.getInstance(), true, [], 'singleton', 1);
  }

  register<T>(
    name: string, 
    provider: ServiceProvider<T>, 
    singleton: boolean = false,
    dependencies: string[] = [],
    lifecycle: 'singleton' | 'transient' | 'scoped' = 'singleton',
    priority: number = 5
  ): void {
    this.services.set(name, { 
      provider, 
      singleton, 
      dependencies, 
      lifecycle, 
      priority 
    });
    
    this.logger.debug(`Service '${name}' registered`, {
      component: 'Container',
      service: name,
      lifecycle,
      dependencies,
      priority
    });
  }

  resolve<T>(name: string, scopeId?: string): T {
    const definition = this.services.get(name);
    
    if (!definition) {
      const error = new Error(`Service '${name}' not found`);
      this.logger.error(`Failed to resolve service '${name}'`, { component: 'Container' }, error);
      throw error;
    }

    // Check for circular dependencies
    if (this.resolvingServices.has(name)) {
      const error = new Error(`Circular dependency detected for service '${name}'`);
      this.logger.error(`Circular dependency detected`, { component: 'Container', service: name }, error);
      throw error;
    }

    // Handle different lifecycle types
    switch (definition.lifecycle) {
      case 'singleton':
        return this.resolveSingleton<T>(name, definition);
      case 'scoped':
        return this.resolveScoped<T>(name, definition, scopeId);
      case 'transient':
        return this.resolveTransient<T>(name, definition);
      default:
        return this.resolveSingleton<T>(name, definition);
    }
  }

  private resolveSingleton<T>(name: string, definition: ServiceDefinition): T {
    // Return existing instance if singleton
    if (definition.singleton && definition.instance) {
      return definition.instance as T;
    }

    try {
      this.resolvingServices.add(name);
      
      // Resolve dependencies first
      const resolvedDependencies = this.resolveDependencies(definition.dependencies || []);
      
      const instance = definition.provider(this);
      
      if (definition.singleton) {
        definition.instance = instance;
      }
      
      this.resolvingServices.delete(name);
      
      this.logger.debug(`Service '${name}' resolved successfully`, { component: 'Container' });
      return instance as T;
    } catch (error) {
      this.resolvingServices.delete(name);
      this.logger.error(`Failed to resolve service '${name}'`, { component: 'Container' }, error as Error);
      throw error;
    }
  }

  private resolveScoped<T>(name: string, definition: ServiceDefinition, scopeId?: string): T {
    if (!scopeId) {
      throw new Error(`Scope ID required for scoped service '${name}'`);
    }

    let scopeInstances = this.scopedInstances.get(scopeId);
    if (!scopeInstances) {
      scopeInstances = new Map();
      this.scopedInstances.set(scopeId, scopeInstances);
    }

    // Return existing instance if exists in scope
    if (scopeInstances.has(name)) {
      return scopeInstances.get(name) as T;
    }

    try {
      this.resolvingServices.add(name);
      
      const resolvedDependencies = this.resolveDependencies(definition.dependencies || []);
      const instance = definition.provider(this);
      
      scopeInstances.set(name, instance);
      this.resolvingServices.delete(name);
      
      this.logger.debug(`Scoped service '${name}' resolved for scope '${scopeId}'`, { component: 'Container' });
      return instance as T;
    } catch (error) {
      this.resolvingServices.delete(name);
      this.logger.error(`Failed to resolve scoped service '${name}'`, { component: 'Container' }, error as Error);
      throw error;
    }
  }

  private resolveTransient<T>(name: string, definition: ServiceDefinition): T {
    try {
      this.resolvingServices.add(name);
      
      const resolvedDependencies = this.resolveDependencies(definition.dependencies || []);
      const instance = definition.provider(this);
      
      this.resolvingServices.delete(name);
      
      this.logger.debug(`Transient service '${name}' resolved`, { component: 'Container' });
      return instance as T;
    } catch (error) {
      this.resolvingServices.delete(name);
      this.logger.error(`Failed to resolve transient service '${name}'`, { component: 'Container' }, error as Error);
      throw error;
    }
  }

  private resolveDependencies(dependencies: string[]): any[] {
    return dependencies.map(dep => this.resolve(dep));
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  unregister(name: string): void {
    const definition = this.services.get(name);
    if (definition) {
      this.services.delete(name);
      this.logger.debug(`Service '${name}' unregistered`, { component: 'Container' });
    }
  }

  clear(): void {
    this.services.clear();
    this.scopedInstances.clear();
    this.logger.debug('All services cleared', { component: 'Container' });
    this.registerCoreServices();
  }

  // Create a new scope for scoped services
  createScope(): string {
    const scopeId = `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.logger.debug(`New scope created: ${scopeId}`, { component: 'Container' });
    return scopeId;
  }

  // Dispose a scope and all its instances
  disposeScope(scopeId: string): void {
    const scopeInstances = this.scopedInstances.get(scopeId);
    if (scopeInstances) {
      scopeInstances.clear();
      this.scopedInstances.delete(scopeId);
      this.logger.debug(`Scope '${scopeId}' disposed`, { component: 'Container' });
    }
  }

  // Get service metadata for debugging
  getServiceMetadata(): ServiceMetadata[] {
    const metadata: ServiceMetadata[] = [];
    
    this.services.forEach((definition, name) => {
      metadata.push({
        name,
        type: definition.provider.toString(),
        singleton: definition.singleton,
        dependencies: definition.dependencies || [],
        lifecycle: definition.lifecycle || 'singleton',
        priority: definition.priority || 5
      });
    });
    
    return metadata.sort((a, b) => a.priority - b.priority);
  }

  // Validate service dependencies
  validateDependencies(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    this.services.forEach((definition, name) => {
      const dependencies = definition.dependencies || [];
      
      dependencies.forEach(dep => {
        if (!this.services.has(dep)) {
          errors.push(`Service '${name}' depends on missing service '${dep}'`);
        }
      });
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Utility method to register multiple services at once
  registerMultiple(services: Array<{
    name: string;
    provider: ServiceProvider<any>;
    singleton?: boolean;
    dependencies?: string[];
    lifecycle?: 'singleton' | 'transient' | 'scoped';
    priority?: number;
  }>): void {
    services.forEach(service => {
      this.register(
        service.name, 
        service.provider, 
        service.singleton ?? false,
        service.dependencies || [],
        service.lifecycle || 'singleton',
        service.priority || 5
      );
    });
  }

  // Get all registered service names
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  // Check if a service is a singleton
  isSingleton(name: string): boolean {
    const definition = this.services.get(name);
    return definition?.singleton ?? false;
  }

  // Get service lifecycle
  getServiceLifecycle(name: string): string {
    const definition = this.services.get(name);
    return definition?.lifecycle || 'singleton';
  }
} 