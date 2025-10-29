/**
 * API Request/Response Interceptor
 * Provides instrumentation, logging, and metrics for all API calls
 */

import { logger } from './logger';
import { SentryService } from '../services/SentryService';

interface ApiMetrics {
  endpoint: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  error?: Error;
  retryCount?: number;
}

class ApiInterceptor {
  private metrics: Map<string, ApiMetrics[]> = new Map();
  private readonly maxMetricsPerEndpoint = 100;

  /**
   * Generate correlation ID for request tracing
   */
  private generateCorrelationId(): string {
    return `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Instrument an API request
   */
  async instrumentRequest<T>(
    endpoint: string,
    method: string,
    requestFn: (correlationId: string) => Promise<T>,
    options?: {
      retryCount?: number;
      timeout?: number;
    }
  ): Promise<T> {
    const correlationId = this.generateCorrelationId();
    const metrics: ApiMetrics = {
      endpoint,
      method,
      startTime: Date.now(),
      retryCount: options?.retryCount || 0,
    };

    const contextLogger = logger.withCorrelationId(correlationId);

    contextLogger.info(`API Request: ${method} ${endpoint}`, {
      retryCount: metrics.retryCount,
    });

    try {
      // Execute request with timeout if specified
      const timeoutPromise = options?.timeout
        ? new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), options.timeout)
          )
        : null;

      const result = timeoutPromise
        ? await Promise.race([requestFn(correlationId), timeoutPromise])
        : await requestFn(correlationId);

      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.statusCode = 200; // Assume success if no error

      contextLogger.info(`API Response: ${method} ${endpoint}`, {
        duration: metrics.duration,
        statusCode: metrics.statusCode,
      });

      this.recordMetrics(endpoint, metrics);

      // Add breadcrumb for Sentry
      SentryService.addBreadcrumb({
        message: `API ${method} ${endpoint}`,
        category: 'api',
        level: 'info',
        data: {
          duration: metrics.duration,
          statusCode: metrics.statusCode,
          correlationId,
        },
      });

      return result;
    } catch (error) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.error = error as Error;
      metrics.statusCode = (error as any)?.statusCode || 500;

      contextLogger.error(
        `API Error: ${method} ${endpoint}`,
        error as Error,
        {
          duration: metrics.duration,
          statusCode: metrics.statusCode,
        }
      );

      this.recordMetrics(endpoint, metrics);

      // Add error breadcrumb
      SentryService.addBreadcrumb({
        message: `API ${method} ${endpoint} failed`,
        category: 'api',
        level: 'error',
        data: {
          duration: metrics.duration,
          statusCode: metrics.statusCode,
          error: (error as Error).message,
          correlationId,
        },
      });

      throw error;
    }
  }

  /**
   * Record metrics for an endpoint
   */
  private recordMetrics(endpoint: string, metrics: ApiMetrics) {
    const endpointMetrics = this.metrics.get(endpoint) || [];
    endpointMetrics.push(metrics);

    // Keep only the last N metrics per endpoint
    if (endpointMetrics.length > this.maxMetricsPerEndpoint) {
      endpointMetrics.shift();
    }

    this.metrics.set(endpoint, endpointMetrics);
  }

  /**
   * Get metrics summary for an endpoint
   */
  getEndpointMetrics(endpoint: string) {
    const metrics = this.metrics.get(endpoint) || [];
    const successfulRequests = metrics.filter((m) => !m.error);
    const failedRequests = metrics.filter((m) => m.error);

    const durations = successfulRequests
      .map((m) => m.duration)
      .filter((d): d is number => d !== undefined);

    return {
      totalRequests: metrics.length,
      successCount: successfulRequests.length,
      failureCount: failedRequests.length,
      errorRate: metrics.length > 0 ? failedRequests.length / metrics.length : 0,
      avgDuration: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
      p95Duration: this.calculatePercentile(durations, 0.95),
      p99Duration: this.calculatePercentile(durations, 0.99),
    };
  }

  /**
   * Get all metrics summary
   */
  getAllMetrics() {
    const summary: Record<string, ReturnType<typeof this.getEndpointMetrics>> = {};
    for (const endpoint of this.metrics.keys()) {
      summary[endpoint] = this.getEndpointMetrics(endpoint);
    }
    return summary;
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
  }
}

export const apiInterceptor = new ApiInterceptor();
export default apiInterceptor;
