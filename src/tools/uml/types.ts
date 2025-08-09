/**
 * Type definitions for UML Chat Panel
 */

export interface ChatMessage {
    role: 'user' | 'bot';
    message: string;
    timestamp?: number;
    id?: string;
    // Optional metadata (e.g., performance stats)
    meta?: {
        stats?: LLMStats;
    };
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
    currentEngine?: string;
}

export type DiagramType = '' | 'activity' | 'sequence' | 'usecase' | 'class' | 'component';

export interface WebviewMessage {
    command: 'sendRequirement' | 'renderSpecificUML' | 'exportSVG' | 'clearChat' | 'importChat' | 'exportChat' | 'editAndResendUserMsg' | 'deleteUserMsgAndFollowing' | 'onboardingComplete' | 'onboardingSkip' | 'generateExample';
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
    stats?: LLMStats; // optional LLM performance metrics
}

// User tutorial state type definition
export interface UserOnboardingState {
    hasSeenOnboarding: boolean;
    onboardingCompletedAt?: number;
}

// LLM performance / usage statistics (approximate token counts)
export interface LLMStats {
    engine: string; // 'plantuml' | 'mermaid'
    modelId?: string;
    modelLabel?: string;
    temperature?: number;
    // Timing
    startTimestamp?: string; // ISO
    endTimestamp?: string; // ISO
    firstByteMs?: number; // network + queue latency until first token
    waitingMs?: number; // alias of firstByteMs for clarity
    totalMs: number; // end - start
    generationMs?: number; // totalMs - firstByteMs
    // Sizes (raw character/line counts only)
    promptChars: number;
    responseChars: number;
    responseLines?: number; // total response lines
    diagramLines?: number; // lines inside diagram block
    diagramSizeChars?: number; // diagram block chars
    promptMessages?: number; // number of messages sent to model
    historyDepth?: number; // number of prior user messages
    // Diagram specifics
    diagramType?: DiagramType;
    // Rendering / caching (optional, may be filled later)
    renderMs?: number;
    cacheHit?: boolean;
    svgBytes?: number;
    // Session aggregates
    cumulativeGenerations?: number;
    // Environment / context (optional future fields)
    workspaceFolderCount?: number;
    openEditorsCount?: number;
    // Misc
    timestamp: string; // original stats creation timestamp (ISO)
}
