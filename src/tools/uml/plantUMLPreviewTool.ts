import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ICopilotTool } from '../../extension';
import { localRender } from '../preview';
import { trackUsage } from '../../analytics';

export class PlantUMLPreviewTool implements ICopilotTool {
  command = 'copilotTools.previewAntUML';
  title = 'Preview PlantUML Diagram';

  isEnabled(settings: vscode.WorkspaceConfiguration): boolean {
    // Optionally, add a feature toggle in settings
    return true;
  }

  getSettingsSchema() {
    return {};
  }

  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration): Promise<void> {
    // Track PlantUML preview usage
    trackUsage('plantuml', {
      hasSelection: !selection.isEmpty,
      selectionLength: editor.document.getText(selection).length,
      fileExtension: editor.document.fileName.split('.').pop()
    });
    
    const document = editor.document;
    const plantUMLText = document.getText(selection.isEmpty ? undefined : selection);
    const diagram = {
      parentUri: document.uri,
      dir: path.dirname(document.uri.fsPath),
      pageCount: 1,
      content: plantUMLText,
      path: document.uri.fsPath,
      name: path.basename(document.uri.fsPath)
    };

    const panel = vscode.window.createWebviewPanel(
      'plantUMLPreview',
      'PlantUML Preview',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.webview.html = this.getWebviewContent(plantUMLText);

    panel.webview.onDidReceiveMessage(async message => {
      if (message.command === 'render') {
        let format = 'svg';
        let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plantuml-'));
        let savePath = path.join(tempDir, 'preview.svg');
        try {
          if (message.plantumlText) {
            diagram.content = message.plantumlText;
          }
          let task = localRender.render(diagram, format, savePath);
          let buffers = await task.promise;
          if (buffers && buffers.length > 0) {
            let svgContent = buffers[0].toString('utf-8');
            panel.webview.postMessage({ command: 'updatePreview', svgContent });
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to render PlantUML diagram: ${err.message}`);
        }
      }
    });
  }

  getWebviewContent(plantUMLText: string): string {
    // Use backticks and escape properly for template literal
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUML Preview</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            height: 100vh;
        }
        #preview {
            border: 1px solid #ccc;
            padding: 10px;
            background-color: #f9f9f9;
        }
    </style>
</head>
<body>
    <textarea id="plantumlText" rows="10" cols="50" style="width: 100%; height: 200px;">${plantUMLText}</textarea>
    <button id="renderButton" style="margin-top: 10px;">Render Diagram</button>
    <div id="preview"></div>
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('renderButton').addEventListener('click', () => {
            const plantumlText = document.getElementById('plantumlText').value;
            vscode.postMessage({ command: 'render', plantumlText });
        });
        // Automatically render on load
        window.addEventListener('DOMContentLoaded', () => {
            const plantumlText = document.getElementById('plantumlText').value;
            vscode.postMessage({ command: 'render', plantumlText });
        });
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updatePreview') {
                document.getElementById('preview').innerHTML = message.svgContent;
            }
        });
    </script>
</body>
</html>`;
  }
}
