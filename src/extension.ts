// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { openCopilotToolsSettingsWebview } from './tools/config/settingsWebview';
import { EmailRefineTool, TranslateTool, JiraRefineTool, PlantUMLPreviewTool } from './tools';
import { activateUMLChatPanel } from './tools/umlChatPanelRefactored';
import { localRender, activate as activatePreview } from './tools/preview';
import { UsageAnalytics, trackUsage } from './analytics';
import { AnalyticsDashboard } from './tools/analytics/analyticsDashboard';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

const PLANTUML_JAR_URL = 'https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar';
const JAR_FILENAME = 'plantuml.jar';
let plantumlJarPath: string | null = null;

export interface ICopilotTool {
  command: string;
  title: string;
  isEnabled(settings: vscode.WorkspaceConfiguration): boolean;
  handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration): Promise<void>;
  dispose?(): void;
  getSettingsSchema(): { [key: string]: any };
}

export class ToolManager {
  private tools: ICopilotTool[] = [];
  constructor(private context: vscode.ExtensionContext) {}
  registerTool(tool: ICopilotTool) {
    this.tools.push(tool);
    this.context.subscriptions.push(
      vscode.commands.registerCommand(tool.command, async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage('No active editor.');
          return;
        }
        const selection = editor.selection;
        const settings = vscode.workspace.getConfiguration('copilotTools');
        if (!tool.isEnabled(settings)) {
          vscode.window.showErrorMessage(`${tool.title} is disabled in settings.`);
          return;
        }
        await tool.handleInput(editor, selection, settings);
      })
    );
  }
  unregisterTool(command: string) {
    const toolIndex = this.tools.findIndex(t => t.command === command);
    if (toolIndex !== -1) {
      const tool = this.tools[toolIndex];
      if (tool.dispose) {
        tool.dispose();
      }
      this.tools.splice(toolIndex, 1);
    }
  }
  getTools() {
    return this.tools;
  }
  dispose() {
    this.tools.forEach(tool => {
      if (tool.dispose) {
        tool.dispose();
      }
    });
    this.tools = [];
  }
}

let toolManager: ToolManager;

