import Stripe from 'stripe';
import { logger } from '../../utils/logger';
import { getPlan } from '../../config/plans.config';
import { IPaymentService, SubscriptionResult, PaymentResult, WebhookResult } from './IPaymentService';
import { getErrorMessage } from '../../types/domain.types';

export class StripeService implements IPaymentService {
    private stripe: Stripe;

    constructor() {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            logger.warn('⚠️ STRIPE_SECRET_KEY not configured. Stripe features disabled.');
        }

        this.stripe = new Stripe(secretKey || 'dummy_key', {
            apiVersion: '2023-10-16' as any, // Suppress strict version check
        });
    }

    async createCheckout(userId: string, planId: string, userEmail: string, _userName?: string, options?: { hasUsedTrial?: boolean }): Promise<SubscriptionResult> {
        try {
            const plan = getPlan(planId);
            if (!plan) throw new Error(`Invalid plan: ${planId}`);

            // Legacy internal trial logic - deprecated but kept for safety if plan.id is 'trial'
            if (plan.id === 'trial') {
                return { success: true, status: 'authorized', planId: 'trial', planName: 'Trial' };
            }

            const backUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

            // Determine if we should offer a trial
            let trialPeriodDays: number | undefined;
            if (options?.hasUsedTrial === false && (planId === 'pro' || planId === 'agency')) {
                // Configure trial period (e.g. 7 days)
                trialPeriodDays = 7;
            }

            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'subscription',
                customer_email: userEmail,
                line_items: [
                    {
                        price_data: {
                            currency: 'brl',
                            product_data: {
                                name: `VoxelPromo - ${plan.displayName}`,
                                description: `Assinatura ${plan.billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`,
                            },
                            unit_amount: plan.price, // Stripe expects cents
                            recurring: {
                                interval: plan.billingCycle === 'yearly' ? 'year' : 'month',
                            },
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${backUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${backUrl}/pricing`, // Redirect back to pricing if cancelled
                client_reference_id: userId,
                metadata: {
                    userId,
                    planId,
                    userEmail
                },
                subscription_data: {
                    metadata: {
                        userId,
                        planId
                    },
                    trial_period_days: trialPeriodDays,
                    trial_settings: trialPeriodDays ? {
                        end_behavior: {
                            missing_payment_method: 'cancel' // If card fails at end of trial, cancel it
                        }
                    } : undefined
                }
            });

            return {
                success: true,
                initPoint: session.url || '', // Stripe Checkout URL
                subscriptionId: session.id, // This is session ID, not subscription ID yet
                status: 'pending',
                planId: plan.id,
                planName: plan.displayName,
                price: plan.price
            };

        } catch (error: unknown) {
            logger.error('Error creating Stripe checkout:', error);
            throw new Error(`Erro ao criar checkout Stripe: ${getErrorMessage(error)}`);
        }
    }

    async createPortalSession(customerId: string): Promise<{ url: string }> {
        try {
            const backUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
            const session = await this.stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: `${backUrl}/settings/billing`,
            });
            return { url: session.url };
        } catch (error) {
            logger.error('Error creating Stripe portal session:', error);
            throw new Error('Erro ao criar sessão do portal de faturamento.');
        }
    }

    // Not used for Stripe in this flow (Checkout handles it)
    async createSubscription(_data: any): Promise<SubscriptionResult> {
        throw new Error('Method not implemented for Stripe (Use createCheckout)');
    }

    async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }> {
        try {
            // subscriptionId here refers to Stripe Subscription ID (sub_...)
            await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true,
            });

            return {
                success: true,
                status: 'cancelled', // It's actually "active" until period end, but we treat intent as cancelled
            };
        } catch (error: unknown) {
            logger.error(`Error cancelling Stripe subscription ${subscriptionId}:`, error);
            throw new Error('Erro ao cancelar assinatura Stripe.');
        }
    }

    async pauseSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }> {
        try {
            await this.stripe.subscriptions.update(subscriptionId, {
                pause_collection: {
                    behavior: 'mark_uncollectible' // Stops billing
                }
            });
            return { success: true, status: 'paused' };
        } catch (error) {
            logger.error('Error pausing Stripe subscription:', error);
            throw new Error('Erro ao pausar assinatura Stripe.');
        }
    }

    async reactivateSubscription(subscriptionId: string): Promise<{ success: boolean; status: string }> {
        try {
            // Convert "cancel at period end" back to active OR unpause
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

            const updateParams: Stripe.SubscriptionUpdateParams = {};

            if (subscription.cancel_at_period_end) {
                updateParams.cancel_at_period_end = false;
            }

            if (subscription.pause_collection) {
                updateParams.pause_collection = ''; // Remove pause
            }

            await this.stripe.subscriptions.update(subscriptionId, updateParams);

            return { success: true, status: 'authorized' };
        } catch (error) {
            logger.error('Error reactivating Stripe subscription:', error);
            throw new Error('Erro ao reativar assinatura Stripe.');
        }
    }

    async getSubscriptionDetails(subscriptionId: string): Promise<any> {
        return await this.stripe.subscriptions.retrieve(subscriptionId);
    }

    // NOTE: Pix and Boleto are NOT handled by Stripe in this architecture (handled by Mercado Pago)
    async createPixPayment(_data: any): Promise<PaymentResult> {
        throw new Error('Pix via Stripe not implemented (Use Mercado Pago)');
    }

    async createBoletoPayment(_data: any): Promise<PaymentResult> {
        throw new Error('Boleto via Stripe not implemented (Use Mercado Pago)');
    }

    async processWebhookNotification(_notificationData: any): Promise<WebhookResult> {
        // Implementation pending - will be called by controller with raw body/signature
        // This method signature in IPaymentService might need adjustment if we pass express req directly
        // For now, assume notificationData IS the event object constructed elsewhere
        return { processed: false }; // Placeholder
    }

    verifyWebhookSignature(_signature: string, _requestId: string, _body: any): boolean {
        // Stripe verification uses raw body buffer, which we might not have easily here if body parser is already run
        // Validation is usually done in the controller before calling service
        return true;
    }

    /**
     * Helper to construct event from raw body (must be called in Controller)
     */
    constructEvent(rawBody: string | Buffer, signature: string): Stripe.Event {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!endpointSecret) throw new Error('STRIPE_WEBHOOK_SECRET missing');
        return this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    }
}
