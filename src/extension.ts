// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { openCopilotToolsSettingsWebview } from './tools/config/settingsWebview';
import { EmailRefineTool, TranslateTool, JiraRefineTool } from './tools';

const ANNOTATION_PROMPT = `You are a code tutor who helps students learn how to write better code. Your job is to evaluate a block of code that the user gives you. The user is writing You will then annotate any lines that could be improved with a brief suggestion and the reason why you are making that suggestion. Only make suggestions when you feel the severity is enough that it will impact the readibility and maintainability of the code. Be friendly with your suggestions and remember that these are students so they need gentle guidance. Format each suggestion as a single JSON object. It is not necessary to wrap your response in triple backticks. Here is an example of what your response should look like:

{ "line": 1, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }{ "line": 12, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }
`;

export interface ICopilotTool {
  command: string;
  title: string;
  isEnabled(settings: vscode.WorkspaceConfiguration): boolean;
  handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration): Promise<void>;
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
  getTools() {
    return this.tools;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const toolManager = new ToolManager(context);
  toolManager.registerTool(new EmailRefineTool());
  toolManager.registerTool(new TranslateTool());
  toolManager.registerTool(new JiraRefineTool());

  // Register settings webview command
  context.subscriptions.push(
    vscode.commands.registerCommand('copilotTools.openSettings', () => {
      openCopilotToolsSettingsWebview(context, [
        EmailRefineTool,
        TranslateTool,
        JiraRefineTool
      ]);
    })
  );

  const disposable = vscode.commands.registerTextEditorCommand('copilotTools.annotateCode', async (textEditor: vscode.TextEditor) => {
    const codeWithLineNumbers = getVisibleCodeWithLineNumbers(textEditor);
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
      } catch {
        // ignore parse errors
      }
    }
  }
}

function getVisibleCodeWithLineNumbers(textEditor: vscode.TextEditor) {
  let currentLine = textEditor.visibleRanges[0].start.line;
  const endLine = textEditor.visibleRanges[0].end.line;
  let code = '';
  while (currentLine < endLine) {
    code += `${currentLine + 1}: ${textEditor.document.lineAt(currentLine).text} \n`;
    currentLine++;
  }
  return code;
}

function applyDecoration(editor: vscode.TextEditor, line: number, suggestion: string) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: ` ${suggestion.substring(0, 25) + "..."}`,
      color: "grey",
    },
  });
  const lineLength = editor.document.lineAt(line - 1).text.length;
  const range = new vscode.Range(
    new vscode.Position(line - 1, lineLength),
    new vscode.Position(line - 1, lineLength),
  );
  const decoration = { range: range, hoverMessage: suggestion };
  vscode.window.activeTextEditor?.setDecorations(decorationType, [decoration]);
}

export function deactivate() {}
