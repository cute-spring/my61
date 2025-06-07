import * as vscode from 'vscode';
import { BaseTool } from '../base/baseTool';
import { escapeHtml } from '../ui/escapeHtml';

export class EmailRefineTool extends BaseTool {
  command = 'copilotTools.refineEmail';
  title = 'Refine Email (with Subject Suggestions)';
  isEnabled(settings: vscode.WorkspaceConfiguration) {
    return settings.get('features.emailRefine', true);
  }
  buildPrompt(text: string) {
    return `Refine this email draft for clarity, professionalism, and correct grammar. Ensure all original key points are preserved unless otherwise requested. Format the email with clear paragraphs and bullet points if appropriate. Suggest three concise, appropriate subject lines.\n${text}`;
  }
  parseResponse(response: string) {
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
  getWebviewHtml(original: string, parsed: { refined: string, subjects: string[] }) {
    const { refined, subjects } = parsed;
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
          function insertSubject(subject) {
            window.acquireVsCodeApi().postMessage({ command: 'insertSubject', subject });
          }
        </script>
      </body>
      </html>
    `;
  }
  handleWebviewMessage(panel: vscode.WebviewPanel, editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration, original: string, parsed: { refined: string, subjects: string[] }, msg: any) {
    if (msg.command === 'insertSubject' && msg.subject) {
      editor.edit(editBuilder => {
        editBuilder.insert(selection.start, `${msg.subject}\n`);
      });
    } else if (msg.command === 'furtherRefine' && msg.comment) {
      (async () => {
        const prompt = `Refine this email draft further based on the additional comments. Ensure all original key points are preserved unless otherwise requested. Format the email with clear paragraphs and bullet points if appropriate. Keep the subject line relevant and concise.\n\nEmail Draft: ${parsed.refined}\n\nFurther Comments: ${msg.comment}`;
        const response = await this.getLLMResponse(prompt);
        if (!response) { return; }
        const newParsed = this.parseResponse(response);
        panel.webview.html = this.getWebviewHtml(original, newParsed);
      })();
    }
  }
}
