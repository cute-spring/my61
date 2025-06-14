// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { openCopilotToolsSettingsWebview } from './tools/config/settingsWebview';
import { EmailRefineTool, TranslateTool, JiraRefineTool, PlantUMLPreviewTool } from './tools';
import { ANNOTATION_PROMPT } from './prompts';
import { applyDecoration, clearDecorations } from './decorations';

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

export function activate(context: vscode.ExtensionContext) {
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

export function deactivate() {
  if (toolManager) {
    toolManager.dispose();
  }
}
