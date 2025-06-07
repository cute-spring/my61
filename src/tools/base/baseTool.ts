import * as vscode from 'vscode';
import { ICopilotTool } from '../../copilotTool';
import { getLLMResponse } from '../../llm';

export abstract class BaseTool implements ICopilotTool {
  abstract command: string;
  abstract title: string;
  abstract isEnabled(settings: vscode.WorkspaceConfiguration): boolean;
  abstract buildPrompt(...args: any[]): string;
  abstract parseResponse(response: string): any;
  abstract getWebviewHtml(...args: any[]): string;
  abstract handleWebviewMessage(panel: vscode.WebviewPanel, editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration, ...args: any[]): void;

  protected panel: vscode.WebviewPanel | undefined;

  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration) {
    const text = editor.document.getText(selection);
    if (!text.trim()) {
      vscode.window.showErrorMessage('Please select text.');
      return;
    }
    const prompt = this.buildPrompt(text, settings);
    const response = await getLLMResponse(prompt);
    if (!response) { return; }
    const parsed = this.parseResponse(response);
    this.panel = vscode.window.createWebviewPanel(
      this.command,
      this.title,
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );
    this.panel.webview.html = this.getWebviewHtml(text, parsed, settings);
    this.panel.webview.onDidReceiveMessage(msg => {
      if (this.panel) {
        this.handleWebviewMessage(this.panel, editor, selection, settings, text, parsed, msg);
      }
    });
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  dispose() {
    if (this.panel) {
      this.panel.dispose();
    }
  }
}
