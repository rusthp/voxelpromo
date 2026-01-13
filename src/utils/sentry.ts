import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * 
 * CRITICAL for production: Captures unhandled errors, tracks performance,
 * and provides real-time alerts for issues.
 * 
 * Environment variables required:
 * - SENTRY_DSN: Your Sentry project DSN (Data Source Name)
 * - SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - SENTRY_TRACES_SAMPLE_RATE: Percentage of transactions to trace (0.0 - 1.0)
 */
export function initializeSentry(): void {
    const sentryDsn = process.env.SENTRY_DSN;
    const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

    // Skip Sentry in development if DSN not configured
    if (!sentryDsn) {
        if (environment === 'production') {
            logger.error('🔴 CRITICAL: SENTRY_DSN not configured in production!');
            logger.error('   Error tracking is DISABLED. Configure Sentry immediately.');
        } else {
            logger.warn('⚠️ Sentry not configured (SENTRY_DSN missing). Error tracking disabled.');
        }
        return;
    }

    try {
        Sentry.init({
            dsn: sentryDsn,
            environment,

            // Performance Monitoring
            integrations: [
                nodeProfilingIntegration(),
            ],

            // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
            // We recommend adjusting this value in production:
            // - development: 1.0 (100%)
            // - staging: 0.5 (50%)  
            // - production: 0.1 (10%)
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

            // Set sampling rate for profiling
            // This is relative to tracesSampleRate
            profilesSampleRate: 1.0,

            // Configure release tracking (optional but recommended)
            release: process.env.npm_package_version || 'unknown',

            // BeforeSend hook to filter/modify events before sending
            beforeSend(event, _hint) {
                // Filter out errors from development
                if (environment === 'development' && !process.env.SENTRY_DEV_MODE) {
                    return null;
                }

                // Log locally for debugging
                logger.debug('Sentry event captured:', {
                    eventId: event.event_id,
                    level: event.level,
                    message: event.message,
                });

                return event;
            },

            // Ignore specific errors (add patterns as needed)
            ignoreErrors: [
                // Browser errors (if frontend sends to same DSN)
                /^ResizeObserver/,
                /^Non-Error/,
                // Network errors
                /Network request failed/,
                /timeout/i,
            ],
        });

        logger.info('✅ Sentry initialized successfully', {
            environment,
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        });

    } catch (error: any) {
        logger.error('Failed to initialize Sentry:', error);
    }
}

/**
 * Capture exception manually (use for caught errors you want to track)
 */
export function captureException(error: Error, context?: Record<string, any>): void {
    if (context) {
        Sentry.setContext('additional', context);
    }
    Sentry.captureException(error);
    logger.error('Exception captured by Sentry:', error);
}

/**
 * Capture message manually (use for important logs/warnings)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    Sentry.captureMessage(message, level);
    logger.info(`Message captured by Sentry (${level}):`, message);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string; username?: string }): void {
    Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
    });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext(): void {
    Sentry.setUser(null);
}

export { Sentry };
