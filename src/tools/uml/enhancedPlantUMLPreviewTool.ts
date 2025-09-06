import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ICopilotTool } from '../../extension';
import { localRender } from '../preview';
import { trackUsage } from '../../analytics';
import { SmartDiagramDetector, DiagramBlock, CursorDiagramResult } from './smartDiagramDetector';

/**
 * Enhanced PlantUML Preview Tool with smart diagram detection
 */
export class EnhancedPlantUMLPreviewTool implements ICopilotTool {
    command = 'copilotTools.previewSmartPlantUML';
    title = 'Smart PlantUML Preview';

    isEnabled(settings: vscode.WorkspaceConfiguration): boolean {
        return settings.get('copilotTools.features.plantUMLPreview', true);
    }

    getSettingsSchema() {
        return {
            'copilotTools.features.plantUMLPreview': {
                type: 'boolean',
                default: true,
                description: 'Enable/disable Smart PlantUML Preview tool'
            }
        };
    }

    async handleInput(
        editor: vscode.TextEditor, 
        selection: vscode.Selection, 
        settings: vscode.WorkspaceConfiguration
    ): Promise<void> {
        const document = editor.document;
        let plantUMLText: string;
        let diagramInfo: string = '';
        
        // Smart diagram detection logic
        if (selection.isEmpty) {
            // No selection - use smart cursor-based detection
            const cursorResult = SmartDiagramDetector.findDiagramAtCursor(document, selection.active);
            
            if (cursorResult.isInsideDiagram && cursorResult.diagram) {
                // Cursor is inside a diagram - use that diagram
                plantUMLText = cursorResult.diagram.content;
                diagramInfo = this.formatDiagramInfo(cursorResult.diagram, cursorResult.allDiagrams.length);
            } else {
                // Cursor not in diagram - find the nearest diagram or use entire document
                const nearestDiagram = this.findNearestDiagram(document, selection.active);
                
                if (nearestDiagram) {
                    plantUMLText = nearestDiagram.content;
                    diagramInfo = this.formatDiagramInfo(nearestDiagram, cursorResult.allDiagrams.length, 'nearest');
                } else {
                    // No diagrams found - use entire document
                    plantUMLText = document.getText();
                    diagramInfo = 'No PlantUML diagrams detected. Using entire document content.';
                }
            }
        } else {
            // User has made a selection - use selected text
            plantUMLText = document.getText(selection);
            
            // Check if selection contains valid PlantUML
            if (SmartDiagramDetector.isValidPlantUMLBlock(plantUMLText)) {
                diagramInfo = 'Using selected PlantUML diagram.';
            } else {
                diagramInfo = 'Selected text may not be a valid PlantUML diagram.';
            }
        }

        // Track usage with enhanced analytics
        trackUsage('smart-plantuml', {
            hasSelection: !selection.isEmpty,
            selectionLength: plantUMLText.length,
            fileExtension: document.fileName.split('.').pop(),
            detectionMethod: selection.isEmpty ? 'cursor-based' : 'selection-based',
            diagramDetected: SmartDiagramDetector.isValidPlantUMLBlock(plantUMLText)
        });

        // Create and show preview panel
        await this.showPreviewPanel(document, plantUMLText, diagramInfo);
    }

    /**
     * Find the nearest diagram to the cursor position
     */
    private findNearestDiagram(document: vscode.TextDocument, position: vscode.Position): DiagramBlock | null {
        const nextDiagram = SmartDiagramDetector.findNextDiagram(document, position);
        const prevDiagram = SmartDiagramDetector.findPreviousDiagram(document, position);
        
        if (!nextDiagram && !prevDiagram) {
            return null;
        }
        
        if (!nextDiagram) return prevDiagram;
        if (!prevDiagram) return nextDiagram;
        
        // Calculate distances and return the closer one
        const nextDistance = nextDiagram.startPosition.line - position.line;
        const prevDistance = position.line - prevDiagram.endPosition.line;
        
        return nextDistance <= prevDistance ? nextDiagram : prevDiagram;
    }

    /**
     * Format diagram information for display
     */
    private formatDiagramInfo(diagram: DiagramBlock, totalDiagrams: number, method?: string): string {
        const methodText = method ? ` (${method})` : '';
        const typeText = diagram.diagramType ? ` (${diagram.diagramType})` : '';
        return `Diagram ${diagram.index + 1} of ${totalDiagrams}${typeText}${methodText}`;
    }

