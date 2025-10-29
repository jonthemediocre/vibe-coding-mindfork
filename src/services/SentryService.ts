import * as Sentry from '@sentry/react-native';
import { ENV } from '../config/env';

export class SentryService {
  private static initialized = false;

  /**
   * Initialize Sentry error tracking
   */
  static init() {
    if (this.initialized) return;

    // Skip Sentry in development if no DSN is provided
    if (!ENV.SENTRY_DSN) {
      console.log('Sentry DSN not provided, skipping initialization');
      return;
    }

    try {
      Sentry.init({
        dsn: ENV.SENTRY_DSN,
        debug: __DEV__,
        environment: ENV.APP_ENV,
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
        tracesSampleRate: ENV.APP_ENV === 'production' ? 0.2 : 1.0,
        beforeSend(event) {
          // Filter out development errors if needed
          if (__DEV__ && event.exception) {
            console.log('Sentry would send:', event);
          }
          return event;
        },
      });

      this.initialized = true;
      console.log('Sentry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Capture an error
   */
  static captureError(error: Error, context?: Record<string, any>) {
    if (!this.initialized) return;

    try {
      Sentry.captureException(error, {
        contexts: context,
      });
    } catch (err) {
      console.error('Failed to capture error in Sentry:', err);
    }
  }

  /**
   * Capture a message
   */
  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.initialized) return;

    try {
      Sentry.captureMessage(message, level);
    } catch (err) {
      console.error('Failed to capture message in Sentry:', err);
    }
  }

  /**
   * Set user context
   */
  static setUser(user: { id: string; email?: string; name?: string } | null) {
    if (!this.initialized) return;

    try {
      if (user) {
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.name,
        });
      } else {
        Sentry.setUser(null);
      }
    } catch (err) {
      console.error('Failed to set user in Sentry:', err);
    }
  }

  /**
   * Add breadcrumb
   */
  static addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }) {
    if (!this.initialized) return;

    try {
      Sentry.addBreadcrumb(breadcrumb);
    } catch (err) {
      console.error('Failed to add breadcrumb in Sentry:', err);
    }
  }
}