export async function activate(context: vscode.ExtensionContext) {
  // Initialize usage analytics
  UsageAnalytics.initialize(context);
  trackUsage('extension', 'activate');

  toolManager = new ToolManager(context);
  const tools = [
    new EmailRefineTool(),
    new TranslateTool(),
    new JiraRefineTool(),
    new PlantUMLPreviewTool()
  ];

  tools.forEach(tool => toolManager.registerTool(tool));

  // Register settings webview command
  context.subscriptions.push(
    vscode.commands.registerCommand('copilotTools.openSettings', () => {
      openCopilotToolsSettingsWebview(context, tools);
    })
  );

  try {
    plantumlJarPath = await getPlantumlJar(context);
    if (plantumlJarPath) {
      activatePreview(context, plantumlJarPath); // Pass the JAR path to preview
    } else {
      vscode.window.showErrorMessage('Could not find or download PlantUML.jar. Please set the path in settings.');
      activatePreview(context, undefined); // Still activate preview, but with undefined path
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to activate PlantUML extension: ${error}`);
    activatePreview(context, undefined);
  }

  activateUMLChatPanel(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('copilotTools.configurePlantUML', () => configurePlantUML()),
    vscode.commands.registerCommand('copilotTools.showPlantUMLStatus', () => showPlantUMLStatus()),
    vscode.commands.registerCommand('copilotTools.runAutoDetection', () => runAutoDetection()),
    vscode.commands.registerCommand('copilotTools.showAnalytics', () => showAnalytics(context)),
    vscode.commands.registerCommand('copilotTools.resetOnboardingState', () => resetOnboardingState(context))
  );

  // Auto-configure PlantUML layout engine on first activation
  const autoConfigResult = await autoConfigurePlantUML();
  
  // Initialize PlantUML status bar manager
  plantUMLStatusBar = new PlantUMLStatusBarManager();
  plantUMLStatusBar.show();
  context.subscriptions.push(plantUMLStatusBar);

  // Show a welcome notification on first run or if auto-configuration occurred
  const config = vscode.workspace.getConfiguration('plantuml');
  const hasShownWelcome = context.globalState.get('plantuml.hasShownWelcome', false);
  const showStatusBar = config.get<boolean>('showStatusBar', true);
  
  if (!hasShownWelcome || autoConfigResult.wasConfigured) {
    const layoutEngine = autoConfigResult.engine;
    let message: string;
    
    if (autoConfigResult.wasConfigured) {
      if (layoutEngine === 'dot') {
        message = `PlantUML auto-configured with DOT (Graphviz) layout engine for high-quality diagrams.`;
      } else {
        message = `PlantUML auto-configured with Smetana (Pure Java) layout engine - works without external dependencies.`;
      }
    } else {
      message = `PlantUML is using ${layoutEngine === 'smetana' ? 'Smetana (Pure Java)' : 'DOT (Graphviz)'} layout engine.`;
    }
    
    const statusMessage = showStatusBar ? 'Status shown in bottom bar.' : 'Enable status bar in settings for quick access.';
    
    const buttons = autoConfigResult.wasConfigured && layoutEngine === 'smetana' 
      ? ['Test UML Chat', 'Try Manual Config', 'Got it']  // Different button text for Smetana fallback
      : ['Test UML Chat', 'Manual Config', 'Got it'];
    
    vscode.window.showInformationMessage(
      `${message} ${statusMessage}`,
      ...buttons
    ).then(selection => {
      if (selection === 'Test UML Chat') {
        vscode.commands.executeCommand('extension.umlChatPanel');
      } else if (selection === 'Manual Config' || selection === 'Try Manual Config') {
        vscode.commands.executeCommand('copilotTools.configurePlantUML');
      }
    });
    context.globalState.update('plantuml.hasShownWelcome', true);
  }

  // Listen for configuration changes to update status bar
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('plantuml.layoutEngine') || 
          e.affectsConfiguration('plantuml.dotPath') ||
          e.affectsConfiguration('plantuml.showStatusBar')) {
        // Don't show notification for automatic updates, only refresh UI
        plantUMLStatusBar?.refresh(false).catch(console.error);
      }
    })
  );

  registerLLMModelSelection(context);
  // Initialize LLM status bar after registration
  llmStatusBar = new LLMStatusBarManager();
  llmStatusBar.bind(context);
  context.subscriptions.push(llmStatusBar);
}

function registerLLMModelSelection(context: vscode.ExtensionContext) {
  // Removed command palette registration; switching handled via status bar
}

async function getPlantumlJar(context: vscode.ExtensionContext): Promise<string | null> {
  const config = vscode.workspace.getConfiguration('plantuml');
  const userDefinedPath = config.get<string>('jarPath');
  if (userDefinedPath) {
    if (fs.existsSync(userDefinedPath)) {
      return userDefinedPath;
    } else {
      vscode.window.showWarningMessage(`The path specified in 'plantuml.jarPath' does not exist: ${userDefinedPath}. Falling back to automatic download.`);
    }
  }
  const storagePath = context.globalStorageUri.fsPath;
  const cachedJarPath = path.join(storagePath, JAR_FILENAME);
  if (fs.existsSync(cachedJarPath)) {
    return cachedJarPath;
  }
  return await downloadPlantumlJar(storagePath);
}

async function downloadPlantumlJar(storagePath: string): Promise<string | null> {
  const jarDestinationPath = path.join(storagePath, JAR_FILENAME);
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  return vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Downloading PlantUML.jar",
    cancellable: false
  }, async (progress) => {
    try {
      progress.report({ message: "Connecting..." });
      const response = await axios({
        method: 'get',
        url: PLANTUML_JAR_URL,
        responseType: 'stream'
      });
      const totalLength = response.headers['content-length'];
      let downloadedLength = 0;
      const writer = fs.createWriteStream(jarDestinationPath);
      response.data.on('data', (chunk: Buffer) => {
        downloadedLength += chunk.length;
        if (totalLength) {
          const percent = Math.round((downloadedLength / totalLength) * 100);
          progress.report({ message: `${percent}% downloaded...` });
        }
      });
      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', () => {
          vscode.window.showInformationMessage('PlantUML.jar downloaded successfully.');
          resolve(jarDestinationPath);
        });
        writer.on('error', (err) => {
          if (fs.existsSync(jarDestinationPath)) {
            fs.unlinkSync(jarDestinationPath);
          }
          vscode.window.showErrorMessage(`Failed to save PlantUML.jar: ${err.message}`);
          reject(null);
        });
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to download PlantUML.jar. Please check your internet connection or set the path manually in settings. Error: ${error}`);
      return null;
    }
  });
}

