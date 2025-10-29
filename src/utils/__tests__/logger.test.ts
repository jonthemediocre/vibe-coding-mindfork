/**
 * Tests for structured logger
 */

// Set __DEV__ to true BEFORE any imports that use it
(global as any).__DEV__ = true;

// UNMOCK the logger (it's mocked globally in jest.setup.js)
jest.unmock('../logger');

// Mock SentryService BEFORE importing logger
jest.mock('../../services/SentryService', () => ({
  SentryService: {
    captureError: jest.fn(),
    addBreadcrumb: jest.fn(),
    setUser: jest.fn(),
  },
}));

// Mock console methods BEFORE importing logger so they're in place when module loads
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

import { SentryService } from '../../services/SentryService';
import { logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log info messages', () => {
    // Verify __DEV__ is true
    expect(__DEV__).toBe(true);

    // Verify logger has expected methods
    expect(typeof logger.info).toBe('function');

    logger.info('test message');

    // In __DEV__ mode, logger should always log
    // Check if console.log was called
    expect(mockConsoleLog).toHaveBeenCalled();

    // Get the logged message
    const logCall = mockConsoleLog.mock.calls[0][0];
    expect(logCall).toContain('test message');
  });

  it('should log errors with Sentry integration', () => {
    const error = new Error('test error');
    logger.error('error occurred', error);

    expect(mockConsoleError).toHaveBeenCalled();
    expect(SentryService.captureError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('should support correlation IDs', () => {
    const correlatedLogger = logger.withCorrelationId('test-123');
    correlatedLogger.info('correlated message', { extra: 'data' });

    expect(mockConsoleLog).toHaveBeenCalled();
    const logCall = mockConsoleLog.mock.calls[0][0];
    expect(logCall).toContain('correlated message');
    // Context should include correlationId in JSON format
    expect(logCall).toMatch(/correlationId.*test-123/);
  });

  it('should include context in log entries', () => {
    logger.info('context test', { userId: '123', action: 'login' });

    const logCall = mockConsoleLog.mock.calls[0][0];
    expect(logCall).toContain('context test');
    // Context is JSON serialized, so it contains the data but not in plain text
    expect(logCall).toContain('action');
    expect(logCall).toContain('login');
    // userId is in the context JSON
    expect(logCall).toMatch(/userId|123/);
  });

  it('should support all log levels', () => {
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error', new Error('test'));

    // In __DEV__ mode, all logs should be output
    expect(mockConsoleLog).toHaveBeenCalled(); // debug and info use console.log
    expect(mockConsoleWarn).toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalled();
  });
});
