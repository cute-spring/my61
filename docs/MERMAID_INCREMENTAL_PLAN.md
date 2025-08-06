# Mermaid Support - Incremental Implementation Plan

## 🎯 **Incremental Development Strategy**

### **Core Principles:**
1. **Feature Flags** - Enable/disable Mermaid features safely
2. **Backward Compatibility** - Never break existing PlantUML functionality
3. **Progressive Enhancement** - Users can test new features as they're added
4. **Rollback Safety** - Easy to disable problematic features
5. **User Feedback** - Collect feedback at each stage

## 📋 **Phase-by-Phase Implementation**

### **Phase 1: Foundation & Feature Flags (Week 1)**

#### **Step 1.1: Feature Flag System**
**File**: `src/tools/config/featureFlags.ts`

```typescript
export interface FeatureFlags {
  mermaid: {
    enabled: boolean;
    engine: boolean;
    formatDetection: boolean;
    ui: boolean;
    analytics: boolean;
  };
}

export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: FeatureFlags;

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  isFeatureEnabled(feature: string): boolean {
    // Check VS Code settings first
    const config = vscode.workspace.getConfiguration('umlChatDesigner');
    const settingKey = `features.${feature}`;
    
    if (config.has(settingKey)) {
      return config.get(settingKey, false);
    }
    
    // Fallback to default flags
    return this.flags[feature as keyof FeatureFlags]?.enabled || false;
  }

  async enableFeature(feature: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('umlChatDesigner');
    await config.update(`features.${feature}`, true, vscode.ConfigurationTarget.Global);
    this.notifyFeatureChange(feature, true);
  }

  async disableFeature(feature: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('umlChatDesigner');
    await config.update(`features.${feature}`, false, vscode.ConfigurationTarget.Global);
    this.notifyFeatureChange(feature, false);
  }
}
```

**VS Code Settings**:
```json
{
  "umlChatDesigner.features.mermaid": false,
  "umlChatDesigner.features.mermaidEngine": false,
  "umlChatDesigner.features.mermaidFormatDetection": false,
  "umlChatDesigner.features.mermaidUI": false
}
```

#### **Step 1.2: Mermaid Engine Skeleton**
**File**: `src/tools/uml/engines/mermaidEngine.ts`

```typescript
export class MermaidEngine implements EngineStrategy {
  private featureFlags: FeatureFlagManager;
  private isInitialized: boolean = false;

  constructor() {
    this.featureFlags = FeatureFlagManager.getInstance();
  }

  get id(): string { return 'mermaid'; }
  get name(): string { return 'Mermaid'; }
  get description(): string { return 'Mermaid diagram rendering engine'; }

  async initialize(): Promise<void> {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      throw new Error('Mermaid engine is disabled');
    }

    try {
      // Basic initialization - will be enhanced in later phases
      this.isInitialized = true;
      console.log('Mermaid engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mermaid engine:', error);
      throw error;
    }
  }

  async render(diagramCode: string, options: RenderOptions): Promise<RenderResult> {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      return {
        success: false,
        error: 'Mermaid engine is disabled',
        fallback: this.getFallbackSvg()
      };
    }

    // Phase 1: Return placeholder with feature flag info
    return {
      success: true,
      output: this.getPlaceholderSvg(diagramCode),
      format: 'svg',
      metadata: { engine: 'mermaid', phase: 1 }
    };
  }

  canHandle(diagramType: string, requirements: any): boolean {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      return false;
    }

    // Phase 1: Basic format detection
    const mermaidFormats = ['flowchart', 'sequence', 'class', 'state', 'gantt', 'pie'];
    return mermaidFormats.includes(diagramType.toLowerCase());
  }

  private getPlaceholderSvg(code: string): string {
    return `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" fill="#666">
          Mermaid Engine (Phase 1)
        </text>
        <text x="50%" y="70%" text-anchor="middle" fill="#999" font-size="12">
          Feature enabled - Ready for implementation
        </text>
      </svg>
    `;
  }

  private getFallbackSvg(): string {
    return `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fff3cd"/>
        <text x="50%" y="50%" text-anchor="middle" fill="#856404">
          Mermaid Engine Disabled
        </text>
        <text x="50%" y="70%" text-anchor="middle" fill="#856404" font-size="12">
          Enable in settings to use Mermaid
        </text>
      </svg>
    `;
  }
}
```

