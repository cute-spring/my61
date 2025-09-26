import * as vscode from 'vscode';
import { ConfluenceService } from './confluenceService';
import { ConfluenceChatParticipant } from './chatParticipant';

export class ConfluenceCommands {
    private confluenceService: ConfluenceService;
    private chatParticipant: ConfluenceChatParticipant;

    constructor(confluenceService: ConfluenceService, chatParticipant: ConfluenceChatParticipant) {
        this.confluenceService = confluenceService;
        this.chatParticipant = chatParticipant;
    }

    /**
     * Register all Confluence commands
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            vscode.commands.registerCommand('confluence.chatWithPage', this.chatWithPage.bind(this)),
            vscode.commands.registerCommand('confluence.chatWithSelectedURL', this.chatWithSelectedURL.bind(this)),
            vscode.commands.registerCommand('confluence.setPat', this.setPat.bind(this)),
            vscode.commands.registerCommand('confluence.refreshContext', this.refreshContext.bind(this)),
            vscode.commands.registerCommand('confluence.clearContext', this.clearContext.bind(this)),
            vscode.commands.registerCommand('confluence.showSettings', this.showSettings.bind(this)),
            vscode.commands.registerCommand('confluence.testConnection', this.testConnection.bind(this)),
            vscode.commands.registerCommand('confluence.contextChanged', this.onContextChanged.bind(this))
        ];

        commands.forEach(command => context.subscriptions.push(command));
    }

    /**
     * Command: Chat with Confluence Page
     * Prompts user for a URL and loads it into the chat context
     */
    private async chatWithPage(): Promise<void> {
        try {
            // Check if configuration is set up
            const config = this.confluenceService.getConfig();
            if (!config.baseUrl) {
                const result = await vscode.window.showErrorMessage(
                    'Confluence base URL is not configured. Would you like to configure it now?',
                    'Configure', 'Cancel'
                );
                
                if (result === 'Configure') {
                    await this.showSettings();
                }
                return;
            }

            // Check if PAT is configured
            const authInfo = await this.confluenceService.validateAuth();
            if (!authInfo.isValid) {
                const result = await vscode.window.showErrorMessage(
                    'Confluence Personal Access Token is not configured or invalid. Would you like to set it up now?',
                    'Set PAT', 'Cancel'
                );
                
                if (result === 'Set PAT') {
                    await this.setPat();
                    return;
                }
                return;
            }

            // Prompt for URL
            const url = await vscode.window.showInputBox({
                prompt: 'Enter the Confluence page URL',
                placeHolder: 'https://your-confluence.com/pages/123456',
                validateInput: (value) => {
                    if (!value) {
                        return 'URL is required';
                    }
                    if (!this.confluenceService.isValidConfluenceUrl(value)) {
                        return 'Please enter a valid Confluence page URL';
                    }
                    return null;
                }
            });

            if (!url) {
                return;
            }

            // Load the page and show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Loading Confluence page...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 30, message: 'Fetching page content...' });
                
                try {
                    await this.chatParticipant.loadPageFromUrl(url);
                    progress.report({ increment: 70, message: 'Processing content...' });
                    
                    // Show success message and open chat
                    const context = this.chatParticipant.getCurrentContext();
                    if (context) {
                        vscode.window.showInformationMessage(
                            `Successfully loaded: ${context.pageTitle}. You can now chat with this page content using @confluence in the Chat view.`
                        );
                        
                        // Open the chat view
                        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    vscode.window.showErrorMessage(`Failed to load Confluence page: ${errorMessage}`);
                }
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Error: ${errorMessage}`);
        }
    }

    /**
     * Command: Chat with Selected URL
     * Uses the currently selected text as a URL to load into chat context
     */
    private async chatWithSelectedURL(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection).trim();

        if (!selectedText) {
            vscode.window.showErrorMessage('No text selected');
            return;
        }

        if (!this.confluenceService.isValidConfluenceUrl(selectedText)) {
            vscode.window.showErrorMessage('Selected text is not a valid Confluence URL');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Loading selected Confluence page...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 30, message: 'Fetching page content...' });
                
                await this.chatParticipant.loadPageFromUrl(selectedText);
                progress.report({ increment: 70, message: 'Processing content...' });
                
                const context = this.chatParticipant.getCurrentContext();
                if (context) {
                    vscode.window.showInformationMessage(
                        `Successfully loaded: ${context.pageTitle}. You can now chat with this page content using @confluence.`
                    );
                    
                    // Open the chat view
                    await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                }
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to load Confluence page: ${errorMessage}`);
        }
    }

