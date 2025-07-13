/**
 * AI Jira Planning Tool - Core Tool Implementation
 * Provides intelligent, conversational Jira ticket planning with step-by-step guidance
 */

import * as vscode from 'vscode';
import { BaseTool } from '../base/baseTool';
import { getLLMResponse } from '../../llm';
import { escapeHtml } from '../ui/escapeHtml';
import {
    PlanningWorkflowState,
    PlanningStep,
    ConversationMessage,
    RequirementState,
    SuggestionState,
    JiraTicketCollection,
    ProcessedRequirement,
    ProfessionalSuggestion,
    JiraTicket,
    JiraPlannerWebviewMessage,
    JiraPlannerCommand,
    JiraPlannerSettings,
    ValidationResult,
    PlanningSessionMetrics,
    Priority,
    RequirementCategory,
    SuggestionCategory,
    JiraTicketType
} from './jiraPlanningTypes';
import { JiraPlannerWebviewGenerator } from './jiraPlannerWebview';
import { 
    WorkflowEngine, 
    RequirementProcessor, 
    SuggestionGenerator, 
    JiraTicketGenerator 
} from './jiraPlannerWorkflow';
import { trackUsage } from '../../analytics';

export class JiraPlanningTool extends BaseTool {
    command = 'copilotTools.jiraPlanningAssistant';
    title = 'AI Jira Planning Assistant';

    private currentSession: PlanningWorkflowState | null = null;
    private workflowEngine: WorkflowEngine;
    private requirementProcessor: RequirementProcessor;
    private suggestionGenerator: SuggestionGenerator;
    private jiraGenerator: JiraTicketGenerator;

    constructor() {
        super();
        this.workflowEngine = new WorkflowEngine();
        this.requirementProcessor = new RequirementProcessor();
        this.suggestionGenerator = new SuggestionGenerator();
        this.jiraGenerator = new JiraTicketGenerator();
    }

    isEnabled(settings: vscode.WorkspaceConfiguration): boolean {
        return settings.get('features.jiraPlanning', true);
    }

    buildPrompt(text: string, settings: vscode.WorkspaceConfiguration): string {
        // This method is called by BaseTool but we override handleInput completely
        // We'll use it for initial analysis prompts
        return `Analyze the following project requirements for Jira planning:

Requirements:
${text}

Please provide a structured analysis focusing on:
1. Core business objectives
2. Key functional requirements
3. Technical considerations
4. Potential risks and dependencies
5. Estimated complexity

Format your response as a clear, structured analysis that can guide further planning discussions.`;
    }

    parseResponse(response: string): any {
        // Basic parsing for initial analysis
        return {
            analysis: response,
            timestamp: new Date()
        };
    }