export async function configurePlantUML() {
  trackUsage('plantuml', 'configure');
  
  const config = vscode.workspace.getConfiguration('plantuml');
  const currentLayoutEngine = config.get<string>('layoutEngine', 'dot');
  const currentDotPath = config.get<string>('dotPath') || '';

  // First, ask if user wants auto-detection or manual configuration
  const configChoice = await vscode.window.showQuickPick([
    {
      label: '🤖 Run Auto-Detection',
      description: 'Automatically detect and configure the best layout engine',
      detail: 'Recommended - detects DOT if available, falls back to Smetana',
      value: 'auto'
    },
    {
      label: '⚙️ Manual Configuration',
      description: 'Manually select layout engine and paths',
      detail: 'Override auto-detection with custom settings',
      value: 'manual'
    },
    {
      label: '🔄 Reset to Auto-Detection',
      description: 'Clear manual settings and re-run auto-detection',
      detail: 'Remove custom configuration and use auto-detected settings',
      value: 'reset'
    }
  ], {
    placeHolder: 'Choose configuration method',
    title: 'PlantUML Configuration'
  });

  if (!configChoice) {
    return; // User cancelled
  }

  if (configChoice.value === 'auto' || configChoice.value === 'reset') {
    // Clear any existing manual configuration and run auto-detection
    if (configChoice.value === 'reset') {
      await config.update('layoutEngine', undefined, vscode.ConfigurationTarget.Global);
      await config.update('dotPath', undefined, vscode.ConfigurationTarget.Global);
    }
    
    await runAutoDetection();
    return;
  }

  // Manual configuration - show layout engine selection
  const layoutEngineChoice = await vscode.window.showQuickPick([
    {
      label: 'DOT (Graphviz)',
      description: 'High-quality layouts, requires DOT executable',
      detail: currentLayoutEngine === 'dot' ? '✓ Currently selected' : 'Recommended for best quality',
      value: 'dot'
    },
    {
      label: 'Smetana',
      description: 'Pure Java implementation, no external dependencies',
      detail: currentLayoutEngine === 'smetana' ? '✓ Currently selected' : 'Use when DOT is not available',
      value: 'smetana'
    }
  ], {
    placeHolder: 'Select PlantUML layout engine',
    title: 'PlantUML Layout Engine Configuration'
  });

  if (!layoutEngineChoice) {
    return; // User cancelled
  }

  // Update layout engine setting
  await config.update('layoutEngine', layoutEngineChoice.value, vscode.ConfigurationTarget.Global);

  if (layoutEngineChoice.value === 'dot') {
    // Try auto-detection first
    vscode.window.showInformationMessage('🔍 Searching for DOT executable...', { modal: false });
    
    try {
      const { DotPathDetector } = await import('./tools/utils/dotPathDetector.js');
      const detection = await DotPathDetector.detectDotPath();
      
      if (detection.found && detection.path) {
        // Auto-detected DOT
        const useDetected = await vscode.window.showQuickPick([
          {
            label: '✅ Use auto-detected DOT',
            description: `Found at: ${detection.path}`,
            detail: `Version: ${detection.version || 'unknown'} | Method: ${detection.method}`,
            value: 'auto'
          },
          {
            label: '📁 Specify custom path',
            description: 'Manually specify DOT executable location',
            detail: 'Use if you prefer a different installation',
            value: 'custom'
          },
          {
            label: '🔄 Use system PATH',
            description: 'Let PlantUML find DOT automatically',
            detail: 'Clear any custom path setting',
            value: 'system'
          }
        ], {
          placeHolder: 'DOT executable found! How would you like to proceed?',
          title: 'DOT Executable Configuration'
        });

        if (useDetected?.value === 'auto') {
          await config.update('dotPath', detection.path, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(
            `✅ Auto-detected DOT configured: ${detection.path}`,
            'Test Now'
          ).then(selection => {
            if (selection === 'Test Now') {
              vscode.commands.executeCommand('extension.umlChatPanel');
            }
          });
        } else if (useDetected?.value === 'custom') {
          await promptForCustomDotPath(config, currentDotPath);
        } else if (useDetected?.value === 'system') {
          await config.update('dotPath', null, vscode.ConfigurationTarget.Global);
        }
      } else {
        // No DOT found, offer alternatives
        const noDetectionChoice = await vscode.window.showQuickPick([
          {
            label: '📁 Specify custom path',
            description: 'Manually specify DOT executable location',
            detail: 'If you know where DOT is installed',
            value: 'custom'
          },
          {
            label: '🔄 Use system PATH anyway',
            description: 'Let PlantUML try to find DOT',
            detail: 'May work if DOT is in PATH but not detected',
            value: 'system'
          },
          {
            label: '☕ Switch to Smetana instead',
            description: 'Use pure Java layout engine',
            detail: 'No external dependencies required',
            value: 'smetana'
          }
        ], {
          placeHolder: 'DOT executable not found. What would you like to do?',
          title: 'DOT Not Found'
        });

        if (noDetectionChoice?.value === 'custom') {
          await promptForCustomDotPath(config, currentDotPath);
        } else if (noDetectionChoice?.value === 'system') {
          await config.update('dotPath', null, vscode.ConfigurationTarget.Global);
        } else if (noDetectionChoice?.value === 'smetana') {
          await config.update('layoutEngine', 'smetana', vscode.ConfigurationTarget.Global);
          await config.update('dotPath', null, vscode.ConfigurationTarget.Global);
        }

        // Show search details if requested
        if (detection.searchedPaths && detection.searchedPaths.length > 0) {
          const showDetails = await vscode.window.showInformationMessage(
            `Searched ${detection.searchedPaths.length} common DOT installation locations.`,
            'Show Details'
          );
          if (showDetails === 'Show Details') {
            const details = detection.searchedPaths.slice(0, 10).join('\n') + 
                           (detection.searchedPaths.length > 10 ? '\n... and more' : '');
            vscode.window.showInformationMessage(details, { modal: true });
          }
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`DOT detection failed: ${error}`);
      await promptForCustomDotPath(config, currentDotPath);
    }
  }

  // Show confirmation message with the final configuration
  const finalEngine = config.get<string>('layoutEngine');
  const finalDotPath = config.get<string>('dotPath');
  
  let message = `PlantUML configured with ${finalEngine} layout engine`;
  if (finalEngine === 'dot' && finalDotPath) {
    message += ` using custom DOT: ${finalDotPath}`;
  } else if (finalEngine === 'smetana') {
    message += ' (no external dependencies required)';
  }

  // Refresh status bar to show new configuration immediately
  plantUMLStatusBar?.refresh();

  // Show success message with testing option
  const testConfig = await vscode.window.showInformationMessage(
    `✅ Configuration saved! PlantUML is now using ${finalEngine === 'smetana' ? 'Smetana (Pure Java)' : 'DOT (Graphviz)'} layout engine.\n\nWould you like to test it with the UML Chat Designer?`,
    { modal: false },
    'Test with UML Chat Designer',
    'Show Status',
    'Later'
  );

  if (testConfig === 'Test with UML Chat Designer') {
    vscode.commands.executeCommand('extension.umlChatPanel');
  } else if (testConfig === 'Show Status') {
    vscode.commands.executeCommand('copilotTools.showPlantUMLStatus');
  }
}

async function promptForCustomDotPath(config: vscode.WorkspaceConfiguration, currentDotPath: string) {
  const dotPathInput = await vscode.window.showInputBox({
    prompt: 'Enter the full path to DOT executable',
    placeHolder: process.platform === 'win32' 
      ? 'C:\\Program Files\\Graphviz\\bin\\dot.exe' 
      : '/usr/local/bin/dot',
    value: currentDotPath,
    title: 'DOT Executable Path'
  });

  if (dotPathInput !== undefined) {
    await config.update('dotPath', dotPathInput || null, vscode.ConfigurationTarget.Global);
    
    // Validate the custom path
    if (dotPathInput) {
      try {
        const { DotPathDetector } = await import('./tools/utils/dotPathDetector.js');
        const isValid = await DotPathDetector.validateDotExecutable(dotPathInput);
        if (!isValid) {
          vscode.window.showWarningMessage(
            `⚠️ Warning: Could not validate DOT executable at "${dotPathInput}". Please verify the path is correct.`,
            'Test Anyway',
            'Reconfigure'
          ).then(selection => {
            if (selection === 'Reconfigure') {
              configurePlantUML();
            }
          });
        } else {
          vscode.window.showInformationMessage(`✅ DOT path validated successfully: ${dotPathInput}`);
        }
      } catch (error) {
        vscode.window.showWarningMessage(`Could not validate DOT path: ${error}`);
      }
    }
  }
}

/**
 * Automatically detect and configure the best available layout engine
 * This function runs on extension activation to set up PlantUML without user intervention
 */
export async function autoConfigurePlantUML(): Promise<{ engine: string, dotPath?: string, wasConfigured: boolean }> {
  const config = vscode.workspace.getConfiguration('plantuml');
  
  // Check if user has already manually configured the layout engine
  const hasUserConfiguration = config.inspect('layoutEngine')?.globalValue !== undefined || 
                                config.inspect('dotPath')?.globalValue !== undefined;
  
  if (hasUserConfiguration) {
    // User has already configured, don't override their settings
    const currentEngine = config.get<string>('layoutEngine', 'dot');
    const currentDotPath = config.get<string>('dotPath');
    console.log(`PlantUML: Using existing user configuration - ${currentEngine}${currentDotPath ? ` at ${currentDotPath}` : ''}`);
    return { 
      engine: currentEngine, 
      dotPath: currentDotPath || undefined, 
      wasConfigured: false 
    };
  }

  console.log('PlantUML: No existing configuration found, running auto-detection...');

  try {
    // Try to detect DOT first (preferred for better quality)
    const { DotPathDetector } = await import('./tools/utils/dotPathDetector.js');
    const detection = await DotPathDetector.detectDotPath();
    
    if (detection.found && detection.path) {
      console.log(`PlantUML: DOT detected at ${detection.path}, validating execution capability...`);
      
      // Additional validation to ensure DOT is not only present but executable
      // This is crucial for enterprise environments with security restrictions
      const isExecutable = await DotPathDetector.validateDotExecutable(detection.path);
      
      if (isExecutable) {
        // DOT is available and executable, configure it as the layout engine
        await config.update('layoutEngine', 'dot', vscode.ConfigurationTarget.Global);
        await config.update('dotPath', detection.path, vscode.ConfigurationTarget.Global);
        
        console.log(`PlantUML auto-configured with DOT engine: ${detection.path} (version: ${detection.version || 'unknown'})`);
        
        return { 
          engine: 'dot', 
          dotPath: detection.path, 
          wasConfigured: true 
        };
      } else {
        console.warn(`PlantUML: DOT found at ${detection.path} but cannot be executed (possibly blocked by security policy)`);
        // Fall through to Smetana configuration
      }
    } else {
      console.log('PlantUML: DOT executable not found in common locations');
    }
    
    // DOT not found or not executable, fallback to Smetana
    await config.update('layoutEngine', 'smetana', vscode.ConfigurationTarget.Global);
    await config.update('dotPath', null, vscode.ConfigurationTarget.Global);
    
    const reason = detection.found ? 'DOT found but not executable (security restrictions?)' : 'DOT not available';
    console.log(`PlantUML auto-configured with Smetana engine (${reason})`);
    
    return { 
      engine: 'smetana', 
      wasConfigured: true 
    };
    
  } catch (error) {
    console.warn('PlantUML auto-configuration failed, falling back to Smetana:', error);
    
    // If detection fails, default to Smetana (safest option)
    await config.update('layoutEngine', 'smetana', vscode.ConfigurationTarget.Global);
    await config.update('dotPath', null, vscode.ConfigurationTarget.Global);
    
    return { 
      engine: 'smetana', 
      wasConfigured: true 
    };
  }
}

// Verify which layout engine PlantUML is actually using
export async function verifyActualLayoutEngine(): Promise<{ actualEngine: string, configuredEngine: string, isMatching: boolean }> {
  const config = vscode.workspace.getConfiguration('plantuml');
  const configuredEngine = config.get<string>('layoutEngine', 'dot');
  const dotPath = config.get<string>('dotPath');
  
  try {
    // Create a simple test diagram to check which engine is being used
    const testDiagram = `@startuml
!pragma layout ${configuredEngine}
class Test {
  +testMethod()
}
@enduml`;

    // Get the JAR path
    const jarPath = plantumlJarPath || config.get<string>('jarPath');
    if (!jarPath) {
      return { actualEngine: 'unknown', configuredEngine, isMatching: false };
    }

    // Build command arguments
    const args = ['-Djava.awt.headless=true', '-jar', jarPath];
    
    if (configuredEngine === 'smetana') {
      args.push('-Playout=smetana');
    } else if (configuredEngine === 'dot' && dotPath) {
      args.push(`-DGRAPHVIZ_DOT=${dotPath}`);
    }
    
    args.push('-tsvg', '-pipe');

    return new Promise((resolve) => {
      const process = require('child_process').spawn('java', args);
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      process.on('close', (code: number) => {
        let actualEngine = configuredEngine;
        let isMatching = true;
        
        // Analyze output to determine actual engine used
        if (stderr.includes('smetana') || stdout.includes('smetana')) {
          actualEngine = 'smetana';
        } else if (stderr.includes('dot') || stderr.includes('graphviz')) {
          actualEngine = 'dot';
        } else if (stderr.includes('Cannot find Graphviz') || stderr.includes('dot command not found')) {
          // DOT was configured but not available, PlantUML likely fell back
          actualEngine = 'smetana';
          isMatching = false;
        }
        
        isMatching = actualEngine === configuredEngine;
        resolve({ actualEngine, configuredEngine, isMatching });
      });
      
      process.on('error', () => {
        resolve({ actualEngine: 'unknown', configuredEngine, isMatching: false });
      });
      
      // Send test diagram
      process.stdin.write(testDiagram);
      process.stdin.end();
    });
    
  } catch (error) {
    return { actualEngine: 'unknown', configuredEngine, isMatching: false };
  }
}

// PlantUML Status Bar Manager
class PlantUMLStatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private isVisible: boolean = false;

  constructor() {
    // Move to left side with high priority for better visibility
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
    this.statusBarItem.command = 'copilotTools.configurePlantUML';
    this.statusBarItem.tooltip = 'Click to configure PlantUML layout engine';
    this.updateStatusBar();
  }

  private async updateStatusBar() {
    const config = vscode.workspace.getConfiguration('plantuml');
    const configuredEngine = config.get<string>('layoutEngine', 'dot');
    const dotPath = config.get<string>('dotPath');

    // Check for real-time verification data from recent diagram renders
    const lastVerification = (global as any).plantUMLLastVerification;
    let actualEngine = configuredEngine;
    let isMatching = true;
    
    // Use verification data if it's recent (within last 5 minutes)
    if (lastVerification && (Date.now() - lastVerification.timestamp) < 300000) {
      actualEngine = lastVerification.actualEngine !== 'unknown' ? lastVerification.actualEngine : configuredEngine;
      isMatching = lastVerification.isMatching;
    } else {
      // Fall back to simple verification for initial display
      try {
        const verification = await verifyActualLayoutEngine();
        actualEngine = verification.actualEngine !== 'unknown' ? verification.actualEngine : configuredEngine;
        isMatching = verification.isMatching;
      } catch (error) {
        console.warn('Could not verify PlantUML engine, showing configured engine');
      }
    }

    if (actualEngine === 'smetana') {
      this.statusBarItem.text = isMatching ? '$(vm) PlantUML: Smetana' : '$(warning) PlantUML: Smetana (Auto-fallback)';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
      this.statusBarItem.tooltip = isMatching 
        ? 'PlantUML: Smetana layout engine (Pure Java, no dependencies required) - Click to configure'
        : 'PlantUML: Using Smetana (DOT configured but not available) - Click to configure';
    } else {
      this.statusBarItem.text = dotPath ? '$(tools) PlantUML: DOT (Custom)' : '$(tools) PlantUML: DOT';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
      this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
      this.statusBarItem.tooltip = `PlantUML: DOT layout engine ${dotPath ? '(Custom path: ' + dotPath + ')' : '(System PATH)'} - Click to configure`;
    }

    // Show warning if configuration doesn't match reality
    if (!isMatching && lastVerification) {
      console.warn(`PlantUML configuration mismatch: configured=${configuredEngine}, actual=${actualEngine}`);
    }
  }

  public show() {
    const config = vscode.workspace.getConfiguration('plantuml');
    const showStatusBar = config.get<boolean>('showStatusBar', true);
    
    if (showStatusBar && !this.isVisible) {
      this.statusBarItem.show();
      this.isVisible = true;
    } else if (!showStatusBar && this.isVisible) {
      this.statusBarItem.hide();
      this.isVisible = false;
    }
  }

  public hide() {
    if (this.isVisible) {
      this.statusBarItem.hide();
      this.isVisible = false;
    }
  }

  public async refresh(showNotification: boolean = false) {
    await this.updateStatusBar();
    this.show(); // Respect the showStatusBar setting
    
    // Only show notification if explicitly requested (not from configuration changes)
    if (showNotification) {
      const verification = await verifyActualLayoutEngine();
      const actualEngine = verification.actualEngine;
      const isMatching = verification.isMatching;
      
      let message = `PlantUML layout engine: ${actualEngine === 'smetana' ? 'Smetana (Pure Java)' : 'DOT (Graphviz)'}`;
      if (!isMatching && verification.actualEngine !== 'unknown') {
        message += ` (Auto-fallback from ${verification.configuredEngine})`;
      }
      
      vscode.window.showInformationMessage(message, 'Configure').then(selection => {
        if (selection === 'Configure') {
          vscode.commands.executeCommand('copilotTools.configurePlantUML');
        }
      });
    }
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}

let plantUMLStatusBar: PlantUMLStatusBarManager | undefined;

class LLMStatusBarManager {
  private item: vscode.StatusBarItem;
  private disposed = false;
  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 995);
    this.item.tooltip = 'Click to switch preferred LLM model';
    this.item.command = undefined; // we'll handle click via command we register internally
    this.registerClickHandler();
    this.refresh();
  }
  private registerClickHandler() {
    // Create an internal command id (not contributed) so StatusBarItem can invoke it
    const commandId = 'copilotTools.internal.switchLLMModel';
    this.item.command = commandId;
    const disposable = vscode.commands.registerCommand(commandId, async () => {
      await this.showSwitcher();
    });
    // store disposable
    (this as any)._disposable = disposable;
  }
  private async showSwitcher() {
    const cfg = vscode.workspace.getConfiguration('copilotTools.llm');
    const preferred = cfg.get<string[]>('preferredModels', ['copilot']);
    let allModels: vscode.LanguageModelChat[] = [];
    try { allModels = await vscode.lm.selectChatModels(); } catch { /* ignore */ }
    if (!allModels.length) {
      vscode.window.showWarningMessage('No chat models available.');
      return;
    }
    const items = allModels.map(m => ({
      label: m.id,
      description: `${m.vendor}${m.family ? ' · ' + m.family : ''}${m.version ? ' · v' + m.version : ''}`,
      picked: preferred[0] === m.id || (preferred[0] === 'copilot' && m.vendor === 'copilot')
    }));

    const selection = await vscode.window.showQuickPick(items, { placeHolder: 'Select primary model (others kept as fallback)', canPickMany: false });
    if (!selection) { return; }

    // Rebuild preference list: chosen first, then keep any existing order minus new first, then add remaining unseen models
    const newPrimary = selection.label;
    const existing = preferred.filter(p => p !== newPrimary);
    const remaining = allModels.map(m => m.id).filter(id => id !== newPrimary && !existing.includes(id));
    const updated = [newPrimary, ...existing, ...remaining];
    await cfg.update('preferredModels', updated, vscode.ConfigurationTarget.Global);
    await this.refresh();
    vscode.window.showInformationMessage(`Active LLM model switched to: ${newPrimary}`);
  }
  public async refresh() {
    if (this.disposed) { return; }
    const info = await this.resolveActiveModel();
    this.item.text = info.available ? `$(symbol-keyword) LLM: ${info.label}` : `$(warning) LLM: ${info.label}`;
    this.item.tooltip = (info.available ? 'Active model: ' : 'Unavailable preferred model: ') + info.label + '\n' + info.details + '\nClick to change.';
    this.item.show();
  }
  private async resolveActiveModel(): Promise<{ label: string; available: boolean; details: string }> {
    const cfg = vscode.workspace.getConfiguration('copilotTools.llm');
    const preferred = cfg.get<string[]>('preferredModels', ['copilot']);
    let allModels: vscode.LanguageModelChat[] = [];
    try { allModels = await vscode.lm.selectChatModels(); } catch { /* ignore */ }
    const availableIds = new Set(allModels.map(m => m.id));
    for (const name of preferred) {
      if (name === 'copilot') {
        // Treat vendor aggregate: show first copilot model id if present
        const copilotModels = allModels.filter(m => m.vendor === 'copilot');
        if (copilotModels.length) {
          return { label: copilotModels[0].id, available: true, details: `Preferred order: ${preferred.join(' > ')}` };
        }
        // fall through to mark unavailable but still first preference
        return { label: 'copilot', available: false, details: `Preferred order: ${preferred.join(' > ')}` };
      }
      if (availableIds.has(name)) {
        return { label: name, available: true, details: `Preferred order: ${preferred.join(' > ')}` };
      }
    }
    // None available – show first preferred
    return { label: preferred[0] || 'N/A', available: false, details: `Preferred order: ${preferred.join(' > ')}` };
  }
  public bind(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('copilotTools.llm.preferredModels')) {
          this.refresh();
        }
      }),
      vscode.lm.onDidChangeChatModels(() => this.refresh())
    );
  }
  public dispose() {
    this.disposed = true; this.item.dispose();
    const d = (this as any)._disposable; if (d) { try { d.dispose(); } catch { /* ignore */ } }
  }
}
let llmStatusBar: LLMStatusBarManager | undefined;

