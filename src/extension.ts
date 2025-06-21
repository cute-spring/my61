// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { openCopilotToolsSettingsWebview } from './tools/config/settingsWebview';
import { EmailRefineTool, TranslateTool, JiraRefineTool, PlantUMLPreviewTool } from './tools';
import { ANNOTATION_PROMPT } from './prompts';
import { applyDecoration, clearDecorations } from './decorations';
import { activateUMLChatPanel } from './tools/umlChatPanel';
import { localRender, activate as activatePreview } from './tools/preview';
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

  context.subscriptions.push(
    vscode.commands.registerCommand('copilotTools.clearAnnotations', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        clearDecorations(editor);
      }
    })
  );

  const disposable = vscode.commands.registerTextEditorCommand('copilotTools.annotateCode', async (textEditor: vscode.TextEditor) => {
    const settings = vscode.workspace.getConfiguration('copilotTools');
    const annotationScope = settings.get('annotation.scope', 'visibleArea');
    const codeWithLineNumbers = getCodeWithLineNumbers(textEditor, annotationScope);
    if (!codeWithLineNumbers) {
      vscode.window.showInformationMessage('No code to annotate.');
      return;
    }
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    const messages = [
      vscode.LanguageModelChatMessage.User(ANNOTATION_PROMPT),
      vscode.LanguageModelChatMessage.User(codeWithLineNumbers),
    ];
    if (model) {
      const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
      await parseChatResponse(chatResponse, textEditor);
    }
  });
  context.subscriptions.push(disposable);

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
    vscode.commands.registerCommand('copilotTools.clearPlantumlJarCache', () => clearPlantumlJarCache(context))
  );
}

async function parseChatResponse(chatResponse: vscode.LanguageModelChatResponse, textEditor: vscode.TextEditor) {
  let accumulatedResponse = "";
  for await (const fragment of chatResponse.text) {
    accumulatedResponse += fragment;
    if (fragment.includes("}")) {
      try {
        const annotation = JSON.parse(accumulatedResponse);
        applyDecoration(textEditor, annotation.line, annotation.suggestion);
        accumulatedResponse = "";
      } catch(e) {
        // ignore parse errors
        console.error("Error parsing chat response", e);
      }
    }
  }
}

function getCodeWithLineNumbers(textEditor: vscode.TextEditor, scope: string): string | undefined {
  let startLine: number;
  let endLine: number;
  const document = textEditor.document;

  switch (scope) {
    case 'selection':
      if (textEditor.selection.isEmpty) {
        return undefined;
      }
      startLine = textEditor.selection.start.line;
      endLine = textEditor.selection.end.line;
      break;
    case 'visibleArea':
      startLine = textEditor.visibleRanges[0].start.line;
      endLine = textEditor.visibleRanges[0].end.line;
      break;
    case 'fullDocument':
      startLine = 0;
      endLine = document.lineCount - 1;
      break;
    default:
      return undefined;
  }

  let code = '';
  for (let i = startLine; i <= endLine; i++) {
    code += `${i + 1}: ${document.lineAt(i).text} \n`;
  }
  return code;
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

export function deactivate() {
  if (toolManager) {
    toolManager.dispose();
  }
}
