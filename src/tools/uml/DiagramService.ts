/**
 * Diagram Service - Handles diagram export functionality
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { UMLRenderer } from './renderer';
import { localRender } from '../preview';
import { ErrorHandler } from '../../core/errorHandler';
import { createError, ErrorCode } from '../../core/errors';

export interface ExportOptions {
    format: 'svg' | 'png';
    plantUML: string;
    filename?: string;
}

export interface ExportResult {
    success: boolean;
    filePath?: string;
    error?: string;
}

export class DiagramService {
    private renderer: UMLRenderer;

    constructor() {
        this.renderer = new UMLRenderer();
    }

    /**
     * Export diagram to specified format
     */
    async exportDiagram(options: ExportOptions): Promise<ExportResult> {
        try {
            // Validate PlantUML content
            if (!this.renderer.isValidPlantUML(options.plantUML)) {
                return {
                    success: false,
                    error: 'Invalid PlantUML content. Must contain @startuml and @enduml tags.'
                };
            }

            // Get workspace folder for saving
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return {
                    success: false,
                    error: 'No workspace folder found. Please open a folder in VS Code.'
                };
            }

            // Generate filename if not provided
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = options.filename || `diagram-${timestamp}.${options.format}`;
            const filePath = path.join(workspaceFolder.uri.fsPath, filename);

            // Export based on format
            if (options.format === 'svg') {
                return await this.exportSVG(options.plantUML, filePath);
            } else if (options.format === 'png') {
                return await this.exportPNG(options.plantUML, filePath);
            } else {
                return {
                    success: false,
                    error: `Unsupported format: ${options.format}. Supported formats: svg, png`
                };
            }
        } catch (error: any) {
            const errorMessage = error.message || String(error);
            console.error('Export error:', errorMessage);
            ErrorHandler.handle(createError(ErrorCode.RENDER_FAILURE, errorMessage));
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Export diagram as SVG
     */
    private async exportSVG(plantUML: string, filePath: string): Promise<ExportResult> {
        try {
            const svgContent = await this.renderer.renderToSVG(plantUML);
            
            // Check if SVG contains error message
            if (svgContent.includes('Error:') || svgContent.includes('PlantUML Setup Required')) {
                return {
                    success: false,
                    error: 'Failed to render diagram. Please check PlantUML setup and diagram syntax.'
                };
            }

            // Write SVG to file
            await fs.promises.writeFile(filePath, svgContent, 'utf-8');
            
            return {
                success: true,
                filePath: filePath
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to export SVG: ${error.message}`
            };
        }
    }

    /**
     * Export diagram as PNG with high resolution
     */
    private async exportPNG(plantUML: string, filePath: string): Promise<ExportResult> {
        try {
            // Add high DPI settings for better quality PNG export
            const highDpiContent = this.addHighDpiSettings(plantUML);
            
            const diagram = {
                parentUri: vscode.Uri.file('inmemory'),
                dir: '',
                pageCount: 1,
                content: highDpiContent,
                path: '',
                name: 'export.png'
            };

            // Use localRender to generate PNG
            const task = localRender.render(diagram, 'png');
            const buffers = await task.promise;
            
            if (buffers && buffers.length > 0) {
                // Write PNG buffer to file
                await fs.promises.writeFile(filePath, buffers[0]);
                
                return {
                    success: true,
                    filePath: filePath
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to generate PNG buffer'
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to export PNG: ${error.message}`
            };
        }
    }

    /**
     * Add high DPI settings to PlantUML content for better PNG quality
     */
    private addHighDpiSettings(content: string): string {
        // High DPI settings for better PNG quality - using skinparam dpi 300
        const dpiSettings = 'skinparam dpi 300\n';
        
        // Check if content already starts with @startuml
        if (content.trim().startsWith('@startuml')) {
            // Insert DPI settings after @startuml line
            const lines = content.split('\n');
            const startumlIndex = lines.findIndex(line => line.trim().startsWith('@startuml'));
            if (startumlIndex !== -1) {
                lines.splice(startumlIndex + 1, 0, dpiSettings);
                return lines.join('\n');
            }
        }
        
        // If no @startuml found or other cases, add at the beginning
        return dpiSettings + content;
    }

    /**
     * Get supported export formats
     */
    getSupportedFormats(): string[] {
        return ['svg', 'png'];
    }

    /**
     * Validate export options
     */
    validateExportOptions(options: ExportOptions): { valid: boolean; error?: string } {
        if (!options.plantUML || options.plantUML.trim() === '') {
            return { valid: false, error: 'PlantUML content is required' };
        }

        if (!this.getSupportedFormats().includes(options.format)) {
            return { valid: false, error: `Unsupported format: ${options.format}` };
        }

        if (!this.renderer.isValidPlantUML(options.plantUML)) {
            return { valid: false, error: 'Invalid PlantUML syntax' };
        }

        return { valid: true };
    }
}