export function deactivate() {
  // Flush any pending analytics data before deactivation
  try {
    const analytics = UsageAnalytics.getInstance();
    analytics.forceSyncPending().catch(error => {
      console.warn('Failed to flush pending analytics on deactivation:', error);
    });
  } catch (error) {
    // Analytics might not be initialized, ignore
  }

  if (toolManager) {
    toolManager.dispose();
  }
  if (plantUMLStatusBar) {
    plantUMLStatusBar.dispose();
  }
  if (llmStatusBar) { llmStatusBar.dispose(); }
}

export async function showPlantUMLStatus() {
  trackUsage('plantuml', 'showStatus');
  
  const config = vscode.workspace.getConfiguration('plantuml');
  const configuredEngine = config.get<string>('layoutEngine', 'dot');
  const dotPath = config.get<string>('dotPath');
  const jarPath = config.get<string>('jarPath');

  // Verify actual engine in use
  const verification = await verifyActualLayoutEngine();
  
  let statusMessage = `**PlantUML Configuration:**\n\n`;
  statusMessage += `• **Configured Engine:** ${configuredEngine === 'smetana' ? 'Smetana (Pure Java)' : 'DOT (Graphviz)'}\n`;
  
  if (verification.actualEngine !== 'unknown') {
    statusMessage += `• **Actual Engine:** ${verification.actualEngine === 'smetana' ? 'Smetana (Pure Java)' : 'DOT (Graphviz)'}`;
    if (!verification.isMatching) {
      statusMessage += ` ⚠️ *Auto-fallback*`;
    } else {
      statusMessage += ` ✅`;
    }
    statusMessage += `\n`;
  }
  
  if (configuredEngine === 'dot') {
    statusMessage += `• **DOT Path:** ${dotPath || 'System PATH'}\n`;
  }
  
  statusMessage += `• **JAR Path:** ${jarPath || 'Auto-download from GitHub'}\n`;
  
  if (!verification.isMatching && verification.actualEngine !== 'unknown') {
    statusMessage += `\n⚠️ **Note:** PlantUML fell back to ${verification.actualEngine} because ${verification.configuredEngine} is not available.`;
  }
  
  statusMessage += `\n*Click "Configure" to change settings*`;

  const choice = await vscode.window.showInformationMessage(
    statusMessage,
    { modal: true },
    'Configure',
    'Refresh Status',
    'Close'
  );

  if (choice === 'Configure') {
    await configurePlantUML();
  } else if (choice === 'Refresh Status') {
    // Refresh status bar to re-verify
    await plantUMLStatusBar?.refresh(false);
    await showPlantUMLStatus(); // Show updated status
  }
}

