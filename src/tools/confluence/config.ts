import * as vscode from 'vscode';
import { ConfluenceConfig } from './types';

export class ConfluenceConfigManager {
    private static readonly CONFIG_SECTION = 'confluence';
    
    /**
     * Get the current Confluence configuration
     */
    public static getConfig(): ConfluenceConfig {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const baseUrl = config.get<string>('baseUrl');
        const patPageUrlMappings = config.get<Record<string, string>>('patPageUrlMappings', {});

        if (!baseUrl) {
            throw new Error('Confluence base URL is not configured. Please set confluence.baseUrl in settings.');
        }

        return {
            baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
            patPageUrlMappings
        };
    }

    /**
     * Update the base URL configuration
     */
    public static async setBaseUrl(baseUrl: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update('baseUrl', baseUrl, vscode.ConfigurationTarget.Global);
    }

    /**
     * Add or update a PAT page URL mapping
     */
    public static async addPatPageUrlMapping(domain: string, patPageUrl: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const currentMappings = config.get<Record<string, string>>('patPageUrlMappings', {});
        
        currentMappings[domain] = patPageUrl;
        
        await config.update('patPageUrlMappings', currentMappings, vscode.ConfigurationTarget.Global);
    }

    /**
     * Remove a PAT page URL mapping
     */
    public static async removePatPageUrlMapping(domain: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const currentMappings = config.get<Record<string, string>>('patPageUrlMappings', {});
        
        delete currentMappings[domain];
        
        await config.update('patPageUrlMappings', currentMappings, vscode.ConfigurationTarget.Global);
    }

