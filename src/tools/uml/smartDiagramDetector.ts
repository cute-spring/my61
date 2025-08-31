import * as vscode from 'vscode';

/**
 * Interface for detected diagram information
 */
export interface DiagramBlock {
    /** The complete diagram content including @startuml and @enduml */
    content: string;
    /** The diagram content without @startuml and @enduml tags */
    innerContent: string;
    /** Start position of the diagram block */
    startPosition: vscode.Position;
    /** End position of the diagram block */
    endPosition: vscode.Position;
    /** Range of the entire diagram block */
    range: vscode.Range;
    /** Range of just the inner content (without tags) */
    innerRange: vscode.Range;
    /** Optional diagram type if detected */
    diagramType?: string;
    /** Index of this diagram in the document (0-based) */
    index: number;
}

/**
 * Result of cursor-based diagram detection
 */
export interface CursorDiagramResult {
    /** The diagram block containing the cursor, if any */
    diagram: DiagramBlock | null;
    /** All diagram blocks found in the document */
    allDiagrams: DiagramBlock[];
    /** Whether the cursor is inside a diagram block */
    isInsideDiagram: boolean;
}

/**
 * Smart diagram detection service for PlantUML diagrams
 */
export class SmartDiagramDetector {
    // Regex patterns for PlantUML detection
    private static readonly PLANTUML_START_PATTERN = /@startuml(?:\s+([^\r\n]*))?/gi;
    private static readonly PLANTUML_END_PATTERN = /@enduml/gi;
    private static readonly PLANTUML_BLOCK_PATTERN = /@startuml(?:\s+([^\r\n]*))?[\s\S]*?@enduml/gi;
    
    // Diagram type detection patterns
    private static readonly DIAGRAM_TYPE_PATTERNS = {
        activity: /(?:start|stop|if\s*\(|while\s*\(|fork|end\s+fork|partition)/i,
        sequence: /(?:participant|actor|boundary|control|entity|database|collections|queue|->|<-|-->|<--|\+\+|--|note\s+(?:left|right|over))/i,
        class: /(?:class\s+\w+|interface\s+\w+|enum\s+\w+|abstract\s+class|\|\||\.\.\||<\|--|-->|\*--|o--)/i,
        component: /(?:component\s+\w+|\[.*\]|package\s+\w+|node\s+\w+|cloud\s+\w+|database\s+\w+)/i,
        usecase: /(?:usecase\s+\w+|actor\s+\w+|\(.*\)|rectangle\s+\w+|-->)/i,
        state: /(?:state\s+\w+|\[\*\]|-->|note\s+(?:left|right|top|bottom))/i
    };

    /**
     * Parse all PlantUML diagram blocks from a document
     */
    public static parseDocument(document: vscode.TextDocument): DiagramBlock[] {
        const text = document.getText();
        const diagrams: DiagramBlock[] = [];
        
        // Reset regex lastIndex to ensure fresh matching
        this.PLANTUML_BLOCK_PATTERN.lastIndex = 0;
        
        let match;
        let index = 0;
        
        while ((match = this.PLANTUML_BLOCK_PATTERN.exec(text)) !== null) {
            const fullMatch = match[0];
            const startOffset = match.index;
            const endOffset = startOffset + fullMatch.length;
            
            // Find the positions of @startuml and @enduml
            const startPosition = document.positionAt(startOffset);
            const endPosition = document.positionAt(endOffset);
            
            // Extract inner content (without @startuml and @enduml)
            const innerContent = this.extractInnerContent(fullMatch);
            const innerStartOffset = text.indexOf('\n', startOffset) + 1;
            const innerEndOffset = text.lastIndexOf('@enduml', endOffset);
            
            const innerStartPosition = document.positionAt(innerStartOffset);
            const innerEndPosition = document.positionAt(innerEndOffset);
            
            // Detect diagram type
            const diagramType = this.detectDiagramType(innerContent);
            
            const diagramBlock: DiagramBlock = {
                content: fullMatch,
                innerContent: innerContent.trim(),
                startPosition,
                endPosition,
                range: new vscode.Range(startPosition, endPosition),
                innerRange: new vscode.Range(innerStartPosition, innerEndPosition),
                diagramType,
                index
            };
            
            diagrams.push(diagramBlock);
            index++;
        }
        
        return diagrams;
    }

    /**
     * Find the diagram block that contains the given cursor position
     */
    public static findDiagramAtCursor(
        document: vscode.TextDocument, 
        position: vscode.Position
    ): CursorDiagramResult {
        const allDiagrams = this.parseDocument(document);
        
        // Find diagram containing the cursor
        const diagram = allDiagrams.find(d => d.range.contains(position)) || null;
        
        return {
            diagram,
            allDiagrams,
            isInsideDiagram: diagram !== null
        };
    }

    /**
     * Get the diagram block at the current active editor cursor
     */
    public static getCurrentDiagram(): CursorDiagramResult | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }
        
        const position = editor.selection.active;
        return this.findDiagramAtCursor(editor.document, position);
    }

