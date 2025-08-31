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
    message?: string;
}

interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export class DiagramService {
    private static instance: DiagramService;
    private renderer: UMLRenderer;
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly RETRY_DELAY_MS = 1000;
    private readonly activeExports: Map<string, Promise<ExportResult>> = new Map();
    private readonly maxConcurrentExports = 3;

    private constructor() {
        this.renderer = new UMLRenderer();
    }

    public static getInstance(): DiagramService {
        if (!DiagramService.instance) {
            DiagramService.instance = new DiagramService();
        }
        return DiagramService.instance;
    }

    /**
     * Export diagram to specified format
     */
    async exportDiagram(options: ExportOptions): Promise<ExportResult> {
        // Create a unique key for this export operation
        const exportKey = `${options.format}-${Buffer.from(options.plantUML).toString('base64').substring(0, 32)}`;
        
        // Check if the same export is already in progress
        if (this.activeExports.has(exportKey)) {
            console.log('Export already in progress, returning existing promise');
            return await this.activeExports.get(exportKey)!;
        }
        
        // Check concurrency limits
        if (this.activeExports.size >= this.maxConcurrentExports) {
            return {
                success: false,
                error: 'Too many concurrent exports in progress. Please try again later.',
                message: 'Export queue is full'
            };
        }
        
        // Create and track the export promise
        const exportPromise = this.performExport(options);
        this.activeExports.set(exportKey, exportPromise);
        
        try {
            const result = await exportPromise;
            return result;
        } finally {
            // Always clean up the active export tracking
            this.activeExports.delete(exportKey);
        }
    }
    
    /**
     * Perform the actual export operation
     */
    private async performExport(options: ExportOptions): Promise<ExportResult> {
        try {
            // Show progress indicator
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Exporting diagram as ${options.format.toUpperCase()}...`,
                cancellable: true
            }, async (progress, token) => {
                // Validate input
                const validation = this.validateExportOptions(options);
                if (!validation.isValid) {
                    return {
                        success: false,
                        error: validation.error || 'Invalid export options',
                        message: validation.error || 'Invalid export options'
                    };
                }

                progress.report({ increment: 20, message: 'Validating content...' });

                // Check if operation was cancelled
                if (token.isCancellationRequested) {
                    return {
                        success: false,
                        message: 'Export cancelled by user'
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

                progress.report({ increment: 40, message: 'Processing diagram...' });

                // Attempt export with retry mechanism
                return await this.exportWithRetry(options, filePath, progress, token);
            });
        } catch (error: any) {
            const errorMessage = error.message || String(error);
            console.error('Export error:', errorMessage);
            
            // Enhanced error handling with proper categorization
            let errorCode = ErrorCode.RENDER_FAILURE;
            let userMessage = 'Export failed';
            
            if (errorMessage.includes('ENOENT')) {
                errorCode = ErrorCode.RENDER_JAVA_MISSING;
                userMessage = 'Required file not found. Please check PlantUML setup.';
            } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
                errorCode = ErrorCode.IO_SAVE_FAIL;
                userMessage = 'Permission denied. Please check file permissions.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
                errorCode = ErrorCode.LLM_TIMEOUT;
                userMessage = 'Operation timed out. Please try again.';
            } else if (errorMessage.includes('queue is full')) {
                errorCode = ErrorCode.RENDER_FAILURE;
                userMessage = 'Too many exports in progress. Please wait and try again.';
            } else if (errorMessage.includes('syntax') || errorMessage.includes('Syntax')) {
                errorCode = ErrorCode.RENDER_SYNTAX;
                userMessage = 'PlantUML syntax error. Please check your diagram code.';
            }
            
            ErrorHandler.handle(createError(errorCode, errorMessage));
            vscode.window.showErrorMessage(`${userMessage}: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
                message: `${userMessage}: ${errorMessage}`
            };
        }
    }

    /**
     * Export diagram as SVG
     */
    private async exportSVG(plantUML: string, filePath: string): Promise<ExportResult> {
        try {
            // Add size settings for larger SVG export
            const largerSvgContent = this.addSvgSizeSettings(plantUML);
            const svgContent = await this.renderer.renderToSVG(largerSvgContent);
            
            // Enhanced error detection
            const errorPatterns = ['Error:', 'PlantUML Setup Required', 'Syntax', 'Exception', 'Failed', 'Cannot'];
            const hasError = errorPatterns.some(pattern => 
                svgContent.toLowerCase().includes(pattern.toLowerCase())
            );
            
            if (hasError) {
                const errorMatch = svgContent.match(/<text[^>]*>([^<]*(?:Error|Syntax|Exception|Failed|Cannot)[^<]*)<\/text>/i);
                const errorDetail = errorMatch ? errorMatch[1].trim() : 'Failed to render diagram. Please check PlantUML setup and diagram syntax.';
                return {
                    success: false,
                    error: errorDetail,
                    message: errorDetail
                };
            }

            // Validate SVG content
            if (!svgContent || svgContent.length < 100) {
                return {
                    success: false,
                    error: 'Generated SVG content is invalid or too small',
                    message: 'Invalid SVG output'
                };
            }

            // Write SVG to file
            await fs.promises.writeFile(filePath, svgContent, 'utf-8');
            
            return {
                success: true,
                filePath: filePath,
                message: `SVG exported successfully to ${filePath}`
            };
        } catch (error: any) {
            const errorMessage = `Failed to export SVG: ${error.message}`;
            return {
                success: false,
                error: errorMessage,
                message: errorMessage
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
            
            if (!buffers || buffers.length === 0) {
                return {
                    success: false,
                    error: 'Failed to generate PNG buffer - rendering process returned empty result',
                    message: 'Empty render result'
                };
            }

            // Validate buffer content
            const buffer = buffers[0];
            if (!buffer || buffer.length === 0) {
                return {
                    success: false,
                    error: 'Generated PNG buffer is empty or invalid',
                    message: 'Invalid PNG buffer'
                };
            }

            // Check if buffer contains PNG signature
            if (buffer.length < 8 || !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
                return {
                    success: false,
                    error: 'Generated buffer is not a valid PNG file',
                    message: 'Invalid PNG format'
                };
            }

            // Write PNG buffer to file
            await fs.promises.writeFile(filePath, buffer);
            
            return {
                success: true,
                filePath: filePath,
                message: `PNG exported successfully to ${filePath}`
            };
        } catch (error: any) {
            const errorMessage = `Failed to export PNG: ${error.message}`;
            return {
                success: false,
                error: errorMessage,
                message: errorMessage
            };
        }
    }

    /**
     * Add high DPI settings to PlantUML content for better PNG quality
     */
    private addHighDpiSettings(content: string): string {
        // Consistent settings for PNG export to match SVG size
        const dpiSettings = [
            '!option handwritten true',
            'skinparam dpi 300',
            'skinparam backgroundColor #FFFFFF',
            'skinparam svgDimensionStyle false'
        ].join('\n') + '\n';
        
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
     * Add size settings for larger SVG export with white background
     */
    private addSvgSizeSettings(content: string): string {
        // Consistent settings for SVG export to match PNG size
        const sizeSettings = [
            '!option handwritten true',
            'skinparam dpi 300',
            'skinparam svgDimensionStyle false',
            'skinparam backgroundColor #FFFFFF'
        ].join('\n') + '\n';
        
        // Check if content already starts with @startuml
        if (content.trim().startsWith('@startuml')) {
            // Insert size settings after @startuml line
            const lines = content.split('\n');
            const startumlIndex = lines.findIndex(line => line.trim().startsWith('@startuml'));
            if (startumlIndex !== -1) {
                lines.splice(startumlIndex + 1, 0, sizeSettings);
                return lines.join('\n');
            }
        }
        
        // If no @startuml found or other cases, add at the beginning
        return sizeSettings + content;
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
    private validateExportOptions(options: ExportOptions): ValidationResult {
        if (!options.plantUML || options.plantUML.trim() === '') {
            return { isValid: false, error: 'PlantUML content is required' };
        }

        if (!['svg', 'png'].includes(options.format)) {
            return { isValid: false, error: `Unsupported format: ${options.format}. Supported formats: svg, png` };
        }

        // Basic PlantUML content validation
        const content = options.plantUML.trim();
        if (!content.includes('@startuml') || !content.includes('@enduml')) {
            return { isValid: false, error: 'Invalid PlantUML content. Must contain @startuml and @enduml tags.' };
        }

        return { isValid: true };
    }
    
    /**
     * Determine if an error is retryable
     */
    private isErrorRetryable(errorMessage: string): boolean {
        // Non-retryable errors (permanent failures)
        const nonRetryablePatterns = [
            'syntax error',
            'invalid plantuml',
            'permission denied',
            'eacces',
            'file not found',
            'enoent',
            'queue is full',
            'too many concurrent'
        ];
        
        const lowerError = errorMessage.toLowerCase();
        return !nonRetryablePatterns.some(pattern => lowerError.includes(pattern));
    }

    /**
     * Export with retry mechanism
     */
    private async exportWithRetry(options: ExportOptions, filePath: string, progress: vscode.Progress<{message?: string; increment?: number}>, token: vscode.CancellationToken): Promise<ExportResult> {
        let lastError: string = '';
        
        for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
            if (token.isCancellationRequested) {
                return {
                    success: false,
                    message: 'Export cancelled by user'
                };
            }

            try {
                progress.report({ 
                    increment: 20, 
                    message: attempt > 1 ? `Retrying export (${attempt}/${this.MAX_RETRY_ATTEMPTS})...` : 'Exporting...' 
                });

                let result: ExportResult;
                 if (options.format === 'svg') {
                     result = await this.exportSVG(options.plantUML, filePath);
                 } else {
                     result = await this.exportPNG(options.plantUML, filePath);
                 }

                if (result.success) {
                    progress.report({ increment: 100, message: 'Export completed!' });
                    return result;
                }

                lastError = result.error || result.message || 'Unknown error';
                
                // Check if error is retryable
                const isRetryable = this.isErrorRetryable(lastError);
                if (!isRetryable) {
                    console.log(`Non-retryable error encountered: ${lastError}`);
                    break; // Exit retry loop for non-retryable errors
                }
                
                if (attempt < this.MAX_RETRY_ATTEMPTS) {
                    const delay = this.RETRY_DELAY_MS * attempt; // Exponential backoff
                    progress.report({ message: `Retrying in ${delay}ms...` });
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error: any) {
                lastError = error.message || String(error);
                if (attempt < this.MAX_RETRY_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
                }
            }
        }

        return {
            success: false,
            error: `Export failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${lastError}`,
            message: `Export failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${lastError}`
        };
    }
}