/**
 * Lazy Loading System
 * Phase 3 - Advanced Features Foundation
 */

export interface LazyModule<T = any> {
  id: string;
  load(): Promise<T>;
  isLoaded: boolean;
  isLoading: boolean;
  lastAccessed: Date;
  accessCount: number;
}

export interface LazyLoadingOptions {
  preload?: boolean;
  cacheSize?: number;
  ttl?: number; // Time to live in milliseconds
  priority?: 'high' | 'normal' | 'low';
  retryCount?: number;
  retryDelay?: number;
}

export interface ModuleMetadata {
  size: number;
  dependencies: string[];
  loadTime: number;
  lastUsed: Date;
  usageCount: number;
}

export class LazyLoadingManager {
  private modules = new Map<string, LazyModule>();
  private cache = new Map<string, any>();
  private metadata = new Map<string, ModuleMetadata>();
  private loadingPromises = new Map<string, Promise<any>>();
  private disposed = false;

  constructor(private options: LazyLoadingOptions = {}) {
    this.options = {
      preload: false,
      cacheSize: 100,
      ttl: 300000, // 5 minutes
      priority: 'normal',
      retryCount: 3,
      retryDelay: 1000,
      ...this.options
    };
  }

  /**
   * Register a lazy module
   */
  registerModule<T>(
    id: string,
    loader: () => Promise<T>,
    options: LazyLoadingOptions = {}
  ): LazyModule<T> {
    if (this.disposed) {
      throw new Error('LazyLoadingManager has been disposed');
    }

    const moduleOptions = { ...this.options, ...options };
    
    const lazyModule: LazyModule<T> = {
      id,
      isLoaded: false,
      isLoading: false,
      lastAccessed: new Date(),
      accessCount: 0,
      load: async (): Promise<T> => {
        return this.loadModule(id, loader, moduleOptions);
      }
    };

    this.modules.set(id, lazyModule);
    this.metadata.set(id, {
      size: 0,
      dependencies: [],
      loadTime: 0,
      lastUsed: new Date(),
      usageCount: 0
    });

    // Preload if configured
    if (moduleOptions.preload) {
      this.preloadModule(id);
    }

    return lazyModule;
  }

