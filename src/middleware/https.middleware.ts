import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * HTTPS Enforcement Middleware
 * Forces HTTPS in production to protect sensitive data
 * 
 * CRITICAL for production: All traffic must be encrypted
 */
export function forceHttpsMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip HTTPS enforcement in development and test environments
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    // Check if request is secure
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

    if (!isSecure) {
        // Log the insecure request
        logger.warn('Insecure HTTP request in production, redirecting to HTTPS', {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Redirect to HTTPS
        const secureUrl = `https://${req.headers.host}${req.url}`;
        return res.redirect(301, secureUrl);
    }

    // Request is already secure, proceed
    next();
}

/**
 * Security Headers Middleware
 * Additional headers for production security
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
    if (process.env.NODE_ENV === 'production') {
        // Strict Transport Security: force HTTPS for 1 year
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

        // Prevent clickjacking
        res.setHeader('X-Frame-Options', 'DENY');

        // Prevent MIME sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // XSS Protection (legacy browsers)
        res.setHeader('X-XSS-Protection', '1; mode=block');

        // Referrer Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    next();
}
