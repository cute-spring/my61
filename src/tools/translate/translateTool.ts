import * as vscode from 'vscode';
import { ICopilotTool } from '../../copilotTool';
import { escapeHtml } from '../ui/escapeHtml';

export class TranslateTool implements ICopilotTool {
  command = 'copilotTools.translateText';
  title = 'Translate Text (English <-> Chinese)';
  isEnabled(settings: vscode.WorkspaceConfiguration) {
    return settings.get('features.translate', true);
  }
  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration) {
    const text = editor.document.getText(selection);
    if (!text.trim()) {
      vscode.window.showErrorMessage('Please select text to translate.');
      return;
    }
    // Use Copilot LLM for translation
    const defaultChinese = settings.get('translation.defaultChinese', 'Simplified');
    const isEnglish = /[a-zA-Z]/.test(text) && !/[\u4e00-\u9fa5]/.test(text);
    const sourceLang = isEnglish ? 'English' : 'Chinese';
    const targetLang = isEnglish ? `Chinese (${defaultChinese})` : 'English';
    const prompt = `Translate this text from ${sourceLang} to ${targetLang}:\n${text}`;
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    let translated = '';
    if (model) {
      const messages = [vscode.LanguageModelChatMessage.User(prompt)];
      const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
      for await (const fragment of chatResponse.text) {
        translated += fragment;
      }
    } else {
      vscode.window.showErrorMessage('No Copilot LLM model available.');
      return;
    }
    // Show translation in a beautiful webview panel
    const panel = vscode.window.createWebviewPanel(
      'copilotTools.translateText',
      `Translation: ${sourceLang} → ${targetLang}`,
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );
    panel.webview.html = getTranslationWebviewHtml(text, translated, sourceLang, targetLang);
    panel.webview.onDidReceiveMessage(msg => {
      if (msg.command === 'translateOriginal' && typeof msg.original === 'string') {
        (async () => {
          // Detect language direction
          const text = msg.original;
          const defaultChinese = settings.get('translation.defaultChinese', 'Simplified');
          const isEnglish = /[a-zA-Z]/.test(text) && !/[\u4e00-\u9fa5]/.test(text);
          const sourceLang = isEnglish ? 'English' : 'Chinese';
          const targetLang = isEnglish ? `Chinese (${defaultChinese})` : 'English';
          const prompt = `Translate this text from ${sourceLang} to ${targetLang}:\n${text}`;
          const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
          let translated = '';
          if (model) {
            const messages = [vscode.LanguageModelChatMessage.User(prompt)];
            const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
            for await (const fragment of chatResponse.text) {
              translated += fragment;
            }
          } else {
            vscode.window.showErrorMessage('No Copilot LLM model available.');
            return;
          }
          // Re-render the translation webview with the new translation
          panel.webview.html = getTranslationWebviewHtml(text, translated, sourceLang, targetLang);
        })();
      }
    });
  }
}

function getTranslationWebviewHtml(original: string, translated: string, sourceLang: string, targetLang: string): string {
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
