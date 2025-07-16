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
}

export class Container {
  private static instance: Container;
  private services: Map<string, ServiceDefinition> = new Map();
  private logger: Logger;

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
    // Register core services as singletons
    this.register('logger', () => Logger.getInstance(), true);
    this.register('config', () => ConfigManager.getInstance(), true);
    this.register('errorHandler', () => ErrorHandler.getInstance(), true);
  }

  register<T>(name: string, provider: ServiceProvider<T>, singleton: boolean = false): void {
    this.services.set(name, { provider, singleton });
    this.logger.debug(`Service '${name}' registered`, { component: 'Container' });
  }

  resolve<T>(name: string): T {
    const definition = this.services.get(name);
    
    if (!definition) {
      const error = new Error(`Service '${name}' not found`);
      this.logger.error(`Failed to resolve service '${name}'`, { component: 'Container' }, error);
      throw error;
    }

    // Return existing instance if singleton
    if (definition.singleton && definition.instance) {
      return definition.instance as T;
    }

    try {
      const instance = definition.provider(this);
      
      if (definition.singleton) {
        definition.instance = instance;
      }
      
      this.logger.debug(`Service '${name}' resolved successfully`, { component: 'Container' });
      return instance as T;
    } catch (error) {
      this.logger.error(`Failed to resolve service '${name}'`, { component: 'Container' }, error as Error);
      throw error;
    }
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
    this.logger.debug('All services cleared', { component: 'Container' });
    this.registerCoreServices();
  }

  // Utility method to register multiple services at once
  registerMultiple(services: Array<{ name: string; provider: ServiceProvider<any>; singleton?: boolean }>): void {
    services.forEach(service => {
      this.register(service.name, service.provider, service.singleton ?? false);
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
} 