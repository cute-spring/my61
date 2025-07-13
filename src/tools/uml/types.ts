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

export type DiagramType = '' | 'activity' | 'sequence' | 'usecase' | 'class' | 'component';

export interface WebviewMessage {
    command: 'sendRequirement' | 'renderSpecificUML' | 'exportSVG' | 'clearChat' | 'importChat' | 'exportChat' | 'editAndResendUserMsg' | 'onboardingComplete' | 'onboardingSkip' | 'generateExample';
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

// User tutorial state type definition
export interface UserOnboardingState {
    hasSeenOnboarding: boolean;
    onboardingCompletedAt?: number;
}
