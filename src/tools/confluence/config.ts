import * as vscode from 'vscode';
import { ConfluenceConfig, ConfluenceInstance } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class ConfluenceConfigManager {
    private static readonly CONFIG_FILE_NAME = 'confluence-instances.json';

    private static getConfigFilePath(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder is open.');
        }
        return path.join(workspaceFolders[0].uri.fsPath, '.vscode', this.CONFIG_FILE_NAME);
    }

    public static getConfig(): ConfluenceConfig {
        const configPath = this.getConfigFilePath();
        if (!fs.existsSync(configPath)) {
            return { instances: [] };
        }
        const rawData = fs.readFileSync(configPath, 'utf-8');
        const instances = JSON.parse(rawData) as ConfluenceInstance[];
        return { instances };
    }

    public static async setConfig(config: ConfluenceConfig): Promise<void> {
        const configPath = this.getConfigFilePath();
        const data = JSON.stringify(config.instances, null, 4);
        fs.writeFileSync(configPath, data, 'utf-8');
    }

    public static async addInstance(instance: ConfluenceInstance): Promise<void> {
        const config = this.getConfig();
        config.instances.push(instance);
        await this.setConfig(config);
    }

    public static async updateInstance(name: string, updatedInstance: ConfluenceInstance): Promise<void> {
        const config = this.getConfig();
        const index = config.instances.findIndex(inst => inst.name === name);
        if (index !== -1) {
            config.instances[index] = updatedInstance;
            await this.setConfig(config);
        }
    }

    public static async removeInstance(name: string): Promise<void> {
        const config = this.getConfig();
        config.instances = config.instances.filter(inst => inst.name !== name);
        await this.setConfig(config);
    }

    public static validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const config = this.getConfig();

        if (!config.instances || config.instances.length === 0) {
            errors.push('No Confluence instances configured.');
            return { isValid: false, errors };
        }

        for (const instance of config.instances) {
            if (!instance.name) {
                errors.push('Instance name is required.');
            }
            if (!instance.baseUrl) {
                errors.push(`Base URL is required for instance: ${instance.name}`);
            } else {
                try {
                    new URL(instance.baseUrl);
                } catch {
                    errors.push(`Invalid base URL for instance: ${instance.name}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    public static async showConfigurationQuickPick(): Promise<void> {
        const items = [
            {
                label: '$(add) Add New Instance',
                description: 'Add a new Confluence instance',
                action: 'addInstance'
            },
            {
                label: '$(gear) Manage Instances',
                description: 'Edit or remove existing instances',
                action: 'manageInstances'
            },
            {
                label: '$(check) Test Connections',
                description: 'Test all configured Confluence connections',
                action: 'testConnections'
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Choose a configuration option'
        });

        if (selected) {
            switch (selected.action) {
                case 'addInstance':
                    await this.promptForNewInstance();
                    break;
                case 'manageInstances':
                    await this.manageInstances();
                    break;
                case 'testConnections':
                    await vscode.commands.executeCommand('confluence.testConnection');
                    break;
            }
        }
    }

    private static async promptForNewInstance(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for the new instance',
            placeHolder: 'e.g., Personal Confluence'
        });
        if (!name) return;

        const baseUrl = await vscode.window.showInputBox({
            prompt: 'Enter the base URL for the new instance',
            placeHolder: 'https://your-company.atlassian.net'
        });
        if (!baseUrl) return;

        const patPageUrl = await vscode.window.showInputBox({
            prompt: 'Enter the PAT generation page URL (optional)',
            placeHolder: 'https://your-company.atlassian.net/secure/ViewProfile.jspa?selectedTab=...'
        });

        const newInstance: ConfluenceInstance = { name, baseUrl, patPageUrl };
        await this.addInstance(newInstance);
        vscode.window.showInformationMessage(`Confluence instance '${name}' added successfully!`);
    }

    private static async manageInstances(): Promise<void> {
        const config = this.getConfig();
        const items = config.instances.map(inst => ({
            label: `$(cloud) ${inst.name}`,
            description: inst.baseUrl,
            action: 'editInstance',
            instanceName: inst.name
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select an instance to manage'
        });

        if (selected) {
            await this.editInstance(selected.instanceName);
        }
    }

    private static async editInstance(instanceName: string): Promise<void> {
        const config = this.getConfig();
        const instance = config.instances.find(inst => inst.name === instanceName);
        if (!instance) return;

        const action = await vscode.window.showQuickPick([
            { label: '$(edit) Edit Instance', action: 'edit' },
            { label: '$(trash) Remove Instance', action: 'remove' }
        ], {
            placeHolder: `Manage instance: ${instanceName}`
        });

        if (action?.action === 'edit') {
            const newName = await vscode.window.showInputBox({
                prompt: 'Enter the new name for the instance',
                value: instance.name
            });
            const newBaseUrl = await vscode.window.showInputBox({
                prompt: 'Enter the new base URL for the instance',
                value: instance.baseUrl
            });
            const newPatPageUrl = await vscode.window.showInputBox({
                prompt: 'Enter the new PAT generation page URL (optional)',
                value: instance.patPageUrl
            });

            if (newName && newBaseUrl) {
                const updatedInstance: ConfluenceInstance = {
                    name: newName,
                    baseUrl: newBaseUrl,
                    patPageUrl: newPatPageUrl
                };
                await this.updateInstance(instanceName, updatedInstance);
                vscode.window.showInformationMessage(`Instance '${instanceName}' updated successfully!`);
            }
        } else if (action?.action === 'remove') {
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to remove the '${instanceName}' instance?`,
                'Remove',
                'Cancel'
            );
            if (confirm === 'Remove') {
                await this.removeInstance(instanceName);
                vscode.window.showInformationMessage(`Instance '${instanceName}' removed successfully.`);
            }
        }
    }
}