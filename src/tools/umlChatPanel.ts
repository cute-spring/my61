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

    // The rest of the function remains the same, only the returned string is updated.
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UML Chat Designer</title>
        <style>
            /* --- General Body and Layout --- */
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif; margin: 0; padding: 0; height: 100vh; }
            #container { display: flex; height: 100vh; }
            #leftPanel { width: 20vw; min-width: 320px; max-width: 900px; display: flex; flex-direction: column; height: 100vh; border-right: 1px solid #ccc; background: #fafbfc; resize: none; overflow: auto; position: relative; transition: width 0.1s; }
            #dragbar { width: 5px; cursor: ew-resize; background: #e0e0e0; height: 100vh; z-index: 10; }
            #rightPanel { flex: 1 1 0; display: flex; align-items: stretch; justify-content: stretch; background: #fff; min-width: 0; }
            #svgPreview { width: 100%; height: 98vh; overflow: auto; display: flex; align-items: center; justify-content: center; background: #fff; margin: auto; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 2px 8px #eee; }
            #svgPreview svg text { white-space: pre-wrap !important; word-break: break-all !important; }

            /* --- Left Panel Content --- */
            #chat { flex: 1 1 0; overflow-y: auto; background: #f5f5f5; padding: 10px; border-bottom: 1px solid #eee; min-height: 200px; max-height: 60vh; }
            .user { color: #333; }
            .bot { color: #007acc; }
            #uml { flex: 0 0 auto; background: #fff; border-bottom: 1px solid #eee; min-height: 120px; max-height: 200px; overflow-y: auto; padding: 8px; }

            /* --- Input Area & Actions --- */
            #inputArea { flex: 0 0 auto; display: flex; flex-direction: column; padding: 10px; border-top: 1px solid #eee; background: #f9f9f9; }
            #requirementInput { width: 100%; box-sizing: border-box; min-height: 60px; max-height: 120px; padding: 8px; font-size: 1.1em; resize: vertical; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }

            /* --- ENHANCED: Button Layout and Styling --- */
            #buttonRow {
                display: flex;
                align-items: center; /* Vertically center align all items in the row */
                gap: 8px;
                flex-wrap: wrap;
            }
            .primary-actions, .secondary-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .secondary-actions {
                margin-left: auto; /* This is the key change: pushes this group to the far right */
            }

            button, select {
                border-radius: 4px;
                border: 1px solid #ccc;
                background: #f5f5f5;
                padding: 6px 12px;
                font-size: 1em;
                transition: background 0.2s, border 0.2s, color 0.2s;
                cursor: pointer;
                outline: none;
                display: flex; /* Allow icon and text to align */
                align-items: center;
                gap: 6px; /* Space between icon and text */
            }
            button:hover, button:focus, select:hover, select:focus {
                background: #e0e0e0;
                border-color: #bdbdbd;
            }
            button svg {
                width: 16px; /* Slightly smaller icons for a cleaner look */
                height: 16px;
                display: block;
            }

            /* --- Button Variants --- */
            button.primary {
                background: #007acc;
                color: #fff;
                border-color: #007acc;
                font-weight: 600; /* Make primary action text bolder */
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
            button.icon-only {
                padding: 6px; /* Square padding for icon-only buttons */
            }

            /* --- Fullscreen & Responsive --- */
            #leftPanel.fullscreen { position: fixed; z-index: 1000; left: 0; top: 0; width: 100vw !important; max-width: 100vw !important; height: 100vh !important; background: #fafbfc; box-shadow: 0 0 10px #888; }
            #rightPanel.hide { display: none !important; }
            @media (max-width: 700px) {
                #buttonRow, .primary-actions, .secondary-actions {
                    flex-direction: column;
                    align-items: stretch;
                }
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

                    <!-- ENHANCED: Button Row HTML -->
                    <div id="buttonRow">
                        <div class="primary-actions">
                            <select id="diagramType" title="Select Diagram Type">${diagramTypeOptions}</select>
                            <button id="sendBtn" class="primary" title="Send (Enter)" aria-label="Send Requirement">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                <span>Send</span>
                            </button>
                        </div>
                        <div class="secondary-actions">
                            <button id="exportBtn" title="Export as SVG" aria-label="Export SVG">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                <span>Export</span>
                            </button>
                            <button id="expandChatBtn" class="icon-only" title="Expand Chat Panel" aria-label="Expand or Collapse Chat Panel">
                                <!-- Icon will be set by JS -->
                            </button>
                            <button id="clearChatBtn" class="danger" title="Clear Chat History" aria-label="Clear Chat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                                <span>Clear</span>
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
            const exportBtn = document.getElementById('exportBtn');
            const clearChatBtn = document.getElementById('clearChatBtn');
            const expandBtn = document.getElementById('expandChatBtn');
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

            requirementInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendBtn.click();
                }
            });

            exportBtn.onclick = () => {
                const svgContent = document.getElementById('svgPreview').innerHTML;
                vscode.postMessage({ command: 'exportSVG', svgContent });
            };

            clearChatBtn.onclick = () => {
                vscode.postMessage({ command: 'clearChat' });
            };

            // ENHANCED: Expand/collapse logic now also updates the title attribute
            expandBtn.onclick = () => {
                const isFullscreen = leftPanel.classList.toggle('fullscreen');
                rightPanel.classList.toggle('hide', isFullscreen);
                if (isFullscreen) {
                    expandBtn.innerHTML = collapseIcon;
                    expandBtn.title = "Collapse Chat Panel";
                    expandBtn.setAttribute('aria-label', "Collapse Chat Panel");
                } else {
                    expandBtn.innerHTML = expandIcon;
                    expandBtn.title = "Expand Chat Panel";
                    expandBtn.setAttribute('aria-label', "Expand Chat Panel");
                }
            };

            // --- Draggable Resizer ---
            const dragbar = document.getElementById('dragbar');
            let isDragging = false;
            dragbar.addEventListener('mousedown', (e) => { isDragging = true; document.body.style.cursor = 'ew-resize'; });
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const containerRect = document.getElementById('container').getBoundingClientRect();
                let newWidth = e.clientX - containerRect.left;
                if (newWidth < 320) newWidth = 320;
                if (newWidth > 900) newWidth = 900;
                leftPanel.style.width = newWidth + 'px';
            });
            document.addEventListener('mouseup', () => { isDragging = false; document.body.style.cursor = ''; });

            // --- SVG Pan & Zoom ---
            function enablePanZoom() {
                const svgEl = document.querySelector('#svgPreview svg');
                if (svgEl && window.svgPanZoom) {
                    svgEl.style.width = '100%';
                    svgEl.style.height = '100%';
                    svgEl.removeAttribute('viewBox'); // Important for svg-pan-zoom to take control
                    window.svgPanZoom(svgEl, { zoomEnabled: true, controlIconsEnabled: true, fit: true, center: true, minZoom: 0.1 });
                }
            }

            // --- VS Code Message Handling ---
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    document.getElementById('svgPreview').innerHTML = message.svgContent;
                    setTimeout(enablePanZoom, 100); // Allow DOM to update
                } else if (message.command === 'error') {
                    alert('Error: ' + message.error);
                }
            });

            // --- Initial State ---
            expandBtn.innerHTML = expandIcon; // Set initial icon
        </script>
    </body>
    </html>
    `;
}