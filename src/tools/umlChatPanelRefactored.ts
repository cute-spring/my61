/**
 * UML Chat Panel - Refactored main entry point
 * This file orchestrates the UML chat functionality using modular components
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { GeneratorFactory, EngineType } from './uml/generatorFactory';
import { ChatManager } from './chat/chatManager';
import { WebviewHtmlGenerator } from './ui/webviewHtmlGenerator';
import { InputValidator, ErrorHandler, debounce } from './utils/helpers';
import { DiagramType, WebviewMessage } from './uml/types';
import { trackUsage } from '../analytics';
import { UserOnboardingState } from './uml/types';

/**
 * Main activation function for UML Chat Panel
 */
export function activateUMLChatPanel(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.umlChatPanel', async () => {
            await createUMLChatPanel(context);
        })
    );
}

/**
 * Create and manage the UML Chat Panel
 */
async function createUMLChatPanel(context: vscode.ExtensionContext) {
    // Track usage when panel is opened
    trackUsage('uml.chatPanel', 'open');
    
    // Initialize user onboarding state
    let userOnboardingState: UserOnboardingState = {
        hasSeenOnboarding: false
    };
    
    // Load saved onboarding state
    const savedState = context.globalState.get<UserOnboardingState>('umlChatOnboardingState');
    if (savedState) {
        userOnboardingState = { ...userOnboardingState, ...savedState };
    }
    
    // Initialize components
    const factory = GeneratorFactory.getInstance();
    const chatManager = new ChatManager();
    
    // Check for pending import data (from file association)
    const pendingImport = context.globalState.get<any>('pendingUmlChatImport');
    if (pendingImport) {
        try {
            chatManager.importSession(pendingImport);
            // Clear the pending import data immediately
            context.globalState.update('pendingUmlChatImport', undefined);
        } catch (error) {
            console.error('Failed to import pending session:', error);
            vscode.window.showErrorMessage(`Failed to import UML chat session: ${error}`);
        }
    }
    
    // Create webview panel
    const panel = vscode.window.createWebviewPanel(
        'umlChatPanel',
        'UML Chat Designer',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, 'src', 'tools', 'ui'))
            ]
        }
    );

    // Get SVG pan-zoom library URI with error handling
    let svgPanZoomUri: vscode.Uri | undefined;
    try {
        const svgPanZoomPath = path.join(context.extensionPath, 'src/tools/ui/js/svg-pan-zoom.min.js');
        svgPanZoomUri = panel.webview.asWebviewUri(vscode.Uri.file(svgPanZoomPath));
        console.log('SVG pan-zoom URI:', svgPanZoomUri.toString());
    } catch (error) {
        console.error('Failed to create SVG pan-zoom URI:', error);
        vscode.window.showWarningMessage('SVG pan-zoom library could not be loaded. Zoom controls may not work properly.');
    }

    // Debounced functions for performance
    const debouncedUpdatePreview = debounce(async () => {
        const currentEngine = chatManager.getCurrentEngine() || 'plantuml';
        
        // Use unified panel for both engines
        if (currentEngine === 'mermaid') {
            // For Mermaid, render in the unified panel
            try {
                // Extract Mermaid code from the AI response
                const rawCode = chatManager.getCurrentPlantUML();
                const cleanMermaidCode = extractMermaidCode(rawCode);
                
                if (!cleanMermaidCode) {
                    panel.webview.postMessage({
                        command: 'showError',
                        error: 'No valid Mermaid code found'
                    });
                    return;
                }
                
                panel.webview.postMessage({
                    command: 'showMermaid',
                    mermaidCode: cleanMermaidCode
                });
            } catch (error) {
                console.error('Failed to render Mermaid in unified panel:', error);
                // Fallback to error display
                panel.webview.postMessage({
                    command: 'showError',
                    error: 'Failed to render Mermaid diagram'
                });
            }
        } else {
            // For PlantUML, render in the unified panel
            try {
                const svgContent = await factory.renderDiagram(currentEngine as EngineType, chatManager.getCurrentPlantUML());
        panel.webview.postMessage({
                    command: 'showPlantUML',
            svgContent: svgContent
        });
            } catch (error) {
                console.error('Failed to render PlantUML in unified panel:', error);
                panel.webview.postMessage({
                    command: 'showError',
                    error: 'Failed to render PlantUML diagram'
                });
            }
        }
    }, 300);

    const debouncedUpdateChat = debounce(() => {
        const chatHtml = generateChatHtml(chatManager.getChatHistory(), chatManager.getSelectedBotMessageIndex());
        panel.webview.postMessage({
            command: 'updateChat',
            chatHtml: chatHtml
        });
    }, 100);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
        try {
            switch (message.command) {
                case 'sendRequirement':
                    await handleSendRequirement(message, factory, chatManager, debouncedUpdateChat, debouncedUpdatePreview);
                    break;

                case 'renderSpecificUML':
                    await handleRenderSpecificUML(message, chatManager, factory, panel);
                    break;

                case 'exportSVG':
                    trackUsage('uml.chatPanel', 'exportSVG');
                    await handleExportSVG(message);
                    break;

                case 'clearChat':
                    trackUsage('uml.chatPanel', 'clearChat');
                    handleClearChat(chatManager, debouncedUpdateChat, debouncedUpdatePreview, context, userOnboardingState, panel);
                    break;

                case 'exportChat':
                    trackUsage('uml.chatPanel', 'exportChat');
                    await handleExportChat(chatManager, factory);
                    break;

                case 'importChat':
                    trackUsage('uml.chatPanel', 'importChat');
                    await handleImportChat(chatManager, debouncedUpdateChat, debouncedUpdatePreview);
                    break;

                case 'editAndResendUserMsg':
                    trackUsage('uml.chatPanel', 'editAndResend');
                    await handleEditAndResend(message, factory, chatManager, debouncedUpdateChat, debouncedUpdatePreview);
                    break;

                case 'deleteUserMsgAndFollowing':
                    trackUsage('uml.chatPanel', 'deleteUserMessage');
                    await handleDeleteUserMessage(message, chatManager, debouncedUpdateChat, debouncedUpdatePreview, context, userOnboardingState, panel, factory);
                    break;

                case 'onboardingComplete':
                    trackUsage('uml.chatPanel', 'onboardingComplete');
                    if (userOnboardingState) {
                        userOnboardingState.hasSeenOnboarding = true;
                        userOnboardingState.onboardingCompletedAt = Date.now();
                        await context.globalState.update('umlChatOnboardingState', userOnboardingState);
                    }
                    break;

                case 'onboardingSkip':
                    trackUsage('uml.chatPanel', 'onboardingSkip');
                    if (userOnboardingState) {
                        userOnboardingState.hasSeenOnboarding = true;
                        await context.globalState.update('umlChatOnboardingState', userOnboardingState);
                    }
                    break;

                case 'generateExample':
                    trackUsage('uml.chatPanel', 'generateExample');
                    // This will be handled by the webview JavaScript
                    break;

                default:
                    console.warn('Unknown command:', message.command);
            }
        } catch (error) {
            ErrorHandler.logError('WebviewMessage', error);
            panel.webview.postMessage({
                command: 'error',
                error: ErrorHandler.formatErrorMessage(error)
            });
        }
    }, undefined, context.subscriptions);

    // Initialize webview content
    panel.webview.html = WebviewHtmlGenerator.generateWebviewContent(
        chatManager.getChatHistory(),
        chatManager.getCurrentPlantUML(),
        false,
        svgPanZoomUri
    );

    // Initial preview update
    debouncedUpdatePreview();
    

}

