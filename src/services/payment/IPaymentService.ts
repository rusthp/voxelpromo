import { PaymentStatus } from '../../types/domain.types';

export interface SubscriptionResult {
    success: boolean;
    subscriptionId?: string;
    status: string;
    planId?: string;
    planName?: string;
    price?: number;
    payerId?: string;
    initPoint?: string; // For Stripe Checkout URL or MP Init Point
    preferenceId?: string; // For Mercado Pago Preference ID
    paymentMethod?: string;
}

export interface PaymentResult {
    success: boolean;
    paymentId?: string;
    status: string;
    qrCode?: string;
    qrCodeBase64?: string;
    pixCopiaECola?: string;
    boletoUrl?: string;
    barcode?: string;
    expirationDate?: string;
    amount?: number;
}

export interface RefundResult {
    success: boolean;
    refundId?: string;
    status: string;
}

export interface WebhookResult {
    processed: boolean;
    paymentId?: string;
    subscriptionId?: string;
    status?: PaymentStatus;
    statusDetail?: string;
    userId?: string;
    planId?: string;
    amount?: number;
    paymentMethod?: string;
    externalReference?: string;
    reason?: string;
    metadata?: Record<string, any>;
}

export interface IPaymentService {
    // Subscription Methods
    createSubscription(data: any): Promise<SubscriptionResult>;
    createCheckout(userId: string, planId: string, userEmail: string, userName?: string, options?: { hasUsedTrial?: boolean }): Promise<SubscriptionResult>;
    createPortalSession?(customerId: string): Promise<{ url: string }>;
    cancelSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }>;
    pauseSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }>;
    reactivateSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }>;
    getSubscriptionDetails(subscriptionId: string): Promise<any>;

    // One-time Payment Methods
    createPixPayment?(data: {
        userId: string;
        planId: string;
        payerEmail: string;
        payerCpf: string;
        amount: number;
    }): Promise<PaymentResult>;

    createBoletoPayment?(data: {
        userId: string;
        planId: string;
        payerEmail: string;
        payerCpf: string;
        amount: number;
    }): Promise<PaymentResult>;

    // Webhook
    processWebhookNotification(notificationData: any): Promise<WebhookResult>;
    verifyWebhookSignature(signature: string | undefined, requestId: string | undefined, body: any): boolean;
}
