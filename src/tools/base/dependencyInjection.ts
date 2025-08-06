/**
 * Enhanced Dependency Injection Container
 * Phase 3 - Advanced Features Foundation
 */

export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped';

export interface ServiceRegistration<T = any> {
  factory: () => T;
  lifecycle: ServiceLifecycle;
  onInit?: (service: T) => void | Promise<void>;
  onDestroy?: (service: T) => void | Promise<void>;
  dependencies?: string[];
}

export interface ServiceScope {
  resolve<T>(serviceName: string): T;
  dispose(): void;
}

export class DependencyInjectionContainer {
  private services = new Map<string, ServiceRegistration>();
  private singletons = new Map<string, any>();
  private scopes = new Map<string, ServiceScope>();
  private dependencyGraph = new Map<string, Set<string>>();
  private disposed = false;

  /**
   * Register a service with enhanced lifecycle management
   */
  register<T>(
    serviceName: string, 
    factory: () => T, 
    options: Partial<ServiceRegistration<T>> = {}
  ): void {
    if (this.disposed) {
      throw new Error('Container has been disposed');
    }

    const registration: ServiceRegistration<T> = {
      factory,
      lifecycle: options.lifecycle || 'singleton',
      onInit: options.onInit,
      onDestroy: options.onDestroy,
      dependencies: options.dependencies || []
    };

    // Detect circular dependencies during registration
    this.detectCircularDependencies(serviceName, registration.dependencies || []);

    // Update dependency graph
    this.dependencyGraph.set(serviceName, new Set(registration.dependencies));

    this.services.set(serviceName, registration);
  }

  /**
   * Resolve a service with automatic dependency injection
   */
  resolve<T>(serviceName: string): T {
    if (this.disposed) {
      throw new Error('Container has been disposed');
    }

    const registration = this.services.get(serviceName);
    if (!registration) {
      throw new Error(`Service '${serviceName}' not registered`);
    }

    // Handle different lifecycle types
    switch (registration.lifecycle) {
      case 'singleton':
        return this.resolveSingleton<T>(serviceName, registration);
      case 'transient':
        return this.resolveTransient<T>(serviceName, registration);
      case 'scoped':
        return this.resolveScoped<T>(serviceName, registration);
      default:
        throw new Error(`Unknown lifecycle: ${registration.lifecycle}`);
    }
  }

