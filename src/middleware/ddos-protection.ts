import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * DDoS Protection Middleware
 *
 * Multi-layer rate limiting for DDoS mitigation:
 * - Global: 100 req/sec per IP (burst protection)
 * - Sustained: 1000 req/min per IP
 * - Per-route specific limits (auth, API, webhooks)
 */

/**
 * Global DDoS protection - prevents burst attacks
 * Very short window, high limit for normal use, blocks floods
 */
export const globalDDoSLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 100, // 100 requests per second per IP
  message: {
    error: 'Too many requests. Please slow down.',
    retryAfter: 1,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip for health checks and static files
  skip: (req: Request) => {
    return req.path === '/health' || req.path.startsWith('/uploads/');
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`🛑 DDoS: Rate limit exceeded for IP ${req.ip}`, {
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: 1,
    });
  },
});

/**
 * Sustained rate limit - prevents long-term abuse
 * Longer window for normal sustained use
 */
export const sustainedRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute per IP
  message: {
    error: 'Rate limit exceeded. Please wait a moment.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return req.path === '/health';
  },
});

/**
 * Strict limiter for sensitive endpoints (login, register, password reset)
 * Already defined in rate-limit.ts, but exported here for centralization
 */
export const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: {
    error: 'Too many attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful attempts
});

/**
 * Webhook rate limit - higher limit for legitimate webhook traffic
 * But still protects against webhook abuse
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 webhooks per minute (high for MP notifications)
  message: {
    error: 'Webhook rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
