/**
 * HTML Template Generator for UML Chat Panel Webview
 */

import * as vscode from 'vscode';
import { DIAGRAM_TYPES } from '../uml/constants';
import { ChatMessage } from '../uml/types';

export class WebviewHtmlGenerator {
    /**
     * Generate complete HTML content for the webview
     */
    static generateWebviewContent(
        chatHistory: ChatMessage[],
        plantUML: string,
        loading = false,
        svgPanZoomUri?: vscode.Uri
    ): string {
        const chatHtml = this.generateChatHtml(chatHistory);
        const diagramTypeOptions = this.generateDiagramTypeOptions();
        const svgPanZoomUriString = svgPanZoomUri?.toString() || '';

        return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UML Chat Designer</title>
        <style>
            ${this.generateCSS()}
        </style>
    </head>
    <body>
        <div id="container">
            <div id="leftPanel">
                <div id="chat">${chatHtml}</div>
                <div id="inputArea" style="flex: 0 0 auto; display: flex; flex-direction: column; padding: 10px; border-top: 1px solid #eee; background: #f9f9f9;">
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
                            <div class="dropdown">
                                <button id="moreActionsBtn" class="icon-only" title="More Actions">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                                </button>
                                <div id="moreActionsDropdown" class="dropdown-content">
                                    <button id="saveChatBtn" title="Save current session to a .umlchat file" aria-label="Save Chat Session">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                        <span>Save Session</span>
                                    </button>
                                    <button id="importBtn" title="Import a .umlchat session file" aria-label="Import Chat Session">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                        <span>Import</span>
                                    </button>
                                    <button id="exportSVGBtn" title="Export diagram as SVG" aria-label="Export SVG">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        <span>Export SVG</span>
                                    </button>
                                    <button id="clearChatBtn" class="danger" title="Clear Chat History" aria-label="Clear Chat">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                                        <span>Clear Chat</span>
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
        ${svgPanZoomUriString ? `<script src="${svgPanZoomUriString}"></script>` : '<!-- SVG pan-zoom library not available -->'}
        <script>
            // Check if SVG pan-zoom library loaded
            const hasSvgPanZoom = typeof window.svgPanZoom !== 'undefined';
            if (!hasSvgPanZoom) {
                console.warn('SVG pan-zoom library not loaded, using fallback zoom controls');
            }
            ${this.generateJavaScript()}
        </script>
    </body>
    </html>
    `;
    }

    /**
     * Generate chat HTML from chat history
     */
    private static generateChatHtml(chatHistory: ChatMessage[]): string {
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

    /**
     * Generate diagram type options for dropdown
     */
    private static generateDiagramTypeOptions(): string {
        return DIAGRAM_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
    }

    /**
     * Generate CSS styles
     */
    private static generateCSS(): string {
        return `
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
                bottom: 30px !important;
                right: 30px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
                z-index: 1000 !important;
                /* Windows-specific improvements */
                pointer-events: auto !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                /* Ensure controls are always visible */
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 12px !important;
                padding: 8px !important;
                backdrop-filter: blur(8px) !important;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
            }
            .zoom-btn {
                background: rgba(255, 255, 255, 0.95) !important;
                border: 2px solid #007acc !important;
                border-radius: 8px !important;
                padding: 10px !important;
                cursor: pointer !important;
                font-size: 18px !important;
                font-weight: bold !important;
                color: #007acc !important;
                box-shadow: 0 3px 8px rgba(0,123,255,0.3) !important;
                transition: all 0.2s ease !important;
                width: 42px !important;
                height: 42px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                backdrop-filter: blur(4px) !important;
                /* Windows-specific improvements for better clickability */
                pointer-events: auto !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                /* Ensure buttons are clickable on Windows */
                touch-action: manipulation !important;
                -ms-touch-action: manipulation !important;
                outline: none !important;
                /* Force hardware acceleration for better performance */
                transform: translateZ(0) !important;
                -webkit-transform: translateZ(0) !important;
                will-change: transform, background, border-color !important;
                /* Ensure proper layering */
                position: relative !important;
                z-index: 101 !important;
            }
            .zoom-btn:hover {
                background: rgba(0, 123, 255, 0.1) !important;
                border-color: #0056b3 !important;
                color: #0056b3 !important;
                transform: translateY(-2px) translateZ(0) !important;
                box-shadow: 0 6px 12px rgba(0,123,255,0.4) !important;
                /* Enhanced Windows hover effects */
                scale: 1.05 !important;
            }
            .zoom-btn:active {
                transform: translateY(0) translateZ(0) !important;
                box-shadow: 0 2px 6px rgba(0,123,255,0.3) !important;
                background: rgba(0, 123, 255, 0.2) !important;
                scale: 0.98 !important;
            }
            .zoom-btn:focus {
                outline: 3px solid #007acc !important;
                outline-offset: 2px !important;
                background: rgba(0, 123, 255, 0.1) !important;
            }

