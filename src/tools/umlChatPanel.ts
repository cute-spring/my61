import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import { trackUsage } from '../analytics';

// THIS IS THE CORRECTED LINE.
// It assumes you have a `preview.ts` file in the same directory with a `localRender` export.
import { localRender } from './preview';

// Get current PlantUML configuration for display (synchronous for UI)
function getCurrentPlantUMLConfig(): { layoutEngine: string, dotPath: string | null, displayName: string, icon: string, isActual: boolean } {
    const workspaceConfig = vscode.workspace.getConfiguration('plantuml');
    const configuredEngine = workspaceConfig.get<string>('layoutEngine', 'dot');
    const dotPath = workspaceConfig.get<string>('dotPath') || null;
    
    // For UI display, show configured engine with warning if we suspect issues
    let actualEngine = configuredEngine;
    let isActual = true;
    
    // Simple heuristic: if DOT is configured but we're on a system where it's commonly missing
    if (configuredEngine === 'dot' && !dotPath) {
        // Could check for common DOT installation issues, but for now assume it works
        isActual = true;
    }
    
    let displayName: string;
    let icon: string;
    
    if (actualEngine === 'smetana') {
        displayName = isActual ? 'Smetana (Pure Java)' : 'Smetana (Auto-fallback)';
        icon = isActual ? '☕' : '⚠️';
    } else {
        displayName = dotPath ? 'DOT (Custom Path)' : 'DOT (System Path)';
        icon = '🔧';
    }
    
    return { layoutEngine: actualEngine, dotPath, displayName, icon, isActual };
}

// Remove the async verification function from here since it's complex for UI use


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
            `You are an expert software architect and technical writer.\nFirst, briefly explain the user's system, question, or process in 2-3 sentences.\nThen, output the corresponding PlantUML code (and only valid PlantUML code) for the described system or process.\nIf the user provides an update, modify the previous diagram and explanation accordingly.\n${typeInstruction}\n\nIMPORTANT: You MUST always include the diagram type in your response. Format your response EXACTLY as follows:\n\nExplanation:\n<your explanation here>\n\nDiagram Type: <EXACTLY one of: class, sequence, activity, usecase, state, component, deployment>\n\n@startuml\n<PlantUML code here>\n@enduml\n`
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

// Extract diagram type from LLM response - LLM is forced to provide this
function extractDiagramTypeFromResponse(response: string): string {
    const diagramTypeMatch = response.match(/Diagram Type:\s*([^\n\r]+)/i);
    if (diagramTypeMatch && diagramTypeMatch[1]) {
        const type = diagramTypeMatch[1].trim().toLowerCase();
        // Normalize to exact supported types
        if (type === 'class' || type.includes('class')) { return 'class'; }
        if (type === 'sequence' || type.includes('sequence')) { return 'sequence'; }
        if (type === 'activity' || type.includes('activity')) { return 'activity'; }
        if (type === 'usecase' || type === 'use case' || type.includes('usecase') || type.includes('use case')) { return 'usecase'; }
        if (type === 'state' || type.includes('state')) { return 'state'; }
        if (type === 'component' || type.includes('component')) { return 'component'; }
        if (type === 'deployment' || type.includes('deployment')) { return 'deployment'; }
    }
    // This should rarely happen since LLM is forced to provide the type
    console.warn('LLM did not provide a valid diagram type, this should not happen with the new prompt');
    return 'unknown';
}

// LLM is now forced to provide diagram type, so no backup detection needed

// Add debounce utility
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timer: NodeJS.Timeout | undefined;
    return function(this: any, ...args: any[]) {
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(() => fn.apply(this, args), delay);
    } as T;
}

