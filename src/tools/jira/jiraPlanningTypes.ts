/**
 * TypeScript interfaces for AI Jira Planning Assistant
 * Defines the conversational workflow, requirement processing, and Jira integration types
 */

// === Core Planning Workflow Types ===

export interface PlanningWorkflowState {
    currentStep: PlanningStep;
    sessionId: string;
    startTime: Date;
    lastUpdateTime: Date;
    isCompleted: boolean;
    userConfirmations: { [step: string]: boolean };
    requirements: RequirementState;
    suggestions: SuggestionState;
    jiraOutput: JiraTicketCollection;
    conversationHistory: ConversationMessage[];
}

export enum PlanningStep {
    INITIAL_UNDERSTANDING = 'initial_understanding',
    REQUIREMENT_CONFIRMATION = 'requirement_confirmation', 
    SUGGESTION_REVIEW = 'suggestion_review',
    STRUCTURE_PLANNING = 'structure_planning',
    TICKET_GENERATION = 'ticket_generation',
    FINAL_REVIEW = 'final_review',
    COMPLETED = 'completed'
}

export interface ConversationMessage {
    id: string;
    timestamp: Date;
    type: 'user' | 'assistant' | 'system';
    content: string;
    step: PlanningStep;
    metadata?: {
        suggestionsProvided?: number;
        userChoices?: string[];
        confirmationRequired?: boolean;
        isTemporary?: boolean;
    };
}

// === Requirement Processing Types ===

export interface RequirementState {
    originalInput: string;
    processedRequirements: ProcessedRequirement[];
    clarifications: ClarificationRequest[];
    isConfirmed: boolean;
    modifications: RequirementModification[];
}

export interface ProcessedRequirement {
    id: string;
    category: RequirementCategory;
    title: string;
    description: string;
    priority: Priority;
    estimatedEffort: EffortEstimate;
    dependencies: string[];
    acceptanceCriteria: string[];
    technicalNotes: string[];
    businessValue: string;
    risks: string[];
}

export enum RequirementCategory {
    EPIC = 'epic',
    FEATURE = 'feature', 
    USER_STORY = 'user_story',
    TASK = 'task',
    BUG = 'bug',
    IMPROVEMENT = 'improvement',
    RESEARCH = 'research'
}

export enum Priority {
    CRITICAL = 'critical',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low'
}

export interface EffortEstimate {
    storyPoints?: number;
    timeEstimate?: string;
    complexity: 'simple' | 'medium' | 'complex';
    confidence: 'low' | 'medium' | 'high';
}

export interface ClarificationRequest {
    id: string;
    question: string;
    context: string;
    suggestedAnswers?: string[];
    isRequired: boolean;
    response?: string;
}

export interface RequirementModification {
    id: string;
    timestamp: Date;
    type: 'add' | 'remove' | 'modify' | 'clarify';
    target: string; // requirement ID or description
    originalValue?: string;
    newValue: string;
    reason: string;
}

// === Suggestion System Types ===

export interface SuggestionState {
    suggestions: ProfessionalSuggestion[];
    userChoices: SuggestionChoice[];
    appliedSuggestions: string[];
    rejectedSuggestions: string[];
}

export interface ProfessionalSuggestion {
    id: string;
    category: SuggestionCategory;
    title: string;
    description: string;
    impact: ImpactAssessment;
    implementation: ImplementationDetails;
    reasoning: string;
    priority: Priority;
    applicableRequirements: string[];
}

export enum SuggestionCategory {
    ARCHITECTURE = 'architecture',
    SECURITY = 'security',
    PERFORMANCE = 'performance', 
    USER_EXPERIENCE = 'user_experience',
    TESTING = 'testing',
    DEVOPS = 'devops',
    DOCUMENTATION = 'documentation',
    ACCESSIBILITY = 'accessibility',
    SCALABILITY = 'scalability',
    MAINTAINABILITY = 'maintainability'
}

export interface ImpactAssessment {
    effort: EffortEstimate;
    benefits: string[];
    risks: string[];
    dependencies: string[];
    timeline: string;
}

export interface ImplementationDetails {
    steps: string[];
    resources: string[];
    technologies: string[];
    considerations: string[];
}

export interface SuggestionChoice {
    suggestionId: string;
    action: 'accept' | 'reject' | 'modify';
    modifiedDescription?: string;
    reasoning?: string;
    timestamp: Date;
}

// === Jira Integration Types ===

