import type { LogLevel, LogEntry, LogContext, LoggerConfig, LogTransport } from './types.js';
import { LOG_LEVELS } from './types.js';

/**
 * Performance-optimized Logger with fluent API and contextual logging
 */
export class Logger {
  private level: LogLevel;
  private transports: LogTransport[];
  private context: Partial<LogContext>;
  private isClient: boolean;
  private enableStackTrace: boolean;

  constructor(config: LoggerConfig) {
    this.level = config.level;
    this.transports = config.transports;
    this.context = config.context || {};
    this.enableStackTrace = config.enableStackTrace;
    this.isClient = typeof window !== 'undefined';
  }

  /**
   * Create a new logger with additional context
   */
  withContext(context: Partial<LogContext>): Logger {
    return new Logger({
      level: this.level,
      transports: this.transports,
      enableStackTrace: this.enableStackTrace,
      enableMetrics: false, // Inherit from parent
      context: { ...this.context, ...context }
    });
  }

  /**
   * Create a new logger with user context
   */
  withUserId(userId: string): Logger {
    return this.withContext({ ...this.context, userId });
  }

  /**
   * Create a new logger with request context
   */
  withRequestId(requestId: string): Logger {
    return this.withContext({ ...this.context, requestId });
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string | (() => string), metadata?: any): void {
    if (!this.shouldLog('debug')) return;

    const resolvedMessage = typeof message === 'function' ? message() : message;
    this.log('debug', resolvedMessage, undefined, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: any): void {
    if (!this.shouldLog('info')) return;

    this.log('info', message, undefined, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: any): void {
    if (!this.shouldLog('warn')) return;

    this.log('warn', message, undefined, metadata);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, metadata?: any): void {
    if (!this.shouldLog('error')) return;

    this.log('error', message, error, metadata);
  }

  /**
   * Check if a log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, error?: Error, metadata?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context as LogContext,
      metadata,
      requestId: (this.context as any).requestId,
      userId: (this.context as any).userId,
      sessionId: this.getSessionId()
    };

    // Add error details if provided
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.enableStackTrace ? error.stack : undefined,
        code: (error as any).code,
        cause: (error as any).cause
      };
    }

    // Add runtime context
    if (this.isClient && entry.context) {
      entry.context = {
        ...entry.context,
        userAgent: navigator.userAgent
      };
    }

    // Send to all transports
    this.transports.forEach(transport => {
      try {
        transport.write(entry);
      } catch (transportError) {
        // Don't let transport errors break the application
        console.error('Transport error:', transportError);
      }
    });
  }

  /**
   * Get or generate session ID for tracking
   */
  private getSessionId(): string | undefined {
    if (!this.isClient) return undefined;

    let sessionId = sessionStorage.getItem('ms-tracker-session-id');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('ms-tracker-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Generate a unique ID for requests/sessions
   */
  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older environments
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Flush all transports (useful for shutdown)
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports
        .filter(transport => transport.flush)
        .map(transport => transport.flush!())
    );
  }

  /**
   * Destroy logger and cleanup resources
   */
  async destroy(): Promise<void> {
    await this.flush();
    await Promise.all(
      this.transports
        .filter(transport => transport.destroy)
        .map(transport => transport.destroy!())
    );
  }
}

/**
 * Timer utility for performance logging
 */
export class LogTimer {
  private logger: Logger;
  private operation: string;
  private startTime: number;
  private metadata: any;

  constructor(logger: Logger, operation: string, metadata?: any) {
    this.logger = logger;
    this.operation = operation;
    this.metadata = metadata;
    this.startTime = performance.now();
  }

  /**
   * End timing and log the result
   */
  end(message?: string, additionalMetadata?: any): void {
    const duration = performance.now() - this.startTime;
    const finalMessage = message || `${this.operation} completed`;
    const finalMetadata = {
      ...this.metadata,
      ...additionalMetadata,
      duration: Math.round(duration * 100) / 100 // Round to 2 decimal places
    };

    this.logger.info(finalMessage, finalMetadata);
  }

  /**
   * End timing with error and log the result
   */
  error(message: string, error?: Error, additionalMetadata?: any): void {
    const duration = performance.now() - this.startTime;
    const finalMetadata = {
      ...this.metadata,
      ...additionalMetadata,
      duration: Math.round(duration * 100) / 100
    };

    this.logger.error(message, error, finalMetadata);
  }
}

/**
 * Create a timer for performance logging
 */
export function createTimer(logger: Logger, operation: string, metadata?: any): LogTimer {
  return new LogTimer(logger, operation, metadata);
}

/**
 * Performance logging decorator for async functions
 */
export function logPerformance(logger: Logger, operation: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (this: any, ...args: any[]) {
      const timer = createTimer(logger, operation, { method: propertyName });

      try {
        const result = await method.apply(this, args);
        timer.end(`${operation} succeeded`);
        return result;
      } catch (error) {
        timer.error(`${operation} failed`, error as Error);
        throw error;
      }
    } as T;

    return descriptor;
  };
}