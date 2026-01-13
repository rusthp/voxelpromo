import rateLimit from 'express-rate-limit';


/**
 * Rate limiting configurations for different endpoint types
 */

// Strict rate limit for authentication endpoints (prevents brute force)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: true,
});

// Rate limit for registration (prevent spam accounts)
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: {
        error: 'Limite de cadastros atingido. Tente novamente em 1 hora.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limit for collection endpoint (expensive operation)
export const collectionLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1, // 1 collection per minute
    message: {
        error: 'Aguarde 1 minuto antes de iniciar outra coleta.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limit for posting offers (prevent spam)
export const postLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute  
    max: 5, // 5 posts per minute
    message: {
        error: 'Limite de postagens atingido. Aguarde 1 minuto.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limit (prevents abuse)
export const apiLimiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 10, // 10 requests per second
    message: {
        error: 'Muitas requisições. Aguarde um momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Refresh token rate limit (prevent token farming)
export const refreshLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 refresh attempts per minute
    message: {
        error: 'Muitas tentativas de renovação de token. Aguarde 1 minuto.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Configuration endpoint limit (sensitive operations)
export const configLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 config updates per minute
    message: {
        error: 'Muitas alterações de configuração. Aguarde 1 minuto.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Password reset rate limit (prevent email bombing and brute force)
export const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes per IP
    message: {
        error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
