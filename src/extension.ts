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
    vscode.commands.registerCommand('copilotTools.clearPlantumlJarCache', () => clearPlantumlJarCache(context)),
    vscode.commands.registerCommand('copilotTools.configurePlantUML', () => configurePlantUML()),
    vscode.commands.registerCommand('copilotTools.showPlantUMLStatus', () => showPlantUMLStatus()),
    vscode.commands.registerCommand('copilotTools.testDotDetection', () => testDotDetection()),
    vscode.commands.registerCommand('copilotTools.showAnalytics', () => showAnalytics(context)),
    vscode.commands.registerCommand('copilotTools.exportAnalytics', () => exportAnalytics()),
    vscode.commands.registerCommand('copilotTools.resetAnalytics', () => resetAnalytics()),
    vscode.commands.registerCommand('copilotTools.syncAnalytics', () => syncAnalytics())
  );

  // Debug command to show raw analytics data
  context.subscriptions.push(
    vscode.commands.registerCommand('copilotTools.debugAnalytics', () => {
      debugAnalytics(context);
    })
  );

  // Initialize PlantUML status bar manager
  plantUMLStatusBar = new PlantUMLStatusBarManager();
  plantUMLStatusBar.show();
  context.subscriptions.push(plantUMLStatusBar);

  // Show a welcome notification on first run (or if status bar is hidden)
  const config = vscode.workspace.getConfiguration('plantuml');
  const hasShownWelcome = context.globalState.get('plantuml.hasShownWelcome', false);
  const showStatusBar = config.get<boolean>('showStatusBar', true);
  
  if (!hasShownWelcome || !showStatusBar) {
    const layoutEngine = config.get<string>('layoutEngine', 'dot');
    vscode.window.showInformationMessage(
      `PlantUML is using ${layoutEngine === 'smetana' ? 'Smetana (Pure Java)' : 'DOT (Graphviz)'} layout engine. ${showStatusBar ? 'Status shown in bottom bar.' : 'Enable status bar in settings for quick access.'}`,
      'Configure',
      'Show Status',
      'Got it'
    ).then(selection => {
      if (selection === 'Configure') {
        vscode.commands.executeCommand('copilotTools.configurePlantUML');
      } else if (selection === 'Show Status') {
        vscode.commands.executeCommand('copilotTools.showPlantUMLStatus');
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

export async function clearPlantumlJarCache(context: vscode.ExtensionContext) {
  const storagePath = context.globalStorageUri.fsPath;
  const jarPath = path.join(storagePath, JAR_FILENAME);
  if (fs.existsSync(jarPath)) {
    try {
      fs.unlinkSync(jarPath);
      vscode.window.showInformationMessage('PlantUML JAR cache cleared.');
    } catch (err) {
      vscode.window.showErrorMessage('Failed to clear PlantUML JAR cache: ' + err);
    }
  } else {
    vscode.window.showInformationMessage('No cached PlantUML JAR found.');
  }
}

export async function configurePlantUML() {
  trackUsage('plantuml', 'configure');
  
  const config = vscode.workspace.getConfiguration('plantuml');
  const currentLayoutEngine = config.get<string>('layoutEngine', 'dot');
  const currentDotPath = config.get<string>('dotPath') || '';

  // Show layout engine selection
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

export function deactivate() {
  if (toolManager) {
    toolManager.dispose();
  }
  if (plantUMLStatusBar) {
    plantUMLStatusBar.dispose();
  }
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
    
    message += '\n\n*This helps verify auto-detection accuracy*';
    
    const choice = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      'Configure PlantUML',
      'Show All Paths',
      'Close'
    );
    
    if (choice === 'Configure PlantUML') {
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
 * Reset analytics data
 */
async function resetAnalytics(): Promise<void> {
  const confirmed = await vscode.window.showWarningMessage(
    'Are you sure you want to reset all analytics data? This cannot be undone.',
    { modal: true },
    'Reset',
    'Cancel'
  );
  
  if (confirmed === 'Reset') {
    try {
      const analytics = UsageAnalytics.getInstance();
      await analytics.resetStats();
      vscode.window.showInformationMessage('Analytics data has been reset');
    } catch (error) {
      console.error('Error resetting analytics:', error);
      vscode.window.showErrorMessage('Failed to reset analytics data');
    }
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
 * Debug command to show raw analytics data
 */
async function debugAnalytics(context: vscode.ExtensionContext): Promise<void> {
  try {
    const analytics = UsageAnalytics.getInstance();
    
    // Get all stored data
    const usageStats = analytics.getUsageStats();
    const functionStats = analytics.getFunctionUsageStats();
    const detailedMetrics = analytics.getDetailedMetrics(7); // Last 7 days
    const combinedStats = analytics.getCombinedUsageStats();
    const syncStatus = analytics.getSyncStatus();
    
    // Get user ID information
    const storedUserId = context.globalState.get<string>('analyticsUserId', 'not-set');
    const isCopilotId = storedUserId.startsWith('copilot_');
    const isAnonymousId = storedUserId.startsWith('user_');
    
    // Check if GitHub session is available
    let githubSessionStatus = 'Unknown';
    try {
      const session = await vscode.authentication.getSession('github', [], { silent: true });
      if (session?.account?.id) {
        githubSessionStatus = `Available (ID: ${session.account.id}, Label: ${session.account.label})`;
      } else {
        githubSessionStatus = 'Not signed in';
      }
    } catch (error) {
      githubSessionStatus = 'Error checking session';
    }
    
    // Create debug output
    const recentEvents = detailedMetrics.map((event, i) => 
      `${i + 1}. ${event.featureName}${event.functionName ? '.' + event.functionName : ''} at ${new Date(event.timestamp).toLocaleString()}`
    ).join('\n');

    const topFunctionsList = combinedStats.topFunctions.slice(0, 10).map((func, i) => 
      `${i + 1}. ${func.feature}.${func.function}: ${func.count} uses`
    ).join('\n');

    const userIdExplanation = isCopilotId ? 
      '✅ Using GitHub Copilot account ID for consistent user tracking across devices.' :
      '⚠️ Using anonymous ID. Sign in to GitHub in VS Code for consistent tracking.';

    const output = `=== ANALYTICS DEBUG DATA ===

USER IDENTIFICATION:
- Stored User ID: ${storedUserId}
- Type: ${isCopilotId ? '✅ GitHub Copilot ID' : isAnonymousId ? '⚠️ Anonymous fallback ID' : '❓ Unknown type'}
- GitHub Session: ${githubSessionStatus}

FEATURE USAGE COUNTS:
${JSON.stringify(usageStats, null, 2)}

FUNCTION USAGE COUNTS:
${JSON.stringify(functionStats, null, 2)}

RECENT DETAILED EVENTS (Last 7 days): ${detailedMetrics.length} events
${recentEvents}

TOP FUNCTIONS:
${topFunctionsList}

SYNC STATUS:
- Unsynced events: ${syncStatus.unsyncedCount}
- Last sync attempt: ${syncStatus.lastSyncAttempt || 'Never'}

EXPLANATION:
- Total events: ${detailedMetrics.length}
- Feature breakdown: ${Object.keys(usageStats).length} features
- Function breakdown: ${Object.keys(functionStats).reduce((sum, feature) => sum + Object.keys(functionStats[feature] || {}).length, 0)} functions

${userIdExplanation}

Each interaction with the extension creates a separate event.
In development mode, reloading the extension creates new sessions.
Function-level tracking means multiple events per feature use.`;

    // Show in new document
    const doc = await vscode.workspace.openTextDocument({
      content: output,
      language: 'plaintext'
    });
    await vscode.window.showTextDocument(doc);
    
    trackUsage('analytics', 'debug');
    
  } catch (error) {
    console.error('Error debugging analytics:', error);
    vscode.window.showErrorMessage('Failed to debug analytics data');
  }
}