#### **Step 1.3: Engine Registration with Safety**
**File**: `src/tools/uml/engineManager.ts`

```typescript
export class EngineManager {
  private engines: Map<string, EngineStrategy> = new Map();
  private featureFlags: FeatureFlagManager;

  constructor() {
    this.featureFlags = FeatureFlagManager.getInstance();
    this.registerDefaultEngines();
  }

  private registerDefaultEngines(): void {
    // Always register PlantUML engine
    this.registerEngine(new PlantUMLEngine());

    // Conditionally register Mermaid engine
    if (this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      try {
        const mermaidEngine = new MermaidEngine();
        this.registerEngine(mermaidEngine);
        console.log('Mermaid engine registered successfully');
      } catch (error) {
        console.warn('Failed to register Mermaid engine:', error);
        // Don't throw - PlantUML should still work
      }
    }
  }

  async selectEngine(requirements: EngineRequirements): Promise<EngineStrategy> {
    const availableEngines = Array.from(this.engines.values());
    
    // Phase 1: Simple selection logic
    for (const engine of availableEngines) {
      if (engine.canHandle(requirements.diagramType, requirements)) {
        return engine;
      }
    }

    // Fallback to PlantUML
    const plantUMLEngine = this.engines.get('plantuml');
    if (plantUMLEngine) {
      return plantUMLEngine;
    }

    throw new Error('No suitable engine found');
  }
}
```

#### **Step 1.4: User Feedback System**
**File**: `src/tools/feedback/featureFeedback.ts`

```typescript
export class FeatureFeedback {
  static async showFeatureEnabledNotification(feature: string): Promise<void> {
    const message = `Mermaid ${feature} feature has been enabled! You can now test this functionality.`;
    const action = await vscode.window.showInformationMessage(
      message,
      'Try It Now',
      'Learn More',
      'Disable'
    );

    switch (action) {
      case 'Try It Now':
        await this.showUsageExample(feature);
        break;
      case 'Learn More':
        await this.showDocumentation(feature);
        break;
      case 'Disable':
        await FeatureFlagManager.getInstance().disableFeature(`mermaid${feature}`);
        break;
    }
  }

  static async showUsageExample(feature: string): Promise<void> {
    const examples = {
      engine: 'Try generating a flowchart diagram',
      formatDetection: 'Try pasting Mermaid code in the chat',
      ui: 'Check the new Mermaid-specific UI elements'
    };

    const example = examples[feature as keyof typeof examples] || 'Try the new feature!';
    await vscode.window.showInformationMessage(example);
  }
}
```

### **Phase 2: Format Detection (Week 2)**

#### **Step 2.1: Mermaid Format Detector**
**File**: `src/tools/utils/mermaidFormatDetector.ts`

```typescript
export class MermaidFormatDetector {
  private static readonly MERMAID_PATTERNS = {
    flowchart: /^graph\s|^flowchart\s/i,
    sequence: /^sequenceDiagram/i,
    class: /^classDiagram/i,
    state: /^stateDiagram/i,
    gantt: /^gantt/i,
    pie: /^pie/i
  };

  static detectFormat(code: string): DiagramFormat {
    const featureFlags = FeatureFlagManager.getInstance();
    
    if (!featureFlags.isFeatureEnabled('mermaidFormatDetection')) {
      return { type: 'unknown', engine: 'plantuml' };
    }

    const trimmedCode = code.trim();
    
    for (const [format, pattern] of Object.entries(this.MERMAID_PATTERNS)) {
      if (pattern.test(trimmedCode)) {
        return { type: format, engine: 'mermaid' };
      }
    }

    // Fallback to PlantUML detection
    return this.detectPlantUMLFormat(trimmedCode);
  }

  private static detectPlantUMLFormat(code: string): DiagramFormat {
    const plantUMLPatterns = {
      activity: /@startuml.*activity/i,
      sequence: /@startuml.*sequence/i,
      class: /@startuml.*class/i,
      component: /@startuml.*component/i
    };

    for (const [format, pattern] of Object.entries(plantUMLPatterns)) {
      if (pattern.test(code)) {
        return { type: format, engine: 'plantuml' };
      }
    }

    return { type: 'unknown', engine: 'plantuml' };
  }
}
```

