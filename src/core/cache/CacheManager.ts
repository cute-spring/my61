import { Logger } from '../logging/Logger';
import { ConfigManager } from '../config/ConfigManager';
import { EventBus } from '../events/EventBus';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: Date;
  size: number; // Estimated size in bytes
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  averageAccessTime: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum number of entries
  maxMemory: number; // Maximum memory usage in bytes
  defaultTTL: number; // Default time to live in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  strategy: 'LRU' | 'LFU' | 'FIFO' | 'TTL';
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  private logger: Logger;
  private config: ConfigManager;
  private eventBus: EventBus;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    totalAccessTime: number;
    accessCount: number;
  } = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccessTime: 0,
    accessCount: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private configKey: string = 'cache';

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.initializeCache();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private initializeCache(): void {
    const cacheConfig = this.getCacheConfig();
    
    // Start cleanup timer
    this.startCleanupTimer(cacheConfig.cleanupInterval);
    
    this.logger.info(`Cache manager initialized`, {
      component: 'CacheManager',
      maxSize: cacheConfig.maxSize,
      maxMemory: cacheConfig.maxMemory,
      defaultTTL: cacheConfig.defaultTTL,
      strategy: cacheConfig.strategy
    });
  }

  private getCacheConfig(): CacheConfig {
    // Use default values since cache config is not yet in the main config
    return {
      maxSize: 1000,
      maxMemory: 100 * 1024 * 1024, // 100MB
      defaultTTL: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      strategy: 'LRU' as const
    };
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const startTime = Date.now();
    const cacheConfig = this.getCacheConfig();
    
    // Check if we need to evict entries
    this.ensureCapacity();
    
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: new Date(),
      ttl: ttl || cacheConfig.defaultTTL,
      accessCount: 0,
      lastAccessed: new Date(),
      size: this.estimateSize(value)
    };

    this.cache.set(key, entry);
    
    const duration = Date.now() - startTime;
    this.stats.totalAccessTime += duration;
    this.stats.accessCount++;

    this.logger.debug(`Cache entry set`, {
      component: 'CacheManager',
      key,
      size: entry.size,
      ttl: entry.ttl,
      duration
    });

    // Publish event
    this.eventBus.publish('cache.set', {
      key,
      size: entry.size,
      ttl: entry.ttl
    });
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const startTime = Date.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      this.logger.debug(`Cache miss`, { component: 'CacheManager', key });
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.logger.debug(`Cache entry expired`, { component: 'CacheManager', key });
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.stats.hits++;

    const duration = Date.now() - startTime;
    this.stats.totalAccessTime += duration;
    this.stats.accessCount++;

    this.logger.debug(`Cache hit`, {
      component: 'CacheManager',
      key,
      accessCount: entry.accessCount,
      duration
    });

    // Publish event
    this.eventBus.publish('cache.get', {
      key,
      accessCount: entry.accessCount
    });

    return entry.value;
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache entry deleted`, { component: 'CacheManager', key });
      
      // Publish event
      this.eventBus.publish('cache.delete', { key });
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    
    this.logger.info(`Cache cleared`, {
      component: 'CacheManager',
      clearedEntries: size
    });

    // Publish event
    this.eventBus.publish('cache.clear', { clearedEntries: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalEntries = this.cache.size;
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.stats.misses / totalRequests : 0;
    const averageAccessTime = this.stats.accessCount > 0 ? this.stats.totalAccessTime / this.stats.accessCount : 0;

    return {
      totalEntries,
      totalSize,
      hitRate,
      missRate,
      evictionCount: this.stats.evictions,
      averageAccessTime
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get total memory usage
   */
  getMemoryUsage(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const startTime = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    const duration = Date.now() - startTime;
    
    if (expiredCount > 0) {
      this.logger.info(`Cache cleanup completed`, {
        component: 'CacheManager',
        expiredCount,
        remainingEntries: this.cache.size,
        duration
      });
    }
  }

  /**
   * Evict entries based on strategy
   */
  private evictEntries(): void {
    const cacheConfig = this.getCacheConfig();
    const entries = Array.from(this.cache.entries());
    
    if (entries.length <= cacheConfig.maxSize) {
      return;
    }

    let entriesToEvict: [string, CacheEntry][] = [];

    switch (cacheConfig.strategy) {
      case 'LRU':
        // Least Recently Used
        entriesToEvict = entries
          .sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime())
          .slice(0, entries.length - cacheConfig.maxSize);
        break;
      
      case 'LFU':
        // Least Frequently Used
        entriesToEvict = entries
          .sort((a, b) => a[1].accessCount - b[1].accessCount)
          .slice(0, entries.length - cacheConfig.maxSize);
        break;
      
      case 'FIFO':
        // First In First Out
        entriesToEvict = entries
          .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
          .slice(0, entries.length - cacheConfig.maxSize);
        break;
      
      case 'TTL':
        // Time To Live
        entriesToEvict = entries
          .sort((a, b) => (a[1].timestamp.getTime() + a[1].ttl) - (b[1].timestamp.getTime() + b[1].ttl))
          .slice(0, entries.length - cacheConfig.maxSize);
        break;
    }

    // Evict entries
    for (const [key] of entriesToEvict) {
      this.cache.delete(key);
      this.stats.evictions++;
    }

    if (entriesToEvict.length > 0) {
      this.logger.info(`Cache eviction completed`, {
        component: 'CacheManager',
        evictedCount: entriesToEvict.length,
        strategy: cacheConfig.strategy,
        remainingEntries: this.cache.size
      });
    }
  }

  /**
   * Ensure cache capacity
   */
  private ensureCapacity(): void {
    const cacheConfig = this.getCacheConfig();
    const currentSize = this.cache.size;
    const currentMemory = this.getMemoryUsage();

    // Check size limit
    if (currentSize >= cacheConfig.maxSize) {
      this.evictEntries();
    }

    // Check memory limit
    if (currentMemory >= cacheConfig.maxMemory) {
      this.evictEntries();
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const expirationTime = entry.timestamp.getTime() + entry.ttl;
    return now > expirationTime;
  }

  /**
   * Estimate size of a value in bytes
   */
  private estimateSize(value: any): number {
    try {
      const jsonString = JSON.stringify(value);
      return new Blob([jsonString]).size;
    } catch {
      // Fallback estimation
      return 100; // Default size estimation
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(interval: number): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, interval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalAccessTime: 0,
      accessCount: 0
    };
    
    this.logger.info(`Cache statistics reset`, { component: 'CacheManager' });
  }

  /**
   * Get cache configuration
   */
  getPublicCacheConfig(): CacheConfig {
    return this.getCacheConfig();
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(config: Partial<CacheConfig>): void {
    const currentConfig = this.getCacheConfig();
    const newConfig = { ...currentConfig, ...config };
    
    // Restart cleanup timer if interval changed
    if (config.cleanupInterval) {
      this.stopCleanupTimer();
      this.startCleanupTimer(newConfig.cleanupInterval);
    }

    this.logger.info(`Cache configuration updated`, {
      component: 'CacheManager',
      config: newConfig
    });
  }

  /**
   * Dispose cache manager
   */
  dispose(): void {
    this.stopCleanupTimer();
    this.clear();
    this.logger.info(`Cache manager disposed`, { component: 'CacheManager' });
  }
} 