/**
 * Handle sending a new requirement
 */
async function handleSendRequirement(
    message: any,
    factory: GeneratorFactory,
    chatManager: ChatManager,
    updateChat: () => void,
    updatePreview: () => void
) {
    const { text, diagramType, engineType = 'plantuml' } = message;
    
    // Track message sending usage
    trackUsage('uml.chatPanel', 'sendMessage', { diagramType, engineType });
    
    // Validate input
    const validation = InputValidator.validateRequirement(text);
    if (!validation.isValid) {
        throw new Error(validation.error);
    }

    if (!InputValidator.validateDiagramType(diagramType)) {
        throw new Error('Invalid diagram type');
    }

    // Validate engine type
    const validatedEngineType = factory.validateEngineType(engineType);

    // Add user message and loading indicator
    chatManager.addUserMessage(text);
    chatManager.addLoadingMessage();
    updateChat();

    try {
        // Generate diagram using the appropriate engine
        const response = await factory.generateDiagram(
            validatedEngineType,
            text,
            chatManager.getUserMessages(),
            diagramType as DiagramType
        );

        // Update state
        chatManager.removeLoadingMessage();
        chatManager.addBotMessage(response.plantUML, { stats: response.stats });
        chatManager.updatePlantUML(response.plantUML);
        chatManager.updateDiagramType(response.diagramType);
        chatManager.updateEngine(validatedEngineType);

        // Update UI
        updateChat();
        updatePreview();
    } catch (error) {
        chatManager.removeLoadingMessage();
        throw error;
    }
}

