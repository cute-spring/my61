import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { localRender } from './preview';

// This function remains the same
async function generatePlantUMLFromRequirement(requirement: string, history: string[], diagramType?: string): Promise<string> {
    // ... (no changes here)
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

            // Helper function to update the full UI
            const updateFullUI = async () => {
                panel.webview.html = getWebviewContent(chatHistory, currentPlantUML);
                const svg = await renderPlantUMLToSVG(currentPlantUML);
                panel.webview.postMessage({ command: 'updatePreview', svgContent: svg });
            };

            panel.webview.html = getWebviewContent(chatHistory, currentPlantUML);

            panel.webview.onDidReceiveMessage(async message => {
                switch (message.command) {
                    case 'sendRequirement': {
                        const userInput = message.text.trim();
                        if (!userInput) { return; }
                        chatHistory.push({ role: 'user', message: userInput });
                        // Show loading state if desired (optional)
                        panel.webview.html = getWebviewContent(chatHistory, currentPlantUML, true);
                        try {
                            const plantuml = await generatePlantUMLFromRequirement(userInput, chatHistory.map(h => h.message), message.diagramType || '');
                            currentPlantUML = plantuml;
                            chatHistory.push({ role: 'bot', message: plantuml });
                            await updateFullUI();
                        } catch (err: any) {
                            panel.webview.postMessage({ command: 'error', error: err.message || String(err) });
                        }
                        break;
                    }
                    case 'exportSVG': {
                        const fileUri = await vscode.window.showSaveDialog({
                            filters: { 'SVG Image': ['svg'] },
                            saveLabel: 'Export SVG'
                        });
                        if (fileUri) {
                            fs.writeFileSync(fileUri.fsPath, message.svgContent, 'utf-8');
                            vscode.window.showInformationMessage('SVG exported successfully!');
                        }
                        break;
                    }
                    case 'clearChat': {
                        chatHistory = [];
                        currentPlantUML = '@startuml\n\n@enduml';
                        await updateFullUI();
                        break;
                    }
                    // --- NEW: EXPORT CHAT LOGIC ---
                    case 'exportChat': {
                        const sessionData = {
                            version: 1,
                            chatHistory: chatHistory,
                            currentPlantUML: currentPlantUML
                        };
                        const fileUri = await vscode.window.showSaveDialog({
                            filters: { 'UML Chat Session': ['umlchat'] },
                            saveLabel: 'Save Session'
                        });
                        if (fileUri) {
                            fs.writeFileSync(fileUri.fsPath, JSON.stringify(sessionData, null, 2), 'utf-8');
                            vscode.window.showInformationMessage('Chat session saved successfully!');
                        }
                        break;
                    }
                    // --- NEW: IMPORT CHAT LOGIC ---
                    case 'importChat': {
                        const fileUris = await vscode.window.showOpenDialog({
                            canSelectMany: false,
                            filters: { 'UML Chat Session': ['umlchat'] },
                            openLabel: 'Load Session'
                        });
                        if (fileUris && fileUris.length > 0) {
                            try {
                                const content = fs.readFileSync(fileUris[0].fsPath, 'utf-8');
                                const data = JSON.parse(content);
                                // Basic validation
                                if (data && data.chatHistory && data.currentPlantUML) {
                                    chatHistory = data.chatHistory;
                                    currentPlantUML = data.currentPlantUML;
                                    await updateFullUI();
                                    vscode.window.showInformationMessage('Chat session loaded successfully!');
                                } else {
                                    throw new Error('Invalid or corrupted session file.');
                                }
                            } catch (e: any) {
                                vscode.window.showErrorMessage(`Failed to load session: ${e.message}`);
                            }
                        }
                        break;
                    }
                }
            }, undefined, context.subscriptions);
        })
    );
}

