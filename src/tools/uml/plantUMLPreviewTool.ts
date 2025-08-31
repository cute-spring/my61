import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ICopilotTool } from '../../extension';
import { localRender } from '../preview';
import { trackUsage } from '../../analytics';

// Import the enhanced getWebviewContent function
function getWebviewContent(plantUMLText: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PlantUML Preview</title>
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
            

            
            .preview-container {
                flex: 1;
                position: relative;
                overflow: hidden;
                background-color: var(--vscode-editor-background);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            #preview {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
            }
            
            #preview svg {
                max-width: 100%;
                max-height: 100%;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transform-origin: center center;
            }
            
            /* Enterprise-Grade Zoom Controls */
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
                background: transparent !important;
                animation: zoomControlsAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            
            @keyframes zoomControlsAppear {
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
                outline: none !important;
                font-size: 0 !important;
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
                transform: translateY(-2px) !important;
                box-shadow: 
                    0 6px 20px rgba(0, 122, 204, 0.15),
                    0 3px 10px rgba(0, 0, 0, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
            }
            
            .zoom-btn:hover svg {
                transform: scale(1.15) !important;
            }
            
            .zoom-btn:active {
                transform: translateY(-1px) !important;
                box-shadow: 
                    0 3px 12px rgba(0, 122, 204, 0.12),
                    0 2px 6px rgba(0, 0, 0, 0.06) !important;
            }
            
            .zoom-btn:active svg {
                transform: scale(0.9) !important;
            }
            
            .zoom-btn:disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                transform: none !important;
            }
        </style>
    </head>
    <body>
        <div class="preview-container">
            <div id="preview"></div>
            
            <!-- Zoom Controls -->
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
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let currentZoom = 1.0;
            const minZoom = 0.1;
            const maxZoom = 5.0;
            const zoomStep = 0.2;
            
            // Pan and zoom state variables
            let isPanning = false;
            let lastPanX = 0;
            let lastPanY = 0;
            let currentPanX = 0;
            let currentPanY = 0;
            
            // Touch/pinch state
            let lastTouchDistance = 0;
            let lastTouchCenterX = 0;
            let lastTouchCenterY = 0;
            
            // Get DOM elements
            const previewDiv = document.getElementById('preview');
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const zoomResetBtn = document.getElementById('zoomResetBtn');
            
            // Touch event helpers
            function getTouchDistance(touch1, touch2) {
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
            
            function applyPanToSvg(deltaX, deltaY) {
                currentPanX += deltaX;
                currentPanY += deltaY;
                
                const svgEl = previewDiv.querySelector('svg');
                if (!svgEl) return;
                
                // Apply manual transform with current zoom
                const currentZoom = getCurrentZoomLevel();
                svgEl.style.transform = 'translate(' + currentPanX + 'px, ' + currentPanY + 'px) scale(' + currentZoom + ')';
                svgEl.style.transformOrigin = 'center center';
                
                console.log('Manual pan applied:', currentPanX, currentPanY);
            }
            
            function getCurrentZoomLevel() {
                return currentZoom || 1.0;
            }
            
            // Zoom functionality
            function updateZoomButtons() {
                zoomInBtn.disabled = currentZoom >= maxZoom;
                zoomOutBtn.disabled = currentZoom <= minZoom;
                zoomResetBtn.disabled = Math.abs(currentZoom - 1.0) < 0.01;
            }
            
            function applyZoom(newZoom) {
                currentZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
                applyTransform();
                updateZoomButtons();
            }
            
            function applyTransform() {
                const svgElement = previewDiv.querySelector('svg');
                if (svgElement) {
                    svgElement.style.transform = 'translate(' + currentPanX + 'px, ' + currentPanY + 'px) scale(' + currentZoom + ')';
                    svgElement.style.transformOrigin = 'center center';
                }
            }
            
            function resetPan() {
                currentPanX = 0;
                currentPanY = 0;
                applyTransform();
            }
            
            // Zoom controls event listeners
            zoomInBtn.addEventListener('click', () => {
                applyZoom(currentZoom + zoomStep);
            });
            
            zoomOutBtn.addEventListener('click', () => {
                applyZoom(currentZoom - zoomStep);
            });
            
            zoomResetBtn.addEventListener('click', () => {
                applyZoom(1.0);
                resetPan();
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (event) => {
                if (event.ctrlKey || event.metaKey) {
                    switch(event.key) {
                        case '+':
                        case '=':
                            event.preventDefault();
                            if (!zoomInBtn.disabled) zoomInBtn.click();
                            break;
                        case '-':
                            event.preventDefault();
                            if (!zoomOutBtn.disabled) zoomOutBtn.click();
                            break;
                        case '0':
                            event.preventDefault();
                            if (!zoomResetBtn.disabled) zoomResetBtn.click();
                            break;
                    }
                }
            });
            
            // Mouse wheel zoom
            previewDiv.addEventListener('wheel', (event) => {
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
                    applyZoom(currentZoom * zoomFactor);
                }
            });
            
            // Mouse events for panning
            previewDiv.addEventListener('mousedown', function(e) {
                if (e.button === 0) { // Left mouse button
                    isPanning = true;
                    lastPanX = e.clientX;
                    lastPanY = e.clientY;
                    previewDiv.style.cursor = 'grabbing';
                    e.preventDefault();
                    console.log('Mouse pan started');
                }
            });
            
            previewDiv.addEventListener('mousemove', function(e) {
                if (isPanning) {
                    const deltaX = e.clientX - lastPanX;
                    const deltaY = e.clientY - lastPanY;
                    applyPanToSvg(deltaX, deltaY);
                    lastPanX = e.clientX;
                    lastPanY = e.clientY;
                    e.preventDefault();
                }
            });
            
            previewDiv.addEventListener('mouseup', function(e) {
                if (isPanning) {
                    isPanning = false;
                    previewDiv.style.cursor = 'grab';
                    console.log('Mouse pan ended');
                }
            });
            
            previewDiv.addEventListener('mouseleave', function(e) {
                if (isPanning) {
                    isPanning = false;
                    previewDiv.style.cursor = 'grab';
                    console.log('Mouse pan ended (leave)');
                }
            });
            
            // Touch events for one finger pan and two finger pinch-to-zoom
            previewDiv.addEventListener('touchstart', function(e) {
                e.preventDefault();
                
                if (e.touches.length === 1) {
                    // One finger - start panning
                    isPanning = true;
                    lastPanX = e.touches[0].clientX;
                    lastPanY = e.touches[0].clientY;
                    console.log('Touch pan started');
                } else if (e.touches.length === 2) {
                    // Two fingers - start pinch-to-zoom
                    isPanning = false;
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    lastTouchDistance = getTouchDistance(touch1, touch2);
                    const center = getTouchCenter(touch1, touch2);
                    lastTouchCenterX = center.x;
                    lastTouchCenterY = center.y;
                    console.log('Pinch-to-zoom started, distance:', lastTouchDistance);
                }
            }, { passive: false });
            
            previewDiv.addEventListener('touchmove', function(e) {
                e.preventDefault();
                
                if (e.touches.length === 1 && isPanning) {
                    // One finger - continue panning with smooth updates
                    const deltaX = e.touches[0].clientX - lastPanX;
                    const deltaY = e.touches[0].clientY - lastPanY;
                    
                    // Use requestAnimationFrame for smooth updates
                    requestAnimationFrame(() => {
                        applyPanToSvg(deltaX, deltaY);
                    });
                    
                    lastPanX = e.touches[0].clientX;
                    lastPanY = e.touches[0].clientY;
                } else if (e.touches.length === 2) {
                    // Two fingers - continue pinch-to-zoom
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const currentDistance = getTouchDistance(touch1, touch2);
                    const center = getTouchCenter(touch1, touch2);
                    
                    if (lastTouchDistance > 0) {
                        const zoomFactor = currentDistance / lastTouchDistance;
                        const newZoom = Math.max(minZoom, Math.min(maxZoom, getCurrentZoomLevel() * zoomFactor));
                        
                        // Apply zoom
                        currentZoom = newZoom;
                        applyTransform();
                        updateZoomButtons();
                        
                        console.log('Pinch zoom:', newZoom);
                    }
                    
                    lastTouchDistance = currentDistance;
                    lastTouchCenterX = center.x;
                    lastTouchCenterY = center.y;
                }
            }, { passive: false });
            
            previewDiv.addEventListener('touchend', function(e) {
                e.preventDefault();
                
                if (e.touches.length === 0) {
                    // All fingers lifted
                    isPanning = false;
                    lastTouchDistance = 0;
                    console.log('Touch interaction ended');
                } else if (e.touches.length === 1) {
                    // From two fingers to one finger - switch to panning
                    isPanning = true;
                    lastPanX = e.touches[0].clientX;
                    lastPanY = e.touches[0].clientY;
                    lastTouchDistance = 0;
                    console.log('Switched from pinch to pan');
                }
            }, { passive: false });
            
            // Auto-render on load
            window.addEventListener('DOMContentLoaded', () => {
                vscode.postMessage({ command: 'render', plantumlText: '' });
            });
            
            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updatePreview') {
                    previewDiv.innerHTML = message.svgContent;
                    // Reset zoom and pan when new content is loaded
                    currentZoom = 1.0;
                    currentPanX = 0;
                    currentPanY = 0;
                    updateZoomButtons();
                }
            });
            
            // Initialize zoom buttons
            updateZoomButtons();
        </script>
    </body>
    </html>
    `;
}

export class PlantUMLPreviewTool implements ICopilotTool {
  command = 'copilotTools.previewAntUML';
  title = 'Preview PlantUML Diagram';

  isEnabled(settings: vscode.WorkspaceConfiguration): boolean {
    // Optionally, add a feature toggle in settings
    return true;
  }

  getSettingsSchema() {
    return {};
  }

  async handleInput(editor: vscode.TextEditor, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration): Promise<void> {
    // Track PlantUML preview usage
    trackUsage('plantuml', {
      hasSelection: !selection.isEmpty,
      selectionLength: editor.document.getText(selection).length,
      fileExtension: editor.document.fileName.split('.').pop()
    });
    
    const document = editor.document;
    const plantUMLText = document.getText(selection.isEmpty ? undefined : selection);
    const diagram = {
      parentUri: document.uri,
      dir: path.dirname(document.uri.fsPath),
      pageCount: 1,
      content: plantUMLText,
      path: document.uri.fsPath,
      name: path.basename(document.uri.fsPath)
    };

    const panel = vscode.window.createWebviewPanel(
      'plantUMLPreview',
      'PlantUML Preview',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.webview.html = getWebviewContent(plantUMLText);

    // Auto-render the diagram immediately
    let format = 'svg';
    let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plantuml-'));
    let savePath = path.join(tempDir, 'preview.svg');
    try {
      let task = localRender.render(diagram, format, savePath);
      let buffers = await task.promise;
      if (buffers && buffers.length > 0) {
        let svgContent = buffers[0].toString('utf-8');
        panel.webview.postMessage({ command: 'updatePreview', svgContent });
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to render PlantUML diagram: ${err.message}`);
    }

    panel.webview.onDidReceiveMessage(async message => {
      if (message.command === 'render') {
        let format = 'svg';
        let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plantuml-'));
        let savePath = path.join(tempDir, 'preview.svg');
        try {
          let task = localRender.render(diagram, format, savePath);
          let buffers = await task.promise;
          if (buffers && buffers.length > 0) {
            let svgContent = buffers[0].toString('utf-8');
            panel.webview.postMessage({ command: 'updatePreview', svgContent });
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to render PlantUML diagram: ${err.message}`);
        }
      }
    });
  }


}
