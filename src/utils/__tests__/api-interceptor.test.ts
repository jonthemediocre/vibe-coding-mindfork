/**
 * Tests for API interceptor
 */

// Set __DEV__ to true for tests
(global as any).__DEV__ = true;

// Mock SentryService and logger before imports
jest.mock('../../services/SentryService', () => ({
  SentryService: {
    addBreadcrumb: jest.fn(),
  },
}));

jest.mock('../logger', () => ({
  logger: {
    withCorrelationId: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

import { apiInterceptor } from '../api-interceptor';

describe('ApiInterceptor', () => {
  beforeEach(() => {
    apiInterceptor.reset();
    jest.clearAllMocks();
  });

  it('should instrument successful API requests', async () => {
    const mockRequest = jest.fn().mockResolvedValue({ data: 'test' });

    const result = await apiInterceptor.instrumentRequest(
      '/test/endpoint',
      'GET',
      mockRequest
    );

    expect(result).toEqual({ data: 'test' });
    expect(mockRequest).toHaveBeenCalledWith(expect.any(String)); // correlation ID
  });

  it('should capture API errors', async () => {
    const mockError = new Error('API failed');
    const mockRequest = jest.fn().mockRejectedValue(mockError);

    await expect(
      apiInterceptor.instrumentRequest('/test/endpoint', 'POST', mockRequest)
    ).rejects.toThrow('API failed');
  });

  it('should record metrics for endpoints', async () => {
    const mockRequest = jest.fn().mockResolvedValue({ data: 'test' });

    await apiInterceptor.instrumentRequest('/test/endpoint', 'GET', mockRequest);
    await apiInterceptor.instrumentRequest('/test/endpoint', 'GET', mockRequest);

    const metrics = apiInterceptor.getEndpointMetrics('/test/endpoint');
    expect(metrics.totalRequests).toBe(2);
    expect(metrics.successCount).toBe(2);
    expect(metrics.failureCount).toBe(0);
    expect(metrics.errorRate).toBe(0);
  });

  it('should calculate performance percentiles', async () => {
    const mockRequest = jest.fn().mockResolvedValue({ data: 'test' });

    // Make multiple requests
    for (let i = 0; i < 10; i++) {
      await apiInterceptor.instrumentRequest('/test/endpoint', 'GET', mockRequest);
    }

    const metrics = apiInterceptor.getEndpointMetrics('/test/endpoint');
    expect(metrics.avgDuration).toBeGreaterThanOrEqual(0);
    expect(metrics.p95Duration).toBeGreaterThanOrEqual(0);
    expect(metrics.p99Duration).toBeGreaterThanOrEqual(0);
  });

  it('should track error rates correctly', async () => {
    const successRequest = jest.fn().mockResolvedValue({ data: 'ok' });
    const failRequest = jest.fn().mockRejectedValue(new Error('fail'));

    await apiInterceptor.instrumentRequest('/test/endpoint', 'GET', successRequest);

    try {
      await apiInterceptor.instrumentRequest('/test/endpoint', 'GET', failRequest);
    } catch {}

    const metrics = apiInterceptor.getEndpointMetrics('/test/endpoint');
    expect(metrics.totalRequests).toBe(2);
    expect(metrics.successCount).toBe(1);
    expect(metrics.failureCount).toBe(1);
    expect(metrics.errorRate).toBe(0.5);
  });

  it('should support request timeout', async () => {
    // Create a slow request that never resolves within timeout period
    const slowRequest = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: 'late' }), 5000))
    );

    // Use fake timers to control timeout
    jest.useFakeTimers();

    const requestPromise = apiInterceptor.instrumentRequest(
      '/test/endpoint',
      'GET',
      slowRequest,
      { timeout: 100 }
    );

    // Fast-forward time past the timeout
    jest.advanceTimersByTime(101);

    // Should reject with timeout error
    await expect(requestPromise).rejects.toThrow('Request timeout');

    jest.useRealTimers();
  });

  it('should provide aggregated metrics for all endpoints', async () => {
    const mockRequest = jest.fn().mockResolvedValue({ data: 'test' });

    await apiInterceptor.instrumentRequest('/endpoint1', 'GET', mockRequest);
    await apiInterceptor.instrumentRequest('/endpoint2', 'POST', mockRequest);

    const allMetrics = apiInterceptor.getAllMetrics();
    expect(Object.keys(allMetrics)).toHaveLength(2);
    expect(allMetrics['/endpoint1']).toBeDefined();
    expect(allMetrics['/endpoint2']).toBeDefined();
  });
});
