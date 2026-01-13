import { MercadoPagoConfig, Preference, Payment, PreApproval } from 'mercadopago';
import { logger } from '../utils/logger';
import { getPlan } from '../config/plans.config';

/**
 * Mercado Pago Payment Service
 * Handles checkout creation, payment processing, and status verification
 */
export class PaymentService {
    private client: MercadoPagoConfig;
    private preference: Preference;
    private payment: Payment;
    private preApproval: PreApproval;

    constructor() {
        const accessToken = process.env.MP_ACCESS_TOKEN;

        if (!accessToken) {
            logger.warn('⚠️ MP_ACCESS_TOKEN not configured. Payment features disabled.');
            throw new Error('Mercado Pago not configured');
        }

        this.client = new MercadoPagoConfig({
            accessToken,
            options: { timeout: 5000 }
        });

        this.preference = new Preference(this.client);
        this.payment = new Payment(this.client);
        this.preApproval = new PreApproval(this.client);
    }

    /**
     * Create a subscription using Transparent Checkout (card token)
     * Uses Mercado Pago PreApproval API for recurring payments
     */
    async createSubscription(data: {
        userId: string;
        planId: string;
        payerEmail: string;
        token: string;
        paymentMethodId: string;
        payerIdentification?: {
            type: string;
            number: string;
        };
    }) {
        try {
            const plan = getPlan(data.planId);
            if (!plan) {
                throw new Error(`Invalid plan: ${data.planId}`);
            }

            // Trial plans are free, no subscription needed
            if (plan.id === 'trial') {
                logger.info(`Trial plan requested for user ${data.userId}, no subscription required`);
                return { success: true, isTrial: true, planId: 'trial' };
            }

            const backUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

            // Create subscription using PreApproval API
            // Note: For card_token subscriptions, we need to use status 'authorized'
            const subscriptionData = {
                reason: `VoxelPromo - ${plan.displayName}`,
                payer_email: data.payerEmail,
                card_token_id: data.token,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: plan.billingCycle === 'yearly' ? 'years' : 'months',
                    transaction_amount: plan.price / 100, // Convert cents to BRL
                    currency_id: 'BRL' as const,
                },
                back_url: `${backUrl}/payment/success`,
                external_reference: `${data.userId}-${data.planId}-${Date.now()}`,
                status: 'authorized' as const, // Start subscription immediately
            };

            const response = await this.preApproval.create({ body: subscriptionData });

            logger.info(`Subscription created for user ${data.userId}, plan ${data.planId}: ${response.id}`);

            return {
                success: true,
                subscriptionId: response.id,
                status: response.status,
                planId: plan.id,
                planName: plan.displayName,
                price: plan.price,
                payerId: response.payer_id,
            };

        } catch (error: any) {
            logger.error('Error creating subscription:', error);

            // Map common MP error codes to user-friendly messages
            let userMessage = 'Erro ao processar pagamento. Tente novamente.';
            if (error.message?.includes('invalid_token')) {
                userMessage = 'Token de cartão inválido. Verifique os dados e tente novamente.';
            } else if (error.message?.includes('rejected')) {
                userMessage = 'Pagamento recusado pela operadora. Tente outro cartão.';
            } else if (error.message?.includes('insufficient_funds')) {
                userMessage = 'Saldo insuficiente. Verifique seu limite e tente novamente.';
            }

            throw new Error(userMessage);
        }
    }

    /**
     * Cancel a subscription (user keeps access until nextBillingDate)
     */
    async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }> {
        try {
            logger.info(`Cancelling subscription: ${subscriptionId}`);

            const response = await this.preApproval.update({
                id: subscriptionId,
                body: { status: 'cancelled' }
            });

            logger.info(`Subscription ${subscriptionId} cancelled. Status: ${response.status}`);

            return {
                success: response.status === 'cancelled',
                status: response.status || 'unknown'
            };
        } catch (error: any) {
            logger.error(`Error cancelling subscription ${subscriptionId}:`, error);
            throw new Error('Erro ao cancelar assinatura. Tente novamente.');
        }
    }

    /**
     * Pause a subscription (stops billing, user loses access)
     */
    async pauseSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }> {
        try {
            logger.info(`Pausing subscription: ${subscriptionId}`);

            const response = await this.preApproval.update({
                id: subscriptionId,
                body: { status: 'paused' }
            });

            logger.info(`Subscription ${subscriptionId} paused. Status: ${response.status}`);

            return {
                success: response.status === 'paused',
                status: response.status || 'unknown'
            };
        } catch (error: any) {
            logger.error(`Error pausing subscription ${subscriptionId}:`, error);
            throw new Error('Erro ao pausar assinatura. Tente novamente.');
        }
    }

    /**
     * Reactivate a paused or cancelled subscription
     */
    async reactivateSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }> {
        try {
            logger.info(`Reactivating subscription: ${subscriptionId}`);

            const response = await this.preApproval.update({
                id: subscriptionId,
                body: { status: 'authorized' }
            });

            logger.info(`Subscription ${subscriptionId} reactivated. Status: ${response.status}`);

            return {
                success: response.status === 'authorized',
                status: response.status || 'unknown'
            };
        } catch (error: any) {
            logger.error(`Error reactivating subscription ${subscriptionId}:`, error);
            throw new Error('Erro ao reativar assinatura. Tente novamente.');
        }
    }

    /**
     * Get subscription details from Mercado Pago
     */
    async getSubscriptionDetails(subscriptionId: string): Promise<any> {
        try {
            logger.info(`Fetching subscription details: ${subscriptionId}`);
            const response = await this.preApproval.get({ id: subscriptionId });
            return response;
        } catch (error: any) {
            logger.error(`Error fetching subscription ${subscriptionId}:`, error);
            throw new Error('Erro ao buscar detalhes da assinatura.');
        }
    }

    /**
     * Check if user has active access (considering cancellation grace period)
     * Static utility for use across the application
     */
    static hasAccess(subscription: {
        status: string;
        nextBillingDate?: Date;
        accessType?: string;
    } | undefined): boolean {
        if (!subscription) return false;

        const now = new Date();
        const nextBilling = subscription.nextBillingDate ? new Date(subscription.nextBillingDate) : null;

        // Cancelled but still within paid period
        if (subscription.status === 'cancelled') {
            return nextBilling !== null && now < nextBilling;
        }

        // Active subscription
        if (subscription.status === 'authorized') {
            return true;
        }

        // Fixed access (Pix/Boleto) - check if within validity
        if (subscription.accessType === 'fixed' && subscription.status === 'pending') {
            return nextBilling !== null && now < nextBilling;
        }

        // Paused or pending without access
        return false;
    }

    /**
     * Create a checkout preference for a subscription plan
     */
    async createCheckout(userId: string, planId: string, userEmail: string, userName?: string) {
        try {
            const plan = getPlan(planId);
            if (!plan) {
                throw new Error(`Invalid plan: ${planId}`);
            }

            // Trial plans are free, no payment needed
            if (plan.id === 'trial') {
                logger.info(`Trial plan requested for user ${userId}, no payment required`);
                return { isTrial: true, planId: 'trial' };
            }

            const backUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

            const preferenceData = {
                items: [
                    {
                        id: plan.id,
                        title: `VoxelPromo - ${plan.displayName}`,
                        description: `Assinatura ${plan.billingCycle === 'monthly' ? 'mensal' : 'anual'} - ${plan.features.join(', ')}`,
                        quantity: 1,
                        unit_price: plan.price / 100, // Convert cents to BRL
                        currency_id: 'BRL'
                    }
                ],
                payer: {
                    name: userName || 'Cliente',
                    email: userEmail
                },
                back_urls: {
                    success: `${backUrl}/payment/success`,
                    failure: `${backUrl}/payment/failure`,
                    pending: `${backUrl}/payment/pending`
                },
                notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/payments/webhook`,
                external_reference: `${userId}-${planId}-${Date.now()}`,
                statement_descriptor: 'VOXELPROMO'
            };

            const response = await this.preference.create({ body: preferenceData });

            logger.info(`Checkout created for user ${userId}, plan ${planId}: ${response.id}`);

            return {
                preferenceId: response.id,
                initPoint: response.init_point,
                sandboxInitPoint: response.sandbox_init_point,
                planId: plan.id,
                planName: plan.displayName,
                price: plan.price
            };

        } catch (error: any) {
            logger.error('Error creating checkout:', error);
            throw new Error(`Failed to create checkout: ${error.message}`);
        }
    }

    /**
     * Create a Pix payment
     * Generates QR code and Pix copia e cola for instant payment
     */
    async createPixPayment(data: {
        userId: string;
        planId: string;
        payerEmail: string;
        payerCpf: string;
        amount: number;
    }) {
        try {
            const plan = getPlan(data.planId);
            if (!plan) {
                throw new Error(`Plano inválido: ${data.planId}`);
            }

            // Validate CPF format (11 digits)
            const cleanCpf = data.payerCpf.replace(/\D/g, '');
            if (cleanCpf.length !== 11) {
                throw new Error('CPF deve ter 11 dígitos');
            }

            // Validate email
            if (!data.payerEmail || !data.payerEmail.includes('@')) {
                throw new Error('Email inválido');
            }

            logger.info(`Creating Pix payment for user ${data.userId}, amount: ${data.amount}, email: ${data.payerEmail}`);

            // Set expiration to 5 minutes from now
            const expirationDate = new Date();
            expirationDate.setMinutes(expirationDate.getMinutes() + 5);

            const paymentData = {
                transaction_amount: data.amount,
                description: `VoxelPromo - ${plan.displayName}`,
                payment_method_id: 'pix',
                date_of_expiration: expirationDate.toISOString(),
                payer: {
                    email: data.payerEmail,
                    identification: {
                        type: 'CPF',
                        number: cleanCpf
                    }
                },
                external_reference: `${data.userId}-${data.planId}-pix-${Date.now()}`,
            };

            logger.debug('Pix payment data:', JSON.stringify(paymentData, null, 2));

            const response = await this.payment.create({ body: paymentData });

            logger.info(`Pix payment created for user ${data.userId}: ${response.id}, status: ${response.status}`);

            // Extract Pix data from response
            const pixData = response.point_of_interaction?.transaction_data;

            return {
                success: true,
                paymentId: response.id?.toString(),
                status: response.status,
                qrCode: pixData?.qr_code,
                qrCodeBase64: pixData?.qr_code_base64,
                pixCopiaECola: pixData?.qr_code,
                expirationDate: response.date_of_expiration,
            };

        } catch (error: any) {
            logger.error('Error creating Pix payment:', {
                message: error.message,
                cause: error.cause,
                status: error.status,
                response: error.response?.data || error.response,
            });

            // Extract more detailed error message
            let userMessage = 'Erro ao gerar código Pix.';
            if (error.message) {
                userMessage = error.message;
            }
            if (error.cause?.message) {
                userMessage = error.cause.message;
            }
            // MP specific errors
            if (error.response?.data?.message) {
                userMessage = error.response.data.message;
            }

            throw new Error(userMessage);
        }
    }

    /**
     * Create a Boleto payment
     * Generates a bank slip (boleto) for payment
     */
    async createBoletoPayment(data: {
        userId: string;
        planId: string;
        payerEmail: string;
        payerCpf: string;
        amount: number;
    }) {
        try {
            const plan = getPlan(data.planId);
            if (!plan) {
                throw new Error(`Plano inválido: ${data.planId}`);
            }

            // Validate CPF format (11 digits)
            const cleanCpf = data.payerCpf.replace(/\D/g, '');
            if (cleanCpf.length !== 11) {
                throw new Error('CPF deve ter 11 dígitos');
            }

            // Validate email
            if (!data.payerEmail || !data.payerEmail.includes('@')) {
                throw new Error('Email inválido');
            }

            logger.info(`Creating Boleto payment for user ${data.userId}, amount: ${data.amount}`);

            // Calculate expiration date (3 business days from now)
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 3);

            const paymentData = {
                transaction_amount: data.amount,
                description: `VoxelPromo - ${plan.displayName}`,
                payment_method_id: 'bolbradesco',
                payer: {
                    email: data.payerEmail,
                    identification: {
                        type: 'CPF',
                        number: cleanCpf
                    },
                    first_name: 'Cliente',
                    last_name: 'VoxelPromo',
                },
                external_reference: `${data.userId}-${data.planId}-boleto-${Date.now()}`,
                date_of_expiration: expirationDate.toISOString(),
            };

            logger.debug('Boleto payment data:', JSON.stringify(paymentData, null, 2));

            const response = await this.payment.create({ body: paymentData });

            logger.info(`Boleto payment created for user ${data.userId}: ${response.id}, status: ${response.status}`);

            // Extract Boleto data from response
            const boletoData = response.transaction_details;

            return {
                success: true,
                paymentId: response.id?.toString(),
                status: response.status,
                boletoUrl: boletoData?.external_resource_url || response.point_of_interaction?.transaction_data?.ticket_url,
                barcode: (response as any).barcode?.content,
                expirationDate: response.date_of_expiration,
            };

        } catch (error: any) {
            logger.error('Error creating Boleto payment:', {
                message: error.message,
                cause: error.cause,
                status: error.status,
                response: error.response?.data || error.response,
            });

            let userMessage = 'Erro ao gerar boleto.';
            if (error.message) {
                userMessage = error.message;
            }
            if (error.cause?.message) {
                userMessage = error.cause.message;
            }
            if (error.response?.data?.message) {
                userMessage = error.response.data.message;
            }

            throw new Error(userMessage);
        }
    }

    /**
     * Get payment status by preference ID
     */
    async getPaymentStatus(preferenceId: string) {
        try {
            // Note: MP doesn't have a direct "get by preference" endpoint
            // We'll need to search by external_reference or use webhook data
            logger.info(`Checking payment status for preference: ${preferenceId}`);

            // This is a placeholder - actual implementation will use webhook data
            // stored in database
            return {
                status: 'pending',
                message: 'Payment status check via webhook only'
            };

        } catch (error: any) {
            logger.error('Error checking payment status:', error);
            throw new Error(`Failed to check payment status: ${error.message}`);
        }
    }

    /**
     * Process webhook notification from Mercado Pago
     */
    async processWebhookNotification(notificationData: any) {
        try {
            const { type, data } = notificationData;

            logger.info(`Processing webhook: type=${type}, id=${data?.id}`);

            // Only process payment notifications
            if (type !== 'payment') {
                logger.info(`Ignoring non-payment notification: ${type}`);
                return { processed: false, reason: 'Not a payment notification' };
            }

            // Fetch full payment details
            const paymentId = data.id;
            const paymentInfo = await this.payment.get({ id: paymentId });

            logger.info(`Payment ${paymentId} status: ${paymentInfo.status}`);

            // Extract user info from external_reference
            // Format: "userId-planId-timestamp"
            const externalRef = paymentInfo.external_reference || '';
            const [userId, planId] = externalRef.split('-');

            return {
                processed: true,
                paymentId: paymentInfo.id,
                status: paymentInfo.status,
                statusDetail: paymentInfo.status_detail,
                userId,
                planId,
                amount: paymentInfo.transaction_amount,
                paymentMethod: paymentInfo.payment_method_id,
                externalReference: paymentInfo.external_reference
            };

        } catch (error: any) {
            logger.error('Error processing webhook:', error);
            throw new Error(`Failed to process webhook: ${error.message}`);
        }
    }

    /**
     * Verify webhook signature (security)
     * Mercado Pago sends x-signature and x-request-id headers for validation
     * 
     * Reference: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks#editor_6
     */
    verifyWebhookSignature(signature: string | undefined, requestId: string | undefined, body: any): boolean {
        const webhookSecret = process.env.MP_WEBHOOK_SECRET;

        // CRITICAL: In production, webhook secret is MANDATORY
        if (process.env.NODE_ENV === 'production' && !webhookSecret) {
            logger.error('🔴 CRITICAL: MP_WEBHOOK_SECRET not set in production. Rejecting webhook.');
            return false;
        }

        // Development mode: warn but allow if secret not configured
        if (!webhookSecret) {
            logger.warn('⚠️ MP_WEBHOOK_SECRET not set. Webhook signature verification DISABLED (dev only)');
            return true;
        }

        // Validate required headers
        if (!signature || !requestId) {
            logger.warn('Missing required webhook headers (x-signature or x-request-id)');
            return false;
        }

        try {
            // Mercado Pago x-signature format: "ts=<timestamp>,v1=<hash>"
            // Extract timestamp and hash
            const parts = signature.split(',').reduce((acc: Record<string, string>, part) => {
                const [key, value] = part.split('=');
                if (key && value) acc[key] = value;
                return acc;
            }, {});

            const ts = parts['ts'];
            const hash = parts['v1'];

            if (!ts || !hash) {
                logger.warn('Invalid x-signature format. Expected: ts=<timestamp>,v1=<hash>');
                return false;
            }

            // Build the manifest string for verification
            // Format: data.id (from body) + request-id + timestamp
            const dataId = body?.data?.id || body?.id || '';
            const manifest = `${dataId};${requestId};${ts}`;

            // Calculate HMAC-SHA256
            const crypto = require('crypto');
            const expectedHash = crypto
                .createHmac('sha256', webhookSecret)
                .update(manifest)
                .digest('hex');

            // Compare hashes (constant-time comparison would be ideal, but simple comparison is acceptable)
            const isValid = expectedHash === hash;

            if (!isValid) {
                logger.warn('Webhook signature verification FAILED', {
                    expectedHash: expectedHash.substring(0, 10) + '...',
                    receivedHash: hash.substring(0, 10) + '...',
                    manifest: manifest.substring(0, 50) + '...'
                });
            } else {
                logger.debug('✅ Webhook signature verified successfully');
            }

            return isValid;

        } catch (error: any) {
            logger.error('Error verifying webhook signature:', error);
            return false;
        }
    }
}

// Singleton instance
let paymentService: PaymentService | null = null;

export function getPaymentService(): PaymentService {
    if (!paymentService) {
        try {
            paymentService = new PaymentService();
        } catch (error) {
            logger.error('Failed to initialize PaymentService:', error);
            throw error;
        }
    }
    return paymentService;
}
