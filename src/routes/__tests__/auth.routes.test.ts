/**
 * Auth Routes P0 Tests - Unit Test Version
 * 
 * Tests critical authentication flows using mocked models:
 * 1. Login - valid/invalid credentials, account lockout
 * 2. Refresh token - valid/expired/revoked
 * 3. Password reset - generate token, consume token
 * 
 * Uses mocked MongoDB models for fast execution without database.
 * 
 * Run: npx jest src/routes/__tests__/auth.routes.test.ts
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Disable TypeScript checking for complex jest mocks
import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import crypto from 'crypto';


// Mock dependencies before imports
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

// Mock EmailService
jest.mock('../../services/EmailService', () => ({
    getEmailService: jest.fn(() => ({
        isConfigured: jest.fn(() => false),
        sendPasswordResetEmail: jest.fn(),
        sendVerificationEmail: jest.fn()
    }))
}));

// Mock rate limiters
jest.mock('../../middleware/rate-limit', () => ({
    authLimiter: (_req: any, _res: any, next: any) => next(),
    registerLimiter: (_req: any, _res: any, next: any) => next(),
    refreshLimiter: (_req: any, _res: any, next: any) => next(),
    passwordResetLimiter: (_req: any, _res: any, next: any) => next()
}));

// Mock User Model with explicit any types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUserFindOne: jest.Mock<any> = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUserFindById: jest.Mock<any> = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUserUpdateOne: jest.Mock<any> = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUserSave: jest.Mock<any> = jest.fn();

jest.mock('../../models/User', () => ({
    UserModel: {
        findOne: (...args: any[]) => mockUserFindOne(...args),
        findById: (...args: any[]) => mockUserFindById(...args),
        updateOne: (...args: any[]) => mockUserUpdateOne(...args)
    }
}));

// Mock RefreshToken Model with explicit any types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRefreshTokenCreate: jest.Mock<any> = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRefreshTokenFindOne: jest.Mock<any> = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRefreshTokenUpdateOne: jest.Mock<any> = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRefreshTokenUpdateMany: jest.Mock<any> = jest.fn();

jest.mock('../../models/RefreshToken', () => ({
    RefreshTokenModel: {
        create: (...args: any[]) => mockRefreshTokenCreate(...args),
        findOne: (...args: any[]) => mockRefreshTokenFindOne(...args),
        updateOne: (...args: any[]) => mockRefreshTokenUpdateOne(...args),
        updateMany: (...args: any[]) => mockRefreshTokenUpdateMany(...args)
    }
}));

import { authRoutes as authRouter } from '../auth.routes';

describe('Auth Routes', () => {
    let app: Express;
    const JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars';

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        process.env.NODE_ENV = 'test';

        app = express();
        app.use(express.json());
        app.use('/api/auth', authRouter);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Helper: Create mock with select chain (properly typed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function createSelectMock(value: any) {
        return { select: jest.fn().mockResolvedValue(value) as any };
    }

    // Helper: Create mock user object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function createMockUser(overrides: Record<string, any> = {}) {
        return {
            _id: 'user-id-123',
            username: 'testuser',
            email: 'test@test.com',
            role: 'user',
            isActive: true,
            emailVerified: true,
            failedLoginAttempts: 0,
            lockUntil: undefined,
            isLocked: jest.fn(() => false) as any,
            comparePassword: jest.fn(() => Promise.resolve(true)) as any,
            save: mockUserSave.mockResolvedValue(true) as any,
            ...overrides
        };
    }

    // ============================================================
    // LOGIN - Happy Path
    // ============================================================
    describe('POST /api/auth/login', () => {
        it('should return tokens for valid credentials', async () => {
            const mockUser = createMockUser();
            mockUserFindOne.mockReturnValue(createSelectMock(mockUser));
            mockRefreshTokenCreate.mockResolvedValue({ token: 'refresh-token-123' });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'validPassword123' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.accessToken).toBeDefined();
            expect(response.body.refreshToken).toBeDefined();
        });

        it('should reject invalid password', async () => {
            const mockUser = createMockUser({
                comparePassword: jest.fn(() => Promise.resolve(false))
            });
            mockUserFindOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'wrongPassword' });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('inválidas');
        });

        it('should reject non-existent user', async () => {
            mockUserFindOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nonexistent@test.com', password: 'anyPassword' });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('inválidas');
        });

        it('should reject inactive user', async () => {
            const mockUser = createMockUser({ isActive: false });
            mockUserFindOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'validPassword123' });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('inativo');
        });

        it('should reject unverified email', async () => {
            const mockUser = createMockUser({ emailVerified: false });
            mockUserFindOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'validPassword123' });

            expect(response.status).toBe(401);
            expect(response.body.requiresVerification).toBe(true);
        });
    });

    // ============================================================
    // BRUTE FORCE PROTECTION
    // ============================================================
    describe('Account Lockout (Brute Force Protection)', () => {
        it('should block locked account', async () => {
            const mockUser = createMockUser({
                isLocked: jest.fn(() => true),
                lockUntil: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
            });
            mockUserFindOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'validPassword123' });

            expect(response.status).toBe(423); // Locked
            expect(response.body.error).toContain('bloqueada');
            expect(response.body.lockedUntil).toBeDefined();
        });

        it('should increment failed attempts on wrong password', async () => {
            const mockUser = createMockUser({
                comparePassword: jest.fn(() => Promise.resolve(false)),
                failedLoginAttempts: 2
            });
            mockUserFindOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'wrongPassword' });

            expect(response.status).toBe(401);
            expect(mockUser.save).toHaveBeenCalled();
        });
    });

    // ============================================================
    // REFRESH TOKEN
    // ============================================================
    describe('POST /api/auth/refresh', () => {
        it('should issue new access token with valid refresh token', async () => {
            const mockUser = createMockUser();
            mockRefreshTokenFindOne.mockResolvedValue({
                token: 'valid-refresh-token',
                userId: 'user-id-123',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                isRevoked: false
            });
            mockUserFindById.mockResolvedValue(mockUser);

            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'valid-refresh-token' });

            expect(response.status).toBe(200);
            expect(response.body.accessToken).toBeDefined();
        });

        it('should reject missing refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('obrigatório');
        });

        it('should reject invalid refresh token', async () => {
            mockRefreshTokenFindOne.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('inválido');
        });

        it('should reject expired refresh token', async () => {
            mockRefreshTokenFindOne.mockResolvedValue({
                token: 'expired-token',
                userId: 'user-id-123',
                expiresAt: new Date(Date.now() - 1000), // Expired
                isRevoked: false
            });

            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'expired-token' });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('expirado');
        });
    });

    // ============================================================
    // PASSWORD RESET
    // ============================================================
    describe('Password Reset Flow', () => {
        describe('POST /api/auth/forgot-password', () => {
            it('should accept valid email and return success', async () => {
                const mockUser = createMockUser();
                mockUserFindOne.mockResolvedValue(mockUser);

                const response = await request(app)
                    .post('/api/auth/forgot-password')
                    .send({ email: 'test@test.com' });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            it('should NOT reveal if email exists (security)', async () => {
                mockUserFindOne.mockResolvedValue(null); // User doesn't exist

                const response = await request(app)
                    .post('/api/auth/forgot-password')
                    .send({ email: 'nonexistent@test.com' });

                // Same response as if user exists
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });

        describe('POST /api/auth/reset-password/:token', () => {
            it('should reset password with valid token', async () => {
                const resetToken = crypto.randomBytes(32).toString('hex');
                const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

                const mockUser = createMockUser({
                    resetPasswordToken: hashedToken,
                    resetPasswordExpire: new Date(Date.now() + 15 * 60 * 1000)
                });
                mockUserFindOne.mockReturnValue({
                    select: jest.fn().mockResolvedValue(mockUser)
                });
                mockRefreshTokenUpdateMany.mockResolvedValue({ modifiedCount: 1 });

                const response = await request(app)
                    .post(`/api/auth/reset-password/${resetToken}`)
                    .send({ password: 'newSecurePassword123' });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(mockUser.save).toHaveBeenCalled();
            });

            it('should reject expired/invalid token', async () => {
                mockUserFindOne.mockReturnValue({
                    select: jest.fn().mockResolvedValue(null)
                });

                const response = await request(app)
                    .post('/api/auth/reset-password/invalid-token')
                    .send({ password: 'newSecurePassword123' });

                expect(response.status).toBe(400);
                expect(response.body.error).toContain('expirou');
            });

            it('should reject password shorter than 8 characters', async () => {
                const response = await request(app)
                    .post('/api/auth/reset-password/some-token')
                    .send({ password: 'short' });

                expect(response.status).toBe(400);
                expect(response.body.error).toContain('8 caracteres');
            });

            it('should revoke all sessions after password reset', async () => {
                const resetToken = crypto.randomBytes(32).toString('hex');
                const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

                const mockUser = createMockUser({
                    resetPasswordToken: hashedToken,
                    resetPasswordExpire: new Date(Date.now() + 15 * 60 * 1000)
                });
                mockUserFindOne.mockReturnValue({
                    select: jest.fn().mockResolvedValue(mockUser)
                });
                mockRefreshTokenUpdateMany.mockResolvedValue({ modifiedCount: 2 });

                await request(app)
                    .post(`/api/auth/reset-password/${resetToken}`)
                    .send({ password: 'newSecurePassword123' });

                expect(mockRefreshTokenUpdateMany).toHaveBeenCalledWith(
                    expect.objectContaining({ userId: mockUser._id }),
                    expect.objectContaining({ isRevoked: true })
                );
            });
        });
    });

    // ============================================================
    // TOKEN VALIDATION
    // ============================================================
    describe('GET /api/auth/validate-reset-token/:token', () => {
        it('should return valid: true for valid token', async () => {
            const resetToken = crypto.randomBytes(32).toString('hex');


            mockUserFindOne.mockReturnValue({
                select: jest.fn().mockResolvedValue({ _id: 'user-123' })
            });

            const response = await request(app)
                .get(`/api/auth/validate-reset-token/${resetToken}`);

            expect(response.status).toBe(200);
            expect(response.body.valid).toBe(true);
        });

        it('should return valid: false for invalid token', async () => {
            mockUserFindOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            const response = await request(app)
                .get('/api/auth/validate-reset-token/invalid-token');

            expect(response.status).toBe(200);
            expect(response.body.valid).toBe(false);
        });
    });
});
