/**
 * AI Jira Planner Workflow Engine
 * Implements intelligent conversation flow and requirement processing capabilities
 */

import * as vscode from 'vscode';
import { getLLMResponse } from '../../llm';
import {
    PlanningWorkflowState,
    PlanningStep,
    ConversationMessage,
    RequirementState,
    SuggestionState,
    ProcessedRequirement,
    ProfessionalSuggestion,
    RequirementCategory,
    SuggestionCategory,
    Priority,
    EffortEstimate,
    ClarificationRequest,
    RequirementModification,
    ImpactAssessment,
    ImplementationDetails,
    SuggestionChoice,
    JiraTicketCollection,
    JiraTicket,
    JiraTicketType,
    ValidationResult,
    ValidationError
} from './jiraPlanningTypes';

/**
 * Core Workflow Engine - Manages the planning workflow state and progression
 */
export class WorkflowEngine {
    private sessionCache = new Map<string, PlanningWorkflowState>();

    /**
     * Initialize a new planning session
     */
    async initializeSession(input: string, settings: vscode.WorkspaceConfiguration): Promise<PlanningWorkflowState> {
        const sessionId = this.generateSessionId();
        
        const session: PlanningWorkflowState = {
            currentStep: PlanningStep.INITIAL_UNDERSTANDING,
            sessionId,
            startTime: new Date(),
            lastUpdateTime: new Date(),
            isCompleted: false,
            userConfirmations: {},
            requirements: {
                originalInput: input,
                processedRequirements: [],
                clarifications: [],
                isConfirmed: false,
                modifications: []
            },
            suggestions: {
                suggestions: [],
                userChoices: [],
                appliedSuggestions: [],
                rejectedSuggestions: []
            },
            jiraOutput: {
                epics: [],
                stories: [],
                tasks: [],
                bugs: [],
                exportFormats: []
            },
            conversationHistory: [{
                id: this.generateId(),
                timestamp: new Date(),
                type: 'user',
                content: input,
                step: PlanningStep.INITIAL_UNDERSTANDING
            }]
        };

        this.sessionCache.set(sessionId, session);
        return session;
    }

    /**
     * Get the next step in the workflow
     */
    getNextStep(currentStep: PlanningStep): PlanningStep | null {
        const stepOrder: PlanningStep[] = [
            PlanningStep.INITIAL_UNDERSTANDING,
            PlanningStep.REQUIREMENT_CONFIRMATION,
            PlanningStep.SUGGESTION_REVIEW,
            PlanningStep.STRUCTURE_PLANNING,
            PlanningStep.TICKET_GENERATION,
            PlanningStep.FINAL_REVIEW,
            PlanningStep.COMPLETED
        ];

        const currentIndex = stepOrder.indexOf(currentStep);
        return currentIndex < stepOrder.length - 1 ? stepOrder[currentIndex + 1] : null;
    }

    /**
     * Validate and restore a session from saved data
     */
    validateAndRestoreSession(sessionData: any): PlanningWorkflowState {
        // Basic validation
        if (!sessionData.sessionId || !sessionData.requirements || !sessionData.conversationHistory) {
            throw new Error('Invalid session data format');
        }

        // Restore dates
        if (sessionData.startTime) {
            sessionData.startTime = new Date(sessionData.startTime);
        }
        if (sessionData.lastUpdateTime) {
            sessionData.lastUpdateTime = new Date(sessionData.lastUpdateTime);
        }
        
        // Restore conversation message dates
        if (sessionData.conversationHistory) {
            sessionData.conversationHistory.forEach((msg: any) => {
                if (msg.timestamp) {
                    msg.timestamp = new Date(msg.timestamp);
                }
            });
        }

        // Cache the restored session
        this.sessionCache.set(sessionData.sessionId, sessionData);
        
        return sessionData as PlanningWorkflowState;
    }

