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
        if (request.command === 'load') {
            return this.handleLoadCommand(request.prompt, stream, token);
        } else if (request.command === 'info') {
            return this.handleInfoCommand(stream);
        } else if (request.command === 'refresh') {
            return await this.handleRefreshCommand(stream);
        } else if (request.command === 'clear') {
            return await this.handleClearCommand(stream);
        } else if (request.command === 'set_pat') {
            return this.handleSetPatCommand(request.prompt, stream, token);
        } else if (request.command === 'clear_pat') {
            return this.handleClearPatCommand(request.prompt, stream, token);
        } else if (request.command === 'check_auth') {
            return this.handleCheckAuthCommand(request.prompt, stream, token);
        } else if (request.command === 'gen_pat_url') {
            return this.handleGeneratePatUrlCommand(request.prompt, stream);
        } else {
            return this.processQuestionWithContext(request, stream, token);
        }
    }

    private async handleLoadCommand(
        url: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        if (!url) {
            stream.markdown('Please provide a Confluence URL to load. Usage: `/load <url>`');
            return { metadata: { command: 'load-no-url' } };
        }

        try {
            stream.progress('Loading Confluence page...');
            await this.loadPageFromUrl(url);

            if (this.currentContext) {
                const { pageTitle, processedContent } = this.currentContext;
                const { metadata, sections } = processedContent;
                const truncated = processedContent.markdown.length < metadata.wordCount; // A simple check

                let message = `✅ Successfully loaded and processed page: **${pageTitle}**\n\n`;
                message += `Word Count: ${metadata.wordCount}, Sections: ${sections.length}\n`;
                if (truncated) {
                    message += `*Note: The content has been truncated to fit within the context window.*\n`;
                }

                stream.markdown(message);
                return { metadata: { command: 'load-success' } };
            }
            return { metadata: { command: 'load-fail' } }; // Should not happen
        } catch (error) {
            return this.handleError(error, stream, 'load');
        }
    }

    /**
     * Handle the /refresh command
     */
    private async handleRefreshCommand(stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
        if (!this.currentContext) {
            stream.markdown('No page is currently loaded. Use `/load <url>` to load a page first.');
            return { metadata: { command: 'refresh-no-context' } };
        }

        try {
            stream.progress('Refreshing page content...');
            await this.refreshContext();
            stream.markdown(`🔄 Successfully refreshed page: **${this.currentContext.pageTitle}**`);
            return { metadata: { command: 'refresh-success' } };
        } catch (error) {
            return this.handleError(error, stream, 'refresh');
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
     * Process a user's question with the current page context
     */
    private async processQuestionWithContext(
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        if (!this.currentContext) {
            stream.markdown('No Confluence page is currently loaded. Use `/load <url>` to load a page first, or use the "Confluence: Chat with Page" command.');
            return { metadata: { command: 'no-context' } };
        }

        try {
            const { processedContent, pageTitle, pageUrl } = this.currentContext;
            const userQuestion = request.prompt;

            // Find the most relevant section for potential citation
            const relevantSection = this.contentProcessor.findRelevantSection(
                processedContent.sections,
                userQuestion
            );

            // Construct the context-enhanced prompt
            const contextPrompt = this.buildContextPrompt(processedContent, userQuestion, pageTitle, pageUrl);

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
            return this.handleError(error, stream, 'question');
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
            const pageContent = await this.confluenceService.fetchPageByUrl(url, true);
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

    private async handleSetPatCommand(
        args: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        const [baseUrl, pat] = args.split(' ').filter(Boolean);

        if (!baseUrl || !pat) {
            stream.markdown('Usage: `/set_pat <base_url> <personal_access_token>`');
            return { metadata: { command: 'set_pat-invalid-args' } };
        }

        try {
            stream.progress('Validating and storing new Personal Access Token...');
            await this.confluenceService.setPat(baseUrl, pat);
            const authInfo = await this.confluenceService.validateAuth(baseUrl);

            if (authInfo.isValid) {
                stream.markdown(`Successfully set and validated Personal Access Token for ${baseUrl}.`);
                return { metadata: { command: 'set_pat-success' } };
            } else {
                stream.markdown(`Failed to validate the new Personal Access Token for ${baseUrl}. Please check the token and URL. Error: ${authInfo.error?.message}`)
                return { metadata: { command: 'set_pat-validation-failed' } };
            }
        } catch (error: any) {
            return this.handleError(error, stream, 'set_pat');
        }
    }

    private async handleClearPatCommand(
        baseUrl: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        if (!baseUrl) {
            stream.markdown('Usage: `/clear_pat <base_url>`');
            return { metadata: { command: 'clear_pat-no-url' } };
        }

        try {
            await this.confluenceService.clearPat(baseUrl);
            stream.markdown(`Successfully cleared Personal Access Token for ${baseUrl}.`);
            return { metadata: { command: 'clear_pat-success' } };
        } catch (error: any) {
            stream.markdown(`An error occurred while clearing the PAT: ${error.message}`);
            return { metadata: { command: 'clear_pat-error' } };
        }
    }

    private async handleCheckAuthCommand(
        baseUrl: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        if (!baseUrl) {
            stream.markdown('Usage: `/check_auth <base_url>`');
            return { metadata: { command: 'check_auth-no-url' } };
        }

        try {
            stream.progress(`Checking authentication status for ${baseUrl}...`);
            const authInfo = await this.confluenceService.validateAuth(baseUrl);
            if (authInfo.isValid) {
                stream.markdown(`Authentication for ${baseUrl} is successful.`);
            } else {
                stream.markdown(`Authentication for ${baseUrl} failed: ${authInfo.error?.message}`);
            }
            return { metadata: { command: 'check_auth-result' } };
        } catch (error: any) {
            return this.handleError(error, stream, 'check_auth');
        }
    }

    private async handleGeneratePatUrlCommand(
        baseUrl: string,
        stream: vscode.ChatResponseStream
    ): Promise<vscode.ChatResult> {
        try {
            const patInfo = this.confluenceService.getPatGenerationInfo(baseUrl);
            stream.markdown(`You can generate a Personal Access Token for ${baseUrl || 'your Confluence instance'} here: [${patInfo.displayUrl}](${patInfo.url})`);
            return { metadata: { command: 'gen_pat_url-success' } };
        } catch (error: any) {
            return this.handleError(error, stream, 'gen_pat_url');
        }
    }

    private handleError(error: any, stream: vscode.ChatResponseStream, command: string): vscode.ChatResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stream.markdown(`An error occurred during the \`${command}\` command: ${errorMessage}`);
    return { metadata: { command: `${command}-error` } };
}
}