            /* --- Left Panel Content --- */
            #chat {
                flex: 1 1 0;
                overflow-y: auto;
                background: #f5f5f5;
                padding: 10px;
                border-bottom: 1px solid #eee;
                min-height: 200px;
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

            /* --- Input Area & Actions --- */
            #inputArea { 
                flex: 0 0 auto; 
                display: flex; 
                flex-direction: column; 
                padding: 10px 10px 4px 10px;
                border-top: 1px solid #eee; 
                background: #f9f9f9; 
            }
            #requirementInput { width: 100%; box-sizing: border-box; min-height: 60px; max-height: 120px; padding: 8px; font-size: 1.1em; resize: vertical; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }
            
            /* --- Button Layout and Styling --- */
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

            /* --- Dropdown Menu for 'More Actions' --- */
            .dropdown { position: relative; display: inline-block; }
            .dropdown-content {
                display: none;
                position: absolute;
                bottom: calc(100% + 5px);
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

            /* --- Loading Message Style --- */
            .loading-message { font-style: italic; color: #888; background: #f5f5f5 !important; border-style: dashed !important; }
        `;
    }

    /**
     * Generate JavaScript for webview functionality
     */
    private static generateJavaScript(): string {
        return `
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
            const leftPanel = document.getElementById('leftPanel');
            const rightPanel = document.getElementById('rightPanel');
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const zoomResetBtn = document.getElementById('zoomResetBtn');
            const chat = document.getElementById('chat');

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
                }
            }

            // --- Dropdown Menu Logic ---
            moreActionsBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                moreActionsDropdown.classList.toggle('show');
            });
            window.addEventListener('click', (event) => {
                if (!moreActionsBtn.contains(event.target)) {
                    if (moreActionsDropdown.classList.contains('show')) {
                        moreActionsDropdown.classList.remove('show');
                    }
                }
            });

            // --- Event Listeners ---
            sendBtn.onclick = () => {
                vscode.postMessage({ command: 'sendRequirement', text: requirementInput.value, diagramType: document.getElementById('diagramType').value });
                requirementInput.value = '';
            };
            
            requirementInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    sendBtn.click(); 
                }
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    sendBtn.click();
                }
            });
            
            document.addEventListener('keydown', (e) => {
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
                
                if (isFullscreen) {
                    expandBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="10" y1="14" x2="3" y2="21"/></svg>';
                    expandBtn.title = "Collapse Chat Panel";
                } else {
                    expandBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
                    expandBtn.title = "Expand Chat Panel";
                }
            };

            // --- Dragbar for resizing ---
            const dragbar = document.getElementById('dragbar');
            let isDragging = false;
            
            const startDrag = (e) => {
                isDragging = true;
                document.body.style.cursor = 'ew-resize';
                document.body.style.userSelect = 'none';
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
            
            dragbar.addEventListener('mousedown', startDrag);
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', endDrag);
            
            dragbar.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
            document.addEventListener('touchmove', (e) => handleDrag(e.touches[0]));
            document.addEventListener('touchend', endDrag);

            // --- SVG Pan & Zoom ---
            let panZoomInstance;
            let fallbackZoomLevel = 1;
            function enablePanZoom() {
                try {
                    if(panZoomInstance) { 
                        panZoomInstance.destroy(); 
                        panZoomInstance = null;
                    }
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (!svgEl) {
                        console.warn('No SVG element found for pan-zoom initialization');
                        return;
                    }
                    
                    // Validate SVG before initializing pan-zoom
                    const container = document.getElementById('svgPreview');
                    const svgViewBox = svgEl.getAttribute('viewBox');
                    const svgWidth = svgEl.getAttribute('width');
                    const svgHeight = svgEl.getAttribute('height');
                    
                    console.log('SVG validation:', { 
                        hasViewBox: !!svgViewBox, 
                        hasWidth: !!svgWidth, 
                        hasHeight: !!svgHeight,
                        viewBox: svgViewBox,
                        width: svgWidth,
                        height: svgHeight
                    });
                    
                    // Check for valid dimensions
                    let hasValidDimensions = false;
                    if (svgViewBox) {
                        const viewBoxValues = svgViewBox.split(' ');
                        if (viewBoxValues.length === 4) {
                            const vbWidth = parseFloat(viewBoxValues[2]);
                            const vbHeight = parseFloat(viewBoxValues[3]);
                            hasValidDimensions = !isNaN(vbWidth) && !isNaN(vbHeight) && vbWidth > 0 && vbHeight > 0;
                        }
                    } else if (svgWidth && svgHeight) {
                        const width = parseFloat(svgWidth);
                        const height = parseFloat(svgHeight);
                        hasValidDimensions = !isNaN(width) && !isNaN(height) && width > 0 && height > 0;
                    }
                    
                    if (!hasValidDimensions) {
                        console.warn('SVG has invalid or missing dimensions, setting fallback dimensions');
                        // Set fallback dimensions
                        svgEl.setAttribute('viewBox', '0 0 400 300');
                        svgEl.setAttribute('width', '400');
                        svgEl.setAttribute('height', '300');
                    }
                    
                    if (window.svgPanZoom && hasSvgPanZoom) {
                        const containerWidth = container ? container.clientWidth : window.innerWidth;
                        const containerHeight = container ? container.clientHeight : window.innerHeight;
                        
                        svgEl.style.display = 'block';
                        svgEl.style.margin = '0';
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        
                        // Get final dimensions after potential fallback
                        const finalViewBox = svgEl.getAttribute('viewBox');
                        const finalWidth = svgEl.getAttribute('width');
                        const finalHeight = svgEl.getAttribute('height');
                        
                        if (finalWidth && finalHeight) {
                            const aspectRatio = parseFloat(finalWidth) / parseFloat(finalHeight);
                            const containerAspectRatio = containerWidth / containerHeight;
                            
                            if (aspectRatio > containerAspectRatio) {
                                svgEl.style.width = '100%';
                                svgEl.style.height = 'auto';
                            } else {
                                svgEl.style.width = 'auto';
                                svgEl.style.height = '100%';
                            }
                        } else if (finalViewBox) {
                            const viewBoxValues = finalViewBox.split(' ');
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
                            }
                        }
                        
                        svgEl.style.maxWidth = 'none';
                        svgEl.style.maxHeight = 'none';
                        
                        try {
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
                                preventMouseEventsDefault: true,
                                contain: false,
                                viewportSelector: '#svgPreview',
                                beforeZoom: function(oldZoom, newZoom) {
                                    return newZoom >= 0.1 && newZoom <= 10;
                                },
                                onZoom: function(level) {
                                    if (container) {
                                        container.style.overflow = 'auto';
                                    }
                                    console.log('Zoom level:', level);
                                }
                            });
                            console.log('Pan-zoom initialized successfully');
                        } catch (panZoomError) {
                            console.error('Failed to initialize svg-pan-zoom:', panZoomError);
                            panZoomInstance = null;
                            // Apply basic styling without pan-zoom
                            svgEl.style.width = '100%';
                            svgEl.style.height = 'auto';
                            svgEl.style.maxWidth = 'none';
                            svgEl.style.maxHeight = 'none';
                        }
                    } else {
                        console.warn('SVG element found but svgPanZoom library not available, using fallback');
                        // Basic fallback styling
                        svgEl.style.display = 'block';
                        svgEl.style.margin = '0';
                        svgEl.style.width = '100%';
                        svgEl.style.height = 'auto';
                        svgEl.style.maxWidth = 'none';
                        svgEl.style.maxHeight = 'none';
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        fallbackZoomLevel = 1;
                    }
                } catch (error) {
                    console.error('Error initializing pan-zoom:', error);
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (svgEl) {
                        svgEl.style.display = 'block';
                        svgEl.style.margin = '0';
                        svgEl.style.width = '100%';
                        svgEl.style.height = 'auto';
                        svgEl.style.maxWidth = 'none';
                        svgEl.style.maxHeight = 'none';
                        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        fallbackZoomLevel = 1;
                    }
                }
            }

            // --- Custom Zoom Control Functions ---
            function setupZoomControls() {
                console.log('Setting up Windows-optimized zoom controls...');
                
                // Simple, robust zoom implementation for Windows
                let currentZoomLevel = 1.0;
                const minZoom = 0.1;
                const maxZoom = 5.0;
                const zoomStep = 0.2;
                
                function applyZoom(newZoom, svgEl) {
                    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
                    currentZoomLevel = newZoom;
                    
                    // Clear any existing transforms
                    svgEl.style.transform = '';
                    svgEl.style.zoom = '';
                    svgEl.style.scale = '';
                    
                    // Apply zoom using multiple methods for Windows compatibility
                    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
                    
                    if (isWindows) {
                        // Use CSS zoom property for Windows (best compatibility)
                        svgEl.style.zoom = newZoom.toString();
                        console.log('Applied Windows CSS zoom:', newZoom);
                    } else {
                        // Use transform scale for other platforms
                        svgEl.style.transform = 'scale(' + newZoom + ')';
                        svgEl.style.transformOrigin = 'center center';
                        console.log('Applied transform scale:', newZoom);
                    }
                    
                    // Ensure proper positioning
                    svgEl.style.display = 'block';
                    svgEl.style.margin = '0 auto';
                    
                    return newZoom;
                }
                
                function getZoomLevel() {
                    return currentZoomLevel;
                }
                
                // Enhanced button event handlers
                function setupButton(button, action) {
                    if (!button) return;
                    
                    // Remove all existing listeners
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);
                    
                    // Add comprehensive event handling
                    const events = ['click', 'mousedown', 'touchstart'];
                    
                    events.forEach(eventType => {
                        newButton.addEventListener(eventType, function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            
                            console.log('Button clicked:', action, 'Event:', eventType);
                            
                            const svgEl = document.querySelector('#svgPreview svg');
                            if (!svgEl) {
                                console.log('No SVG element found');
                                return false;
                            }
                            
                            let success = false;
                            
                            // Try svg-pan-zoom first if available
                            if (panZoomInstance && hasSvgPanZoom) {
                                try {
                                    switch(action) {
                                        case 'zoomIn':
                                            if (typeof panZoomInstance.zoomIn === 'function') {
                                                panZoomInstance.zoomIn();
                                                success = true;
                                                console.log('svg-pan-zoom zoomIn succeeded');
                                            }
                                            break;
                                        case 'zoomOut':
                                            if (typeof panZoomInstance.zoomOut === 'function') {
                                                panZoomInstance.zoomOut();
                                                success = true;
                                                console.log('svg-pan-zoom zoomOut succeeded');
                                            }
                                            break;
                                        case 'zoomReset':
                                            if (typeof panZoomInstance.reset === 'function') {
                                                panZoomInstance.reset();
                                                success = true;
                                                console.log('svg-pan-zoom reset succeeded');
                                            }
                                            break;
                                    }
                                } catch (error) {
                                    console.warn('svg-pan-zoom operation failed:', error);
                                    success = false;
                                }
                            }
                            
                            // Use fallback if svg-pan-zoom failed or not available
                            if (!success) {
                                console.log('Using fallback zoom for:', action);
                                const currentZoom = getZoomLevel();
                                let newZoom = currentZoom;
                                
                                switch(action) {
                                    case 'zoomIn':
                                        newZoom = currentZoom + zoomStep;
                                        break;
                                    case 'zoomOut':
                                        newZoom = currentZoom - zoomStep;
                                        break;
                                    case 'zoomReset':
                                        newZoom = 1.0;
                                        break;
                                }
                                
                                const appliedZoom = applyZoom(newZoom, svgEl);
                                console.log('Fallback zoom applied:', appliedZoom);
                            }
                            
                            return false;
                        }, { passive: false, capture: true });
                    });
                    
                    return newButton;
                }
                
                // Setup all zoom buttons
                const zoomInButton = setupButton(document.getElementById('zoomInBtn'), 'zoomIn');
                const zoomOutButton = setupButton(document.getElementById('zoomOutBtn'), 'zoomOut');
                const zoomResetButton = setupButton(document.getElementById('zoomResetBtn'), 'zoomReset');
                
                console.log('Windows-optimized zoom controls setup completed');
                console.log('Buttons configured:', {
                    zoomIn: !!zoomInButton,
                    zoomOut: !!zoomOutButton,
                    zoomReset: !!zoomResetButton
                });
                
                // Test zoom functionality
                setTimeout(() => {
                    const svgEl = document.querySelector('#svgPreview svg');
                    if (svgEl) {
                        console.log('Testing initial zoom setup...');
                        applyZoom(1.0, svgEl);
                        console.log('Initial zoom test completed');
                    }
                }, 500);
            }

            // Initial setup only if SVG exists
            const initialSvg = document.querySelector('#svgPreview svg');
            console.log('Initial SVG check:', !!initialSvg);
            console.log('Setting up zoom controls on page load...');
            
            // Always set up zoom controls, even without SVG initially
            setupZoomControls();

            // --- VS Code Message Handling ---
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    const svgContainer = document.getElementById('svgPreview');
                    if (svgContainer) {
                        svgContainer.innerHTML = '';
                        if (window.gc) {
                            setTimeout(() => window.gc(), 100);
                        }
                    }
                    
                    // Validate SVG content before inserting
                    if (!message.svgContent || message.svgContent.trim().length === 0) {
                        console.warn('Empty or invalid SVG content received');
                        svgContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-family: Arial, sans-serif;">No diagram content available</div>';
                        return;
                    }
                    
                    // Check if the SVG content looks valid
                    if (!message.svgContent.includes('<svg')) {
                        console.warn('SVG content does not contain <svg> tag');
                        svgContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-family: Arial, sans-serif;">Invalid diagram format</div>';
                        return;
                    }
                    
                    svgContainer.innerHTML = message.svgContent;
                    
                    const newSvgEl = svgContainer.querySelector('svg');
                    if (newSvgEl) {
                        const originalWidth = newSvgEl.getAttribute('width');
                        const originalHeight = newSvgEl.getAttribute('height');
                        const viewBox = newSvgEl.getAttribute('viewBox');
                        console.log('SVG dimensions before fix:', { originalWidth, originalHeight, viewBox });
                        
                        // Ensure SVG has valid dimensions
                        if (!originalWidth || !originalHeight || originalWidth === 'null' || originalHeight === 'null') {
                            console.log('Setting fallback SVG dimensions');
                            newSvgEl.setAttribute('width', '400');
                            newSvgEl.setAttribute('height', '300');
                        }
                        
                        if (!viewBox || viewBox === 'null') {
                            console.log('Setting fallback SVG viewBox');
                            const width = newSvgEl.getAttribute('width') || '400';
                            const height = newSvgEl.getAttribute('height') || '300';
                            newSvgEl.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
                        }
                        
                        newSvgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        newSvgEl.style.display = 'block';
                        newSvgEl.style.margin = '0';
                        
                        const containerWidth = svgContainer.clientWidth;
                        const containerHeight = svgContainer.clientHeight;
                        
                        const finalWidth = newSvgEl.getAttribute('width');
                        const finalHeight = newSvgEl.getAttribute('height');
                        
                        if (finalWidth && finalHeight) {
                            const aspectRatio = parseFloat(finalWidth) / parseFloat(finalHeight);
                            const containerAspectRatio = containerWidth / containerHeight;
                            
                            if (aspectRatio > containerAspectRatio) {
                                newSvgEl.style.width = '100%';
                                newSvgEl.style.height = 'auto';
                            } else {
                                newSvgEl.style.width = 'auto';
                                newSvgEl.style.height = '100%';
                            }
                        } else {
                            newSvgEl.style.width = '100%';
                            newSvgEl.style.height = 'auto';
                        }
                        
                        newSvgEl.style.maxWidth = 'none';
                        newSvgEl.style.maxHeight = 'none';
                        
                        console.log('SVG configured for maximum space usage');
                    } else {
                        console.warn('No SVG element found in the inserted content');
                        svgContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-family: Arial, sans-serif;">Failed to load diagram</div>';
                        return;
                    }
                    
                    setTimeout(() => {
                        enablePanZoom();
                        setupZoomControls();
                    }, 100);
                } else if (message.command === 'updateChat') {
                    document.getElementById('chat').innerHTML = message.chatHtml;
                    const chatDiv = document.getElementById('chat');
                    if (chatDiv) {
                        chatDiv.scrollTop = chatDiv.scrollHeight;
                    }
                } else if (message.command === 'error') {
                    console.error('Extension error:', message.error);
                    const svgContainer = document.getElementById('svgPreview');
                    if (svgContainer) {
                        svgContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #d73a49; font-family: Arial, sans-serif;">Error: ' + (message.error || 'Unknown error') + '</div>';
                    }
                }
            });
            
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

            // --- Debug Info ---
            const userAgent = navigator.userAgent;
            const isWindows = userAgent.indexOf('Windows') !== -1;
            const isEdge = userAgent.indexOf('Edg') !== -1;
            const isChrome = userAgent.indexOf('Chrome') !== -1;
            
            console.log('=== ZOOM CONTROLS DEBUG INFO ===');
            console.log('Platform detection:', {
                userAgent: userAgent,
                isWindows: isWindows,
                isEdge: isEdge,
                isChrome: isChrome,
                devicePixelRatio: window.devicePixelRatio || 1,
                screenResolution: screen.width + 'x' + screen.height,
                innerSize: window.innerWidth + 'x' + window.innerHeight,
                vsCodeWebview: typeof acquireVsCodeApi !== 'undefined'
            });
            
            console.log('Zoom button elements:', {
                zoomInBtn: zoomInBtn ? 'found' : 'NOT FOUND',
                zoomOutBtn: zoomOutBtn ? 'found' : 'NOT FOUND', 
                zoomResetBtn: zoomResetBtn ? 'found' : 'NOT FOUND'
            });
            
            console.log('svg-pan-zoom library:', window.svgPanZoom ? 'loaded' : 'NOT LOADED');
            console.log('hasSvgPanZoom variable:', hasSvgPanZoom ? 'true' : 'false');
            
            // Test button click detection
            if (isWindows) {
                console.log('Windows detected - applying enhanced button handling');
                const testButtons = document.querySelectorAll('.zoom-btn');
                testButtons.forEach((btn, index) => {
                    console.log('Button', index, ':', {
                        id: btn.id,
                        visible: btn.offsetParent !== null,
                        style: {
                            display: getComputedStyle(btn).display,
                            pointerEvents: getComputedStyle(btn).pointerEvents,
                            zIndex: getComputedStyle(btn).zIndex
                        }
                    });
                });
            }
            console.log('=== END DEBUG INFO ===');

            // Delegate click event for edit buttons
            chat.addEventListener('click', function(event) {
                const target = event.target;
                if (target && target.classList.contains('edit-user-msg-btn')) {
                    const userDiv = target.closest('.user');
                    if (!userDiv) return;
                    const idx = parseInt(userDiv.getAttribute('data-index'));
                    const pre = userDiv.querySelector('pre');
                    if (!pre) return;
                    
                    const oldMsg = pre.textContent;
                    const textarea = document.createElement('textarea');
                    textarea.value = oldMsg;
                    textarea.className = 'edit-mode-textarea';
                    
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'edit-mode-buttons';
                    
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
                    
                    userDiv.replaceChild(textarea, pre);
                    target.style.display = 'none';
                    userDiv.appendChild(buttonContainer);
                    
                    textarea.focus();
                    textarea.select();
                    
                    saveBtn.onclick = function() {
                        vscode.postMessage({ command: 'editAndResendUserMsg', index: idx, newText: textarea.value });
                    };
                    
                    cancelBtn.onclick = function() {
                        userDiv.replaceChild(pre, textarea);
                        target.style.display = '';
                        buttonContainer.remove();
                    };
                    
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
        `;
    }
}
