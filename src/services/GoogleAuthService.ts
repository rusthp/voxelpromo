/**
 * Google Auth Service
 *
 * Handles Google OAuth 2.0 ID Token verification and user management.
 * Uses Google's tokeninfo endpoint for secure server-side validation.
 *
 * Security:
 * - Validates ID token with Google API
 * - Checks email_verified flag (required)
 * - Never overwrites local user without explicit linking
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ============================================================
// Types
// ============================================================

export interface GoogleUserInfo {
    googleId: string;
    email: string;
    emailVerified: boolean;
    name: string;
    givenName?: string;
    familyName?: string;
    picture?: string;
}

export interface GoogleTokenPayload {
    sub: string; // Google user ID
    email: string;
    email_verified: boolean;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    aud: string; // Client ID
    iss: string; // Issuer
    exp: number; // Expiration
}

// ============================================================
// Service
// ============================================================

class GoogleAuthService {
    private clientId: string | undefined;

    constructor() {
        this.clientId = process.env.GOOGLE_CLIENT_ID;
    }

    /**
     * Check if Google OAuth is configured
     */
    isConfigured(): boolean {
        return !!this.clientId;
    }

    /**
     * Get client ID for frontend
     */
    getClientId(): string | undefined {
        return this.clientId;
    }

    /**
     * Verify Google ID Token and extract user info
     *
     * SECURITY:
     * - Validates token with Google's API
     * - Checks audience (client ID)
     * - Requires email_verified = true
     *
     * @param idToken - The ID token from Google Sign-In
     * @returns GoogleUserInfo if valid
     * @throws Error if token is invalid or email not verified
     */
    async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
        if (!this.clientId) {
            throw new Error('Google OAuth not configured');
        }

        try {
            // Verify token with Google's tokeninfo endpoint
            // This is the recommended approach for server-side validation
            const response = await axios.get<GoogleTokenPayload>(
                `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
            );

            const payload = response.data;

            // Validate audience (must match our client ID)
            if (payload.aud !== this.clientId) {
                logger.warn('Google token audience mismatch', {
                    expected: this.clientId,
                    received: payload.aud,
                });
                throw new Error('Invalid token audience');
            }

            // Validate issuer
            const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
            if (!validIssuers.includes(payload.iss)) {
                logger.warn('Google token issuer invalid', { issuer: payload.iss });
                throw new Error('Invalid token issuer');
            }

            // CRITICAL: Require verified email
            if (!payload.email_verified) {
                logger.warn('Google login attempt with unverified email', { email: payload.email });
                throw new Error('Google email not verified');
            }

            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                throw new Error('Token expired');
            }

            logger.info(`✅ Google token verified for: ${payload.email}`);

            return {
                googleId: payload.sub,
                email: payload.email.toLowerCase(),
                emailVerified: payload.email_verified,
                name: payload.name,
                givenName: payload.given_name,
                familyName: payload.family_name,
                picture: payload.picture,
            };
        } catch (error: any) {
            // Handle axios errors
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 400) {
                    throw new Error('Invalid Google token');
                }
                logger.error('Google token verification failed:', error.response?.data);
            }
            throw error;
        }
    }

    /**
     * Verify Google Access Token (for implicit flow)
     * 
     * Uses Google's userinfo endpoint to validate access token
     * and get user information.
     *
     * @param accessToken - The access token from Google Sign-In
     * @returns GoogleUserInfo if valid
     * @throws Error if token is invalid
     */
    async verifyAccessToken(accessToken: string): Promise<GoogleUserInfo> {
        try {
            // Get user info using access token
            const response = await axios.get<{
                sub: string;
                email: string;
                email_verified: boolean;
                name: string;
                given_name?: string;
                family_name?: string;
                picture?: string;
            }>('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const payload = response.data;

            // CRITICAL: Require verified email
            if (!payload.email_verified) {
                logger.warn('Google login attempt with unverified email', { email: payload.email });
                throw new Error('Google email not verified');
            }

            logger.info(`✅ Google access token verified for: ${payload.email}`);

            return {
                googleId: payload.sub,
                email: payload.email.toLowerCase(),
                emailVerified: payload.email_verified,
                name: payload.name,
                givenName: payload.given_name,
                familyName: payload.family_name,
                picture: payload.picture,
            };
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error('Invalid or expired access token');
                }
                logger.error('Google access token verification failed:', error.response?.data);
            }
            throw error;
        }
    }

    /**
     * Verify any Google token (ID token or access token)
     * Tries ID token first, falls back to access token
     */
    async verifyToken(token: string): Promise<GoogleUserInfo> {
        // Try as ID token first
        try {
            return await this.verifyIdToken(token);
        } catch {
            // Fall back to access token
            return await this.verifyAccessToken(token);
        }
    }
}

// Singleton instance
let googleAuthServiceInstance: GoogleAuthService | null = null;

/**
 * Get the Google Auth Service instance
 */
export function getGoogleAuthService(): GoogleAuthService {
    if (!googleAuthServiceInstance) {
        googleAuthServiceInstance = new GoogleAuthService();
    }
    return googleAuthServiceInstance;
}

export { GoogleAuthService };