export function activateUMLChatPanel(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.umlChatPanel', async () => {
            trackUsage('uml.chatPanel', 'open');
            
            const panel = vscode.window.createWebviewPanel(
                'umlChatPanel',
                'UML Chat Designer',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );

            // Get local URI for svg-pan-zoom - using path.join for cross-platform compatibility
            const svgPanZoomUri = panel.webview.asWebviewUri(vscode.Uri.file(
                path.join(context.extensionPath, 'src', 'tools', 'ui', 'js', 'svg-pan-zoom.min.js')
            ));

            let chatHistory: { role: 'user' | 'bot', message: string }[] = [];
            let currentPlantUML = '@startuml\n\n@enduml';
            let lastDiagramType: string = '';

            // Helper to generate chat HTML only
            function getChatHtml(chatHistory: { role: 'user' | 'bot', message: string }[]): string {
                const lastBotMessageIndex = chatHistory.map(h => h.role).lastIndexOf('bot');
                return chatHistory.map((h, index) => {
                    const messageContent = `<pre style="white-space: pre-wrap; word-break: break-word;">${h.message}</pre>`;
                    if (h.role === 'bot') {
                        const isActive = index === lastBotMessageIndex;
                        return `\n                <div class="bot-message ${isActive ? 'active-message' : ''}" onclick="handleBotMessageClick(this)">\n                    <b>Bot:</b> ${messageContent}\n                </div>`;
                    }
                    // Add edit button for user messages
                    return `<div class="user" data-index="${index}"><b>You:</b> ${messageContent} <button class='edit-user-msg-btn' title='Edit and resend'>✏️</button></div>`;
                }).join('');
            }

            // Debounced render function
            const debouncedRender = debounce(async (plantUMLToRender: string) => {
                const svg = await renderPlantUMLToSVG(plantUMLToRender);
                panel.webview.postMessage({ command: 'updatePreview', svgContent: svg });
            }, 300);

            // Initial UI load
            panel.webview.html = getWebviewContent(chatHistory, currentPlantUML, false, svgPanZoomUri);

            // Helper to update chat area only
            function updateChatInWebview() {
                panel.webview.postMessage({ command: 'updateChat', chatHtml: getChatHtml(chatHistory) });
            }

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(async message => {
                switch (message.command) {
                    case 'sendRequirement': {
                        trackUsage('uml.chatPanel', 'sendMessage', { diagramType: message.diagramType });
                        const userInput = message.text.trim();
                        if (!userInput) { return; }
                        chatHistory.push({ role: 'user', message: userInput });
                        // Update lastDiagramType if user selected a new one
                        lastDiagramType = message.diagramType || lastDiagramType || '';
                        // Add loading message
                        chatHistory.push({ role: 'bot', message: 'Generating diagram, please wait...' });
                        updateChatInWebview();
                        try {
                            const plantumlResponse = await generatePlantUMLFromRequirement(userInput, chatHistory.filter(h => h.role === 'user').map(h => h.message), lastDiagramType);
                            // Remove the loading message
                            if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') {
                                chatHistory.pop();
                            }
                            currentPlantUML = plantumlResponse;
                            // Extract the diagram type from the LLM response
                            const llmDiagramType = extractDiagramTypeFromResponse(plantumlResponse);
                            let diagramTypeLabel = '';
                            
                            if (lastDiagramType) {
                                // User selected a specific type
                                diagramTypeLabel = `[${lastDiagramType.charAt(0).toUpperCase() + lastDiagramType.slice(1)} Diagram]\n\n`;
                            } else {
                                // Auto-detection mode - use LLM-provided type
                                if (llmDiagramType !== 'unknown') {
                                    diagramTypeLabel = `[Auto-detected: ${llmDiagramType.charAt(0).toUpperCase() + llmDiagramType.slice(1)} Diagram]\n\n`;
                                } else {
                                    // This should not happen with the new strict prompt
                                    diagramTypeLabel = `[Auto-detected Diagram]\n\n`;
                                }
                            }
                            
                            chatHistory.push({ role: 'bot', message: diagramTypeLabel + plantumlResponse });
                            updateChatInWebview();
                            debouncedRender(currentPlantUML); // Debounced SVG update
                            setTimeout(() => updateChatInWebview(), 200);
                        } catch (err: any) {
                            if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') {
                                chatHistory.pop();
                            }
                            panel.webview.postMessage({ command: 'error', error: err.message || String(err) });
                            updateChatInWebview();
                            setTimeout(() => updateChatInWebview(), 200);
                        }
                        break;
                    }
                    case 'renderSpecificUML': {
                        const svg = await renderPlantUMLToSVG(message.umlCode);
                        panel.webview.postMessage({ command: 'updatePreview', svgContent: svg });
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
                        updateChatInWebview();
                        debouncedRender(currentPlantUML);
                        break;
                    }
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
                            await fsp.writeFile(fileUri.fsPath, JSON.stringify(sessionData, null, 2), 'utf-8');
                            vscode.window.showInformationMessage('Chat session saved successfully!');
                        }
                        break;
                    }
                    case 'importChat': {
                        const fileUris = await vscode.window.showOpenDialog({
                            canSelectMany: false,
                            filters: { 'UML Chat Session': ['umlchat'] },
                            openLabel: 'Load Session'
                        });
                        if (fileUris && fileUris.length > 0) {
                            try {
                                const content = await fsp.readFile(fileUris[0].fsPath, 'utf-8');
                                const data = JSON.parse(content);
                                if (data && data.chatHistory && data.currentPlantUML) {
                                    chatHistory = data.chatHistory;
                                    currentPlantUML = data.currentPlantUML;
                                    // Try to infer lastDiagramType from last bot message if possible
                                    lastDiagramType = data.lastDiagramType || lastDiagramType || '';
                                    panel.webview.html = getWebviewContent(chatHistory, currentPlantUML, false, svgPanZoomUri);
                                    setTimeout(() => {
                                        updateChatInWebview();
                                        debouncedRender(currentPlantUML);
                                    }, 300);
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
                    case 'editAndResendUserMsg': {
                        const { index, newText } = message;
                        if (typeof index === 'number' && typeof newText === 'string') {
                            // Update the user message in chatHistory
                            chatHistory[index].message = newText;
                            // Remove all messages after this user message (including any bot responses)
                            chatHistory = chatHistory.slice(0, index + 1);
                            updateChatInWebview();
                            // Add loading message
                            chatHistory.push({ role: 'bot', message: 'Generating diagram, please wait...' });
                            updateChatInWebview();
                            try {
                                // Use lastDiagramType for follow-up requests
                                const plantumlResponse = await generatePlantUMLFromRequirement(newText, chatHistory.filter(h => h.role === 'user').map(h => h.message), lastDiagramType);
                                if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') {
                                    chatHistory.pop();
                                }
                                currentPlantUML = plantumlResponse;
                                // Extract the diagram type from the LLM response for edited messages too
                                const llmDiagramType = extractDiagramTypeFromResponse(plantumlResponse);
                                let diagramTypeLabel = '';
                                
                                if (lastDiagramType) {
                                    // User selected a specific type
                                    diagramTypeLabel = `[${lastDiagramType.charAt(0).toUpperCase() + lastDiagramType.slice(1)} Diagram]\n\n`;
                                } else {
                                    // Auto-detection mode - use LLM-provided type
                                    if (llmDiagramType !== 'unknown') {
                                        diagramTypeLabel = `[Auto-detected: ${llmDiagramType.charAt(0).toUpperCase() + llmDiagramType.slice(1)} Diagram]\n\n`;
                                    } else {
                                        // This should not happen with the new strict prompt
                                        diagramTypeLabel = `[Auto-detected Diagram]\n\n`;
                                    }
                                }
                                
                                chatHistory.push({ role: 'bot', message: diagramTypeLabel + plantumlResponse });
                                updateChatInWebview();
                                debouncedRender(currentPlantUML);
                                setTimeout(() => updateChatInWebview(), 200);
                            } catch (err: any) {
                                if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') {
                                    chatHistory.pop();
                                }
                                panel.webview.postMessage({ command: 'error', error: err.message || String(err) });
                                updateChatInWebview();
                                setTimeout(() => updateChatInWebview(), 200);
                            }
                        }
                        break;
                    }
                    case 'configurePlantUML': {
                        // Open the PlantUML configuration command
                        vscode.commands.executeCommand('copilotTools.configurePlantUML').then(() => {
                            // After configuration, refresh the webview content to show the updated layout indicator
                            panel.webview.html = getWebviewContent(chatHistory, currentPlantUML, false, svgPanZoomUri);
                            setTimeout(() => {
                                updateChatInWebview();
                                if (currentPlantUML.trim()) {
                                    debouncedRender(currentPlantUML);
                                }
                            }, 300);
                        });
                        break;
                    }
                }
            }, undefined, context.subscriptions);
        })
    );
}