    /**
     * Extract inner content from a PlantUML block (removes @startuml and @enduml)
     */
    private static extractInnerContent(fullContent: string): string {
        // Remove @startuml line
        let content = fullContent.replace(/@startuml(?:\s+[^\r\n]*)?[\r\n]?/i, '');
        // Remove @enduml line
        content = content.replace(/[\r\n]?@enduml\s*$/i, '');
        return content;
    }

    /**
     * Detect the type of PlantUML diagram based on content
     */
    private static detectDiagramType(content: string): string | undefined {
        for (const [type, pattern] of Object.entries(this.DIAGRAM_TYPE_PATTERNS)) {
            if (pattern.test(content)) {
                return type;
            }
        }
        return undefined;
    }

    /**
     * Validate if a text block is a valid PlantUML diagram
     */
    public static isValidPlantUMLBlock(text: string): boolean {
        const trimmed = text.trim();
        return /@startuml/i.test(trimmed) && /@enduml/i.test(trimmed);
    }

    /**
     * Get all PlantUML diagram ranges in a document (useful for syntax highlighting)
     */
    public static getDiagramRanges(document: vscode.TextDocument): vscode.Range[] {
        return this.parseDocument(document).map(d => d.range);
    }

    /**
     * Find the next diagram block after the given position
     */
    public static findNextDiagram(
        document: vscode.TextDocument, 
        position: vscode.Position
    ): DiagramBlock | null {
        const diagrams = this.parseDocument(document);
        if (diagrams.length === 0) return null;
        
        // Find current diagram index
        let currentIndex = -1;
        for (let i = 0; i < diagrams.length; i++) {
            if (diagrams[i].range.contains(position)) {
                currentIndex = i;
                break;
            }
        }
        
        // If cursor is not in any diagram, find the first diagram after cursor
        if (currentIndex === -1) {
            return diagrams.find(d => d.startPosition.isAfter(position)) || diagrams[0];
        }
        
        // Return next diagram, or wrap to first if at end
        return diagrams[currentIndex + 1] || diagrams[0];
    }

    /**
     * Find the previous diagram block before the given position
     */
    public static findPreviousDiagram(
        document: vscode.TextDocument, 
        position: vscode.Position
    ): DiagramBlock | null {
        const diagrams = this.parseDocument(document);
        if (diagrams.length === 0) return null;
        
        // Find current diagram index
        let currentIndex = -1;
        for (let i = 0; i < diagrams.length; i++) {
            if (diagrams[i].range.contains(position)) {
                currentIndex = i;
                break;
            }
        }
        
        // If cursor is not in any diagram, find the last diagram before cursor
        if (currentIndex === -1) {
            for (let i = diagrams.length - 1; i >= 0; i--) {
                if (diagrams[i].startPosition.isBefore(position)) {
                    return diagrams[i];
                }
            }
            return diagrams[diagrams.length - 1];
        }
        
        // Return previous diagram, or wrap to last if at beginning
        return diagrams[currentIndex - 1] || diagrams[diagrams.length - 1];
    }

    /**
     * Get statistics about PlantUML diagrams in a document
     */
    public static getDocumentStats(document: vscode.TextDocument): {
        totalDiagrams: number;
        diagramTypes: Record<string, number>;
        averageDiagramLength: number;
    } {
        const diagrams = this.parseDocument(document);
        const diagramTypes: Record<string, number> = {};
        let totalLength = 0;
        
        diagrams.forEach(diagram => {
            const type = diagram.diagramType || 'unknown';
            diagramTypes[type] = (diagramTypes[type] || 0) + 1;
            totalLength += diagram.content.length;
        });
        
        return {
            totalDiagrams: diagrams.length,
            diagramTypes,
            averageDiagramLength: diagrams.length > 0 ? Math.round(totalLength / diagrams.length) : 0
        };
    }
}