  /**
   * Load a module with caching and retry logic
   */
  async loadModule<T>(
    id: string,
    loader: () => Promise<T>,
    options: LazyLoadingOptions
  ): Promise<T> {
    const module = this.modules.get(id);
    if (!module) {
      throw new Error(`Module '${id}' not registered`);
    }

    // Check cache first
    if (this.cache.has(id)) {
      const cached = this.cache.get(id);
      this.updateModuleUsage(id);
      return cached;
    }

    // Check if already loading
    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id);
    }

    // Start loading
    module.isLoading = true;
    const loadPromise = this.performLoad(id, loader, options);
    this.loadingPromises.set(id, loadPromise);

    try {
      const result = await loadPromise;
      
      // Cache the result
      this.cache.set(id, result);
      module.isLoaded = true;
      module.isLoading = false;
      
      // Update metadata
      this.updateModuleMetadata(id, result);
      
      // Manage cache size
      this.manageCacheSize();
      
      return result;
    } catch (error) {
      module.isLoading = false;
      this.loadingPromises.delete(id);
      throw error;
    }
  }

  /**
   * Preload a module in the background
   */
  async preloadModule(id: string): Promise<void> {
    const module = this.modules.get(id);
    if (!module || module.isLoaded || module.isLoading) {
      return;
    }

    try {
      await module.load();
      console.log(`Preloaded module: ${id}`);
    } catch (error) {
      console.warn(`Failed to preload module ${id}:`, error);
    }
  }

  /**
   * Unload a module to free memory
   */
  unloadModule(id: string): void {
    const module = this.modules.get(id);
    if (!module) {
      return;
    }

    this.cache.delete(id);
    this.metadata.delete(id);
    this.loadingPromises.delete(id);
    
    module.isLoaded = false;
    module.isLoading = false;
    
    console.log(`Unloaded module: ${id}`);
  }

  /**
   * Get module statistics
   */
  getModuleStats(id: string): {
    isLoaded: boolean;
    isLoading: boolean;
    accessCount: number;
    lastAccessed: Date;
    loadTime: number;
    size: number;
  } | null {
    const module = this.modules.get(id);
    const metadata = this.metadata.get(id);
    
    if (!module || !metadata) {
      return null;
    }

    return {
      isLoaded: module.isLoaded,
      isLoading: module.isLoading,
      accessCount: module.accessCount,
      lastAccessed: module.lastAccessed,
      loadTime: metadata.loadTime,
      size: metadata.size
    };
  }

  /**
   * Get overall statistics
   */
  getStats(): {
    totalModules: number;
    loadedModules: number;
    loadingModules: number;
    cacheSize: number;
    totalLoadTime: number;
    averageLoadTime: number;
  } {
    let loadedCount = 0;
    let loadingCount = 0;
    let totalLoadTime = 0;
    let loadTimeCount = 0;

    for (const metadata of this.metadata.values()) {
      if (metadata.loadTime > 0) {
        totalLoadTime += metadata.loadTime;
        loadTimeCount++;
      }
    }

    for (const module of this.modules.values()) {
      if (module.isLoaded) {loadedCount++;}
      if (module.isLoading) {loadingCount++;}
    }

    return {
      totalModules: this.modules.size,
      loadedModules: loadedCount,
      loadingModules: loadingCount,
      cacheSize: this.cache.size,
      totalLoadTime,
      averageLoadTime: loadTimeCount > 0 ? totalLoadTime / loadTimeCount : 0
    };
  }

  /**
   * Clear cache and unload all modules
   */
  clearCache(): void {
    for (const [id, module] of this.modules) {
      this.unloadModule(id);
    }
  }

  /**
   * Dispose the lazy loading manager
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.clearCache();
    this.modules.clear();
    this.metadata.clear();
    this.loadingPromises.clear();
  }

  private async performLoad<T>(
    id: string,
    loader: () => Promise<T>,
    options: LazyLoadingOptions
  ): Promise<T> {
    let attempts = 0;
    const maxAttempts = options.retryCount! + 1;

    while (attempts < maxAttempts) {
      try {
        const startTime = Date.now();
        const result = await loader();
        const loadTime = Date.now() - startTime;

        // Update metadata
        const metadata = this.metadata.get(id);
        if (metadata) {
          metadata.loadTime = loadTime;
          metadata.lastUsed = new Date();
          metadata.usageCount++;
        }

        return result;
      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, options.retryDelay));
      }
    }

    throw new Error(`Failed to load module '${id}' after ${maxAttempts} attempts`);
  }

  private updateModuleUsage(id: string): void {
    const module = this.modules.get(id);
    const metadata = this.metadata.get(id);
    
    if (module && metadata) {
      module.lastAccessed = new Date();
      module.accessCount++;
      metadata.lastUsed = new Date();
      metadata.usageCount++;
    }
  }

  private updateModuleMetadata(id: string, result: any): void {
    const metadata = this.metadata.get(id);
    if (metadata) {
      // Estimate size (simplified)
      metadata.size = JSON.stringify(result).length;
      metadata.lastUsed = new Date();
    }
  }

  private manageCacheSize(): void {
    if (this.cache.size <= this.options.cacheSize!) {
      return;
    }

    // Remove least recently used modules
    const entries = Array.from(this.metadata.entries())
      .sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime());

    const toRemove = this.cache.size - this.options.cacheSize!;
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.unloadModule(entries[i][0]);
    }
  }
}

// Global lazy loading manager instance
export const lazyLoadingManager = new LazyLoadingManager();

// Utility functions for common lazy loading patterns

/**
 * Create a lazy-loaded service
 */
export function createLazyService<T>(
  id: string,
  factory: () => Promise<T>,
  options: LazyLoadingOptions = {}
): () => Promise<T> {
  const module = lazyLoadingManager.registerModule(id, factory, options);
  return () => module.load();
}

/**
 * Create a lazy-loaded component
 */
export function createLazyComponent<T>(
  id: string,
  factory: () => Promise<T>,
  options: LazyLoadingOptions = {}
): LazyModule<T> {
  return lazyLoadingManager.registerModule(id, factory, options);
}

/**
 * Preload critical modules for better startup performance
 */
export async function preloadCriticalModules(moduleIds: string[]): Promise<void> {
  const preloadPromises = moduleIds.map(id => {
    return lazyLoadingManager.preloadModule(id);
  });

  await Promise.allSettled(preloadPromises);
} 