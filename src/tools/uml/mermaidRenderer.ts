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
     * Render Mermaid code to SVG format
     */
    async renderToSVG(mermaidCode: string): Promise<string> {
        try {
            // Extract Mermaid code from the response if it contains markdown
            const cleanMermaidCode = this.extractMermaidCode(mermaidCode);
            
            if (!cleanMermaidCode) {
                return this.createErrorSVG('No valid Mermaid code found');
            }

            console.log('Attempting to render Mermaid code:', cleanMermaidCode.substring(0, 100) + '...');

            // Since Mermaid requires a DOM environment and we're in Node.js,
            // we'll create a simple SVG representation of the Mermaid code
            return this.createMermaidCodeFallback(mermaidCode);
            
        } catch (err: any) {
            const errorMessage = err.message || String(err);
            console.error('Mermaid rendering error:', errorMessage);
            return this.createMermaidCodeFallback(mermaidCode);
        }
    }

    /**
     * Extract Mermaid code from response text
     */
    private extractMermaidCode(response: string): string {
        console.log('Extracting Mermaid code from:', response.substring(0, 200) + '...');
        
        // Try to find Mermaid code block with more flexible matching
        const mermaidMatch = response.match(/```mermaid\s*([\s\S]*?)\s*```/i);
        if (mermaidMatch && mermaidMatch[1]) {
            const extracted = mermaidMatch[1].trim();
            console.log('Extracted Mermaid code:', extracted.substring(0, 100) + '...');
            return extracted;
        }
        
        // Try to find any code block
        const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
            const extracted = codeBlockMatch[1].trim();
            console.log('Extracted code block:', extracted.substring(0, 100) + '...');
            return extracted;
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