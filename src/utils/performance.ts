/**
 * Performance Monitoring Utility
 * Tracks screen render times, memory usage, and performance metrics
 */

import React from 'react';
import { InteractionManager } from 'react-native';
import { logger } from './logger';
import { SentryService } from '../services/SentryService';

interface PerformanceMetric {
  name: string;
  type: 'screen_render' | 'api_call' | 'memory' | 'custom';
  duration?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 100;
  private screenRenderStart: Map<string, number> = new Map();
  private memoryMonitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupMemoryMonitoring();
  }

  /**
   * Start tracking screen render time
   */
  startScreenRender(screenName: string) {
    const startTime = Date.now();
    this.screenRenderStart.set(screenName, startTime);

    // Log trace
    logger.trace(`Screen render started: ${screenName}`, {
      screen: screenName,
      startTime,
    });

    return startTime;
  }

  /**
   * End tracking screen render time
   */
  endScreenRender(screenName: string) {
    const startTime = this.screenRenderStart.get(screenName);
    if (!startTime) {
      logger.warn('Screen render end called without start', { screen: screenName });
      return;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    this.recordMetric({
      name: screenName,
      type: 'screen_render',
      duration,
      timestamp: endTime,
      metadata: {
        renderTime: duration,
      },
    });

    // Log slow renders (> 500ms)
    if (duration > 500) {
      logger.warn(`Slow screen render: ${screenName}`, {
        screen: screenName,
        duration,
        threshold: 500,
      });

      // Send to Sentry for slow renders
      SentryService.addBreadcrumb({
        message: `Slow render: ${screenName}`,
        category: 'performance',
        level: 'warning',
        data: { duration, screen: screenName },
      });
    } else {
      logger.debug(`Screen rendered: ${screenName}`, {
        screen: screenName,
        duration,
      });
    }

    this.screenRenderStart.delete(screenName);
  }

  /**
   * Track custom performance metric
   */
  trackCustomMetric(name: string, duration: number, metadata?: Record<string, any>) {
    this.recordMetric({
      name,
      type: 'custom',
      duration,
      timestamp: Date.now(),
      metadata,
    });

    logger.debug(`Custom metric: ${name}`, {
      metric: name,
      duration,
      ...metadata,
    });
  }

  /**
   * Get memory usage (React Native specific)
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      // React Native doesn't expose memory directly
      // This is a placeholder for native module integration
      // In production, you'd use a native module like react-native-device-info
      return 0;
    } catch (error) {
      logger.error('Failed to get memory usage', error as Error);
      return 0;
    }
  }

  /**
   * Setup periodic memory monitoring
   */
  private setupMemoryMonitoring() {
    // Clear any existing interval first
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    // Monitor memory every 30 seconds
    this.memoryMonitorInterval = setInterval(async () => {
      const memoryUsage = await this.getMemoryUsage();
      if (memoryUsage > 0) {
        this.recordMetric({
          name: 'memory_usage',
          type: 'memory',
          timestamp: Date.now(),
          metadata: {
            memoryMB: memoryUsage,
          },
        });

        // Log high memory usage (> 150MB)
        if (memoryUsage > 150) {
          logger.warn('High memory usage detected', {
            memoryMB: memoryUsage,
            threshold: 150,
          });
        }
      }
    }, 30000);
  }

  /**
   * Stop memory monitoring and clean up resources
   */
  stopMemoryMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
      logger.debug('Memory monitoring stopped');
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance metrics summary
   */
  getMetricsSummary() {
    const screenRenders = this.metrics.filter((m) => m.type === 'screen_render');
    const avgRenderTime =
      screenRenders.reduce((sum, m) => sum + (m.duration || 0), 0) / (screenRenders.length || 1);

    const slowRenders = screenRenders.filter((m) => (m.duration || 0) > 500);

    return {
      totalMetrics: this.metrics.length,
      screenRenders: screenRenders.length,
      avgRenderTime: Math.round(avgRenderTime),
      slowRenders: slowRenders.length,
      slowRenderPercentage:
        screenRenders.length > 0 ? (slowRenders.length / screenRenders.length) * 100 : 0,
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.screenRenderStart.clear();
  }

  /**
   * Cleanup all resources (call when app is closing or monitor is no longer needed)
   */
  cleanup() {
    this.stopMemoryMonitoring();
    this.clearMetrics();
    logger.debug('PerformanceMonitor cleaned up');
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * HOC to track screen render performance
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  screenName: string
): React.ComponentType<P> {
  return class PerformanceTrackedComponent extends React.Component<P> {
    componentDidMount() {
      InteractionManager.runAfterInteractions(() => {
        performanceMonitor.endScreenRender(screenName);
      });
    }

    constructor(props: P) {
      super(props);
      performanceMonitor.startScreenRender(screenName);
    }

    render() {
      return React.createElement(Component, this.props);
    }
  };
}