    /**
     * Command: Set Personal Access Token
     * Prompts user to enter their Confluence PAT
     */
    private async setPat(): Promise<void> {
        try {
            const config = this.confluenceService.getConfig();
            if (!config.baseUrl) {
                vscode.window.showErrorMessage('Please configure the Confluence base URL first in settings.');
                return;
            }

            // Get PAT generation info
            const patInfo = this.confluenceService.getPatGenerationInfo();
            
            // Show information about where to get PAT
            const result = await vscode.window.showInformationMessage(
                `To use Confluence integration, you need a Personal Access Token. ${patInfo.isCloud ? 'For Atlassian Cloud, you need an API token.' : 'For Confluence Server/Data Center, you need a Personal Access Token.'}`,
                'Open PAT Page', 'I have a token', 'Cancel'
            );

            if (result === 'Cancel') {
                return;
            }

            if (result === 'Open PAT Page') {
                await vscode.env.openExternal(vscode.Uri.parse(patInfo.url));
                
                // Ask again after opening the page
                const followUp = await vscode.window.showInformationMessage(
                    'After creating your token, click "Enter Token" to continue.',
                    'Enter Token', 'Cancel'
                );
                
                if (followUp !== 'Enter Token') {
                    return;
                }
            }

            // Prompt for PAT
            const pat = await vscode.window.showInputBox({
                prompt: `Enter your Confluence ${patInfo.isCloud ? 'API Token' : 'Personal Access Token'}`,
                placeHolder: 'Your PAT token...',
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Token is required';
                    }
                    if (value.trim().length < 10) {
                        return 'Token seems too short. Please check and try again.';
                    }
                    return null;
                }
            });

            if (!pat) {
                return;
            }

            // Store the PAT
            await this.confluenceService.setPat(pat.trim());

            // Test the connection
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Testing Confluence connection...',
                cancellable: false
            }, async () => {
                const isValid = await this.confluenceService.testConnection();
                
                if (isValid) {
                    vscode.window.showInformationMessage('✅ Confluence Personal Access Token configured successfully!');
                } else {
                    vscode.window.showErrorMessage('❌ Failed to authenticate with Confluence. Please check your token and try again.');
                }
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Error setting PAT: ${errorMessage}`);
        }
    }

    /**
     * Command: Refresh Context
     * Refreshes the currently loaded page content
     */
    private async refreshContext(): Promise<void> {
        const context = this.chatParticipant.getCurrentContext();
        if (!context) {
            vscode.window.showInformationMessage('No Confluence page is currently loaded.');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Refreshing ${context.pageTitle}...`,
                cancellable: false
            }, async () => {
                await this.chatParticipant.refreshContext();
                vscode.window.showInformationMessage(`✅ Successfully refreshed: ${context.pageTitle}`);
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to refresh page: ${errorMessage}`);
        }
    }

    /**
     * Command: Clear Context
     * Clears the currently loaded page context
     */
    private async clearContext(): Promise<void> {
        const context = this.chatParticipant.getCurrentContext();
        if (!context) {
            vscode.window.showInformationMessage('No Confluence page context to clear.');
            return;
        }

        const result = await vscode.window.showWarningMessage(
            `Clear context for "${context.pageTitle}"?`,
            'Clear', 'Cancel'
        );

        if (result === 'Clear') {
            this.chatParticipant.clearContext();
            vscode.window.showInformationMessage(`Cleared context for: ${context.pageTitle}`);
        }
    }

    /**
     * Command: Show Settings
     * Opens the VS Code settings focused on Confluence configuration
     */
    private async showSettings(): Promise<void> {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'confluence');
    }

    /**
     * Command: Test Connection
     * Tests the current Confluence configuration and authentication
     */
    private async testConnection(): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Testing Confluence connection...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 30, message: 'Checking configuration...' });
                
                const config = this.confluenceService.getConfig();
                if (!config.baseUrl) {
                    throw new Error('Confluence base URL is not configured');
                }

                progress.report({ increment: 30, message: 'Validating authentication...' });
                
                const authInfo = await this.confluenceService.validateAuth();
                
                progress.report({ increment: 40, message: 'Testing API access...' });
                
                if (authInfo.isValid) {
                    vscode.window.showInformationMessage(
                        `✅ Connection successful!\n\nBase URL: ${config.baseUrl}\nAuthentication: Valid`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `❌ Connection failed!\n\nBase URL: ${config.baseUrl}\nAuthentication: Invalid or missing PAT`
                    );
                }
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Connection test failed: ${errorMessage}`);
        }
    }

    /**
     * Internal command handler for context changes
     * This is called when the chat participant context changes
     */
    private onContextChanged(context: any): void {
        // This will be used by the status bar to update its display
        // The status bar manager will listen for this command
    }

    /**
     * Check if the selected text is a valid Confluence URL (for context menu)
     */
    public static isValidConfluenceUrlSelection(): boolean {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection).trim();

        if (!selectedText) {
            return false;
        }

        // Basic URL validation - more thorough validation happens in the service
        try {
            const url = new URL(selectedText);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Show welcome message for first-time users
     */
    public async showWelcomeMessage(): Promise<void> {
        const config = this.confluenceService.getConfig();
        
        if (!config.baseUrl) {
            const result = await vscode.window.showInformationMessage(
                '🎉 Welcome to Confluence Page Chat! To get started, you need to configure your Confluence settings.',
                'Configure Now', 'Later'
            );

            if (result === 'Configure Now') {
                await this.showSettings();
            }
        } else {
            // Check if PAT is configured
            const authInfo = await this.confluenceService.validateAuth();
            if (!authInfo.isValid) {
                const result = await vscode.window.showInformationMessage(
                    '🔐 Confluence is configured, but you need to set up your Personal Access Token to start chatting with pages.',
                    'Set PAT', 'Later'
                );

                if (result === 'Set PAT') {
                    await this.setPat();
                }
            }
        }
    }
}