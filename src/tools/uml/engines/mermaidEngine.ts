import { EngineStrategy, RenderOptions, RenderResult, EngineCapabilities, EnginePerformanceMetrics } from '../strategy/engineStrategy';
import { FeatureFlagManager } from '../../config/featureFlags';

export interface MermaidConfig {
  theme: string;
  fontFamily: string;
  fontSize: number;
  securityLevel: 'strict' | 'loose' | 'antiscript';
}

export class MermaidEngine implements EngineStrategy {
  private featureFlags: FeatureFlagManager;
  private isInitialized: boolean = false;
  private config: MermaidConfig;

  constructor() {
    this.featureFlags = FeatureFlagManager.getInstance();
    this.config = {
      theme: 'default',
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      securityLevel: 'loose'
    };
  }

  get id(): string { return 'mermaid'; }
  get name(): string { return 'Mermaid'; }
  get description(): string { return 'Mermaid diagram rendering engine'; }

  get capabilities(): EngineCapabilities {
    return {
      supportsDiagramType: (diagramType: string) => {
        const mermaidFormats = ['flowchart', 'sequence', 'class', 'state', 'gantt', 'pie'];
        return mermaidFormats.includes(diagramType.toLowerCase());
      },
      supportsFeature: (feature: string) => {
        const supportedFeatures = ['interactive', 'themes', 'customization', 'svg'];
        return supportedFeatures.includes(feature.toLowerCase());
      },
      getPerformanceMetrics: (): EnginePerformanceMetrics => {
        return {
          averageRenderTime: 0, // Will be updated in later phases
          memoryUsage: 0,
          successRate: 1.0,
          lastUsed: new Date(),
          totalRenders: 0
        };
      },
      getQualityScore: (): number => {
        return 0.8; // Phase 1 placeholder score
      }
    };
  }

  async initialize(): Promise<void> {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      throw new Error('Mermaid engine is disabled. Enable it in settings to use this feature.');
    }

    try {
      // Phase 1: Basic initialization - will be enhanced in later phases
      this.isInitialized = true;
      console.log('Mermaid engine initialized successfully (Phase 1)');
    } catch (error) {
      console.error('Failed to initialize Mermaid engine:', error);
      throw error;
    }
  }

  async render(diagramCode: string, options: RenderOptions): Promise<RenderResult> {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      return {
        success: false,
        output: this.getFallbackSvg(),
        format: 'svg',
        metadata: {
          renderTime: 0,
          engineUsed: 'mermaid',
          errors: ['Mermaid engine is disabled. Enable it in settings to use this feature.']
        }
      };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Phase 1: Return placeholder with feature flag info
      const placeholderSvg = this.getPlaceholderSvg(diagramCode, options);
      
      return {
        success: true,
        output: placeholderSvg,
        format: options.format || 'svg',
        metadata: {
          renderTime: 0,
          engineUsed: 'mermaid',
          warnings: ['This is a Phase 1 placeholder. Full Mermaid rendering will be available in Phase 2.']
        }
      };
    } catch (error) {
      return {
        success: false,
        output: this.getFallbackSvg(),
        format: options.format || 'svg',
        metadata: {
          renderTime: 0,
          engineUsed: 'mermaid',
          errors: [error instanceof Error ? error.message : String(error)]
        }
      };
    }
  }

  canHandle(diagramType: string, requirements: any = {}): boolean {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      return false;
    }

    // Phase 1: Basic format detection
    const mermaidFormats = ['flowchart', 'sequence', 'class', 'state', 'gantt', 'pie'];
    return mermaidFormats.includes(diagramType.toLowerCase());
  }

  async warmup(): Promise<void> {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      return;
    }

    try {
      // Phase 1: Basic warmup - will be enhanced in later phases
      console.log('Mermaid engine warmup completed (Phase 1)');
    } catch (error) {
      console.warn('Mermaid engine warmup failed:', error);
    }
  }

  async optimize(): Promise<void> {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      return;
    }

    try {
      // Phase 1: Basic optimization - will be enhanced in later phases
      console.log('Mermaid engine optimization completed (Phase 1)');
    } catch (error) {
      console.warn('Mermaid engine optimization failed:', error);
    }
  }

  async dispose(): Promise<void> {
    this.isInitialized = false;
    console.log('Mermaid engine disposed');
  }

  private detectDiagramType(code: string): string {
    const trimmedCode = code.trim().toLowerCase();
    
    if (trimmedCode.startsWith('graph') || trimmedCode.startsWith('flowchart')) {
      return 'flowchart';
    } else if (trimmedCode.startsWith('sequencediagram')) {
      return 'sequence';
    } else if (trimmedCode.startsWith('classdiagram')) {
      return 'class';
    } else if (trimmedCode.startsWith('statediagram')) {
      return 'state';
    } else if (trimmedCode.startsWith('gantt')) {
      return 'gantt';
    } else if (trimmedCode.startsWith('pie')) {
      return 'pie';
    }
    
    return 'unknown';
  }

  private getPlaceholderSvg(code: string, options: RenderOptions): string {
    const diagramType = this.detectDiagramType(code);
    const codePreview = code.length > 50 ? code.substring(0, 50) + '...' : code;
    
    return `
      <svg width="500" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f0f0f0;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#grad1)" rx="8" ry="8"/>
        
        <!-- Header -->
        <rect x="0" y="0" width="100%" height="40" fill="#007acc" rx="8" ry="8"/>
        <text x="10" y="25" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
          Mermaid Engine (Phase 1)
        </text>
        
        <!-- Content -->
        <text x="50%" y="80" text-anchor="middle" fill="#333" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
          Feature Enabled - Ready for Implementation
        </text>
        
        <text x="50%" y="110" text-anchor="middle" fill="#666" font-family="Arial, sans-serif" font-size="12">
          Detected Type: ${diagramType}
        </text>
        
        <text x="50%" y="130" text-anchor="middle" fill="#666" font-family="Arial, sans-serif" font-size="12">
          Code Length: ${code.length} characters
        </text>
        
        <!-- Code Preview -->
        <rect x="20" y="150" width="460" height="60" fill="white" stroke="#ccc" stroke-width="1" rx="4"/>
        <text x="25" y="170" fill="#333" font-family="monospace" font-size="10">
          ${codePreview.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </text>
        
        <!-- Footer -->
        <text x="50%" y="250" text-anchor="middle" fill="#999" font-family="Arial, sans-serif" font-size="10">
          This is a placeholder. Full Mermaid rendering will be available in Phase 2.
        </text>
      </svg>
    `;
  }

  private getFallbackSvg(): string {
    return `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fff3cd;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ffeaa7;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#grad2)" rx="8" ry="8"/>
        
        <text x="50%" y="80" text-anchor="middle" fill="#856404" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
          Mermaid Engine Disabled
        </text>
        
        <text x="50%" y="110" text-anchor="middle" fill="#856404" font-family="Arial, sans-serif" font-size="12">
          Enable in settings to use Mermaid diagrams
        </text>
        
        <text x="50%" y="140" text-anchor="middle" fill="#856404" font-family="Arial, sans-serif" font-size="10">
          Settings → umlChatDesigner.features.mermaidEngine
        </text>
      </svg>
    `;
  }
} 