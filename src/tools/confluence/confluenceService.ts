import * as vscode from 'vscode';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
    ConfluenceConfig, 
    ConfluencePage, 
    ConfluencePageContent, 
    ConfluenceAuthInfo, 
    ConfluenceError,
    PatGenerationInfo 
} from './types';

export class ConfluenceService {
    private static instance: ConfluenceService;
    private axiosInstance: AxiosInstance;
    private context: vscode.ExtensionContext;
    private secretStorage: vscode.SecretStorage;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.secretStorage = context.secrets;
        this.axiosInstance = axios.create({
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
    }

    public static getInstance(context?: vscode.ExtensionContext): ConfluenceService {
        if (!ConfluenceService.instance && context) {
            ConfluenceService.instance = new ConfluenceService(context);
        }
        return ConfluenceService.instance;
    }

    /**
     * Get Confluence configuration from VS Code settings
     */
    public getConfig(): ConfluenceConfig {
        const config = vscode.workspace.getConfiguration('confluence');
        const baseUrl = config.get<string>('baseUrl');
        const patPageUrlMappings = config.get<Record<string, string>>('patPageUrlMappings', {});

        if (!baseUrl) {
            throw this.createError('INVALID_URL', 'Confluence base URL is not configured. Please set confluence.baseUrl in settings.');
        }

        return {
            baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
            patPageUrlMappings
        };
    }

    /**
     * Get stored Personal Access Token
     */
    private async getPat(): Promise<string | undefined> {
        return await this.secretStorage.get('confluence.pat');
    }

    /**
     * Store Personal Access Token securely
     */
    public async setPat(pat: string): Promise<void> {
        await this.secretStorage.store('confluence.pat', pat);
    }

    /**
     * Clear stored Personal Access Token
     */
    public async clearPat(): Promise<void> {
        await this.secretStorage.delete('confluence.pat');
    }

    /**
     * Validate authentication by making a test API call
     */
    public async validateAuth(): Promise<ConfluenceAuthInfo> {
        const config = this.getConfig();
        const pat = await this.getPat();

        if (!pat) {
            return {
                pat: '',
                baseUrl: config.baseUrl,
                isValid: false
            };
        }

        try {
            const response = await this.axiosInstance.get(
                `${config.baseUrl}/rest/api/user/current`,
                {
                    headers: {
                        'Authorization': `Bearer ${pat}`
                    }
                }
            );

            return {
                pat,
                baseUrl: config.baseUrl,
                isValid: response.status === 200
            };
        } catch (error) {
            return {
                pat,
                baseUrl: config.baseUrl,
                isValid: false
            };
        }
    }

    /**
     * Extract page ID from Confluence URL
     */
    public extractPageId(url: string): string | null {
        // Handle different Confluence URL formats
        const patterns = [
            /\/pages\/(\d+)/,                           // /pages/123456
            /\/display\/[^\/]+\/[^\/]+\?pageId=(\d+)/,  // /display/SPACE/Page+Title?pageId=123456
            /pageId=(\d+)/,                             // Any URL with pageId parameter
            /\/spaces\/[^\/]+\/pages\/(\d+)/            // /spaces/SPACE/pages/123456
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Validate if a string is a valid Confluence URL
     */
    public isValidConfluenceUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const config = this.getConfig();
            const baseUrlObj = new URL(config.baseUrl);
            
            // Check if the URL belongs to the configured Confluence instance
            return urlObj.hostname === baseUrlObj.hostname && 
                   (url.includes('/pages/') || url.includes('/display/') || url.includes('pageId='));
        } catch {
            return false;
        }
    }

    /**
     * Fetch page content from Confluence API
     */
    public async fetchPageContent(pageId: string): Promise<ConfluencePage> {
        const config = this.getConfig();
        const pat = await this.getPat();

        if (!pat) {
            throw this.createError('AUTH_FAILED', 'Personal Access Token is not configured. Please run "Confluence: Set PAT" command.');
        }

        try {
            const response = await this.axiosInstance.get<ConfluencePageContent>(
                `${config.baseUrl}/rest/api/content/${pageId}?expand=body.view,version`,
                {
                    headers: {
                        'Authorization': `Bearer ${pat}`
                    }
                }
            );

            const pageData = response.data;
            const pageUrl = `${config.baseUrl}${pageData._links.webui}`;

            return {
                id: pageData.id,
                title: pageData.title,
                url: pageUrl,
                content: pageData.body.view.value,
                lastModified: pageData.version.when,
                version: pageData.version.number
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                switch (axiosError.response?.status) {
                    case 401:
                    case 403:
                        throw this.createError('AUTH_FAILED', 'Authentication failed. Please check your Personal Access Token.');
                    case 404:
                        throw this.createError('PAGE_NOT_FOUND', `Page with ID ${pageId} not found or you don't have permission to access it.`);
                    default:
                        throw this.createError('NETWORK_ERROR', `Network error: ${axiosError.message}`);
                }
            }
            throw this.createError('UNKNOWN', `Failed to fetch page content: ${error}`);
        }
    }

    /**
     * Fetch page content by URL
     */
    public async fetchPageByUrl(url: string): Promise<ConfluencePage> {
        if (!this.isValidConfluenceUrl(url)) {
            throw this.createError('INVALID_URL', 'Invalid Confluence URL format.');
        }

        const pageId = this.extractPageId(url);
        if (!pageId) {
            throw this.createError('INVALID_URL', 'Could not extract page ID from URL.');
        }

        return await this.fetchPageContent(pageId);
    }

    /**
     * Generate PAT page URL based on configuration
     */
    public getPatGenerationInfo(): PatGenerationInfo {
        const config = this.getConfig();
        
        // Check for custom mapping first
        for (const [urlPattern, patUrl] of Object.entries(config.patPageUrlMappings || {})) {
            if (config.baseUrl.includes(urlPattern)) {
                return {
                    url: patUrl,
                    isCloud: config.baseUrl.includes('.atlassian.net'),
                    displayUrl: patUrl
                };
            }
        }

        // Auto-detect based on URL pattern
        const isCloud = config.baseUrl.includes('.atlassian.net');
        let patUrl: string;

        if (isCloud) {
            // Atlassian Cloud PAT URL
            const match = config.baseUrl.match(/https:\/\/([^.]+)\.atlassian\.net/);
            const siteName = match ? match[1] : 'your-site';
            patUrl = `https://id.atlassian.com/manage-profile/security/api-tokens`;
        } else {
            // Server/Data Center PAT URL
            patUrl = `${config.baseUrl}/plugins/personal-access-tokens/access-tokens.action`;
        }

        return {
            url: patUrl,
            isCloud,
            displayUrl: patUrl
        };
    }

    /**
     * Create a standardized Confluence error
     */
    private createError(code: ConfluenceError['code'], message: string, statusCode?: number): ConfluenceError {
        const error = new Error(message) as ConfluenceError;
        error.code = code;
        error.statusCode = statusCode;
        return error;
    }

    /**
     * Test connection to Confluence instance
     */
    public async testConnection(): Promise<boolean> {
        try {
            const authInfo = await this.validateAuth();
            return authInfo.isValid;
        } catch {
            return false;
        }
    }
}