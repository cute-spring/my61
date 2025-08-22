import * as vscode from 'vscode';
import { BaseTool } from '../base/baseTool';
import { escapeHtml } from '../ui/escapeHtml';
import { marked } from 'marked';

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
    // Render markdown to HTML for the refined Jira description
    const refinedHtml = marked.parse(refined);
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refined Jira Description</title>
        <style>
          body { 
            font-family: var(--vscode-font-family, 'Segoe UI', Arial, sans-serif); 
            background: var(--vscode-editor-background, #f6f8fa); 
            color: var(--vscode-editor-foreground, #333);
            margin: 0; 
            padding: 0; 
          }
          .container { 
            max-width: 800px; 
            margin: 32px auto; 
            background: var(--vscode-panel-background, #fff); 
            border-radius: 12px; 
            box-shadow: 0 2px 16px rgba(0,0,0,0.1); 
            padding: 32px; 
            border: 1px solid var(--vscode-panel-border, #e1e8ed);
          }
          h2 { 
            margin-top: 0; 
            color: var(--vscode-textLink-foreground, #0066cc); 
            font-weight: 600;
          }
          .section { margin-bottom: 24px; }
          .label { 
            font-size: 0.95em; 
            color: var(--vscode-descriptionForeground, #888); 
            margin-bottom: 4px; 
            font-weight: 500;
          }
          .original, .refined {
            background: var(--vscode-input-background, #f3f3f3);
            color: var(--vscode-input-foreground, #333);
            border-radius: 6px;
            padding: 16px;
            font-size: 1.08em;
            white-space: pre-wrap;
            margin-bottom: 8px;
            border: 1px solid var(--vscode-input-border, #d1d5db);
          }
          .refined { 
            background: var(--vscode-inputValidation-infoBackground, rgba(30, 144, 255, 0.1)); 
            border-left: 4px solid var(--vscode-inputValidation-infoBorder, #1890ff); 
            border-color: var(--vscode-inputValidation-infoBorder, #1890ff);
          }
          .refined-markdown { 
            background: var(--vscode-inputValidation-infoBackground, rgba(30, 144, 255, 0.1)); 
            border-left: 4px solid var(--vscode-inputValidation-infoBorder, #1890ff); 
            border-radius: 6px; 
            padding: 16px; 
            font-size: 1.08em; 
            margin-bottom: 8px; 
            border-color: var(--vscode-inputValidation-infoBorder, #1890ff);
          }
          .copy-btn, .replace-btn {
            background: var(--vscode-button-background, #1890ff);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-right: 8px;
            margin-top: 8px;
            transition: background 0.2s;
          }
          .copy-btn:hover, .replace-btn:hover { 
            background: var(--vscode-button-hoverBackground, #40a9ff); 
          }
          
          /* Theme-specific overrides for better contrast */
          body.vscode-dark .refined,
          body.vscode-dark .refined-markdown {
            background: rgba(30, 144, 255, 0.15);
            border-left-color: #40a9ff;
            color: var(--vscode-editor-foreground, #cccccc);
          }
          
          body.vscode-light .refined,
          body.vscode-light .refined-markdown {
            background: #e6f7ff;
            border-left-color: #1890ff;
            color: var(--vscode-editor-foreground, #333333);
          }
          
          body.vscode-high-contrast .refined,
          body.vscode-high-contrast .refined-markdown {
            background: transparent;
            border: 2px solid var(--vscode-contrastBorder, #ffff00);
            border-left-width: 4px;
          }
        </style>
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Refined Jira Description</h2>
          <div class="section">
            <div class="label">Original:</div>
            <div class="original">${escapeHtml(original)}</div>
          </div>
          <div class="section">
            <div class="label">Refined:</div>
            <div class="refined-markdown" id="refinedText">${refinedHtml}</div>
            <button class="copy-btn" onclick="copyText()">Copy as Rich Text</button>
            <button class="copy-btn" style="background:#888;margin-left:8px;" onclick="copyPlainText()">Copy as Plain Text</button>
            <button class="replace-btn" onclick="replaceSelection()">Replace Selection</button>
          </div>
        </div>
        <script>
          function copyText() {
            const refinedDiv = document.getElementById('refinedText');
            if (navigator.clipboard && window.ClipboardItem) {
              // Copy as HTML (rich text)
              const html = refinedDiv.innerHTML;
              const blob = new Blob([html], { type: 'text/html' });
              const data = [new window.ClipboardItem({ 'text/html': blob })];
              navigator.clipboard.write(data);
            } else {
              // Fallback: copy as plain text
              const text = refinedDiv.innerText;
              navigator.clipboard.writeText(text);
            }
          }
          function copyPlainText() {
            const refinedDiv = document.getElementById('refinedText');
            const text = refinedDiv.innerText;
            navigator.clipboard.writeText(text);
          }
          function replaceSelection() {
            window.acquireVsCodeApi().postMessage({ command: 'replaceSelection' });
          }
        </script>
      </body>
      </html>
    `;
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
