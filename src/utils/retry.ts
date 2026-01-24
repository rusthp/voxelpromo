import { logger } from './logger';

/**
 * Retry configuration
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (excluding initial attempt, default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds between retries (default: 1000ms) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000ms) */
  maxDelay?: number;
  /** Maximum total duration for all attempts in milliseconds (default: 8000ms) */
  maxTotalDuration?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Legacy: List of retryable error strings */
  retryableErrors?: string[];
  /** Function to determine if error should trigger a retry */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /** Enable jitter to prevent thundering herd (default: true) */
  enableJitter?: boolean;
  /** Optional context for logging (default: 'operation') */
  context?: string;
}

/**
 * Default retry options (approved in Phase 2 design review)
 */
const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  maxTotalDuration: 8000, // 8 seconds total (approved: prevents request hanging)
  backoffMultiplier: 2,
  enableJitter: true,
  context: 'operation',
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'Network Error',
    'timeout',
    'InvalidApiPath',
    'InsufficientPermission',
  ],
  shouldRetry: (error: any) => {
    // Retry on network errors and 5xx server errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }
    if (error.response?.status >= 500 && error.response?.status < 600) {
      return true;
    }
    // Don't retry on 4xx client errors (bad request, unauthorized, etc)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }
    // Fallback to retryableErrors list
    const errorMessage = error.message || error.toString() || '';
    const errorCode = error.code || '';
    return defaultOptions.retryableErrors.some(
      (retryable) =>
        errorMessage.toLowerCase().includes(retryable.toLowerCase()) ||
        errorCode.toLowerCase().includes(retryable.toLowerCase())
    );
  },
};

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
const calculateDelay = (
  attempt: number,
  baseDelay: number,
  multiplier: number,
  maxDelay: number,
  enableJitter: boolean
): number => {
  const exponentialDelay = Math.min(baseDelay * Math.pow(multiplier, attempt), maxDelay);

  if (enableJitter) {
    // Add random jitter between 0% and 25% of the delay to prevent thundering herd
    const jitter = exponentialDelay * Math.random() * 0.25;
    return Math.floor(exponentialDelay + jitter);
  }

  return exponentialDelay;
};

/**
 * Check if error is retryable using legacy error list (fallback)
 */
const isRetryableError = (error: any, retryableErrors: string[]): boolean => {
  if (!error) return false;

  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';

  return retryableErrors.some(
    (retryable) =>
      errorMessage.toLowerCase().includes(retryable.toLowerCase()) ||
      errorCode.toLowerCase().includes(retryable.toLowerCase())
  );
};

/**
 * Retry a function with exponential backoff, jitter, and total timeout
 *
 * Features (approved in Phase 2 design review):
 * - Exponential backoff (1s → 2s → 4s)
 * - Total timeout enforcement (8s max)
 * - Jitter to prevent thundering herd
 * - Smart retry predicate (5xx yes, 4xx no)
 * - Structured logging with context
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail or timeout exceeded
 *
 * @example
 * ```typescript
 * const data = await retryWithBackoff(
 *   () => axios.get('https://api.example.com/data'),
 *   { context: 'fetch user data', maxRetries: 3 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Check if we've exceeded total duration BEFORE attempting
      const elapsed = Date.now() - startTime;
      if (elapsed >= opts.maxTotalDuration) {
        logger.error(
          `❌ ${opts.context}: Exceeded maximum total duration of ${opts.maxTotalDuration}ms`,
          { elapsed, maxTotalDuration: opts.maxTotalDuration }
        );
        throw new Error(
          `Operation "${opts.context}" exceeded maximum duration of ${opts.maxTotalDuration}ms`
        );
      }

      // Log retry attempt (skip first attempt)
      if (attempt > 0) {
        logger.info(`🔄 ${opts.context}: Retry attempt ${attempt}/${opts.maxRetries}`, {
          attempt,
          elapsed: Date.now() - startTime,
        });
      }

      // Execute the function
      const result = await fn();

      // Log success if this was a retry
      if (attempt > 0) {
        logger.info(`✅ ${opts.context}: Retry successful after ${attempt} attempt(s)`, {
          totalDuration: Date.now() - startTime,
        });
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if we should retry using custom predicate or fallback
      const shouldRetryError = opts.shouldRetry
        ? opts.shouldRetry(error, attempt)
        : isRetryableError(error, opts.retryableErrors);

      const isLastAttempt = attempt === opts.maxRetries;

      if (isLastAttempt || !shouldRetryError) {
        logger.error(`❌ ${opts.context}: All retry attempts failed or non-retryable error`, {
          totalAttempts: attempt + 1,
          totalDuration: Date.now() - startTime,
          error: error.message,
          errorCode: error.code,
          statusCode: error.response?.status,
          shouldRetry: shouldRetryError,
        });
        throw error;
      }

      // Calculate delay for next retry with exponential backoff and jitter
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.backoffMultiplier,
        opts.maxDelay,
        opts.enableJitter
      );

      // Check if delay would exceed total duration
      const elapsed = Date.now() - startTime;
      if (elapsed + delay >= opts.maxTotalDuration) {
        logger.warn(`⚠️ ${opts.context}: Next retry would exceed total duration, aborting`, {
          elapsed,
          delay,
          maxTotalDuration: opts.maxTotalDuration,
        });
        throw new Error(
          `Operation "${opts.context}" would exceed maximum duration of ${opts.maxTotalDuration}ms`
        );
      }

      // Log retry warning
      logger.warn(
        `⚠️ ${opts.context}: Attempt ${attempt + 1}/${opts.maxRetries + 1} failed, retrying in ${delay}ms`,
        {
          error: error.message,
          errorCode: error.code,
          statusCode: error.response?.status,
          delay,
        }
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry with different strategies (primary + fallback)
 * Useful for trying an advanced API method, then falling back to a simpler one
 *
 * @example
 * ```typescript
 * const data = await retryWithFallback(
 *   () => generateAffiliateLink(url), // Try advanced API
 *   () => generateParametrizedLink(url), // Fallback to simple params
 *   { context: 'generate affiliate link' }
 * );
 * ```
 */
export async function retryWithFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  try {
    return await retryWithBackoff(primaryFn, options);
  } catch (error: any) {
    logger.warn(`${options.context || 'Primary'} method failed, trying fallback: ${error.message}`);
    try {
      return await retryWithBackoff(fallbackFn, { ...options, maxRetries: 2 });
    } catch (fallbackError: any) {
      logger.error(
        `Both primary and fallback methods failed for ${options.context || 'operation'}`
      );
      throw fallbackError;
    }
  }
}
