import * as vscode from 'vscode';
import { selectCopilotLLMModel } from '../llm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import { trackUsage } from '../analytics';
import { UserOnboardingState } from './uml/types';

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


// Use Copilot API to generate diagram code from requirement, history, and diagram type
interface DiagramGenerationResult { code: string; modelId?: string; }
async function generateDiagramFromRequirement(requirement: string, history: string[], diagramType?: string, engine?: string, onStreamFragment?: (chunk: string) => void): Promise<DiagramGenerationResult> {
    const selectedEngine = engine || 'mermaid';
    console.debug(`Generating ${selectedEngine} diagram from requirement with engine ${selectedEngine}`);
    let typeInstruction = '';
    if (diagramType && diagramType !== '') {
        typeInstruction = `Generate a ${selectedEngine === 'mermaid' ? 'Mermaid' : 'PlantUML'} ${diagramType} diagram.`;
    } else {
        typeInstruction = `Generate the most appropriate UML diagram for the requirement using ${selectedEngine === 'mermaid' ? 'Mermaid' : 'PlantUML'}.`;
    }
    
    // Define the appropriate code block markers
    const codeBlockStart = selectedEngine === 'mermaid' ? '```mermaid' : '@startuml';
    const codeBlockEnd = selectedEngine === 'mermaid' ? '```' : '@enduml';
    
    // Create engine-specific prompts
    let systemPrompt = '';
    let diagramTypeMapping = '';
    
    if (selectedEngine === 'mermaid') {
        // Mermaid-specific prompt and type mapping
        diagramTypeMapping = `
- activity → flowchart (use flowchart syntax with decision nodes)
- sequence → sequenceDiagram
- class → classDiagram  
- component → flowchart (represent components as nodes)
- usecase → flowchart (represent actors and use cases as nodes)`;
        
        systemPrompt = `You are an expert software architect specializing in Mermaid diagram generation.
First, briefly explain the user's system, question, or process in 2-3 sentences.
Then, output the corresponding Mermaid code (and only valid Mermaid code) for the described system or process.

IMPORTANT Mermaid Syntax Guidelines:
${diagramTypeMapping}

For flowcharts: Use 'flowchart TD' or 'flowchart LR' syntax
For sequence diagrams: Use 'sequenceDiagram' followed by participant definitions and interactions
For class diagrams: Use 'classDiagram' with proper class definitions and relationships
Always use proper Mermaid syntax - no PlantUML syntax should be used.

${typeInstruction}`;
    } else {
        // PlantUML-specific prompt
        systemPrompt = `You are an expert software architect specializing in PlantUML diagram generation.
First, briefly explain the user's system, question, or process in 2-3 sentences.
Then, output the corresponding PlantUML code (and only valid PlantUML code) for the described system or process.

${typeInstruction}`;
    }
    
    const prompt = [
        vscode.LanguageModelChatMessage.User(
            `${systemPrompt}

IMPORTANT: You MUST always include the diagram type in your response. Format your response EXACTLY as follows:

Explanation:
<your explanation here>

Diagram Type: <EXACTLY one of: activity, sequence, usecase, class, component>

${codeBlockStart}
<${selectedEngine === 'mermaid' ? 'Mermaid' : 'PlantUML'} code here>
${codeBlockEnd}`
        ),
        ...history.map(msg => vscode.LanguageModelChatMessage.User(msg)),
        vscode.LanguageModelChatMessage.User(requirement)
    ];
    
    try {
        const model = await selectCopilotLLMModel();
        if (!model) { throw new Error('No Copilot model available.'); }
        const tokenSource = new vscode.CancellationTokenSource();
        const startTs = Date.now();
        const chatResponse = await model.sendRequest(prompt, {}, tokenSource.token);
        let diagramCode = '';
        for await (const fragment of chatResponse.text) {
            diagramCode += fragment;
            if (onStreamFragment) { onStreamFragment(fragment); }
        }
        return { code: diagramCode, modelId: (model as any).id || (model as any).name };
    } catch (err: any) {
        throw new Error('Copilot API error: ' + (err.message || String(err)));
    }
}

