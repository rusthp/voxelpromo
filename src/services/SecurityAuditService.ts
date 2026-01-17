import { logger } from '../utils/logger';

/**
 * Security Audit Service
 * 
 * Centralized security event logging for forensic analysis
 * All sensitive security events are logged here with structured data
 * 
 * Events logged:
 * - Login attempts (success/failure)
 * - Password changes
 * - Account lockouts
 * - Token refresh failures
 * - Admin access
 * - Suspicious activity
 */

export enum SecurityEventType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    PASSWORD_CHANGED = 'PASSWORD_CHANGED',
    PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
    PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
    TOKEN_REFRESH_FAILURE = 'TOKEN_REFRESH_FAILURE',
    ADMIN_ACCESS = 'ADMIN_ACCESS',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
    RATE_LIMITED = 'RATE_LIMITED',
    WEBHOOK_INVALID_SIGNATURE = 'WEBHOOK_INVALID_SIGNATURE',
    UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT'
}

export interface SecurityEvent {
    type: SecurityEventType;
    userId?: string;
    username?: string;
    email?: string;
    ip: string;
    userAgent?: string;
    path?: string;
    method?: string;
    details?: Record<string, any>;
    timestamp: Date;
}

// In-memory buffer for batching logs (for production, consider async writing)
const eventBuffer: SecurityEvent[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Log a security event
 * 
 * IMPORTANT: Never log sensitive data like passwords or tokens!
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
        ...event,
        timestamp: new Date()
    };

    // Log immediately for critical events
    const criticalTypes: SecurityEventType[] = [
        SecurityEventType.ACCOUNT_LOCKED,
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecurityEventType.WEBHOOK_INVALID_SIGNATURE,
        SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT
    ];

    const logLevel = criticalTypes.includes(event.type) ? 'warn' : 'info';

    // Structured log (searchable in log aggregators)
    logger[logLevel](`🔐 SECURITY: ${event.type}`, {
        userId: fullEvent.userId,
        email: fullEvent.email ? maskEmail(fullEvent.email) : undefined,
        ip: fullEvent.ip,
        path: fullEvent.path,
        method: fullEvent.method,
        details: fullEvent.details,
        timestamp: fullEvent.timestamp.toISOString()
    });

    // Add to buffer for potential batch processing
    eventBuffer.push(fullEvent);

    // Flush buffer if full
    if (eventBuffer.length >= MAX_BUFFER_SIZE) {
        flushBuffer();
    }
}

/**
 * Mask email for logging (privacy protection)
 */
function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';

    const maskedLocal = local.length > 2
        ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
        : local[0] + '*';

    return `${maskedLocal}@${domain}`;
}

/**
 * Flush event buffer (for batch processing)
 */
function flushBuffer(): void {
    if (eventBuffer.length === 0) return;

    // In production, this could write to a separate security log file
    // or send to a SIEM (Security Information and Event Management) system
    logger.debug(`📝 Flushing ${eventBuffer.length} security events`);
    eventBuffer.length = 0;
}

/**
 * Get recent security events (for monitoring dashboard)
 */
export function getRecentEvents(limit: number = 50): SecurityEvent[] {
    return eventBuffer.slice(-limit);
}

/**
 * Convenience methods for common events
 */
export const SecurityAudit = {
    loginSuccess: (userId: string, email: string, ip: string, userAgent?: string) => {
        logSecurityEvent({
            type: SecurityEventType.LOGIN_SUCCESS,
            userId,
            email,
            ip,
            userAgent
        });
    },

    loginFailure: (email: string, ip: string, userAgent?: string, reason?: string) => {
        logSecurityEvent({
            type: SecurityEventType.LOGIN_FAILURE,
            email,
            ip,
            userAgent,
            details: { reason }
        });
    },

    accountLocked: (userId: string, email: string, ip: string, attempts: number) => {
        logSecurityEvent({
            type: SecurityEventType.ACCOUNT_LOCKED,
            userId,
            email,
            ip,
            details: { attempts }
        });
    },

    passwordChanged: (userId: string, ip: string) => {
        logSecurityEvent({
            type: SecurityEventType.PASSWORD_CHANGED,
            userId,
            ip
        });
    },

    suspiciousActivity: (ip: string, reason: string, details?: Record<string, any>) => {
        logSecurityEvent({
            type: SecurityEventType.SUSPICIOUS_ACTIVITY,
            ip,
            details: { reason, ...details }
        });
    },

    rateLimited: (ip: string, path: string, method: string) => {
        logSecurityEvent({
            type: SecurityEventType.RATE_LIMITED,
            ip,
            path,
            method
        });
    },

    webhookInvalidSignature: (ip: string, details?: Record<string, any>) => {
        logSecurityEvent({
            type: SecurityEventType.WEBHOOK_INVALID_SIGNATURE,
            ip,
            details
        });
    }
};
