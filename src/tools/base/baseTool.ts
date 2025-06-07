import * as vscode from 'vscode';
import { ICopilotTool } from '../../copilotTool';

export abstract class BaseTool implements ICopilotTool {
  abstract command: string;
  abstract title: string;
  abstract isEnabled(settings: vscode.WorkspaceConfiguration): boolean;
  abstract buildPrompt(...args: any[]): string;
  abstract parseResponse(response: string): any;
  abstract getWebviewHtml(...args: any[]): string;
  abstract handleWebviewMessage(panel: vscode.WebviewPanel, editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration, ...args: any[]): void;

  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration) {
    const text = editor.document.getText(selection);
    if (!text.trim()) {
      vscode.window.showErrorMessage('Please select text.');
      return;
    }
    const prompt = this.buildPrompt(text, settings);
    const response = await this.getLLMResponse(prompt);
    if (!response) { return; }
    const parsed = this.parseResponse(response);
    const panel = vscode.window.createWebviewPanel(
      this.command,
      this.title,
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );
    panel.webview.html = this.getWebviewHtml(text, parsed, settings);
    panel.webview.onDidReceiveMessage(msg => {
      this.handleWebviewMessage(panel, editor, selection, settings, text, parsed, msg);
    });
  }

  protected async getLLMResponse(prompt: string): Promise<string | undefined> {
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    if (!model) {
      vscode.window.showErrorMessage('No Copilot LLM model available.');
      return;
    }
    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    let response = '';
    for await (const fragment of chatResponse.text) {
      response += fragment;
    }
    return response;
  }
}
