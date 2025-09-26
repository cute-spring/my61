import * as vscode from 'vscode';
import { ConfluenceService } from './confluenceService';
import { ConfluenceContentProcessor } from './contentProcessor';
import { ConfluenceChatContext, ProcessedContent } from './types';

export class ConfluenceChatParticipant {
    private static readonly PARTICIPANT_ID = 'confluence';
    private static readonly MAX_CONTEXT_LENGTH = 50000;
    
    private confluenceService: ConfluenceService;
    private contentProcessor: ConfluenceContentProcessor;
    private currentContext: ConfluenceChatContext | null = null;
    private participant: vscode.ChatParticipant;

    constructor(confluenceService: ConfluenceService, contentProcessor: ConfluenceContentProcessor) {
        this.confluenceService = confluenceService;
        this.contentProcessor = contentProcessor;
        
        // Create and register the chat participant
        this.participant = vscode.chat.createChatParticipant(
            ConfluenceChatParticipant.PARTICIPANT_ID,
            this.handleChatRequest.bind(this)
        );

        this.setupParticipant();
    }

    /**
     * Setup the chat participant with metadata and commands
     */
    private setupParticipant(): void {
        this.participant.iconPath = vscode.Uri.file('resources/confluence-icon.svg');
        this.participant.followupProvider = {
            provideFollowups: this.provideFollowups.bind(this)
        };

        // Remove the supportedCommands property as it doesn't exist in the API
        // Commands will be handled through the request.command property
    }

