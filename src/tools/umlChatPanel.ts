import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { localRender } from './preview';

// Use Copilot API to generate PlantUML code from requirement, history, and diagram type
async function generatePlantUMLFromRequirement(requirement: string, history: string[], diagramType?: string): Promise<string> {
    let typeInstruction = '';
    if (diagramType && diagramType !== '') {
        typeInstruction = `Generate a PlantUML ${diagramType} diagram.`;
    } else {
        typeInstruction = 'Generate the most appropriate UML diagram for the requirement.';
    }
    const prompt = [
        vscode.LanguageModelChatMessage.User(
            `You are an expert software architect and technical writer.\nFirst, briefly explain the user's system, question, or process in 2-3 sentences.\nThen, output the corresponding PlantUML code (and only valid PlantUML code) for the described system or process.\nIf the user provides an update, modify the previous diagram and explanation accordingly.\n${typeInstruction}\nFormat your response as:\nExplanation:\n<your explanation here>\n\n@startuml\n<PlantUML code here>\n@enduml\n`
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
                    const diagramType = message.diagramType || '';
                    if (!userInput) { return; }
                    chatHistory.push({ role: 'user', message: userInput });
                    panel.webview.html = getWebviewContent(chatHistory, currentPlantUML, true);
                    try {
                        // Call Copilot API or placeholder
                        const plantuml = await generatePlantUMLFromRequirement(userInput, chatHistory.map(h => h.message), diagramType);
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
                } else if (message.command === 'clearChat') {
                    chatHistory = [];
                    currentPlantUML = '@startuml\n\n@enduml';
                    panel.webview.html = getWebviewContent(chatHistory, currentPlantUML);
                    panel.webview.postMessage({ command: 'updatePreview', svgContent: '' });
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
    const chatHtml = chatHistory.map(h => `<div class="${h.role}"><b>${h.role === 'user' ? 'You' : 'Bot'}:</b> <pre style="white-space: pre-wrap; word-break: break-word;">${h.message}</pre></div>`).join('');
    const diagramTypes = [
        { value: '', label: 'Auto-detect' },
        { value: 'class', label: 'Class Diagram' },
        { value: 'sequence', label: 'Sequence Diagram' },
        { value: 'activity', label: 'Activity Diagram' },
        { value: 'usecase', label: 'Use Case Diagram' },
        { value: 'state', label: 'State Diagram' },
        { value: 'component', label: 'Component Diagram' },
        { value: 'deployment', label: 'Deployment Diagram' }
    ];
    const diagramTypeOptions = diagramTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
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
            #leftPanel { width: 20vw; min-width: 320px; max-width: 900px; display: flex; flex-direction: column; height: 100vh; border-right: 1px solid #ccc; background: #fafbfc; resize: none; overflow: auto; position: relative; transition: width 0.1s; }
            #dragbar { width: 5px; cursor: ew-resize; background: #e0e0e0; height: 100vh; z-index: 10; }
            #chat { flex: 1 1 0; overflow-y: auto; background: #f5f5f5; padding: 10px; border-bottom: 1px solid #eee; min-height: 200px; max-height: 60vh; }
            .user { color: #333; }
            .bot { color: #007acc; }
            #uml { flex: 0 0 auto; background: #fff; border-bottom: 1px solid #eee; min-height: 120px; max-height: 200px; overflow-y: auto; padding: 8px; }
            #inputArea { flex: 0 0 auto; display: flex; flex-direction: column; padding: 8px; border-top: 1px solid #eee; background: #f9f9f9; }
            #requirementInput { width: 100%; min-height: 60px; max-height: 120px; padding: 8px; font-size: 1.1em; resize: vertical; margin-bottom: 8px; }
            #buttonRow { display: flex; flex-direction: row; justify-content: space-between; align-items: flex-end; gap: 16px; margin-top: 8px; flex-wrap: wrap; }
            .primary-actions, .secondary-actions { display: flex; flex-direction: row; align-items: center; gap: 10px; }
            button, select {
                border-radius: 6px;
                border: 1px solid #ccc;
                background: #f5f5f5;
                padding: 8px 18px;
                font-size: 1em;
                transition: background 0.2s, border 0.2s, color 0.2s;
                cursor: pointer;
                outline: none;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            button svg {
                width: 20px;
                height: 20px;
                display: block;
            }
            button.primary {
                background: #007acc;
                color: #fff;
                border: 1px solid #007acc;
            }
            button.primary:hover, button.primary:focus {
                background: #005fa3;
                border-color: #005fa3;
            }
            button.danger {
                background: #fff0f0;
                color: #d32f2f;
                border: 1px solid #d32f2f;
            }
            button.danger:hover, button.danger:focus {
                background: #d32f2f;
                color: #fff;
            }
            button:hover, button:focus {
                background: #e0e0e0;
                border-color: #bdbdbd;
            }
            #rightPanel { flex: 1 1 0; display: flex; align-items: stretch; justify-content: stretch; background: #fff; min-width: 0; }
            #svgPreview { width: 100%; height: 98vh; min-height: 0; min-width: 0; overflow: auto; display: flex; align-items: center; justify-content: center; background: #fff; margin: auto; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 2px 8px #eee; }
            #svgPreview svg text { white-space: pre-wrap !important; word-break: break-all !important; }
            /* Hide scrollbar for chat if expanded */
            #leftPanel.fullscreen { position: fixed; z-index: 1000; left: 0; top: 0; width: 100vw !important; max-width: 100vw !important; height: 100vh !important; background: #fafbfc; box-shadow: 0 0 10px #888; }
            #rightPanel.hide { display: none !important; }
            @media (max-width: 700px) {
                #buttonRow { flex-direction: column; align-items: stretch; gap: 8px; }
                .primary-actions, .secondary-actions { flex-direction: column; align-items: stretch; gap: 8px; }
            }
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
                        <div class="primary-actions">
                            <select id="diagramType">${diagramTypeOptions}</select>
                            <button id="sendBtn" class="primary" aria-label="Send">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                            <button id="exportBtn" aria-label="Export SVG">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                        </div>
                        <div class="secondary-actions">
                            <button id="expandChatBtn" aria-label="Expand/Collapse Chat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                            </button>
                            <button id="clearChatBtn" class="danger" aria-label="Clear Chat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="dragbar"></div>
            <div id="rightPanel">
                <div id="svgPreview"></div>
            </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js"></script>
        <script>
            const vscode = acquireVsCodeApi();
            // SVG icon strings for expand/collapse
            const expandIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
            const collapseIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 21 3 21 3 15"/><polyline points="15 3 21 3 21 9"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
            document.getElementById('sendBtn').onclick = () => {
                const text = document.getElementById('requirementInput').value;
                const diagramType = document.getElementById('diagramType').value;
                vscode.postMessage({ command: 'sendRequirement', text, diagramType });
                document.getElementById('requirementInput').value = '';
            };
            document.getElementById('exportBtn').onclick = () => {
                const svgContent = document.getElementById('svgPreview').innerHTML;
                vscode.postMessage({ command: 'exportSVG', svgContent });
            };
            document.getElementById('clearChatBtn').onclick = () => {
                vscode.postMessage({ command: 'clearChat' });
            };
            // Expand/collapse chat panel
            const expandBtn = document.getElementById('expandChatBtn');
            expandBtn.onclick = () => {
                const leftPanel = document.getElementById('leftPanel');
                const rightPanel = document.getElementById('rightPanel');
                if (!leftPanel.classList.contains('fullscreen')) {
                    leftPanel.classList.add('fullscreen');
                    rightPanel.classList.add('hide');
                    expandBtn.innerHTML = collapseIcon;
                } else {
                    leftPanel.classList.remove('fullscreen');
                    rightPanel.classList.remove('hide');
                    expandBtn.innerHTML = expandIcon;
                }
            };
            // Set initial icon for expand button
            expandBtn.innerHTML = expandIcon;
            // Drag to resize leftPanel
            const dragbar = document.getElementById('dragbar');
            const leftPanel = document.getElementById('leftPanel');
            const rightPanel = document.getElementById('rightPanel');
            let isDragging = false;
            dragbar.addEventListener('mousedown', function(e) {
                isDragging = true;
                document.body.style.cursor = 'ew-resize';
            });
            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                let containerRect = document.getElementById('container').getBoundingClientRect();
                let newWidth = e.clientX - containerRect.left;
                if (newWidth < 320) newWidth = 320;
                if (newWidth > 900) newWidth = 900;
                leftPanel.style.width = newWidth + 'px';
            });
            document.addEventListener('mouseup', function(e) {
                if (isDragging) {
                    isDragging = false;
                    document.body.style.cursor = '';
                }
            });
            function enablePanZoom() {
                const svgEl = document.querySelector('#svgPreview svg');
                if (svgEl && window.svgPanZoom) {
                    svgEl.style.width = '100%';
                    svgEl.style.height = '100%';
                    svgEl.removeAttribute('viewBox');
                    window.svgPanZoom(svgEl, {
                        zoomEnabled: true,
                        controlIconsEnabled: true,
                        fit: true,
                        center: true,
                        minZoom: 0.1,
                        maxZoom: 20,
                        contain: false
                    });
                }
            }
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    document.getElementById('svgPreview').innerHTML = message.svgContent;
                    setTimeout(enablePanZoom, 100);
                } else if (message.command === 'error') {
                    alert('Error: ' + message.error);
                }
            });
        </script>
    </body>
    </html>
    `;
}
