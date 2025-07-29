/**
 * Mermaid Renderer - Handles rendering Mermaid diagrams to SVG format
 */

import * as vscode from 'vscode';
import { UML_TEMPLATES } from './constants';

export class MermaidRenderer {
    private mermaid: any = null;
    private isInitialized: boolean = false;

    /**
     * Initialize Mermaid library
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Try dynamic import first
            let mermaidModule;
            try {
                mermaidModule = await import('mermaid');
                this.mermaid = mermaidModule.default;
            } catch (importError) {
                console.warn('Dynamic import failed, trying require:', importError);
                // Fallback to require if dynamic import fails
                this.mermaid = require('mermaid');
            }
            
            // Initialize mermaid with Node.js compatible configuration
            this.mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: 'Arial, sans-serif',
                fontSize: 16,
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true
                },
                sequence: {
                    useMaxWidth: true,
                    diagramMarginX: 50,
                    diagramMarginY: 10
                },
                class: {
                    useMaxWidth: true
                }
            });
            
            this.isInitialized = true;
            console.log('Mermaid renderer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Mermaid renderer:', error);
            throw new Error('Mermaid library not available. Please install mermaid package.');
        }
    }

    /**
     * Render Mermaid code to SVG format for main preview area
     */
    async renderToSVG(mermaidCode: string): Promise<string> {
        try {
            // Extract Mermaid code from the response if it contains markdown
            const cleanMermaidCode = this.extractMermaidCode(mermaidCode);
            
            if (!cleanMermaidCode) {
                return this.createErrorSVG('No valid Mermaid code found');
            }

            console.log('Attempting to render Mermaid code:', cleanMermaidCode.substring(0, 100) + '...');

            // For Mermaid, we need to use the separate preview panel approach
            // since VS Code webview doesn't allow JavaScript execution in SVG foreignObjects
            // This will be handled by the chat panel calling openMermaidPreview
            return this.createMermaidCodeFallback(cleanMermaidCode);
            
        } catch (err: any) {
            const errorMessage = err.message || String(err);
            console.error('Mermaid rendering error:', errorMessage);
            return this.createMermaidCodeFallback(mermaidCode);
        }
    }

    /**
     * Open Mermaid diagram in a native VS Code preview panel
     */
    async openMermaidPreview(mermaidCode: string, title: string = 'Mermaid Diagram'): Promise<void> {
        try {
            const cleanMermaidCode = this.extractMermaidCode(mermaidCode);
            
            if (!cleanMermaidCode) {
                vscode.window.showErrorMessage('No valid Mermaid code found');
                return;
            }

            // For unified panel, we'll render the Mermaid diagram directly
            // This method is now handled by the unified panel system
            console.log('Mermaid preview requested for unified panel');
            
        } catch (error) {
            console.error('Failed to open Mermaid preview:', error);
            vscode.window.showErrorMessage('Failed to open Mermaid preview');
        }
    }





