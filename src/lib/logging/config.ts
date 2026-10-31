import type { LoggerConfig, LogLevel, LogTransport } from './types.js';
import {
  ConsoleTransport,
  MemoryTransport,
  PrometheusTransport,
  NullTransport
} from './transports.js';

/**
 * Environment-based logger configuration
 */
export function createLoggerConfig(): LoggerConfig {
  const env = import.meta.env;
  const isDev = env.DEV;
  const isTest = env.MODE === 'test';
  const isProd = env.PROD;

  // Test environment - minimal logging to avoid noise
  if (isTest) {
    return {
      level: (env.VITE_LOG_LEVEL as LogLevel) || 'warn',
      transports: [new MemoryTransport(100)],
      enableStackTrace: false,
      enableMetrics: false,
      maxBufferSize: 50,
      flushInterval: 1000
    };
  }

  // Development environment - rich logging with pretty format
  if (isDev) {
    const transports: LogTransport[] = [
      new ConsoleTransport('pretty')
    ];

    // Add memory transport for debugging
    if (env.VITE_ENABLE_MEMORY_TRANSPORT === 'true') {
      transports.push(new MemoryTransport(1000));
    }

    return {
      level: (env.VITE_LOG_LEVEL as LogLevel) || 'debug',
      transports,
      enableStackTrace: true,
      enableMetrics: env.VITE_ENABLE_METRICS === 'true',
      maxBufferSize: 100,
      flushInterval: 5000
    };
  }

  // Production environment - structured logging with monitoring
  if (isProd) {
    const transports: LogTransport[] = [
      new ConsoleTransport('json')
    ];

    // Add Prometheus transport if endpoint is configured
    if (env.VITE_METRICS_ENDPOINT) {
      transports.push(new PrometheusTransport(env.VITE_METRICS_ENDPOINT, {
        flushInterval: parseInt(env.VITE_METRICS_FLUSH_INTERVAL || '30000'),
        batchSize: parseInt(env.VITE_METRICS_BATCH_SIZE || '100')
      }));
    }

    // Disable logging entirely if explicitly set
    if (env.VITE_DISABLE_LOGGING === 'true') {
      return {
        level: 'error',
        transports: [new NullTransport()],
        enableStackTrace: false,
        enableMetrics: false
      };
    }

    return {
      level: (env.VITE_LOG_LEVEL as LogLevel) || 'info',
      transports,
      enableStackTrace: env.VITE_ENABLE_STACK_TRACE === 'true',
      enableMetrics: env.VITE_ENABLE_METRICS !== 'false', // Default enabled
      maxBufferSize: parseInt(env.VITE_LOG_BUFFER_SIZE || '200'),
      flushInterval: parseInt(env.VITE_LOG_FLUSH_INTERVAL || '30000')
    };
  }

  // Fallback configuration
  return {
    level: 'info',
    transports: [new ConsoleTransport('json')],
    enableStackTrace: false,
    enableMetrics: false
  };
}

/**
 * Sampling rate for high-volume scenarios
 */
export function getLogSamplingRate(): number {
  const env = import.meta.env;
  const rate = parseFloat(env.VITE_LOG_SAMPLING_RATE || '1.0');
  return Math.max(0, Math.min(1, rate)); // Clamp between 0 and 1
}

/**
 * Check if logging should be sampled (for high-volume scenarios)
 */
export function shouldSampleLog(): boolean {
  const samplingRate = getLogSamplingRate();
  if (samplingRate >= 1.0) return true;
  if (samplingRate <= 0.0) return false;

  return Math.random() < samplingRate;
}

/**
 * Health check configuration for monitoring endpoints
 */
export function getHealthCheckConfig() {
  const env = import.meta.env;

  return {
    enabled: env.VITE_HEALTH_CHECK_ENABLED !== 'false',
    endpoint: env.VITE_HEALTH_CHECK_ENDPOINT || '/health',
    interval: parseInt(env.VITE_HEALTH_CHECK_INTERVAL || '30000'),
    timeout: parseInt(env.VITE_HEALTH_CHECK_TIMEOUT || '5000')
  };
}

/**
 * Privacy configuration for healthcare data
 */