export async function testDotDetection() {
  trackUsage('plantuml', 'testDotDetection');
  
  try {
    vscode.window.showInformationMessage('🔍 Testing DOT auto-detection...', { modal: false });
    
    const { DotPathDetector } = await import('./tools/utils/dotPathDetector.js');
    const detection = await DotPathDetector.detectDotPath();
    
    let message = '**DOT Detection Results:**\n\n';
    
    if (detection.found && detection.path) {
      message += `✅ **Found:** ${detection.path}\n`;
      message += `📋 **Version:** ${detection.version || 'unknown'}\n`;
      message += `🔍 **Method:** ${detection.method}\n`;
      
      // Test actual execution capability
      vscode.window.showInformationMessage('🔬 Testing DOT execution with complex diagram...', { modal: false });
      const isExecutable = await DotPathDetector.validateDotExecutable(detection.path);
      
      if (isExecutable) {
        message += `✅ **Execution Test:** Passed - Can process complex diagrams with DOT-specific features\n`;
        message += `🎯 **Enterprise Ready:** DOT is fully functional and not blocked by security policies\n`;
      } else {
        message += `❌ **Execution Test:** Failed - Found but cannot execute complex diagrams\n`;
        message += `⚠️ **Possible Cause:** Security policy blocking DOT execution or missing dependencies\n`;
        message += `💡 **Note:** Will fall back to Smetana (Pure Java) layout engine\n`;
      }
    } else {
      message += `❌ **Not Found**\n`;
      message += `🔍 **Method:** ${detection.method}\n`;
    }
    
    if (detection.searchedPaths && detection.searchedPaths.length > 0) {
      message += `\n📂 **Searched ${detection.searchedPaths.length} locations:**\n`;
      message += detection.searchedPaths.slice(0, 5).map(p => `• ${p}`).join('\n');
      if (detection.searchedPaths.length > 5) {
        message += `\n• ... and ${detection.searchedPaths.length - 5} more`;
      }
    }
    
    message += '\n\n*Note: Auto-detection now includes execution validation for security-restricted environments.*';
    
    const choice = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      'Run Auto-Config',
      'Manual Config',
      'Show All Paths',
      'Close'
    );
    
    if (choice === 'Run Auto-Config') {
      await runAutoDetection();
    } else if (choice === 'Manual Config') {
      await configurePlantUML();
    } else if (choice === 'Show All Paths' && detection.searchedPaths) {
      const allPaths = detection.searchedPaths.join('\n');
      vscode.window.showInformationMessage(
        `**All ${detection.searchedPaths.length} searched paths:**\n\n${allPaths}`,
        { modal: true }
      );
    }
    
  } catch (error) {
    vscode.window.showErrorMessage(`DOT detection test failed: ${error}`);
  }
}

