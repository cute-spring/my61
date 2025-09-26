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
import { SimpleCache } from '../../core/cache/cache';

export class ConfluenceService {
    private static instance: ConfluenceService;
    private axiosInstance: AxiosInstance;
    private context: vscode.ExtensionContext;
    private secretStorage: vscode.SecretStorage;
    private pageCache: SimpleCache<ConfluencePage>;

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
        this.pageCache = new SimpleCache<ConfluencePage>(300); // Cache for 5 minutes
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

        return {
            baseUrl: baseUrl ? baseUrl.replace(/\/$/, '') : '', // Remove trailing slash
            patPageUrlMappings
        };
    }

    /**
     * Get stored Personal Access Token for a given base URL
     */
    private async getPat(baseUrl: string): Promise<string | undefined> {
        if (!baseUrl) return undefined;
        return await this.secretStorage.get(`confluence.pat.${baseUrl}`);
    }

    /**
     * Store Personal Access Token securely for a given base URL
     */
    public async setPat(baseUrl: string, pat: string): Promise<void> {
        if (!baseUrl) {
            throw this.createError('INVALID_URL', 'Cannot set PAT without a valid base URL.');
        }
        await this.secretStorage.store(`confluence.pat.${baseUrl}`, pat);
    }

    /**
     * Clear stored Personal Access Token for a given base URL
     */
    public async clearPat(baseUrl: string): Promise<void> {
        if (!baseUrl) return;
        await this.secretStorage.delete(`confluence.pat.${baseUrl}`);
    }

    /**
     * Validate authentication by making a test API call
     */
    public async validateAuth(baseUrl: string): Promise<ConfluenceAuthInfo> {
        const pat = await this.getPat(baseUrl);

        if (!pat) {
            return {
                pat: '',
                baseUrl: baseUrl,
                isValid: false,
                error: this.createError('AUTH_FAILED', 'Personal Access Token is not configured.')
            };
        }

        try {
            const response = await this.axiosInstance.get(
                `${baseUrl}/rest/api/user/current`,
                {
                    headers: {
                        'Authorization': `Bearer ${pat}`
                    }
                }
            );

            return {
                pat,
                baseUrl: baseUrl,
                isValid: response.status === 200
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                if (axiosError.response) {
                    switch (axiosError.response.status) {
                        case 401:
                        case 403:
                            return {
                                pat,
                                baseUrl: baseUrl,
                                isValid: false,
                                error: this.createError('AUTH_FAILED', 'Authentication failed. Please check your Personal Access Token.', axiosError.response.status)
                            };
                        default:
                            return {
                                pat,
                                baseUrl: baseUrl,
                                isValid: false,
                                error: this.createError('NETWORK_ERROR', `A network error occurred (Status: ${axiosError.response.status}). Please check your Confluence URL and network connection.`, axiosError.response.status)
                            };
                    }
                } else if (axiosError.request) {
                    return {
                        pat,
                        baseUrl: baseUrl,
                        isValid: false,
                        error: this.createError('NETWORK_ERROR', 'A network error occurred. The request was made but no response was received. Please check your Confluence URL and network connection.')
                    };
                }
            }
            return {
                pat,
                baseUrl: baseUrl,
                isValid: false,
                error: this.createError('UNKNOWN', `An unknown error occurred during authentication: ${error}`)
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
    public isValidConfluenceUrl(url: string, baseUrl?: string): boolean {
        try {
            const urlObj = new URL(url);
            const config = this.getConfig();
            const finalBaseUrl = baseUrl || config.baseUrl;

            if (!finalBaseUrl) {
                return false; // Cannot validate without a base URL
            }

            const baseUrlObj = new URL(finalBaseUrl);
            
            // Allow subdomains of the base URL
            return urlObj.hostname.endsWith(baseUrlObj.hostname) && 
                   (url.includes('/pages/') || url.includes('/display/') || url.includes('pageId='));
        } catch {
            return false;
        }
    }

    /**
     * Fetch page content from Confluence API
     */
    public async fetchPageContent(pageId: string, forceRefresh = false): Promise<ConfluencePage> {
        const cacheKey = `page-${pageId}`;
        if (!forceRefresh) {
            const cachedPage = this.pageCache.get(cacheKey);
            if (cachedPage) {
                return cachedPage;
            }
        }

        const baseUrl = this.getBaseUrlForPage(pageId);
        if (!baseUrl) {
            throw this.createError('INVALID_URL', 'Could not determine Confluence base URL for the page.');
        }

        const pat = await this.getPat(baseUrl);

        if (!pat) {
            throw this.createError('AUTH_FAILED', 'Personal Access Token is not configured. Please run "Confluence: Set PAT" command.');
        }

        try {
            const response = await this.axiosInstance.get<ConfluencePageContent>(
                `${baseUrl}/rest/api/content/${pageId}?expand=body.view,version`,
                {
                    headers: {
                        'Authorization': `Bearer ${pat}`
                    }
                }
            );

            const pageData = response.data;
            const pageUrl = `${baseUrl}${pageData._links.webui}`;

            const page: ConfluencePage = {
                id: pageData.id,
                title: pageData.title,
                url: pageUrl,
                content: pageData.body.view.value,
                lastModified: pageData.version.when,
                version: pageData.version.number
            };

            this.pageCache.set(cacheKey, page);
            return page;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                if (axiosError.response) {
                    switch (axiosError.response.status) {
                        case 401:
                        case 403:
                            throw this.createError('AUTH_FAILED', 'Authentication failed. Please check your Personal Access Token and permissions for the page.', axiosError.response.status);
                        case 404:
                            throw this.createError('PAGE_NOT_FOUND', `Page with ID ${pageId} not found. Please check the URL and your permissions.`, axiosError.response.status);
                        default:
                            throw this.createError('NETWORK_ERROR', `A network error occurred (Status: ${axiosError.response.status}). Please check your Confluence URL and network connection.`, axiosError.response.status);
                    }
                } else if (axiosError.request) {
                    throw this.createError('NETWORK_ERROR', 'A network error occurred. The request was made but no response was received. Please check your Confluence URL and network connection.');
                }
            }
            throw this.createError('UNKNOWN', `An unknown error occurred while fetching the page: ${error}`);
        }
    }

    /**
     * Fetch page content by URL
     */
    public async fetchPageByUrl(url: string, forceRefresh = false): Promise<ConfluencePage> {
        const baseUrl = this.getBaseUrlFromUrl(url);
        if (!this.isValidConfluenceUrl(url, baseUrl)) {
            throw this.createError('INVALID_URL', 'Invalid Confluence URL format.');
        }

        const pageId = this.extractPageId(url);
        if (!pageId) {
            throw this.createError('INVALID_URL', 'Could not extract page ID from URL.');
        }

        return await this.fetchPageContent(pageId, forceRefresh);
    }

    /**
     * Generate PAT page URL based on configuration
     */
    public getPatGenerationInfo(baseUrl?: string): PatGenerationInfo {
        const config = this.getConfig();
        const finalBaseUrl = baseUrl || config.baseUrl;

        // Check for custom mapping first
        for (const [urlPattern, patUrl] of Object.entries(config.patPageUrlMappings || {})) {
            if (finalBaseUrl.includes(urlPattern)) {
                return {
                    url: patUrl,
                    isCloud: finalBaseUrl.includes('.atlassian.net'),
                    displayUrl: patUrl
                };
            }
        }

        // Auto-detect based on URL pattern
        const isCloud = finalBaseUrl.includes('.atlassian.net');
        let patUrl: string;

        if (isCloud) {
            // Atlassian Cloud PAT URL
            const match = finalBaseUrl.match(/https:\/\/([^.]+)\.atlassian\.net/);
            const siteName = match ? match[1] : 'your-site';
            patUrl = `https://id.atlassian.com/manage-profile/security/api-tokens`;
        } else {
            // Server/Data Center PAT URL
            patUrl = `${finalBaseUrl}/plugins/personal-access-tokens/access-tokens.action`;
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
    public async testConnection(baseUrl: string): Promise<boolean> {
        try {
            const authInfo = await this.validateAuth(baseUrl);
            return authInfo.isValid;
        } catch {
            return false;
        }
    }

    private getBaseUrlFromUrl(url: string): string {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.hostname}`;
    }

    private getBaseUrlForPage(pageId: string): string | undefined {
        // This is a placeholder. In a real implementation, you would have a way
        // to map a pageId to a baseUrl. This could be a cache, a lookup service,
        // or by finding the page in the context of a known space/instance.
        // For now, we'll use the first configured base URL as a fallback.
        const config = this.getConfig();
        return config.baseUrl;
    }

    public getAllConfiguredBaseUrls(): string[] {
        const config = this.getConfig();
        const urls = new Set<string>();

        if (config.baseUrl) {
            urls.add(config.baseUrl);
        }

        const patMappings = config.patPageUrlMappings || {};
        for (const key in patMappings) {
            if (Object.prototype.hasOwnProperty.call(patMappings, key)) {
                try {
                    const url = new URL(key);
                    urls.add(url.origin);
                } catch (error) {
                    // Ignore invalid URLs in mappings
                }
            }
        }

        return Array.from(urls);
    }
}