/**
 * Extract Mermaid code from AI response
 */
function extractMermaidCode(response: string): string {
    console.log('Extracting Mermaid code from:', response.substring(0, 200) + '...');
    
    // Check if this is actually PlantUML code (should not be processed by Mermaid renderer)
    if (response.includes('@startuml') || response.includes('@enduml')) {
        console.log('Detected PlantUML code in Mermaid renderer, returning empty string');
        return '';
    }
    
    // Try to find Mermaid code block with explicit mermaid language identifier
    const mermaidMatch = response.match(/```mermaid\s*([\s\S]*?)\s*```/i);
    if (mermaidMatch && mermaidMatch[1]) {
        const extracted = mermaidMatch[1].trim();
        console.log('Extracted Mermaid code (explicit):', extracted.substring(0, 100) + '...');
        return extracted;
    }
    
    // Try to find any code block and check if it looks like Mermaid
    const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        const extracted = codeBlockMatch[1].trim();
        // Check if the extracted code looks like Mermaid (contains sequenceDiagram, flowchart, etc.)
        if (extracted.includes('sequenceDiagram') || 
            extracted.includes('flowchart') || 
            extracted.includes('graph') ||
            extracted.includes('classDiagram') ||
            extracted.includes('stateDiagram') ||
            extracted.includes('erDiagram') ||
            extracted.includes('journey') ||
            extracted.includes('gantt') ||
            extracted.includes('pie') ||
            extracted.includes('gitgraph') ||
            extracted.includes('C4Context') ||
            extracted.includes('participant') ||
            extracted.includes('->>') ||
            extracted.includes('-->') ||
            extracted.includes('---')) {
            console.log('Extracted Mermaid code (detected):', extracted.substring(0, 100) + '...');
            return extracted;
        }
        console.log('Extracted code block (not Mermaid):', extracted.substring(0, 100) + '...');
    }
    
    // If no code blocks found, check if the entire response looks like Mermaid
    const trimmedResponse = response.trim();
    if (trimmedResponse.includes('sequenceDiagram') || 
        trimmedResponse.includes('flowchart') || 
        trimmedResponse.includes('graph') ||
        trimmedResponse.includes('classDiagram') ||
        trimmedResponse.includes('stateDiagram') ||
        trimmedResponse.includes('erDiagram') ||
        trimmedResponse.includes('journey') ||
        trimmedResponse.includes('gantt') ||
        trimmedResponse.includes('pie') ||
        trimmedResponse.includes('gitgraph') ||
        trimmedResponse.includes('C4Context') ||
        trimmedResponse.includes('participant') ||
        trimmedResponse.includes('->>') ||
        trimmedResponse.includes('-->') ||
        trimmedResponse.includes('---')) {
        console.log('Using entire response as Mermaid code');
        return trimmedResponse;
    }
    
    // If no code blocks found, assume the entire response is Mermaid code
    console.log('No code blocks found, using entire response');
    return response.trim();
}