    async handleInput(editor: vscode.TextEditor | undefined, selection: vscode.Selection, settings: vscode.WorkspaceConfiguration) {
        // Track usage
        const featureName = this.getFeatureName();
        trackUsage(featureName, {
            hasSelection: editor ? !selection.isEmpty : false,
            selectionLength: editor ? editor.document.getText(selection).length : 0,
            fileExtension: editor ? editor.document.fileName.split('.').pop() : 'none'
        });

        const text = editor ? editor.document.getText(selection) : '';
        // Use any selected text as initial input, otherwise start with an empty string.
        const initialInput = text.trim();

        // Initialize new planning session
        console.log('Initializing new planning session with input:', initialInput);
        this.currentSession = await this.workflowEngine.initializeSession(initialInput, settings);
        console.log('Session initialized:', this.currentSession.sessionId);

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            this.command,
            this.title,
            vscode.ViewColumn.Beside,
            { 
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Handle webview messages
        this.panel.webview.onDidReceiveMessage(async (message: JiraPlannerWebviewMessage) => {
            console.log('Webview message received:', message);
            if (this.panel && this.currentSession) {
                console.log('Panel and session exist, processing message');
                // Create a dummy editor if none exists
                const dummyEditor = editor || {
                    document: { getText: () => '', fileName: 'untitled' },
                    selection: new vscode.Selection(0, 0, 0, 0)
                } as vscode.TextEditor;
                await this.handleWebviewMessage(this.panel, dummyEditor, selection, settings, message);
            } else {
                console.log('Panel or session missing - Panel:', !!this.panel, 'Session:', !!this.currentSession);
                // If session is missing, try to reinitialize
                if (!this.currentSession && message.command === JiraPlannerCommand.SEND_REQUIREMENT) {
                    console.log('Reinitializing session for SEND_REQUIREMENT');
                    const inputText = message.data?.text || '';
                    if (inputText) {
                        this.currentSession = await this.workflowEngine.initializeSession(inputText, settings);
                        console.log('Session reinitialized:', this.currentSession.sessionId);
                        await this.handleRequirementInput(inputText);
                    }
                }
            }
        });
        
        console.log('Message handler registered successfully');

        // Generate initial webview content
        this.panel.webview.html = this.getWebviewHtml(this.currentSession, settings);
        console.log('Initial webview content generated');

        // Clean up on dispose
        this.panel.onDidDispose(() => {
            console.log('Panel disposed, cleaning up');
            this.panel = undefined;
            this.currentSession = null;
        });

        // Start the workflow
        console.log('Starting workflow for step:', this.currentSession.currentStep);
        await this.processCurrentStep();

        // Refresh the webview to display AI response or status after initial processing
        this.refreshWebview(settings);
    }

    async handleWebviewMessage(
        panel: vscode.WebviewPanel, 
        editor: vscode.TextEditor, 
        selection: vscode.Selection, 
        settings: vscode.WorkspaceConfiguration,
        message: JiraPlannerWebviewMessage
    ) {
        console.log('handleWebviewMessage called with:', message);
        
        if (!this.currentSession) {
            console.log('No current session, returning');
            return;
        }

        try {
            console.log('Processing command:', message.command);
            
            switch (message.command) {
                case JiraPlannerCommand.SEND_REQUIREMENT:
                    console.log('Handling SEND_REQUIREMENT with data:', message.data);
                    if (this.currentSession.currentStep === PlanningStep.REQUIREMENT_CONFIRMATION) {
                        await this.handleConfirmationResponse(message.data.text);
                    } else {
                        await this.handleRequirementInput(message.data.text);
                    }
                    break;
                    
                case JiraPlannerCommand.CONFIRM_STEP:
                    await this.confirmCurrentStep(message.data);
                    break;
                    
                case JiraPlannerCommand.UPDATE_REQUIREMENTS:
                    await this.updateRequirements(message.data);
                    break;
                    
                case JiraPlannerCommand.APPLY_SUGGESTION:
                    await this.applySuggestion(message.data.suggestionId, message.data.modifications);
                    break;
                    
                case JiraPlannerCommand.REJECT_SUGGESTION:
                    await this.rejectSuggestion(message.data.suggestionId, message.data.reason);
                    break;
                    
                case JiraPlannerCommand.GENERATE_TICKETS:
                    await this.generateJiraTickets();
                    break;
                    
                case JiraPlannerCommand.EXPORT_TICKETS:
                    await this.exportTickets(message.data.format);
                    break;
                    
                case JiraPlannerCommand.RESTART_WORKFLOW:
                    await this.restartWorkflow();
                    break;
                    
                case JiraPlannerCommand.SAVE_SESSION:
                    await this.saveSession();
                    break;
                    
                case JiraPlannerCommand.LOAD_SESSION:
                    await this.loadSession();
                    break;
                    
                default:
                    console.warn(`Unhandled command: ${message.command}`);
            }
            
            console.log('Command processed successfully, refreshing webview');
            // Refresh webview after processing
            this.refreshWebview(settings);
            
        } catch (error) {
            console.error('Error handling webview message:', error);
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async processCurrentStep() {
        if (!this.currentSession) {return;}

        switch (this.currentSession.currentStep) {
            case PlanningStep.INITIAL_UNDERSTANDING:
                await this.processInitialUnderstanding();
                break;
            case PlanningStep.REQUIREMENT_CONFIRMATION:
                await this.processRequirementConfirmation();
                break;
            case PlanningStep.SUGGESTION_REVIEW:
                await this.processSuggestionReview();
                break;
            case PlanningStep.STRUCTURE_PLANNING:
                await this.processStructurePlanning();
                break;
            case PlanningStep.TICKET_GENERATION:
                await this.processTicketGeneration();
                break;
            case PlanningStep.FINAL_REVIEW:
                await this.processFinalReview();
                break;
        }
    }

    private async processInitialUnderstanding() {
        if (!this.currentSession) {return;}

        const prompt = `As an expert software architect and project manager, analyze the following requirements:

"${this.currentSession.requirements.originalInput}"

Provide a comprehensive understanding that includes:

1. **Core Business Objectives**: What is the main business value and purpose?
2. **Functional Requirements**: What specific features and capabilities are needed?
3. **Technical Considerations**: What technologies, integrations, or technical constraints should be considered?
4. **User Stories**: Break down into potential user stories or use cases
5. **Dependencies**: What external systems, APIs, or components might be involved?
6. **Risk Assessment**: What are potential challenges or risks?
7. **Success Criteria**: How will we know this is successful?

Format your response in clear sections with actionable insights. Be specific and professional.`;

        try {
            const analysis = await getLLMResponse(prompt);
            if (!analysis) {return;}

            // Add to conversation history
            this.addConversationMessage('assistant', analysis, PlanningStep.INITIAL_UNDERSTANDING, {
                confirmationRequired: true
            });

            // Process the analysis into structured requirements
            this.currentSession.requirements = await this.requirementProcessor.processAnalysis(
                this.currentSession.requirements.originalInput,
                analysis
            );

        } catch (error) {
            console.error('Error in initial understanding:', error);
            this.addConversationMessage('system', `Error analyzing requirements: ${error}`, PlanningStep.INITIAL_UNDERSTANDING);
        }
    }

    private async processRequirementConfirmation() {
        if (!this.currentSession) { return; }

        const requirementsHtml = this.formatRequirementsForConfirmation(this.currentSession.requirements);
        const confirmationPrompt = `Based on the analysis, I've identified the following key requirements:
        <div class="requirement-list">
            ${requirementsHtml}
        </div>
        Please review this understanding. Are there any missing requirements, or should anything be modified?`;

        this.addConversationMessage('assistant', confirmationPrompt, PlanningStep.REQUIREMENT_CONFIRMATION, {
            confirmationRequired: true
        });
    }

    private async processSuggestionReview() {
        if (!this.currentSession) { return; }
        this.currentSession.suggestions = await this.suggestionGenerator.generateSuggestions(
            this.currentSession.requirements.processedRequirements
        );

        const suggestionsHtml = this.formatSuggestionsForReview(this.currentSession.suggestions.suggestions);
        const suggestionPrompt = `Based on your requirements, I have some professional suggestions to enhance your project:
        <div class="suggestion-list">
            ${suggestionsHtml}
        </div>
        Please review and decide whether to accept, reject, or modify each suggestion.`;

        this.addConversationMessage('assistant', suggestionPrompt, PlanningStep.SUGGESTION_REVIEW, {
            suggestionsProvided: this.currentSession.suggestions.suggestions.length,
            confirmationRequired: false
        });
    }

    private async processStructurePlanning() {
        if (!this.currentSession) {return;}

        const structurePrompt = `Now let's plan the Jira ticket structure. Based on your confirmed requirements and accepted suggestions, I recommend organizing the work as follows:

${this.formatStructurePlan()}

This structure includes:
- **Epics**: High-level business objectives
- **Stories**: User-facing features and capabilities  
- **Tasks**: Technical implementation work
- **Dependencies**: Clear relationships between tickets

Does this structure work for your team? Any adjustments needed before we generate the actual tickets?`;

        this.addConversationMessage('assistant', structurePrompt, PlanningStep.STRUCTURE_PLANNING, {
            confirmationRequired: true
        });
    }

    private async processTicketGeneration() {
        if (!this.currentSession) { return; }
        this.currentSession.jiraOutput = await this.jiraGenerator.generateTickets(
            this.currentSession.requirements.processedRequirements,
            this.currentSession.suggestions.appliedSuggestions
        );

        const ticketsHtml = this.formatGeneratedTickets();
        const ticketPrompt = `Perfect! I've generated ${this.getTotalTicketCount()} Jira tickets, organized as follows:
        <div class="ticket-list">
            ${ticketsHtml}
        </div>
        Ready to export these tickets?`;

        this.addConversationMessage('assistant', ticketPrompt, PlanningStep.TICKET_GENERATION, {
            confirmationRequired: false
        });
    }

    private async processFinalReview() {
        if (!this.currentSession) {return;}

        const reviewPrompt = `🎉 **Planning Complete!** 

Here's a summary of what we've accomplished:

**Requirements Processed**: ${this.currentSession.requirements.processedRequirements.length} items
**Professional Suggestions**: ${this.currentSession.suggestions.appliedSuggestions.length} applied
**Jira Tickets Generated**: ${this.getTotalTicketCount()} tickets
**Session Duration**: ${this.getSessionDuration()}

**Next Steps**:
1. Export tickets in your preferred format
2. Import to your Jira instance
3. Assign tickets to team members
4. Begin sprint planning

Would you like to:
- Export the tickets now
- Save this session for later
- Start a new planning session
- Modify any tickets before export`;

        this.addConversationMessage('assistant', reviewPrompt, PlanningStep.FINAL_REVIEW, {
            confirmationRequired: false
        });

        this.currentSession.currentStep = PlanningStep.COMPLETED;
        this.currentSession.isCompleted = true;
    }

    // Helper methods for conversation management
    private addConversationMessage(type: 'user' | 'assistant' | 'system', content: string, step: PlanningStep, metadata?: any) {
        if (!this.currentSession) {return;}

        const message: ConversationMessage = {
            id: this.generateId(),
            timestamp: new Date(),
            type,
            content,
            step,
            metadata
        };

        this.currentSession.conversationHistory.push(message);
        this.currentSession.lastUpdateTime = new Date();
    }

    // Workflow control methods
    private async confirmCurrentStep(data?: any) {
        if (!this.currentSession) {return;}

        this.currentSession.userConfirmations[this.currentSession.currentStep] = true;
        
        // Advance to next step
        const nextStep = this.workflowEngine.getNextStep(this.currentSession.currentStep);
        if (nextStep) {
            this.currentSession.currentStep = nextStep;
            await this.processCurrentStep();
        }
    }

    private async applySuggestion(suggestionId: string, modifications?: string) {
        if (!this.currentSession) {return;}

        const suggestion = this.currentSession.suggestions.suggestions.find(s => s.id === suggestionId);
        if (!suggestion) {return;}

        this.currentSession.suggestions.appliedSuggestions.push(suggestionId);
        this.currentSession.suggestions.userChoices.push({
            suggestionId,
            action: modifications ? 'modify' : 'accept',
            modifiedDescription: modifications,
            timestamp: new Date()
        });

        // Apply suggestion to requirements
        await this.requirementProcessor.applySuggestion(suggestion, modifications);
    }

    private async rejectSuggestion(suggestionId: string, reason?: string) {
        if (!this.currentSession) {return;}

        this.currentSession.suggestions.rejectedSuggestions.push(suggestionId);
        this.currentSession.suggestions.userChoices.push({
            suggestionId,
            action: 'reject',
            reasoning: reason,
            timestamp: new Date()
        });
    }

    private async updateRequirements(data: any) {
        if (!this.currentSession) {return;}

        // Process requirement updates
        this.currentSession.requirements = await this.requirementProcessor.updateRequirements(
            this.currentSession.requirements,
            data
        );
    }

    private async generateJiraTickets() {
        if (!this.currentSession) {return;}

        this.currentSession.jiraOutput = await this.jiraGenerator.generateTickets(
            this.currentSession.requirements.processedRequirements,
            this.currentSession.suggestions.appliedSuggestions
        );
    }

    private async exportTickets(format: string) {
        if (!this.currentSession?.jiraOutput) {return;}

        const exportData = this.jiraGenerator.exportTickets(this.currentSession.jiraOutput, format);
        
        // Save to file
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`jira-tickets-${Date.now()}.${format === 'json' ? 'json' : 'csv'}`),
            filters: {
                'Export Files': [format === 'json' ? 'json' : 'csv']
            }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(exportData.content, 'utf8'));
            vscode.window.showInformationMessage(`Tickets exported to ${uri.fsPath}`);
        }
    }