// Extract diagram type from LLM response - LLM is forced to provide this
// Focused on diagram types with significant AI-driven comparative advantages
function extractDiagramTypeFromResponse(response: string): string {
    const diagramTypeMatch = response.match(/Diagram Type:\s*([^\n\r]+)/i);
    if (diagramTypeMatch && diagramTypeMatch[1]) {
        const type = diagramTypeMatch[1].trim().toLowerCase();
        // Normalize to exact supported types with AI advantages
        if (type === 'activity' || type.includes('activity')) { return 'activity'; }
        if (type === 'sequence' || type.includes('sequence')) { return 'sequence'; }
        if (type === 'usecase' || type === 'use case' || type.includes('usecase') || type.includes('use case')) { return 'usecase'; }
        if (type === 'class' || type.includes('class')) { return 'class'; }
        if (type === 'component' || type.includes('component')) { return 'component'; }
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

            // User tutorial state management
            let userOnboardingState: UserOnboardingState = {
                hasSeenOnboarding: false
            };

            // 加载用户状态
            try {
                const savedState = context.globalState.get<UserOnboardingState>('umlChatOnboardingState');
                if (savedState) {
                    userOnboardingState = { ...userOnboardingState, ...savedState };
                }
            } catch (error) {
                console.warn('Failed to load onboarding state:', error);
            }

            // Helper to generate chat HTML only
            function getChatHtml(chatHistory: { role: 'user' | 'bot', message: string }[]): string {
                const lastBotMessageIndex = chatHistory.map(h => h.role).lastIndexOf('bot');
                return chatHistory.map((h, index) => {
                    const messageContent = `<pre style="white-space: pre-wrap; word-break: break-word;">${h.message}</pre>`;
                    if (h.role === 'bot') {
                        const isActive = index === lastBotMessageIndex;
                        return `\n                <div class="bot-message ${isActive ? 'active-message' : ''}" onclick="handleBotMessageClick(this)">\n                    <b>Bot:</b> ${messageContent}\n                </div>`;
                    }
                    // Add edit and delete buttons for user messages (flex layout)
                    return `<div class="user" data-index="${index}">
                    <div class="user-message-content"><b>You:</b> ${messageContent}</div>
                    <div class="user-message-actions">
                        <button class='edit-user-msg-btn' title='Edit and resend'>✏️ Edit</button>
                        <button class='delete-user-msg-btn' title='Delete this request and all following history'>🗑️ Delete</button>
                    </div>
                </div>`;
                }).join('');
            }

            // Debounced render function
            const debouncedRender = debounce(async (diagramCode: string, engine?: string) => {
                const svg = await renderDiagramToSVG(diagramCode, engine);
                panel.webview.postMessage({ command: 'updatePreview', svgContent: svg });
            }, 300);

            // Initial UI load
            panel.webview.html = getWebviewContent(chatHistory, currentPlantUML, false, svgPanZoomUri);

            // Check if we should show onboarding
            setTimeout(() => {
                // Check for first-time onboarding
                if (!userOnboardingState.hasSeenOnboarding) {
                    panel.webview.postMessage({ command: 'showOnboarding' });
                }
            }, 1000); // Delay to ensure webview is fully loaded

            // Helper to update chat area only
            function updateChatInWebview() {
                panel.webview.postMessage({ command: 'updateChat', chatHtml: getChatHtml(chatHistory) });
            }

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(async message => {
                switch (message.command) {
                    case 'sendRequirement': {
                        trackUsage('uml.chatPanel', 'sendMessage', { diagramType: message.diagramType, diagramEngine: message.diagramEngine });
                        const userInput = message.text.trim();
                        if (!userInput) { return; }
                        chatHistory.push({ role: 'user', message: userInput });
                        // Update lastDiagramType if user selected a new one
                        lastDiagramType = message.diagramType || lastDiagramType || '';
                        // Store the selected engine
                        const selectedEngine = message.diagramEngine || 'mermaid';
                        // Add loading message
                        chatHistory.push({ role: 'bot', message: 'Generating diagram, please wait...' });
                        updateChatInWebview();
                        try {
                            const startTs = Date.now();
                            let firstFragmentTs: number | undefined;
                            let lastFragmentTs: number = startTs;
                            let fragmentCount = 0;
                            let accumulated = '';
                            const result = await generateDiagramFromRequirement(userInput, chatHistory.filter(h => h.role === 'user').map(h => h.message), lastDiagramType, selectedEngine, (frag) => {
                                const now = Date.now();
                                if (firstFragmentTs === undefined) { firstFragmentTs = now; }
                                lastFragmentTs = now;
                                fragmentCount++;
                                if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') { chatHistory[chatHistory.length - 1].message = frag; } else {
                                    const lastIndex = chatHistory.map(h => h.role).lastIndexOf('bot');
                                    if (lastIndex !== -1) { chatHistory[lastIndex].message += frag; }
                                }
                                accumulated += frag;
                                updateChatInWebview();
                            });
                            const plantumlResponse = result.code;
                            // Remove loading message if still present
                            if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') { chatHistory.pop(); }
                            currentPlantUML = plantumlResponse;
                            const llmDiagramType = extractDiagramTypeFromResponse(plantumlResponse);
                            let diagramTypeLabel = '';
                            if (lastDiagramType) {
                                diagramTypeLabel = `[${lastDiagramType.charAt(0).toUpperCase() + lastDiagramType.slice(1)} Diagram]\n\n`;
                            } else {
                                diagramTypeLabel = llmDiagramType !== 'unknown' ? `[Auto-detected: ${llmDiagramType.charAt(0).toUpperCase() + llmDiagramType.slice(1)} Diagram]\n\n` : `[Auto-detected Diagram]\n\n`;
                            }
                            // Metrics footer
                            const endTs = Date.now();
                            const firstByteMs = firstFragmentTs ? (firstFragmentTs - startTs) : (endTs - startTs);
                            const totalMs = endTs - startTs;
                            const avgGapMs = (fragmentCount > 1 && firstFragmentTs) ? Math.round((lastFragmentTs - firstFragmentTs) / (fragmentCount - 1)) : 0;
                            const responseChars = plantumlResponse.length;
                            // Token estimate heuristic (chars/4)
                            const estTokens = Math.ceil(responseChars / 4);
                            // Extract code for stats (engine specific)
                            let codeBody = '';
                            if (selectedEngine === 'mermaid') {
                                const m = plantumlResponse.match(/```mermaid\n([\s\S]*?)\n```/);
                                if (m && m[1]) { codeBody = m[1].trim(); }
                            } else {
                                const m = plantumlResponse.match(/@startuml([\s\S]*?)@enduml/);
                                if (m && m[1]) { codeBody = m[1].trim(); }
                            }
                            const codeLines = codeBody ? codeBody.split(/\r?\n/).length : 0;
                            const codeChars = codeBody.length;
                            const modelId = result.modelId || 'unknown-model';
                            const effectiveType = lastDiagramType || llmDiagramType || 'unknown';
                            const footer = `\n\n---\nLatency: firstByte ${firstByteMs} ms | total ${totalMs} ms\nFragments: ${fragmentCount} ${fragmentCount>1?`(avg gap ${avgGapMs} ms)`:''}\nChars: ${responseChars} | est tokens: ${estTokens}\nModel: ${modelId} | Engine: ${selectedEngine} | Type: ${effectiveType}\nCode: ${codeLines} lines (${codeChars} chars)\nStreaming: yes`;
                            // Replace streaming content with final labeled + footer (but keep currentPlantUML raw for rendering)
                            const lastBotIndex = chatHistory.map(h => h.role).lastIndexOf('bot');
                            if (lastBotIndex !== -1) {
                                chatHistory[lastBotIndex].message = diagramTypeLabel + plantumlResponse + footer;
                            } else {
                                chatHistory.push({ role: 'bot', message: diagramTypeLabel + plantumlResponse + footer });
                            }
                            updateChatInWebview();
                            debouncedRender(currentPlantUML, selectedEngine);
                            setTimeout(() => updateChatInWebview(), 200);
                        } catch (err: any) {
                            if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') { chatHistory.pop(); }
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
                                        // Re-show onboarding if it was active before
                                        if (!userOnboardingState.hasSeenOnboarding) {
                                            panel.webview.postMessage({ command: 'showOnboarding' });
                                        }
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
                                const startTs = Date.now();
                                let firstFragmentTs: number | undefined; let lastFragmentTs = startTs; let fragmentCount = 0;
                                const result = await generateDiagramFromRequirement(newText, chatHistory.filter(h => h.role === 'user').map(h => h.message), lastDiagramType, 'mermaid', (frag) => {
                                    const now = Date.now();
                                    if (firstFragmentTs === undefined) { firstFragmentTs = now; }
                                    lastFragmentTs = now; fragmentCount++;
                                    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') { chatHistory[chatHistory.length - 1].message = frag; } else {
                                        const li = chatHistory.map(h => h.role).lastIndexOf('bot'); if (li !== -1) { chatHistory[li].message += frag; }
                                    }
                                    updateChatInWebview();
                                });
                                const plantumlResponse = result.code;
                                if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') { chatHistory.pop(); }
                                currentPlantUML = plantumlResponse;
                                const llmDiagramType = extractDiagramTypeFromResponse(plantumlResponse);
                                let diagramTypeLabel = '';
                                if (lastDiagramType) { diagramTypeLabel = `[${lastDiagramType.charAt(0).toUpperCase() + lastDiagramType.slice(1)} Diagram]\n\n`; } else { diagramTypeLabel = llmDiagramType !== 'unknown' ? `[Auto-detected: ${llmDiagramType.charAt(0).toUpperCase() + llmDiagramType.slice(1)} Diagram]\n\n` : `[Auto-detected Diagram]\n\n`; }
                                const endTs = Date.now();
                                const firstByteMs = firstFragmentTs ? (firstFragmentTs - startTs) : (endTs - startTs);
                                const totalMs = endTs - startTs;
                                const avgGapMs = (fragmentCount > 1 && firstFragmentTs) ? Math.round((lastFragmentTs - firstFragmentTs) / (fragmentCount - 1)) : 0;
                                const responseChars = plantumlResponse.length;
                                const estTokens = Math.ceil(responseChars / 4);
                                let codeBody = '';
                                const m = plantumlResponse.match(/```mermaid\n([\s\S]*?)\n```/);
                                if (m && m[1]) { codeBody = m[1].trim(); }
                                const codeLines = codeBody ? codeBody.split(/\r?\n/).length : 0;
                                const codeChars = codeBody.length;
                                const modelId = result.modelId || 'unknown-model';
                                const effectiveType = lastDiagramType || llmDiagramType || 'unknown';
                                const footer = `\n\n---\nLatency: firstByte ${firstByteMs} ms | total ${totalMs} ms\nFragments: ${fragmentCount} ${fragmentCount>1?`(avg gap ${avgGapMs} ms)`:''}\nChars: ${responseChars} | est tokens: ${estTokens}\nModel: ${modelId} | Engine: mermaid | Type: ${effectiveType}\nCode: ${codeLines} lines (${codeChars} chars)\nStreaming: yes`;
                                chatHistory.push({ role: 'bot', message: diagramTypeLabel + plantumlResponse + footer });
                                updateChatInWebview();
                                debouncedRender(currentPlantUML);
                                setTimeout(() => updateChatInWebview(), 200);
                            } catch (err: any) {
                                if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].message === 'Generating diagram, please wait...') { chatHistory.pop(); }
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
                                // Re-show onboarding if it was active before
                                if (!userOnboardingState.hasSeenOnboarding) {
                                    panel.webview.postMessage({ command: 'showOnboarding' });
                                }
                            }, 300);
                        });
                        break;
                    }
                    case 'onboardingComplete': {
                        userOnboardingState.hasSeenOnboarding = true;
                        userOnboardingState.onboardingCompletedAt = Date.now();
                        await context.globalState.update('umlChatOnboardingState', userOnboardingState);
                        trackUsage('uml.chatPanel', 'onboardingComplete');
                        break;
                    }
                    case 'onboardingSkip': {
                        userOnboardingState.hasSeenOnboarding = true;
                        await context.globalState.update('umlChatOnboardingState', userOnboardingState);
                        trackUsage('uml.chatPanel', 'onboardingSkip');
                        break;
                    }
                    case 'generateExample': {
                        const example = message.example;
                        if (example) {
                            panel.webview.postMessage({ 
                                command: 'fillExample', 
                                example: example 
                            });
                        }
                        break;
                    }
                    case 'deleteUserMsgAndFollowing': {
                        const { index } = message;
                        if (typeof index === 'number') {
                            // Remove the selected user request and all following history
                            chatHistory = chatHistory.slice(0, index);
                            updateChatInWebview();
                            currentPlantUML = '@startuml\n\n@enduml';
                            debouncedRender(currentPlantUML);
                        }
                        break;
                    }

                }
            }, undefined, context.subscriptions);
        })
    );
}

