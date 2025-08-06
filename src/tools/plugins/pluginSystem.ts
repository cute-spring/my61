/**
 * Plugin System Architecture
 * Phase 3 - Advanced Features Foundation
 */

import { container } from '../base/dependencyInjection';
import { eventBus } from '../base/eventBus';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  entryPoint: string;
  permissions?: string[];
  settings?: PluginSetting[];
}

export interface PluginSetting {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  defaultValue: any;
  description: string;
  options?: string[]; // For select type
}

export interface PluginContext {
  container: typeof container;
  eventBus: typeof eventBus;
  settings: PluginSettings;
  logger: PluginLogger;
  workspace: PluginWorkspace;
}

export interface PluginSettings {
  get<T>(key: string, defaultValue?: T): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
}

export interface PluginLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface PluginWorkspace {
  getConfiguration(section: string): any;
  getWorkspaceFolder(): string | undefined;
  getExtensionPath(): string;
}

export interface Plugin {
  manifest: PluginManifest;
  context: PluginContext;
  
  // Lifecycle methods
  onActivate?(): void | Promise<void>;
  onDeactivate?(): void | Promise<void>;
  onSettingsChanged?(settings: PluginSettings): void | Promise<void>;
  
  // Plugin-specific methods
  [key: string]: any;
}