    /**
     * Handle incoming chat requests
     */
    private async handleChatRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        try {
            // Handle slash commands
            if (request.command) {
                return await this.handleSlashCommand(request, stream, token);
            }

            // Check if we have a loaded page context
            if (!this.currentContext) {
                stream.markdown('No Confluence page is currently loaded. Use `/load <url>` to load a page first, or use the "Confluence: Chat with Page" command.');
                return { metadata: { command: 'no-context' } };
            }

            // Process the user's question with the page context
            return await this.processQuestionWithContext(request, stream, token);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            stream.markdown(`❌ Error: ${errorMessage}`);
            return { metadata: { command: 'error', error: errorMessage } };
        }
    }

    /**
     * Handle slash commands
     */
    private async handleSlashCommand(
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        const command = request.command;
        const prompt = request.prompt.trim();

        switch (command) {
            case 'load':
                return await this.handleLoadCommand(prompt, stream, token);
            
            case 'refresh':
                return await this.handleRefreshCommand(stream, token);
            
            case 'clear':
                return await this.handleClearCommand(stream);
            
            case 'info':
                return await this.handleInfoCommand(stream);
            
            default:
                stream.markdown(`Unknown command: ${command}`);
                return { metadata: { command: 'unknown-command' } };
        }
    }

    /**
     * Handle the /load command
     */
    private async handleLoadCommand(
        url: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        if (!url) {
            stream.markdown('Please provide a Confluence page URL. Example: `/load https://your-confluence.com/pages/123456`');
            return { metadata: { command: 'load-no-url' } };
        }

        try {
            stream.progress('Loading Confluence page...');
            
            const pageContent = await this.confluenceService.fetchPageByUrl(url);
            const processedContent = this.contentProcessor.processContent(
                pageContent.content,
                pageContent.title,
                url,
                pageContent.lastModified
            );

            // Check if content needs truncation
            const { content: finalContent, wasTruncated } = this.contentProcessor.truncateContent(
                processedContent.markdown,
                ConfluenceChatParticipant.MAX_CONTEXT_LENGTH
            );

            this.currentContext = {
                pageUrl: url,
                pageTitle: pageContent.title,
                processedContent: {
                    ...processedContent,
                    markdown: finalContent
                },
                loadedAt: new Date()
            };

            // Notify about successful load
            let message = `✅ Successfully loaded: **${pageContent.title}**\n\n`;
            message += `📊 **Page Statistics:**\n`;
            message += `- Word count: ${processedContent.metadata.wordCount}\n`;
            message += `- Sections: ${processedContent.sections.length}\n`;
            message += `- Last modified: ${pageContent.lastModified}\n`;
            
            if (wasTruncated) {
                message += `\n⚠️ **Note:** Content was truncated due to length. Some sections may not be available for context.`;
            }

            message += `\n\nYou can now ask questions about this page content!`;

            stream.markdown(message);

            // Fire event to update status bar
            this.onContextChanged();

            return { metadata: { command: 'load-success', pageTitle: pageContent.title } };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load page';
            stream.markdown(`❌ Failed to load page: ${errorMessage}`);
            return { metadata: { command: 'load-error', error: errorMessage } };
        }
    }

    /**
     * Handle the /refresh command
     */
    private async handleRefreshCommand(
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        if (!this.currentContext) {
            stream.markdown('No page is currently loaded to refresh.');
            return { metadata: { command: 'refresh-no-context' } };
        }

        try {
            stream.progress('Refreshing page content...');
            
            const pageContent = await this.confluenceService.fetchPageByUrl(this.currentContext.pageUrl);
            const processedContent = this.contentProcessor.processContent(
                pageContent.content,
                pageContent.title,
                this.currentContext.pageUrl,
                pageContent.lastModified
            );

            const { content: finalContent, wasTruncated } = this.contentProcessor.truncateContent(
                processedContent.markdown,
                ConfluenceChatParticipant.MAX_CONTEXT_LENGTH
            );

            this.currentContext = {
                ...this.currentContext,
                processedContent: {
                    ...processedContent,
                    markdown: finalContent
                },
                loadedAt: new Date()
            };

            let message = `🔄 Successfully refreshed: **${pageContent.title}**\n\n`;
            message += `Updated content loaded with ${processedContent.metadata.wordCount} words across ${processedContent.sections.length} sections.`;
            
            if (wasTruncated) {
                message += `\n\n⚠️ **Note:** Content was truncated due to length.`;
            }

            stream.markdown(message);
            this.onContextChanged();

            return { metadata: { command: 'refresh-success' } };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to refresh page';
            stream.markdown(`❌ Failed to refresh page: ${errorMessage}`);
            return { metadata: { command: 'refresh-error', error: errorMessage } };
        }
    }

    /**
     * Handle the /clear command
     */
    private async handleClearCommand(stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
        if (!this.currentContext) {
            stream.markdown('No page context to clear.');
            return { metadata: { command: 'clear-no-context' } };
        }

        const clearedTitle = this.currentContext.pageTitle;
        this.currentContext = null;
        
        stream.markdown(`🗑️ Cleared context for: **${clearedTitle}**\n\nYou can load a new page using \`/load <url>\`.`);
        this.onContextChanged();

        return { metadata: { command: 'clear-success' } };
    }

    /**
     * Handle the /info command
     */
    private async handleInfoCommand(stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
        if (!this.currentContext) {
            stream.markdown('No page is currently loaded. Use `/load <url>` to load a page first.');
            return { metadata: { command: 'info-no-context' } };
        }

        const { processedContent, pageUrl, pageTitle, loadedAt } = this.currentContext;
        const { metadata, sections } = processedContent;

        let message = `📄 **Current Page Information**\n\n`;
        message += `**Title:** ${pageTitle}\n`;
        message += `**URL:** ${pageUrl}\n`;
        message += `**Last Modified:** ${metadata.lastModified}\n`;
        message += `**Loaded At:** ${loadedAt.toLocaleString()}\n`;
        message += `**Word Count:** ${metadata.wordCount}\n`;
        message += `**Sections:** ${sections.length}\n\n`;

        if (sections.length > 0) {
            message += `**Available Sections:**\n`;
            sections.forEach((section, index) => {
                message += `${index + 1}. ${section.heading} (Level ${section.level})\n`;
            });
        }

        stream.markdown(message);

        return { metadata: { command: 'info-success' } };
    }

    /**
     * Process a question with the current page context
     */
    private async processQuestionWithContext(
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        if (!this.currentContext) {
            throw new Error('No page context available');
        }

        const { processedContent, pageTitle, pageUrl } = this.currentContext;
        const userQuestion = request.prompt;

        // Find the most relevant section for potential citation
        const relevantSection = this.contentProcessor.findRelevantSection(
            processedContent.sections,
            userQuestion
        );

        // Construct the context-enhanced prompt
        const contextPrompt = this.buildContextPrompt(processedContent, userQuestion, pageTitle, pageUrl);

        try {
            stream.progress('Analyzing page content...');

            // Send the request to the LLM
            const chatRequest: vscode.LanguageModelChatMessage[] = [
                vscode.LanguageModelChatMessage.User(contextPrompt)
            ];

            const [model] = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4'
            });

            if (!model) {
                throw new Error('No suitable language model available');
            }

            const response = await model.sendRequest(chatRequest, {}, token);

            // Stream the response
            for await (const fragment of response.text) {
                stream.markdown(fragment);
                
                if (token.isCancellationRequested) {
                    break;
                }
            }

            // Add citation if we found a relevant section
            if (relevantSection) {
                const citation = this.contentProcessor.generateCitation(relevantSection, pageTitle);
                stream.markdown(`\n\n---\n*${citation}*`);
            }

            return { 
                metadata: { 
                    command: 'question-answered',
                    pageTitle,
                    hasRelevantSection: !!relevantSection
                } 
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to process question';
            throw new Error(`Failed to get response from language model: ${errorMessage}`);
        }
    }

    /**
     * Build the context-enhanced prompt for the LLM
     */
    private buildContextPrompt(
        processedContent: ProcessedContent,
        userQuestion: string,
        pageTitle: string,
        pageUrl: string
    ): string {
        const { markdown, metadata } = processedContent;

        let prompt = `You are an AI assistant helping to answer questions about a Confluence page. `;
        prompt += `Please provide accurate, helpful answers based on the page content provided below.\n\n`;
        
        prompt += `**Page Information:**\n`;
        prompt += `- Title: ${pageTitle}\n`;
        prompt += `- URL: ${pageUrl}\n`;
        prompt += `- Last Modified: ${metadata.lastModified}\n`;
        prompt += `- Word Count: ${metadata.wordCount}\n\n`;
        
        prompt += `**Page Content:**\n`;
        prompt += `${markdown}\n\n`;
        
        prompt += `**User Question:**\n`;
        prompt += `${userQuestion}\n\n`;
        
        prompt += `**Instructions:**\n`;
        prompt += `- Answer the question based on the provided page content\n`;
        prompt += `- If the answer is not in the content, clearly state that\n`;
        prompt += `- Be specific and reference relevant sections when possible\n`;
        prompt += `- Use markdown formatting for better readability\n`;
        prompt += `- If you reference specific information, try to mention which section it came from\n`;

        return prompt;
    }

    /**
     * Provide follow-up suggestions
     */
    private async provideFollowups(
        result: vscode.ChatResult,
        context: vscode.ChatContext,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatFollowup[]> {
        const followups: vscode.ChatFollowup[] = [];

        if (!this.currentContext) {
            followups.push({
                prompt: '/load ',
                label: '📄 Load a Confluence page',
                command: 'load'
            });
        } else {
            followups.push(
                {
                    prompt: '/info',
                    label: '📊 Show page information',
                    command: 'info'
                },
                {
                    prompt: '/refresh',
                    label: '🔄 Refresh page content',
                    command: 'refresh'
                },
                {
                    prompt: '/clear',
                    label: '🗑️ Clear current page',
                    command: 'clear'
                }
            );

            // Add section-specific followups if we have sections
            if (this.currentContext.processedContent.sections.length > 0) {
                const topSections = this.currentContext.processedContent.sections.slice(0, 3);
                topSections.forEach(section => {
                    followups.push({
                        prompt: `Tell me more about the "${section.heading}" section`,
                        label: `📖 About: ${section.heading}`,
                        command: undefined
                    });
                });
            }
        }

        return followups;
    }

    /**
     * Load a page from external command
     */
    public async loadPageFromUrl(url: string): Promise<void> {
        try {
            const pageContent = await this.confluenceService.fetchPageByUrl(url);
            const processedContent = this.contentProcessor.processContent(
                pageContent.content,
                pageContent.title,
                url,
                pageContent.lastModified
            );

            const { content: finalContent } = this.contentProcessor.truncateContent(
                processedContent.markdown,
                ConfluenceChatParticipant.MAX_CONTEXT_LENGTH
            );

            this.currentContext = {
                pageUrl: url,
                pageTitle: pageContent.title,
                processedContent: {
                    ...processedContent,
                    markdown: finalContent
                },
                loadedAt: new Date()
            };

            this.onContextChanged();

        } catch (error) {
            throw error;
        }
    }

    /**
     * Refresh the current page context
     */
    public async refreshContext(): Promise<void> {
        if (!this.currentContext) {
            throw new Error('No page context to refresh');
        }

        await this.loadPageFromUrl(this.currentContext.pageUrl);
    }

    /**
     * Clear the current page context
     */
    public clearContext(): void {
        this.currentContext = null;
        this.onContextChanged();
    }

    /**
     * Get the current context information
     */
    public getCurrentContext(): ConfluenceChatContext | null {
        return this.currentContext;
    }

    /**
     * Event handler for context changes (to be overridden)
     */
    private onContextChanged(): void {
        // This will be connected to the status bar manager
        // For now, we'll emit a VS Code event
        vscode.commands.executeCommand('confluence.contextChanged', this.currentContext);
    }

    /**
     * Dispose of the chat participant
     */
    public dispose(): void {
        this.participant.dispose();
    }
}