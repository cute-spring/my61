/**
 * Error Handling and Recovery System for AI Jira Planning Assistant
 * Provides comprehensive error handling, retry mechanisms, and graceful degradation
 */

import * as vscode from 'vscode';
import { PlanningWorkflowState, PlanningStep } from './jiraPlanningTypes';

export enum ErrorType {
    AI_SERVICE_ERROR = 'ai_service_error',
    NETWORK_ERROR = 'network_error',
    VALIDATION_ERROR = 'validation_error',
    PARSING_ERROR = 'parsing_error',
    RATE_LIMIT_ERROR = 'rate_limit_error',
    SESSION_ERROR = 'session_error',
    EXPORT_ERROR = 'export_error',
    UNKNOWN_ERROR = 'unknown_error'
}

export interface ErrorContext {
    type: ErrorType;
    message: string;
    originalError?: Error;
    step?: PlanningStep;
    sessionId?: string;
    timestamp: Date;
    userAction?: string;
    recoveryOptions?: RecoveryOption[];
}

export interface RecoveryOption {
    id: string;
    title: string;
    description: string;
    action: () => Promise<void>;
    isRecommended?: boolean;
}

export class JiraPlannerErrorHandler {
    private errorHistory: ErrorContext[] = [];
    private retryAttempts = new Map<string, number>();
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly RETRY_DELAY_BASE = 1000; // 1 second

    /**
     * Handle and categorize errors with recovery options
     */
    async handleError(
        error: Error | string,
        context: Partial<ErrorContext> = {}
    ): Promise<ErrorContext> {
        const errorContext: ErrorContext = {
            type: this.categorizeError(error),
            message: typeof error === 'string' ? error : error.message,
            originalError: typeof error === 'string' ? undefined : error,
            timestamp: new Date(),
            ...context
        };

        // Add recovery options based on error type
        errorContext.recoveryOptions = this.generateRecoveryOptions(errorContext);

        // Log error for debugging
        console.error('Jira Planner Error:', errorContext);
        
        // Add to error history
        this.errorHistory.push(errorContext);

        // Show user-friendly error message with recovery options
        await this.presentErrorToUser(errorContext);

        return errorContext;
    }

