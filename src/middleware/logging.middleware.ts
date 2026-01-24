import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Extend Express Request to include correlationId
 */
declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
    startTime?: number;
  }
}

/**
 * Logging middleware - adds correlationId and logs requests/responses
 *
 * Features:
 * - Generates unique correlationId for each request
 * - Adds to X-Correlation-ID header
 * - Logs request and response
 * - Measures response time
 * - Detects slow requests (>3s)
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  req.startTime = Date.now();

  // Add to response header
  res.setHeader('X-Correlation-ID', correlationId);

  // Log incoming request
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - (req.startTime || Date.now());

    // Log response
    const logData = {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request failed with client error', logData);
    } else if (duration > 3000) {
      // Slow request detection
      logger.warn('Slow request detected', { ...logData, threshold: '3000ms' });
    } else {
      logger.info('Request completed', logData);
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Create a child logger with correlation context
 * Use this in route handlers to maintain correlation
 */
export function getCorrelationLogger(req: Request) {
  return logger.child({
    correlationId: req.correlationId,
  });
}
