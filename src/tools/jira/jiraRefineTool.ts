import * as vscode from 'vscode';
import { BaseTool } from '../base/baseTool';
import { escapeHtml } from '../ui/escapeHtml';

export class JiraRefineTool extends BaseTool {
  command = 'copilotTools.refineJira';
  title = 'Refine Jira Issue Description';
  isEnabled(settings: vscode.WorkspaceConfiguration) {
    return settings.get('features.jiraRefine', true);
  }
  buildPrompt(text: string) {
    return `Refine this Jira issue description. Organize it with the following sections: Subject, Benefit/Impact, Acceptance Criteria, Prioritization Notes.\n${text}`;
  }
  parseResponse(response: string) {
    return { refined: response.trim() };
  }
  getWebviewHtml(original: string, parsed: { refined: string }) {
    const { refined } = parsed;
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
        <div class=\"container\">\n          <h2>Refined Jira Description</h2>\n          <div class=\"section\">\n            <div class=\"label\">Original:</div>\n            <div class=\"original\">${escapeHtml(original)}</div>\n          </div>\n          <div class=\"section\">\n            <div class=\"label\">Refined:</div>\n            <div class=\"refined\" id=\"refinedText\">${escapeHtml(refined)}</div>\n            <button class=\"copy-btn\" onclick=\"copyText()\">Copy Refined</button>\n            <button class=\"replace-btn\" onclick=\"replaceSelection()\">Replace Selection</button>\n          </div>\n        </div>\n        <script>\n          function copyText() {\n            const text = document.getElementById('refinedText').innerText;\n            navigator.clipboard.writeText(text);\n            window.acquireVsCodeApi().postMessage({ command: 'copyRefined' });\n          }\n          function replaceSelection() {\n            window.acquireVsCodeApi().postMessage({ command: 'replaceSelection' });\n          }\n        </script>\n      </body>\n      </html>\n    `;
  }
  handleWebviewMessage(panel: vscode.WebviewPanel, editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration, original: string, parsed: { refined: string }, msg: any) {
    if (msg.command === 'copyRefined') {
      vscode.env.clipboard.writeText(parsed.refined);
      vscode.window.showInformationMessage('Refined Jira description copied to clipboard.');
    } else if (msg.command === 'replaceSelection') {
      editor.edit(editBuilder => {
        editBuilder.replace(selection, parsed.refined);
      });
    }
  }
  getSettingsSchema() {
    return {
      'copilotTools.features.jiraRefine': {
        type: 'boolean',
        default: true,
        description: 'Enable/disable Jira Refine tool'
      },
    };
  }
}
