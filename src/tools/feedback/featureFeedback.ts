import * as vscode from 'vscode';
import { FeatureFlagManager, FeatureChangeEvent } from '../config/featureFlags';

export class FeatureFeedback {
  private static instance: FeatureFeedback;
  private featureFlags: FeatureFlagManager;

  private constructor() {
    this.featureFlags = FeatureFlagManager.getInstance();
    this.setupEventListeners();
  }

  static getInstance(): FeatureFeedback {
    if (!FeatureFeedback.instance) {
      FeatureFeedback.instance = new FeatureFeedback();
    }
    return FeatureFeedback.instance;
  }

  /**
   * Setup event listeners for feature changes
   */
  private setupEventListeners(): void {
    this.featureFlags.addListener((event: FeatureChangeEvent) => {
      this.handleFeatureChange(event);
    });
  }

  /**
   * Handle feature change events
   */
  private async handleFeatureChange(event: FeatureChangeEvent): Promise<void> {
    if (event.enabled) {
      await FeatureFeedback.showFeatureEnabledNotification(event.feature);
    } else {
      await FeatureFeedback.showFeatureDisabledNotification(event.feature);
    }
  }

  /**
   * Show notification when a feature is enabled
   */
  static async showFeatureEnabledNotification(feature: string): Promise<void> {
    const featureName = this.getFeatureDisplayName(feature);
    const message = `🎉 ${featureName} feature has been enabled! You can now test this functionality.`;
    
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
        await FeatureFlagManager.getInstance().disableFeature(feature);
        break;
    }
  }

  /**
   * Show notification when a feature is disabled
   */
  static async showFeatureDisabledNotification(feature: string): Promise<void> {
    const featureName = this.getFeatureDisplayName(feature);
    const message = `🔒 ${featureName} feature has been disabled.`;
    
    await vscode.window.showInformationMessage(message);
  }

  /**
   * Show usage example for enabled feature
   */
  static async showUsageExample(feature: string): Promise<void> {
    const examples = {
      mermaidEngine: 'Try generating a flowchart diagram in the UML Chat Designer',
      mermaidFormatDetection: 'Try pasting Mermaid code in the chat (e.g., "graph TD\nA-->B")',
      mermaidUI: 'Check the new Mermaid-specific UI elements in the preview panel',
      mermaidAnalytics: 'Mermaid usage analytics are now being tracked'
    };

    const example = examples[feature as keyof typeof examples] || 'Try the new feature!';
    
    const action = await vscode.window.showInformationMessage(
      example,
      'Open UML Chat Designer',
      'Show Example Code',
      'Close'
    );

    switch (action) {
      case 'Open UML Chat Designer':
        await vscode.commands.executeCommand('umlChatDesigner.openChatPanel');
        break;
      case 'Show Example Code':
        await this.showExampleCode(feature);
        break;
    }
  }

  /**
   * Show documentation for the feature
   */
  static async showDocumentation(feature: string): Promise<void> {
    const docs = {
      mermaidEngine: 'https://mermaid.js.org/intro/',
      mermaidFormatDetection: 'https://mermaid.js.org/syntax/flowchart.html',
      mermaidUI: 'https://mermaid.js.org/config/theming.html',
      mermaidAnalytics: 'Analytics help improve the extension'
    };

    const docUrl = docs[feature as keyof typeof docs];
    
    if (docUrl && docUrl.startsWith('http')) {
      await vscode.env.openExternal(vscode.Uri.parse(docUrl));
    } else {
      await vscode.window.showInformationMessage(docUrl || 'Documentation not available');
    }
  }

  /**
   * Show example code for the feature
   */
  static async showExampleCode(feature: string): Promise<void> {
    const examples = {
      mermaidEngine: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
      mermaidFormatDetection: `sequenceDiagram
    participant User
    participant System
    User->>System: Request
    System->>User: Response`,
      mermaidUI: `classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    class System {
        +authenticate()
        +authorize()
    }
    User --> System`,
      mermaidAnalytics: 'Analytics are automatically collected when you use Mermaid features'
    };

    const example = examples[feature as keyof typeof examples] || 'Example not available';
    
    // Create a new document with the example
    const document = await vscode.workspace.openTextDocument({
      content: example,
      language: 'mermaid'
    });
    
    await vscode.window.showTextDocument(document);
  }

  /**
   * Get display name for feature
   */
  private static getFeatureDisplayName(feature: string): string {
    const names = {
      mermaidEngine: 'Mermaid Engine',
      mermaidFormatDetection: 'Mermaid Format Detection',
      mermaidUI: 'Mermaid UI',
      mermaidAnalytics: 'Mermaid Analytics'
    };

    return names[feature as keyof typeof names] || feature;
  }

  /**
   * Show feature status overview
   */
  static async showFeatureStatus(): Promise<void> {
    const featureFlags = FeatureFlagManager.getInstance();
    const status = featureFlags.getFeatureStatus();
    
    const statusText = Object.entries(status)
      .map(([feature, enabled]) => `${enabled ? '✅' : '❌'} ${feature}`)
      .join('\n');

    const message = `**Mermaid Feature Status:**\n\n${statusText}`;
    
    await vscode.window.showInformationMessage(message, 'Enable All', 'Disable All', 'Close');
  }

  /**
   * Show welcome message for new users
   */
  static async showWelcomeMessage(): Promise<void> {
    const message = `🎉 Welcome to UML Chat Designer with Mermaid support!
    
You can now:
• Generate PlantUML diagrams
• Use Mermaid diagrams (when enabled)
• Switch between engines seamlessly

Try opening the UML Chat Designer to get started!`;

    const action = await vscode.window.showInformationMessage(
      message,
      'Open UML Chat Designer',
      'Enable Mermaid Features',
      'Learn More',
      'Close'
    );

    switch (action) {
      case 'Open UML Chat Designer':
        await vscode.commands.executeCommand('umlChatDesigner.openChatPanel');
        break;
      case 'Enable Mermaid Features':
        await this.enableAllMermaidFeatures();
        break;
      case 'Learn More':
        await vscode.env.openExternal(vscode.Uri.parse('https://mermaid.js.org/'));
        break;
    }
  }

  /**
   * Enable all Mermaid features
   */
  static async enableAllMermaidFeatures(): Promise<void> {
    const featureFlags = FeatureFlagManager.getInstance();
    const mermaidFeatures = ['mermaidEngine', 'mermaidFormatDetection', 'mermaidUI', 'mermaidAnalytics'];
    
    try {
      for (const feature of mermaidFeatures) {
        await featureFlags.enableFeature(feature);
      }
      
      await vscode.window.showInformationMessage(
        'All Mermaid features have been enabled! You can now use Mermaid diagrams.',
        'Try It Now',
        'Close'
      );
    } catch (error) {
      await vscode.window.showErrorMessage(
        `Failed to enable Mermaid features: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Show help for troubleshooting
   */
  static async showTroubleshootingHelp(): Promise<void> {
    const helpText = `**Mermaid Troubleshooting:**

1. **Feature not working?**
   - Check if the feature is enabled in settings
   - Restart VS Code after enabling features

2. **Engine not found?**
   - Ensure PlantUML engine is working
   - Check console for error messages

3. **Rendering issues?**
   - Try different diagram syntax
   - Check Mermaid documentation

4. **Performance problems?**
   - Disable unused features
   - Restart the extension`;

    await vscode.window.showInformationMessage(helpText, 'Open Settings', 'Restart Extension', 'Close');
  }
} 