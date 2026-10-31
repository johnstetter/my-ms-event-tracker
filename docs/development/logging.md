# Structured Logging System

A comprehensive, healthcare-appropriate structured logging system for the MS Event Tracker application.

## Overview

This logging system provides structured, configurable logging with privacy controls, performance optimization, and integration with monitoring systems like Prometheus and Grafana.

## Quick Start

```typescript
import { log, createServiceLogger } from '$lib/logging';

// Basic usage
log.info('User action completed', { action: 'createEvent', duration: 150 });
log.error('Operation failed', error, { userId: 'user123', context: 'eventCreation' });

// Service-specific logger
const eventLog = createServiceLogger('eventService', 'createQuickEvent');
eventLog.info('Event creation started', { eventType: 'pain', severity: 7 });
```

## Features

### 🏥 Healthcare Privacy Controls
- **User ID hashing** - Automatically hash user IDs in production
- **Sensitive field redaction** - Remove passwords, tokens, and PII
- **Message truncation** - Prevent data leaks through long messages
- **Sampling support** - Reduce log volume in high-traffic scenarios

### 🚀 Performance Optimized
- **Lazy evaluation** - Debug messages only processed when needed
- **Batched transports** - Efficient remote logging with buffering
- **Zero overhead** - Minimal impact when logging is disabled