    // Formatting helper methods
    private formatRequirementsForConfirmation(requirements: RequirementState): string {
        return requirements.processedRequirements.map(req => `
            <div class="requirement-item">
                <div class="item-header">
                    <h4>${escapeHtml(req.title)}</h4>
                    <div class="item-badges">
                        <span class="item-badge">${escapeHtml(req.category)}</span>
                        <span class="item-badge">${escapeHtml(req.priority)}</span>
                    </div>
                </div>
                <p class="item-description">${escapeHtml(req.description)}</p>
            </div>
        `).join('');
    }

    private formatSuggestionsForReview(suggestions: ProfessionalSuggestion[]): string {
        return suggestions.map(sug => `
            <div class="suggestion-item">
                <div class="item-header">
                    <h4>${escapeHtml(sug.title)}</h4>
                    <div class="item-badges">
                        <span class="item-badge">${escapeHtml(sug.category)}</span>
                    </div>
                </div>
                <p class="item-description">${escapeHtml(sug.description)}</p>
            </div>
        `).join('');
    }

    private formatStructurePlan(): string {
        if (!this.currentSession) {return '';}
        
        const epics = this.currentSession.requirements.processedRequirements.filter(r => r.category === RequirementCategory.EPIC);
        const stories = this.currentSession.requirements.processedRequirements.filter(r => r.category === RequirementCategory.USER_STORY);
        const tasks = this.currentSession.requirements.processedRequirements.filter(r => r.category === RequirementCategory.TASK);

        return `**Epics (${epics.length})**: ${epics.map(e => e.title).join(', ')}\n**Stories (${stories.length})**: ${stories.map(s => s.title).join(', ')}\n**Tasks (${tasks.length})**: ${tasks.map(t => t.title).join(', ')}`;
    }

