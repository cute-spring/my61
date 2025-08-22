import * as vscode from 'vscode';
import { BaseTool } from '../base/baseTool';
import { escapeHtml } from '../ui/escapeHtml';
import { getLLMResponse } from '../../llm';

export class TranslateTool extends BaseTool {
  command = 'copilotTools.translateText';
  title = 'Translate Text (English <-> Chinese)';
  isEnabled(settings: vscode.WorkspaceConfiguration) {
    return settings.get('features.translate', true);
  }
  buildPrompt(text: string, settings: vscode.WorkspaceConfiguration) {
    const defaultChinese = settings.get('translation.defaultChinese', 'Simplified');
    const isEnglish = /[a-zA-Z]/.test(text) && !/[\u4e00-\u9fa5]/.test(text);
    const sourceLang = isEnglish ? 'English' : 'Chinese';
    const targetLang = isEnglish ? `Chinese (${defaultChinese})` : 'English';
    return `Translate this text from ${sourceLang} to ${targetLang}:\n${text}`;
  }
  parseResponse(response: string) {
    return { translated: response.trim() };
  }
  getWebviewHtml(original: string, parsed: { translated: string }, settings: vscode.WorkspaceConfiguration) {
    const defaultChinese = settings.get('translation.defaultChinese', 'Simplified');
    const isEnglish = /[a-zA-Z]/.test(original) && !/[\u4e00-\u9fa5]/.test(original);
    const sourceLang = isEnglish ? 'English' : 'Chinese';
    const targetLang = isEnglish ? `Chinese (${defaultChinese})` : 'English';
    const { translated } = parsed;
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Translation</title>
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
          .original, .translated {
            background: var(--vscode-input-background, #f3f3f3);
            color: var(--vscode-input-foreground, #333);
            border-radius: 6px;
            padding: 16px;
            font-size: 1.08em;
            white-space: pre-wrap;
            margin-bottom: 8px;
            border: 1px solid var(--vscode-input-border, #d1d5db);
          }
          .translated { 
            background: var(--vscode-inputValidation-infoBackground, rgba(30, 144, 255, 0.1)); 
            border-left: 4px solid var(--vscode-inputValidation-infoBorder, #1890ff); 
            border-color: var(--vscode-inputValidation-infoBorder, #1890ff);
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
          .subject-btn {
            background: var(--vscode-button-background, #1890ff);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
          }
          .subject-btn:hover { 
            background: var(--vscode-button-hoverBackground, #40a9ff); 
          }
          textarea {
            width: 100%;
            min-height: 80px;
            resize: vertical;
            font-size: 1.08em;
            padding: 16px;
            border-radius: 6px;
            background: var(--vscode-input-background, #f3f3f3);
            color: var(--vscode-input-foreground, #333);
            margin-bottom: 8px;
            border: 1px solid var(--vscode-input-border, #ccc);
            outline: none;
          }
          textarea:focus {
            border-color: var(--vscode-focusBorder, #007acc);
            box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
          }
          
          /* Theme-specific overrides for better contrast */
          body.vscode-dark .translated {
            background: rgba(30, 144, 255, 0.15);
            border-left-color: #40a9ff;
            color: var(--vscode-editor-foreground, #cccccc);
          }
          
          body.vscode-light .translated {
            background: #e6f7ff;
            border-left-color: #1890ff;
            color: var(--vscode-editor-foreground, #333333);
          }
          
          body.vscode-high-contrast .translated {
            background: transparent;
            border: 2px solid var(--vscode-contrastBorder, #ffff00);
            border-left-width: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Translation: ${sourceLang} → ${targetLang}</h2>
          <div class="section">
            <div class="label">Original:</div>
            <textarea id="originalText" class="original">${original}</textarea>
          </div>
          <div style="text-align:center;margin:8px 0;">
            <button class="subject-btn" id="translateBtn" onclick="translateOriginal()">Translate</button>
          </div>
          <div class="section">
            <div class="label">Translated:</div>
            <div class="translated" id="translatedText">${escapeHtml(translated)}</div>
            <button class="copy-btn" onclick="copyText()">Copy Translated Text</button>
          </div>
        </div>
        <script>
          function copyText() {
            const text = document.getElementById('translatedText').innerText;
            navigator.clipboard.writeText(text);
          }
          function translateOriginal() {
            const original = document.getElementById('originalText').value;
            window.acquireVsCodeApi().postMessage({ command: 'translateOriginal', original });
          }
        </script>
      </body>
      </html>
    `;
  }
  handleWebviewMessage(panel: vscode.WebviewPanel, editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration, original: string, parsed: { translated: string }, msg: any) {
    if (msg.command === 'translateOriginal' && typeof msg.original === 'string') {
      (async () => {
        const prompt = this.buildPrompt(msg.original, settings);
        const response = await getLLMResponse(prompt);
        if (!response) { return; }
        const newParsed = this.parseResponse(response);
        panel.webview.html = this.getWebviewHtml(msg.original, newParsed, settings);
      })();
    }
  }
  getSettingsSchema() {
    return {
      'copilotTools.features.translate': {
        type: 'boolean',
        default: true,
        description: 'Enable/disable Translate tool'
      },
      'copilotTools.translation.defaultChinese': {
        type: 'string',
        enum: ['Simplified', 'Traditional'],
        default: 'Simplified',
        description: 'Default Chinese output (Simplified or Traditional)'
      }
    };
  }
}
