
import Stripe from 'stripe';
import { UserModel } from '../../models/User';
import { LogService } from '../LogService';
import { logger } from '../../utils/logger';

export class StripeWebhookService {

    /**
     * Main entry point to handle incoming Stripe events
     */
    async handleEvent(event: Stripe.Event): Promise<boolean> {
        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
                    break;
                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                    break;
                default:
                    // Unhandled event type
                    return false;
            }
            return true;
        } catch (error: any) {
            logger.error(`Error handling Stripe webhook event ${event.type}:`, error);
            throw error;
        }
    }

    private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
        const userId = session.client_reference_id || session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId) return;

        const user = await UserModel.findById(userId);
        if (!user) return;

        // Update Access (Business Logic)
        user.access.plan = 'PRO'; // Map from planId if needed
        user.access.status = 'ACTIVE';

        // Update Billing (Source of Truth for Provider)
        user.billing.provider = 'STRIPE';
        user.billing.stripeCustomerId = session.customer as string;
        user.billing.stripeSubscriptionId = session.subscription as string;

        await user.save();

        logger.info(`✅ Stripe Checkout completed for user ${userId}`);

        // Log it
        await LogService.log({
            action: 'SUBSCRIPTION_CREATED',
            category: 'BILLING',
            resource: { type: 'Subscription', id: session.subscription as string, name: planId },
            details: { userId, provider: 'stripe' },
            actor: user
        });
    }

    private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - Stripe types definition mismatch
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) return;

        // Find user by subscription ID
        const user = await UserModel.findOne({ 'billing.stripeSubscriptionId': subscriptionId });

        if (user) {
            user.access.status = 'ACTIVE';
            await user.save();
            logger.info(`✅ Invoice paid for user ${user._id}`);
        }
    }

    private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - Stripe types definition mismatch
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) return;

        const user = await UserModel.findOne({ 'billing.stripeSubscriptionId': subscriptionId });

        if (user) {
            user.access.status = 'PAST_DUE';
            await user.save();
            logger.warn(`❌ Invoice payment failed for user ${user._id}`);
        }
    }

    private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
        const user = await UserModel.findOne({ 'billing.stripeSubscriptionId': subscription.id });

        if (user) {
            const status = subscription.status;

            if (status === 'active' || status === 'trialing') {
                user.access.status = 'ACTIVE';
                if (status === 'trialing') {
                    user.access.plan = 'TRIAL';
                    user.access.trialEndsAt = new Date(subscription.trial_end! * 1000);
                } else {
                    // If converting from trial to active
                    if (user.access.plan === 'TRIAL') user.access.plan = 'PRO';
                }
            } else if (status === 'past_due' || status === 'unpaid') {
                user.access.status = 'PAST_DUE';
            } else if (status === 'canceled' || status === 'incomplete_expired') {
                user.access.status = 'CANCELED';
            }

            await user.save();
            logger.info(`ℹ️ Subscription updated for user ${user._id}: ${status}`);
        }
    }

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
        const user = await UserModel.findOne({ 'billing.stripeSubscriptionId': subscription.id });

        if (user) {
            user.access.status = 'CANCELED';
            await user.save();
            logger.info(`🚫 Subscription deleted/canceled for user ${user._id}`);
        }
    }
}
