/**
 * AI Jira Planner Webview Generator
 * Creates sophisticated conversational UI for intelligent Jira ticket planning
 */

import { escapeHtml } from '../ui/escapeHtml';
import {
    PlanningWorkflowState,
    PlanningStep,
    ConversationMessage,
    ProcessedRequirement,
    ProfessionalSuggestion,
    JiraTicket,
    Priority,
    RequirementCategory,
    SuggestionCategory,
    JiraTicketType
} from './jiraPlanningTypes';

export class JiraPlannerWebviewGenerator {
    static generateWebviewContent(
        session: PlanningWorkflowState,
        settings: any
    ): string {
        const language = settings.get('jiraPlanning.language', 'en');
        const translations = this.getTranslations(language);

        return `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${translations.title}</title>
    <style>
        ${this.generateCSS()}
    </style>
</head>
<body>
    <div id="app" class="jira-planner-app">
        <!-- Header Section -->
        <header class="planner-header">
            <div class="header-content">
                <div class="header-left">
                    <div class="logo">
                        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        <h1>${translations.title}</h1>
                    </div>
                </div>
                <div class="header-right">
                    <button id="saveSessionBtn" class="header-btn" title="${translations.saveSession}">
                        <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17,21 17,13 7,13 7,21"></polyline><polyline points="7,3 7,8 15,8"></polyline></svg>
                    </button>
                    <button id="loadSessionBtn" class="header-btn" title="${translations.loadSession}">
                        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    </button>
                    <button id="restartBtn" class="header-btn restart-btn" title="${translations.restart}">
                        <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                    <div class="language-toggle">
                        <button id="languageBtn" class="header-btn">${language === 'en' ? '中文' : 'EN'}</button>
                    </div>
                </div>
            </div>
            <div class="progress-section">
                ${this.generateProgressBar(session, translations)}
            </div>
        </header>

        <!-- Main Content -->
        <main class="main-content">
            <div class="content-container">
                <!-- Conversation Panel -->
                <div class="conversation-panel">
                    <div class="conversation-header">
                        <h2>${translations.conversation}</h2>
                        <div class="conversation-controls">
                            <button id="clearConversationBtn" class="control-btn" title="${translations.clearConversation}">
                                <svg viewBox="0 0 24 24"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
                            </button>
                        </div>
                    </div>
                    <div class="conversation-content" id="conversationContent">
                        ${this.generateConversationMessages(session.conversationHistory, translations)}
                    </div>
                    <div class="conversation-input">
                        ${this.generateCurrentStepInput(session, translations)}
                    </div>
                </div>
            </div>
        </main>

        <!-- Modals -->
        <div id="requirementModal" class="modal" style="display: none;">
            ${this.generateRequirementModal(session, translations)}
        </div>

        <div id="suggestionModal" class="modal" style="display: none;">
            ${this.generateSuggestionModal(session, translations)}
        </div>

        <div id="ticketModal" class="modal" style="display: none;">
            ${this.generateTicketModal(session, translations)}
        </div>

        <div id="exportModal" class="modal" style="display: none;">
            ${this.generateExportModal(session, translations)}
        </div>
    </div>

    <script>
        ${this.generateJavaScript(session)}
    </script>
</body>
</html>`;
    }

