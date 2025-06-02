import * as vscode from 'vscode';
import { ICopilotTool } from './copilotTool';

export class EmailRefineTool implements ICopilotTool {
  command = 'copilotTools.refineEmail';
  title = 'Refine Email (with Subject Suggestions)';
  isEnabled(settings: vscode.WorkspaceConfiguration) {
    return settings.get('features.emailRefine', true);
  }
  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration) {
    const text = editor.document.getText(selection);
    if (!text.trim()) {
      vscode.window.showErrorMessage('Please select email text.');
      return;
    }
    // Use Copilot LLM for email refinement
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    let refined = '';
    let subjects: string[] = [];
    if (model) {
      const prompt = `Refine this email draft for clarity, professionalism, and correct grammar. Ensure all original key points are preserved unless otherwise requested. Format the email with clear paragraphs and bullet points if appropriate. Suggest three concise, appropriate subject lines.\n${text}`;
      const messages = [vscode.LanguageModelChatMessage.User(prompt)];
      const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
      let response = '';
      for await (const fragment of chatResponse.text) {
        response += fragment;
      }
      // Try to parse response for refined email and subject suggestions
      const subjectMatch = response.match(/Subject Suggestions?:?([\s\S]*)/i);
      if (subjectMatch) {
        refined = response.substring(0, subjectMatch.index).trim();
        subjects = subjectMatch[1].split(/\n|\r|\d+\.|-/).map(s => s.trim()).filter(Boolean);
      } else {
        refined = response.trim();
        subjects = [];
      }
    } else {
      vscode.window.showErrorMessage('No Copilot LLM model available.');
      return;
    }
    // Show result in a beautiful webview panel
    const panel = vscode.window.createWebviewPanel(
      'copilotTools.refineEmail',
      'Refined Email',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );
    panel.webview.html = getEmailRefineWebviewHtml(text, refined, subjects);
    // Handle subject pick from webview
    panel.webview.onDidReceiveMessage(msg => {
      if (msg.command === 'insertSubject' && msg.subject) {
        editor.edit(editBuilder => {
          editBuilder.insert(selection.start, `${msg.subject}\n`);
        });
      } else if (msg.command === 'furtherRefine' && msg.comment) {
        // Refine again with further comments using Copilot extension API
        (async () => {
          const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
          if (model) {
            let refinedAgain = '';
            let subjects: string[] = [];
            // Use the previous refined email as the base for further refinement
            const prompt = `Refine this email draft further based on the additional comments. Ensure all original key points are preserved unless otherwise requested. Format the email with clear paragraphs and bullet points if appropriate. Keep the subject line relevant and concise.\n\nEmail Draft: ${refined}\n\nFurther Comments: ${msg.comment}`;
            const messages = [vscode.LanguageModelChatMessage.User(prompt)];
            const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
            let response = '';
            for await (const fragment of chatResponse.text) {
              response += fragment;
            }
            // Try to parse response for refined email and subject suggestions
            const subjectMatch = response.match(/Subject Suggestions?:?([\s\S]*)/i);
            if (subjectMatch) {
              refinedAgain = response.substring(0, subjectMatch.index).trim();
              subjects = subjectMatch[1].split(/\n|\r|\d+\.|-/).map(s => s.trim()).filter(Boolean);
            } else {
              refinedAgain = response.trim();
              subjects = [];
            }
            panel.webview.html = getEmailRefineWebviewHtml(text, refinedAgain, subjects);
          } else {
            vscode.window.showErrorMessage('No Copilot LLM model available.');
          }
        })();
      }
    });
  }
}

function getEmailRefineWebviewHtml(original: string, refined: string, subjects: string[]): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refined Email</title>
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
        .subjects { margin: 16px 0; }
        .subject-btn {
          background: #1890ff;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          font-size: 1em;
          cursor: pointer;
          margin-right: 8px;
          margin-bottom: 8px;
          transition: background 0.2s;
        }
        .subject-btn:hover { background: #40a9ff; }
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
        button.refine-again:hover { background: #ffca2c; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Refined Email</h2>
        <div class="section">
          <div class="label">Original:</div>
          <textarea id="originalText" class="original" style="min-height:80px;resize:vertical;width:100%;font-size:1.08em;padding:16px;border-radius:6px;background:#f3f3f3;margin-bottom:8px;">${original}</textarea>
        </div>
        <div class="section">
          <div class="label">Translated:</div>
          <div class="refined" id="refinedText">${escapeHtml(refined)}</div>
          <button class="copy-btn" onclick="copyText()">Copy Refined Email</button>
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
          const text = document.getElementById('refinedText').innerText;
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
        function translateOriginal() {
          const original = document.getElementById('originalText').value;
          window.acquireVsCodeApi().postMessage({ command: 'translateOriginal', original });
        }
      </script>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}

// JiraRefineTool webview
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
      <div class=\"container\">
        <h2>Refined Jira Description</h2>
        <div class=\"section\">
          <div class=\"label\">Original:</div>
          <div class=\"original\">${escapeHtml(original)}</div>
        </div>
        <div class=\"section\">
          <div class=\"label\">Refined:</div>
          <div class=\"refined\" id=\"refinedText\">${escapeHtml(refined)}</div>
          <button class=\"copy-btn\" onclick=\"copyText()\">Copy Refined</button>
          <button class=\"replace-btn\" onclick=\"replaceSelection()\">Replace Selection</button>
        </div>
      </div>
      <script>
        function copyText() {
          const text = document.getElementById('refinedText').innerText;
          navigator.clipboard.writeText(text);
          window.acquireVsCodeApi().postMessage({ command: 'copyRefined' });
        }
        function replaceSelection() {
          window.acquireVsCodeApi().postMessage({ command: 'replaceSelection' });
        }
      </script>
    </body>
    </html>
  `;
}

// TranslateTool class
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
      } else if (msg.command === 'switchLang' && typeof msg.original === 'string') {
        // Swap the source and target language labels and clear the translation
        const original = msg.original;
        const newSourceLang = msg.targetLang;
        const newTargetLang = msg.sourceLang;
        panel.webview.html = getTranslationWebviewHtml(original, '', newSourceLang, newTargetLang);
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
          <button class="subject-btn" id="switchLangBtn" style="margin-left:12px;" onclick="switchLang()">Switch Language</button>
        </div>
        <div class="section">
          <div class="label">Translated:</div>
          <div class="translated" id="translatedText">${escapeHtml(translated)}</div>
          <button class="copy-btn" onclick="copyText()">Copy Translated Text</button>
        </div>
      </div>
      <script>
        let currentSourceLang = "${sourceLang}";
        let currentTargetLang = "${targetLang}";
        function copyText() {
          const text = document.getElementById('translatedText').innerText;
          navigator.clipboard.writeText(text);
        }
        function translateOriginal() {
          const original = document.getElementById('originalText').value;
          window.acquireVsCodeApi().postMessage({ command: 'translateOriginal', original });
        }
        function switchLang() {
          // Swap the source and target language labels and clear the translation
          const original = document.getElementById('originalText').value;
          var translatedDiv = document.getElementById('translatedText');
          if (translatedDiv) { translatedDiv.innerHTML = ''; }
          // Swap the language variables
          var temp = currentSourceLang;
          currentSourceLang = currentTargetLang.replace(/ \(.*\)/, ''); // Remove (Simplified) etc
          currentTargetLang = temp;
          // Re-render the webview with swapped languages
          window.acquireVsCodeApi().postMessage({ command: 'switchLang', original, sourceLang: currentSourceLang, targetLang: currentTargetLang });
        }
      </script>
    </body>
    </html>
  `;
}
