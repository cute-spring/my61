import * as vscode from 'vscode';
import { ICopilotTool } from '../../copilotTool';
import { escapeHtml } from '../ui/escapeHtml';

export class JiraRefineTool implements ICopilotTool {
  command = 'copilotTools.refineJira';
  title = 'Refine Jira Issue Description';
  isEnabled(settings: vscode.WorkspaceConfiguration) {
    return settings.get('features.jiraRefine', true);
  }
  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration) {
    const text = editor.document.getText(selection);
    if (!text.trim()) {
      vscode.window.showErrorMessage('Please select Jira description text.');
      return;
    }
    // Use Copilot LLM for Jira refinement
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    let refined = '';
    if (model) {
      const prompt = `Refine this Jira issue description. Organize it with the following sections: Subject, Benefit/Impact, Acceptance Criteria, Prioritization Notes.\n${text}`;
      const messages = [vscode.LanguageModelChatMessage.User(prompt)];
      const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
      for await (const fragment of chatResponse.text) {
        refined += fragment;
      }
    } else {
      vscode.window.showErrorMessage('No Copilot LLM model available.');
      return;
    }
    // Show result in a beautiful webview panel
    const panel = vscode.window.createWebviewPanel(
      'copilotTools.refineJira',
      'Refined Jira Description',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );
    panel.webview.html = getJiraRefineWebviewHtml(text, refined);
    // Handle copy from webview
    panel.webview.onDidReceiveMessage(msg => {
      if (msg.command === 'copyRefined') {
        vscode.env.clipboard.writeText(refined);
        vscode.window.showInformationMessage('Refined Jira description copied to clipboard.');
      } else if (msg.command === 'replaceSelection') {
        editor.edit(editBuilder => {
          editBuilder.replace(selection, refined);
        });
      }
    });
  }
}

function getJiraRefineWebviewHtml(original: string, refined: string): string {
  return `
    <!DOCTYPE html>
    <html lang=\"en\">
    <head>
      <meta charset=\"UTF-8\">
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
      <title>Refined Jira Description</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; margin: 0; padding: 0; }
        .container { max-width: 800px; margin: 32px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px #0001; padding: 32px; }
        h2 { margin-top: 0; color: #0066cc; }
        .section { margin-bottom: 24px; }
        .label { font-size: 0.95em; color: #888; margin-bottom: 4px; }
        .original, .refined {
          background: #f3f3f3;
          border-radius: 6px;
          padding: 16px;
          font-size: 1.08em;
          white-space: pre-wrap;
          margin-bottom: 8px;
        }
        .refined { background: #e6f7ff; border-left: 4px solid #1890ff; }
        .copy-btn, .replace-btn {
          background: #1890ff;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          font-size: 1em;
          cursor: pointer;
          margin-right: 8px;
          margin-top: 8px;
          transition: background 0.2s;
        }
        .copy-btn:hover, .replace-btn:hover { background: #40a9ff; }
      </style>
    </head>
    <body>
      <div class=\"container\">\n        <h2>Refined Jira Description</h2>\n        <div class=\"section\">\n          <div class=\"label\">Original:</div>\n          <div class=\"original\">${escapeHtml(original)}</div>\n        </div>\n        <div class=\"section\">\n          <div class=\"label\">Refined:</div>\n          <div class=\"refined\" id=\"refinedText\">${escapeHtml(refined)}</div>\n          <button class=\"copy-btn\" onclick=\"copyText()\">Copy Refined</button>\n          <button class=\"replace-btn\" onclick=\"replaceSelection()\">Replace Selection</button>\n        </div>\n      </div>\n      <script>\n        function copyText() {\n          const text = document.getElementById('refinedText').innerText;\n          navigator.clipboard.writeText(text);\n          window.acquireVsCodeApi().postMessage({ command: 'copyRefined' });\n        }\n        function replaceSelection() {\n          window.acquireVsCodeApi().postMessage({ command: 'replaceSelection' });\n        }\n      </script>\n    </body>\n    </html>\n  `;
}