    /**
     * Update session state
     */
    updateSession(sessionId: string, updates: Partial<PlanningWorkflowState>): void {
        const session = this.sessionCache.get(sessionId);
        if (session) {
            Object.assign(session, updates);
            session.lastUpdateTime = new Date();
            this.sessionCache.set(sessionId, session);
        }
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): PlanningWorkflowState | undefined {
        return this.sessionCache.get(sessionId);
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}

/**
 * Requirement Processor - Handles intelligent requirement analysis and processing
 */
export class RequirementProcessor {
    
    /**
     * Process AI analysis into structured requirements
     */
    async processAnalysis(originalInput: string, analysis: string): Promise<RequirementState> {
        const prompt = `As an expert business analyst and software architect, analyze the following AI-generated analysis and extract structured requirements:

Original Input: "${originalInput}"

AI Analysis: ${analysis}

Extract and structure the requirements in the following JSON format:
{
  "requirements": [
    {
      "id": "unique_id",
      "category": "epic|feature|user_story|task|improvement|research",
      "title": "Clear, concise title",
      "description": "Detailed description",
      "priority": "critical|high|medium|low",
      "estimatedEffort": {
        "storyPoints": number_or_null,
        "timeEstimate": "string_or_null",
        "complexity": "simple|medium|complex",
        "confidence": "low|medium|high"
      },
      "dependencies": ["array_of_dependency_descriptions"],
      "acceptanceCriteria": ["array_of_acceptance_criteria"],
      "technicalNotes": ["array_of_technical_considerations"],
      "businessValue": "description_of_business_value",
      "risks": ["array_of_potential_risks"]
    }
  ],
  "clarifications": [
    {
      "id": "unique_id",
      "question": "Clear question",
      "context": "Context for the question",
      "suggestedAnswers": ["array_of_possible_answers"],
      "isRequired": true_or_false
    }
  ]
}

Be comprehensive but realistic. Break down complex requirements into manageable components. Provide thoughtful estimates and identify genuine risks and dependencies.`;

        try {
            const response = await getLLMResponse(prompt);
            if (!response) {
                throw new Error('No response from AI');
            }

            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Could not extract JSON from AI response');
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            
            return {
                originalInput,
                processedRequirements: parsedData.requirements.map((req: any) => ({
                    ...req,
                    id: req.id || this.generateId()
                })),
                clarifications: parsedData.clarifications.map((clarification: any) => ({
                    ...clarification,
                    id: clarification.id || this.generateId()
                })),
                isConfirmed: false,
                modifications: []
            };
        } catch (error) {
            console.error('Error processing analysis:', error);
            
            // Fallback: Create basic requirements manually
            return this.createFallbackRequirements(originalInput, analysis);
        }
    }

    /**
     * Apply a suggestion to modify requirements
     */
    async applySuggestion(suggestion: ProfessionalSuggestion, modifications?: string): Promise<void> {
        // Implementation for applying suggestions to requirements
        console.log(`Applying suggestion: ${suggestion.title}`, modifications);
    }

    /**
     * Update requirements based on user input
     */
    async updateRequirements(currentState: RequirementState, updates: any): Promise<RequirementState> {
        const newState = { ...currentState };
        
        if (updates.type === 'add') {
            const newRequirement: ProcessedRequirement = {
                id: this.generateId(),
                category: updates.category || RequirementCategory.FEATURE,
                title: updates.title,
                description: updates.description,
                priority: updates.priority || Priority.MEDIUM,
                estimatedEffort: {
                    complexity: 'medium',
                    confidence: 'medium'
                },
                dependencies: updates.dependencies || [],
                acceptanceCriteria: updates.acceptanceCriteria || [],
                technicalNotes: updates.technicalNotes || [],
                businessValue: updates.businessValue || '',
                risks: updates.risks || []
            };
            
            newState.processedRequirements.push(newRequirement);
        } else if (updates.type === 'modify') {
            const reqIndex = newState.processedRequirements.findIndex(r => r.id === updates.id);
            if (reqIndex !== -1) {
                newState.processedRequirements[reqIndex] = {
                    ...newState.processedRequirements[reqIndex],
                    ...updates.changes
                };
            }
        } else if (updates.type === 'remove') {
            newState.processedRequirements = newState.processedRequirements.filter(r => r.id !== updates.id);
        }

        // Add modification record
        const modification: RequirementModification = {
            id: this.generateId(),
            timestamp: new Date(),
            type: updates.type,
            target: updates.id || updates.title,
            originalValue: updates.originalValue,
            newValue: updates.description || updates.title,
            reason: updates.reason || 'User modification'
        };
        
        newState.modifications.push(modification);
        
        return newState;
    }

