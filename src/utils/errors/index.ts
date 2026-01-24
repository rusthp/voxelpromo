import { AppError } from './AppError';

/**
 * Validation Error (400 Bad Request)
 * User provided invalid data
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, {
      statusCode: 400,
      isOperational: true,
      errorCode: 'VALIDATION_ERROR',
      context,
    });
  }
}

/**
 * Not Found Error (404 Not Found)
 * Requested resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, {
      statusCode: 404,
      isOperational: true,
      errorCode: 'NOT_FOUND',
      context: { resource, ...context },
    });
  }
}

/**
 * Unauthorized Error (401 Unauthorized)
 * Authentication failed or missing
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, {
      statusCode: 401,
      isOperational: true,
      errorCode: 'UNAUTHORIZED',
      context,
    });
  }
}

/**
 * Forbidden Error (403 Forbidden)
 * User lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', context?: Record<string, any>) {
    super(message, {
      statusCode: 403,
      isOperational: true,
      errorCode: 'FORBIDDEN',
      context,
    });
  }
}

/**
 * External API Error (502 Bad Gateway)
 * External service failed
 */
export class ExternalAPIError extends AppError {
  constructor(
    message: string,
    context?: Record<string, any> & { service?: string; endpoint?: string }
  ) {
    super(message, {
      statusCode: 502,
      isOperational: true,
      errorCode: 'EXTERNAL_API_ERROR',
      context,
    });
  }
}

/**
 * Database Error (500 Internal Server Error)
 * Database operation failed
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      isOperational: true,
      errorCode: 'DATABASE_ERROR',
      context,
    });
  }
}

/**
 * Rate Limit Error (429 Too Many Requests)
 * Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, {
      statusCode: 429,
      isOperational: true,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      context,
    });
  }
}

/**
 * Timeout Error (504 Gateway Timeout)
 * Operation timed out
 */
export class TimeoutError extends AppError {
  constructor(message: string = 'Operation timed out', context?: Record<string, any>) {
    super(message, {
      statusCode: 504,
      isOperational: true,
      errorCode: 'TIMEOUT',
      context,
    });
  }
}

/**
 * Configuration Error (500 Internal Server Error)
 * System misconfiguration (non-operational)
 */
export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      isOperational: false, // This is a programming error
      errorCode: 'CONFIGURATION_ERROR',
      context,
    });
  }
}

// Re-export base class
export { AppError };
