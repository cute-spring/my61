import * as vscode from 'vscode';

/**
 * Opens a settings webview for all Copilot Tools, dynamically rendering a form from all tool schemas.
 * @param context - The extension context.
 * @param tools - The array of Copilot Tools.
 */
export function openCopilotToolsSettingsWebview(context: vscode.ExtensionContext, tools: any[]) {
  const panel = vscode.window.createWebviewPanel(
    'copilotTools.settings',
    'Copilot Tools Settings',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  // Collect schemas from all tools
  const schemas = tools.map(t => (typeof t.getSettingsSchema === 'function' ? t.getSettingsSchema() : {}));
  const mergedSchema = Object.assign({}, ...schemas);
  const config = vscode.workspace.getConfiguration();

  // Build HTML form dynamically
  let formHtml = '';
  for (const [key, schemaRaw] of Object.entries(mergedSchema)) {
    const schema = schemaRaw as { type: string; description: string; enum?: string[]; default?: any };
    const value = config.get(key);
    if (schema.type === 'boolean') {
      formHtml += `<div style="margin-bottom:16px;"><label><input type="checkbox" name="${key}" ${value ? 'checked' : ''}/> ${schema.description}</label></div>`;
    } else if (schema.type === 'string' && schema.enum) {
      formHtml += `<div style="margin-bottom:16px;"><label>${schema.description}<select name="${key}">`;
      for (const opt of schema.enum) {
        formHtml += `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`;
      }
      formHtml += `</select></label></div>`;
    }
  }

  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Copilot Tools Settings</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px #0001; padding: 32px; }
        h2 { margin-top: 0; color: #0066cc; }
        label { font-size: 1em; }
        button { background: #1890ff; color: #fff; border: none; border-radius: 4px; padding: 8px 16px; font-size: 1em; cursor: pointer; margin-top: 16px; }
        button:hover { background: #40a9ff; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Copilot Tools Settings</h2>
        <form id="settingsForm">
          ${formHtml}
          <button type="submit">Save Settings</button>
        </form>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('settingsForm').onsubmit = function(e) {
          e.preventDefault();
          const form = e.target;
          const data = {};
          for (const el of form.elements) {
            if (!el.name) continue;
            if (el.type === 'checkbox') {
              data[el.name] = el.checked;
            } else {
              data[el.name] = el.value;
            }
          }
          vscode.postMessage({ command: 'saveSettings', data });
        };
      </script>
    </body>
    </html>
  `;

  panel.webview.onDidReceiveMessage(async msg => {
    if (msg.command === 'saveSettings') {
      for (const [key, value] of Object.entries(msg.data)) {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }
      vscode.window.showInformationMessage('Copilot Tools settings saved.');
    }
  });
}