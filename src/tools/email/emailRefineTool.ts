import * as vscode from 'vscode';
import { BaseTool } from '../base/baseTool';
import { escapeHtml } from '../ui/escapeHtml';
import { getLLMResponse } from '../../llm';
import { marked } from 'marked';
import { trackUsage } from '../../analytics';

interface ParsedEmail {
  refined: string;
  subjects: string[];
}

export class EmailRefineTool extends BaseTool {
  command = 'copilotTools.refineEmail';
  title = 'Refine Email (with Subject Suggestions)';
  isEnabled(settings: vscode.WorkspaceConfiguration) {
    return settings.get('features.emailRefine', true);
  }
  buildPrompt(text: string) {
    return `Refine this email draft for clarity, professionalism, and correct grammar. Ensure all original key points are preserved unless otherwise requested. Format the email with clear paragraphs and bullet points if appropriate. Suggest three concise, appropriate subject lines.\n${text}`;
  }
  parseResponse(response: string): ParsedEmail {
    let refined = '';
    let subjects: string[] = [];
    const subjectMatch = response.match(/Subject Suggestions?:?([\s\S]*)/i);
    if (subjectMatch) {
      refined = response.substring(0, subjectMatch.index).trim();
      subjects = subjectMatch[1].split(/\n|\r|\d+\.|-/).map(s => s.trim()).filter(Boolean);
    } else {
      refined = response.trim();
      subjects = [];
    }
    return { refined, subjects };
  }
  getWebviewHtml(original: string, parsed: ParsedEmail) {
    const { refined, subjects } = parsed;
    // Render markdown to HTML for the refined email
    const refinedHtml = marked.parse(refined);
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refined Email</title>
        <style>
          /* Primary Action Buttons - Displayed prominently at top */
          .copy-btn {
            background: var(--vscode-button-background, #52c41a);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
          }
          .copy-btn:hover { 
            background: var(--vscode-button-hoverBackground, #73d13d); 
          }
          
          button.refine-again {
            background: #ffc107;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
          }
          button.refine-again:hover { 
            background: #ffca2c; 
          }

          /* Main Layout Styles */
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
            background: var(--vscode-input-background, #ffffff) !important;
            color: var(--vscode-input-foreground, #333333) !important;
            border-radius: 6px;
            padding: 16px;
            font-size: 1.08em;
            white-space: pre-wrap;
            margin-bottom: 8px;
            border: 1px solid var(--vscode-input-border, #d1d5db) !important;
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
          .subjects { margin: 16px 0; }
          .subject-btn {
            background: var(--vscode-button-background, #1890ff);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-right: 8px;
            margin-bottom: 8px;
            transition: background 0.2s;
          }
          .subject-btn:hover { 
            background: var(--vscode-button-hoverBackground, #40a9ff); 
          }
          .copy-btn {
            background: var(--vscode-button-background, #52c41a);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
          }
          .copy-btn:hover { 
            background: var(--vscode-button-hoverBackground, #73d13d); 
          }
          button.refine-again {
            background: var(--vscode-button-background, #ffc107);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
          }
          button.refine-again:hover { 
            background: var(--vscode-button-hoverBackground, #ffca2c); 
          }
          
          /* Theme-specific overrides for better contrast */
          body.vscode-dark .original {
            background: var(--vscode-input-background, #3c3c3c) !important;
            color: var(--vscode-input-foreground, #cccccc) !important;
            border-color: var(--vscode-input-border, #5a5a5a) !important;
          }
          
          body.vscode-light .original {
            background: var(--vscode-input-background, #ffffff) !important;
            color: var(--vscode-input-foreground, #333333) !important;
            border-color: var(--vscode-input-border, #d1d5db) !important;
          }
          
          body.vscode-high-contrast .original {
            background: var(--vscode-input-background, #000000) !important;
            color: var(--vscode-input-foreground, #ffffff) !important;
            border: 2px solid var(--vscode-contrastBorder, #ffff00) !important;
          }
          
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
      </head>
      <body>
        <div class="container">
          <h2>Refined Email</h2>
          <div class="section">
            <div class="label">Original:</div>
            <textarea id="originalText" class="original" style="min-height:80px;resize:vertical;width:100%;font-size:1.08em;padding:16px;border-radius:6px;margin-bottom:8px;">${original}</textarea>
          </div>
          <div class="section">
            <div class="label">Translated:</div>
            <div class="refined-markdown" id="refinedText">${refinedHtml}</div>
            <button class="copy-btn" onclick="copyText()">Copy as Rich Text</button>
            <button class="copy-btn" style="background:#888;margin-left:8px;" onclick="copyPlainText()">Copy as Plain Text</button>
            <div style="margin-top:20px;">
              <label for="furtherComment" style="font-size:0.95em;color:#888;">Further comment/refinement:</label><br />
              <textarea id="furtherComment" rows="3" style="width:100%;margin-top:6px;padding:8px;border-radius:4px;border:1px solid #ccc;font-size:1em;"></textarea>
              <button class="subject-btn refine-again" style="margin-top:8px;" onclick="sendFurtherRefine()">Refine Again</button>
            </div>
          </div>
          ${subjects.length > 0 ? `<div class="section subjects"><div class="label">Subject Suggestions:</div>${subjects.map(s => `<button class='subject-btn' onclick='insertSubject(${JSON.stringify(s)})'>${escapeHtml(s)}</button>`).join('')}</div>` : ''}
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
          
          function sendFurtherRefine() {
            const comment = document.getElementById('furtherComment').value;
            const refinedDiv = document.getElementById('refinedText');
            if (refinedDiv) {
              refinedDiv.innerHTML = '<em style="color:#888;">Refining…</em>';
            }
            window.acquireVsCodeApi().postMessage({ command: 'furtherRefine', comment });
          }
          function insertSubject(subject) {
            window.acquireVsCodeApi().postMessage({ command: 'insertSubject', subject });
          }
        </script>
      </body>
      </html>
    `;
  }
  handleWebviewMessage(panel: vscode.WebviewPanel, editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration, original: string, parsed: ParsedEmail, msg: any) {
    if (msg.command === 'insertSubject' && msg.subject) {
      editor.edit(editBuilder => {
        editBuilder.insert(selection.start, `${msg.subject}\n`);
      });
    } else if (msg.command === 'furtherRefine' && msg.comment) {
      (async () => {
        const prompt = `Refine this email draft further based on the additional comments. Ensure all original key points are preserved unless otherwise requested. Format the email with clear paragraphs and bullet points if appropriate. Keep the subject line relevant and concise.\n\nEmail Draft: ${parsed.refined}\n\nFurther Comments: ${msg.comment}`;
        const response = await getLLMResponse(prompt);
        if (!response) { return; }
        const newParsed = this.parseResponse(response);
        panel.webview.html = this.getWebviewHtml(original, newParsed);
      })();
    }
  }
  getSettingsSchema() {
    return {
      'copilotTools.features.emailRefine': {
        type: 'boolean',
        default: true,
        description: 'Enable/disable Email Refine tool'
      },
      // Example: add more tool-specific settings here in the future
    };
  }
}
