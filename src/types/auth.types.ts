/**
 * Auth Types for VoxelPromo
 *
 * Type definitions for authentication routes and middleware.
 */

import { Request } from 'express';

// ============================================================
// JWT & Session Types
// ============================================================

export interface JwtPayload {
  id: string;
  username: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ============================================================
// Request Body Types
// ============================================================

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RegisterRequestBody {
  username: string;
  email: string;
  password: string;
  accountType?: 'individual' | 'company';
  cpf?: string;
  cnpj?: string;
}

export interface RefreshTokenBody {
  refreshToken: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  password: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface ResendVerificationBody {
  email: string;
}

// ============================================================
// Extended Request Types
// ============================================================

/**
 * Request with authenticated user payload
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ============================================================
// Response Types
// ============================================================

export interface AuthSuccessResponse {
  success: true;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    role?: string;
  };
}

export interface AuthErrorResponse {
  success?: false;
  error: string;
  requiresVerification?: boolean;
  lockedUntil?: Date;
}

// ============================================================
// Mongoose Error Types
// ============================================================

/**
 * MongoDB duplicate key error (code 11000)
 */
export interface MongoDBDuplicateError extends Error {
  code: number;
  keyPattern: Record<string, number>;
}

/**
 * Mongoose validation error
 */
export interface MongooseValidationError extends Error {
  name: 'ValidationError';
  errors: Record<string, { message: string }>;
}

/**
 * Type guard for MongoDB duplicate key error
 */
export function isMongoDBDuplicateError(error: unknown): error is MongoDBDuplicateError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as MongoDBDuplicateError).code === 11000
  );
}

/**
 * Type guard for Mongoose validation error
 */
export function isMongooseValidationError(error: unknown): error is MongooseValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as MongooseValidationError).name === 'ValidationError'
  );
}
