import { Router, Request, Response } from 'express';
import { getPaymentService } from '../services/PaymentService';
import { UserModel } from '../models/User';
import { LogService } from '../services/LogService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/payments/create-checkout
 * Create a Mercado Pago checkout for a subscription plan
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/create-checkout', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { planId } = req.body;
        const userId = req.user!.id;

        if (!planId) {
            res.status(400).json({ success: false, error: 'Plan ID is required' });
            return;
        }

        // Get user info
        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        // Create checkout
        const paymentService = getPaymentService();
        const checkout = await paymentService.createCheckout(
            userId,
            planId,
            user.email,
            user.username
        );

        // Log checkout creation
        await LogService.log({
            actor: user,
            action: 'PAYMENT_CHECKOUT_CREATED',
            category: 'BILLING',
            resource: { type: 'Checkout', id: checkout.preferenceId || 'trial', name: planId },
            details: { planId, price: checkout.price }
        });

        res.json({
            success: true,
            data: checkout
        });

    } catch (error: any) {
        logger.error('Error creating checkout:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to create checkout' });
    }
});

/**
 * POST /api/payments/webhook
 * Receive payment notifications from Mercado Pago
 * PUBLIC ROUTE - Called by Mercado Pago servers
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        logger.info('Received Mercado Pago webhook');

        const signature = req.headers['x-signature'] as string;
        const paymentService = getPaymentService();

        // Verify signature (security)
        if (!paymentService.verifyWebhookSignature(signature, JSON.stringify(req.body))) {
            logger.warn('Invalid webhook signature');
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }

        // Process notification
        const result = await paymentService.processWebhookNotification(req.body);

        if (!result.processed) {
            logger.info(`Webhook ignored: ${result.reason}`);
            res.status(200).json({ message: 'Ignored' });
            return;
        }

        // Update user subscription based on payment status
        if (result.status === 'approved' && result.userId && result.planId) {
            const user = await UserModel.findById(result.userId);

            if (user) {
                // Activate subscription
                user.subscription = {
                    planId: result.planId,
                    status: 'active',
                    startDate: new Date(),
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                    mpPaymentId: String(result.paymentId)
                };

                await user.save();

                // Log successful payment
                await LogService.log({
                    action: 'PAYMENT_APPROVED',
                    category: 'BILLING',
                    resource: { type: 'Payment', id: String(result.paymentId), name: result.planId },
                    details: {
                        userId: result.userId,
                        planId: result.planId,
                        amount: result.amount,
                        paymentMethod: result.paymentMethod
                    },
                    actor: user
                });

                logger.info(`✅ Subscription activated for user ${result.userId}, plan ${result.planId}`);
            }
        } else if (result.status === 'rejected' || result.status === 'cancelled') {
            // Log failed payment
            await LogService.log({
                action: 'PAYMENT_FAILED',
                category: 'BILLING',
                resource: { type: 'Payment', id: String(result.paymentId), name: result.planId || 'unknown' },
                details: {
                    userId: result.userId,
                    status: result.status,
                    statusDetail: result.statusDetail
                },
                status: 'FAILURE'
            });

            logger.warn(`❌ Payment ${result.paymentId} failed: ${result.statusDetail}`);
        }

        res.status(200).json({ message: 'Webhook processed successfully' });

    } catch (error: any) {
        logger.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/payments/status/:preferenceId
 * Check payment status (for frontend polling)
 * PROTECTED ROUTE - Requires authentication
 */
router.get('/status/:preferenceId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        // preferenceId could be used for detailed lookup in future
        const userId = req.user!.id;

        // Get user's current subscription status
        const user = await UserModel.findById(userId).select('subscription');

        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        res.json({
            success: true,
            data: {
                subscription: user.subscription || { planId: 'trial', status: 'active' }
            }
        });

    } catch (error: any) {
        logger.error('Error checking payment status:', error);
        res.status(500).json({ success: false, error: 'Failed to check payment status' });
    }
});

export { router as paymentRoutes };
