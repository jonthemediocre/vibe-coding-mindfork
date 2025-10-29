import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { logger } from '../utils/logger';
import { SentryService } from '../services/SentryService';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  /** Name of the boundary for logging (e.g., 'AuthFlow', 'FoodScanner') */
  name?: string;
  /** Enable automatic retry attempts */
  autoRetry?: boolean;
  /** Custom error handler */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Production-ready Error Boundary component
 * Features:
 * - Catches React errors and prevents app crashes
 * - User-friendly error messages
 * - Automatic error reporting to Sentry
 * - Retry mechanism
 * - "Report Bug" functionality
 * - Named boundaries for better debugging
 */
export class ErrorBoundary extends Component<Props, State> {
  private readonly MAX_RETRIES = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { name, onError } = this.props;

    // Add breadcrumb for context
    SentryService.addBreadcrumb({
      message: `Error caught in ${name || 'ErrorBoundary'}`,
      category: 'error-boundary',
      level: 'error',
      data: {
        componentStack: errorInfo.componentStack,
        errorName: error.name,
        errorMessage: error.message,
      },
    });

    // Log error with full context
    logger.error(`Error Boundary caught error${name ? ` in ${name}` : ''}`, error, {
      boundary: name || 'root',
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    // Report to Sentry
    SentryService.captureError(error, {
      boundary: name || 'root',
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Auto-retry if enabled and under max retries
    if (this.props.autoRetry && this.state.retryCount < this.MAX_RETRIES) {
      setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 1000 * (this.state.retryCount + 1)); // Exponential backoff
    }
  }

  resetError = () => {
    logger.info(`Error Boundary reset${this.props.name ? ` in ${this.props.name}` : ''}`);

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  handleReportBug = () => {
    const { error, errorInfo } = this.state;
    const { name } = this.props;

    if (!error) return;

    const errorReport = `
Error Location: ${name || 'Unknown'}
Error Type: ${error.name}
Error Message: ${error.message}

Stack Trace:
${error.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}
    `.trim();

    Alert.alert(
      'Report Bug',
      'This error has been automatically logged. Would you like to contact support?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy Error Details',
          onPress: () => {
            // In a real app, you'd copy to clipboard or open email
            Alert.alert('Error Details', errorReport, [
              { text: 'OK' }
            ]);
          },
        },
      ]
    );
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { name } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(error, this.resetError);
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😔</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>

            {name && (
              <Text style={styles.location}>
                Error in: {name}
              </Text>
            )}

            <Text style={styles.message}>
              We're sorry, but something unexpected happened. The error has been automatically reported.
            </Text>

            {retryCount > 0 && (
              <Text style={styles.retryInfo}>
                Retry attempt {retryCount} of {this.MAX_RETRIES}
              </Text>
            )}

            {__DEV__ && error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText}>{error.toString()}</Text>
                {error.stack && (
                  <Text style={styles.errorStack}>{error.stack}</Text>
                )}
                {this.state.errorInfo?.componentStack && (
                  <>
                    <Text style={styles.errorTitle}>Component Stack:</Text>
                    <Text style={styles.errorStack}>{this.state.errorInfo.componentStack}</Text>
                  </>
                )}
              </ScrollView>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={this.resetError}>
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.reportButton]}
                onPress={this.handleReportBug}
              >
                <Text style={styles.buttonText}>Report Bug</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Screen-level Error Boundary for individual screen protection
 * Usage: Wrap individual screens to provide isolated error handling
 */
export class ScreenErrorBoundary extends Component<
  Omit<Props, 'name'> & { screenName: string },
  State
> {
  render() {
    const { screenName, children, ...props } = this.props;

    return (
      <ErrorBoundary
        {...props}
        name={`${screenName}Screen`}
        autoRetry={true}
        fallback={(error, resetError) => (
          <View style={styles.screenError}>
            <View style={styles.screenErrorContent}>
              <Text style={styles.screenErrorEmoji}>⚠️</Text>
              <Text style={styles.screenErrorTitle}>
                Error loading {screenName}
              </Text>
              <Text style={styles.screenErrorMessage}>
                Something went wrong while loading this screen.
              </Text>
              <TouchableOpacity
                style={styles.screenErrorButton}
                onPress={resetError}
              >
                <Text style={styles.buttonText}>Reload</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      >
        {children}
      </ErrorBoundary>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  location: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryInfo: {
    fontSize: 14,
    color: '#f59e0b',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorDetails: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    maxHeight: 300,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  errorStack: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  reportButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Screen-level error boundary styles
  screenError: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  screenErrorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  screenErrorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  screenErrorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  screenErrorMessage: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  screenErrorButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
});