#### **Step 2.2: Enhanced Chat Integration**
**File**: `src/tools/umlChatPanelRefactored.ts`

```typescript
async function handleSendRequirement(
  message: any,
  generator: UMLGenerator,
  chatManager: ChatManager,
  updateChat: () => void,
  updatePreview: () => void
) {
  const { text, diagramType } = message;
  const featureFlags = FeatureFlagManager.getInstance();
  
  // Phase 2: Enhanced format detection
  let detectedFormat: DiagramFormat | null = null;
  
  if (featureFlags.isFeatureEnabled('mermaidFormatDetection')) {
    detectedFormat = MermaidFormatDetector.detectFormat(text);
    
    // Show format detection feedback
    if (detectedFormat.engine === 'mermaid') {
      await vscode.window.showInformationMessage(
        `Detected Mermaid ${detectedFormat.type} format!`,
        'Use Mermaid',
        'Use PlantUML'
      );
    }
  }

  // Continue with existing logic...
  const validation = InputValidator.validateRequirement(text);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Track usage with format detection
  trackUsage('uml.chatPanel', 'sendMessage', { 
    diagramType, 
    detectedFormat: detectedFormat?.type,
    engine: detectedFormat?.engine 
  });

  // Rest of existing logic...
}
```

### **Phase 3: UI Components (Week 3)**

#### **Step 3.1: Mermaid Preview Panel**
**File**: `src/tools/ui/components/mermaidPreviewPanel.ts`