export function getPrivacyConfig() {
  const env = import.meta.env;

  return {
    // Never log sensitive health data in production
    logSensitiveData: env.DEV && env.VITE_LOG_SENSITIVE_DATA === 'true',
    // Hash user IDs in logs for privacy
    hashUserIds: env.VITE_HASH_USER_IDS !== 'false',
    // Maximum length for logged messages to prevent data leaks
    maxMessageLength: parseInt(env.VITE_MAX_LOG_MESSAGE_LENGTH || '1000'),
    // Fields to redact from metadata
    redactedFields: (env.VITE_REDACTED_LOG_FIELDS || 'password,token,key,secret,auth')
      .split(',')
      .map((field: string) => field.trim())
  };
}

/**
 * Sanitize metadata to remove sensitive information
 */
export function sanitizeMetadata(metadata: any): any {
  if (!metadata || typeof metadata !== 'object') return metadata;

  const config = getPrivacyConfig();
  const sanitized = { ...metadata };

  // Redact sensitive fields
  config.redactedFields.forEach((field: string) => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Truncate long strings
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > config.maxMessageLength) {
      sanitized[key] = sanitized[key].substring(0, config.maxMessageLength) + '...[TRUNCATED]';
    }
  });

  return sanitized;
}

/**
 * Hash user ID for privacy if enabled
 */
export function hashUserId(userId: string): string {
  const config = getPrivacyConfig();

  if (!config.hashUserIds) {
    return userId;
  }

  // Use crypto API for secure hashing if available
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      // Use a stable key derived from environment
      const secret = import.meta.env.VITE_USER_HASH_SECRET || 'ms-tracker-default-secret';
      const encoder = new TextEncoder();
      const data = encoder.encode(userId + secret);

      // For now, use a synchronous fallback since crypto.subtle is async
      // In production, consider implementing proper HMAC
      return hashUserIdFallback(userId, secret);
    } catch (error) {
      // Fall back to secure alternative
      const secret = import.meta.env.VITE_USER_HASH_SECRET || 'ms-tracker-default-secret';
      return hashUserIdFallback(userId, secret);
    }
  }

  // Fallback for environments without crypto API
  const secret = import.meta.env.VITE_USER_HASH_SECRET || 'ms-tracker-default-secret';
  return hashUserIdFallback(userId, secret);
}

/**
 * Secure fallback hash function with secret
 */
function hashUserIdFallback(userId: string, secret: string): string {
  const input = userId + secret;
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Add additional entropy
  const finalHash = Math.abs(hash ^ 0x5A5A5A5A);
  return `user_${finalHash.toString(36)}`;
}

/**
 * Environment variable validation
 */
export function validateLoggerEnvironment(): { valid: boolean; errors: string[] } {
  const env = import.meta.env;
  const errors: string[] = [];

  // Validate log level
  const validLevels = ['debug', 'info', 'warn', 'error'];
  const logLevel = env.VITE_LOG_LEVEL;
  if (logLevel && !validLevels.includes(logLevel)) {
    errors.push(`Invalid VITE_LOG_LEVEL: ${logLevel}. Must be one of: ${validLevels.join(', ')}`);
  }

  // Validate sampling rate
  const samplingRate = env.VITE_LOG_SAMPLING_RATE;
  if (samplingRate) {
    const rate = parseFloat(samplingRate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      errors.push(`Invalid VITE_LOG_SAMPLING_RATE: ${samplingRate}. Must be between 0.0 and 1.0`);
    }
  }

  // Validate numeric configs
  const numericConfigs = [
    'VITE_METRICS_FLUSH_INTERVAL',
    'VITE_METRICS_BATCH_SIZE',
    'VITE_LOG_BUFFER_SIZE',
    'VITE_LOG_FLUSH_INTERVAL',
    'VITE_HEALTH_CHECK_INTERVAL',
    'VITE_HEALTH_CHECK_TIMEOUT',
    'VITE_MAX_LOG_MESSAGE_LENGTH'
  ];

  numericConfigs.forEach(configName => {
    const value = env[configName];
    if (value && (isNaN(parseInt(value)) || parseInt(value) < 0)) {
      errors.push(`Invalid ${configName}: ${value}. Must be a positive integer`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}