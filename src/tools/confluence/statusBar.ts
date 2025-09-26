import * as vscode from 'vscode';
import { ConfluenceChatContext } from './types';

export class ConfluenceStatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private context: ConfluenceChatContext | null = null;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'confluence.openPage';
        this.hide();
    }

    /**
     * Update the status bar with current Confluence page context
     */
    public updateContext(context: ConfluenceChatContext | null): void {
        this.context = context;
        
        if (context) {
            this.statusBarItem.text = `$(book) ${context.pageTitle}`;
            this.statusBarItem.tooltip = new vscode.MarkdownString(
                `**Confluence Page Loaded**\n\n` +
                `**Title:** ${context.pageTitle}\n\n` +
                `**URL:** [${context.pageUrl}](${context.pageUrl})\n\n` +
                `**Loaded:** ${context.loadedAt.toLocaleString()}\n\n` +
                `**Content:** ${context.processedContent.metadata.wordCount} words\n\n` +
                `---\n\n` +
                `**Left-click:** Open page in browser\n\n` +
                `**Right-click:** Show context menu`
            );
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Show the status bar item
     */
    private show(): void {
        this.statusBarItem.show();
    }

    /**
     * Hide the status bar item
     */
    private hide(): void {
        this.statusBarItem.hide();
    }

    /**
     * Get the current context
     */
    public getContext(): ConfluenceChatContext | null {
        return this.context;
    }

    /**
     * Handle status bar item click - open page in browser
     */
    public async handleClick(): Promise<void> {
        if (this.context) {
            await vscode.env.openExternal(vscode.Uri.parse(this.context.pageUrl));
        }
    }

    /**
     * Show context menu for right-click
     */
    public async showContextMenu(): Promise<void> {
        if (!this.context) {
            return;
        }

        const items = [
            {
                label: '$(refresh) Refresh Context',
                description: 'Re-fetch the current page content',
                action: 'refresh'
            },
            {
                label: '$(clear-all) Clear Context',
                description: 'Clear the current page context',
                action: 'clear'
            },
            {
                label: '$(link-external) Open in Browser',
                description: 'Open the page in your default browser',
                action: 'open'
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Choose an action for the current Confluence page'
        });

        if (selected) {
            switch (selected.action) {
                case 'refresh':
                    await vscode.commands.executeCommand('confluence.refreshContext');
                    break;
                case 'clear':
                    await vscode.commands.executeCommand('confluence.clearContext');
                    break;
                case 'open':
                    await this.handleClick();
                    break;
            }
        }
    }

    /**
     * Dispose of the status bar item
     */
    public dispose(): void {
        this.statusBarItem.dispose();
    }
}