export interface JiraTicketCollection {
    epics: JiraTicket[];
    stories: JiraTicket[];
    tasks: JiraTicket[];
    bugs: JiraTicket[];
    exportFormats: ExportFormat[];
}

export interface JiraTicket {
    id: string;
    type: JiraTicketType;
    summary: string;
    description: string;
    priority: Priority;
    labels: string[];
    components: string[];
    customFields: { [key: string]: any };
    parentTicket?: string;
    linkedTickets: TicketLink[];
    acceptanceCriteria: string[];
    estimatedEffort: EffortEstimate;
    assignee?: string;
    reporter?: string;
}

export enum JiraTicketType {
    EPIC = 'Epic',
    STORY = 'Story', 
    TASK = 'Task',
    SUB_TASK = 'Sub-task',
    BUG = 'Bug',
    IMPROVEMENT = 'Improvement'
}

export interface TicketLink {
    type: LinkType;
    targetTicketId: string;
    description?: string;
}

export enum LinkType {
    BLOCKS = 'blocks',
    IS_BLOCKED_BY = 'is blocked by',
    RELATES_TO = 'relates to',
    DEPENDS_ON = 'depends on',
    IS_DEPENDED_ON_BY = 'is depended on by',
    DUPLICATES = 'duplicates',
    IS_DUPLICATED_BY = 'is duplicated by'
}

export interface ExportFormat {
    format: 'csv' | 'json' | 'jira_import' | 'confluence';
    content: string;
    filename: string;
    description: string;
}

// === Webview Message Types ===

export interface JiraPlannerWebviewMessage {
    command: JiraPlannerCommand;
    data?: any;
    sessionId?: string;
}

export enum JiraPlannerCommand {
    // Workflow control
    START_PLANNING = 'start_planning',
    CONFIRM_STEP = 'confirm_step',
    GO_TO_STEP = 'go_to_step',
    RESTART_WORKFLOW = 'restart_workflow',
    
    // Input handling
    SEND_REQUIREMENT = 'send_requirement',
    
    // Requirement management
    UPDATE_REQUIREMENTS = 'update_requirements',
    ADD_CLARIFICATION = 'add_clarification',
    MODIFY_REQUIREMENT = 'modify_requirement',
    CONFIRM_REQUIREMENTS = 'confirm_requirements',
    
    // Suggestion interaction
    APPLY_SUGGESTION = 'apply_suggestion',
    REJECT_SUGGESTION = 'reject_suggestion',
    MODIFY_SUGGESTION = 'modify_suggestion',
    REQUEST_MORE_SUGGESTIONS = 'request_more_suggestions',
    
    // Jira ticket management
    GENERATE_TICKETS = 'generate_tickets',
    MODIFY_TICKET = 'modify_ticket',
    EXPORT_TICKETS = 'export_tickets',
    PREVIEW_EXPORT = 'preview_export',
    
    // Session management
    SAVE_SESSION = 'save_session',
    LOAD_SESSION = 'load_session',
    CLEAR_SESSION = 'clear_session',
    
    // UI interactions
    TOGGLE_STEP_DETAILS = 'toggle_step_details',
    SHOW_HELP = 'show_help',
    CHANGE_LANGUAGE = 'change_language'
}

// === Configuration and Settings ===

export interface JiraPlannerSettings {
    // AI behavior
    suggestionAggressiveness: 'conservative' | 'balanced' | 'aggressive';
    maxSuggestionsPerCategory: number;
    autoAdvanceSteps: boolean;
    
    // Jira integration
    defaultTicketType: JiraTicketType;
    defaultPriority: Priority;
    customFields: JiraCustomField[];
    
    // Workflow preferences
    requireConfirmations: boolean;
    showDetailedExplanations: boolean;
    language: 'en' | 'zh-CN';
    
    // Export settings
    preferredExportFormat: 'csv' | 'json' | 'jira_import';
    includeMetadata: boolean;
}

export interface JiraCustomField {
    id: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'multiselect' | 'date';
    defaultValue?: any;
    required: boolean;
    options?: string[];
}

// === Error and Validation Types ===

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    code: string;
    message: string;
    field?: string;
    severity: 'error' | 'warning';
}

export interface ValidationWarning {
    code: string;
    message: string;
    suggestion?: string;
}

// === Analytics and Metrics Types ===

export interface PlanningSessionMetrics {
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    totalDuration?: number;
    stepsCompleted: PlanningStep[];
    requirementsProcessed: number;
    suggestionsGenerated: number;
    suggestionsAccepted: number;
    ticketsGenerated: number;
    userInteractions: number;
    errorCount: number;
    language: string;
} 