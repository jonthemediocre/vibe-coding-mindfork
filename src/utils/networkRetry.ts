import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  exponentialBase?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000,
  exponentialBase: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error?.message?.includes('network') || error?.message?.includes('timeout')) {
      return true;
    }
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    // Don't retry on 4xx client errors
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    return true;
  },
};

/**
 * Execute an async function with exponential backoff retry logic
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function call
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${opts.timeoutMs}ms`));
        }, opts.timeoutMs);
      });

      // Race between the actual request and timeout
      const result = await Promise.race([fn(), timeoutPromise]);

      if (attempt > 0) {
        logger.info(`Request succeeded after ${attempt} retries`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      const isLastAttempt = attempt === opts.maxRetries;
      const shouldRetry = opts.shouldRetry(error, attempt);

      if (isLastAttempt || !shouldRetry) {
        logger.error('Request failed after retries', error, {
          attempt,
          maxRetries: opts.maxRetries,
        });
        throw error;
      }

      // Calculate exponential backoff delay with jitter
      const baseDelay = opts.initialDelayMs * Math.pow(opts.exponentialBase, attempt);
      const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
      const delayMs = Math.min(baseDelay + jitter, opts.maxDelayMs);

      logger.warn(`Request failed, retrying in ${Math.round(delayMs)}ms (${error?.message})`, {
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
      });

      await new Promise<void>(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Wrap a Supabase query with retry logic
 */
export async function withSupabaseRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  return withRetry(async () => {
    const result = await queryFn();

    if (result.error) {
      // Convert Supabase error to throw to trigger retry logic
      const error: any = new Error(result.error.message);
      error.status = result.error.status;
      error.code = result.error.code;
      throw error;
    }

    return result;
  }, options);
}