    /**
     * Retry mechanism with exponential backoff
     */
    async retryOperation<T>(
        operation: () => Promise<T>,
        operationId: string,
        maxAttempts: number = this.MAX_RETRY_ATTEMPTS
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await operation();
                
                // Reset retry count on success
                this.retryAttempts.delete(operationId);
                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                // Update retry count
                this.retryAttempts.set(operationId, attempt);

                // Don't retry on certain error types
                if (this.isNonRetryableError(lastError)) {
                    throw lastError;
                }

                // Wait before retry (exponential backoff)
                if (attempt < maxAttempts) {
                    const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
                    await this.delay(delay);
                    
                    // Show retry notification
                    vscode.window.showInformationMessage(
                        `Retrying operation... (Attempt ${attempt + 1}/${maxAttempts})`
                    );
                }
            }
        }

        throw lastError!;
    }

    /**
     * Graceful degradation for AI service failures
     */
    async gracefulDegradation<T>(
        primaryOperation: () => Promise<T>,
        fallbackOperation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        try {
            return await primaryOperation();
        } catch (error) {
            console.warn(`Primary operation failed for ${operationName}, using fallback:`, error);
            
            // Notify user about fallback
            vscode.window.showWarningMessage(
                `Using simplified ${operationName} due to service issues. Full functionality will be restored automatically.`
            );
            
            return await fallbackOperation();
        }
    }

    /**
     * Validate session state and recover if corrupted
     */
    async validateAndRecoverSession(session: PlanningWorkflowState): Promise<PlanningWorkflowState> {
        const issues: string[] = [];

        // Check required fields
        if (!session.sessionId) {
            issues.push('Missing session ID');
        }
        if (!session.requirements) {
            issues.push('Missing requirements data');
        }
        if (!session.conversationHistory) {
            issues.push('Missing conversation history');
        }

        // Check data integrity
        if (session.requirements?.processedRequirements) {
            for (const req of session.requirements.processedRequirements) {
                if (!req.id || !req.title) {
                    issues.push(`Invalid requirement: ${req.id || 'unknown'}`);
                }
            }
        }

        if (issues.length > 0) {
            console.warn('Session validation issues:', issues);
            
            // Attempt to recover
            const recoveredSession = await this.recoverSession(session, issues);
            
            // Notify user about recovery
            vscode.window.showWarningMessage(
                `Session data was corrupted and has been recovered. Some data may have been lost.`
            );
            
            return recoveredSession;
        }

        return session;
    }

    /**
     * Handle AI service timeout with progressive fallback
     */
    async handleAITimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number = 30000,
        fallback?: () => Promise<T>
    ): Promise<T> {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`AI service timeout after ${timeoutMs}ms`));
            }, timeoutMs);

            try {
                const result = await operation();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (fallback) {
                    try {
                        const fallbackResult = await fallback();
                        resolve(fallbackResult);
                    } catch (fallbackError) {
                        reject(error); // Return original error
                    }
                } else {
                    reject(error);
                }
            }
        });
    }

    /**
     * Export error logs for debugging
     */
    exportErrorLogs(): string {
        const report = {
            timestamp: new Date().toISOString(),
            errorCount: this.errorHistory.length,
            errors: this.errorHistory.map(error => ({
                type: error.type,
                message: error.message,
                step: error.step,
                timestamp: error.timestamp.toISOString(),
                userAction: error.userAction
            }))
        };

        return JSON.stringify(report, null, 2);
    }

    /**
     * Clear error history
     */
    clearErrorHistory(): void {
        this.errorHistory = [];
        this.retryAttempts.clear();
    }

    /**
     * Get error statistics
     */
    getErrorStatistics(): {
        totalErrors: number;
        errorsByType: { [key: string]: number };
        recentErrors: ErrorContext[];
    } {
        const errorsByType: { [key: string]: number } = {};
        
        this.errorHistory.forEach(error => {
            errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
        });

        const recentErrors = this.errorHistory
            .filter(error => Date.now() - error.timestamp.getTime() < 60000) // Last minute
            .slice(-10); // Last 10 errors

        return {
            totalErrors: this.errorHistory.length,
            errorsByType,
            recentErrors
        };
    }

    // Private helper methods
    private categorizeError(error: Error | string): ErrorType {
        const message = typeof error === 'string' ? error : error.message;
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
            return ErrorType.RATE_LIMIT_ERROR;
        }
        if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
            return ErrorType.NETWORK_ERROR;
        }
        if (lowerMessage.includes('timeout') || lowerMessage.includes('ai service')) {
            return ErrorType.AI_SERVICE_ERROR;
        }
        if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
            return ErrorType.VALIDATION_ERROR;
        }
        if (lowerMessage.includes('parse') || lowerMessage.includes('json')) {
            return ErrorType.PARSING_ERROR;
        }
        if (lowerMessage.includes('session') || lowerMessage.includes('state')) {
            return ErrorType.SESSION_ERROR;
        }
        if (lowerMessage.includes('export') || lowerMessage.includes('save')) {
            return ErrorType.EXPORT_ERROR;
        }

        return ErrorType.UNKNOWN_ERROR;
    }

    private generateRecoveryOptions(context: ErrorContext): RecoveryOption[] {
        const options: RecoveryOption[] = [];

        switch (context.type) {
            case ErrorType.AI_SERVICE_ERROR:
                options.push({
                    id: 'retry_ai',
                    title: 'Retry AI Request',
                    description: 'Try the AI request again',
                    action: async () => {
                        // Implementation would retry the specific AI operation
                    },
                    isRecommended: true
                });
                options.push({
                    id: 'use_fallback',
                    title: 'Use Simplified Mode',
                    description: 'Continue with basic functionality',
                    action: async () => {
                        // Implementation would enable fallback mode
                    }
                });
                break;

            case ErrorType.NETWORK_ERROR:
                options.push({
                    id: 'check_connection',
                    title: 'Check Connection',
                    description: 'Verify your internet connection and try again',
                    action: async () => {
                        vscode.window.showInformationMessage('Please check your internet connection and try again.');
                    },
                    isRecommended: true
                });
                break;

            case ErrorType.RATE_LIMIT_ERROR:
                options.push({
                    id: 'wait_retry',
                    title: 'Wait and Retry',
                    description: 'Wait for rate limit to reset and try again',
                    action: async () => {
                        await this.delay(60000); // Wait 1 minute
                        vscode.window.showInformationMessage('Rate limit should be reset now. You can try again.');
                    },
                    isRecommended: true
                });
                break;

            case ErrorType.SESSION_ERROR:
                options.push({
                    id: 'restart_session',
                    title: 'Restart Session',
                    description: 'Start a new planning session',
                    action: async () => {
                        // Implementation would restart the session
                    },
                    isRecommended: true
                });
                break;

            case ErrorType.VALIDATION_ERROR:
                options.push({
                    id: 'fix_validation',
                    title: 'Fix Input',
                    description: 'Correct the input and try again',
                    action: async () => {
                        vscode.window.showInformationMessage('Please review and correct your input.');
                    },
                    isRecommended: true
                });
                break;
        }

        // Always add generic options
        options.push({
            id: 'view_logs',
            title: 'View Error Details',
            description: 'Show detailed error information',
            action: async () => {
                const errorDetails = this.formatErrorForUser(context);
                vscode.window.showInformationMessage(errorDetails);
            }
        });

        return options;
    }

    private async presentErrorToUser(context: ErrorContext): Promise<void> {
        const userMessage = this.formatErrorForUser(context);
        
        if (context.recoveryOptions && context.recoveryOptions.length > 0) {
            const recommendedOption = context.recoveryOptions.find(opt => opt.isRecommended);
            
            if (recommendedOption) {
                const action = await vscode.window.showErrorMessage(
                    userMessage,
                    recommendedOption.title,
                    'View Options'
                );

                if (action === recommendedOption.title) {
                    await recommendedOption.action();
                } else if (action === 'View Options') {
                    await this.showRecoveryOptions(context);
                }
            } else {
                await vscode.window.showErrorMessage(userMessage);
            }
        } else {
            await vscode.window.showErrorMessage(userMessage);
        }
    }

    private async showRecoveryOptions(context: ErrorContext): Promise<void> {
        if (!context.recoveryOptions || context.recoveryOptions.length === 0) {
            return;
        }

        const options = context.recoveryOptions.map(opt => ({
            label: opt.title,
            description: opt.description,
            option: opt
        }));

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Choose a recovery option'
        });

        if (selected) {
            await selected.option.action();
        }
    }

    private formatErrorForUser(context: ErrorContext): string {
        const baseMessage = `AI Jira Planner Error: ${context.message}`;
        
        switch (context.type) {
            case ErrorType.AI_SERVICE_ERROR:
                return `${baseMessage}\n\nThe AI service is temporarily unavailable. You can try again or use simplified mode.`;
            case ErrorType.NETWORK_ERROR:
                return `${baseMessage}\n\nPlease check your internet connection and try again.`;
            case ErrorType.RATE_LIMIT_ERROR:
                return `${baseMessage}\n\nToo many requests. Please wait a moment before trying again.`;
            case ErrorType.VALIDATION_ERROR:
                return `${baseMessage}\n\nPlease review your input and try again.`;
            case ErrorType.SESSION_ERROR:
                return `${baseMessage}\n\nSession data is corrupted. You may need to restart the planning session.`;
            default:
                return baseMessage;
        }
    }

    private isNonRetryableError(error: Error): boolean {
        const nonRetryableTypes = [
            ErrorType.VALIDATION_ERROR,
            ErrorType.PARSING_ERROR
        ];
        
        const errorType = this.categorizeError(error);
        return nonRetryableTypes.includes(errorType);
    }

    private async recoverSession(
        session: PlanningWorkflowState,
        issues: string[]
    ): Promise<PlanningWorkflowState> {
        // Create a minimal valid session
        const recoveredSession: PlanningWorkflowState = {
            sessionId: session.sessionId || this.generateSessionId(),
            currentStep: session.currentStep || PlanningStep.INITIAL_UNDERSTANDING,
            startTime: session.startTime || new Date(),
            lastUpdateTime: new Date(),
            isCompleted: false,
            userConfirmations: session.userConfirmations || {},
            requirements: session.requirements || {
                originalInput: '',
                processedRequirements: [],
                clarifications: [],
                isConfirmed: false,
                modifications: []
            },
            suggestions: session.suggestions || {
                suggestions: [],
                userChoices: [],
                appliedSuggestions: [],
                rejectedSuggestions: []
            },
            jiraOutput: session.jiraOutput || {
                epics: [],
                stories: [],
                tasks: [],
                bugs: [],
                exportFormats: []
            },
            conversationHistory: session.conversationHistory || []
        };

        return recoveredSession;
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 