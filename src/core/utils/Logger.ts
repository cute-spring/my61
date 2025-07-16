/**
 * Logger utility for consistent logging across the application
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export interface ILogEntry {
    level: LogLevel;
    message: string;
    timestamp: number;
    context?: string;
    data?: any;
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.INFO;
    private logEntries: ILogEntry[] = [];
    private maxEntries: number = 1000;

    private constructor() {}

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    public getLogLevel(): LogLevel {
        return this.logLevel;
    }

    public debug(message: string, context?: string, data?: any): void {
        this.log(LogLevel.DEBUG, message, context, data);
    }

    public info(message: string, context?: string, data?: any): void {
        this.log(LogLevel.INFO, message, context, data);
    }

    public warn(message: string, context?: string, data?: any): void {
        this.log(LogLevel.WARN, message, context, data);
    }

    public error(message: string, context?: string, data?: any): void {
        this.log(LogLevel.ERROR, message, context, data);
    }

    private log(level: LogLevel, message: string, context?: string, data?: any): void {
        if (level < this.logLevel) {
            return;
        }

        const entry: ILogEntry = {
            level,
            message,
            timestamp: Date.now(),
            context,
            data
        };

        this.logEntries.push(entry);

        // Keep log entries under max limit
        if (this.logEntries.length > this.maxEntries) {
            this.logEntries = this.logEntries.slice(-this.maxEntries);
        }

        // Output to console
        const prefix = context ? `[${context}]` : '';
        const levelName = LogLevel[level];
        
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(`${prefix} ${message}`, data || '');
                break;
            case LogLevel.INFO:
                console.info(`${prefix} ${message}`, data || '');
                break;
            case LogLevel.WARN:
                console.warn(`${prefix} ${message}`, data || '');
                break;
            case LogLevel.ERROR:
                console.error(`${prefix} ${message}`, data || '');
                break;
        }
    }

    public getLogEntries(level?: LogLevel): ILogEntry[] {
        if (level !== undefined) {
            return this.logEntries.filter(entry => entry.level >= level);
        }
        return [...this.logEntries];
    }

    public clearLogs(): void {
        this.logEntries = [];
    }

    public exportLogs(format: 'json' | 'txt'): string {
        switch (format) {
            case 'json':
                return JSON.stringify(this.logEntries, null, 2);
            
            case 'txt':
                return this.logEntries.map(entry => {
                    const timestamp = new Date(entry.timestamp).toISOString();
                    const levelName = LogLevel[entry.level];
                    const context = entry.context ? ` [${entry.context}]` : '';
                    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
                    return `${timestamp} ${levelName}${context}: ${entry.message}${data}`;
                }).join('\n');
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    public getStats(): {
        totalEntries: number;
        entriesByLevel: Record<string, number>;
        oldestEntry: number;
        newestEntry: number;
    } {
        const entriesByLevel: Record<string, number> = {};
        
        this.logEntries.forEach(entry => {
            const levelName = LogLevel[entry.level];
            entriesByLevel[levelName] = (entriesByLevel[levelName] || 0) + 1;
        });

        const timestamps = this.logEntries.map(entry => entry.timestamp);
        const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
        const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

        return {
            totalEntries: this.logEntries.length,
            entriesByLevel,
            oldestEntry,
            newestEntry
        };
    }
} 