  /**
   * Create a new service scope
   */
  createScope(): ServiceScope {
    const scopeId = `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scopeServices = new Map<string, any>();

    const scope: ServiceScope = {
      resolve: <T>(serviceName: string): T => {
        const registration = this.services.get(serviceName);
        if (!registration) {
          throw new Error(`Service '${serviceName}' not registered`);
        }

        // Check if service is already resolved in this scope
        if (scopeServices.has(serviceName)) {
          return scopeServices.get(serviceName);
        }

        // Resolve dependencies first
        const dependencies = this.resolveDependencies(registration.dependencies || []);
        
        // Create service instance
        const instance = registration.factory();
        
        // Inject dependencies if the service has a constructor that accepts them
        if (dependencies.length > 0 && typeof instance === 'object' && instance !== null) {
          this.injectDependencies(instance, dependencies);
        }

        // Initialize service if onInit hook is provided
        if (registration.onInit) {
          Promise.resolve(registration.onInit(instance)).catch(error => {
            console.error(`Failed to initialize service '${serviceName}':`, error);
          });
        }

        // Store in scope for scoped services
        if (registration.lifecycle === 'scoped') {
          scopeServices.set(serviceName, instance);
        }

        return instance;
      },
      dispose: () => {
        // Clean up scoped services
        for (const [serviceName, instance] of scopeServices) {
          const registration = this.services.get(serviceName);
          if (registration?.onDestroy) {
            Promise.resolve(registration.onDestroy(instance)).catch(error => {
              console.error(`Failed to destroy service '${serviceName}':`, error);
            });
          }
        }
        scopeServices.clear();
        this.scopes.delete(scopeId);
      }
    };

    this.scopes.set(scopeId, scope);
    return scope;
  }

  /**
   * Dispose the container and all services
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Dispose all scopes
    for (const scope of this.scopes.values()) {
      scope.dispose();
    }
    this.scopes.clear();

    // Dispose all singletons
    for (const [serviceName, instance] of this.singletons) {
      const registration = this.services.get(serviceName);
      if (registration?.onDestroy) {
        try {
          await registration.onDestroy(instance);
        } catch (error) {
          console.error(`Failed to destroy singleton '${serviceName}':`, error);
        }
      }
    }
    this.singletons.clear();

    this.services.clear();
    this.dependencyGraph.clear();
  }

  /**
   * Get container statistics
   */
  getStats(): {
    totalServices: number;
    singletons: number;
    activeScopes: number;
    disposed: boolean;
  } {
    return {
      totalServices: this.services.size,
      singletons: this.singletons.size,
      activeScopes: this.scopes.size,
      disposed: this.disposed
    };
  }

  private resolveSingleton<T>(serviceName: string, registration: ServiceRegistration<T>): T {
    if (this.singletons.has(serviceName)) {
      return this.singletons.get(serviceName);
    }

    const dependencies = this.resolveDependencies(registration.dependencies || []);
    const instance = registration.factory();
    
    if (dependencies.length > 0 && typeof instance === 'object' && instance !== null) {
      this.injectDependencies(instance, dependencies);
    }

    if (registration.onInit) {
      Promise.resolve(registration.onInit(instance)).catch(error => {
        console.error(`Failed to initialize singleton '${serviceName}':`, error);
      });
    }

    this.singletons.set(serviceName, instance);
    return instance;
  }

  private resolveTransient<T>(serviceName: string, registration: ServiceRegistration<T>): T {
    const dependencies = this.resolveDependencies(registration.dependencies || []);
    const instance = registration.factory();
    
    if (dependencies.length > 0 && typeof instance === 'object' && instance !== null) {
      this.injectDependencies(instance, dependencies);
    }

    if (registration.onInit) {
      Promise.resolve(registration.onInit(instance)).catch(error => {
        console.error(`Failed to initialize transient service '${serviceName}':`, error);
      });
    }

    return instance;
  }

  private resolveScoped<T>(serviceName: string, registration: ServiceRegistration<T>): T {
    // For scoped services, we need a scope context
    // This is a simplified implementation - in practice, you'd need scope context
    throw new Error(`Scoped service '${serviceName}' must be resolved within a scope`);
  }

  private resolveDependencies(dependencyNames: string[]): any[] {
    return dependencyNames.map(name => this.resolve(name));
  }

  private injectDependencies(instance: any, dependencies: any[]): void {
    // Simple dependency injection - assumes constructor accepts dependencies in order
    // In a more sophisticated implementation, you might use decorators or property injection
    if (typeof instance.constructor === 'function' && dependencies.length > 0) {
      // This is a simplified approach - in practice, you'd use reflection or decorators
      console.warn('Dependency injection simplified - consider using decorators for better DI');
    }
  }

  private detectCircularDependencies(serviceName: string, dependencies: string[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (current: string): void => {
      if (recursionStack.has(current)) {
        const cycle = Array.from(recursionStack).join(' -> ') + ` -> ${current}`;
        throw new Error(`Circular dependency detected: ${cycle}`);
      }

      if (visited.has(current)) {
        return;
      }

      visited.add(current);
      recursionStack.add(current);

      const registration = this.services.get(current);
      if (registration?.dependencies) {
        for (const dep of registration.dependencies) {
          dfs(dep);
        }
      }

      recursionStack.delete(current);
    };

    // Check if adding this service creates a cycle
    const tempGraph = new Map(this.dependencyGraph);
    tempGraph.set(serviceName, new Set(dependencies));
    
    // Build full dependency graph temporarily
    const allDeps = new Set<string>();
    for (const dep of dependencies) {
      allDeps.add(dep);
      const depRegistration = this.services.get(dep);
      if (depRegistration?.dependencies) {
        for (const subDep of depRegistration.dependencies) {
          allDeps.add(subDep);
        }
      }
    }

    // Check for cycles
    for (const dep of allDeps) {
      dfs(dep);
    }
  }
}

// Global container instance
export const container = new DependencyInjectionContainer(); 