// Render PlantUML to SVG using the local renderer
async function renderPlantUMLToSVG(plantuml: string): Promise<string> {
    const diagram = {
        parentUri: vscode.Uri.file('inmemory'),
        dir: '',
        pageCount: 1,
        content: plantuml,
        path: '',
        name: 'inmemory.svg'
    };
    try {
        const task = localRender.render(diagram, 'svg');
        const buffers = await task.promise;
        if (buffers && buffers.length > 0) {
            let svgContent = buffers[0].toString('utf-8');
            
            // Post
            // Ensure preserveAspectRatio is set correctly
            if (svgContent.includes('<svg') && !svgContent.includes('preserveAspectRatio')) {
                svgContent = svgContent.replace(
                    /<svg([^>]*)>/,
                    '<svg$1 preserveAspectRatio="xMidYMid meet">'
                );
            }
            
            // Log SVG dimensions for debugging on Windows
            const widthMatch = svgContent.match(/width="([^"]+)"/);
            const heightMatch = svgContent.match(/height="([^"]+)"/);
            const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
            console.log('Generated SVG dimensions:', {
                width: widthMatch ? widthMatch[1] : 'none',
                height: heightMatch ? heightMatch[1] : 'none',
                viewBox: viewBoxMatch ? viewBoxMatch[1] : 'none'
            });
            
            return svgContent;
        }
        return '<svg><!-- No content --></svg>';
    } catch (err: any) {
        return `<svg><!-- Error: ${err.message || String(err)} --></svg>`;
    }
}

