import { MercadoPagoConfig, Preference, Payment, PreApproval } from 'mercadopago';
import { logger } from '../../utils/logger';
import { getPlan } from '../../config/plans.config';
import crypto from 'crypto';
import {
    WebhookNotification,
    PaymentStatus,
    getErrorMessage,
} from '../../types/domain.types';
import { IPaymentService, SubscriptionResult, PaymentResult, WebhookResult } from './IPaymentService';

/**
 * Mercado Pago Payment Service
 * Handles Pix, Boleto, and Legacy Card Subscriptions
 */
export class MercadoPagoService implements IPaymentService {
    private client: MercadoPagoConfig;
    private preference: Preference;
    private payment: Payment;
    private preApproval: PreApproval;

    constructor() {
        const accessToken = process.env.MP_ACCESS_TOKEN;

        if (!accessToken) {
            logger.warn('⚠️ MP_ACCESS_TOKEN not configured. Payment features disabled.');
            // throw new Error('Mercado Pago not configured'); // Don't throw here to allow app startup even if MP is down/missing, but methods will fail
        }

        this.client = new MercadoPagoConfig({
            accessToken: accessToken || 'dummy_token',
            options: { timeout: 5000 },
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
    }): Promise<SubscriptionResult> {
        try {
            const plan = getPlan(data.planId);
            if (!plan) {
                throw new Error(`Invalid plan: ${data.planId}`);
            }

            // Trial plans logic (handled in Factory or Service wrapper, but kept here for compatibility)
            if (plan.id === 'trial') {
                // Logic usually handled before calling payment provider, but kept for legacy support
                return { success: true, status: 'authorized', planId: 'trial', planName: 'Trial' };
            }

            const backUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

            // Create subscription using PreApproval API
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

            logger.info(
                `MP Subscription created for user ${data.userId}, plan ${data.planId}: ${response.id}`
            );

            return {
                success: true,
                subscriptionId: response.id?.toString() || '',
                status: response.status || 'unknown',
                planId: plan.id,
                planName: plan.displayName,
                price: plan.price,
                payerId: response.payer_id?.toString() || '',
            };
        } catch (error: unknown) {
            logger.error('Error creating MP subscription:', error);

            const errorMsg = getErrorMessage(error);
            let userMessage = 'Erro ao processar pagamento via Mercado Pago.';
            if (errorMsg.includes('invalid_token')) {
                userMessage = 'Token de cartão inválido. Verifique os dados e tente novamente.';
            } else if (errorMsg.includes('rejected')) {
                userMessage = 'Pagamento recusado pela operadora.';
            } else if (errorMsg.includes('insufficient_funds')) {
                userMessage = 'Saldo insuficiente no cartão.';
            }

            throw new Error(userMessage);
        }
    }

    /**
     * Cancel a subscription (user keeps access until nextBillingDate)
     */
    async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }> {
        try {
            logger.info(`Cancelling MP subscription: ${subscriptionId}`);

            const response = await this.preApproval.update({
                id: subscriptionId,
                body: { status: 'cancelled' },
            });

            return {
                success: response.status === 'cancelled',
                status: response.status || 'unknown',
            };
        } catch (error: unknown) {
            logger.error(`Error cancelling MP subscription ${subscriptionId}:`, error);
            throw new Error('Erro ao cancelar assinatura no Mercado Pago.');
        }
    }

