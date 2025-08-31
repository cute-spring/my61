/**
 * UML Renderer - Handles rendering PlantUML to SVG format
 */

import * as vscode from 'vscode';
import { localRender } from '../preview';
import { UML_TEMPLATES } from './constants';
import { ErrorHandler } from '../../core/errorHandler';
import { createError, ErrorCode } from '../../core/errors';

export class UMLRenderer {
    /**
     * Render PlantUML code to SVG format
     */
    async renderToSVG(plantuml: string): Promise<string> {
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
                return this.postProcessSVG(svgContent);
            }
            
            return UML_TEMPLATES.EMPTY_SVG;
        } catch (err: any) {
            const errorMessage = err.message || String(err);
            console.error('UML rendering error:', errorMessage);
            if (errorMessage.includes('PlantUML JAR not found')) {
                ErrorHandler.handle(createError(ErrorCode.RENDER_JAVA_MISSING, errorMessage));
                return this.createSetupInstructionsSVG();
            } else if (errorMessage.includes('Java executable not found')) {
                ErrorHandler.handle(createError(ErrorCode.RENDER_JAVA_MISSING, errorMessage));
                return this.createJavaRequiredSVG();
            } else if (/syntax|parse/i.test(errorMessage)) {
                ErrorHandler.handle(createError(ErrorCode.RENDER_SYNTAX, errorMessage));
            } else {
                ErrorHandler.handle(createError(ErrorCode.RENDER_FAILURE, errorMessage));
            }
            return UML_TEMPLATES.ERROR_SVG.replace('{message}', errorMessage);
        }
    }

    /**
     * Post-process SVG for better compatibility and display
     */
    private postProcessSVG(svgContent: string): string {
        // Ensure preserveAspectRatio is set correctly
        if (svgContent.includes('<svg') && !svgContent.includes('preserveAspectRatio')) {
            svgContent = svgContent.replace(
                /<svg([^>]*)>/,
                '<svg$1 preserveAspectRatio="xMidYMid meet">'
            );
        }
        
        // Log SVG dimensions for debugging
        const dimensions = this.extractSVGDimensions(svgContent);
        console.log('Generated SVG dimensions:', dimensions);
        
        return svgContent;
    }

    /**
     * Extract SVG dimensions for debugging
     */
    private extractSVGDimensions(svgContent: string) {
        const widthMatch = svgContent.match(/width="([^"]+)"/);
        const heightMatch = svgContent.match(/height="([^"]+)"/);
        const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
        
        return {
            width: widthMatch ? widthMatch[1] : 'none',
            height: heightMatch ? heightMatch[1] : 'none',
            viewBox: viewBoxMatch ? viewBoxMatch[1] : 'none'
        };
    }

    /**
     * Validate if content is valid PlantUML
     */
    isValidPlantUML(content: string): boolean {
        return content.includes('@startuml') && content.includes('@enduml');
    }

    /**
     * Extract PlantUML code from text
     */
    extractPlantUMLCode(text: string): string | null {
        const umlRegex = /@startuml[\s\S]*?@enduml/;
        const match = text.match(umlRegex);
        return match ? match[0] : null;
    }

    /**
     * Create SVG with setup instructions for PlantUML JAR
     */
    private createSetupInstructionsSVG(): string {
        return `<svg width="500" height="300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300">
            <rect width="500" height="300" fill="#f8f8f8" stroke="#ccc"/>
            <text x="250" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#d73027">PlantUML Setup Required</text>
            <text x="250" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#333">PlantUML JAR file not found.</text>
            <text x="250" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">To use UML diagram generation, please:</text>
            <text x="250" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">1. Download plantuml.jar from https://plantuml.com/download</text>
            <text x="250" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">2. Set the path in VS Code settings: plantuml.jarPath</text>
            <text x="250" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">3. Or install the PlantUML extension for automatic setup</text>
            <text x="250" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#999">For now, you can still chat about UML concepts</text>
        </svg>`;
    }

    /**
     * Create SVG with Java requirement message
     */
    private createJavaRequiredSVG(): string {
        return `<svg width="500" height="300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300">
            <rect width="500" height="300" fill="#f8f8f8" stroke="#ccc"/>
            <text x="250" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#d73027">Java Required</text>
            <text x="250" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#333">Java executable not found.</text>
            <text x="250" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">To use UML diagram generation, please:</text>
            <text x="250" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">1. Install Java 8 or higher from https://adoptium.net/</text>
            <text x="250" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">2. Ensure Java is in your system PATH</text>
            <text x="250" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">3. Or configure the Java path in VS Code settings</text>
            <text x="250" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#999">For now, you can still chat about UML concepts</text>
        </svg>`;
    }
}