// This function remains the same
async function renderPlantUMLToSVG(plantuml: string): Promise<string> {
    // ... (no changes here)
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


// --- UPDATED: getWebviewContent ---
// I've added the new buttons and their corresponding JS handlers
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
            /* All CSS remains the same as the previous enhanced version */
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif; margin: 0; padding: 0; height: 100vh; }
            #container { display: flex; height: 100vh; }
            #leftPanel { width: 20vw; min-width: 320px; max-width: 900px; display: flex; flex-direction: column; height: 100vh; border-right: 1px solid #ccc; background: #fafbfc; resize: none; overflow: auto; position: relative; transition: width 0.1s; }
            #dragbar { width: 5px; cursor: ew-resize; background: #e0e0e0; height: 100vh; z-index: 10; }
            #rightPanel { flex: 1 1 0; display: flex; align-items: stretch; justify-content: stretch; background: #fff; min-width: 0; }
            #svgPreview { width: 100%; height: 98vh; overflow: auto; display: flex; align-items: center; justify-content: center; background: #fff; margin: auto; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 2px 8px #eee; }
            #svgPreview svg text { white-space: pre-wrap !important; word-break: break-all !important; }
            #chat { flex: 1 1 0; overflow-y: auto; background: #f5f5f5; padding: 10px; border-bottom: 1px solid #eee; min-height: 200px; max-height: 60vh; }
            .user { color: #333; }
            .bot { color: #007acc; }
            #uml { flex: 0 0 auto; background: #fff; border-bottom: 1px solid #eee; min-height: 120px; max-height: 200px; overflow-y: auto; padding: 8px; }
            #inputArea { flex: 0 0 auto; display: flex; flex-direction: column; padding: 10px; border-top: 1px solid #eee; background: #f9f9f9; }
            #requirementInput { width: 100%; box-sizing: border-box; min-height: 60px; max-height: 120px; padding: 8px; font-size: 1.1em; resize: vertical; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }
            #buttonRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .primary-actions, .secondary-actions { display: flex; align-items: center; gap: 8px; }
            .secondary-actions { margin-left: auto; }
            button, select { border-radius: 4px; border: 1px solid #ccc; background: #f5f5f5; padding: 6px 12px; font-size: 1em; transition: background 0.2s; cursor: pointer; outline: none; display: flex; align-items: center; gap: 6px; }
            button:hover, button:focus, select:hover, select:focus { background: #e0e0e0; border-color: #bdbdbd; }
            button svg { width: 16px; height: 16px; display: block; }
            button.primary { background: #007acc; color: #fff; border-color: #007acc; font-weight: 600; }
            button.primary:hover, button.primary:focus { background: #005fa3; border-color: #005fa3; }
            button.danger { background: #fff0f0; color: #d32f2f; border: 1px solid #d32f2f; }
            button.danger:hover, button.danger:focus { background: #d32f2f; color: #fff; }
            button.icon-only { padding: 6px; }
            #leftPanel.fullscreen { position: fixed; z-index: 1000; left: 0; top: 0; width: 100vw !important; max-width: 100vw !important; height: 100vh !important; background: #fafbfc; box-shadow: 0 0 10px #888; }
            #rightPanel.hide { display: none !important; }
            @media (max-width: 800px) { /* Adjusted breakpoint for more buttons */
                #buttonRow, .primary-actions, .secondary-actions { flex-direction: column; align-items: stretch; }
                .secondary-actions { margin-left: 0; }
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

                    <!-- UPDATED: Button Row with Import/Save -->
                    <div id="buttonRow">
                        <div class="primary-actions">
                             <button id="importBtn" title="Import a .umlchat session file" aria-label="Import Chat Session">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                <span>Import</span>
                            </button>
                            <select id="diagramType" title="Select Diagram Type">${diagramTypeOptions}</select>
                            <button id="sendBtn" class="primary" title="Send (Enter)" aria-label="Send Requirement">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                <span>Send</span>
                            </button>
                        </div>
                        <div class="secondary-actions">
                             <button id="saveChatBtn" title="Save current session to a .umlchat file" aria-label="Save Chat Session">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                <span>Save</span>
                            </button>
                            <button id="exportSVGBtn" title="Export diagram as SVG" aria-label="Export SVG">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                <span>Export SVG</span>
                            </button>
                            <button id="expandChatBtn" class="icon-only" title="Expand Chat Panel" aria-label="Expand or Collapse Chat Panel">
                                <!-- Icon will be set by JS -->
                            </button>
                            <button id="clearChatBtn" class="danger" title="Clear Chat History" aria-label="Clear Chat">
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

            // --- Elements ---
            const requirementInput = document.getElementById('requirementInput');
            const sendBtn = document.getElementById('sendBtn');
            const exportSVGBtn = document.getElementById('exportSVGBtn'); // Renamed from exportBtn
            const clearChatBtn = document.getElementById('clearChatBtn');
            const expandBtn = document.getElementById('expandChatBtn');
            const importBtn = document.getElementById('importBtn'); // NEW
            const saveChatBtn = document.getElementById('saveChatBtn'); // NEW

            const leftPanel = document.getElementById('leftPanel');
            const rightPanel = document.getElementById('rightPanel');

            // --- SVG Icons ---
            const expandIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
            const collapseIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="10" y1="14" x2="3" y2="21"/></svg>';

            // --- Event Listeners ---
            sendBtn.onclick = () => {
                const text = requirementInput.value;
                const diagramType = document.getElementById('diagramType').value;
                vscode.postMessage({ command: 'sendRequirement', text, diagramType });
                requirementInput.value = '';
            };

            requirementInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
            });

            exportSVGBtn.onclick = () => {
                const svgContent = document.getElementById('svgPreview').innerHTML;
                vscode.postMessage({ command: 'exportSVG', svgContent });
            };

            clearChatBtn.onclick = () => vscode.postMessage({ command: 'clearChat' });
            
            // NEW: Import/Save button handlers
            importBtn.onclick = () => vscode.postMessage({ command: 'importChat' });
            saveChatBtn.onclick = () => vscode.postMessage({ command: 'exportChat' });

            expandBtn.onclick = () => {
                const isFullscreen = leftPanel.classList.toggle('fullscreen');
                rightPanel.classList.toggle('hide', isFullscreen);
                expandBtn.innerHTML = isFullscreen ? collapseIcon : expandIcon;
                expandBtn.title = isFullscreen ? "Collapse Chat Panel" : "Expand Chat Panel";
                expandBtn.setAttribute('aria-label', isFullscreen ? "Collapse Chat Panel" : "Expand Chat Panel");
            };
            
            // Draggable Resizer & SVG Pan/Zoom scripts (same as before)
            // ... (no changes here)

            // --- VS Code Message Handling ---
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    document.getElementById('svgPreview').innerHTML = message.svgContent;
                    // ... enablePanZoom logic ...
                } else if (message.command === 'error') {
                    alert('Error: ' + message.error);
                }
            });

            // --- Initial State ---
            expandBtn.innerHTML = expandIcon;
        </script>
    </body>
    </html>`;
}