/**
 * Handle rendering specific UML from chat history
 */
async function handleRenderSpecificUML(
    message: any,
    chatManager: ChatManager,
    factory: GeneratorFactory,
    panel: vscode.WebviewPanel
) {
    const { umlCode } = message;
    const currentEngine = chatManager.getCurrentEngine();
    
    try {
        chatManager.updatePlantUML(umlCode);
        
        // Find which bot message contains this UML code and set it as selected
        const chatHistory = chatManager.getChatHistory();
        const botMessageIndex = chatHistory.findIndex((msg, index) => 
            msg.role === 'bot' && msg.message.includes(umlCode)
        );
        if (botMessageIndex >= 0) {
            chatManager.setSelectedBotMessageIndex(botMessageIndex);
        }
        
        if (currentEngine === 'mermaid') {
            // For Mermaid, render in the unified panel
            try {
                // Extract Mermaid code from the AI response
                const cleanMermaidCode = extractMermaidCode(umlCode);
                
                if (!cleanMermaidCode) {
                    panel.webview.postMessage({
                        command: 'showError',
                        error: 'No valid Mermaid code found'
                    });
                    return;
                }
                
                panel.webview.postMessage({
                    command: 'showMermaid',
                    mermaidCode: cleanMermaidCode
                });
            } catch (error) {
                console.error('Failed to render Mermaid in unified panel:', error);
                // Fallback to error display
                panel.webview.postMessage({
                    command: 'showError',
                    error: 'Failed to render Mermaid diagram'
                });
            }
        } else {
            // For PlantUML, render in the unified panel
            try {
                const svgContent = await factory.renderDiagram(currentEngine, umlCode);
                panel.webview.postMessage({
                    command: 'showPlantUML',
                    svgContent: svgContent
                });
            } catch (error) {
                console.error('Failed to render PlantUML in unified panel:', error);
                panel.webview.postMessage({
                    command: 'showError',
                    error: 'Failed to render PlantUML diagram'
                });
            }
        }
    } catch (error: any) {
        console.error('Failed to render UML:', error);
        panel.webview.postMessage({
            command: 'error',
            error: 'Failed to render diagram'
        });
    }
}

/**
 * Handle SVG export
 */
async function handleExportSVG(message: any) {
    const { svgContent } = message;
    
    const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('diagram.svg'),
        filters: { 'SVG files': ['svg'] }
    });

    if (saveUri) {
        await vscode.workspace.fs.writeFile(saveUri, Buffer.from(svgContent, 'utf8'));
        vscode.window.showInformationMessage('SVG exported successfully!');
    }
}

/**
 * Handle clearing chat
 */
function handleClearChat(
    chatManager: ChatManager,
    updateChat: () => void,
    updatePreview: () => void,
    context?: vscode.ExtensionContext,
    userOnboardingState?: UserOnboardingState,
    panel?: vscode.WebviewPanel
) {
    console.log('handleClearChat called with:', {
        hasUserOnboardingState: !!userOnboardingState,
        hasSeenOnboarding: userOnboardingState?.hasSeenOnboarding,
        hasPanel: !!panel,
        chatHistoryLength: chatManager.getChatHistory().length
    });

    chatManager.clearHistory();
    updateChat();
    
    // Clear the PlantUML and show tutorial for new users
    chatManager.clearPlantUML();
    
    // Clear the preview for all users
    updatePreview();
}

/**
 * Handle exporting chat session
 */
