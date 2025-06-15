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
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            #chat { height: 200px; overflow-y: auto; background: #f5f5f5; padding: 10px; }
            .user { color: #333; }
            .bot { color: #007acc; }
            #uml { margin-top: 10px; background: #fff; border: 1px solid #ccc; min-height: 200px; }
            #inputArea { display: flex; margin-top: 10px; }
            #requirementInput { flex: 1; padding: 5px; }
            #sendBtn { padding: 5px 10px; }
            #exportBtn { margin-left: 10px; }
        </style>
    </head>
    <body>
        <div id="chat">${chatHtml}</div>
        <div id="uml"><pre>${plantUML}</pre></div>
        <div id="svgPreview"></div>
        <div id="inputArea">
            <input id="requirementInput" type="text" placeholder="Describe your UML requirement..." />
            <button id="sendBtn">Send</button>
            <button id="exportBtn">Export SVG</button>
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
