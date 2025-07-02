/**
 * UML Chat Panel - Refactored main entry point
 * This file orchestrates the UML chat functionality using modular components
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { UMLGenerator } from './uml/generator';
import { ChatManager } from './chat/chatManager';
import { UMLRenderer } from './uml/renderer';
import { WebviewHtmlGenerator } from './ui/webviewHtmlGenerator';
import { InputValidator, ErrorHandler, debounce } from './utils/helpers';
import { DiagramType, WebviewMessage } from './uml/types';

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
    // Initialize components
    const generator = new UMLGenerator();
    const chatManager = new ChatManager();
    const renderer = new UMLRenderer();
    
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
        const svgContent = await renderer.renderToSVG(chatManager.getCurrentPlantUML());
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
                    await handleSendRequirement(message, generator, chatManager, debouncedUpdateChat, debouncedUpdatePreview);
                    break;

                case 'renderSpecificUML':
                    await handleRenderSpecificUML(message, chatManager, renderer, panel);
                    break;

                case 'exportSVG':
                    await handleExportSVG(message);
                    break;

                case 'clearChat':
                    handleClearChat(chatManager, debouncedUpdateChat, debouncedUpdatePreview);
                    break;

                case 'exportChat':
                    await handleExportChat(chatManager);
                    break;

                case 'importChat':
                    await handleImportChat(chatManager, debouncedUpdateChat, debouncedUpdatePreview);
                    break;

                case 'editAndResendUserMsg':
                    await handleEditAndResend(message, generator, chatManager, debouncedUpdateChat, debouncedUpdatePreview);
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
    generator: UMLGenerator,
    chatManager: ChatManager,
    updateChat: () => void,
    updatePreview: () => void
) {
    const { text, diagramType } = message;
    
    // Validate input
    const validation = InputValidator.validateRequirement(text);
    if (!validation.isValid) {
        throw new Error(validation.error);
    }

    if (!InputValidator.validateDiagramType(diagramType)) {
        throw new Error('Invalid diagram type');
    }

    // Add user message and loading indicator
    chatManager.addUserMessage(text);
    chatManager.addLoadingMessage();
    updateChat();

    try {
        // Generate UML
        const response = await generator.generateFromRequirement(
            text,
            chatManager.getUserMessages(),
            diagramType as DiagramType
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
 * Handle rendering specific UML from chat history
 */
async function handleRenderSpecificUML(
    message: any,
    chatManager: ChatManager,
    renderer: UMLRenderer,
    panel: vscode.WebviewPanel
) {
    const { umlCode } = message;
    
    if (renderer.isValidPlantUML(umlCode)) {
        chatManager.updatePlantUML(umlCode);
        const svgContent = await renderer.renderToSVG(umlCode);
        panel.webview.postMessage({
            command: 'updatePreview',
            svgContent: svgContent
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
async function handleExportChat(chatManager: ChatManager) {
    const sessionData = chatManager.exportSession();
    
    const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('chat-session.umlchat'),
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
            
            vscode.window.showInformationMessage('Chat session imported successfully!');
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
    generator: UMLGenerator,
    chatManager: ChatManager,
    updateChat: () => void,
    updatePreview: () => void
) {
    const { index, newText } = message;
    
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
        // Regenerate from edited message
        const response = await generator.generateFromRequirement(
            newText,
            chatManager.getUserMessages(),
            chatManager.getLastDiagramType()
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
 * Generate HTML for chat messages
 */
function generateChatHtml(chatHistory: any[]): string {
    const lastBotMessageIndex = chatHistory.map(h => h.role).lastIndexOf('bot');

    return chatHistory.map((h, index) => {
        const messageContent = `<pre style="white-space: pre-wrap; word-break: break-all;">${h.message}</pre>`;
        
        if (h.role === 'bot') {
            const isActive = index === lastBotMessageIndex;
            const isLoading = h.message === 'Generating diagram, please wait...';
            return `\n                <div class="bot-message ${isActive ? 'active-message' : ''}${isLoading ? ' loading-message' : ''}" onclick="handleBotMessageClick(this)">\n                    <b>Bot:</b> ${messageContent}\n                </div>`;
        }
        
        // User message with edit button
        return `<div class="user" data-index="${index}"><b>You:</b> ${messageContent} <button class='edit-user-msg-btn' title='Edit and resend'>✏️</button></div>`;
    }).join('');
}
