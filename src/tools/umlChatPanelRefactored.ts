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
        const svgContent = await factory.renderDiagram(currentEngine as EngineType, chatManager.getCurrentPlantUML());
        panel.webview.postMessage({
            command: 'updatePreview',
            svgContent: svgContent
        });
    }, 300);

    const debouncedUpdateChat = debounce(() => {
        const chatHtml = generateChatHtml(chatManager.getChatHistory());
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
                    handleClearChat(chatManager, debouncedUpdateChat, debouncedUpdatePreview);
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
    
    // Check if we should show onboarding for new users
    setTimeout(() => {
        if (!userOnboardingState.hasSeenOnboarding) {
            panel.webview.postMessage({ command: 'showOnboarding' });
        }
    }, 1000); // Delay to ensure webview is fully loaded
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
        chatManager.addBotMessage(response.plantUML);
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
    
    // For now, we'll use the current engine to render
    // In the future, we could detect the code type and use appropriate renderer
    try {
        chatManager.updatePlantUML(umlCode);
        const svgContent = await factory.renderDiagram(currentEngine, umlCode);
        panel.webview.postMessage({
            command: 'updatePreview',
            svgContent: svgContent
        });
    } catch (error) {
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
    updatePreview: () => void
) {
    chatManager.clearHistory();
    updateChat();
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
        // Fallback to local filename generation
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
    const { index, newText, diagramType } = message;
    
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
        
        // Regenerate from edited message using current engine
        const currentEngine = chatManager.getCurrentEngine();
        const response = await factory.generateDiagram(
            currentEngine,
            newText,
            chatManager.getUserMessages(),
            selectedDiagramType
        );

        // Update state
        chatManager.removeLoadingMessage();
        chatManager.addBotMessage(response.plantUML);
        chatManager.updatePlantUML(response.plantUML);
        chatManager.updateDiagramType(response.diagramType);

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
function generateChatHtml(chatHistory: any[]): string {
    const lastBotMessageIndex = chatHistory.map(h => h.role).lastIndexOf('bot');

    return chatHistory.map((h, index) => {
        const messageContent = `<pre style="white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${h.message}</pre>`;
        
        if (h.role === 'bot') {
            const isActive = index === lastBotMessageIndex;
            const isLoading = h.message === 'Generating diagram, please wait...';
            return `\n                <div class="bot-message ${isActive ? 'active-message' : ''}${isLoading ? ' loading-message' : ''}" onclick="handleBotMessageClick(this)">\n                    <b>Bot:</b> ${messageContent}\n                </div>`;
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
