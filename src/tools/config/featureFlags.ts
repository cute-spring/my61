import * as vscode from 'vscode';

export interface FeatureFlags {
  mermaid: {
    enabled: boolean;
    engine: boolean;
    formatDetection: boolean;
    ui: boolean;
    analytics: boolean;
  };
}

export interface FeatureChangeEvent {
  feature: string;
  enabled: boolean;
  timestamp: Date;
}

export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: FeatureFlags;
  private listeners: Array<(event: FeatureChangeEvent) => void> = [];

  private constructor() {
    this.flags = {
      mermaid: {
        enabled: false,
        engine: false,
        formatDetection: false,
        ui: false,
        analytics: false
      }
    };
  }

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    // Check VS Code settings first
    const config = vscode.workspace.getConfiguration('umlChatDesigner');
    const settingKey = `features.${feature}`;
    
    if (config.has(settingKey)) {
      return config.get(settingKey, false);
    }
    
    // Fallback to default flags
    const featurePath = feature.split('.');
    let current: any = this.flags;
    
    for (const path of featurePath) {
      if (current && typeof current === 'object' && path in current) {
        current = current[path];
      } else {
        return false;
      }
    }
    
    return Boolean(current);
  }

  /**
   * Enable a specific feature
   */
  async enableFeature(feature: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('umlChatDesigner');
      await config.update(`features.${feature}`, true, vscode.ConfigurationTarget.Global);
      
      this.notifyFeatureChange(feature, true);
      console.log(`Feature '${feature}' enabled successfully`);
    } catch (error) {
      console.error(`Failed to enable feature '${feature}':`, error);
      throw error;
    }
  }

  /**
   * Disable a specific feature
   */
  async disableFeature(feature: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('umlChatDesigner');
      await config.update(`features.${feature}`, false, vscode.ConfigurationTarget.Global);
      
      this.notifyFeatureChange(feature, false);
      console.log(`Feature '${feature}' disabled successfully`);
    } catch (error) {
      console.error(`Failed to disable feature '${feature}':`, error);
      throw error;
    }
  }

  /**
   * Get all feature flags status
   */
  getAllFeatureFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Add a listener for feature changes
   */
  addListener(listener: (event: FeatureChangeEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener for feature changes
   */
  removeListener(listener: (event: FeatureChangeEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of feature changes
   */
  private notifyFeatureChange(feature: string, enabled: boolean): void {
    const event: FeatureChangeEvent = {
      feature,
      enabled,
      timestamp: new Date()
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in feature change listener:', error);
      }
    });
  }

  /**
   * Get feature status for debugging
   */
  getFeatureStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    // Check all mermaid features
    const mermaidFeatures = ['mermaid', 'mermaidEngine', 'mermaidFormatDetection', 'mermaidUI', 'mermaidAnalytics'];
    
    for (const feature of mermaidFeatures) {
      status[feature] = this.isFeatureEnabled(feature);
    }
    
    return status;
  }

  /**
   * Reset all features to default (disabled)
   */
  async resetToDefaults(): Promise<void> {
    const config = vscode.workspace.getConfiguration('umlChatDesigner');
    const mermaidFeatures = ['mermaid', 'mermaidEngine', 'mermaidFormatDetection', 'mermaidUI', 'mermaidAnalytics'];
    
    for (const feature of mermaidFeatures) {
      await config.update(`features.${feature}`, false, vscode.ConfigurationTarget.Global);
    }
    
    console.log('All Mermaid features reset to default (disabled)');
  }
} 