// Render diagram to SVG using the appropriate renderer
async function renderDiagramToSVG(diagramCode: string, engine?: string): Promise<string> {
    const selectedEngine = engine || 'mermaid';
    
    if (selectedEngine === 'mermaid') {
        // Extract Mermaid code from the LLM response
        const mermaidMatch = diagramCode.match(/```mermaid\n([\s\S]*?)\n```/);
        if (mermaidMatch && mermaidMatch[1]) {
            const mermaidCode = mermaidMatch[1].trim();
            
            // For now, create a visual representation showing the Mermaid code
            // This will be replaced with actual Mermaid rendering when the engine is fully implemented
            return `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="mermaidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
                    </linearGradient>
                </defs>
                
                <rect width="100%" height="100%" fill="url(#mermaidGrad)" rx="8" ry="8"/>
                
                <!-- Header -->
                <rect x="0" y="0" width="100%" height="50" fill="#1976d2" rx="8" ry="8"/>
                <text x="20" y="30" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
                    🧜‍♀️ Mermaid Diagram Generated
                </text>
                
                <!-- Success message -->
                <text x="300" y="100" text-anchor="middle" fill="#1976d2" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
                    ✅ Mermaid Code Successfully Generated!
                </text>
                
                <text x="300" y="130" text-anchor="middle" fill="#424242" font-family="Arial, sans-serif" font-size="14">
                    The AI generated valid Mermaid syntax for your diagram.
                </text>
                
                <!-- Code preview box -->
                <rect x="50" y="160" width="500" height="180" fill="white" stroke="#1976d2" stroke-width="2" rx="4"/>
                <text x="60" y="180" fill="#1976d2" font-family="Arial, sans-serif" font-size="12" font-weight="bold">Mermaid Code:</text>
                
                ${mermaidCode.split('\n').map((line, index) => 
                    `<text x="60" y="${200 + index * 16}" fill="#333" font-family="monospace" font-size="11">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`
                ).slice(0, 8).join('')}
                
                ${mermaidCode.split('\n').length > 8 ? 
                    `<text x="60" y="${200 + 8 * 16}" fill="#666" font-family="monospace" font-size="11">... (${mermaidCode.split('\n').length - 8} more lines)</text>` 
                    : ''
                }
                
                <!-- Footer note -->
                <text x="300" y="370" text-anchor="middle" fill="#666" font-family="Arial, sans-serif" font-size="12">
                    Copy the Mermaid code above to use in Mermaid-compatible tools
                </text>
            </svg>`;
        } else {
            // No Mermaid code found, show error
            return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="300" fill="#fff3cd" stroke="#ffc107" stroke-width="2"/>
                <text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#856404">
                    ⚠️ No Mermaid Code Found
                </text>
                <text x="200" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#856404">
                    The LLM response doesn't contain valid Mermaid syntax
                </text>
            </svg>`;
        }
    } else {
        // Use existing PlantUML renderer
        return renderPlantUMLToSVG(diagramCode);
    }
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
        const messageContent = `<pre style="white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${h.message}</pre>`;
        if (h.role === 'bot') {
            const isActive = index === lastBotMessageIndex;
            const isLoading = h.message === 'Generating diagram, please wait...';
            return `\n                <div class="bot-message ${isActive ? 'active-message' : ''}${isLoading ? ' loading-message' : ''}" onclick="handleBotMessageClick(this)">\n                    <b>Bot:</b> ${messageContent}\n                </div>`;
        }
        // Add edit and delete buttons for user messages (flex layout)
        return `<div class="user" data-index="${index}">
                    <div class="user-message-content"><b>You:</b> ${messageContent}</div>
                    <div class="user-message-actions">
                        <button class='edit-user-msg-btn' title='Edit and resend'>✏️ Edit</button>
                        <button class='delete-user-msg-btn' title='Delete this request and all following history'>🗑️ Delete</button>
                    </div>
                </div>`;
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
    
    const diagramEngineOptions =
        `<option value="mermaid">Mermaid</option>
        <option value="plantuml">PlantUML</option>
    `;

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
                display: flex;
                flex-direction: column;
            }
            .user-message-content {
                flex-grow: 1;
            }
            .user-message-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 8px;
                border-top: 1px solid #ddd;
                padding-top: 8px;
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
            #inputArea { 
                flex: 0 0 auto; 
                display: flex; 
                flex-direction: column; 
                padding: 10px 10px 4px 10px; /* UPDATED: Reduced bottom padding */
                border-top: 1px solid #eee; 
                background: #f9f9f9; 
            }
            #requirementInput { 
                width: 100%; 
                box-sizing: border-box; 
                min-height: 80px; 
                max-height: 300px; 
                padding: 12px; 
                font-size: 1.1em; 
                font-family: inherit;
                resize: vertical; 
                margin-bottom: 10px; 
                border: 2px solid #e1e5e9; 
                border-radius: 8px; 
                background: #fff;
                transition: all 0.2s ease;
                line-height: 1.5;
                overflow-y: auto;
                /* Enhanced focus states */
                outline: none;
                word-wrap: break-word;
                word-break: break-word;
                overflow-wrap: break-word;
                white-space: pre-wrap;
            }
            #requirementInput:focus {
                border-color: #007acc;
                box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
                background: #fafbfc;
            }
            #requirementInput::placeholder {
                color: #6c757d;
                font-style: italic;
            }
            /* Auto-resize functionality */
            #requirementInput.auto-resize {
                overflow: hidden;
                resize: none;
            }
            
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
                font-size: 0.9em !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
            .edit-user-msg-btn:hover {
                background: #0066cc !important;
                color: #fff !important;
            }

            /* --- Delete Message Button Styling --- */
            .delete-user-msg-btn {
                background: #fff0f0 !important;
                color: #d32f2f !important;
                border: 1px solid #d32f2f !important;
                padding: 4px 8px !important;
                font-size: 0.9em !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
            .delete-user-msg-btn:hover {
                background: #d32f2f !important;
                color: #fff !important;
            }

            /* --- Enhanced Edit Mode Buttons --- */
            .edit-mode-buttons {
                display: flex !important;
                gap: 8px !important;
                margin-top: 12px !important;
                align-items: center !important;
                justify-content: flex-end !important;
            }
            .resend-btn {
                background: linear-gradient(135deg, #28a745, #20c997) !important;
                color: #fff !important;
                border: none !important;
                padding: 8px 16px !important;
                font-size: 0.9em !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: 600 !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                box-shadow: 0 2px 4px rgba(40,167,69,0.2) !important;
            }
            .resend-btn:hover, .resend-btn:focus {
                background: linear-gradient(135deg, #218838, #1ea085) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(40,167,69,0.3) !important;
            }
            .resend-btn:active {
                transform: translateY(0) !important;
                box-shadow: 0 2px 4px rgba(40,167,69,0.2) !important;
            }
            .resend-btn::before {
                content: '🚀' !important;
                font-size: 0.9em !important;
            }
            .cancel-btn {
                background: linear-gradient(135deg, #6c757d, #5a6268) !important;
                color: #fff !important;
                border: none !important;
                padding: 8px 16px !important;
                font-size: 0.9em !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: 600 !important;
                transition: all 0.2s ease !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                box-shadow: 0 2px 4px rgba(108,117,125,0.2) !important;
            }
            .cancel-btn:hover, .cancel-btn:focus {
                background: linear-gradient(135deg, #5a6268, #495057) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(108,117,125,0.3) !important;
            }
            .cancel-btn:active {
                transform: translateY(0) !important;
                box-shadow: 0 2px 4px rgba(108,117,125,0.2) !important;
            }
            .cancel-btn::before {
                content: '✕' !important;
                font-size: 0.9em !important;
            }

            /* --- Enhanced Edit Mode Styling --- */
            .edit-mode-container {
                position: relative !important;
                margin-top: 8px !important;
                background: #f8f9fa !important;
                border: 2px solid #007acc !important;
                border-radius: 8px !important;
                padding: 12px !important;
                box-shadow: 0 2px 8px rgba(0,123,255,0.1) !important;
                transition: all 0.2s ease !important;
            }
            .edit-mode-container:focus-within {
                border-color: #0056b3 !important;
                box-shadow: 0 0 0 3px rgba(0,123,255,0.1), 0 4px 12px rgba(0,123,255,0.15) !important;
                background: #fff !important;
            }
            
            .edit-mode-textarea {
                width: 100% !important;
                min-height: 80px !important;
                max-height: 300px !important;
                padding: 12px !important;
                font-size: 1.1em !important;
                font-family: inherit !important;
                border: none !important;
                border-radius: 6px !important;
                resize: vertical !important;
                background: transparent !important;
                transition: all 0.2s ease !important;
                box-sizing: border-box !important;
                line-height: 1.5 !important;
                outline: none !important;
                word-wrap: break-word !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                white-space: pre-wrap !important;
            }
            .edit-mode-textarea:focus {
                background: #fff !important;
                box-shadow: inset 0 0 0 2px rgba(0,123,255,0.2) !important;
            }
            
            .edit-mode-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                margin-bottom: 8px !important;
                font-size: 0.9em !important;
                color: #007acc !important;
                font-weight: 500 !important;
            }
            
            .edit-mode-char-counter {
                font-size: 0.8em !important;
                color: #6c757d !important;
                background: rgba(255,255,255,0.8) !important;
                padding: 2px 6px !important;
                border-radius: 3px !important;
                font-weight: normal !important;
            }
            
            .edit-mode-char-counter.warning {
                color: #ffc107 !important;
            }
            
            .edit-mode-char-counter.danger {
                color: #dc3545 !important;
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
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <label for="diagramEngine" style="margin-right: 8px; font-weight: 500;">Engine:</label>
                        <select id="diagramEngine" title="Select Diagram Engine">${diagramEngineOptions}</select>
                    </div>
                    <div style="position: relative;">
                        <textarea id="requirementInput" placeholder="Describe your UML requirement... (Press Enter to send, Shift+Enter for new line, Esc to clear)"></textarea>
                        <div id="charCounter" style="position: absolute; bottom: 8px; right: 8px; font-size: 0.8em; color: #6c757d; background: rgba(255,255,255,0.8); padding: 2px 6px; border-radius: 3px; pointer-events: none;">0</div>
                        <button id="clearInputBtn" style="position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.9); border: 1px solid #ccc; border-radius: 4px; padding: 4px 8px; font-size: 0.8em; cursor: pointer; display: none;" title="Clear input">✕</button>
                    </div>
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
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10V3h10v7"/><path d="M9 3v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V3"/></svg>
                                        <span>Save Session</span>
                                    </button>
                                    <button id="importBtn" title="Load a previous session from a .umlchat file" aria-label="Load Chat Session">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/><path d="M17 10V3h-10v7"/><path d="M15 3v4a2 2 0 0 0-2 2h-4a2 2 0 0 0-2-2V3"/></svg>
                                        <span>Load Session</span>
                                    </button>
                                    <button id="exportSVGBtn" title="Export the current diagram as SVG" aria-label="Export SVG">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10V3h10v7"/><path d="M9 3v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V3"/></svg>
                                        <span>Export SVG</span>
                                    </button>
                                    <button id="clearChatBtn" title="Clear the chat history" aria-label="Clear Chat">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z" fill="none"/><path d="M9 9l6 6M15 9l-6 6" fill="none" stroke-width="2"/></svg>
                                        <span>Clear Chat</span>
                                    </button>
                                    <button id="configurePlantUMLBtn" title="Configure PlantUML settings" aria-label="Configure PlantUML">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z" fill="none"/><path d="M12 8v8M8 12h8" fill="none" stroke-width="2"/></svg>
                                        <span>Configure PlantUML</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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

            // --- Enhanced Input Handling with Auto-resize ---
            function autoResizeTextarea() {
                const textarea = requirementInput;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
            }

            // Character counter functionality
            const charCounter = document.getElementById('charCounter');
            const clearInputBtn = document.getElementById('clearInputBtn');
            
            function updateCharCounter() {
                const count = requirementInput.value.length;
                charCounter.textContent = count;
                // Show/hide clear button based on content
                clearInputBtn.style.display = count > 0 ? 'block' : 'none';
                // Change color based on length
                if (count > 1000) {
                    charCounter.style.color = '#dc3545';
                } else if (count > 500) {
                    charCounter.style.color = '#ffc107';
                } else {
                    charCounter.style.color = '#6c757d';
                }
            }
            
            // Clear button functionality
            clearInputBtn.onclick = () => {
                requirementInput.value = '';
                requirementInput.style.height = '80px';
                updateCharCounter();
                requirementInput.focus();
            };

            // Auto-resize on input
            requirementInput.addEventListener('input', () => {
                autoResizeTextarea();
                updateCharCounter();
            });
            
            // Initialize auto-resize and counter
            autoResizeTextarea();
                if (e.key === 'Escape') {
                    requirementInput.value = '';
                    requirementInput.style.height = '80px';
                    updateCharCounter();
                    requirementInput.blur();
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
                        svgEl
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
                        const containerHeight = svgContainer.clientHeight = svgContainer.clientHeight;
                        
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

            // Enhanced edit mode functionality
            chat.addEventListener('click', function(event) {
                const target = event.target;
                if (target && target.classList.contains('edit-user-msg-btn')) {
                    const userDiv = target.closest('.user');
                    if (!userDiv) return;
                    const idx = parseInt(userDiv.getAttribute('data-index'));
                    const pre = userDiv.querySelector('pre');
                    if (!pre) return;
                    
                    // Create enhanced edit mode container
                    const editContainer = document.createElement('div');
                    editContainer.className = 'edit-mode-container';
                    
                    // Create header with character counter
                    const header = document.createElement('div');
                    header.className = 'edit-mode-header';
                    header.innerHTML = '<span>✏️ Editing message</span><span class="edit-mode-char-counter">0</span>';
                    
                    // Create textarea with enhanced styling
                    const textarea = document.createElement('textarea');
                    textarea.value = pre.textContent;
                    textarea.className = 'edit-mode-textarea';
                    textarea.placeholder = 'Edit your message here... (Ctrl+Enter to save, Esc to cancel)';
                    
                    // Create button container
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'edit-mode-buttons';
                    
                    // Add enhanced buttons
                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = 'Resend';
                    saveBtn.className = 'resend-btn';
                    saveBtn.title = 'Send the modified message (Ctrl+Enter)';
                    
                    const cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'Cancel';
                    cancelBtn.className = 'cancel-btn';
                    cancelBtn.title = 'Cancel editing and restore original message (Esc)';
                    
                    buttonContainer.appendChild(saveBtn);
                    buttonContainer.appendChild(cancelBtn);
                    
                    // Assemble the edit container
                    editContainer.appendChild(header);
                    editContainer.appendChild(textarea);
                    editContainer.appendChild(buttonContainer);
                    
                    // Replace pre and edit button with enhanced edit container
                    userDiv.replaceChild(editContainer, pre);
                    target.style.display = 'none';
                    
                    // Auto-resize functionality for edit textarea
                    function autoResizeEditTextarea() {
                        textarea.style.height = 'auto';
                        textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
                    }
                    
                    // Character counter functionality
                    function updateEditCharCounter() {
                        const count = textarea.value.length;
                        const counter = header.querySelector('.edit-mode-char-counter');
                        counter.textContent = count;
                        
                        // Update counter color based on length
                        counter.classList.remove('warning', 'danger');
                        if (count > 1000) {
                            counter.classList.add('danger');
                        } else if (count > 500) {
                            counter.classList.add('warning');
                        }
                    }
                    
                    // Initialize auto-resize and counter
                    autoResizeEditTextarea();
                    updateEditCharCounter();
                    
                    // Add event listeners
                    textarea.addEventListener('input', () => {
                        autoResizeEditTextarea();
                        updateEditCharCounter();
                    });
                    
                    // Focus and select all text
                    textarea.focus();
                    textarea.select();
                    
                    // Save handler
                    saveBtn.onclick = function() {
                        const newText = textarea.value.trim();
                        if (newText) {
                            // Get the current diagram type selection
                            const diagramTypeSelect = document.getElementById('diagramType');
                            const selectedDiagramType = diagramTypeSelect ? diagramTypeSelect.value : '';
                            
                            // Get the current engine type selection
                            const engineTypeSelect = document.getElementById('engineType');
                            const selectedEngineType = engineTypeSelect ? engineTypeSelect.value : 'plantuml';
                            
                            vscode.postMessage({ 
                                command: 'editAndResendUserMsg', 
                                index: idx, 
                                newText: newText,
                                diagramType: selectedDiagramType,
                                engineType: selectedEngineType
                            });
                        }
                    };
                    
                    // Cancel handler
                    cancelBtn.onclick = function() {
                        // Restore original pre and edit button
                        userDiv.replaceChild(pre, editContainer);
                        target.style.display = '';
                    };
                    
                    // Enhanced keyboard shortcuts
                    textarea.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            saveBtn.click();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelBtn.click();
                        } else if (e.key === 'Tab') {
                            // Allow tab for indentation
                            if (e.shiftKey) {
                                // Shift+Tab for outdent
                                e.preventDefault();
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const value = textarea.value;
                                
                                if (start === end) {
                                    // Single cursor - remove one tab/space
                                    const beforeCursor = value.substring(0, start);
                                    const afterCursor = value.substring(end);
                                    const newValue = beforeCursor.replace(/\t$/, '') + afterCursor;
                                    textarea.value = newValue;
                                    textarea.selectionStart = textarea.selectionEnd = start - 1;
                                }
                            } else {
                                // Tab for indent
                                e.preventDefault();
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const value = textarea.value;
                                
                                textarea.value = value.substring(0, start) + '\t' + value.substring(end);
                                textarea.selectionStart = textarea.selectionEnd = start + 1;
                            }
                        }
                    });
                    
                    // Add visual feedback for changes
                    const originalText = pre.textContent;
                    textarea.addEventListener('input', function() {
                        const hasChanges = textarea.value !== originalText;
                        saveBtn.style.opacity = hasChanges ? '1' : '0.7';
                        saveBtn.disabled = !hasChanges;
                    });
                } else if (target && target.classList.contains('delete-user-msg-btn')) {
                    const userDiv = target.closest('.user');
                    if (!userDiv) return;
                    const idx = parseInt(userDiv.getAttribute('data-index'));
                    vscode.postMessage({ command: 'deleteUserMsgAndFollowing', index: idx });
                }
            });
        </script>
    </body>
    </html>
    `;
}