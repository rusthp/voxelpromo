import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Centralized Error Handling Middleware
 *
 * This middleware:
 * - Catches all unhandled errors
 * - Converts generic errors to AppError
 * - Returns consistent JSON response format
 * - Logs errors with full context
 * - Never exposes stack traces in production
 * - Differentiates operational vs programming errors
 *
 * MUST be registered AFTER all routes
 */
export function errorMiddleware(
  error: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Extract correlation ID if available
  const correlationId = req.correlationId || 'unknown';

  // Convert to AppError if it's a generic Error
  let appError: AppError;
  if (AppError.isAppError(error)) {
    appError = error;
  } else {
    // Generic error - treat as internal server error
    appError = new AppError(error.message || 'An unexpected error occurred', {
      statusCode: 500,
      isOperational: false, // Generic errors are not operational
      errorCode: 'INTERNAL_ERROR',
      context: {
        originalError: error.name,
        stack: error.stack,
      },
    });
  }

  // Log the error with full context
  const logContext = {
    correlationId,
    errorCode: appError.errorCode,
    statusCode: appError.statusCode,
    isOperational: appError.isOperational,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    context: appError.context,
  };

  if (appError.isOperational) {
    // Operational error - expected, log as warning
    logger.warn(`Operational error: ${appError.message}`, logContext);
  } else {
    // Programming error - unexpected, log as error with full stack
    logger.error(`Programming error: ${appError.message}`, {
      ...logContext,
      stack: appError.stack,
    });

    // For non-operational errors, we might want to alert/monitor
    // TODO: Future - send to error tracking service (Sentry, etc)
  }

  // Build error response
  const errorResponse: any = {
    success: false,
    error: {
      message: appError.message,
      code: appError.errorCode,
      statusCode: appError.statusCode,
      correlationId,
    },
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = appError.stack;
    if (appError.context) {
      errorResponse.error.context = appError.context;
    }
  }

  // Send response
  res.status(appError.statusCode).json(errorResponse);
}

/**
 * Handler for 404 Not Found
 * Use this BEFORE the error middleware but AFTER all routes
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
      statusCode: 404,
      correlationId: req.correlationId || 'unknown',
    },
  });
}

/**
 * Async route handler wrapper
 * Catches errors in async route handlers and passes to error middleware
 *
 * @example
 * ```typescript
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await UserService.getAll();
 *   res.json(users);
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
