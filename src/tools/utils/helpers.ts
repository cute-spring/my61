/**
 * Utility functions for UML Chat Panel
 */

/**
 * Debounce utility function
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timer: NodeJS.Timeout | undefined;
    return function(this: any, ...args: any[]) {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => fn.apply(this, args), delay);
    } as T;
}

/**
 * Input validation utilities
 */
export class InputValidator {
    static validateRequirement(text: string): { isValid: boolean; error?: string } {
        if (!text || typeof text !== 'string') {
            return { isValid: false, error: 'Requirement text is required' };
        }
        
        if (text.trim().length === 0) {
            return { isValid: false, error: 'Requirement cannot be empty' };
        }
        
        if (text.length > 10000) {
            return { isValid: false, error: 'Requirement text is too long (max 10000 characters)' };
        }
        
        return { isValid: true };
    }

    static validateDiagramType(type: string): boolean {
        const validTypes = ['', 'activity', 'sequence', 'usecase', 'class', 'component'];
        return validTypes.includes(type);
    }

    static validateSessionData(data: any): boolean {
        return data && 
               typeof data.version === 'number' &&
               Array.isArray(data.chatHistory) &&
               typeof data.currentPlantUML === 'string';
    }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
    static formatErrorMessage(error: any): string {
        if (error?.message) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        return 'Unknown error occurred';
    }

    static logError(context: string, error: any): void {
        const message = this.formatErrorMessage(error);
        console.error(`[${context}]`, message, error);
    }
}

/**
 * File handling utilities
 */
export class FileUtils {
    static generateFileName(extension: string, prefix: string = 'uml-diagram'): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${prefix}-${timestamp}.${extension}`;
    }

    static sanitizeFileName(name: string): string {
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }
}

/**
 * HTML utilities for webview
 */
export class HTMLUtils {
    static escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    static formatTimestamp(timestamp: number): string {
        return new Date(timestamp).toLocaleTimeString();
    }

    static generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
