// Core logging system exports
export type { LogLevel, LogEntry, LogContext, LoggerConfig, LogTransport } from './types.js';
export { Logger, LogTimer, createTimer, logPerformance } from './logger.js';
export {
  ConsoleTransport,
  MemoryTransport,
  PrometheusTransport,
  NullTransport,
  BatchedRemoteTransport
} from './transports.js';
export {
  createLoggerConfig,
  getLogSamplingRate,
  shouldSampleLog,
  getHealthCheckConfig,
  getPrivacyConfig,
  sanitizeMetadata,
  hashUserId,
  validateLoggerEnvironment
} from './config.js';

import { Logger, createTimer } from './logger.js';
import { createLoggerConfig, shouldSampleLog, sanitizeMetadata, hashUserId, validateLoggerEnvironment } from './config.js';

/**
 * Global logger instance configured for the current environment
 */
export const logger = new Logger(createLoggerConfig());

/**
 * Create a logger for a specific service
 */
export function createServiceLogger(service: string, operation?: string): Logger {
  const context: any = { service };
  if (operation) {
    context.operation = operation;
  }

  return logger.withContext(context);
}

/**
 * Enhanced logging utility with privacy controls and sampling
 */
export class HealthcareLogger extends Logger {
  private samplingEnabled: boolean;

  constructor(config: any, samplingEnabled = false) {
    super(config);
    this.samplingEnabled = samplingEnabled;
  }

  /**
   * Override standard methods with healthcare-specific privacy controls
   */
  info(message: string, metadata?: any): void {
    if (this.samplingEnabled && !shouldSampleLog()) {
      return; // Skip this log due to sampling
    }

    const sanitizedMetadata = metadata ? sanitizeMetadata(metadata) : undefined;
    super.info(message, sanitizedMetadata);
  }

  warn(message: string, metadata?: any): void {
    const sanitizedMetadata = metadata ? sanitizeMetadata(metadata) : undefined;
    super.warn(message, sanitizedMetadata);
  }

  error(message: string, error?: Error, metadata?: any): void {
    const sanitizedMetadata = metadata ? sanitizeMetadata(metadata) : undefined;
    super.error(message, error, sanitizedMetadata);
  }

  /**
   * Override userId context with hashing
   */
  withUserId(userId: string): Logger {
    const hashedUserId = hashUserId(userId);
    return super.withUserId(hashedUserId);
  }

  /**
   * Log user actions with privacy controls
   */
  logUserAction(action: string, userId: string, metadata?: any): void {
    this.withUserId(userId).info(`User action: ${action}`, {
      ...metadata,
      action,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log MS-specific events with medical context
   */
  logMedicalEvent(eventType: string, userId: string, metadata?: any): void {
    // Never log sensitive medical details in production
    const safeMetadata = {
      eventType,
      timestamp: new Date().toISOString(),
      // Only include non-sensitive metadata
      severity: metadata?.severity,
      duration: metadata?.duration,
      hasLocation: !!metadata?.locations,
      locationCount: metadata?.locations?.length || 0
    };

    this.withUserId(userId)
      .withContext({ eventType })
      .info(`Medical event logged: ${eventType}`, safeMetadata);
  }
}

/**
 * Healthcare-specific logger instance
 */
export const healthcareLogger = new HealthcareLogger(
  createLoggerConfig(),
  true // Enable sampling for high-volume health events
);

/**
 * Convenience functions for common logging patterns
 */
export const log = {
  // Service-specific loggers
  event: createServiceLogger('eventService'),
  auth: createServiceLogger('authService'),
  queue: createServiceLogger('offlineQueue'),
  admin: createServiceLogger('adminService'),
  ui: createServiceLogger('uiComponent'),

  // Quick access methods
  debug: (message: string, metadata?: any) => logger.debug(message, metadata),
  info: (message: string, metadata?: any) => logger.info(message, metadata),
  warn: (message: string, metadata?: any) => logger.warn(message, metadata),
  error: (message: string, error?: Error, metadata?: any) => logger.error(message, error, metadata),

  // Performance timing
  time: (operation: string, metadata?: any) => createTimer(logger, operation, metadata),

  // User action logging with privacy
  userAction: (action: string, userId: string, metadata?: any) =>
    healthcareLogger.logUserAction(action, userId, metadata),

  // Medical event logging with privacy
  medicalEvent: (eventType: string, userId: string, metadata?: any) =>
    healthcareLogger.logMedicalEvent(eventType, userId, metadata)
};

/**
 * Initialize logging system and validate configuration
 */
export function initializeLogging(): { success: boolean; errors?: string[] } {
  try {
    const validation = validateLoggerEnvironment();
    if (!validation.valid) {
      console.error('Logger configuration validation failed:', validation.errors);
      return { success: false, errors: validation.errors };
    }

    // Log successful initialization
    logger.info('Logging system initialized', {
      environment: import.meta.env.MODE,
      level: createLoggerConfig().level,
      transports: createLoggerConfig().transports.length
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to initialize logging system:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown initialization error']
    };
  }
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.flush().catch(console.error);
  });
}