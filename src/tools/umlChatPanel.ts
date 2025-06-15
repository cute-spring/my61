import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { localRender } from './preview';

// Use Copilot API to generate PlantUML code from requirement and history
async function generatePlantUMLFromRequirement(requirement: string, history: string[]): Promise<string> {
    const prompt = [
        vscode.LanguageModelChatMessage.User(
            'You are an expert software architect. Given a user requirement, generate the corresponding PlantUML code for a UML diagram. Only output valid PlantUML code. If the user provides an update, modify the previous diagram accordingly.'
        ),
        ...history.map(msg => vscode.LanguageModelChatMessage.User(msg)),
        vscode.LanguageModelChatMessage.User(requirement)
    ];
    try {
        const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (!model) { throw new Error('No Copilot model available.'); }
        const token = new vscode.CancellationTokenSource().token;
        const chatResponse = await model.sendRequest(prompt, {}, token);
        let plantuml = '';
        for await (const fragment of chatResponse.text) {
            plantuml += fragment;
        }
        return plantuml;
    } catch (err: any) {
        throw new Error('Copilot API error: ' + (err.message || String(err)));
    }
}

export function activateUMLChatPanel(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.umlChatPanel', async () => {
            const panel = vscode.window.createWebviewPanel(
                'umlChatPanel',
                'UML Chat Designer',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );

            let chatHistory: { role: 'user' | 'bot', message: string }[] = [];
            let currentPlantUML = '@startuml\n\n@enduml';

            panel.webview.html = getWebviewContent(chatHistory, currentPlantUML);

            panel.webview.onDidReceiveMessage(async message => {
                if (message.command === 'sendRequirement') {
                    const userInput = message.text.trim();
                    if (!userInput) { return; }
                    chatHistory.push({ role: 'user', message: userInput });
                    panel.webview.html = getWebviewContent(chatHistory, currentPlantUML, true);
                    try {
                        // Call Copilot API or placeholder
                        const plantuml = await generatePlantUMLFromRequirement(userInput, chatHistory.map(h => h.message));
                        currentPlantUML = plantuml;
                        chatHistory.push({ role: 'bot', message: plantuml });
                        panel.webview.html = getWebviewContent(chatHistory, currentPlantUML);
                        // Optionally, trigger rendering here
                        const svg = await renderPlantUMLToSVG(currentPlantUML);
                        panel.webview.postMessage({ command: 'updatePreview', svgContent: svg });
                    } catch (err: any) {
                        panel.webview.postMessage({ command: 'error', error: err.message || String(err) });
                    }
                } else if (message.command === 'exportSVG') {
                    // Export SVG logic (send SVG content to backend and save)
                    const svgContent = message.svgContent;
                    const fileUri = await vscode.window.showSaveDialog({
                        filters: { 'SVG': ['svg'] },
                        saveLabel: 'Export SVG'
                    });
                    if (fileUri) {
                        fs.writeFileSync(fileUri.fsPath, svgContent, 'utf-8');
                        vscode.window.showInformationMessage('SVG exported successfully!');
                    }
                }
            }, undefined, context.subscriptions);
        })
    );
}

// Placeholder: Render PlantUML to SVG (reuse your LocalRender logic or call backend)
async function renderPlantUMLToSVG(plantuml: string): Promise<string> {
    // Use localRender to render PlantUML to SVG
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plantuml-chat-'));
    const savePath = path.join(tempDir, 'chat-preview.svg');
    const diagram = {
        parentUri: vscode.Uri.file(savePath),
        dir: tempDir,
        pageCount: 1,
        content: plantuml,
        path: savePath,
        name: path.basename(savePath)
    };
    try {
        const task = localRender.render(diagram, 'svg', savePath);
        const buffers = await task.promise;
        if (buffers && buffers.length > 0) {
            return buffers[0].toString('utf-8');
        }
        return '<svg><!-- No content --></svg>';
    } catch (err: any) {
        return `<svg><!-- Error: ${err.message || String(err)} --></svg>`;
    }
}

function getWebviewContent(chatHistory: { role: 'user' | 'bot', message: string }[], plantUML: string, loading = false): string {
    const chatHtml = chatHistory.map(h => `<div class="${h.role}"><b>${h.role === 'user' ? 'You' : 'Bot'}:</b> <pre>${h.message}</pre></div>`).join('');
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UML Chat Designer</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; height: 100vh; }
            #container { display: flex; height: 100vh; }
            #leftPanel { width: 400px; min-width: 320px; max-width: 600px; display: flex; flex-direction: column; height: 100vh; border-right: 1px solid #ccc; background: #fafbfc; }
            #chat { flex: 1 1 0; overflow-y: auto; background: #f5f5f5; padding: 10px; border-bottom: 1px solid #eee; }
            .user { color: #333; }
            .bot { color: #007acc; }
            #uml { flex: 0 0 auto; background: #fff; border-bottom: 1px solid #eee; min-height: 120px; max-height: 200px; overflow-y: auto; padding: 8px; }
            #inputArea { flex: 0 0 auto; display: flex; flex-direction: column; padding: 8px; border-top: 1px solid #eee; background: #f9f9f9; }
            #requirementInput { width: 100%; min-height: 60px; max-height: 120px; padding: 8px; font-size: 1.1em; resize: vertical; margin-bottom: 8px; }
            #buttonRow { display: flex; flex-direction: row; }
            #sendBtn { padding: 8px 16px; font-size: 1em; margin-left: 0; }
            #exportBtn { margin-left: 10px; padding: 8px 16px; font-size: 1em; }
            #rightPanel { flex: 1 1 0; display: flex; align-items: stretch; justify-content: stretch; background: #fff; }
            #svgPreview { width: 100%; height: 100%; overflow: auto; display: flex; align-items: center; justify-content: center; }
        </style>
    </head>
    <body>
        <div id="container">
            <div id="leftPanel">
                <div id="chat">${chatHtml}</div>
                <div id="uml"><pre>${plantUML}</pre></div>
                <div id="inputArea">
                    <textarea id="requirementInput" placeholder="Describe your UML requirement..."></textarea>
                    <div id="buttonRow">
                        <button id="sendBtn">Send</button>
                        <button id="exportBtn">Export SVG</button>
                    </div>
                </div>
            </div>
            <div id="rightPanel">
                <div id="svgPreview"></div>
            </div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            document.getElementById('sendBtn').onclick = () => {
                const text = document.getElementById('requirementInput').value;
                vscode.postMessage({ command: 'sendRequirement', text });
                document.getElementById('requirementInput').value = '';
            };
            document.getElementById('exportBtn').onclick = () => {
                const svgContent = document.getElementById('svgPreview').innerHTML;
                vscode.postMessage({ command: 'exportSVG', svgContent });
            };
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    document.getElementById('svgPreview').innerHTML = message.svgContent;
                } else if (message.command === 'error') {
                    alert('Error: ' + message.error);
                }
            });
        </script>
    </body>
    </html>
    `;
}