    /**
     * Get all PAT page URL mappings
     */
    public static getPatPageUrlMappings(): Record<string, string> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<Record<string, string>>('patPageUrlMappings', {});
    }

    /**
     * Validate the current configuration
     */
    public static validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        try {
            const config = this.getConfig();
            
            // Validate base URL
            if (!config.baseUrl) {
                errors.push('Base URL is required');
            } else {
                try {
                    new URL(config.baseUrl);
                } catch {
                    errors.push('Base URL must be a valid URL');
                }
            }
            
            // Validate PAT page URL mappings
            for (const [domain, url] of Object.entries(config.patPageUrlMappings || {})) {
                if (!domain || !url) {
                    errors.push(`Invalid PAT page URL mapping: ${domain} -> ${url}`);
                    continue;
                }
                
                try {
                    new URL(url);
                } catch {
                    errors.push(`Invalid PAT page URL for domain ${domain}: ${url}`);
                }
            }
            
        } catch (error) {
            errors.push(error instanceof Error ? error.message : 'Unknown configuration error');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Reset configuration to defaults
     */
    public static async resetConfig(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update('baseUrl', undefined, vscode.ConfigurationTarget.Global);
        await config.update('patPageUrlMappings', {}, vscode.ConfigurationTarget.Global);
    }

    /**
     * Show configuration quick pick for easy setup
     */
    public static async showConfigurationQuickPick(): Promise<void> {
        const items = [
            {
                label: '$(gear) Set Base URL',
                description: 'Configure your Confluence instance URL',
                action: 'setBaseUrl'
            },
            {
                label: '$(key) Manage PAT Settings',
                description: 'Set up Personal Access Token',
                action: 'managePat'
            },
            {
                label: '$(link) Manage PAT Page URLs',
                description: 'Configure PAT generation page URLs',
                action: 'managePatUrls'
            },
            {
                label: '$(check) Test Connection',
                description: 'Test your Confluence connection',
                action: 'testConnection'
            },
            {
                label: '$(refresh) Reset Configuration',
                description: 'Reset all Confluence settings',
                action: 'reset'
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Choose a configuration option'
        });

        if (selected) {
            switch (selected.action) {
                case 'setBaseUrl':
                    await this.promptForBaseUrl();
                    break;
                case 'managePat':
                    await vscode.commands.executeCommand('confluence.setPat');
                    break;
                case 'managePatUrls':
                    await this.managePatUrls();
                    break;
                case 'testConnection':
                    await vscode.commands.executeCommand('confluence.testConnection');
                    break;
                case 'reset':
                    await this.confirmAndResetConfig();
                    break;
            }
        }
    }

    /**
     * Prompt user for base URL
     */
    private static async promptForBaseUrl(): Promise<void> {
        const baseUrl = await vscode.window.showInputBox({
            prompt: 'Enter your Confluence base URL',
            placeHolder: 'https://your-company.atlassian.net or https://confluence.your-company.com',
            validateInput: (value) => {
                if (!value) {
                    return 'Base URL is required';
                }
                try {
                    new URL(value);
                    return null;
                } catch {
                    return 'Please enter a valid URL';
                }
            }
        });

        if (baseUrl) {
            await this.setBaseUrl(baseUrl);
            vscode.window.showInformationMessage('Confluence base URL updated successfully!');
        }
    }

    /**
     * Manage PAT page URLs
     */
    private static async managePatUrls(): Promise<void> {
        const mappings = this.getPatPageUrlMappings();
        const items: Array<{
            label: string;
            description: string;
            action: string;
            domain?: string;
        }> = [
            {
                label: '$(add) Add New Mapping',
                description: 'Add a new domain -> PAT page URL mapping',
                action: 'add'
            },
            ...Object.entries(mappings).map(([domain, url]) => ({
                label: `$(link) ${domain}`,
                description: url,
                action: 'edit',
                domain
            }))
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Manage PAT page URL mappings'
        });

        if (selected) {
            if (selected.action === 'add') {
                await this.addNewPatUrlMapping();
            } else if (selected.action === 'edit' && selected.domain) {
                await this.editPatUrlMapping(selected.domain);
            }
        }
    }

    /**
     * Add new PAT URL mapping
     */
    private static async addNewPatUrlMapping(): Promise<void> {
        const domain = await vscode.window.showInputBox({
            prompt: 'Enter the domain (e.g., your-company.atlassian.net)',
            placeHolder: 'your-company.atlassian.net'
        });

        if (!domain) return;

        const url = await vscode.window.showInputBox({
            prompt: 'Enter the PAT generation page URL',
            placeHolder: 'https://your-company.atlassian.net/secure/ViewProfile.jspa?selectedTab=com.atlassian.pats.pats-plugin:jira-user-personal-access-tokens'
        });

        if (url) {
            await this.addPatPageUrlMapping(domain, url);
            vscode.window.showInformationMessage(`PAT page URL mapping added for ${domain}`);
        }
    }

    /**
     * Edit existing PAT URL mapping
     */
    private static async editPatUrlMapping(domain: string): Promise<void> {
        const mappings = this.getPatPageUrlMappings();
        const currentUrl = mappings[domain];

        const action = await vscode.window.showQuickPick([
            { label: '$(edit) Edit URL', action: 'edit' },
            { label: '$(trash) Remove Mapping', action: 'remove' }
        ], {
            placeHolder: `Manage mapping for ${domain}`
        });

        if (action?.action === 'edit') {
            const newUrl = await vscode.window.showInputBox({
                prompt: `Edit PAT page URL for ${domain}`,
                value: currentUrl
            });

            if (newUrl) {
                await this.addPatPageUrlMapping(domain, newUrl);
                vscode.window.showInformationMessage(`PAT page URL updated for ${domain}`);
            }
        } else if (action?.action === 'remove') {
            const confirm = await vscode.window.showWarningMessage(
                `Remove PAT page URL mapping for ${domain}?`,
                'Remove',
                'Cancel'
            );

            if (confirm === 'Remove') {
                await this.removePatPageUrlMapping(domain);
                vscode.window.showInformationMessage(`PAT page URL mapping removed for ${domain}`);
            }
        }
    }

    /**
     * Confirm and reset configuration
     */
    private static async confirmAndResetConfig(): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            'This will reset all Confluence configuration settings. Are you sure?',
            'Reset',
            'Cancel'
        );

        if (confirm === 'Reset') {
            await this.resetConfig();
            vscode.window.showInformationMessage('Confluence configuration has been reset.');
        }
    }
}