async function handleExportChat(chatManager: ChatManager, factory: GeneratorFactory) {
    const sessionData = chatManager.exportSession();
    
    // Generate smart filename
    let suggestedFilename = 'chat-session.umlchat';
    
    try {
        // Try AI-generated filename first
        const currentEngine = chatManager.getCurrentEngine();
        const userMessages = chatManager.getUserMessages();
        const diagramType = chatManager.getLastDiagramType();
        
        const generator = factory.getGenerator(currentEngine);
        const aiFilename = await generator.generateSmartFilename(userMessages, diagramType);
        if (aiFilename && aiFilename.length > 0) {
            suggestedFilename = `${aiFilename}.umlchat`;
        } else {
            // Fallback to local filename generation
            suggestedFilename = `${chatManager.generateSmartFilename()}.umlchat`;
        }
    } catch (error) {
        console.warn('Smart filename generation failed, using default:', error);
       
        suggestedFilename = `${chatManager.generateSmartFilename()}.umlchat`;
    }
    
    const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(suggestedFilename),
        filters: { 'UML Chat files': ['umlchat'] }
    });

    if (saveUri) {
        await vscode.workspace.fs.writeFile(
            saveUri, 
            Buffer.from(JSON.stringify(sessionData, null, 2), 'utf8')
        );
        vscode.window.showInformationMessage('Chat session exported successfully!');
    }
}

/**
 * Handle importing chat session
 */
async function handleImportChat(
    chatManager: ChatManager,
    updateChat: () => void,
    updatePreview: () => void
) {
    const openUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        filters: { 'UML Chat files': ['umlchat'] }
    });

    if (openUri && openUri[0]) {
        try {
            const fileContent = await vscode.workspace.fs.readFile(openUri[0]);
            const sessionData = JSON.parse(fileContent.toString());
            
            chatManager.importSession(sessionData);
            updateChat();
            updatePreview();
            
            // vscode.window.showInformationMessage('Chat session imported successfully!');
        } catch (error) {
            throw new Error('Failed to import chat session: ' + ErrorHandler.formatErrorMessage(error));
        }
    }
}

/**
 * Handle editing and resending user message
 */
async function handleEditAndResend(
    message: any,
    factory: GeneratorFactory,
    chatManager: ChatManager,
    updateChat: () => void,
    updatePreview: () => void
) {
    const { index, newText, diagramType, engineType } = message;
    
    // Validate input
    const validation = InputValidator.validateRequirement(newText);
    if (!validation.isValid) {
        throw new Error(validation.error);
    }

    // Edit message and clear subsequent history
    chatManager.editUserMessage(index, newText);
    chatManager.addLoadingMessage();
    updateChat();

    try {
        // Use the selected diagram type if provided, otherwise use the last diagram type
        const selectedDiagramType = diagramType || chatManager.getLastDiagramType();
        
        // Regenerate from edited message using chosen engine (fallback to current if not provided)
        const engineForEdit = engineType ? factory.validateEngineType(engineType) : chatManager.getCurrentEngine();
        const response = await factory.generateDiagram(
            engineForEdit,
            newText,
            chatManager.getUserMessages(),
            selectedDiagramType
        );

        // Update state
        chatManager.removeLoadingMessage();
        chatManager.addBotMessage(response.plantUML, { stats: response.stats });
        chatManager.updatePlantUML(response.plantUML);
        chatManager.updateDiagramType(response.diagramType);
        chatManager.updateEngine(engineForEdit);

        // Update UI
        updateChat();
        updatePreview();
    } catch (error) {
        chatManager.removeLoadingMessage();
        throw error;
    }
}

/**
 * Handle deleting user message and all following history
 */
