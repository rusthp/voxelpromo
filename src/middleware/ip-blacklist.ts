import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * IP Blacklist Service
 * 
 * MONITOR MODE: Logs suspicious activity without blocking
 * Can be upgraded to BLOCK MODE after validation in production
 * 
 * Detects:
 * - Repeated 429 (rate limited) responses
 * - Suspicious patterns (multiple auth failures from same IP)
 * - Known malicious user agents
 */

// In-memory store for suspicious IPs (for production, use Redis)
const suspiciousIPs = new Map<string, {
    count: number;
    firstSeen: Date;
    lastSeen: Date;
    reasons: string[];
}>();

// Whitelist for trusted IPs (internal, admin)
const whitelist = new Set<string>([
    '127.0.0.1',
    '::1',
    'localhost'
]);

// Known malicious patterns
const maliciousUserAgents = [
    'sqlmap',
    'nikto',
    'masscan',
    'nmap',
    'hydra',
    'burp',
    'dirbuster'
];

/**
 * Check if IP is whitelisted
 */
function isWhitelisted(ip: string): boolean {
    return whitelist.has(ip) || ip.startsWith('192.168.') || ip.startsWith('10.');
}

/**
 * Check for malicious user agent
 */
function hasMaliciousUserAgent(userAgent: string | undefined): boolean {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    return maliciousUserAgents.some(pattern => ua.includes(pattern));
}

/**
 * Record suspicious activity for an IP
 */
export function recordSuspiciousActivity(ip: string, reason: string): void {
    if (isWhitelisted(ip)) return;

    const existing = suspiciousIPs.get(ip);
    if (existing) {
        existing.count++;
        existing.lastSeen = new Date();
        if (!existing.reasons.includes(reason)) {
            existing.reasons.push(reason);
        }
    } else {
        suspiciousIPs.set(ip, {
            count: 1,
            firstSeen: new Date(),
            lastSeen: new Date(),
            reasons: [reason]
        });
    }

    const record = suspiciousIPs.get(ip)!;

    // Log high-risk IPs (5+ incidents)
    if (record.count === 5) {
        logger.warn(`⚠️ SECURITY: IP ${ip} flagged as suspicious`, {
            count: record.count,
            reasons: record.reasons,
            firstSeen: record.firstSeen,
            lastSeen: record.lastSeen
        });
    }

    // Log critical IPs (20+ incidents)
    if (record.count === 20) {
        logger.error(`🔴 SECURITY: IP ${ip} HIGHLY SUSPICIOUS - Consider blocking`, {
            count: record.count,
            reasons: record.reasons
        });
    }
}

/**
 * IP Monitoring Middleware
 * Currently in MONITOR mode - logs but doesn't block
 * 
 * To enable BLOCK mode, uncomment the blocking logic below
 */
export function ipMonitorMiddleware(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Skip whitelisted IPs
    if (isWhitelisted(ip)) {
        return next();
    }

    // Check for malicious user agent
    const userAgent = req.get('user-agent');
    if (hasMaliciousUserAgent(userAgent)) {
        recordSuspiciousActivity(ip, 'malicious_user_agent');
        logger.warn(`🔍 Malicious user agent detected from ${ip}: ${userAgent}`);

        // BLOCK MODE (uncomment to enable):
        // return res.status(403).json({ error: 'Access denied' });
    }

    // Check suspicious patterns
    const record = suspiciousIPs.get(ip);
    if (record && record.count >= 50) {
        logger.warn(`🔍 Highly suspicious IP accessing: ${ip}`, {
            path: req.path,
            method: req.method,
            count: record.count
        });

        // BLOCK MODE (uncomment to enable):
        // return res.status(403).json({ 
        //     error: 'Access temporarily denied due to suspicious activity',
        //     retryAfter: 86400 // 24 hours
        // });
    }

    // Track rate limit violations
    res.on('finish', () => {
        if (res.statusCode === 429) {
            recordSuspiciousActivity(ip, 'rate_limited');
        }
        if (res.statusCode === 401 && req.path.includes('/auth/login')) {
            recordSuspiciousActivity(ip, 'failed_login');
        }
        if (res.statusCode === 423) {
            recordSuspiciousActivity(ip, 'account_locked');
        }
    });

    next();
}

/**
 * Get all suspicious IPs (for admin dashboard)
 */
export function getSuspiciousIPs(): Array<{
    ip: string;
    count: number;
    reasons: string[];
    firstSeen: Date;
    lastSeen: Date;
}> {
    const results: Array<{
        ip: string;
        count: number;
        reasons: string[];
        firstSeen: Date;
        lastSeen: Date;
    }> = [];

    suspiciousIPs.forEach((value, key) => {
        results.push({
            ip: key,
            ...value
        });
    });

    return results.sort((a, b) => b.count - a.count);
}

/**
 * Clear suspicious IP records (daily cleanup)
 */
export function cleanupOldRecords(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let cleaned = 0;
    suspiciousIPs.forEach((value, key) => {
        if (value.lastSeen < oneDayAgo) {
            suspiciousIPs.delete(key);
            cleaned++;
        }
    });

    if (cleaned > 0) {
        logger.info(`🧹 Cleaned ${cleaned} old suspicious IP records`);
    }
}

// Auto-cleanup every 6 hours
setInterval(cleanupOldRecords, 6 * 60 * 60 * 1000);
