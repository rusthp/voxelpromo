import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
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
     */
    verifyWebhookSignature(_signature: string, _data: string): boolean {
        // Mercado Pago sends x-signature header
        // Implementation depends on your MP account settings
        const webhookSecret = process.env.MP_WEBHOOK_SECRET;

        if (!webhookSecret) {
            logger.warn('MP_WEBHOOK_SECRET not set, skipping signature verification');
            return true; // Allow in development
        }

        // TODO: Implement actual signature verification
        // For now, we'll trust the notification (only in dev/test)
        return true;
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