    /**
     * Pause a subscription
     */
    async pauseSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }> {
        try {
            logger.info(`Pausing MP subscription: ${subscriptionId}`);

            const response = await this.preApproval.update({
                id: subscriptionId,
                body: { status: 'paused' },
            });

            return {
                success: response.status === 'paused',
                status: response.status || 'unknown',
            };
        } catch (error: unknown) {
            logger.error(`Error pausing MP subscription ${subscriptionId}:`, error);
            throw new Error('Erro ao pausar assinatura no Mercado Pago.');
        }
    }

    /**
     * Reactivate a subscription
     */
    async reactivateSubscription(
        subscriptionId: string
    ): Promise<{ success: boolean; status: string }> {
        try {
            logger.info(`Reactivating MP subscription: ${subscriptionId}`);

            const response = await this.preApproval.update({
                id: subscriptionId,
                body: { status: 'authorized' },
            });

            return {
                success: response.status === 'authorized',
                status: response.status || 'unknown',
            };
        } catch (error: unknown) {
            logger.error(`Error reactivating MP subscription ${subscriptionId}:`, error);
            throw new Error('Erro ao reativar assinatura no Mercado Pago.');
        }
    }

    /**
     * Get subscription details from Mercado Pago
     */
    async getSubscriptionDetails(subscriptionId: string): Promise<any> {
        try {
            const response = await this.preApproval.get({ id: subscriptionId });
            return response;
        } catch (error: unknown) {
            logger.error(`Error fetching MP subscription ${subscriptionId}:`, error);
            throw new Error('Erro ao buscar detalhes da assinatura.');
        }
    }

    /**
     * Create a checkout preference (Useful for Smart Checkout, but usage is being deprecated for Stripe)
     * Kept for legacy support or if we want to use MP Checkout for some reason
     */
    async createCheckout(userId: string, planId: string, userEmail: string, userName?: string, _options?: { hasUsedTrial?: boolean }): Promise<SubscriptionResult> {
        try {
            const plan = getPlan(planId);
            if (!plan) throw new Error(`Invalid plan: ${planId}`);

            if (plan.id === 'trial') return { success: true, status: 'authorized', planId: 'trial' };

            const backUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

            const preferenceData = {
                items: [
                    {
                        id: plan.id,
                        title: `VoxelPromo - ${plan.displayName}`,
                        description: `Assinatura ${plan.billingCycle === 'monthly' ? 'mensal' : 'anual'}`,
                        quantity: 1,
                        unit_price: plan.price / 100,
                        currency_id: 'BRL',
                    },
                ],
                payer: {
                    name: userName || 'Cliente',
                    email: userEmail,
                },
                back_urls: {
                    success: `${backUrl}/payment/success`,
                    failure: `${backUrl}/payment/failure`,
                    pending: `${backUrl}/payment/pending`,
                },
                notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/payments/webhook`,
                external_reference: `${userId}-${planId}-${Date.now()}`,
                statement_descriptor: 'VOXELPROMO',
            };

            const response = await this.preference.create({ body: preferenceData });

            return {
                success: true,
                initPoint: response.init_point,
                status: 'pending',
                planId: plan.id,
                planName: plan.displayName,
                price: plan.price
            };
        } catch (error: unknown) {
            logger.error('Error creating MP checkout:', error);
            throw new Error(`Failed to create MP checkout: ${getErrorMessage(error)}`);
        }
    }

    /**
     * Create a Pix payment
     */
    async createPixPayment(data: {
        userId: string;
        planId: string;
        payerEmail: string;
        payerCpf: string;
        amount: number;
    }): Promise<PaymentResult> {
        try {
            const plan = getPlan(data.planId);
            if (!plan) throw new Error(`Plano inválido: ${data.planId}`);

            const cleanCpf = data.payerCpf.replace(/\D/g, '');
            if (cleanCpf.length !== 11) throw new Error('CPF deve ter 11 dígitos');

            // Set expiration to 30 minutes
            const expirationDate = new Date();
            expirationDate.setMinutes(expirationDate.getMinutes() + 30);

            const paymentData = {
                transaction_amount: data.amount,
                description: `VoxelPromo - ${plan.displayName}`,
                payment_method_id: 'pix',
                date_of_expiration: expirationDate.toISOString(),
                payer: {
                    email: data.payerEmail,
                    identification: {
                        type: 'CPF',
                        number: cleanCpf,
                    },
                },
                external_reference: `${data.userId}-${data.planId}-pix-${Date.now()}`,
            };

            const response = await this.payment.create({ body: paymentData });
            const pixData = response.point_of_interaction?.transaction_data;

            return {
                success: true,
                paymentId: response.id?.toString(),
                status: response.status || 'pending',
                qrCode: pixData?.qr_code,
                qrCodeBase64: pixData?.qr_code_base64,
                pixCopiaECola: pixData?.qr_code,
                expirationDate: response.date_of_expiration,
            };
        } catch (error: unknown) {
            logger.error('Error creating Pix payment:', error);
            throw new Error(getErrorMessage(error) || 'Erro ao gerar Pix.');
        }
    }

    /**
     * Create a Boleto payment
     */
    async createBoletoPayment(data: {
        userId: string;
        planId: string;
        payerEmail: string;
        payerCpf: string;
        amount: number;
    }): Promise<PaymentResult> {
        try {
            const plan = getPlan(data.planId);
            if (!plan) throw new Error(`Plano inválido: ${data.planId}`);

            const cleanCpf = data.payerCpf.replace(/\D/g, '');
            if (cleanCpf.length !== 11) throw new Error('CPF deve ter 11 dígitos');

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
                        number: cleanCpf,
                    },
                    first_name: 'Cliente',
                    last_name: 'VoxelPromo',
                },
                external_reference: `${data.userId}-${data.planId}-boleto-${Date.now()}`,
                date_of_expiration: expirationDate.toISOString(),
            };

            const response = await this.payment.create({ body: paymentData });
            const boletoData = response.transaction_details;

            return {
                success: true,
                paymentId: response.id?.toString(),
                status: response.status || 'pending',
                boletoUrl: boletoData?.external_resource_url || response.point_of_interaction?.transaction_data?.ticket_url,
                barcode: (response as any).barcode?.content,
                expirationDate: response.date_of_expiration,
            };
        } catch (error: unknown) {
            logger.error('Error creating Boleto payment:', error);
            throw new Error(getErrorMessage(error) || 'Erro ao gerar boleto.');
        }
    }

    /**
     * Process webhook notification
     */
    async processWebhookNotification(
        notificationData: WebhookNotification
    ): Promise<WebhookResult> {
        try {
            // Re-using logic from original PaymentService but adapting to interface
            const { type, data } = notificationData;

            if (type !== 'payment') {
                return { processed: false, reason: 'Not a payment notification' };
            }

            const paymentId = data.id;
            const paymentInfo = await this.payment.get({ id: paymentId });

            const externalRef = paymentInfo.external_reference || '';
            const [userId, planId] = externalRef.split('-');

            return {
                processed: true,
                paymentId: paymentInfo.id?.toString(),
                status: paymentInfo.status as PaymentStatus,
                statusDetail: paymentInfo.status_detail,
                userId,
                planId,
                amount: paymentInfo.transaction_amount,
                paymentMethod: paymentInfo.payment_method_id,
                externalReference: paymentInfo.external_reference,
            };
        } catch (error: unknown) {
            logger.error('Error processing MP webhook:', error);
            throw new Error(`Failed to process webhook: ${getErrorMessage(error)}`);
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(
        signature: string | undefined,
        requestId: string | undefined,
        body: Record<string, unknown>
    ): boolean {
        const webhookSecret = process.env.MP_WEBHOOK_SECRET;

        if (process.env.NODE_ENV === 'production' && !webhookSecret) {
            logger.error('🔴 MP_WEBHOOK_SECRET not set in production.');
            return false;
        }
        if (!webhookSecret) return true; // Dev mode

        if (!signature || !requestId) return false;

        try {
            const parts = signature.split(',').reduce((acc: Record<string, string>, part) => {
                const [key, value] = part.split('=');
                if (key && value) acc[key] = value;
                return acc;
            }, {});

            const ts = parts['ts'];
            const hash = parts['v1'];

            if (!ts || !hash) return false;

            const dataId = (body as any)?.data?.id || (body as any)?.id || '';
            const manifest = `${dataId};${requestId};${ts}`;

            const expectedHash = crypto
                .createHmac('sha256', webhookSecret)
                .update(manifest)
                .digest('hex');

            return expectedHash === hash;
        } catch (error) {
            logger.error('Error verifying MP signature:', error);
            return false;
        }
    }

    /**
     * Check if user has active access (considering cancellation grace period)
     * Static utility for use across the application
     */
    static hasAccess(
        subscription:
            | {
                status: string;
                nextBillingDate?: Date;
                accessType?: string;
            }
            | undefined
    ): boolean {
        if (!subscription) return false;

        const now = new Date();
        const nextBilling = subscription.nextBillingDate
            ? new Date(subscription.nextBillingDate)
            : null;

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
}