    private formatGeneratedTickets(): string {
        if (!this.currentSession || !this.currentSession.jiraOutput) {
            return '';
        }
        const { epics, stories, tasks } = this.currentSession.jiraOutput;
        const allTickets = [...epics, ...stories, ...tasks];
        return allTickets.map(ticket => `
            <div class="ticket-item">
                <div class="item-header">
                    <h4>${escapeHtml(ticket.summary)}</h4>
                    <div class="item-badges">
                        <span class="item-badge">${escapeHtml(ticket.type)}</span>
                        <span class="item-badge">${escapeHtml(ticket.priority)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    private getTotalTicketCount(): number {
        if (!this.currentSession?.jiraOutput) {return 0;}
        
        const { epics, stories, tasks, bugs } = this.currentSession.jiraOutput;
        return epics.length + stories.length + tasks.length + bugs.length;
    }

    private getSessionDuration(): string {
        if (!this.currentSession) {return '0 minutes';}
        
        const duration = Date.now() - this.currentSession.startTime.getTime();
        const minutes = Math.floor(duration / 60000);
        return `${minutes} minutes`;
    }

    private async handleRequirementInput(text: string) {
        if (!this.currentSession) { return; }

        // Add user message to conversation if it's the first time
        if (this.currentSession.currentStep === PlanningStep.INITIAL_UNDERSTANDING) {
            this.addConversationMessage('user', text, this.currentSession.currentStep);
        }

        // Add a temporary "thinking" message
        this.addConversationMessage('system', '⏳ AI is analyzing your request...', this.currentSession.currentStep, { isTemporary: true });
        this.refreshWebview(vscode.workspace.getConfiguration('copilotTools'));
        
        try {
            // 1. Get initial high-level analysis from LLM
            const analysisPrompt = this.buildPrompt(text, vscode.workspace.getConfiguration('copilotTools'));
            const analysisResponse = await getLLMResponse(analysisPrompt);

            if (!analysisResponse) {
                throw new Error('Failed to get analysis from AI.');
            }

            // 2. Process the analysis to get structured requirements
            const updatedRequirements = await this.requirementProcessor.processAnalysis(
                text,
                analysisResponse
            );

            // 3. Update session state
            this.currentSession.requirements = updatedRequirements;
            
            // 4. Move to the confirmation step
            this.currentSession.currentStep = PlanningStep.REQUIREMENT_CONFIRMATION;
            
            // 5. Let the confirmation step handle the response message
            await this.processCurrentStep();

        } catch (error) {
            console.error('Error processing requirement input:', error);
            this.addConversationMessage('system', `Error: ${error instanceof Error ? error.message : String(error)}`, this.currentSession.currentStep);
        } finally {
            // Remove the "thinking" message
            const thinkingMessageIndex = this.currentSession.conversationHistory.findIndex(m => m.metadata?.isTemporary);
            if (thinkingMessageIndex > -1) {
                this.currentSession.conversationHistory.splice(thinkingMessageIndex, 1);
            }
        }
    }

    private async handleConfirmationResponse(text: string) {
        if (!this.currentSession) { return; }

        this.addConversationMessage('user', text, this.currentSession.currentStep);
        this.addConversationMessage('system', '⏳ Checking confirmation...', this.currentSession.currentStep, { isTemporary: true });
        this.refreshWebview(vscode.workspace.getConfiguration('copilotTools'));

        try {
            const confirmationPrompt = `The user was asked to confirm if the AI's understanding of their requirements was correct.
            User's response: "${text}"
            
            Analyze this response. Does it indicate confirmation, or does it ask for corrections?
            Respond with JSON only.
            - If confirmed, respond with: {"confirmed": true}
            - If not confirmed, respond with: {"confirmed": false, "corrections": "A summary of the corrections the user wants to make."}`;
            
            const rawResponse = await getLLMResponse(confirmationPrompt);
            if (!rawResponse) {
                throw new Error('Failed to get confirmation response from AI.');
            }
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            const confirmation = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

            if (confirmation.confirmed) {
                this.currentSession.requirements.isConfirmed = true;
                this.addConversationMessage('assistant', 'Great! I will now proceed to the next step.', this.currentSession.currentStep);
                
                const nextStep = this.workflowEngine.getNextStep(this.currentSession.currentStep);
                if (nextStep) {
                    this.currentSession.currentStep = nextStep;
                    await this.processCurrentStep();
                }
            } else {
                this.addConversationMessage('assistant', `Understood. I will revise the plan based on your feedback: "${confirmation.corrections || text}"`, this.currentSession.currentStep);
                // Re-process the requirements with the corrections
                const originalAndCorrections = `Original Request: ${this.currentSession.requirements.originalInput}\n\nCorrections: ${confirmation.corrections || text}`;
                await this.handleRequirementInput(originalAndCorrections);
            }

        } catch (error) {
            console.error('Error handling confirmation response:', error);
            this.addConversationMessage('system', `Error processing your confirmation: ${error instanceof Error ? error.message : String(error)}`, this.currentSession.currentStep);
        } finally {
            const thinkingMessageIndex = this.currentSession.conversationHistory.findIndex(m => m.metadata?.isTemporary);
            if (thinkingMessageIndex > -1) {
                this.currentSession.conversationHistory.splice(thinkingMessageIndex, 1);
            }
        }
    }

    private async restartWorkflow() {
        if (!this.currentSession) {return;}
        
        const originalInput = this.currentSession.requirements.originalInput;
        const settings = vscode.workspace.getConfiguration('copilotTools');
        
        this.currentSession = await this.workflowEngine.initializeSession(originalInput, settings);
        await this.processCurrentStep();
    }

    private async saveSession() {
        if (!this.currentSession) {return;}

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`jira-planning-session-${Date.now()}.json`),
            filters: {
                'Planning Sessions': ['json']
            }
        });

        if (uri) {
            const sessionData = JSON.stringify(this.currentSession, null, 2);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(sessionData, 'utf8'));
            vscode.window.showInformationMessage(`Session saved to ${uri.fsPath}`);
        }
    }

    private async loadSession() {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: {
                'Planning Sessions': ['json']
            }
        });

        if (uris && uris[0]) {
            try {
                const fileData = await vscode.workspace.fs.readFile(uris[0]);
                const sessionData = JSON.parse(fileData.toString());
                
                // Validate and restore session
                this.currentSession = this.workflowEngine.validateAndRestoreSession(sessionData);
                this.refreshWebview(vscode.workspace.getConfiguration('copilotTools'));
                
                vscode.window.showInformationMessage('Session loaded successfully');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load session: ${error}`);
            }
        }
    }

    private refreshWebview(settings: vscode.WorkspaceConfiguration) {
        if (this.panel && this.currentSession) {
            this.panel.webview.html = this.getWebviewHtml(this.currentSession, settings);
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    getWebviewHtml(session: PlanningWorkflowState, settings: vscode.WorkspaceConfiguration): string {
        return JiraPlannerWebviewGenerator.generateWebviewContent(session, settings);
    }

    getSettingsSchema() {
        return {
            'features.jiraPlanning': {
                type: 'boolean',
                default: true,
                description: 'Enable AI Jira Planning Assistant'
            },
            'jiraPlanning.suggestionAggressiveness': {
                type: 'string',
                enum: ['conservative', 'balanced', 'aggressive'],
                default: 'balanced',
                description: 'How proactive the AI should be with suggestions'
            },
            'jiraPlanning.maxSuggestionsPerCategory': {
                type: 'number',
                default: 3,
                description: 'Maximum suggestions per category'
            },
            'jiraPlanning.autoAdvanceSteps': {
                type: 'boolean',
                default: false,
                description: 'Automatically advance to next step after confirmation'
            },
            'jiraPlanning.requireConfirmations': {
                type: 'boolean',
                default: true,
                description: 'Require user confirmation for each major step'
            },
            'jiraPlanning.language': {
                type: 'string',
                enum: ['en', 'zh-CN'],
                default: 'en',
                description: 'Interface language'
            }
        };
    }
} 