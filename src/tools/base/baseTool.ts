import * as vscode from 'vscode';
import { ICopilotTool } from '../../copilotTool';
import { getLLMResponse } from '../../llm';
import { trackUsage } from '../../analytics';

export abstract class BaseTool implements ICopilotTool {
  abstract command: string;
  abstract title: string;
  abstract isEnabled(settings: vscode.WorkspaceConfiguration): boolean;
  abstract buildPrompt(...args: any[]): string;
  abstract parseResponse(response: string): any;
  abstract getWebviewHtml(...args: any[]): string;
  abstract handleWebviewMessage(panel: vscode.WebviewPanel, editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration, ...args: any[]): void;

  protected panel: vscode.WebviewPanel | undefined;

  // Map command names to analytics feature names
  protected getFeatureName(): string {
    const commandMap: Record<string, string> = {
      'copilotTools.refineEmail': 'email',
      'copilotTools.translateText': 'translate', 
      'copilotTools.refineJira': 'jira',
      'copilotTools.previewAntUML': 'plantuml',
      'extension.umlChatPanel': 'umlChat'
    };
    return commandMap[this.command] || this.command;
  }

  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration) {
    // Track tool usage at the beginning of function execution
    const featureName = this.getFeatureName();
    trackUsage(featureName, {
      hasSelection: !selection.isEmpty,
      selectionLength: editor.document.getText(selection).length,
      fileExtension: editor.document.fileName.split('.').pop()
    });

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