function getWebviewContent(chatHistory: { role: 'user' | 'bot', message: string }[], plantUML: string, loading = false, svgPanZoomUri?: vscode.Uri): string {
    const lastBotMessageIndex = chatHistory.map(h => h.role).lastIndexOf('bot');

    const chatHtml = chatHistory.map((h, index) => {
        const messageContent = `<pre style="white-space: pre-wrap; word-break: break-all;">${h.message}</pre>`;
        if (h.role === 'bot') {
            const isActive = index === lastBotMessageIndex;
            const isLoading = h.message === 'Generating diagram, please wait...';
            return `\n                <div class="bot-message ${isActive ? 'active-message' : ''}${isLoading ? ' loading-message' : ''}" onclick="handleBotMessageClick(this)">\n                    <b>Bot:</b> ${messageContent}\n                </div>`;
        }
        // Add edit button for user messages
        return `<div class="user" data-index="${index}"><b>You:</b> ${messageContent} <button class='edit-user-msg-btn' title='Edit and resend'>✏️</button></div>`;
    }).join('');
    
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

    // Get current PlantUML configuration for display
    const plantUMLConfig = getCurrentPlantUMLConfig();
    const layoutIndicator = `
        <div style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 10px; background: ${plantUMLConfig.layoutEngine === 'smetana' ? 'linear-gradient(135deg, #e8f5e8, #d4edda)' : 'linear-gradient(135deg, #e3f2fd, #bbdefb)'}; border: 2px solid ${plantUMLConfig.layoutEngine === 'smetana' ? '#28a745' : '#007acc'}; border-radius: 6px; font-size: 0.95em; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <span style="margin-right: 8px; font-size: 1.3em;">${plantUMLConfig.icon}</span>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #333; margin-bottom: 2px;">PlantUML Layout Engine</div>
                <div style="color: ${plantUMLConfig.layoutEngine === 'smetana' ? '#155724' : '#004085'}; font-weight: 700; font-size: 1.05em;">${plantUMLConfig.displayName}</div>
            </div>
            <button id="configureLayoutBtn" style="background: ${plantUMLConfig.layoutEngine === 'smetana' ? '#28a745' : '#007acc'}; color: white; border: none; border-radius: 4px; padding: 6px 10px; font-size: 0.85em; cursor: pointer; transition: all 0.2s; font-weight: 600;" title="Configure PlantUML Layout Engine" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">⚙️ Config</button>
        </div>
    `;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UML Chat Designer</title>
        <style>
            /* --- General Body and Layout --- */
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif; 
                margin: 0; 
                padding: 0; 
                height: 100vh; 
                /* Windows-specific font smoothing */
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeLegibility;
            }
            #container { display: flex; height: 100vh; }
            #leftPanel { 
                width: 20vw; 
                min-width: 320px; 
                max-width: 900px; 
                display: flex; 
                flex-direction: column; 
                height: 100vh; 
                border-right: 1px solid #ccc; 
                background: #fafbfc; 
                resize: none; 
                overflow: auto; 
                position: relative; 
                transition: width 0.1s;
                /* Windows scrollbar styling */
                scrollbar-width: thin;
                scrollbar-color: #c1c1c1 #f1f1f1;
            }
            #leftPanel::-webkit-scrollbar { width: 12px; }
            #leftPanel::-webkit-scrollbar-track { background: #f1f1f1; }
            #leftPanel::-webkit-scrollbar-thumb { 
                background: #c1c1c1; 
                border-radius: 6px; 
                border: 2px solid #f1f1f1;
            }
            #leftPanel::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
            #dragbar { width: 5px; cursor: ew-resize; background: #e0e0e0; height: 100vh; z-index: 10; }
            #rightPanel { flex: 1 1 0; display: block; background: #fff; min-width: 0; position: relative; width: 100%; height: 100vh; }
            #svgPreview { 
                width: 100%; 
                height: 100vh; 
                overflow: auto; 
                background: #fff; 
                /* Remove borders that take up space */
                border: none;
                border-radius: 0; 
                box-shadow: none;
                /* Windows high-DPI fixes */
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                /* Ensure container doesn't force aspect ratio changes */
                box-sizing: border-box;
                /* Fix for zoomed content visibility */
                position: relative;
                /* Remove flex centering that prevents scrolling of zoomed content */
                display: block;
                /* Enable smooth scrolling for better UX */
                scroll-behavior: smooth;
                /* Ensure scrollbars are always available when needed */
                overflow-x: auto;
                overflow-y: auto;
                /* Remove padding to maximize display area */
                padding: 0;
                margin: 0;
                /* Style scrollbars for better Windows compatibility */
                scrollbar-width: thin;
                scrollbar-color: #c1c1c1 #f1f1f1;
            }
            #svgPreview::-webkit-scrollbar { 
                width: 12px; 
                height: 12px; 
            }
            #svgPreview::-webkit-scrollbar-track { 
                background: #f1f1f1; 
                border-radius: 6px; 
            }
            #svgPreview::-webkit-scrollbar-thumb { 
                background: #c1c1c1; 
                border-radius: 6px; 
                border: 2px solid #f1f1f1; 
            }
            #svgPreview::-webkit-scrollbar-thumb:hover { 
                background: #a8a8a8; 
            }
            #svgPreview::-webkit-scrollbar-corner { 
                background: #f1f1f1; 
            }
            #svgPreview svg { 
                /* Remove forced word-break that can affect SVG rendering */
                white-space: normal !important; 
                word-break: normal !important;
                /* Windows SVG rendering fixes */
                shape-rendering: geometricPrecision;
                text-rendering: geometricPrecision;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                /* Prevent blurriness on Windows high-DPI displays */
                transform: translateZ(0);
                -webkit-transform: translateZ(0);
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
                /* SVG sizing for maximum display area usage */
                display: block;
                /* Remove margin to use full space */
                margin: 0;
                /* Allow SVG to expand to use available space */
                min-width: 100%;
                min-height: 100%;
                /* Set maximum size to container bounds */
                max-width: 100vw;
                max-height: 100vh;
                /* Use full container width and height initially */
                width: 100%;
                height: auto;
                /* Ensure proper positioning for zoom operations */
                position: relative;
                /* Center the SVG content within its bounds */
                transform-origin: center center;
                /* Ensure SVG uses all available space */
                object-fit: contain;
            }

            /* --- Custom Zoom Controls --- */
            .zoom-controls {
                position: absolute !important;
                bottom: 20px !important;
                right: 20px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
                z-index: 100 !important;
            }
            .zoom-btn {
                background: rgba(255, 255, 255, 0.9) !important;
                border: 1px solid #ccc !important;
                border-radius: 6px !important;
                padding: 8px !important;
                cursor: pointer !important;
                font-size: 16px !important;
                font-weight: bold !important;
                color: #333 !important;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
                transition: all 0.2s ease !important;
                width: 36px !important;
                height: 36px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                backdrop-filter: blur(4px) !important;
            }
            .zoom-btn:hover {
                background: rgba(255, 255, 255, 1) !important;
                border-color: #007acc !important;
                color: #007acc !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
            }
            .zoom-btn:active {
                transform: translateY(0) !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            }

            /* --- Left Panel Content --- */
            /* --- Left Panel Content --- */
            #chat {
                flex: 1 1 0;
                overflow-y: auto;
                background: #f5f5f5;
                padding: 10px;
                border-bottom: 1px solid #eee;
                min-height: 200px;
                /* max-height 属性已被移除 */
            }
            .user, .bot-message { padding: 8px; margin-bottom: 8px; border-radius: 6px; }
            .user { 
                background-color: #e9e9e9; 
                position: relative; 
                padding-bottom: 12px; 
            }
            .bot-message { background-color: #dceaf5; border: 2px solid transparent; transition: border-color 0.2s, background-color 0.2s; }
            .bot-message:hover { cursor: pointer; background-color: #cde0f0; }
            .bot-message.active-message { border-color: #007acc; background-color: #cde0f0; }
            
            /* --- Diagram Type Label Styling --- */
            .bot-message pre {
                position: relative;
            }
            .bot-message pre::before {
                content: '';
                display: block;
                margin-bottom: 8px;
            }
            
            #uml { flex: 0 0 auto; background: #fff; border-bottom: 1px solid #eee; min-height: 120px; max-height: 200px; overflow-y: auto; padding: 8px; }

            /* --- Input Area & Actions --- */
            /* --- Input Area & Actions --- */
            #inputArea { 
                flex: 0 0 auto; 
                display: flex; 
                flex-direction: column; 
                padding: 10px 10px 4px 10px; /* UPDATED: Reduced bottom padding */
                border-top: 1px solid #eee; 
                background: #f9f9f9; 
            }
            #requirementInput { width: 100%; box-sizing: border-box; min-height: 60px; max-height: 120px; padding: 8px; font-size: 1.1em; resize: vertical; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }
            
            /* --- UPDATED: Button Layout and Styling --- */
            #buttonRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .primary-actions { display: flex; align-items: center; gap: 8px; }
            .utility-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
            
            button, select { border-radius: 4px; border: 1px solid #ccc; background: #f5f5f5; padding: 6px 12px; font-size: 1em; transition: background 0.2s, border 0.2s, color 0.2s; cursor: pointer; outline: none; display: flex; align-items: center; gap: 6px; }
            button:hover, button:focus, select:hover, select:focus { background: #e0e0e0; border-color: #bdbdbd; }
            button svg { width: 16px !important; height: 16px !important; display: block !important; flex-shrink: 0 !important; }
            button.primary { background: #007acc; color: #fff; border-color: #007acc; font-weight: 600; }
            button.primary:hover, button.primary:focus { background: #005fa3; border-color: #005fa3; }
            button.danger { background: #fff0f0; color: #d32f2f; border: 1px solid #d32f2f; }
            button.danger:hover, button.danger:focus { background: #d32f2f; color: #fff; }
            button.icon-only { padding: 8px !important; min-width: 36px !important; min-height: 36px !important; justify-content: center !important; }

            /* --- Edit Message Button Styling --- */
            .edit-user-msg-btn {
                background: #f0f8ff !important;
                color: #0066cc !important;
                border: 1px solid #0066cc !important;
                padding: 4px 8px !important;
                font-size: 0.8em !important;
                border-radius: 3px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                position: absolute !important;
                bottom: 4px !important;
                right: 8px !important;
                z-index: 10 !important;
            }
            .edit-user-msg-btn:hover {
                background: #0066cc !important;
                color: #fff !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 4px rgba(0,102,204,0.3) !important;
            }

            /* --- Edit Mode Buttons (Resend/Cancel) --- */
            .edit-mode-buttons {
                display: flex !important;
                gap: 6px !important;
                margin-top: 8px !important;
                align-items: center !important;
            }
            .resend-btn {
                background: #28a745 !important;
                color: #fff !important;
                border: 1px solid #28a745 !important;
                padding: 6px 12px !important;
                font-size: 0.9em !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-weight: 500 !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
            .resend-btn:hover, .resend-btn:focus {
                background: #218838 !important;
                border-color: #1e7e34 !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 6px rgba(40,167,69,0.3) !important;
            }
            .resend-btn::before {
                content: '🚀' !important;
                font-size: 0.85em !important;
            }
            .cancel-btn {
                background: #6c757d !important;
                color: #fff !important;
                border: 1px solid #6c757d !important;
                padding: 6px 12px !important;
                font-size: 0.9em !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-weight: 500 !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
            .cancel-btn:hover, .cancel-btn:focus {
                background: #5a6268 !important;
                border-color: #545b62 !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 6px rgba(108,117,125,0.3) !important;
            }
            .cancel-btn::before {
                content: '✕' !important;
                font-size: 0.85em !important;
            }

            /* --- Edit Mode Textarea Styling --- */
            .edit-mode-textarea {
                width: 100% !important;
                min-height: 60px !important;
                margin-top: 6px !important;
                padding: 8px !important;
                font-size: 1em !important;
                font-family: inherit !important;
                border: 2px solid #007acc !important;
                border-radius: 4px !important;
                resize: vertical !important;
                background: #fff !important;
                transition: border-color 0.2s ease !important;
                box-sizing: border-box !important;
            }
            .edit-mode-textarea:focus {
                outline: none !important;
                border-color: #0056b3 !important;
                box-shadow: 0 0 0 3px rgba(0,123,255,0.1) !important;
            }

            /* --- NEW: Dropdown Menu for 'More Actions' --- */
            .dropdown { position: relative; display: inline-block; }
            .dropdown-content {
                display: none;
                position: absolute;
                bottom: calc(100% + 5px); /* Position above the button with a 5px gap */
                right: 0;
                background-color: #ffffff;
                min-width: 180px;
                box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                border: 1px solid #ccc;
                border-radius: 6px;
                z-index: 100;
                padding: 4px;
                overflow: hidden;
            }
            .dropdown-content button {
                color: black;
                padding: 8px 12px;
                text-decoration: none;
                display: flex;
                width: 100%;
                text-align: left;
                background: none;
                border: none;
                border-radius: 4px;
            }
            .dropdown-content button:hover { background-color: #f1f1f1; }
            .dropdown-content button.danger:hover { background-color: #d32f2f; color: #fff; }
            .show { display: block; }

            /* --- Fullscreen & Responsive --- */
            #leftPanel.fullscreen { position: fixed; z-index: 1000; left: 0; top: 0; width: 100vw !important; max-width: 100vw !important; height: 100vh !important; background: #fafbfc; box-shadow: 0 0 10px #888; }
            #rightPanel.hide { display: none !important; }

            /* --- NEW: Loading Message Style --- */
            .loading-message { font-style: italic; color: #888; background: #f5f5f5 !important; border-style: dashed !important; }
        </style>
    </head>
    <body>
        <div id="container">
            <div id="leftPanel">
                <div id="chat">${chatHtml}</div>
                <div id="inputArea" style="flex: 0 0 auto; display: flex; flex-direction: column; padding: 10px; border-top: 1px solid #eee; background: #f9f9f9;">
                    ${layoutIndicator}
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <label for="diagramType" style="margin-right: 8px; font-weight: 500;">Diagram Type:</label>
                        <select id="diagramType" title="Select Diagram Type">${diagramTypeOptions}</select>
                    </div>
                    <textarea id="requirementInput" placeholder="Describe your UML requirement..."></textarea>
                    <div id="buttonRow">
                        <div class="primary-actions">
                            <button id="sendBtn" class="primary" title="Send (Enter)" aria-label="Send Requirement">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                <span>Send</span>
                            </button>
                        </div>
                        <div class="utility-actions">
                            <button id="expandChatBtn" class="icon-only" title="Expand Chat Panel" aria-label="Expand or Collapse Chat Panel">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                            </button>
                            <div class="dropdown">                            <button id="moreActionsBtn" class="icon-only" title="More Actions">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                            </button>
                                <div id="moreActionsDropdown" class="dropdown-content">
                                    <button id="saveChatBtn" title="Save current session to a .umlchat file" aria-label="Save Chat Session">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke
            <div id="dragbar"></div>
            <div id="rightPanel">
                <div id="svgPreview"></div>
                <div class="zoom-controls">
                    <button class="zoom-btn" id="zoomInBtn" title="Zoom In">+</button>
                    <button class="zoom-btn" id="zoomOutBtn" title="Zoom Out">−</button>
                    <button class="zoom-btn" id="zoomResetBtn" title="Reset Zoom">⌂</button>
                </div>
            </div>
        </div>
        <script src="${svgPanZoomUri}"></script>
        <script>
            const vscode = acquireVsCodeApi();

            // --- Elements ---
            const requirementInput = document.getElementById('requirementInput');
            const sendBtn = document.getElementById('sendBtn');
            const exportSVGBtn = document.getElementById('exportSVGBtn');
            const clearChatBtn = document.getElementById('clearChatBtn');
            const expandBtn = document.getElementById('expandChatBtn');
            const importBtn = document.getElementById('importBtn');
            const saveChatBtn = document.getElementById('saveChatBtn');
            const moreActionsBtn = document.getElementById('moreActionsBtn');
            const moreActionsDropdown = document.getElementById('moreActionsDropdown');
            const configureLayoutBtn = document.getElementById('configureLayoutBtn');
            const leftPanel = document.getElementById('leftPanel');
            const rightPanel = document.getElementById('rightPanel');
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const zoomResetBtn = document.getElementById('zoomResetBtn');

            // --- Click handler for historical bot messages ---
            function handleBotMessageClick(element) {
                document.querySelectorAll('.bot-message').forEach(el => el.classList.remove('active-message'));
                element.classList.add('active-message');
                const messageText = element.querySelector('pre').textContent;
                const umlRegex = /@startuml([\\s\\S]*?)@enduml/;
                const match = messageText.match(umlRegex);
                if (match && match[0]) {
                    const umlCode = match[0];
                    vscode.postMessage({ command: 'renderSpecificUML', umlCode: umlCode });
                    // Try to find UML element if it exists, otherwise skip
                    const umlElement = document.querySelector('#uml pre');
                    if (umlElement) {
                        umlElement.textContent = umlCode;
                    }
                }
            }

            // --- Dropdown Menu Logic ---
            moreActionsBtn.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent the window click listener from firing immediately
                moreActionsDropdown.classList.toggle('show');
            });
            window.addEventListener('click', (event) => {
                if (!moreActionsBtn.contains(event.target)) {
                    if (moreActionsDropdown.classList.contains('show')) {
                        moreActionsDropdown.classList.remove('show');
                    }
                }
            });

            // --- Event Listeners with Windows compatibility ---
            sendBtn.onclick = () => {
                vscode.postMessage({ command: 'sendRequirement', text: requirementInput.value, diagramType: document.getElementById('diagramType').value });
                requirementInput.value = '';
            };
            
            // Windows-compatible keyboard handling
            requirementInput.addEventListener('keydown', (e) => {
                // Standard Enter behavior
                if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    sendBtn.click(); 
                }
                // Windows-specific: Ctrl+Enter as alternative
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    sendBtn.click();
                }
                // Tab handling for Windows accessibility
                if (e.key === 'Tab') {
                    // Let default tab behavior work
                    return;
                }
            });
            
            // Configure layout engine button
            configureLayoutBtn?.addEventListener('click', () => {
                vscode.postMessage({ command: 'configurePlantUML' });
            });
            
            // Windows keyboard shortcuts for zoom
            document.addEventListener('keydown', (e) => {
                // Only activate when not typing in input fields
                if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
                
                if (e.ctrlKey || e.metaKey) {
                    switch(e.key) {
                        case '+':
                        case '=':
                            e.preventDefault();
                            if (zoomInBtn) zoomInBtn.click();
                            break;
                        case '-':
                            e.preventDefault();
                            if (zoomOutBtn) zoomOutBtn.click();
                            break;
                        case '0':
                            e.preventDefault();
                            if (zoomResetBtn) zoomResetBtn.click();
                            break;
                    }
                }
            });
            exportSVGBtn.onclick = () => vscode.postMessage({ command: 'exportSVG', svgContent: document.getElementById('svgPreview').innerHTML });
            clearChatBtn.onclick = () => vscode.postMessage({ command: 'clearChat' });
            importBtn.onclick = () => vscode.postMessage({ command: 'importChat' });
            saveChatBtn.onclick = () => vscode.postMessage({ command: 'exportChat' });
            expandBtn.onclick = () => {
                const isFullscreen = leftPanel.classList.toggle('fullscreen');
                rightPanel.classList.toggle('hide', isFullscreen);
                
                // Update the expand button icon
                if (isFullscreen) {
                    expandBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="10" y1="14" x2="3" y2="21"/></svg>';
                    expandBtn.title = "Collapse Chat Panel";
                } else {
                    expandBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
                    expandBtn.title = "Expand Chat Panel";
                }
            };

            // --- Dragbar for resizing with Windows compatibility ---
            const dragbar = document.getElementById('dragbar');
            let isDragging = false;
            
            // Windows-compatible drag handling
            const startDrag = (e) => {
                isDragging = true;
                document.body.style.cursor = 'ew-resize';
                document.body.style.userSelect = 'none'; // Prevent text selection on Windows
                e.preventDefault();
                e.stopPropagation();
            };
            
            const handleDrag = (e) => {
                if (!isDragging) return;
                const containerRect = document.getElementById('container').getBoundingClientRect();
                const newWidth = Math.max(320, Math.min(900, e.clientX - containerRect.left));
                leftPanel.style.width = newWidth + 'px';
                e.preventDefault();
                e.stopPropagation();
            };
            
            const endDrag = () => {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
            
            // Mouse events
            dragbar.addEventListener('mousedown', startDrag);
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', endDrag);
            
            // Touch events for Windows touch devices
            dragbar.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
            document.addEventListener('touchmove', (e) => handleDrag(e.touches[0]));
            document.addEventListener('touchend', endDrag);

            // --- SVG Pan & Zoom with Windows compatibility ---
            let panZoomInstance;
            function enablePanZoom() {
                try {
                    if(panZoomInstance) { 
                        panZoomInstance.destroy(); 
                        panZoomInstance = null;
                    }
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (svgEl && window.svgPanZoom) {
                        // Get the container for proper sizing
                        const container = document.getElementById('svgPreview');
                        
                        // Set initial SVG properties for maximum space usage
                        svgEl.style.display = 'block';
                        svgEl.style.margin = '0';
                        
                        // Get container dimensions for optimal sizing
                        const containerWidth = container ? container.clientWidth : window.innerWidth;
                        const containerHeight = container ? container.clientHeight : window.innerHeight;
                        
                        // Preserve original dimensions and aspect ratio
                        const svgViewBox = svgEl.getAttribute('viewBox');
                        const svgWidth = svgEl.getAttribute('width');
                        const svgHeight = svgEl.getAttribute('height');
                        
                        // Set preserveAspectRatio to maintain aspect ratio during scaling
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        
                        // Configure sizing to use maximum available space
                        if (svgWidth && svgHeight) {
                            // Calculate optimal size based on container
                            const aspectRatio = parseFloat(svgWidth) / parseFloat(svgHeight);
                            const containerAspectRatio = containerWidth / containerHeight;
                            
                            if (aspectRatio > containerAspectRatio) {
                                // SVG is wider, fit to width
                                svgEl.style.width = '100%';
                                svgEl.style.height = 'auto';
                            } else {
                                // SVG is taller, fit to height
                                svgEl.style.width = 'auto';
                                svgEl.style.height = '100%';
                            }
                        } else if (svgViewBox) {
                            // Use viewBox to determine optimal sizing
                            const viewBoxValues = svgViewBox.split(' ');
                            if (viewBoxValues.length === 4) {
                                const vbWidth = parseFloat(viewBoxValues[2]);
                                const vbHeight = parseFloat(viewBoxValues[3]);
                                const aspectRatio = vbWidth / vbHeight;
                                const containerAspectRatio = containerWidth / containerHeight;
                                
                                if (aspectRatio > containerAspectRatio) {
                                    svgEl.style.width = '100%';
                                    svgEl.style.height = 'auto';
                                } else {
                                    svgEl.style.width = 'auto';
                                    svgEl.style.height = '100%';
                                }
                            } else {
                                // Default to full width
                                svgEl.style.width = '100%';
                                svgEl.style.height = 'auto';
                            }
                        } else {
                            // Fallback: use full available space
                            svgEl.style.width = '100%';
                            svgEl.style.height = 'auto';
                            svgEl.style.minWidth = '100%';
                            svgEl.style.minHeight = '100%';
                        }
                        
                        // Remove any restrictive max dimensions
                        svgEl.style.maxWidth = 'none';
                        svgEl.style.maxHeight = 'none';
                        
                        // Initialize svg-pan-zoom with settings optimized for full space usage
                        panZoomInstance = window.svgPanZoom(svgEl, { 
                            zoomEnabled: true, 
                            controlIconsEnabled: false,
                            fit: true, 
                            center: true, 
                            minZoom: 0.1,
                            maxZoom: 10,
                            panEnabled: true,
                            dblClickZoomEnabled: true,
                            mouseWheelZoomEnabled: true,
                            // Windows-specific settings
                            preventMouseEventsDefault: true,
                            // Ensure zoomed content can be scrolled in container
                            contain: false,
                            // Use full viewport for calculations
                            viewportSelector: '#svgPreview',
                            beforeZoom: function(oldZoom, newZoom) {
                                // Prevent extreme zoom levels that cause issues on Windows
                                return newZoom >= 0.1 && newZoom <= 10;
                            },
                            onZoom: function(level) {
                                // After zoom, ensure container can scroll to show all content
                                if (container) {
                                    // Force container to recognize new content size
                                    container.style.overflow = 'auto';
                                }
                                console.log('Zoom level:', level);
                            }
                        });
                        console.log('Pan-zoom initialized successfully for Windows');
                    } else {
                        console.warn('SVG element or svgPanZoom library not found');
                        // Windows fallback: ensure SVG uses maximum available space
                        if (svgEl) {
                            const container = document.getElementById('svgPreview');
                            const containerWidth = container ? container.clientWidth : window.innerWidth;
                            const containerHeight = container ? container.clientHeight : window.innerHeight;
                            
                            svgEl.style.display = 'block';
                            svgEl.style.margin = '0';
                            
                            // Use full available space
                            const svgViewBox = svgEl.getAttribute('viewBox');
                            const svgWidth = svgEl.getAttribute('width');
                            const svgHeight = svgEl.getAttribute('height');
                            
                            if (svgWidth && svgHeight) {
                                const aspectRatio = parseFloat(svgWidth) / parseFloat(svgHeight);
                                const containerAspectRatio = containerWidth / containerHeight;
                                
                                if (aspectRatio > containerAspectRatio) {
                                    svgEl.style.width = '100%';
                                    svgEl.style.height = 'auto';
                                } else {
                                    svgEl.style.width = 'auto';
                                    svgEl.style.height = '100%';
                                }
                            } else {
                                svgEl.style.width = '100%';
                                svgEl.style.height = 'auto';
                            }
                            
                            svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                            svgEl.style.maxWidth = 'none';
                            svgEl.style.maxHeight = 'none';
                        }
                    }
                } catch (error) {
                    console.error('Error initializing pan-zoom on Windows:', error);
                    // Fallback for Windows: basic SVG display using maximum space
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (svgEl) {
                        svgEl.style.display = 'block';
                        svgEl.style.margin = '0';
                        svgEl.style.width = '100%';
                        svgEl.style.height = 'auto';
                        svgEl.style.maxWidth = 'none';
                        svgEl.style.maxHeight = 'none';
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    }
                }
            }

            // --- Custom Zoom Control Functions with Windows compatibility ---
            function setupZoomControls() {
                // Remove any previous event listeners to avoid duplicate bindings
                [zoomInBtn, zoomOutBtn, zoomResetBtn].forEach(btn => {
                    if (!btn) return;
                    btn.replaceWith(btn.cloneNode(true));
                });
                const zoomIn = document.getElementById('zoomInBtn');
                const zoomOut = document.getElementById('zoomOutBtn');
                const zoomReset = document.getElementById('zoomResetBtn');

                // Helper for fallback zoom (when svg-pan-zoom is not available)
                function fallbackZoom(svgEl, scale) {
                    svgEl.style.transform = 'scale(' + scale + ')';
                    svgEl.style.transformOrigin = 'center center';
                }
                function getCurrentScale(svgEl) {
                    const match = svgEl.style.transform && svgEl.style.transform.match(/scale\(([^)]+)\)/);
                    return match ? parseFloat(match[1]) : 1;
                }

                // Zoom In
                zoomIn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (panZoomInstance && panZoomInstance.zoomIn) {
                        panZoomInstance.zoomIn();
                    } else if (svgEl) {
                        const newScale = Math.min(getCurrentScale(svgEl) * 1.2, 5);
                        fallbackZoom(svgEl, newScale);
                    }
                };
                // Zoom Out
                zoomOut.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (panZoomInstance && panZoomInstance.zoomOut) {
                        panZoomInstance.zoomOut();
                    } else if (svgEl) {
                        const newScale = Math.max(getCurrentScale(svgEl) / 1.2, 0.1);
                        fallbackZoom(svgEl, newScale);
                    }
                };
                // Zoom Reset
                zoomReset.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (panZoomInstance && panZoomInstance.resetZoom) {
                        panZoomInstance.resetZoom();
                        panZoomInstance.center && panZoomInstance.center();
                        panZoomInstance.fit && panZoomInstance.fit();
                    } else if (svgEl) {
                        fallbackZoom(svgEl, 1);
                    }
                };
            }

            // Initialize zoom controls
            setupZoomControls();

            // --- VS Code Message Handling with Windows optimizations ---
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    // Clear previous SVG content to prevent memory leaks on Windows
                    const svgContainer = document.getElementById('svgPreview');
                    if (svgContainer) {
                        svgContainer.innerHTML = '';
                        // Force garbage collection hint for Windows
                        if (window.gc) {
                            setTimeout(() => window.gc(), 100);
                        }
                    }
                    
                    // Set new content
                    svgContainer.innerHTML = message.svgContent;
                    
                    // Immediately fix any aspect ratio issues for Windows
                    const newSvgEl = svgContainer.querySelector('svg');
                    if (newSvgEl) {
                        // Log original SVG dimensions for debugging
                        const originalWidth = newSvgEl.getAttribute('width');
                        const originalHeight = newSvgEl.getAttribute('height');
                        const viewBox = newSvgEl.getAttribute('viewBox');
                        console.log('SVG dimensions before fix:', { originalWidth, originalHeight, viewBox });
                        
                        // Configure SVG for maximum space usage
                        newSvgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        newSvgEl.style.display = 'block';
                        newSvgEl.style.margin = '0';
                        
                        // Calculate optimal size for container
                        const containerWidth = svgContainer.clientWidth;
                        const containerHeight = svgContainer.clientHeight;
                        
                        if (originalWidth && originalHeight) {
                            const aspectRatio = parseFloat(originalWidth) / parseFloat(originalHeight);
                            const containerAspectRatio = containerWidth / containerHeight;
                            
                            if (aspectRatio > containerAspectRatio) {
                                newSvgEl.style.width = '100%';
                                newSvgEl.style.height = 'auto';
                            } else {
                                newSvgEl.style.width = 'auto';
                                newSvgEl.style.height = '100%';
                            }
                        } else {
                            // Default to full width
                            newSvgEl.style.width = '100%';
                            newSvgEl.style.height = 'auto';
                        }
                        
                        // Remove restrictive max dimensions
                        newSvgEl.style.maxWidth = 'none';
                        newSvgEl.style.maxHeight = 'none';
                        
                        console.log('SVG configured for maximum space usage');
                    }
                    
                    // Give extra time for Windows rendering
                    setTimeout(() => {
                        enablePanZoom();
                        setupZoomControls();
                    }, 300); // Increased timeout for Windows
                } else if (message.command === 'updateChat') {
                    document.getElementById('chat').innerHTML = message.chatHtml;
                    // Scroll chat to bottom to show latest message
                    const chatDiv = document.getElementById('chat');
                    if (chatDiv) {
                        chatDiv.scrollTop = chatDiv.scrollHeight;
                    }
                } else if (message.command === 'error') {
                    alert('Error: ' + message.error);
                } else if (message.command === 'configurePlantUML') {
                    // This command will be handled by the extension, which will trigger a page refresh
                    // The layout indicator will automatically update after configuration
                }
            });
            
            // Windows-specific cleanup on page unload
            window.addEventListener('beforeunload', () => {
                try {
                    if (panZoomInstance) {
                        panZoomInstance.destroy();
                        panZoomInstance = null;
                    }
                } catch (error) {
                    console.warn('Cleanup error:', error);
                }
            });

            // --- Initial State with Windows detection ---
            // expandBtn already has its icon set in HTML
            
            // --- Enhanced Debug for Windows Systems ---
            const userAgent = navigator.userAgent;
            const isWindows = userAgent.indexOf('Windows') !== -1;
            console.log('Platform detection:', {
                userAgent: userAgent,
                isWindows: isWindows,
                devicePixelRatio: window.devicePixelRatio || 1,
                screenResolution: screen.width + 'x' + screen.height,
                innerSize: window.innerWidth + 'x' + window.innerHeight
            });
            
            console.log('Zoom button elements:', {
                zoomInBtn: zoomInBtn ? 'found' : 'NOT FOUND',
                zoomOutBtn: zoomOutBtn ? 'found' : 'NOT FOUND', 
                zoomResetBtn: zoomResetBtn ? 'found' : 'NOT FOUND'
            });
            
            console.log('svg-pan-zoom library:', window.svgPanZoom ? 'loaded' : 'NOT LOADED');
            
            // Enhanced debugging for Windows
            if (zoomInBtn) {
                zoomInBtn.addEventListener('click', () => console.log('Zoom in button clicked (Windows compatible)'));
                zoomInBtn.addEventListener('touchstart', () => console.log('Zoom in touch detected'));
            }
            if (zoomOutBtn) {
                zoomOutBtn.addEventListener('click', () => console.log('Zoom out button clicked (Windows compatible)'));
                zoomOutBtn.addEventListener('touchstart', () => console.log('Zoom out touch detected'));
            }
            if (zoomResetBtn) {
                zoomResetBtn.addEventListener('click', () => console.log('Zoom reset button clicked (Windows compatible)'));
                zoomResetBtn.addEventListener('touchstart', () => console.log('Zoom reset touch detected'));
            }
            
            // Windows performance monitoring
            if (isWindows) {
                setInterval(() => {
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (svgEl) {
                        console.log('Windows SVG status:', {
                            width: svgEl.style.width,
                            height: svgEl.style.height,
                            transform: svgEl.style.transform,
                            display: svgEl.style.display
                        });
                    }
                }, 10000); // Log every 10 seconds for debugging
            }

            // Delegate click event for edit buttons
            chat.addEventListener('click', function(event) {
                const target = event.target;
                if (target && target.classList.contains('edit-user-msg-btn')) {
                    const userDiv = target.closest('.user');
                    if (!userDiv) return;
                    const idx = parseInt(userDiv.getAttribute('data-index'));
                    const pre = userDiv.querySelector('pre');
                    if (!pre) return;
                    
                    // Replace pre with textarea for editing
                    const oldMsg = pre.textContent;
                    const textarea = document.createElement('textarea');
                    textarea.value = oldMsg;
                    textarea.className = 'edit-mode-textarea';
                    
                    // Create button container
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'edit-mode-buttons';
                    
                    // Add save/cancel buttons with proper styling
                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = 'Resend';
                    saveBtn.className = 'resend-btn';
                    saveBtn.title = 'Send the modified message';
                    
                    const cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'Cancel';
                    cancelBtn.className = 'cancel-btn';
                    cancelBtn.title = 'Cancel editing and restore original message';
                    
                    buttonContainer.appendChild(saveBtn);
                    buttonContainer.appendChild(cancelBtn);
                    
                    // Replace pre and edit button with textarea and buttons
                    userDiv.replaceChild(textarea, pre);
                    target.style.display = 'none';
                    userDiv.appendChild(buttonContainer);
                    
                    // Focus on textarea and select all text for easy editing
                    textarea.focus();
                    textarea.select();
                    
                    // Save handler
                    saveBtn.onclick = function() {
                        vscode.postMessage({ command: 'editAndResendUserMsg', index: idx, newText: textarea.value });
                    };
                    
                    // Cancel handler
                    cancelBtn.onclick = function() {
                        // Restore original pre and edit button
                        userDiv.replaceChild(pre, textarea);
                        target.style.display = '';
                        buttonContainer.remove();
                    };
                    
                    // Allow Enter+Ctrl to save
                    textarea.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            saveBtn.click();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelBtn.click();
                        }
                    });
                }
            });
        </script>
    </body>
    </html>
    `;
}