    /**
     * Validate requirements for completeness and consistency
     */
    validateRequirements(requirements: ProcessedRequirement[]): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        requirements.forEach(req => {
            // Check for required fields
            if (!req.title || req.title.trim().length < 3) {
                errors.push({
                    code: 'TITLE_TOO_SHORT',
                    message: 'Requirement title must be at least 3 characters',
                    field: 'title',
                    severity: 'error'
                });
            }

            if (!req.description || req.description.trim().length < 10) {
                errors.push({
                    code: 'DESCRIPTION_TOO_SHORT',
                    message: 'Requirement description must be at least 10 characters',
                    field: 'description',
                    severity: 'error'
                });
            }

            // Check for missing acceptance criteria on user stories
            if (req.category === RequirementCategory.USER_STORY && req.acceptanceCriteria.length === 0) {
                warnings.push({
                    code: 'MISSING_ACCEPTANCE_CRITERIA',
                    message: 'User stories should have acceptance criteria',
                    field: 'acceptanceCriteria',
                    severity: 'warning'
                });
            }

            // Check for high-priority items without effort estimates
            if (req.priority === Priority.CRITICAL || req.priority === Priority.HIGH) {
                if (!req.estimatedEffort.storyPoints && !req.estimatedEffort.timeEstimate) {
                    warnings.push({
                        code: 'MISSING_EFFORT_ESTIMATE',
                        message: 'High-priority items should have effort estimates',
                        field: 'estimatedEffort',
                        severity: 'warning'
                    });
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private createFallbackRequirements(originalInput: string, analysis: string): RequirementState {
        // Create a basic requirement from the original input
        const basicRequirement: ProcessedRequirement = {
            id: this.generateId(),
            category: RequirementCategory.FEATURE,
            title: `Main Feature: ${originalInput.substring(0, 50)}...`,
            description: originalInput,
            priority: Priority.MEDIUM,
            estimatedEffort: {
                complexity: 'medium',
                confidence: 'low'
            },
            dependencies: [],
            acceptanceCriteria: ['Functionality works as described', 'User can successfully complete the task'],
            technicalNotes: ['Implementation details to be determined'],
            businessValue: 'Provides requested functionality to users',
            risks: ['Requirements may need further clarification']
        };

        return {
            originalInput,
            processedRequirements: [basicRequirement],
            clarifications: [{
                id: this.generateId(),
                question: 'Would you like to provide more specific details about the requirements?',
                context: 'The initial analysis could benefit from additional clarification',
                suggestedAnswers: ['Yes, let me provide more details', 'No, proceed with current understanding'],
                isRequired: false
            }],
            isConfirmed: false,
            modifications: []
        };
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}

/**
 * Suggestion Generator - Creates professional suggestions based on requirements
 */
export class SuggestionGenerator {
    
    /**
     * Generate professional suggestions based on requirements
     */
    async generateSuggestions(requirements: ProcessedRequirement[]): Promise<SuggestionState> {
        const prompt = `As a senior software architect and engineering manager, analyze the following requirements and provide professional suggestions for improvement:

Requirements:
${requirements.map(req => `
- ${req.title} (${req.category}, ${req.priority})
  Description: ${req.description}
  Business Value: ${req.businessValue}
  Technical Notes: ${req.technicalNotes.join(', ')}
  Risks: ${req.risks.join(', ')}
`).join('\n')}

Provide suggestions in the following JSON format:
{
  "suggestions": [
    {
      "id": "unique_id",
      "category": "architecture|security|performance|user_experience|testing|devops|documentation|accessibility|scalability|maintainability",
      "title": "Clear, actionable title",
      "description": "Detailed description of the suggestion",
      "reasoning": "Why this suggestion is valuable",
      "priority": "critical|high|medium|low",
      "impact": {
        "effort": {
          "complexity": "simple|medium|complex",
          "confidence": "low|medium|high",
          "timeEstimate": "estimated_time"
        },
        "benefits": ["array_of_benefits"],
        "risks": ["array_of_risks"],
        "dependencies": ["array_of_dependencies"],
        "timeline": "suggested_timeline"
      },
      "implementation": {
        "steps": ["array_of_implementation_steps"],
        "resources": ["array_of_required_resources"],
        "technologies": ["array_of_technologies"],
        "considerations": ["array_of_considerations"]
      },
      "applicableRequirements": ["array_of_requirement_ids"]
    }
  ]
}

Focus on:
1. Architecture improvements (scalability, maintainability, modularity)
2. Security considerations (authentication, authorization, data protection)
3. Performance optimizations (caching, database, API efficiency)
4. User experience enhancements (accessibility, usability, responsiveness)
5. Testing strategies (unit, integration, end-to-end testing)
6. DevOps improvements (CI/CD, monitoring, deployment)
7. Documentation needs (API docs, user guides, technical specs)

Provide 3-5 high-value suggestions that would genuinely improve the project.`;

        try {
            const response = await getLLMResponse(prompt);
            if (!response) {
                throw new Error('No response from AI');
            }

            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Could not extract JSON from AI response');
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            
            return {
                suggestions: parsedData.suggestions.map((suggestion: any) => ({
                    ...suggestion,
                    id: suggestion.id || this.generateId()
                })),
                userChoices: [],
                appliedSuggestions: [],
                rejectedSuggestions: []
            };
        } catch (error) {
            console.error('Error generating suggestions:', error);
            
            // Fallback: Return basic suggestions
            return this.createFallbackSuggestions(requirements);
        }
    }

    /**
     * Generate additional suggestions based on user request
     */
    async generateMoreSuggestions(
        requirements: ProcessedRequirement[], 
        existingSuggestions: ProfessionalSuggestion[],
        category?: SuggestionCategory
    ): Promise<ProfessionalSuggestion[]> {
        const categoryFilter = category ? `Focus specifically on ${category} suggestions.` : '';
        
        const prompt = `Generate additional professional suggestions for the given requirements. 
        ${categoryFilter}
        
        Existing suggestions to avoid duplicating:
        ${existingSuggestions.map(s => s.title).join(', ')}
        
        Requirements:
        ${requirements.map(req => `- ${req.title}: ${req.description}`).join('\n')}
        
        Provide 2-3 new, different suggestions in the same JSON format as before.`;

        try {
            const response = await getLLMResponse(prompt);
            if (!response) {
                return [];
            }
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsedData = JSON.parse(jsonMatch[0]);
                return parsedData.suggestions || [];
            }
        } catch (error) {
            console.error('Error generating additional suggestions:', error);
        }

        return [];
    }

    private createFallbackSuggestions(requirements: ProcessedRequirement[]): SuggestionState {
        const fallbackSuggestions: ProfessionalSuggestion[] = [
            {
                id: this.generateId(),
                category: SuggestionCategory.TESTING,
                title: 'Implement Comprehensive Testing Strategy',
                description: 'Add unit tests, integration tests, and end-to-end testing to ensure code quality and reliability.',
                reasoning: 'Testing is crucial for maintaining code quality and preventing regressions as the project grows.',
                priority: Priority.HIGH,
                impact: {
                    effort: {
                        complexity: 'medium',
                        confidence: 'high',
                        timeEstimate: '1-2 weeks'
                    },
                    benefits: ['Improved code quality', 'Faster debugging', 'Reduced production bugs'],
                    risks: ['Initial setup time', 'Learning curve for team'],
                    dependencies: ['Testing framework selection', 'CI/CD pipeline setup'],
                    timeline: 'Should be implemented early in development'
                },
                implementation: {
                    steps: ['Choose testing framework', 'Set up testing environment', 'Write initial tests', 'Integrate with CI/CD'],
                    resources: ['Testing tools', 'Developer time', 'Test data'],
                    technologies: ['Jest', 'Cypress', 'Testing Library'],
                    considerations: ['Test coverage goals', 'Performance impact', 'Maintenance overhead']
                },
                applicableRequirements: requirements.map(r => r.id)
            },
            {
                id: this.generateId(),
                category: SuggestionCategory.SECURITY,
                title: 'Implement Security Best Practices',
                description: 'Add authentication, authorization, input validation, and data encryption to protect user data.',
                reasoning: 'Security should be built-in from the start to protect user data and prevent vulnerabilities.',
                priority: Priority.CRITICAL,
                impact: {
                    effort: {
                        complexity: 'complex',
                        confidence: 'medium',
                        timeEstimate: '2-3 weeks'
                    },
                    benefits: ['Data protection', 'Compliance readiness', 'User trust'],
                    risks: ['Implementation complexity', 'Performance overhead'],
                    dependencies: ['Security framework selection', 'Compliance requirements'],
                    timeline: 'Must be implemented before production deployment'
                },
                implementation: {
                    steps: ['Security audit', 'Choose security framework', 'Implement authentication', 'Add encryption'],
                    resources: ['Security expertise', 'SSL certificates', 'Security tools'],
                    technologies: ['OAuth 2.0', 'JWT', 'bcrypt', 'HTTPS'],
                    considerations: ['Performance impact', 'User experience', 'Compliance requirements']
                },
                applicableRequirements: requirements.map(r => r.id)
            },
            {
                id: this.generateId(),
                category: SuggestionCategory.DOCUMENTATION,
                title: 'Create Comprehensive Documentation',
                description: 'Develop user guides, API documentation, and technical specifications for better project understanding.',
                reasoning: 'Good documentation improves team productivity and makes the project more maintainable.',
                priority: Priority.MEDIUM,
                impact: {
                    effort: {
                        complexity: 'simple',
                        confidence: 'high',
                        timeEstimate: '1 week'
                    },
                    benefits: ['Better team collaboration', 'Easier onboarding', 'Reduced support burden'],
                    risks: ['Documentation maintenance overhead'],
                    dependencies: ['Documentation platform selection'],
                    timeline: 'Should be maintained throughout development'
                },
                implementation: {
                    steps: ['Choose documentation platform', 'Create templates', 'Write initial docs', 'Set up auto-generation'],
                    resources: ['Technical writer', 'Documentation tools', 'Time allocation'],
                    technologies: ['Markdown', 'GitBook', 'Swagger', 'JSDoc'],
                    considerations: ['Maintenance process', 'Version control', 'Accessibility']
                },
                applicableRequirements: requirements.map(r => r.id)
            }
        ];

        return {
            suggestions: fallbackSuggestions,
            userChoices: [],
            appliedSuggestions: [],
            rejectedSuggestions: []
        };
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}

/**
 * Jira Ticket Generator - Creates structured Jira tickets from requirements
 */
export class JiraTicketGenerator {
    
    /**
     * Generate Jira tickets from processed requirements and applied suggestions
     */
    async generateTickets(
        requirements: ProcessedRequirement[], 
        appliedSuggestions: string[]
    ): Promise<JiraTicketCollection> {
        const prompt = `As a project manager and Jira expert, create structured Jira tickets from the following requirements:

Requirements:
${requirements.map(req => `
- ID: ${req.id}
- Title: ${req.title}
- Category: ${req.category}
- Priority: ${req.priority}
- Description: ${req.description}
- Acceptance Criteria: ${req.acceptanceCriteria.join('; ')}
- Business Value: ${req.businessValue}
- Dependencies: ${req.dependencies.join('; ')}
- Estimated Effort: ${JSON.stringify(req.estimatedEffort)}
`).join('\n')}

Create Jira tickets in the following JSON format:
{
  "epics": [/* Epic tickets */],
  "stories": [/* Story tickets */],
  "tasks": [/* Task tickets */],
  "bugs": [/* Bug tickets */]
}

Each ticket should have:
{
  "id": "unique_id",
  "type": "Epic|Story|Task|Sub-task|Bug|Improvement",
  "summary": "Clear, concise summary (max 100 chars)",
  "description": "Detailed description with acceptance criteria",
  "priority": "Critical|High|Medium|Low",
  "labels": ["array_of_relevant_labels"],
  "components": ["array_of_component_names"],
  "customFields": {},
  "parentTicket": "parent_ticket_id_if_applicable",
  "linkedTickets": [
    {
      "type": "blocks|is_blocked_by|relates_to|depends_on",
      "targetTicketId": "target_ticket_id",
      "description": "relationship_description"
    }
  ],
  "acceptanceCriteria": ["array_of_acceptance_criteria"],
  "estimatedEffort": {
    "storyPoints": number_or_null,
    "timeEstimate": "string_or_null",
    "complexity": "simple|medium|complex",
    "confidence": "low|medium|high"
  }
}

Guidelines:
1. Create Epic tickets for high-level business objectives
2. Break down Epics into Stories for user-facing features
3. Create Tasks for technical work and infrastructure
4. Establish proper parent-child relationships
5. Add meaningful labels and components
6. Include clear acceptance criteria
7. Set appropriate priorities and estimates`;

        try {
            const response = await getLLMResponse(prompt);
            if (!response) {
                throw new Error('No response from AI');
            }

            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Could not extract JSON from AI response');
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            
            // Ensure all tickets have unique IDs
            const assignIds = (tickets: any[]) => tickets.map(ticket => ({
                ...ticket,
                id: ticket.id || this.generateId()
            }));

            return {
                epics: assignIds(parsedData.epics || []),
                stories: assignIds(parsedData.stories || []),
                tasks: assignIds(parsedData.tasks || []),
                bugs: assignIds(parsedData.bugs || []),
                exportFormats: []
            };
        } catch (error) {
            console.error('Error generating tickets:', error);
            
            // Fallback: Create basic tickets from requirements
            return this.createFallbackTickets(requirements);
        }
    }

    /**
     * Export tickets in various formats
     */
    exportTickets(tickets: JiraTicketCollection, format: string): { content: string; filename: string } {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        switch (format) {
            case 'csv':
                return {
                    content: this.exportToCSV(tickets),
                    filename: `jira-tickets-${timestamp}.csv`
                };
            case 'json':
                return {
                    content: this.exportToJSON(tickets),
                    filename: `jira-tickets-${timestamp}.json`
                };
            case 'jira_import':
                return {
                    content: this.exportToJiraImport(tickets),
                    filename: `jira-import-${timestamp}.csv`
                };
            case 'confluence':
                return {
                    content: this.exportToConfluence(tickets),
                    filename: `project-specification-${timestamp}.md`
                };
            default:
                return {
                    content: this.exportToJSON(tickets),
                    filename: `jira-tickets-${timestamp}.json`
                };
        }
    }

    private createFallbackTickets(requirements: ProcessedRequirement[]): JiraTicketCollection {
        const tickets: JiraTicketCollection = {
            epics: [],
            stories: [],
            tasks: [],
            bugs: [],
            exportFormats: []
        };

        // Group requirements by category
        const epics = requirements.filter(r => r.category === RequirementCategory.EPIC);
        const stories = requirements.filter(r => r.category === RequirementCategory.USER_STORY);
        const tasks = requirements.filter(r => 
            r.category === RequirementCategory.TASK || 
            r.category === RequirementCategory.IMPROVEMENT ||
            r.category === RequirementCategory.RESEARCH
        );

        // Create Epic tickets
        tickets.epics = epics.map(req => this.createTicketFromRequirement(req, JiraTicketType.EPIC));

        // Create Story tickets
        tickets.stories = stories.map(req => this.createTicketFromRequirement(req, JiraTicketType.STORY));

        // Create Task tickets
        tickets.tasks = tasks.map(req => this.createTicketFromRequirement(req, JiraTicketType.TASK));

        // If no epics exist, create one as a container
        if (tickets.epics.length === 0 && (tickets.stories.length > 0 || tickets.tasks.length > 0)) {
            const containerEpic: JiraTicket = {
                id: this.generateId(),
                type: JiraTicketType.EPIC,
                summary: 'Project Implementation',
                description: 'Main epic for project implementation',
                priority: Priority.HIGH,
                labels: ['project', 'implementation'],
                components: ['Core'],
                customFields: {},
                linkedTickets: [],
                acceptanceCriteria: ['All project requirements are implemented'],
                estimatedEffort: {
                    complexity: 'complex',
                    confidence: 'medium'
                }
            };
            
            tickets.epics.push(containerEpic);
            
            // Link stories and tasks to the container epic
            [...tickets.stories, ...tickets.tasks].forEach(ticket => {
                ticket.parentTicket = containerEpic.id;
            });
        }

        return tickets;
    }

    private createTicketFromRequirement(req: ProcessedRequirement, ticketType: JiraTicketType): JiraTicket {
        return {
            id: this.generateId(),
            type: ticketType,
            summary: req.title.length > 100 ? req.title.substring(0, 97) + '...' : req.title,
            description: this.formatJiraDescription(req),
            priority: req.priority,
            labels: this.generateLabels(req),
            components: this.generateComponents(req),
            customFields: {},
            linkedTickets: [],
            acceptanceCriteria: req.acceptanceCriteria,
            estimatedEffort: req.estimatedEffort
        };
    }

    private formatJiraDescription(req: ProcessedRequirement): string {
        let description = req.description + '\n\n';
        
        if (req.businessValue) {
            description += `*Business Value:*\n${req.businessValue}\n\n`;
        }
        
        if (req.technicalNotes.length > 0) {
            description += `*Technical Notes:*\n${req.technicalNotes.map(note => `- ${note}`).join('\n')}\n\n`;
        }
        
        if (req.dependencies.length > 0) {
            description += `*Dependencies:*\n${req.dependencies.map(dep => `- ${dep}`).join('\n')}\n\n`;
        }
        
        if (req.risks.length > 0) {
            description += `*Risks:*\n${req.risks.map(risk => `- ${risk}`).join('\n')}\n\n`;
        }
        
        if (req.acceptanceCriteria.length > 0) {
            description += `*Acceptance Criteria:*\n${req.acceptanceCriteria.map(ac => `- ${ac}`).join('\n')}\n`;
        }
        
        return description;
    }

    private generateLabels(req: ProcessedRequirement): string[] {
        const labels: string[] = [req.category, req.priority];
        
        if (req.estimatedEffort.complexity) {
            labels.push(req.estimatedEffort.complexity);
        }
        
        // Add contextual labels based on content
        const content = (req.title + ' ' + req.description).toLowerCase();
        
        if (content.includes('api')) {labels.push('api');}
        if (content.includes('database') || content.includes('db')) {labels.push('database');}
        if (content.includes('ui') || content.includes('interface')) {labels.push('frontend');}
        if (content.includes('security') || content.includes('auth')) {labels.push('security');}
        if (content.includes('performance')) {labels.push('performance');}
        if (content.includes('test')) {labels.push('testing');}
        
        return [...new Set(labels)]; // Remove duplicates
    }

    private generateComponents(req: ProcessedRequirement): string[] {
        const components = [];
        
        const content = (req.title + ' ' + req.description).toLowerCase();
        
        if (content.includes('frontend') || content.includes('ui') || content.includes('interface')) {
            components.push('Frontend');
        }
        if (content.includes('backend') || content.includes('api') || content.includes('server')) {
            components.push('Backend');
        }
        if (content.includes('database') || content.includes('db')) {
            components.push('Database');
        }
        if (content.includes('auth') || content.includes('security')) {
            components.push('Security');
        }
        
        return components.length > 0 ? components : ['Core'];
    }

    private exportToCSV(tickets: JiraTicketCollection): string {
        const allTickets = [
            ...tickets.epics,
            ...tickets.stories,
            ...tickets.tasks,
            ...tickets.bugs
        ];

        const headers = [
            'ID', 'Type', 'Summary', 'Description', 'Priority', 'Labels', 'Components',
            'Parent Ticket', 'Story Points', 'Time Estimate', 'Complexity', 'Confidence'
        ];

        const rows = allTickets.map(ticket => [
            ticket.id,
            ticket.type,
            `"${ticket.summary.replace(/"/g, '""')}"`,
            `"${ticket.description.replace(/"/g, '""')}"`,
            ticket.priority,
            `"${ticket.labels.join(', ')}"`,
            `"${ticket.components.join(', ')}"`,
            ticket.parentTicket || '',
            ticket.estimatedEffort.storyPoints || '',
            ticket.estimatedEffort.timeEstimate || '',
            ticket.estimatedEffort.complexity,
            ticket.estimatedEffort.confidence
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    private exportToJSON(tickets: JiraTicketCollection): string {
        return JSON.stringify(tickets, null, 2);
    }

    private exportToJiraImport(tickets: JiraTicketCollection): string {
        // Jira import format (simplified CSV)
        const headers = ['Issue Type', 'Summary', 'Description', 'Priority', 'Labels', 'Components'];
        
        const allTickets = [
            ...tickets.epics,
            ...tickets.stories,
            ...tickets.tasks,
            ...tickets.bugs
        ];

        const rows = allTickets.map(ticket => [
            ticket.type,
            `"${ticket.summary.replace(/"/g, '""')}"`,
            `"${ticket.description.replace(/"/g, '""')}"`,
            ticket.priority,
            `"${ticket.labels.join(' ')}"`,
            `"${ticket.components.join(' ')}"`
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    private exportToConfluence(tickets: JiraTicketCollection): string {
        let content = '# Project Specification\n\n';
        content += `Generated on: ${new Date().toLocaleString()}\n\n`;
        
        if (tickets.epics.length > 0) {
            content += '## Epics\n\n';
            tickets.epics.forEach(epic => {
                content += `### ${epic.summary}\n\n`;
                content += `**Priority:** ${epic.priority}\n\n`;
                content += `${epic.description}\n\n`;
                content += '---\n\n';
            });
        }

        if (tickets.stories.length > 0) {
            content += '## User Stories\n\n';
            tickets.stories.forEach(story => {
                content += `### ${story.summary}\n\n`;
                content += `**Priority:** ${story.priority}\n\n`;
                content += `${story.description}\n\n`;
                if (story.acceptanceCriteria.length > 0) {
                    content += '**Acceptance Criteria:**\n';
                    story.acceptanceCriteria.forEach(ac => {
                        content += `- ${ac}\n`;
                    });
                    content += '\n';
                }
                content += '---\n\n';
            });
        }

        if (tickets.tasks.length > 0) {
            content += '## Tasks\n\n';
            tickets.tasks.forEach(task => {
                content += `### ${task.summary}\n\n`;
                content += `**Priority:** ${task.priority}\n\n`;
                content += `${task.description}\n\n`;
                content += '---\n\n';
            });
        }

        return content;
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
} 