/**
 * Show analytics dashboard
 */
async function showAnalytics(context: vscode.ExtensionContext): Promise<void> {
  trackUsage('analytics.dashboard.show');
  try {
    const dashboard = AnalyticsDashboard.getInstance(context);
    await dashboard.show();
  } catch (error) {
    console.error('Error showing analytics dashboard:', error);
    vscode.window.showErrorMessage('Failed to open analytics dashboard');
  }
}

/**
 * Reset onboarding state for debugging
 */
async function resetOnboardingState(context: vscode.ExtensionContext): Promise<void> {
  try {
    await context.globalState.update('umlChatOnboardingState', undefined);
    vscode.window.showInformationMessage('Onboarding state has been reset. The tutorial will show again when you open UML Chat Designer.');
    console.log('Onboarding state reset successfully');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to reset onboarding state: ${error}`);
    console.error('Failed to reset onboarding state:', error);
  }
}

/**
 * Export analytics data
 */
async function exportAnalytics(): Promise<void> {
  trackUsage('analytics.export');
  try {
    const analytics = UsageAnalytics.getInstance();
    const data = analytics.exportUsageData();
    
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`analytics-export-${new Date().toISOString().split('T')[0]}.json`),
      filters: {
        'JSON Files': ['json']
      }
    });
    
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(data, 'utf8'));
      vscode.window.showInformationMessage(`Analytics data exported to ${uri.fsPath}`);
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    vscode.window.showErrorMessage('Failed to export analytics data');
  }
}

/**
 * Sync analytics with server
 */
async function syncAnalytics(): Promise<void> {
  trackUsage('analytics.sync.manual');
  try {
    const analytics = UsageAnalytics.getInstance();
    const result = await analytics.syncWithServer();
    
    if (result.success) {
      vscode.window.showInformationMessage(`Analytics sync successful: ${result.message}`);
    } else {
      vscode.window.showWarningMessage(`Analytics sync failed: ${result.message}`);
    }
  } catch (error) {
    console.error('Error syncing analytics:', error);
    vscode.window.showErrorMessage('Failed to sync analytics data');
  }
}

/**
 * Test and run auto-detection manually (for troubleshooting or re-detection)
 * Includes comprehensive DOT detection testing
 */
export async function runAutoDetection() {
  trackUsage('plantuml', 'runAutoDetection');
  
  try {
    // First, show detailed DOT detection results for troubleshooting
    vscode.window.showInformationMessage('🔍 Running comprehensive auto-detection...', { modal: false });
    
    const { DotPathDetector } = await import('./tools/utils/dotPathDetector.js');
    const detection = await DotPathDetector.detectDotPath();
    
    let detectionMessage = '**DOT Detection Results:**\n\n';
    
    if (detection.found && detection.path) {
      detectionMessage += `✅ **Found:** ${detection.path}\n`;
      detectionMessage += `📋 **Version:** ${detection.version || 'unknown'}\n`;
      detectionMessage += `🔍 **Method:** ${detection.method}\n`;
      
      // Test actual execution capability
      const isExecutable = await DotPathDetector.validateDotExecutable(detection.path);
      
      if (isExecutable) {
        detectionMessage += `✅ **Execution Test:** Passed - Can process complex diagrams with DOT-specific features\n`;
        detectionMessage += `🎯 **Enterprise Ready:** DOT is fully functional and not blocked by security policies\n`;
      } else {
        detectionMessage += `❌ **Execution Test:** Failed - Found but cannot execute complex diagrams\n`;
        detectionMessage += `⚠️ **Possible Cause:** Security policy blocking DOT execution or missing dependencies\n`;
        detectionMessage += `💡 **Fallback:** Extension will use Smetana (Pure Java) layout engine instead\n`;
      }
    } else {
      detectionMessage += `❌ **Not Found**\n`;
      detectionMessage += `🔍 **Method:** ${detection.method}\n`;
    }
    
    // Show detection results first
    const viewResults = await vscode.window.showInformationMessage(
      detectionMessage,
      { modal: false },
      'Continue with Auto-Config',
      'Show Search Paths',
      'Cancel'
    );
    
    if (viewResults === 'Show Search Paths' && detection.searchedPaths) {
      const allPaths = detection.searchedPaths.slice(0, 10).join('\n') + 
                     (detection.searchedPaths.length > 10 ? '\n... and more' : '');
      vscode.window.showInformationMessage(
        `**Searched ${detection.searchedPaths.length} locations:**\n\n${allPaths}`,
        { modal: true }
      );
      return;
    } else if (viewResults !== 'Continue with Auto-Config') {
      return;
    }
    
    // Now run the actual auto-configuration
    const result = await autoConfigurePlantUML();
    
    if (result.wasConfigured) {
      let message: string;
      
      if (result.engine === 'dot') {
        message = `✅ Auto-detection complete! Configured with DOT (Graphviz) layout engine at: ${result.dotPath}. This provides the highest quality diagrams.`;
      } else {
        message = `✅ Auto-detection complete! Configured with Smetana (Pure Java) layout engine. This works reliably without external dependencies.`;
        
        // Check if DOT was found but not executable
        if (detection.found) {
          message += `\n\n💡 Note: DOT was found at ${detection.path} but cannot be executed (likely due to security restrictions).`;
        }
      }
      
      const choice = await vscode.window.showInformationMessage(
        message,
        'Test UML Chat',
        'Show Status',
        'OK'
      );
      
      if (choice === 'Test UML Chat') {
        vscode.commands.executeCommand('extension.umlChatPanel');
      } else if (choice === 'Show Status') {
        vscode.commands.executeCommand('copilotTools.showPlantUMLStatus');
      }
    } else {
      vscode.window.showInformationMessage(
        `ℹ️ Using existing configuration: ${result.engine === 'smetana' ? 'Smetana (Pure Java)' : 'DOT (Graphviz)'} layout engine. Use manual configuration to override.`,
        'Manual Config'
      ).then(selection => {
        if (selection === 'Manual Config') {
          vscode.commands.executeCommand('copilotTools.configurePlantUML');
        }
      });
    }

    // Refresh status bar
    plantUMLStatusBar?.refresh();

  } catch (error) {
    vscode.window.showErrorMessage(`Auto-detection failed: ${error}`);
  }
}
