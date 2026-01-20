/**
 * Domain Types for VoxelPromo
 * 
 * Centralized type definitions for core business entities.
 * These types replace `any` throughout the codebase.
 */

// ============================================================
// Subscription Types
// ============================================================

export type SubscriptionStatus =
    | 'authorized'    // Active subscription
    | 'pending'       // Waiting for payment confirmation
    | 'paused'        // User paused
    | 'cancelled'     // User cancelled (may still have access until nextBillingDate)
    | 'past_due';     // Payment failed

export type AccessType = 'recurring' | 'fixed';

export interface SubscriptionData {
    status: SubscriptionStatus;
    planId: string;
    planName?: string;
    nextBillingDate?: Date;
    accessType?: AccessType;
    subscriptionId?: string;
    payerId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// ============================================================
// Payment Types
// ============================================================

export type PaymentStatus =
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'refunded'
    | 'cancelled'
    | 'in_process'
    | 'in_mediation'
    | 'charged_back';

export type PaymentMethodId =
    | 'pix'
    | 'bolbradesco'
    | 'visa'
    | 'mastercard'
    | 'elo'
    | 'hipercard'
    | 'amex'
    | string; // Allow other methods

export interface PaymentResult {
    success: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    error?: string;
}

export interface PixPaymentResult extends PaymentResult {
    qrCode?: string;
    qrCodeBase64?: string;
    pixCopiaECola?: string;
    expirationDate?: string;
}

export interface BoletoPaymentResult extends PaymentResult {
    boletoUrl?: string;
    barcode?: string;
    expirationDate?: string;
}

export interface SubscriptionResult {
    success: boolean;
    subscriptionId?: string;
    status?: SubscriptionStatus;
    planId?: string;
    planName?: string;
    price?: number;
    payerId?: string;
    isTrial?: boolean;
}

// ============================================================
// Webhook Types (Mercado Pago)
// ============================================================

export interface WebhookNotification {
    type: 'payment' | 'plan' | 'subscription' | 'invoice' | string;
    data: {
        id: string;
    };
    action?: string;
    api_version?: string;
    date_created?: string;
    live_mode?: boolean;
}

export interface WebhookProcessResult {
    processed: boolean;
    reason?: string;
    paymentId?: number;
    status?: PaymentStatus;
    statusDetail?: string;
    userId?: string;
    planId?: string;
    amount?: number;
    paymentMethod?: string;
    externalReference?: string;
}

// ============================================================
// Auth Types
// ============================================================

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface UserAuthPayload {
    id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
}

export interface JwtPayload {
    id: string;
    username: string;
    role: string;
    iat?: number;
    exp?: number;
}

// ============================================================
// Error Types
// ============================================================

export interface ServiceError {
    message: string;
    code?: string;
    status?: number;
    cause?: Error;
}

/**
 * Type guard for error objects
 */
export function isServiceError(error: unknown): error is ServiceError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as ServiceError).message === 'string'
    );
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (isServiceError(error)) return error.message;
    return 'Erro desconhecido';
}

// ============================================================
// Plan Types
// ============================================================

export type BillingCycle = 'monthly' | 'yearly';
export type PlanTier = 'free' | 'trial' | 'pro' | 'premium';

export interface PlanConfig {
    id: string;
    displayName: string;
    price: number; // in cents
    billingCycle: BillingCycle;
    features: string[];
    limits?: {
        offersPerDay?: number;
        channels?: string[];
    };
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}
