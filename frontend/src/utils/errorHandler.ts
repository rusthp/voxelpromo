// Error handling utilities

interface ApiError {
    response?: {
        data?: {
            error?: string;
            message?: string;
        };
    };
    message?: string;
}

/**
 * Extracts a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
    if (!error) return fallback;

    // Handle API errors with response data
    if (typeof error === 'object' && error !== null) {
        const apiError = error as ApiError;

        // Check response.data.error first (most common API pattern)
        if (apiError.response?.data?.error) {
            return apiError.response.data.error;
        }

        // Check response.data.message
        if (apiError.response?.data?.message) {
            return apiError.response.data.message;
        }

        // Check direct message property
        if (apiError.message) {
            return apiError.message;
        }
    }

    // Handle string errors
    if (typeof error === 'string') {
        return error;
    }

    return fallback;
}

/**
 * Checks if an error indicates an expired token
 */
export function isTokenExpiredError(error: unknown): boolean {
    const message = getErrorMessage(error, '').toLowerCase();
    return message.includes('expirado') ||
        message.includes('expired') ||
        message.includes('invalid_grant');
}

/**
 * Checks if an error indicates missing configuration
 */
export function isMissingConfigError(error: unknown): boolean {
    const message = getErrorMessage(error, '').toLowerCase();
    return message.includes('client id') ||
        message.includes('client secret') ||
        message.includes('configure');
}
