import { logger } from './logger';

/**
 * Retry configuration
 */
interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

/**
 * Default retry options
 */
const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
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
};

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if error is retryable
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
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await fn();

      if (attempt > 0) {
        logger.info(`✅ Retry successful after ${attempt} attempt(s)`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      const shouldRetry =
        attempt < opts.maxRetries && isRetryableError(error, opts.retryableErrors);

      if (!shouldRetry) {
        logger.warn(`❌ Max retries reached or non-retryable error: ${error.message}`);
        throw error;
      }

      // Log retry attempt
      logger.warn(
        `⚠️ Attempt ${attempt + 1}/${opts.maxRetries + 1} failed: ${error.message}. ` +
          `Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Retry with different strategies
 */
export async function retryWithFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  try {
    return await retryWithBackoff(primaryFn, options);
  } catch (error: any) {
    logger.warn(`Primary method failed, trying fallback: ${error.message}`);
    try {
      return await retryWithBackoff(fallbackFn, { ...options, maxRetries: 2 });
    } catch (fallbackError: any) {
      logger.error(`Both primary and fallback methods failed`);
      throw fallbackError;
    }
  }
}