async function handleDeleteUserMessage(
    message: any,
    chatManager: ChatManager,
    updateChat: () => void,
    updatePreview: () => void,
    context?: vscode.ExtensionContext,
    userOnboardingState?: UserOnboardingState,
    panel?: vscode.WebviewPanel,
    factory?: GeneratorFactory
) {
    const { index } = message;
    chatManager.deleteUserMessage(index);
    updateChat();
    
    // Check if there's any remaining history
    const chatHistory = chatManager.getChatHistory();
    const hasHistory = chatHistory.length > 0;
    
    if (hasHistory) {
        // If there's history, just update the preview with the existing PlantUML
        // Don't regenerate to avoid adding new messages
        updatePreview();
    } else {
        // If no history, clear the PlantUML and show tutorial for new users
        chatManager.clearPlantUML();
        
        if (userOnboardingState && !userOnboardingState.hasSeenOnboarding && panel) {
            // Show tutorial
            panel.webview.postMessage({ command: 'showOnboarding' });
        } else {
            // Clear the preview for existing users
            updatePreview();
        }
    }
}

/**
 * Generate HTML for chat messages
 */
function generateChatHtml(chatHistory: any[], selectedBotMessageIndex: number = -1): string {
    // Use the provided selectedBotMessageIndex, or fall back to the last bot message if none selected
    const activeBotMessageIndex = selectedBotMessageIndex >= 0 ? selectedBotMessageIndex : chatHistory.map(h => h.role).lastIndexOf('bot');

    function formatStats(stats: any): string {
        if (!stats) { return ''; }
        const msToS = (ms?: number) => ms === undefined || ms === null ? undefined : (ms >= 1000 ? (ms/1000).toFixed(ms >= 10000 ? 0 : 2) + 's' : ms + 'ms');
        const badges: string[] = [];
        const badge = (icon: string, label: string, value?: string, title?: string) => {
            if (!value) { return; }
            badges.push(`<span class=\"stat-badge\" title=\"${title || label}\">${icon} <b>${label}</b> ${value}</span>`);
        };
        // Timing
        badge('⏱', 'T', msToS(stats.totalMs), 'Total time');
        if (stats.firstByteMs !== undefined) { badge('↘', 'W', msToS(stats.firstByteMs), 'Wait (time to first byte)'); }
        if (stats.generationMs !== undefined) { badge('⚙', 'G', msToS(stats.generationMs), 'Generation time after first byte'); }
        // Model / engine
        if (stats.modelId) { badge('🤖', 'M', stats.modelId, 'Model'); }
        if (stats.engine) { badge('🔧', 'E', stats.engine, 'Engine'); }
        const style = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;font-size:10.5px;font-family:var(--vscode-editor-font-family,monospace);color:#555;';
        const badgeStyle = `.stat-badge{background:var(--vscode-input-border,rgba(0,0,0,0.06));padding:2px 8px;border-radius:14px;line-height:1.2;border:1px solid var(--vscode-editorWidget-border,rgba(0,0,0,0.12));display:inline-flex;align-items:center;gap:4px;}`;
        return `<div class=\"llm-stats\" style=\"${style}\"><style>${badgeStyle}</style>${badges.join('')}</div>`;
    }

    return chatHistory.map((h, index) => {
        const messageContent = `<pre style="white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${h.message}</pre>`;
        const statsFooter = h.role === 'bot' && h.meta?.stats ? formatStats(h.meta.stats) : '';
        if (h.role === 'bot') {
            const isActive = index === activeBotMessageIndex;
            const isLoading = h.message === 'Generating diagram, please wait...';
            return `\n                <div class="bot-message ${isActive ? 'active-message' : ''}${isLoading ? ' loading-message' : ''}" onclick="handleBotMessageClick(this)">\n                    <b>Bot:</b> ${messageContent}${statsFooter}\n                </div>`;
        }
        // User message with edit button
        return `<div class="user" data-index="${index}">
                    <div class="user-message-content"><b>You:</b> ${messageContent}</div>
                    <div class="user-message-actions">
                        <button class='edit-user-msg-btn' title='Edit and resend'>✏️</button>
                        <button class='delete-user-msg-btn' title='Delete this request and all following history'>🗑️</button>
                    </div>
                </div>`;
    }).join('');
}