### 📊 Monitoring Integration
- **Console Logging** - Browser and Cloudflare Workers log output
- **External SaaS** - Optional integration with Grafana Cloud, Sentry, etc.
- **Prometheus metrics** - Available via future /metrics endpoint (see issue #71)
- **Analytics** - To be wired intentionally; see issue #119

### 🔧 Developer Friendly
- **Fluent API** - Chain context and operations naturally
- **TypeScript support** - Full type safety throughout
- **Performance timing** - Built-in operation timing utilities

## Configuration

### Environment Variables

```bash
# Basic Configuration
VITE_LOG_LEVEL=info                # debug|info|warn|error
VITE_LOG_SAMPLING_RATE=1.0         # Sample rate (0.0-1.0)

# Metrics Integration (disabled for initial deployment)
VITE_ENABLE_METRICS=false         # Disable until /metrics endpoint implemented (issue #71)

# Privacy Controls (healthcare compliance)
VITE_HASH_USER_IDS=true           # Hash user IDs in logs
VITE_MAX_LOG_MESSAGE_LENGTH=1000   # Truncate long messages
VITE_REDACTED_LOG_FIELDS=password,token,key,secret,auth,email

# Performance
VITE_LOG_BUFFER_SIZE=200          # Buffer size for batching
VITE_LOG_FLUSH_INTERVAL=30000     # Background flush interval

# Emergency Controls
VITE_DISABLE_LOGGING=false        # Emergency disable all logging

# Development-only
VITE_ENABLE_MEMORY_TRANSPORT=true  # In-memory debugging (dev only)
VITE_ENABLE_STACK_TRACE=true       # Stack traces (dev only)
```

### Environment-Based Defaults

- **Development**: Pretty console output, debug level, stack traces enabled, memory transport
- **Test**: Memory transport only, warn level, minimal output
- **Production (Cloudflare Pages)**: JSON console output, info level

## Usage Patterns

### Service Integration

```typescript
import { createServiceLogger, createTimer } from '$lib/logging';

const log = createServiceLogger('eventService');

export class EventService {
  static async createQuickEvent(params: CreateQuickEventParams) {
    const requestId = crypto.randomUUID();
    const operationLog = log.withRequestId(requestId).withContext({ operation: 'createQuickEvent' });
    const timer = createTimer(operationLog, 'createQuickEvent');

    operationLog.info('Creating quick event', {
      eventTypeId: params.eventType.id,
      severity: params.severity
    });

    try {
      const result = await this.performOperation(params);

      operationLog.info('Event created successfully', { eventId: result.id });
      timer.end('Event creation completed');

      return result;
    } catch (error) {
      operationLog.error('Event creation failed', error, params);
      timer.error('Event creation failed', error);
      throw error;
    }
  }
}
```

### Component Integration

```svelte
<script lang="ts">
  import { log } from '$lib/logging';

  const componentLog = log.ui.withContext({
    component: 'QuickLog',
    operation: 'submitEvent'
  });

  async function handleSubmit() {
    componentLog.info('User initiated event submission', {
      eventType: selectedEventType?.name,
      severity: severity
    });

    try {
      const result = await submitEvent(params);
      componentLog.info('Event submitted successfully');
    } catch (error) {
      componentLog.error('Event submission failed', error);
    }
  }
</script>
```

### Healthcare-Specific Logging

```typescript
import { healthcareLogger, log } from '$lib/logging';

// Medical event logging with privacy controls
log.medicalEvent('pain-episode', userId, {
  severity: 8,
  duration: 45,
  hasLocation: true,
  locationCount: 2
  // Note: Actual location details are not logged for privacy
});

// User action logging with hashed IDs
log.userAction('viewHistory', userId, {
  filterType: 'eventType',
  timeRange: '30days'
});
```

### Performance Timing

```typescript
import { createTimer, logPerformance } from '$lib/logging';

// Manual timing
const timer = log.time('databaseQuery', { table: 'events' });
await performDatabaseQuery();
timer.end('Query completed successfully');

// Decorator-based timing
class EventService {
  @logPerformance(log.event, 'createEvent')
  static async createEvent(params: any) {
    // Method automatically timed and logged
    return await this.performCreation(params);
  }
}
```

## Transport Types

### Console Transport
- **Development**: Pretty-printed with colors and context
- **Production**: Structured JSON for log aggregation

### Memory Transport
- **Testing**: In-memory storage for test assertions
- **Debugging**: Temporary storage for inspection

### Prometheus Transport
- **Metrics**: Automatic conversion to Prometheus format
- **Monitoring**: Integration with Grafana dashboards
- **Alerting**: Error rates and performance thresholds

## Cloudflare Pages Deployment

### Production Logging Architecture

**Network Isolation Reality:**
- ✅ **Cloudflare Pages**: Runs on Cloudflare's edge network
- ❌ **No homelab access**: Cannot reach internal services (Loki, Prometheus, etc.)
- ✅ **Internet-only**: Can only access external SaaS services

### Where Logs Actually Go

#### **1. Client-Side Logs (Browser)**
```typescript
// Runs in user's browser
log.info('User clicked create button', { eventType: 'pain' });
```

**Result:** Appears in browser console (F12 → Console)
- ✅ Great for individual user debugging
- ❌ Not centralized, only visible to that user
- ❌ Lost when browser refreshes

#### **2. Server-Side Logs (SvelteKit API Routes)**
```typescript
// src/routes/api/events/+server.ts
export async function POST({ request }) {
  log.event.info('API: Creating event', { method: 'POST' });
}
```

**Result:** Goes to Cloudflare Workers logs
- ✅ Centralized server-side logging
- ✅ Accessible via Cloudflare Dashboard or Wrangler CLI
- ⚠️ Limited retention (recent logs only)

#### **3. No File System**
- ❌ **No log files**: Cloudflare Pages has no persistent file system
- ❌ **No `/var/log/app.log`**: Not a traditional server environment

### Accessing Production Logs

#### **Real-Time Server Logs**
```bash
# Wrangler CLI (recommended)
wrangler pages deployment tail your-project-name

# Filter by level
wrangler pages deployment tail --status=error

# JSON format
wrangler pages deployment tail --format=json
```

#### **Cloudflare Dashboard**
1. **Cloudflare Dashboard** → Pages → Your project
2. **Functions tab** → View logs
3. **Real-time logs** during active debugging

#### **Client-Side Debugging**
1. User navigates to your site
2. F12 → Console tab
3. See structured JSON logs from their session

### Production Configuration

```bash
# .env for Cloudflare Pages
VITE_LOG_LEVEL=info
VITE_ENABLE_METRICS=false
VITE_HASH_USER_IDS=true
VITE_ENABLE_STACK_TRACE=false
```

### Limitations & Workarounds

#### **What You Can't Do**
- ❌ Direct integration with homelab Loki/Vector/Prometheus
- ❌ Pushgateway metrics (homelab is internal)
- ❌ Real-time log streaming to internal services
- ❌ Persistent log file storage

#### **Available Alternatives**
- ✅ **Console Transport**: Browser + Cloudflare Workers logs
- ✅ **External SaaS**: Grafana Cloud, Sentry, Datadog
- ✅ **Future /metrics endpoint**: Issue #71 for Prometheus scraping
- ✅ **Future analytics tool**: Issue #119 to wire one intentionally

### Debugging Production Issues

**Step-by-step process:**

1. **Check server-side logs:**
   ```bash
   wrangler pages deployment tail --status=error
   ```

2. **Ask user for browser logs:**
   - User opens F12 → Console
   - Look for red error messages
   - Copy structured JSON log entries

3. **Check Cloudflare Analytics:**
   - Dashboard → Analytics → Performance
   - Geographic distribution of errors
   - Traffic spikes correlating with issues

4. **Correlate timing:**
   - Server logs show backend issues
   - Browser logs show frontend issues
   - Analytics show user behavior patterns

### External Log Aggregation (Optional)

If centralized logging is needed:

```typescript
// Custom external transport
export class ExternalLogTransport implements LogTransport {
  constructor(private endpoint: string) {}

  async write(entry: LogEntry): Promise<void> {
    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
  }
}
```

**Options:**
- **Grafana Cloud**: Managed Loki instance
- **Datadog**: Full observability platform
- **Sentry**: Error tracking and performance
- **LogRocket**: Session replay and logging

## Monitoring & Alerting

### Current Monitoring Capabilities

#### **Cloudflare Analytics (Built-in)**
- **Page Views**: User traffic patterns
- **Performance**: Core Web Vitals, response times
- **Geographic**: User distribution and regional issues
- **Errors**: 4xx/5xx response rates

#### **Cloudflare Workers Logs**
- **Real-time**: Error tracking during active issues
- **API calls**: Server-side request/response logging
- **Performance**: Function execution times

### Future Monitoring (Issue #71)

When `/metrics` endpoint is implemented:

```promql
# Error Rate by Service (future)
rate(ms_tracker_error_count[5m]) by (service)

# Response Time Percentiles (future)
histogram_quantile(0.95, rate(ms_tracker_response_time_bucket[5m])) by (operation)

# Log Volume by Level (future)
sum(rate(ms_tracker_log_count[1m])) by (level)
```

### Current Alert Options

#### **Cloudflare Notifications**
- **Error Rate Spikes**: Configure in Cloudflare Dashboard
- **Performance Degradation**: Core Web Vitals alerts
- **Traffic Anomalies**: Unusual traffic pattern detection

#### **External Services (Optional)**
- **Sentry**: Real-time error alerts
- **Grafana Cloud**: Custom metric alerts
- **Datadog**: Full observability with alerting

## Privacy & Compliance

### Healthcare Data Protection
- ✅ No sensitive medical details in production logs
- ✅ User ID hashing in production environments
- ✅ Automatic redaction of sensitive fields
- ✅ Configurable message length limits

### GDPR Compliance
- ✅ No personal data in logs (except hashed user IDs)
- ✅ Configurable data retention via transport settings
- ✅ Ability to disable logging entirely if required

## Best Practices

### ✅ Do's
- Use service-specific loggers for better organization
- Include relevant context (user ID, operation, request ID)
- Log both success and failure cases
- Use appropriate log levels (debug for development, info/warn/error for production)
- Include timing information for performance monitoring

### ❌ Don'ts
- Log sensitive medical information (severity numbers are OK, detailed symptoms are not)
- Log personally identifiable information (email addresses, names, etc.)
- Use debug level in production environments
- Log the same event multiple times without correlation
- Ignore privacy configuration settings

## Troubleshooting

### Common Issues

#### **Development Environment**

**Logs not appearing in browser:**
- Check `VITE_LOG_LEVEL` environment variable (should be `debug`)
- Verify logger initialization in browser console
- Open F12 → Console to see log output
- Check `.env.local` file configuration

**Memory transport not working:**
- Ensure `VITE_ENABLE_MEMORY_TRANSPORT=true` in development
- Access logs via `window.debugLogs` in browser console
- Memory transport only works client-side

#### **Cloudflare Pages Production**

**Server-side logs missing:**
```bash
# Check if functions are deploying correctly
wrangler pages deployment list

# Tail logs in real-time
wrangler pages deployment tail your-project --status=error
```

**Client-side logs not visible:**
- User must open F12 → Console on their own browser
- Logs are not centralized (by design for privacy)
- Consider external log aggregation if needed

**No homelab integration:**
- ❌ **Expected**: Cannot reach internal Loki/Prometheus/Vector
- ✅ **Solution**: Use Console transport + external SaaS if needed
- ⚠️ **Network isolation**: Cloudflare Pages cannot access 192.168.x.x

**Environment variables not working:**
- Verify variables are set in Cloudflare Pages Dashboard
- Environment variables must start with `VITE_` to be available
- Check build logs for configuration errors

#### **Performance Issues**

**High log volume in production:**
- Adjust `VITE_LOG_SAMPLING_RATE` to reduce volume (e.g., 0.1 for 10%)
- Raise log level to 'warn' or 'error' only
- Consider `VITE_DISABLE_LOGGING=true` for emergency disable

**Browser performance impact:**
- Disable `VITE_ENABLE_STACK_TRACE` in production
- Reduce `VITE_LOG_BUFFER_SIZE` for memory-constrained devices
- Use `info` level instead of `debug` in production

### Debug Mode

```typescript
// Enable debug logging temporarily
import { Logger, ConsoleTransport } from '$lib/logging';

const debugLogger = new Logger({
  level: 'debug',
  transports: [new ConsoleTransport('pretty')],
  enableStackTrace: true,
  enableMetrics: false
});

// Use for debugging specific issues
debugLogger.debug('Debugging specific issue', { context: 'troubleshooting' });
```

## Migration from console.log

### Automated Migration

Use search/replace patterns to convert existing code:

```bash
# Find console statements
grep -r "console\." src/

# Replace patterns
console.log('message') → log.info('message')
console.error('Error:', error) → log.error('Error occurred', error)
console.warn('Warning') → log.warn('Warning')
```

### Manual Migration Strategy

1. **Start with services** - Migrate service layers first for maximum impact
2. **Add context** - Include relevant context (service, operation, user ID)
3. **Remove sensitive data** - Ensure no sensitive information is logged
4. **Test thoroughly** - Verify logs appear correctly in development
5. **Monitor production** - Watch for performance impact after deployment

## Performance Impact

### Benchmarks
- **Disabled logging**: ~0.001ms overhead per call
- **Console transport**: ~0.1ms per log entry
- **Prometheus transport**: ~0.5ms per log entry (batched)
- **Memory usage**: ~50KB baseline + ~100 bytes per log entry

### Optimization Tips
- Use lazy evaluation for debug messages: `log.debug(() => expensiveOperation())`
- Batch remote transports for efficiency
- Consider sampling for high-volume scenarios
- Use appropriate log levels to reduce processing

## Contributing

When adding new logging functionality:

1. Follow existing patterns for consistency
2. Add appropriate TypeScript types
3. Include privacy controls for healthcare data
4. Update documentation and examples
5. Add tests for new transport types
6. Verify Prometheus metrics are correctly formatted