```typescript
export class MermaidPreviewPanel {
  private webview: vscode.WebviewPanel;
  private featureFlags: FeatureFlagManager;

  constructor() {
    this.featureFlags = FeatureFlagManager.getInstance();
  }

  async createPreviewPanel(context: vscode.ExtensionContext): Promise<vscode.WebviewPanel> {
    const panel = vscode.window.createWebviewPanel(
      'mermaidPreview',
      'Mermaid Preview',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.webview = panel;
    await this.updatePreview('', 'default');
    return panel;
  }

  async updatePreview(code: string, theme: string = 'default'): Promise<void> {
    if (!this.featureFlags.isFeatureEnabled('mermaidUI')) {
      await this.showDisabledMessage();
      return;
    }

    const html = this.generatePreviewHtml(code, theme);
    this.webview.webview.html = html;
  }

  private generatePreviewHtml(code: string, theme: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
          <style>
            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
            .mermaid { text-align: center; }
            .mermaid-error { color: #dc3545; padding: 20px; background: #f8d7da; border-radius: 4px; }
            .feature-disabled { color: #856404; padding: 20px; background: #fff3cd; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div id="mermaid-container">
            <div class="mermaid" id="mermaid-diagram">
              ${code || 'graph TD\n    A[Start] --> B[End]'}
            </div>
          </div>
          <script>
            mermaid.initialize({ 
              theme: '${theme}',
              startOnLoad: true,
              securityLevel: 'loose'
            });
            
            // Error handling
            mermaid.render('mermaid-diagram', document.getElementById('mermaid-diagram').textContent)
              .then(({svg}) => {
                document.getElementById('mermaid-container').innerHTML = svg;
              })
              .catch(error => {
                document.getElementById('mermaid-container').innerHTML = 
                  '<div class="mermaid-error">Mermaid rendering error: ' + error.message + '</div>';
              });
          </script>
        </body>
      </html>
    `;
  }

  private async showDisabledMessage(): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
            .feature-disabled { color: #856404; padding: 20px; background: #fff3cd; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="feature-disabled">
            <h3>Mermaid UI Feature Disabled</h3>
            <p>Enable the Mermaid UI feature in settings to see the preview panel.</p>
          </div>
        </body>
      </html>
    `;
    this.webview.webview.html = html;
  }
}
```

### **Phase 4: Full Integration (Week 4)**

#### **Step 4.1: Complete Mermaid Engine**
**File**: `src/tools/uml/engines/mermaidEngine.ts` (Enhanced)

```typescript
export class MermaidEngine implements EngineStrategy {
  private mermaid: any;
  private isInitialized: boolean = false;
  private featureFlags: FeatureFlagManager;

  constructor() {
    this.featureFlags = FeatureFlagManager.getInstance();
  }

  async initialize(): Promise<void> {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      throw new Error('Mermaid engine is disabled');
    }

    try {
      // Load Mermaid.js dynamically
      this.mermaid = await this.loadMermaidJS();
      this.configureMermaid();
      this.isInitialized = true;
      console.log('Mermaid engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mermaid engine:', error);
      throw error;
    }
  }

  async render(diagramCode: string, options: RenderOptions): Promise<RenderResult> {
    if (!this.featureFlags.isFeatureEnabled('mermaidEngine')) {
      return {
        success: false,
        error: 'Mermaid engine is disabled',
        fallback: this.getFallbackSvg()
      };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { svg } = await this.mermaid.render('mermaid-diagram', diagramCode);
      return {
        success: true,
        output: svg,
        format: 'svg',
        metadata: this.extractMetadata(diagramCode)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackSvg()
      };
    }
  }

  private async loadMermaidJS(): Promise<any> {
    // Dynamic import of Mermaid.js
    const mermaid = await import('mermaid');
    return mermaid.default;
  }

  private configureMermaid(): void {
    this.mermaid.initialize({
      theme: 'default',
      startOnLoad: false,
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif'
    });
  }

  private extractMetadata(code: string): any {
    const format = MermaidFormatDetector.detectFormat(code);
    return {
      engine: 'mermaid',
      format: format.type,
      codeLength: code.length,
      hasTheme: code.includes('%%{init:')
    };
  }
}
```

## 🧪 **Testing Strategy**

### **Phase 1 Testing**
```bash
# Test feature flags
npm test -- --grep "Feature Flags"

# Test engine registration
npm test -- --grep "Mermaid Engine Registration"

# Test fallback behavior
npm test -- --grep "Engine Fallback"
```

### **Phase 2 Testing**
```bash
# Test format detection
npm test -- --grep "Format Detection"

# Test chat integration
npm test -- --grep "Chat Integration"
```

### **Phase 3 Testing**
```bash
# Test UI components
npm test -- --grep "Mermaid UI"

# Test preview panel
npm test -- --grep "Preview Panel"
```

## 📊 **User Feedback Collection**

### **Phase 1 Feedback**
- Feature flag visibility
- Engine registration success
- Fallback behavior acceptability

### **Phase 2 Feedback**
- Format detection accuracy
- User preference for engine selection
- Chat integration smoothness

### **Phase 3 Feedback**
- UI component usability
- Preview panel performance
- Theme support satisfaction

## 🚀 **Deployment Strategy**

### **Phase 1 Deployment**
1. Deploy feature flag system
2. Deploy Mermaid engine skeleton
3. Enable for internal testing
4. Collect feedback
5. Enable for beta users

### **Phase 2 Deployment**
1. Deploy format detection
2. Deploy enhanced chat integration
3. Enable for beta users
4. Monitor performance
5. Enable for all users

### **Phase 3 Deployment**
1. Deploy UI components
2. Deploy preview panel
3. Enable for beta users
4. Collect UI feedback
5. Enable for all users

## 🎯 **Success Metrics**

### **Phase 1 Metrics**
- [ ] Feature flags work correctly
- [ ] Engine registration doesn't break existing functionality
- [ ] Fallback behavior is seamless
- [ ] No performance degradation

### **Phase 2 Metrics**
- [ ] Format detection accuracy > 95%
- [ ] User satisfaction with engine selection
- [ ] Chat integration works smoothly
- [ ] No breaking changes to existing chat

### **Phase 3 Metrics**
- [ ] UI components load quickly
- [ ] Preview panel renders correctly
- [ ] Theme support works as expected
- [ ] User feedback is positive

This incremental approach ensures that each phase can be tested independently while maintaining backward compatibility and allowing users to provide feedback at each stage. 