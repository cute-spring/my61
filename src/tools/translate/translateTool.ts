import * as vscode from 'vscode';
import { BaseTool } from '../base/baseTool';
import { escapeHtml } from '../ui/escapeHtml';

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
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; margin: 0; padding: 0; }
          .container { max-width: 800px; margin: 32px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px #0001; padding: 32px; }
          h2 { margin-top: 0; color: #0066cc; }
          .section { margin-bottom: 24px; }
          .label { font-size: 0.95em; color: #888; margin-bottom: 4px; }
          .original, .translated {
            background: #f3f3f3;
            border-radius: 6px;
            padding: 16px;
            font-size: 1.08em;
            white-space: pre-wrap;
            margin-bottom: 8px;
          }
          .translated { background: #e6f7ff; border-left: 4px solid #1890ff; }
          .copy-btn {
            background: #52c41a;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
          }
          .copy-btn:hover { background: #73d13d; }
          .subject-btn {
            background: #1890ff;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
          }
          .subject-btn:hover { background: #40a9ff; }
          textarea {
            width: 100%;
            min-height: 80px;
            resize: vertical;
            font-size: 1.08em;
            padding: 16px;
            border-radius: 6px;
            background: #f3f3f3;
            margin-bottom: 8px;
            border: 1px solid #ccc;
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
        const response = await this.getLLMResponse(prompt);
        if (!response) { return; }
        const newParsed = this.parseResponse(response);
        panel.webview.html = this.getWebviewHtml(msg.original, newParsed, settings);
      })();
    }
  }
  static getSettingsSchema() {
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