    private static generateProgressBar(session: PlanningWorkflowState, translations: any): string {
        const steps = Object.values(PlanningStep).filter(step => step !== PlanningStep.COMPLETED);
        const currentStepIndex = steps.findIndex(step => step === session.currentStep);

        return `
        <div class="progress-bar-container">
            <div class="progress-bar">
                ${steps.map((stepKey, index) => {
                    const isCompleted = index < currentStepIndex || session.isCompleted;
                    const isCurrent = index === currentStepIndex && !session.isCompleted;
                    const isConfirmed = session.userConfirmations[stepKey];
                    const stepLabel = translations.steps[stepKey] || stepKey;
                    
                    return `
                    <div class="progress-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isConfirmed ? 'confirmed' : ''}" 
                         data-step="${stepKey}">
                        <div class="step-circle">
                            ${isCompleted ? '<svg class="check-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : `<span class="step-number">${index + 1}</span>`}
                        </div>
                        <div class="step-label">${stepLabel}</div>
                    </div>
                    ${index < steps.length - 1 ? '<div class="step-connector"></div>' : ''}
                    `;
                }).join('')}
            </div>
            <div class="progress-info">
                <span class="current-step-info">${translations.currentStep}: ${translations.steps[session.currentStep] || session.currentStep}</span>
                <span class="completion-info">${Math.round(((currentStepIndex + 1) / steps.length) * 100)}% ${translations.complete}</span>
            </div>
        </div>`;
    }

    private static generateConversationMessages(messages: ConversationMessage[], translations: any): string {
        if (messages.length === 0) {
            return `<div class="conversation-empty">
                <div class="empty-icon">💬</div>
                <h3>${translations.startConversation}</h3>
                <p>${translations.startConversationDesc}</p>
            </div>`;
        }

        return messages.map(message => `
            <div class="message ${message.type}" data-step="${message.step}" data-message-id="${message.id}">
                <div class="message-header">
                    <div class="message-author">
                        <div class="author-avatar ${message.type}">
                            ${this.getAuthorIcon(message.type)}
                        </div>
                        <span class="author-name">${this.getAuthorName(message.type, translations)}</span>
                    </div>
                    <div class="message-meta">
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                        <span class="message-step">${translations.steps[message.step]}</span>
                    </div>
                </div>
                <div class="message-content">
                    ${this.formatMessageContent(message.content, message.type)}
                </div>
                ${message.metadata?.confirmationRequired ? `
                    <div class="message-actions">
                        <button class="confirm-btn" data-action="confirm" data-message-id="${message.id}">
                            ${translations.confirm}
                        </button>
                        <button class="modify-btn" data-action="modify" data-message-id="${message.id}">
                            ${translations.modify}
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    private static generateCurrentStepInput(session: PlanningWorkflowState, translations: any): string {
        const currentStep = session.currentStep;
        
        // Always show the main input area at the bottom
        const mainInputArea = `
        <div id="inputArea" class="main-input-area">
            <textarea 
                id="mainRequirementInput" 
                class="requirement-textarea"
                placeholder="${translations.inputArea.placeholder}"
                rows="3"
            ></textarea>
            <div class="input-actions">
                <button id="sendRequirementBtn" class="primary-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                    </svg>
                    <span>${translations.inputArea.send}</span>
                </button>
                <button id="clearInputBtn" class="secondary-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>${translations.inputArea.clear}</span>
                </button>
            </div>
        </div>`;
        
        // Step-specific additional inputs
        let stepSpecificInput = '';
        
        switch (currentStep) {
            case PlanningStep.REQUIREMENT_CONFIRMATION:
                stepSpecificInput = `
                <div class="step-specific-input confirmation-input">
                    <div class="step-header">
                        <h3>${translations.inputs.confirmation.title}</h3>
                        <p>${translations.inputs.confirmation.description}</p>
                    </div>
                    <div class="requirement-list">
                        ${session.requirements.processedRequirements.map(req => `
                            <div class="requirement-item" data-req-id="${req.id}">
                                <div class="req-header">
                                    <h4>${escapeHtml(req.title)}</h4>
                                    <div class="req-badges">
                                        <span class="req-category ${req.category}">${req.category}</span>
                                        <span class="req-priority ${req.priority}">${req.priority}</span>
                                    </div>
                                </div>
                                <p class="req-description">${escapeHtml(req.description)}</p>
                                <div class="req-actions">
                                    <button class="edit-req-btn" data-req-id="${req.id}">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        ${translations.edit}
                                    </button>
                                    <button class="remove-req-btn" data-req-id="${req.id}">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                        ${translations.remove}
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="step-controls">
                        <button id="confirmRequirementsBtn" class="primary-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            ${translations.inputs.confirmation.confirm}
                        </button>
                        <button id="addRequirementBtn" class="secondary-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            ${translations.inputs.confirmation.addMore}
                        </button>
                    </div>
                </div>`;
                break;

            case PlanningStep.SUGGESTION_REVIEW:
                stepSpecificInput = `
                <div class="step-specific-input suggestion-input">
                    <div class="step-header">
                        <h3>${translations.inputs.suggestions.title}</h3>
                        <p>${translations.inputs.suggestions.description}</p>
                    </div>
                    <div class="suggestion-list">
                        ${session.suggestions.suggestions.map(suggestion => `
                            <div class="suggestion-item" data-suggestion-id="${suggestion.id}">
                                <div class="suggestion-header">
                                    <h4>${escapeHtml(suggestion.title)}</h4>
                                    <div class="suggestion-badges">
                                        <span class="suggestion-category ${suggestion.category}">${suggestion.category}</span>
                                        <span class="suggestion-priority ${suggestion.priority}">${suggestion.priority}</span>
                                    </div>
                                </div>
                                <p class="suggestion-description">${escapeHtml(suggestion.description)}</p>
                                <div class="suggestion-impact">
                                    <div class="impact-benefits">
                                        <strong>${translations.benefits}:</strong>
                                        <ul>
                                            ${suggestion.impact.benefits.map(benefit => `<li>${escapeHtml(benefit)}</li>`).join('')}
                                        </ul>
                                    </div>
                                    <div class="impact-effort">
                                        <strong>${translations.effort}:</strong> ${suggestion.impact.effort.complexity}
                                        ${suggestion.impact.effort.timeEstimate ? ` (${suggestion.impact.effort.timeEstimate})` : ''}
                                    </div>
                                </div>
                                <div class="suggestion-actions">
                                    <button class="accept-suggestion-btn" data-suggestion-id="${suggestion.id}">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        ${translations.accept}
                                    </button>
                                    <button class="modify-suggestion-btn" data-suggestion-id="${suggestion.id}">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        ${translations.modify}
                                    </button>
                                    <button class="reject-suggestion-btn" data-suggestion-id="${suggestion.id}">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        ${translations.reject}
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="step-controls">
                        <button id="proceedWithSuggestionsBtn" class="primary-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 11 12 14 22 4"></polyline>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                            </svg>
                            ${translations.inputs.suggestions.proceed}
                        </button>
                        <button id="requestMoreSuggestionsBtn" class="secondary-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                <line x1="8" y1="9" x2="16" y2="9"></line>
                                <line x1="8" y1="13" x2="14" y2="13"></line>
                            </svg>
                            ${translations.inputs.suggestions.requestMore}
                        </button>
                    </div>
                </div>`;
                break;

            case PlanningStep.TICKET_GENERATION:
                stepSpecificInput = `
                <div class="step-specific-input generation-input">
                    <div class="step-header">
                        <h3>${translations.inputs.generation.title}</h3>
                        <p>${translations.inputs.generation.description}</p>
                    </div>
                    <div class="ticket-preview">
                        ${this.generateTicketPreview(session.jiraOutput, translations)}
                    </div>
                    <div class="step-controls">
                        <button id="generateTicketsBtn" class="primary-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            ${translations.inputs.generation.generate}
                        </button>
                        <button id="previewExportBtn" class="secondary-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            ${translations.inputs.generation.preview}
                        </button>
                    </div>
                </div>`;
                break;

            case PlanningStep.FINAL_REVIEW:
                stepSpecificInput = `
                <div class="step-specific-input review-input">
                    <div class="step-header">
                        <h3>${translations.inputs.review.title}</h3>
                        <p>${translations.inputs.review.description}</p>
                    </div>
                    <div class="review-summary">
                        ${this.generateReviewSummary(session, translations)}
                    </div>
                    <div class="step-controls">
                        <button id="exportTicketsBtn" class="primary-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            ${translations.inputs.review.export}
                        </button>
                        <button id="startNewSessionBtn" class="secondary-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                            ${translations.inputs.review.startNew}
                        </button>
                    </div>
                </div>`;
                break;

            default:
                stepSpecificInput = '';
        }

        return mainInputArea + stepSpecificInput;
    }

    private static generateContextPanel(session: PlanningWorkflowState, translations: any): string {
        return `
        <div class="context-header">
            <h2>${translations.context.title}</h2>
            <div class="context-tabs">
                <button class="context-tab active" data-tab="overview">${translations.context.overview}</button>
                <button class="context-tab" data-tab="requirements">${translations.context.requirements}</button>
                <button class="context-tab" data-tab="suggestions">${translations.context.suggestions}</button>
                <button class="context-tab" data-tab="tickets">${translations.context.tickets}</button>
            </div>
        </div>
        
        <div class="context-content">
            <div class="context-tab-content active" data-tab-content="overview">
                ${this.generateOverviewContext(session, translations)}
            </div>
            <div class="context-tab-content" data-tab-content="requirements">
                ${this.generateRequirementsContext(session, translations)}
            </div>
            <div class="context-tab-content" data-tab-content="suggestions">
                ${this.generateSuggestionsContext(session, translations)}
            </div>
            <div class="context-tab-content" data-tab-content="tickets">
                ${this.generateTicketsContext(session, translations)}
            </div>
        </div>`;
    }

    private static generateFloatingActions(session: PlanningWorkflowState, translations: any): string {
        return `
        <div class="floating-actions-content">
            <button id="helpBtn" class="floating-btn help-btn" title="${translations.help}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </button>
            <button id="settingsBtn" class="floating-btn settings-btn" title="${translations.settings}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m11-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"></path>
                </svg>
            </button>
            <button id="exportQuickBtn" class="floating-btn export-btn" title="${translations.exportQuick}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>
        </div>`;
    }

    // Helper methods for generating specific sections
    private static generateTicketPreview(jiraOutput: any, translations: any): string {
        // Implementation for ticket preview
        return `<div class="ticket-preview-placeholder">${translations.ticketPreviewPlaceholder}</div>`;
    }

    private static generateReviewSummary(session: PlanningWorkflowState, translations: any): string {
        // Implementation for review summary
        return `<div class="review-summary-placeholder">${translations.reviewSummaryPlaceholder}</div>`;
    }

    private static generateOverviewContext(session: PlanningWorkflowState, translations: any): string {
        return `
        <div class="overview-context">
            <div class="session-stats">
                <div class="stat-item">
                    <span class="stat-label">${translations.stats.requirements}</span>
                    <span class="stat-value">${session.requirements.processedRequirements.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${translations.stats.suggestions}</span>
                    <span class="stat-value">${session.suggestions.suggestions.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${translations.stats.tickets}</span>
                    <span class="stat-value">${this.getTotalTicketCount(session.jiraOutput)}</span>
                </div>
            </div>
        </div>`;
    }

    private static generateRequirementsContext(session: PlanningWorkflowState, translations: any): string {
        // Implementation for requirements context
        return `<div class="requirements-context-placeholder">${translations.requirementsContextPlaceholder}</div>`;
    }

    private static generateSuggestionsContext(session: PlanningWorkflowState, translations: any): string {
        // Implementation for suggestions context  
        return `<div class="suggestions-context-placeholder">${translations.suggestionsContextPlaceholder}</div>`;
    }

    private static generateTicketsContext(session: PlanningWorkflowState, translations: any): string {
        // Implementation for tickets context
        return `<div class="tickets-context-placeholder">${translations.ticketsContextPlaceholder}</div>`;
    }

    // Modal generators
    private static generateRequirementModal(session: PlanningWorkflowState, translations: any): string {
        return `
        <div class="modal-content requirement-modal-content">
            <div class="modal-header">
                <h3>${translations.modals.requirement.title}</h3>
                <button class="modal-close" data-modal="requirementModal">×</button>
            </div>
            <div class="modal-body">
                <!-- Requirement editing form will be populated by JS -->
            </div>
        </div>`;
    }

    private static generateSuggestionModal(session: PlanningWorkflowState, translations: any): string {
        return `
        <div class="modal-content suggestion-modal-content">
            <div class="modal-header">
                <h3>${translations.modals.suggestion.title}</h3>
                <button class="modal-close" data-modal="suggestionModal">×</button>
            </div>
            <div class="modal-body">
                <!-- Suggestion details will be populated by JS -->
            </div>
        </div>`;
    }

    private static generateTicketModal(session: PlanningWorkflowState, translations: any): string {
        return `
        <div class="modal-content ticket-modal-content">
            <div class="modal-header">
                <h3>${translations.modals.ticket.title}</h3>
                <button class="modal-close" data-modal="ticketModal">×</button>
            </div>
            <div class="modal-body">
                <!-- Ticket details will be populated by JS -->
            </div>
        </div>`;
    }

    private static generateExportModal(session: PlanningWorkflowState, translations: any): string {
        return `
        <div class="modal-content export-modal-content">
            <div class="modal-header">
                <h3>${translations.modals.export.title}</h3>
                <button class="modal-close" data-modal="exportModal">×</button>
            </div>
            <div class="modal-body">
                <div class="export-options">
                    <div class="export-format">
                        <h4>${translations.modals.export.format}</h4>
                        <div class="format-options">
                            <label><input type="radio" name="exportFormat" value="csv" checked> CSV (${translations.modals.export.csvDesc})</label>
                            <label><input type="radio" name="exportFormat" value="json"> JSON (${translations.modals.export.jsonDesc})</label>
                            <label><input type="radio" name="exportFormat" value="jira_import"> Jira Import (${translations.modals.export.jiraDesc})</label>
                            <label><input type="radio" name="exportFormat" value="confluence"> Confluence (${translations.modals.export.confluenceDesc})</label>
                        </div>
                    </div>
                    <div class="export-options-config">
                        <label><input type="checkbox" checked> ${translations.modals.export.includeMetadata}</label>
                        <label><input type="checkbox" checked> ${translations.modals.export.includeRelationships}</label>
                        <label><input type="checkbox"> ${translations.modals.export.includeConversation}</label>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="exportConfirmBtn" class="primary-btn">${translations.export}</button>
                    <button class="secondary-btn modal-close" data-modal="exportModal">${translations.cancel}</button>
                </div>
            </div>
        </div>`;
    }

    // JavaScript generator
    private static generateJavaScript(session: PlanningWorkflowState): string {
        return `
        const vscode = acquireVsCodeApi();
        const sessionData = ${JSON.stringify(session)};
        
        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            initializeJiraPlannerApp();
        });

        function initializeJiraPlannerApp() {
            setupEventListeners();
            setupTabSwitching();
            setupModalHandling();
            scrollToLatestMessage();
            updateFloatingActionsVisibility();
        }

        function setupEventListeners() {
            // Main input area
            const mainInput = document.getElementById('mainRequirementInput');
            const sendBtn = document.getElementById('sendRequirementBtn');
            const clearBtn = document.getElementById('clearInputBtn');

            console.log('Setting up event listeners...');
            console.log('Main input:', mainInput);
            console.log('Send button:', sendBtn);
            console.log('Clear button:', clearBtn);

            // Send requirement
            sendBtn?.addEventListener('click', async () => {
                console.log('Send button clicked!');
                const text = mainInput?.value.trim();
                console.log('Input text:', text);
                
                if (!text) {
                    console.log('No text to send');
                    // Show visual feedback for empty input
                    if (mainInput) {
                        mainInput.style.borderColor = '#ff6b6b';
                        mainInput.placeholder = '请输入项目需求...';
                        setTimeout(() => {
                            mainInput.style.borderColor = '';
                            mainInput.placeholder = '';
                        }, 2000);
                    }
                    return;
                }
                
                // Show loading state
                if (sendBtn) {
                    sendBtn.disabled = true;
                    sendBtn.innerHTML = \`
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                        发送中...
                    \`;
                }
                
                try {
                    console.log('Sending message with text:', text);
                    postMessage('send_requirement', { text: text });
                    
                    // Clear input and show success state
                    if (mainInput) {
                        mainInput.value = '';
                        mainInput.style.borderColor = '#51cf66';
                        setTimeout(() => {
                            mainInput.style.borderColor = '';
                        }, 1000);
                    }
                    
                    console.log('Input cleared and message sent');
                    
                } catch (error) {
                    console.error('Error sending message:', error);
                    // Show error state
                    if (mainInput) {
                        mainInput.style.borderColor = '#ff6b6b';
                        setTimeout(() => {
                            mainInput.style.borderColor = '';
                        }, 2000);
                    }
                } finally {
                    // Restore button state
                    setTimeout(() => {
                        if (sendBtn) {
                            sendBtn.disabled = false;
                            sendBtn.innerHTML = \`
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                                </svg>
                                发送
                            \`;
                        }
                    }, 1000);
                }
            });

            // Clear input
            clearBtn?.addEventListener('click', () => {
                console.log('Clear button clicked!');
                if (mainInput) {
                    mainInput.value = '';
                    mainInput.focus();
                }
            });

            // Enter key to send (Shift+Enter for new line)
            mainInput?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    console.log('Enter key pressed, triggering send');
                    sendBtn?.click();
                }
            });

            // Suggestion chips
            document.querySelectorAll('.suggestion-chip').forEach(chip => {
                chip.addEventListener('click', (e) => {
                    const suggestion = e.target.dataset.suggestion;
                    console.log('Suggestion chip clicked:', suggestion);
                    if (mainInput && suggestion) {
                        mainInput.value = suggestion;
                        mainInput.focus();
                    }
                });
            });

            // Header actions
            document.getElementById('saveSessionBtn')?.addEventListener('click', () => {
                postMessage('save_session');
            });

            document.getElementById('loadSessionBtn')?.addEventListener('click', () => {
                postMessage('load_session');
            });

            document.getElementById('restartBtn')?.addEventListener('click', () => {
                if (confirm('Are you sure you want to restart the planning session?')) {
                    postMessage('restart_workflow');
                }
            });

            document.getElementById('languageBtn')?.addEventListener('click', () => {
                postMessage('change_language');
            });

            // Step-specific actions
            setupStepActions();

            // Floating actions
            document.getElementById('helpBtn')?.addEventListener('click', showHelp);
            document.getElementById('settingsBtn')?.addEventListener('click', showSettings);
            document.getElementById('exportQuickBtn')?.addEventListener('click', () => {
                showModal('exportModal');
            });

            // Message actions
            document.querySelectorAll('.confirm-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const messageId = e.target.dataset.messageId;
                    postMessage('confirm_step', { messageId });
                });
            });

            document.querySelectorAll('.modify-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const messageId = e.target.dataset.messageId;
                    // Show modification interface
                    showModificationInterface(messageId);
                });
            });
        }

        function setupStepActions() {
            // Requirement Confirmation
            document.getElementById('confirmRequirementsBtn')?.addEventListener('click', () => {
                postMessage('confirm_requirements');
            });

            document.getElementById('addRequirementBtn')?.addEventListener('click', () => {
                showModal('requirementModal');
            });

            // Suggestion Review
            document.getElementById('proceedWithSuggestionsBtn')?.addEventListener('click', () => {
                postMessage('confirm_step');
            });

            document.getElementById('requestMoreSuggestionsBtn')?.addEventListener('click', () => {
                postMessage('request_more_suggestions');
            });

            // Suggestion actions
            document.querySelectorAll('.accept-suggestion-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const suggestionId = e.target.dataset.suggestionId;
                    postMessage('apply_suggestion', { suggestionId });
                });
            });

            document.querySelectorAll('.reject-suggestion-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const suggestionId = e.target.dataset.suggestionId;
                    postMessage('reject_suggestion', { suggestionId });
                });
            });

            document.querySelectorAll('.modify-suggestion-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const suggestionId = e.target.dataset.suggestionId;
                    showSuggestionModificationModal(suggestionId);
                });
            });

            // Ticket Generation
            document.getElementById('generateTicketsBtn')?.addEventListener('click', () => {
                postMessage('generate_tickets');
            });

            document.getElementById('previewExportBtn')?.addEventListener('click', () => {
                postMessage('preview_export');
            });

            // Final Review
            document.getElementById('exportTicketsBtn')?.addEventListener('click', () => {
                showModal('exportModal');
            });

            document.getElementById('startNewSessionBtn')?.addEventListener('click', () => {
                if (confirm('Start a new planning session? Current progress will be lost.')) {
                    postMessage('restart_workflow');
                }
            });

            // Export actions
            document.getElementById('exportConfirmBtn')?.addEventListener('click', () => {
                const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'csv';
                const includeMetadata = document.querySelector('input[type="checkbox"]')?.checked || false;
                postMessage('export_tickets', { format, includeMetadata });
                hideModal('exportModal');
            });
        }

        function setupTabSwitching() {
            document.querySelectorAll('.context-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab;
                    switchContextTab(tabName);
                });
            });
        }

        function switchContextTab(tabName) {
            // Hide all tabs and content
            document.querySelectorAll('.context-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.context-tab-content').forEach(content => content.classList.remove('active'));

            // Show selected tab and content
            document.querySelector('[data-tab="' + tabName + '"]')?.classList.add('active');
            document.querySelector('[data-tab-content="' + tabName + '"]')?.classList.add('active');
        }

        function setupModalHandling() {
            // Close modal on background click
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        hideModal(modal.id);
                    }
                });
            });

            // Close modal on close button click
            document.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const modalId = e.target.dataset.modal;
                    hideModal(modalId);
                });
            });

            // ESC key to close modals
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    hideAllModals();
                }
            });
        }

        function showModal(modalId) {
            document.getElementById(modalId).style.display = 'flex';
            document.body.classList.add('modal-open');
        }

        function hideModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
            document.body.classList.remove('modal-open');
        }

        function hideAllModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
            document.body.classList.remove('modal-open');
        }

        function scrollToLatestMessage() {
            const conversationContent = document.getElementById('conversationContent');
            if (conversationContent) {
                conversationContent.scrollTop = conversationContent.scrollHeight;
            }
        }

        function updateFloatingActionsVisibility() {
            const currentStep = sessionData.currentStep;
            const floatingActions = document.getElementById('floatingActions');
            
            // Show/hide based on current step
            if (currentStep === 'completed') {
                floatingActions.classList.add('show-export');
            } else {
                floatingActions.classList.remove('show-export');
            }
        }

        function postMessage(command, data = {}) {
            console.log('postMessage called with command:', command, 'data:', data);
            const message = {
                command: command,
                data: data,
                sessionId: sessionData.sessionId
            };
            console.log('Sending message to extension:', message);
            vscode.postMessage(message);
            console.log('Message sent successfully');
        }

        function showHelp() {
            // Implementation for help system
            alert('Help system will be implemented');
        }

        function showSettings() {
            // Implementation for settings
            alert('Settings will be implemented');
        }

        function showModificationInterface(messageId) {
            // Implementation for message modification
            alert('Modification interface for message: ' + messageId);
        }

        function showSuggestionModificationModal(suggestionId) {
            // Implementation for suggestion modification
            alert('Suggestion modification for: ' + suggestionId);
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'updateSession':
                    location.reload();
                    break;
                case 'showNotification':
                    showNotification(message.text, message.type);
                    break;
            }
        });

        function showNotification(text, type = 'info') {
            // Create and show notification
            const notification = document.createElement('div');
            notification.className = 'notification ' + type;
            notification.textContent = text;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }`;
    }

    // Utility methods
    private static formatDuration(startTime: Date): string {
        const duration = Date.now() - startTime.getTime();
        const minutes = Math.floor(duration / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
    }

    private static formatTime(timestamp: Date): string {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    private static getAuthorIcon(type: string): string {
        switch (type) {
            case 'user':
                return '👤';
            case 'assistant':
                return '🤖';
            case 'system':
                return '⚙️';
            default:
                return '💬';
        }
    }

    private static getAuthorName(type: string, translations: any): string {
        return translations.authors[type] || type;
    }

    private static formatMessageContent(content: string, type: string): string {
        // Convert markdown-like formatting to HTML
        content = escapeHtml(content);
        
        // Bold text
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic text
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code blocks
        content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Inline code
        content = content.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Line breaks
        content = content.replace(/\n/g, '<br>');
        
        return content;
    }

    private static getTotalTicketCount(jiraOutput: any): number {
        if (!jiraOutput) {return 0;}
        return (jiraOutput.epics?.length || 0) + 
               (jiraOutput.stories?.length || 0) + 
               (jiraOutput.tasks?.length || 0) + 
               (jiraOutput.bugs?.length || 0);
    }

    private static getTranslations(language: string): any {
        const translations: Record<string, any> = {
            en: {
                title: 'AI Jira Planning Assistant',
                sessionId: 'Session ID',
                saveSession: 'Save Session',
                loadSession: 'Load Session',
                restart: 'Restart Planning',
                conversation: 'Planning Conversation',
                clearConversation: 'Clear Conversation',
                currentStep: 'Current Step',
                complete: 'Complete',
                confirm: 'Confirm',
                modify: 'Modify',
                accept: 'Accept',
                reject: 'Reject',
                edit: 'Edit',
                remove: 'Remove',
                export: 'Export',
                cancel: 'Cancel',
                help: 'Help',
                settings: 'Settings',
                exportQuick: 'Quick Export',
                benefits: 'Benefits',
                effort: 'Effort',
                selectAction: 'Please select an action to continue',
                startConversation: 'Start Planning Conversation',
                startConversationDesc: 'Begin by describing your project requirements',
                authors: {
                    user: 'You',
                    assistant: 'AI Assistant',
                    system: 'System'
                },
                steps: {
                    [PlanningStep.INITIAL_UNDERSTANDING]: 'Initial Understanding',
                    [PlanningStep.REQUIREMENT_CONFIRMATION]: 'Requirement Confirmation',
                    [PlanningStep.SUGGESTION_REVIEW]: 'Suggestion Review',
                    [PlanningStep.STRUCTURE_PLANNING]: 'Structure Planning',
                    [PlanningStep.TICKET_GENERATION]: 'Ticket Generation',
                    [PlanningStep.FINAL_REVIEW]: 'Final Review'
                },
                inputArea: {
                    title: 'Project Requirements',
                    placeholder: 'Describe your project requirements here...\n\nExample:\n"Build a user authentication system with multi-factor authentication, password reset functionality, and user profile management"',
                    send: 'Send',
                    clear: 'Clear',
                    quickStart: 'Quick Start'
                },
                inputs: {
                    initialUnderstanding: {
                        title: 'Understanding Your Requirements',
                        description: 'Please review the AI analysis of your requirements',
                        confirm: 'Analysis is Correct',
                        clarify: 'Need Clarification'
                    },
                    confirmation: {
                        title: 'Confirm Requirements',
                        description: 'Review and confirm the processed requirements',
                        confirm: 'Confirm All Requirements',
                        addMore: 'Add More Requirements'
                    },
                    suggestions: {
                        title: 'Professional Suggestions',
                        description: 'Review AI-generated suggestions for your project',
                        proceed: 'Proceed with Selected Suggestions',
                        requestMore: 'Request More Suggestions'
                    },
                    generation: {
                        title: 'Generate Jira Tickets',
                        description: 'Generate structured Jira tickets from your requirements',
                        generate: 'Generate Tickets',
                        preview: 'Preview Export'
                    },
                    review: {
                        title: 'Final Review & Export',
                        description: 'Review the complete planning session and export tickets',
                        export: 'Export Tickets',
                        startNew: 'Start New Session'
                    }
                },
                context: {
                    title: 'Planning Context',
                    overview: 'Overview',
                    requirements: 'Requirements',
                    suggestions: 'Suggestions',
                    tickets: 'Tickets'
                },
                stats: {
                    requirements: 'Requirements',
                    suggestions: 'Suggestions',
                    tickets: 'Tickets'
                },
                modals: {
                    requirement: {
                        title: 'Edit Requirement'
                    },
                    suggestion: {
                        title: 'Suggestion Details'
                    },
                    ticket: {
                        title: 'Ticket Details'
                    },
                    export: {
                        title: 'Export Tickets',
                        format: 'Export Format',
                        csvDesc: 'Comma-separated values for spreadsheets',
                        jsonDesc: 'JSON format for API integration',
                        jiraDesc: 'Jira-ready import format',
                        confluenceDesc: 'Confluence documentation page',
                        includeMetadata: 'Include metadata and session info',
                        includeRelationships: 'Include ticket relationships',
                        includeConversation: 'Include conversation history'
                    }
                },
                ticketPreviewPlaceholder: 'Ticket preview will appear here',
                reviewSummaryPlaceholder: 'Review summary will appear here',
                requirementsContextPlaceholder: 'Requirements context will appear here',
                suggestionsContextPlaceholder: 'Suggestions context will appear here',
                ticketsContextPlaceholder: 'Tickets context will appear here'
            },
            'zh-CN': {
                title: 'AI Jira 规划助手',
                sessionId: '会话 ID',
                saveSession: '保存会话',
                loadSession: '加载会话',
                restart: '重新开始规划',
                conversation: '规划对话',
                clearConversation: '清空对话',
                currentStep: '当前步骤',
                complete: '完成',
                confirm: '确认',
                modify: '修改',
                accept: '接受',
                reject: '拒绝',
                edit: '编辑',
                remove: '移除',
                export: '导出',
                cancel: '取消',
                help: '帮助',
                settings: '设置',
                exportQuick: '快速导出',
                benefits: '优势',
                effort: '工作量',
                selectAction: '请选择操作以继续',
                startConversation: '开始规划对话',
                startConversationDesc: '首先描述您的项目需求',
                authors: {
                    user: '您',
                    assistant: 'AI 助手',
                    system: '系统'
                },
                steps: {
                    [PlanningStep.INITIAL_UNDERSTANDING]: '初始理解',
                    [PlanningStep.REQUIREMENT_CONFIRMATION]: '需求确认',
                    [PlanningStep.SUGGESTION_REVIEW]: '建议评审',
                    [PlanningStep.STRUCTURE_PLANNING]: '结构规划',
                    [PlanningStep.TICKET_GENERATION]: '工单生成',
                    [PlanningStep.FINAL_REVIEW]: '最终评审'
                },
                inputArea: {
                    title: '项目需求',
                    placeholder: '请在此描述您的项目需求...\n\n示例：\n"构建一个用户认证系统，包含多因素认证、密码重置功能和用户资料管理"',
                    send: '发送',
                    clear: '清空',
                    quickStart: '快速开始'
                },
                inputs: {
                    initialUnderstanding: {
                        title: '理解您的需求',
                        description: '请审查AI对您需求的分析',
                        confirm: '分析正确',
                        clarify: '需要澄清'
                    },
                    confirmation: {
                        title: '确认需求',
                        description: '审查并确认处理后的需求',
                        confirm: '确认所有需求',
                        addMore: '添加更多需求'
                    },
                    suggestions: {
                        title: '专业建议',
                        description: '审查AI为您的项目生成的建议',
                        proceed: '继续选定的建议',
                        requestMore: '请求更多建议'
                    },
                    generation: {
                        title: '生成Jira工单',
                        description: '从您的需求生成结构化的Jira工单',
                        generate: '生成工单',
                        preview: '预览导出'
                    },
                    review: {
                        title: '最终审查和导出',
                        description: '审查完整的规划会话并导出工单',
                        export: '导出工单',
                        startNew: '开始新会话'
                    }
                },
                context: {
                    title: '规划上下文',
                    overview: '概览',
                    requirements: '需求',
                    suggestions: '建议',
                    tickets: '工单',
                    overviewContextPlaceholder: '概览上下文将在此显示',
                    requirementsContextPlaceholder: '需求上下文将在此显示',
                    suggestionsContextPlaceholder: '建议上下文将在此显示',
                    ticketsContextPlaceholder: '工单上下文将在此显示'
                }
            }
        };

        return translations[language] || translations.en;
    }

    private static generateCSS(): string {
        return `
        /* AI Jira Planner Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
            overflow-x: hidden;
        }

        .jira-planner-app {
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
            background-color: var(--vscode-sideBar-background, #f8f8f8);
        }

        /* Header Styles */
        .planner-header {
            background-color: var(--vscode-sideBar-background, #f8f8f8);
            border-bottom: 1px solid var(--vscode-sideBar-border, #ddd);
            padding: 0.5rem 2rem;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo h1 {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .header-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--vscode-foreground, #333);
            padding: 0.25rem;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .header-btn:hover {
            background-color: var(--vscode-toolbar-hoverBackground, #f0f0f0);
        }

        .header-btn svg {
            width: 18px;
            height: 18px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
        }

        .language-toggle .header-btn {
            font-size: 0.8rem;
            padding: 0.25rem 0.5rem;
        }

        /* Progress Bar Styles */
        .progress-section {
            padding: 0;
        }

        .progress-bar-container {
            width: 100%;
        }

        .progress-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .progress-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            flex-grow: 1;
            position: relative;
        }

        .step-circle {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: bold;
            background-color: #fff;
            transition: all 0.3s ease;
            z-index: 2;
        }

        .step-label {
            font-size: 0.7rem;
            margin-top: 0.25rem;
            color: #888;
            max-width: 80px;
        }

        .step-connector {
            height: 2px;
            background-color: #ccc;
            flex-grow: 1;
            margin: 0 -1rem;
            position: relative;
            top: -12px;
            z-index: 1;
        }

        .progress-step.current .step-circle {
            border-color: #667eea;
            background-color: #667eea;
            color: white;
        }

        .progress-step.current .step-label {
            color: #667eea;
            font-weight: bold;
        }

        .progress-step.completed .step-circle {
            border-color: #38a169;
            background-color: #38a169;
            color: white;
        }

        .progress-step.completed .step-label {
            color: #38a169;
        }

        .progress-step.completed .check-icon {
            width: 14px;
            height: 14px;
            stroke: white;
            stroke-width: 3;
        }

        .progress-step.completed + .step-connector {
            background-color: #38a169;
        }

        .progress-info {
            display: none; /* Hide for a more compact view */
        }

        /* Main Input Area Styles */
        .main-input-area {
            display: flex;
            padding: 10px;
            border-top: 1px solid #eee;
            background: #f9f9f9;
        }

        .requirement-textarea {
            flex-grow: 1;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 8px;
            font-size: 1em;
            resize: vertical;
            min-height: 50px;
        }

        .input-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: 10px;
        }
        
        .primary-btn, .secondary-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 1em;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .primary-btn {
            background: #007acc;
            color: white;
            border: 1px solid #007acc;
        }

        .primary-btn:hover {
            background: #005fa3;
        }

        .secondary-btn {
            background: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
        }
        
        .secondary-btn:hover {
            background: #e0e0e0;
        }

        /* Step-specific Input Styles */
        .step-specific-input {
            background: #fff;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
        }

        .step-header {
            margin-bottom: 1rem;
        }

        .step-header h3 {
            color: #2c3e50;
            margin-bottom: 0.25rem;
            font-size: 1.1rem;
        }

        .step-header p {
            color: #7f8c8d;
            font-size: 0.9rem;
            margin: 0;
        }

        .step-controls {
            display: flex;
            gap: 0.75rem;
            margin-top: 1rem;
        }

        /* Button Styles */
        .primary-btn, .secondary-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
        }

        .primary-btn {
            background: #3498db;
            color: white;
        }

        .primary-btn:hover {
            background: #2980b9;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }

        .secondary-btn {
            background: #f8f9fa;
            color: #495057;
            border: 1px solid #dee2e6;
        }

        .secondary-btn:hover {
            background: #e9ecef;
            border-color: #adb5bd;
        }

        .primary-btn svg, .secondary-btn svg {
            width: 18px;
            height: 18px;
        }

        /* Requirement and Suggestion Items */
        .requirement-item, .suggestion-item {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }

        .req-header, .suggestion-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.5rem;
        }

        .req-header h4, .suggestion-header h4 {
            color: #2c3e50;
            margin: 0;
            flex: 1;
        }

        .req-badges, .suggestion-badges {
            display: flex;
            gap: 0.5rem;
            margin-left: 1rem;
        }

        .req-category, .req-priority, .suggestion-category, .suggestion-priority {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }

        .req-category, .suggestion-category {
            background: #e3f2fd;
            color: #1976d2;
        }

        .req-priority, .suggestion-priority {
            background: #fff3e0;
            color: #f57c00;
        }

        .req-description, .suggestion-description {
            color: #495057;
            margin-bottom: 1rem;
            line-height: 1.5;
        }

        .req-actions, .suggestion-actions {
            display: flex;
            gap: 0.5rem;
        }

        .edit-req-btn, .remove-req-btn, .accept-suggestion-btn, .modify-suggestion-btn, .reject-suggestion-btn {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.5rem 1rem;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            background: #fff;
            color: #495057;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .edit-req-btn:hover, .modify-suggestion-btn:hover {
            background: #e3f2fd;
            border-color: #3498db;
            color: #1976d2;
        }

        .remove-req-btn:hover, .reject-suggestion-btn:hover {
            background: #ffebee;
            border-color: #f44336;
            color: #d32f2f;
        }

        .accept-suggestion-btn:hover {
            background: #e8f5e8;
            border-color: #4caf50;
            color: #2e7d32;
        }

        .suggestion-impact {
            background: #f8f9fa;
            border-radius: 4px;
            padding: 1rem;
            margin-bottom: 1rem;
        }

        .impact-benefits ul {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
        }

        .impact-benefits li {
            margin-bottom: 0.25rem;
        }

        .impact-effort {
            margin-top: 0.5rem;
            font-size: 0.9rem;
            color: #6c757d;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1400px;
            margin: 0 auto;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo-icon {
            width: 32px;
            height: 32px;
            color: #667eea;
        }

        .logo h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #2d3748;
            margin: 0;
        }

        .session-info {
            display: flex;
            gap: 1rem;
            font-size: 0.875rem;
            color: #718096;
            margin-left: 2rem;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .header-btn {
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 8px;
            padding: 0.5rem;
            cursor: pointer;
            color: #667eea;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .header-btn:hover {
            background: rgba(102, 126, 234, 0.2);
            border-color: rgba(102, 126, 234, 0.4);
            transform: translateY(-1px);
        }

        .header-btn svg {
            width: 18px;
            height: 18px;
        }

        .restart-btn {
            background: rgba(255, 107, 107, 0.1);
            border-color: rgba(255, 107, 107, 0.2);
            color: #ff6b6b;
        }

        .restart-btn:hover {
            background: rgba(255, 107, 107, 0.2);
            border-color: rgba(255, 107, 107, 0.4);
        }

        /* Main Content Styles */
        .main-content {
            flex-grow: 1;
            overflow-y: auto;
            padding: 0 1rem 1rem;
        }

        .content-container {
            width: 100%;
            max-width: 1280px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        /* Conversation Panel */
        .conversation-panel {
            width: 100%;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            background-color: var(--vscode-editor-background, #fff);
            border: 1px solid var(--vscode-sideBar-border, #ddd);
            border-radius: 8px;
            overflow: hidden;
        }

        .conversation-header {
            padding: 0.75rem 1.5rem;
            border-bottom: 1px solid var(--vscode-sideBar-border, #ddd);
            flex-shrink: 0;
        }

        .conversation-header h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #2d3748;
            margin: 0;
        }

        .conversation-controls {
            display: flex;
            gap: 0.5rem;
        }

        .control-btn {
            background: transparent;
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 6px;
            padding: 0.5rem;
            cursor: pointer;
            color: #667eea;
            transition: all 0.2s ease;
        }

        .control-btn:hover {
            background: rgba(102, 126, 234, 0.1);
            border-color: rgba(102, 126, 234, 0.4);
        }

        .control-btn svg {
            width: 16px;
            height: 16px;
        }

        .conversation-content {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }

        .conversation-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            color: #718096;
        }

        .empty-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .conversation-empty h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #4a5568;
        }

        .conversation-empty p {
            font-size: 0.875rem;
            color: #718096;
        }

        /* Message Styles */
        .message {
            margin-bottom: 1.5rem;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(0, 0, 0, 0.05);
            background: white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .message.user {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
        }

        .message.assistant {
            background: #f7fafc;
            border-left: 4px solid #667eea;
        }

        .message.system {
            background: #fef5e7;
            border-left: 4px solid #ed8936;
        }

        .message-header {
            padding: 1rem 1.5rem 0.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .message-author {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .author-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            background: rgba(255, 255, 255, 0.2);
        }

        .message.user .author-avatar {
            background: rgba(255, 255, 255, 0.3);
        }

        .message.assistant .author-avatar {
            background: #667eea;
            color: white;
        }

        .message.system .author-avatar {
            background: #ed8936;
            color: white;
        }

        .author-name {
            font-weight: 600;
            font-size: 0.875rem;
        }

        .message-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.75rem;
            opacity: 0.8;
        }

        .message-content {
            padding: 0 1.5rem 1rem;
            font-size: 0.95rem;
            line-height: 1.6;
        }

        .message-content strong {
            font-weight: 600;
        }

        .message-content em {
            font-style: italic;
        }

        .message-content code {
            background: rgba(0, 0, 0, 0.1);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 0.85rem;
        }

        .message-content pre {
            background: rgba(0, 0, 0, 0.05);
            padding: 1rem;
            border-radius: 8px;
            margin: 0.5rem 0;
            overflow-x: auto;
        }

        .message-content pre code {
            background: none;
            padding: 0;
        }

        .message-actions {
            padding: 0 1.5rem 1rem;
            display: flex;
            gap: 0.5rem;
        }

        .confirm-btn, .modify-btn {
            background: rgba(72, 187, 120, 0.1);
            border: 1px solid rgba(72, 187, 120, 0.3);
            color: #38a169;
            border-radius: 6px;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .modify-btn {
            background: rgba(102, 126, 234, 0.1);
            border-color: rgba(102, 126, 234, 0.3);
            color: #667eea;
        }

        .confirm-btn:hover {
            background: rgba(72, 187, 120, 0.2);
            border-color: rgba(72, 187, 120, 0.5);
        }

        .modify-btn:hover {
            background: rgba(102, 126, 234, 0.2);
            border-color: rgba(102, 126, 234, 0.5);
        }

        /* Input Section */
        .conversation-input {
            border-top: 1px solid var(--vscode-sideBar-border, #ddd);
            padding: 1rem 1.5rem;
            background-color: var(--vscode-editor-background, #fff);
            flex-shrink: 0;
        }

        .step-input {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .input-header h3 {
            font-size: 1.125rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 0.5rem;
        }

        .input-header p {
            font-size: 0.875rem;
            color: #718096;
            margin: 0;
        }

        .input-controls {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
        }

        .primary-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 0.75rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .primary-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .secondary-btn {
            background: rgba(102, 126, 234, 0.1);
            color: #667eea;
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 8px;
            padding: 0.75rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .secondary-btn:hover {
            background: rgba(102, 126, 234, 0.2);
            border-color: rgba(102, 126, 234, 0.5);
            transform: translateY(-1px);
        }

        /* Context Panel */
        .context-panel {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .context-header {
            padding: 1.5rem 2rem 1rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            background: rgba(102, 126, 234, 0.05);
        }

        .context-header h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #2d3748;
            margin: 0 0 1rem 0;
        }

        .context-tabs {
            display: flex;
            gap: 0.25rem;
        }

        .context-tab {
            background: transparent;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #718096;
        }

        .context-tab.active {
            background: #667eea;
            color: white;
        }

        .context-tab:hover:not(.active) {
            background: rgba(102, 126, 234, 0.1);
            color: #667eea;
        }

        .context-content {
            padding: 1.5rem 2rem;
            height: calc(100% - 120px);
            overflow-y: auto;
        }

        .context-tab-content {
            display: none;
        }

        .context-tab-content.active {
            display: block;
        }

        /* Overview Context */
        .overview-context {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .session-stats {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1rem;
        }

        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: rgba(102, 126, 234, 0.05);
            border-radius: 8px;
            border: 1px solid rgba(102, 126, 234, 0.1);
        }

        .stat-label {
            font-size: 0.875rem;
            color: #718096;
        }

        .stat-value {
            font-size: 1.25rem;
            font-weight: 700;
            color: #667eea;
        }

        /* Floating Actions */
        .floating-actions {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 1000;
        }

        .floating-actions-content {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            align-items: center;
        }

        .floating-btn {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
        }

        .floating-btn svg {
            width: 24px;
            height: 24px;
        }

        .help-btn {
            background: rgba(102, 126, 234, 0.9);
            color: white;
        }

        .settings-btn {
            background: rgba(113, 128, 150, 0.9);
            color: white;
        }

        .export-btn {
            background: rgba(72, 187, 120, 0.9);
            color: white;
        }

        .floating-btn:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        /* Modal Styles */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        }

        .modal-content {
            background: white;
            border-radius: 16px;
            box-shadow: 0 16px 64px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }

        .modal-header {
            padding: 1.5rem 2rem 1rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #2d3748;
            margin: 0;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #718096;
            padding: 0.5rem;
            border-radius: 4px;
            transition: all 0.2s ease;
        }

        .modal-close:hover {
            background: rgba(0, 0, 0, 0.05);
            color: #2d3748;
        }

        .modal-body {
            padding: 1.5rem 2rem;
        }

        .modal-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            margin-top: 1.5rem;
        }

        /* Requirement List */
        .requirement-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin: 1rem 0;
        }

        .requirement-item {
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            padding: 1rem;
        }

        .req-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
        }

        .req-header h4 {
            flex: 1;
            font-size: 1rem;
            font-weight: 600;
            color: #2d3748;
            margin: 0;
        }

        .req-category, .req-priority {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }

        .req-category.epic { background: #e6fffa; color: #319795; }
        .req-category.feature { background: #e1f5fe; color: #0277bd; }
        .req-category.user_story { background: #f3e5f5; color: #7b1fa2; }
        .req-category.task { background: #fff3e0; color: #e65100; }

        .req-priority.critical { background: #fed7d7; color: #c53030; }
        .req-priority.high { background: #feebc8; color: #dd6b20; }
        .req-priority.medium { background: #fef5e7; color: #d69e2e; }
        .req-priority.low { background: #f0fff4; color: #38a169; }

        .req-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.75rem;
        }

        .edit-req-btn, .remove-req-btn {
            background: transparent;
            border: 1px solid rgba(102, 126, 234, 0.3);
            color: #667eea;
            border-radius: 4px;
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .remove-req-btn {
            border-color: rgba(255, 107, 107, 0.3);
            color: #ff6b6b;
        }

        .edit-req-btn:hover {
            background: rgba(102, 126, 234, 0.1);
            border-color: rgba(102, 126, 234, 0.5);
        }

        .remove-req-btn:hover {
            background: rgba(255, 107, 107, 0.1);
            border-color: rgba(255, 107, 107, 0.5);
        }

        /* Suggestion List */
        .suggestion-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin: 1rem 0;
        }

        .suggestion-item {
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            padding: 1rem;
        }

        .suggestion-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
        }

        .suggestion-header h4 {
            flex: 1;
            font-size: 1rem;
            font-weight: 600;
            color: #2d3748;
            margin: 0;
        }

        .suggestion-category {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }

        .suggestion-category.architecture { background: #e1f5fe; color: #0277bd; }
        .suggestion-category.security { background: #fce4ec; color: #c2185b; }
        .suggestion-category.performance { background: #e8f5e8; color: #2e7d32; }
        .suggestion-category.user_experience { background: #fff3e0; color: #e65100; }

        .suggestion-priority {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }

        .suggestion-description {
            margin: 0.5rem 0;
            color: #4a5568;
            font-size: 0.9rem;
            line-height: 1.5;
        }

        .suggestion-impact {
            margin: 1rem 0;
            padding: 0.75rem;
            background: rgba(102, 126, 234, 0.05);
            border-radius: 6px;
            border-left: 3px solid #667eea;
        }

        .impact-benefits ul {
            margin: 0.5rem 0 0 1rem;
            padding: 0;
        }

        .impact-benefits li {
            margin-bottom: 0.25rem;
            font-size: 0.875rem;
            color: #4a5568;
        }

        .impact-effort {
            margin-top: 0.75rem;
            font-size: 0.875rem;
            color: #718096;
        }

        .suggestion-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }

        .accept-suggestion-btn, .modify-suggestion-btn, .reject-suggestion-btn {
            background: transparent;
            border: 1px solid;
            border-radius: 6px;
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 500;
        }

        .accept-suggestion-btn {
            border-color: rgba(72, 187, 120, 0.3);
            color: #38a169;
        }

        .modify-suggestion-btn {
            border-color: rgba(102, 126, 234, 0.3);
            color: #667eea;
        }

        .reject-suggestion-btn {
            border-color: rgba(255, 107, 107, 0.3);
            color: #ff6b6b;
        }

        .accept-suggestion-btn:hover {
            background: rgba(72, 187, 120, 0.1);
            border-color: rgba(72, 187, 120, 0.5);
        }

        .modify-suggestion-btn:hover {
            background: rgba(102, 126, 234, 0.1);
            border-color: rgba(102, 126, 234, 0.5);
        }

        .reject-suggestion-btn:hover {
            background: rgba(255, 107, 107, 0.1);
            border-color: rgba(255, 107, 107, 0.5);
        }

        /* Export Options */
        .export-options {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .export-format h4 {
            font-size: 1rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 0.75rem;
        }

        .format-options {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .format-options label {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .format-options label:hover {
            background: rgba(102, 126, 234, 0.05);
            border-color: rgba(102, 126, 234, 0.3);
        }

        .format-options input[type="radio"] {
            margin: 0;
        }

        .export-options-config {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .export-options-config label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #4a5568;
        }

        /* Animations */
        @keyframes pulse {
            0%, 100% { 
                transform: scale(1);
                opacity: 1;
            }
            50% { 
                transform: scale(1.05);
                opacity: 0.8;
            }
        }

        @keyframes fadeIn {
            from { 
                opacity: 0;
                transform: translateY(10px);
            }
            to { 
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message {
            animation: fadeIn 0.3s ease-out;
        }

        /* Notification Styles */
        .notification {
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            animation: fadeIn 0.3s ease-out;
        }

        .notification.info {
            background: #667eea;
        }

        .notification.success {
            background: #48bb78;
        }

        .notification.error {
            background: #f56565;
        }

        .notification.warning {
            background: #ed8936;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
            .content-container {
                grid-template-columns: 1fr 350px;
            }
        }

        @media (max-width: 768px) {
            .planner-header {
                padding: 1rem;
            }

            .header-content {
                flex-direction: column;
                gap: 1rem;
            }

            .progress-section {
                padding: 1rem;
            }

            .main-content {
                padding: 0 1rem 1rem;
            }

            .content-container {
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            .progress-bar {
                flex-direction: column;
                gap: 1rem;
            }

            .step-connector {
                display: none;
            }

            .floating-actions {
                bottom: 1rem;
                right: 1rem;
            }

            .modal-content {
                width: 95%;
                margin: 1rem;
            }

            .session-info {
                flex-direction: column;
                gap: 0.5rem;
                margin-left: 0;
            }
        }

        /* Body modal open state */
        body.modal-open {
            overflow: hidden;
        }

        /* Additional utility classes */
        .hidden {
            display: none !important;
        }

        .text-center {
            text-align: center;
        }

        .text-muted {
            color: #718096;
        }

        .font-medium {
            font-weight: 500;
        }

        .font-semibold {
            font-weight: 600;
        }

        .font-bold {
            font-weight: 700;
        }

        .mb-2 {
            margin-bottom: 0.5rem;
        }

        .mb-4 {
            margin-bottom: 1rem;
        }

        .mt-2 {
            margin-top: 0.5rem;
        }

        .mt-4 {
            margin-top: 1rem;
        }

        .message-content .requirement-list,
        .message-content .suggestion-list,
        .message-content .ticket-list {
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .message-content .requirement-item,
        .message-content .suggestion-item,
        .message-content .ticket-item {
            background-color: var(--vscode-editorWidget-background, #f3f3f3);
            border-radius: 8px;
            padding: 1rem;
            border-left: 4px solid var(--vscode-button-background, #0e639c);
            transition: box-shadow 0.2s ease;
        }
        .message-content .requirement-item:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .message-content .item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        .message-content .item-header h4 {
            font-size: 1rem;
            font-weight: 600;
            margin: 0;
        }
        .message-content .item-badges {
            display: flex;
            gap: 0.5rem;
        }
        .message-content .item-badge {
            font-size: 0.7rem;
            padding: 0.15rem 0.5rem;
            border-radius: 12px;
            font-weight: 500;
            background-color: var(--vscode-badge-background, #4d4d4d);
            color: var(--vscode-badge-foreground, #fff);
        }
        .message-content .item-description {
            font-size: 0.9rem;
            color: var(--vscode-editor-foreground, #616161);
        }
        .message-content .item-actions {
            margin-top: 0.75rem;
            display: flex;
            gap: 0.5rem;
        }
        .message-content .item-action-btn {
            font-size: 0.8rem;
            padding: 0.25rem 0.75rem;
        }
        `;
    }
} 