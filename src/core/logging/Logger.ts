export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogContext {
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: any; // Allow arbitrary extra properties
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: Error;
  performance?: {
    duration: number;
    memoryUsage?: number;
  };
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private context: LogContext = {};
  private performanceMarks: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  private shouldLog(level: LogLevel): boolean {
    if (level >= this.logLevel) {
      return true;
    }
    return false;
  }

  private formatMessage(level: LogLevel, message: string, context?: Partial<LogContext>): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const mergedContext = { ...this.context, ...context };
    
    let formatted = `[${timestamp}] ${levelName}: ${message}`;
    
    if (Object.keys(mergedContext).length > 0) {
      formatted += ` | Context: ${JSON.stringify(mergedContext)}`;
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, context?: Partial<LogContext>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage);
        if (error) {
          console.error('Error details:', error);
        }
        break;
    }
  }

  debug(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Partial<LogContext>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  fatal(message: string, context?: Partial<LogContext>, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  // Performance monitoring
  startTimer(operation: string): void {
    this.performanceMarks.set(operation, Date.now());
  }

  endTimer(operation: string, context?: Partial<LogContext>): number {
    const startTime = this.performanceMarks.get(operation);
    if (!startTime) {
      this.warn(`Timer for operation '${operation}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.performanceMarks.delete(operation);
    
    this.info(`Operation '${operation}' completed in ${duration}ms`, {
      ...context,
      performance: { duration }
    });

    return duration;
  }

  // Memory usage tracking
  logMemoryUsage(context?: Partial<LogContext>): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.debug('Memory usage', {
        ...context,
        memoryUsage: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external
        }
      });
    }
  }

  // Batch logging for performance
  batchLog(entries: Array<{ level: LogLevel; message: string; context?: Partial<LogContext> }>): void {
    entries.forEach(entry => {
      this.log(entry.level, entry.message, entry.context);
    });
  }
} 