    /**
     * Show the preview panel with enhanced information
     */
    private async showPreviewPanel(
        document: vscode.TextDocument, 
        plantUMLText: string, 
        diagramInfo: string
    ): Promise<void> {
        const diagram = {
            parentUri: document.uri,
            dir: path.dirname(document.uri.fsPath),
            pageCount: 1,
            content: plantUMLText,
            path: document.uri.fsPath,
            name: path.basename(document.uri.fsPath)
        };

        const panel = vscode.window.createWebviewPanel(
            'smartPlantUMLPreview',
            'Smart PlantUML Preview',
            vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        // Store document reference in panel for navigation
        (panel as any)._sourceDocument = document;

        // Get document statistics for enhanced UI
        const stats = SmartDiagramDetector.getDocumentStats(document);
        
        panel.webview.html = this.getEnhancedWebviewContent(plantUMLText, diagramInfo, stats);

        // Auto-render the diagram
        await this.renderDiagram(panel, diagram);

        // Handle webview messages
        panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'render':
                    await this.renderDiagram(panel, diagram);
                    break;
                case 'navigateDiagram':
                    console.log('Handling navigation:', message.direction);
                    await this.handleDiagramNavigation(panel, (panel as any)._sourceDocument, message.direction);
                    break;
                case 'showStats':
                    await this.showDocumentStats(panel, (panel as any)._sourceDocument);
                    break;
            }
        });
    }

    /**
     * Render the PlantUML diagram
     */
    private async renderDiagram(panel: vscode.WebviewPanel, diagram: any): Promise<void> {
        const format = 'svg';
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plantuml-'));
        const savePath = path.join(tempDir, 'preview.svg');
        
        try {
            const task = localRender.render(diagram, format, savePath);
            const buffers = await task.promise;
            
            if (buffers && buffers.length > 0) {
                const svgContent = buffers[0].toString('utf-8');
                panel.webview.postMessage({ command: 'updatePreview', svgContent });
            }
        } catch (err: any) {
            panel.webview.postMessage({ 
                command: 'showError', 
                error: `Failed to render PlantUML diagram: ${err.message}` 
            });
        }
    }

    /**
     * Handle diagram navigation (next/previous)
     */
    private async handleDiagramNavigation(
        panel: vscode.WebviewPanel, 
        document: vscode.TextDocument, 
        direction: 'next' | 'previous'
    ): Promise<void> {
        // Find any editor with the same document, not just the active one
        let editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== document) {
            // Look for any visible editor with this document
            editor = vscode.window.visibleTextEditors.find(e => e.document === document);
            if (!editor) {
                // Open the document and get the editor
                const textDocument = await vscode.workspace.openTextDocument(document.uri);
                editor = await vscode.window.showTextDocument(textDocument, vscode.ViewColumn.One);
            }
        }

        const currentPosition = editor.selection.active;
        const targetDiagram = direction === 'next' 
            ? SmartDiagramDetector.findNextDiagram(document, currentPosition)
            : SmartDiagramDetector.findPreviousDiagram(document, currentPosition);
        if (targetDiagram) {
            // Move cursor to the target diagram
            const newSelection = new vscode.Selection(targetDiagram.startPosition, targetDiagram.startPosition);
            editor.selection = newSelection;
            editor.revealRange(targetDiagram.range, vscode.TextEditorRevealType.InCenter);
            
            // Update preview with new diagram
            const newDiagram = {
                parentUri: document.uri,
                dir: path.dirname(document.uri.fsPath),
                pageCount: 1,
                content: targetDiagram.content,
                path: document.uri.fsPath,
                name: path.basename(document.uri.fsPath)
            };
            
            await this.renderDiagram(panel, newDiagram);
            
            // Update diagram info with current diagram index
            const allDiagrams = SmartDiagramDetector.parseDocument(document);
            const currentIndex = allDiagrams.findIndex(d => d.index === targetDiagram.index);
            const diagramInfo = `${targetDiagram.diagramType || 'unknown'} diagram (${currentIndex + 1}/${allDiagrams.length}) - Navigation`;
            panel.webview.postMessage({ command: 'updateInfo', info: diagramInfo });
            
            // Update navigation button states
            const isFirst = currentIndex === 0;
            const isLast = currentIndex === allDiagrams.length - 1;
            panel.webview.postMessage({ 
                command: 'updateNavigation', 
                isFirst, 
                isLast,
                currentIndex: currentIndex + 1,
                totalDiagrams: allDiagrams.length
            });
        } else {
            // No more diagrams in that direction
            panel.webview.postMessage({ 
                command: 'showMessage', 
                message: `No ${direction === 'next' ? 'next' : 'previous'} diagram available` 
            });
        }
    }

    /**
     * Show document statistics
     */
    private async showDocumentStats(panel: vscode.WebviewPanel, document: vscode.TextDocument): Promise<void> {
        const stats = SmartDiagramDetector.getDocumentStats(document);
        panel.webview.postMessage({ command: 'showStats', stats });
    }

    /**
     * Generate enhanced webview content with smart features
     */
    private getEnhancedWebviewContent(
        plantUMLText: string, 
        diagramInfo: string, 
        stats: any
    ): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Smart PlantUML Preview</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    overflow: hidden;
                }
                
                .toolbar {
                    display: flex;
                    align-items: center;
                    padding: 8px 16px;
                    background-color: var(--vscode-panel-background);
                    border-bottom: 1px solid var(--vscode-panel-border);
                    gap: 12px;
                    flex-wrap: wrap;
                }
                
                .info-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .stats-badge {
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: 500;
                }
                
                .nav-buttons {
                    display: flex;
                    gap: 4px;
                }
                
                .btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background-color 0.2s;
                }
                
                .btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .btn-secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                
                .btn-secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                .zoom-controls {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-left: auto;
                }
                
                .preview-container {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                    background-color: var(--vscode-editor-background);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: grab;
                    touch-action: none;
                    user-select: none;
                }
                
                #preview {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                    cursor: grab;
                    touch-action: none;
                    user-select: none;
                }
                
                #preview svg {
                    max-width: 100%;
                    max-height: 100%;
                    transition: transform 0.2s ease;
                }
                
                .error-message {
                    color: var(--vscode-errorForeground);
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 12px;
                    margin: 16px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 12px;
                }
                

            </style>
        </head>
        <body>
            <div class="toolbar">
                <div class="info-section">
                    <span id="diagramInfo">${diagramInfo}</span>
                    <span class="stats-badge">${stats.totalDiagrams} diagrams</span>
                </div>
                
                <div class="nav-buttons">
                    <button class="btn btn-secondary" id="prevBtn" onclick="navigateDiagram('previous')">
                        ← Previous
                    </button>
                    <button class="btn btn-secondary" id="nextBtn" onclick="navigateDiagram('next')">
                        Next →
                    </button>
                </div>
                
                <div class="zoom-controls">
                    <button class="btn" id="zoomOutBtn">−</button>
                    <button class="btn" id="zoomResetBtn">⌂</button>
                    <button class="btn" id="zoomInBtn">+</button>
                </div>
            </div>
            
            <div class="preview-container">
                <div id="preview"></div>
                <div id="errorMessage" class="error-message" style="display: none;"></div>
            </div>
            

            
            <script>
                const vscode = acquireVsCodeApi();
                
                // Zoom and pan functionality (reusing from original)
                let currentZoom = 1.5;
                let currentPanX = 0;
                let currentPanY = 0;
                let isPanning = false;
                let lastPanX = 0;
                let lastPanY = 0;
                const zoomStep = 0.1;
                const minZoom = 0.2;
                const maxZoom = 3.0;
                
                // Navigation functions
                function navigateDiagram(direction) {
                    vscode.postMessage({ command: 'navigateDiagram', direction });
                }
                
                // Message handling
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.command) {
                        case 'updatePreview':
                            document.getElementById('preview').innerHTML = message.svgContent;
                            document.getElementById('errorMessage').style.display = 'none';
                            document.getElementById('preview').style.display = 'flex';
                            applyTransform();
                            break;
                        case 'showError':
                            const errorDiv = document.getElementById('errorMessage');
                            errorDiv.textContent = message.error;
                            errorDiv.style.display = 'block';
                            document.getElementById('preview').style.display = 'none';
                            break;
                        case 'updateInfo':
                            document.getElementById('diagramInfo').textContent = message.info;
                            break;
                        case 'updateNavigation':
                            // Update navigation button states (though we use circular navigation)
                            // This could be used for visual feedback in the future
                            break;
                        case 'showMessage':
                            // Show temporary message (could implement toast notification)
                            break;
                        case 'showStats':
                            // Update stats panel with new data
                            break;
                    }
                });
                
                // Touch gesture variables
                let isDragging = false;
                let lastTouchX = 0;
                let lastTouchY = 0;
                let initialDistance = 0;
                let initialScale = 1;
                
                // Zoom and pan implementation with touch support
                function applyTransform() {
                    const svgEl = document.querySelector('#preview svg');
                    if (!svgEl) return;
                    
                    svgEl.style.transform = \`translate(\${currentPanX}px, \${currentPanY}px) scale(\${currentZoom})\`;
                }
                
                function applyZoom(newZoom) {
                    currentZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
                    applyTransform();
                    updateZoomButtons();
                }
                
                function updateZoomButtons() {
                    document.getElementById('zoomInBtn').disabled = currentZoom >= maxZoom;
                    document.getElementById('zoomOutBtn').disabled = currentZoom <= minZoom;
                    document.getElementById('zoomResetBtn').disabled = currentZoom === 1.5;
                }
                
                function resetPan() {
                    currentPanX = 0;
                    currentPanY = 0;
                    applyTransform();
                }
                
                function getDistance(touch1, touch2) {
                    const dx = touch1.clientX - touch2.clientX;
                    const dy = touch1.clientY - touch2.clientY;
                    return Math.sqrt(dx * dx + dy * dy);
                }
                
                function getTouchCenter(touch1, touch2) {
                    return {
                        x: (touch1.clientX + touch2.clientX) / 2,
                        y: (touch1.clientY + touch2.clientY) / 2
                    };
                }
                
                // Touch event handlers
                const previewEl = document.getElementById('preview');
                
                previewEl.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    
                    if (e.touches.length === 1) {
                        // Single finger - start panning
                        isDragging = true;
                        lastTouchX = e.touches[0].clientX;
                        lastTouchY = e.touches[0].clientY;
                    } else if (e.touches.length === 2) {
                        // Two fingers - start pinch zoom
                        isDragging = false;
                        initialDistance = getDistance(e.touches[0], e.touches[1]);
                        initialScale = currentZoom;
                    }
                });
                
                previewEl.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    
                    if (e.touches.length === 1 && isDragging) {
                        // Single finger - pan
                        const deltaX = e.touches[0].clientX - lastTouchX;
                        const deltaY = e.touches[0].clientY - lastTouchY;
                        
                        currentPanX += deltaX;
                        currentPanY += deltaY;
                        
                        lastTouchX = e.touches[0].clientX;
                        lastTouchY = e.touches[0].clientY;
                        
                        applyTransform();
                    } else if (e.touches.length === 2) {
                        // Two fingers - pinch zoom
                        const currentDistance = getDistance(e.touches[0], e.touches[1]);
                        const scale = (currentDistance / initialDistance) * initialScale;
                         const clampedScale = Math.max(minZoom, Math.min(maxZoom, scale));
                         
                         currentZoom = clampedScale;
                         applyTransform();
                    }
                });
                
                previewEl.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    isDragging = false;
                });
                
                // Mouse event handlers for desktop compatibility
                previewEl.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    lastTouchX = e.clientX;
                    lastTouchY = e.clientY;
                    previewEl.style.cursor = 'grabbing';
                });
                
                previewEl.addEventListener('mousemove', (e) => {
                    if (isDragging) {
                        const deltaX = e.clientX - lastTouchX;
                        const deltaY = e.clientY - lastTouchY;
                        
                        currentPanX += deltaX;
                        currentPanY += deltaY;
                        
                        lastTouchX = e.clientX;
                        lastTouchY = e.clientY;
                        
                        applyTransform();
                    }
                });
                
                previewEl.addEventListener('mouseup', () => {
                    isDragging = false;
                    previewEl.style.cursor = 'grab';
                });
                
                previewEl.addEventListener('mouseleave', () => {
                    isDragging = false;
                    previewEl.style.cursor = 'grab';
                });
                
                // Wheel zoom for desktop
                 previewEl.addEventListener('wheel', (e) => {
                     e.preventDefault();
                     const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
                     const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));
                     currentZoom = newZoom;
                     applyTransform();
                 });
                
                // Button event listeners
                document.getElementById('zoomInBtn').addEventListener('click', () => {
                    applyZoom(currentZoom + zoomStep);
                });
                
                document.getElementById('zoomOutBtn').addEventListener('click', () => {
                    applyZoom(currentZoom - zoomStep);
                });
                
                document.getElementById('zoomResetBtn').addEventListener('click', () => {
                    applyZoom(1.5);
                    resetPan();
                });
                
                // Initialize
                updateZoomButtons();
            </script>
        </body>
        </html>
        `;
    }
}