export interface PluginLoader {
  loadPlugin(manifestPath: string): Promise<Plugin>;
  unloadPlugin(pluginId: string): Promise<void>;
  getLoadedPlugins(): Plugin[];
  reloadPlugin(pluginId: string): Promise<void>;
}

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private loaders = new Map<string, PluginLoader>();
  private pluginSettings = new Map<string, PluginSettings>();
  private disposed = false;

  constructor() {
    this.registerDefaultLoaders();
  }

  /**
   * Register a plugin loader for a specific file type
   */
  registerLoader(fileExtension: string, loader: PluginLoader): void {
    if (this.disposed) {
      throw new Error('PluginManager has been disposed');
    }
    this.loaders.set(fileExtension, loader);
  }

  /**
   * Load a plugin from a manifest file
   */
  async loadPlugin(manifestPath: string): Promise<Plugin> {
    if (this.disposed) {
      throw new Error('PluginManager has been disposed');
    }

    const extension = this.getFileExtension(manifestPath);
    const loader = this.loaders.get(extension);
    
    if (!loader) {
      throw new Error(`No loader registered for file extension: ${extension}`);
    }

    const plugin = await loader.loadPlugin(manifestPath);
    
    // Create plugin context
    const context = this.createPluginContext(plugin.manifest);
    plugin.context = context;

    // Register plugin services in DI container
    this.registerPluginServices(plugin);

    // Activate plugin
    if (plugin.onActivate) {
      await plugin.onActivate();
    }

    this.plugins.set(plugin.manifest.id, plugin);
    
    // Publish plugin loaded event
    await eventBus.publish('plugin.loaded', {
      pluginId: plugin.manifest.id,
      manifest: plugin.manifest
    });

    return plugin;
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    if (this.disposed) {
      throw new Error('PluginManager has been disposed');
    }

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    // Deactivate plugin
    if (plugin.onDeactivate) {
      await plugin.onDeactivate();
    }

    // Unregister plugin services
    this.unregisterPluginServices(plugin);

    this.plugins.delete(pluginId);
    this.pluginSettings.delete(pluginId);

    // Publish plugin unloaded event
    await eventBus.publish('plugin.unloaded', {
      pluginId: plugin.manifest.id
    });
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    await this.unloadPlugin(pluginId);
    await this.loadPlugin(plugin.manifest.entryPoint);
  }

  /**
   * Get plugin statistics
   */
  getStats(): {
    totalPlugins: number;
    activePlugins: number;
    loaders: number;
    disposed: boolean;
  } {
    return {
      totalPlugins: this.plugins.size,
      activePlugins: this.plugins.size, // All loaded plugins are considered active
      loaders: this.loaders.size,
      disposed: this.disposed
    };
  }

  /**
   * Dispose the plugin manager
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Unload all plugins
    const pluginIds = Array.from(this.plugins.keys());
    for (const pluginId of pluginIds) {
      await this.unloadPlugin(pluginId);
    }

    this.plugins.clear();
    this.loaders.clear();
    this.pluginSettings.clear();
  }

  private registerDefaultLoaders(): void {
    // Register JavaScript/TypeScript plugin loader
    this.registerLoader('.js', new JavaScriptPluginLoader());
    this.registerLoader('.ts', new TypeScriptPluginLoader());
  }

  private createPluginContext(manifest: PluginManifest): PluginContext {
    const settings = this.createPluginSettings(manifest.id);
    const logger = this.createPluginLogger(manifest.id);
    const workspace = this.createPluginWorkspace();

    return {
      container,
      eventBus,
      settings,
      logger,
      workspace
    };
  }

  private createPluginSettings(pluginId: string): PluginSettings {
    const settingsKey = `plugin.${pluginId}`;
    
    return {
      get: <T>(key: string, defaultValue?: T): T => {
        // In a real implementation, this would read from VS Code's configuration
        const fullKey = `${settingsKey}.${key}`;
        // For now, return default value
        return defaultValue as T;
      },
      set: <T>(key: string, value: T): void => {
        const fullKey = `${settingsKey}.${key}`;
        // In a real implementation, this would write to VS Code's configuration
        console.log(`Setting ${fullKey} = ${value}`);
      },
      has: (key: string): boolean => {
        const fullKey = `${settingsKey}.${key}`;
        // In a real implementation, this would check VS Code's configuration
        return false;
      },
      delete: (key: string): void => {
        const fullKey = `${settingsKey}.${key}`;
        // In a real implementation, this would delete from VS Code's configuration
        console.log(`Deleting ${fullKey}`);
      }
    };
  }

  private createPluginLogger(pluginId: string): PluginLogger {
    return {
      info: (message: string, ...args: any[]) => {
        console.log(`[Plugin:${pluginId}] ${message}`, ...args);
      },
      warn: (message: string, ...args: any[]) => {
        console.warn(`[Plugin:${pluginId}] ${message}`, ...args);
      },
      error: (message: string, ...args: any[]) => {
        console.error(`[Plugin:${pluginId}] ${message}`, ...args);
      },
      debug: (message: string, ...args: any[]) => {
        console.debug(`[Plugin:${pluginId}] ${message}`, ...args);
      }
    };
  }

  private createPluginWorkspace(): PluginWorkspace {
    return {
      getConfiguration: (section: string) => {
        // In a real implementation, this would return VS Code's workspace configuration
        return {};
      },
      getWorkspaceFolder: () => {
        // In a real implementation, this would return the current workspace folder
        return undefined;
      },
      getExtensionPath: () => {
        // In a real implementation, this would return the extension's path
        return '';
      }
    };
  }

  private registerPluginServices(plugin: Plugin): void {
    // Register plugin as a service in the DI container
    container.register(`plugin.${plugin.manifest.id}`, () => plugin, {
      lifecycle: 'singleton',
      onInit: async (service) => {
        if (service.onActivate) {
          await service.onActivate();
        }
      },
      onDestroy: async (service) => {
        if (service.onDeactivate) {
          await service.onDeactivate();
        }
      }
    });

    // Register plugin context
    container.register(`plugin.${plugin.manifest.id}.context`, () => plugin.context, {
      lifecycle: 'singleton'
    });
  }

  private unregisterPluginServices(plugin: Plugin): void {
    // In a real implementation, you would unregister services from the DI container
    // For now, we'll just log the action
    console.log(`Unregistering services for plugin: ${plugin.manifest.id}`);
  }

  private getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.');
    return lastDotIndex !== -1 ? filePath.substring(lastDotIndex) : '';
  }
}

// Plugin Loader Implementations

export class JavaScriptPluginLoader implements PluginLoader {
  async loadPlugin(manifestPath: string): Promise<Plugin> {
    // In a real implementation, this would load and execute JavaScript modules
    // For now, we'll create a mock plugin
    const manifest: PluginManifest = {
      id: 'mock-js-plugin',
      name: 'Mock JavaScript Plugin',
      version: '1.0.0',
      description: 'A mock JavaScript plugin for testing',
      author: 'Test Author',
      entryPoint: manifestPath
    };

    return {
      manifest,
      context: {} as PluginContext
    };
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    // Cleanup JavaScript plugin resources
    console.log(`Unloading JavaScript plugin: ${pluginId}`);
  }

  getLoadedPlugins(): Plugin[] {
    return [];
  }

  async reloadPlugin(pluginId: string): Promise<void> {
    console.log(`Reloading JavaScript plugin: ${pluginId}`);
  }
}

export class TypeScriptPluginLoader implements PluginLoader {
  async loadPlugin(manifestPath: string): Promise<Plugin> {
    // In a real implementation, this would compile and load TypeScript modules
    // For now, we'll create a mock plugin
    const manifest: PluginManifest = {
      id: 'mock-ts-plugin',
      name: 'Mock TypeScript Plugin',
      version: '1.0.0',
      description: 'A mock TypeScript plugin for testing',
      author: 'Test Author',
      entryPoint: manifestPath
    };

    return {
      manifest,
      context: {} as PluginContext
    };
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    // Cleanup TypeScript plugin resources
    console.log(`Unloading TypeScript plugin: ${pluginId}`);
  }

  getLoadedPlugins(): Plugin[] {
    return [];
  }

  async reloadPlugin(pluginId: string): Promise<void> {
    console.log(`Reloading TypeScript plugin: ${pluginId}`);
  }
}

// Global plugin manager instance
export const pluginManager = new PluginManager(); 