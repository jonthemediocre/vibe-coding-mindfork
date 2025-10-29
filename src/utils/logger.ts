/**
 * Structured logger utility with production support
 * Provides context enrichment, log levels, sampling, and performance timing
 */

// Lazy import to avoid circular dependency
let SentryService: any;

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, any>;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

interface PerformanceTimer {
  startTime: number;
  label: string;
  end: (additionalContext?: LogContext) => void;
}

const isDev = __DEV__;

class Logger {
  private sessionId: string;
  private userId?: string;
  private requestId?: string;
  private globalContext: LogContext = {};
  private logBuffer: LogEntry[] = [];
  private readonly bufferSize = 50;
  private readonly productionSampleRate = 0.1; // 10% sampling in production

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Set user context for all subsequent logs
   */
  setUser(userId: string, additionalContext?: LogContext) {
    this.userId = userId;
    if (additionalContext) {
      this.globalContext = { ...this.globalContext, ...additionalContext };
    }
    this.getSentryService()?.setUser({ id: userId, ...additionalContext });
  }

  /**
   * Clear user context (e.g., on logout)
   */
  clearUser() {
    this.userId = undefined;
    this.globalContext = {};
    this.getSentryService()?.setUser(null);
  }

  /**
   * Set request ID for distributed tracing
   */
  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  /**
   * Set global context that will be included in all logs
   */
  setContext(context: LogContext) {
    this.globalContext = { ...this.globalContext, ...context };
  }

  /**
   * Start a performance timer
   * Usage: const timer = logger.startTimer('api_call'); await doWork(); timer.end({ endpoint: '/foo' });
   */
  startTimer(label: string): PerformanceTimer {
    const startTime = Date.now();
    return {
      startTime,
      label,
      end: (additionalContext?: LogContext) => {
        const duration = Date.now() - startTime;
        this.info(`${label} completed`, {
          ...additionalContext,
          duration_ms: duration,
          performance_metric: true,
        });
      },
    };
  }

  private getSentryService() {
    if (!SentryService) {
      try {
        SentryService = require('../services/SentryService').SentryService;
      } catch {
        return null;
      }
    }
    return SentryService;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors
    if (level === 'error') return true;

    // In dev, log everything
    if (isDev) return true;

    // In production, sample based on level
    if (level === 'warn') return Math.random() < 0.5; // 50% of warnings
    return Math.random() < this.productionSampleRate; // 10% of info/debug
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...this.globalContext,
        sessionId: this.sessionId,
        ...(this.userId && { userId: this.userId }),
        ...(this.requestId && { requestId: this.requestId }),
        ...context, // Context passed to the method takes precedence
      },
      error,
    };
  }

  private writeLog(entry: LogEntry) {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const timestamp = isDev ? '' : `${entry.timestamp} `;
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

    const logMessage = `${timestamp}${prefix} ${entry.message}${contextStr}`;

    // Console output
    switch (entry.level) {
      case 'error':
        console.error(logMessage, entry.error || '');
        if (entry.error) {
          this.getSentryService()?.captureError(entry.error, entry.context);
        }
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.log(logMessage);
        break;
      case 'debug':
      case 'trace':
        if (isDev) console.log(logMessage);
        break;
    }

    // Buffer for batch shipping (future: send to analytics)
    this.logBuffer.push(entry);
    if (this.logBuffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;

    const logsToShip = [...this.logBuffer];
    this.logBuffer = [];

    // Remote log shipping (currently disabled, configure when ready)
    // Uncomment and configure when you have a log aggregation service
    await this.shipLogsToRemote(logsToShip);
  }

  /**
   * Ship logs to remote service
   * Configure with your log aggregation service (Datadog, Loggly, CloudWatch, etc.)
   */
  private async shipLogsToRemote(logs: LogEntry[]) {
    // Skip in development
    if (isDev) return;

    try {
      // Example: Ship to custom endpoint
      // Uncomment and configure when ready:
      /*
      const endpoint = process.env.EXPO_PUBLIC_LOG_ENDPOINT;
      if (!endpoint) return;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_LOG_API_KEY}`,
        },
        body: JSON.stringify({
          logs,
          app: 'mindfork-mobile',
          platform: 'react-native',
          version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
        }),
      });
      */

      // Alternative: Ship to Datadog
      /*
      const datadogEndpoint = 'https://http-intake.logs.datadoghq.com/v1/input';
      await fetch(datadogEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.EXPO_PUBLIC_DATADOG_API_KEY || '',
        },
        body: JSON.stringify(logs.map(log => ({
          ddsource: 'mindfork-mobile',
          service: 'mobile-app',
          message: log.message,
          status: log.level,
          ...log.context,
        }))),
      });
      */

      // Alternative: Ship to Loggly
      /*
      const logglyToken = process.env.EXPO_PUBLIC_LOGGLY_TOKEN;
      if (!logglyToken) return;

      await fetch(`https://logs-01.loggly.com/inputs/${logglyToken}/tag/mindfork-mobile/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logs),
      });
      */
    } catch (error) {
      // Silently fail to avoid infinite loop
      if (isDev) {
        console.error('[Logger] Failed to ship logs:', error);
      }
    }
  }

  trace(message: string, context?: LogContext) {
    if (this.shouldLog('trace')) {
      this.writeLog(this.createLogEntry('trace', message, context));
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      this.writeLog(this.createLogEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      this.writeLog(this.createLogEntry('info', message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) {
      this.writeLog(this.createLogEntry('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.writeLog(this.createLogEntry('error', message, context, error));
  }

  // Correlation ID support for distributed tracing
  withCorrelationId(correlationId: string) {
    return {
      trace: (message: string, context?: LogContext) =>
        this.trace(message, { ...context, correlationId }),
      debug: (message: string, context?: LogContext) =>
        this.debug(message, { ...context, correlationId }),
      info: (message: string, context?: LogContext) =>
        this.info(message, { ...context, correlationId }),
      warn: (message: string, context?: LogContext) =>
        this.warn(message, { ...context, correlationId }),
      error: (message: string, error?: Error, context?: LogContext) =>
        this.error(message, error, { ...context, correlationId }),
    };
  }
}

export const logger = new Logger();
export default logger;
