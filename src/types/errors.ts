/**
 * Custom Error Types
 * Provides strongly-typed errors for better error handling across the app
 */

/**
 * Base class for all application errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    originalError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * AI Service Errors
 */
export class AIServiceError extends AppError {
  constructor(
    message: string,
    public readonly provider: "openai" | "anthropic" | "grok",
    statusCode?: number,
    originalError?: Error
  ) {
    super(message, `AI_${provider.toUpperCase()}_ERROR`, statusCode, originalError);
  }
}

export class AITimeoutError extends AIServiceError {
  constructor(provider: "openai" | "anthropic" | "grok", timeoutMs: number) {
    super(
      `AI request timed out after ${timeoutMs}ms`,
      provider,
      408
    );
  }
}

export class AIRateLimitError extends AIServiceError {
  constructor(
    provider: "openai" | "anthropic" | "grok",
    public readonly retryAfter?: number
  ) {
    super(
      `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ""}`,
      provider,
      429
    );
  }
}

export class AIInvalidRequestError extends AIServiceError {
  constructor(provider: "openai" | "anthropic" | "grok", reason: string) {
    super(`Invalid request: ${reason}`, provider, 400);
  }
}

/**
 * Network Errors
 */
export class NetworkError extends AppError {
  constructor(message: string, statusCode?: number, originalError?: Error) {
    super(message, "NETWORK_ERROR", statusCode, originalError);
  }
}

export class NetworkTimeoutError extends NetworkError {
  constructor(timeoutMs: number) {
    super(`Network request timed out after ${timeoutMs}ms`, 408);
  }
}

export class NetworkOfflineError extends NetworkError {
  constructor() {
    super("No internet connection", 0);
  }
}

/**
 * Authentication Errors
 */
export class AuthError extends AppError {
  constructor(message: string, code: string, originalError?: Error) {
    super(message, code, 401, originalError);
  }
}

export class AuthSessionExpiredError extends AuthError {
  constructor() {
    super("Your session has expired. Please sign in again.", "AUTH_SESSION_EXPIRED");
  }
}

export class AuthInvalidCredentialsError extends AuthError {
  constructor() {
    super("Invalid email or password", "AUTH_INVALID_CREDENTIALS");
  }
}

/**
 * Database Errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, "DATABASE_ERROR", 500, originalError);
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(originalError?: Error) {
    super("Failed to connect to database", originalError);
  }
}

export class DatabaseQueryError extends DatabaseError {
  constructor(query: string, originalError?: Error) {
    super(`Database query failed: ${query}`, originalError);
  }
}

/**
 * Validation Errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string[]>
  ) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

/**
 * Storage Errors
 */
export class StorageError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, "STORAGE_ERROR", 500, originalError);
  }
}

/**
 * Helper to determine if an error is a specific type
 */
export function isErrorOfType<T extends AppError>(
  error: unknown,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass;
}

/**
 * Helper to extract user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Helper to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AITimeoutError) return true;
  if (error instanceof NetworkTimeoutError) return true;
  if (error instanceof NetworkOfflineError) return true;
  if (error instanceof AIRateLimitError) return true;

  if (error instanceof AppError) {
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return retryableCodes.includes(error.statusCode || 0);
  }

  return false;
}
