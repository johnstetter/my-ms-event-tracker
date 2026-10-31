// Core logging types and interfaces
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;           // ISO 8601 format
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  error?: ErrorDetails;
}

export interface LogContext {
  service: string;             // 'eventService', 'authStore', 'offlineQueue'
  operation: string;           // 'createEvent', 'processQueue', 'signIn'
  component?: string;          // 'QuickLog', 'EventHistory', 'AdminPanel'
  eventType?: string;          // For MS-specific context
  userAgent?: string;          // Client-side context
  userId?: string;             // User identifier (may be hashed)
  requestId?: string;          // Request correlation ID
  queueItemId?: string;        // Queue item identifier
}

export interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: any;
}

export interface LoggerConfig {
  level: LogLevel;
  transports: LogTransport[];
  enableStackTrace: boolean;
  enableMetrics: boolean;
  maxBufferSize?: number;
  flushInterval?: number;
  context?: Partial<LogContext>;
}

export interface LogTransport {
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  destroy?(): void | Promise<void>;
}

export interface TransportConfig {
  type: 'console' | 'memory' | 'prometheus';
  format?: 'json' | 'pretty';
  endpoint?: string;
  options?: Record<string, any>;
}

// Log level priorities for filtering
export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
} as const;