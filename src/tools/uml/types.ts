/**
 * Type definitions for UML Chat Panel
 */

export interface ChatMessage {
    role: 'user' | 'bot';
    message: string;
    timestamp?: number;
    id?: string;
}

export interface UMLDiagramConfig {
    type: DiagramType;
    plantUML: string;
    lastModified?: number;
}

export interface SessionData {
    version: number;
    chatHistory: ChatMessage[];
    currentPlantUML: string;
    lastDiagramType?: string;
}

export type DiagramType = '' | 'class' | 'sequence' | 'activity' | 'usecase' | 'state' | 'component' | 'deployment';

export interface WebviewMessage {
    command: 'sendRequirement' | 'renderSpecificUML' | 'exportSVG' | 'clearChat' | 'importChat' | 'exportChat' | 'editAndResendUserMsg';
    [key: string]: any;
}

export interface UMLGenerationRequest {
    requirement: string;
    diagramType?: DiagramType;
    history: string[];
}

export interface UMLGenerationResponse {
    plantUML: string;
    diagramType: DiagramType;
    explanation?: string;
}