    /**
     * Generate HTML content for Mermaid preview panel - Full panel with zoom controls
     */
    private generateMermaidPreviewHtml(mermaidCode: string): string {
        // Escape JavaScript string for embedding in template literal
        const jsEscapedCode = mermaidCode
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$');

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mermaid Diagram</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            overflow: hidden;
        }
        .diagram-container {
            background: white;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: auto;
        }
        .loading {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        .error {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            padding: 15px;
            border-radius: 4px;
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        
        /* Zoom Controls - Same style as PlantUML */
        .zoom-controls {
            position: absolute !important;
            bottom: 24px !important;
            right: 24px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            z-index: 1000 !important;
            pointer-events: auto !important;
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            background: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: none !important;
            animation: enterpriseZoomControlsAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
            border-left: none !important;
        }
        
        @keyframes enterpriseZoomControlsAppear {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .zoom-btn {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8)) !important;
            border: 1px solid rgba(0, 122, 204, 0.2) !important;
            border-radius: 10px !important;
            padding: 0 !important;
            cursor: pointer !important;
            color: #007acc !important;
            box-shadow: 
                0 2px 8px rgba(0, 122, 204, 0.08),
                0 1px 4px rgba(0, 0, 0, 0.04),
                inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            width: 40px !important;
            height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            pointer-events: auto !important;
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            touch-action: manipulation !important;
            -ms-touch-action: manipulation !important;
            outline: none !important;
            transform: translateZ(0) !important;
            -webkit-transform: translateZ(0) !important;
            will-change: transform, background, border-color, box-shadow !important;
            position: relative !important;
            z-index: 101 !important;
            font-size: 0 !important;
            font-weight: 500 !important;
            letter-spacing: -0.01em !important;
        }
        
        .zoom-btn svg {
            width: 16px !important;
            height: 16px !important;
            transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        .zoom-btn:hover {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95)) !important;
            border-color: rgba(0, 122, 204, 0.4) !important;
            color: #005fa3 !important;
            box-shadow: 
                0 4px 12px rgba(0, 122, 204, 0.15),
                0 2px 6px rgba(0, 0, 0, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
            transform: translateY(-1px) scale(1.02) !important;
        }
        
        .zoom-btn:active {
            background: linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(255, 255, 255, 0.9)) !important;
            border-color: rgba(0, 122, 204, 0.6) !important;
            color: #004d82 !important;
            box-shadow: 
                0 2px 4px rgba(0, 122, 204, 0.2),
                0 1px 2px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
            transform: translateY(0) scale(0.98) !important;
        }
        
        .zoom-btn:focus {
            outline: 2px solid rgba(0, 122, 204, 0.4) !important;
            outline-offset: 2px !important;
        }
        
        .zoom-btn:disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            pointer-events: none !important;
        }
    </style>
