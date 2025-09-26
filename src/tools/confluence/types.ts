/**
 * Type definitions for Confluence Page Chat feature
 */

export interface ConfluenceConfig {
    baseUrl: string;
    patPageUrlMappings?: Record<string, string>;
}

export interface ConfluencePage {
    id: string;
    title: string;
    url: string;
    content: string;
    lastModified: string;
    version: number;
}

export interface ConfluencePageContent {
    id: string;
    title: string;
    body: {
        view: {
            value: string;
            representation: string;
        };
    };
    version: {
        number: number;
        when: string;
    };
    _links: {
        webui: string;
        base: string;
    };
}

export interface ProcessedContent {
    markdown: string;
    sections: ContentSection[];
    metadata: {
        title: string;
        url: string;
        lastModified: string;
        wordCount: number;
    };
}

export interface ContentSection {
    heading: string;
    content: string;
    level: number;
    startIndex: number;
    endIndex: number;
}

export interface ConfluenceAuthInfo {
    pat: string;
    baseUrl: string;
    isValid: boolean;
}

/**
 * Confluence chat context containing the loaded page information
 */
export interface ConfluenceChatContext {
    pageUrl: string;
    pageTitle: string;
    processedContent: ProcessedContent;
    loadedAt: Date;
}

export interface ConfluenceError extends Error {
    code: 'INVALID_URL' | 'AUTH_FAILED' | 'PAGE_NOT_FOUND' | 'NETWORK_ERROR' | 'CONTENT_TOO_LARGE' | 'UNKNOWN';
    statusCode?: number;
    details?: string;
}

export interface PatGenerationInfo {
    url: string;
    isCloud: boolean;
    displayUrl: string;
}