import type { LogTransport, LogEntry } from './types.js';

/**
 * Console transport for development and basic production logging
 */
export class ConsoleTransport implements LogTransport {
  private format: 'json' | 'pretty';

  constructor(format: 'json' | 'pretty' = 'pretty') {
    this.format = format;
  }

  write(entry: LogEntry): void {
    const logMethod = this.getConsoleMethod(entry.level);

    if (this.format === 'json') {
      logMethod(JSON.stringify(entry));
    } else {
      // Pretty format for development
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const context = entry.context ? `[${entry.context.service}:${entry.context.operation}]` : '';
      const userInfo = entry.userId ? `(user:${entry.userId.slice(0, 8)})` : '';
      const requestInfo = entry.requestId ? `(req:${entry.requestId.slice(0, 8)})` : '';

      const prefix = `${timestamp} ${entry.level.toUpperCase()} ${context}${userInfo}${requestInfo}`;

      if (entry.error) {
        logMethod(`${prefix} ${entry.message}`, entry.error, entry.metadata);
      } else {
        logMethod(`${prefix} ${entry.message}`, entry.metadata);
      }
    }
  }

  private getConsoleMethod(level: string): (...args: any[]) => void {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
        return console.error;
      default:
        return console.log;
    }
  }
}

/**
 * Memory transport for testing and buffering
 */
export class MemoryTransport implements LogTransport {
  private entries: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  write(entry: LogEntry): void {
    this.entries.push(entry);

    // Keep only the most recent entries
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(-this.maxSize);
    }
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getEntriesByLevel(level: string): LogEntry[] {
    return this.entries.filter(entry => entry.level === level);
  }

  clear(): void {
    this.entries = [];
  }

  flush(): void {
    // Memory transport doesn't need flushing
  }
}

/**
 * Prometheus push gateway transport for metrics integration
 */
export class PrometheusTransport implements LogTransport {
  private endpoint: string;
  private buffer: LogEntry[] = [];
  private flushInterval: number;
  private flushTimer?: ReturnType<typeof setTimeout>;
  private batchSize: number;

  constructor(endpoint: string, options: { flushInterval?: number; batchSize?: number } = {}) {
    this.endpoint = endpoint;
    this.flushInterval = options.flushInterval || 30000; // 30 seconds
    this.batchSize = options.batchSize || 100;

    // Start periodic flush
    this.startPeriodicFlush();
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = this.buffer.splice(0);

    try {
      // Convert log entries to Prometheus metrics format
      const metrics = this.convertToPrometheusMetrics(entries);

      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: metrics
      });
    } catch (error) {
      console.error('Failed to send metrics to Prometheus:', error);
      // Re-add entries to buffer for retry (up to buffer limit)
      this.buffer.unshift(...entries.slice(-this.batchSize));
    }
  }

  private convertToPrometheusMetrics(entries: LogEntry[]): string {
    const metrics = new Map<string, number>();

    entries.forEach(entry => {
      // Log count by level and service
      const logCountKey = `ms_tracker_log_count{level="${entry.level}",service="${entry.context?.service || 'unknown'}"}`;
      metrics.set(logCountKey, (metrics.get(logCountKey) || 0) + 1);

      // Error count by service and operation
      if (entry.level === 'error') {
        const errorCountKey = `ms_tracker_error_count{service="${entry.context?.service || 'unknown'}",operation="${entry.context?.operation || 'unknown'}"}`;
        metrics.set(errorCountKey, (metrics.get(errorCountKey) || 0) + 1);
      }

      // Response time histogram
      if (entry.metadata?.duration) {
        const responseTimeKey = `ms_tracker_response_time{operation="${entry.context?.operation || 'unknown'}"}`;
        metrics.set(responseTimeKey, entry.metadata.duration);
      }
    });

    // Convert to Prometheus format
    return Array.from(metrics.entries())
      .map(([key, value]) => `${key} ${value}`)
      .join('\n') + '\n';
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.flushInterval);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    void this.flush(); // Final flush
  }
}

/**
 * Null transport for disabling logging in specific contexts
 */
export class NullTransport implements LogTransport {
  write(): void {
    // Do nothing - effectively disables logging
  }
}

/**
 * Batched remote transport for high-volume scenarios
 */
export class BatchedRemoteTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private endpoint: string;
  private flushTimer?: ReturnType<typeof setTimeout>;
  private batchSize: number;
  private flushInterval: number;

  constructor(endpoint: string, options: { batchSize?: number; flushInterval?: number } = {}) {
    this.endpoint = endpoint;
    this.batchSize = options.batchSize || 50;
    this.flushInterval = options.flushInterval || 15000; // 15 seconds

    this.startPeriodicFlush();
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = this.buffer.splice(0);

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: entries })
      });
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      // Re-add entries to buffer for retry (up to buffer limit)
      this.buffer.unshift(...entries.slice(-this.batchSize));
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.flushInterval);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    void this.flush();
  }
}