</head>
<body>
    <div class="diagram-container" id="diagramContainer">
        <div class="loading">Loading diagram...</div>
    </div>
    
    <div class="zoom-controls">
        <button class="zoom-btn zoom-in" id="zoomInBtn" title="Zoom In (Ctrl + +)" aria-label="Zoom In">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
        </button>
        <button class="zoom-btn zoom-out" id="zoomOutBtn" title="Zoom Out (Ctrl + -)" aria-label="Zoom Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
        </button>
        <button class="zoom-btn zoom-reset" id="zoomResetBtn" title="Reset Zoom (Ctrl + 0)" aria-label="Reset Zoom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let mermaidInitialized = false;
        let currentZoom = 1;
        const zoomStep = 0.2;
        const minZoom = 0.3;
        const maxZoom = 3;

        // Initialize Mermaid
        async function initializeMermaid() {
            try {
                if (typeof mermaid === 'undefined') {
                    console.error('Mermaid library not loaded');
                    return false;
                }

                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'loose',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 14,
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true
                    },
                    sequence: {
                        useMaxWidth: true,
                        diagramMarginX: 50,
                        diagramMarginY: 10
                    },
                    class: {
                        useMaxWidth: true
                    }
                });
                mermaidInitialized = true;
                console.log('Mermaid initialized successfully');
                return true;
            } catch (error) {
                console.error('Failed to initialize Mermaid:', error);
                return false;
            }
        }

        // Render the diagram
        async function renderDiagram() {
            const container = document.getElementById('diagramContainer');
            const code = \`${jsEscapedCode}\`;
            
            if (!mermaidInitialized) {
                const initialized = await initializeMermaid();
                if (!initialized) {
                    container.innerHTML = '<div class="error">Failed to initialize Mermaid library</div>';
                    vscode.postMessage({ command: 'error', error: 'Mermaid initialization failed' });
                    return;
                }
            }

            try {
                container.innerHTML = '<div class="loading">Rendering diagram...</div>';
                
                const { svg } = await mermaid.render('mermaid-diagram', code);
                
                container.innerHTML = svg;
                container.style.background = 'white';
                
                // Apply initial zoom
                applyZoom(currentZoom);
                
                vscode.postMessage({ command: 'success' });
                console.log('Diagram rendered successfully');
            } catch (error) {
                console.error('Rendering error:', error);
                
                let errorMessage = error.message || 'Unknown error';
                container.innerHTML = \`<div class="error">Failed to render diagram: \${errorMessage}</div>\`;
                vscode.postMessage({ command: 'error', error: errorMessage });
            }
        }

        // Zoom functions
        function applyZoom(zoom) {
            const container = document.getElementById('diagramContainer');
            const svg = container.querySelector('svg');
            if (svg) {
                svg.style.transform = \`scale(\${zoom})\`;
                svg.style.transformOrigin = 'center center';
                svg.style.transition = 'transform 0.3s ease';
            }
        }

        function zoomIn() {
            if (currentZoom < maxZoom) {
                currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
                applyZoom(currentZoom);
                updateZoomButtons();
            }
        }

        function zoomOut() {
            if (currentZoom > minZoom) {
                currentZoom = Math.max(minZoom, currentZoom - zoomStep);
                applyZoom(currentZoom);
                updateZoomButtons();
            }
        }

        function resetZoom() {
            currentZoom = 1;
            applyZoom(currentZoom);
            updateZoomButtons();
        }

        function updateZoomButtons() {
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const zoomResetBtn = document.getElementById('zoomResetBtn');
            
            zoomInBtn.disabled = currentZoom >= maxZoom;
            zoomOutBtn.disabled = currentZoom <= minZoom;
            zoomResetBtn.disabled = currentZoom === 1;
        }

        // Setup zoom controls
        function setupZoomControls() {
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const zoomResetBtn = document.getElementById('zoomResetBtn');
            
            zoomInBtn.addEventListener('click', zoomIn);
            zoomOutBtn.addEventListener('click', zoomOut);
            zoomResetBtn.addEventListener('click', resetZoom);
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case '=':
                        case '+':
                            e.preventDefault();
                            zoomIn();
                            break;
                        case '-':
                            e.preventDefault();
                            zoomOut();
                            break;
                        case '0':
                            e.preventDefault();
                            resetZoom();
                            break;
                    }
                }
            });
            
            updateZoomButtons();
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                renderDiagram();
                setupZoomControls();
            }, 100);
        });
    </script>
</body>
</html>`;
    }

    /**
     * Extract Mermaid code from response text
     */
    private extractMermaidCode(response: string): string {
        console.log('Extracting Mermaid code from:', response.substring(0, 200) + '...');
        
        // Check if this is actually PlantUML code (should not be processed by Mermaid renderer)
        if (response.includes('@startuml') || response.includes('@enduml')) {
            console.log('Detected PlantUML code in Mermaid renderer, returning empty string');
            return '';
        }
        
        // Try to find Mermaid code block with explicit mermaid language identifier
        // This handles the pattern: ```mermaid ... ```
        const mermaidMatch = response.match(/```mermaid\s*([\s\S]*?)\s*```/i);
        if (mermaidMatch && mermaidMatch[1]) {
            const extracted = mermaidMatch[1].trim();
            console.log('Extracted Mermaid code (explicit):', extracted.substring(0, 100) + '...');
            return extracted;
        }
        
        // Try to find any code block and check if it looks like Mermaid
        // This handles cases where the language identifier might be missing or different
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
     * Post-process SVG content
     */
    private postProcessSVG(svgContent: string): string {
        // Remove any XML declaration if present
        svgContent = svgContent.replace(/<\?xml[^>]*\?>/, '');
        
        // Ensure proper SVG structure
        if (!svgContent.includes('<svg')) {
            return this.createErrorSVG('Invalid SVG content generated');
        }

        // Add viewBox if missing
        if (!svgContent.includes('viewBox=')) {
            const widthMatch = svgContent.match(/width="([^"]+)"/);
            const heightMatch = svgContent.match(/height="([^"]+)"/);
            
            if (widthMatch && heightMatch) {
                const width = widthMatch[1];
                const height = heightMatch[1];
                svgContent = svgContent.replace('<svg', `<svg viewBox="0 0 ${width} ${height}"`);
            }
        }

        return svgContent;
    }

    /**
     * Create error SVG
     */
    private createErrorSVG(message: string): string {
        return `
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
    <text x="50%" y="40%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6c757d">
        Mermaid Rendering Error
    </text>
    <text x="50%" y="60%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6c757d">
        ${message}
    </text>
    <text x="50%" y="80%" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#adb5bd">
        Check console for details
    </text>
</svg>`;
    }

    /**
     * Create setup instructions SVG
     */
    private createSetupInstructionsSVG(): string {
        return `
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#007acc;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#005a9e;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
    <rect x="0" y="0" width="100%" height="50" fill="url(#headerGradient)"/>
    <text x="50%" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white">
        🔧 Mermaid Viewing Options
    </text>
    <text x="50%" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6c757d">
        To view your Mermaid diagrams:
    </text>
    <text x="50%" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#495057">
        1. 📝 Copy the generated Mermaid code
    </text>
    <text x="50%" y="115" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#495057">
        2. 🌐 Visit: https://mermaid.live
    </text>
    <text x="50%" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#495057">
        3. 📋 Paste the code and see your diagram
    </text>
    <text x="50%" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#495057">
        💡 Alternative: Install VS Code Mermaid extension
    </text>
    <text x="50%" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#495057">
        💡 Alternative: Use GitHub (supports Mermaid in markdown)
    </text>
    <text x="50%" y="230" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#495057">
        💡 Alternative: Use Notion (supports Mermaid diagrams)
    </text>
    <text x="50%" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#adb5bd">
        The generated code is valid Mermaid syntax and ready to use
    </text>
    <text x="50%" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#adb5bd">
        You can also save it as a .mmd file and open with Mermaid editors
    </text>
</svg>`;
    }

    /**
     * Create fallback display showing Mermaid code as text
     */
    private createMermaidCodeFallback(mermaidCode: string): string {
        const cleanCode = this.extractMermaidCode(mermaidCode);
        const escapedCode = cleanCode
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        // Calculate height based on code length
        const lines = cleanCode.split('\n').length;
        const height = Math.max(400, Math.min(800, lines * 20 + 100));
        
        return `
<svg width="600" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#007acc;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#005a9e;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
    <rect x="0" y="0" width="100%" height="50" fill="url(#headerGradient)"/>
    <text x="50%" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white">
        📊 Mermaid Diagram Code
    </text>
    <text x="50%" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6c757d">
        Generated Mermaid code (copy and paste into a Mermaid editor)
    </text>
    <foreignObject x="20" y="70" width="560" height="${height - 90}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Courier New', monospace; font-size: 12px; color: #333; background: white; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6; overflow: auto; height: 100%; white-space: pre-wrap; line-height: 1.5; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
${escapedCode}
        </div>
    </foreignObject>
    <text x="50%" y="${height - 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#adb5bd">
        💡 Tip: Use this code in Mermaid Live Editor or VS Code Mermaid extension
    </text>
</svg>`;
    }

    /**
     * Check if the response contains valid Mermaid code
     */
    isValidMermaidCode(code: string): boolean {
        const cleanCode = this.extractMermaidCode(code);
        if (!cleanCode) {
            return false;
        }

        // Basic validation - check for common Mermaid keywords
        const mermaidKeywords = [
            'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
            'stateDiagram', 'gantt', 'pie', 'journey', 'gitgraph'
        ];

        return mermaidKeywords.some(keyword => 
            cleanCode.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * Get Mermaid version info
     */
    async getVersion(): Promise<string> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            return this.mermaid.version || 'Unknown';
        } catch (error) {
            return 'Not available';
        }
    }
} 