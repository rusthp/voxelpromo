import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { getPaymentService } from '../services/PaymentService';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
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
 * POST /api/payments/process-subscription
 * Process a subscription using Transparent Checkout (card token from frontend)
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/process-subscription', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const {
            planId,
            token,
            paymentMethodId,
            // issuerId and installments intentionally omitted - reserved for future use
            payerEmail,
            payerIdentification
        } = req.body;

        const userId = req.user!.id;

        if (!planId || !token) {
            res.status(400).json({
                success: false,
                error: 'Plan ID e token do cartão são obrigatórios'
            });
            return;
        }

        // Get user info
        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, error: 'Usuário não encontrado' });
            return;
        }

        // Create subscription via Transparent Checkout
        const paymentService = getPaymentService();
        const result = await paymentService.createSubscription({
            userId,
            planId,
            payerEmail: payerEmail || user.email,
            token,
            paymentMethodId,
            payerIdentification
        });

        if (result.success) {
            // Update user's subscription status
            user.subscription = {
                planId: result.planId!,
                status: 'authorized',
                accessType: 'recurring',
                startDate: new Date(),
                nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                mpSubscriptionId: result.subscriptionId,
                paymentMethod: 'card',
                lastPaymentDate: new Date(),
                failedAttempts: 0
            };
            await user.save();

            // Log successful subscription
            await LogService.log({
                actor: user,
                action: 'SUBSCRIPTION_CREATED',
                category: 'BILLING',
                resource: {
                    type: 'Subscription',
                    id: result.subscriptionId || 'trial',
                    name: result.planName || planId
                },
                details: {
                    planId,
                    price: result.price,
                    subscriptionId: result.subscriptionId
                }
            });

            logger.info(`✅ Subscription created for user ${userId}, plan ${planId}`);
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error: any) {
        logger.error('Error processing subscription:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao processar assinatura'
        });
    }
});

/**
 * POST /api/payments/create-pix
 * Generate a Pix payment for a subscription plan
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/create-pix', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { planId, payerEmail, payerCpf, amount } = req.body;
        const userId = req.user!.id;

        if (!planId || !payerEmail || !payerCpf) {
            res.status(400).json({
                success: false,
                error: 'Plan ID, email e CPF são obrigatórios'
            });
            return;
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, error: 'Usuário não encontrado' });
            return;
        }

        const paymentService = getPaymentService();
        const result = await paymentService.createPixPayment({
            userId,
            planId,
            payerEmail,
            payerCpf,
            amount: amount || 49.90
        });

        if (result.success) {
            await LogService.log({
                actor: user,
                action: 'PIX_PAYMENT_CREATED',
                category: 'BILLING',
                resource: { type: 'Payment', id: result.paymentId || 'pix', name: planId },
                details: { planId, method: 'pix' }
            });
        }

        res.json(result);

    } catch (error: any) {
        logger.error('Error creating Pix payment:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao gerar código Pix'
        });
    }
});

/**
 * POST /api/payments/create-boleto
 * Generate a Boleto payment for a subscription plan
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/create-boleto', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { planId, payerEmail, payerCpf, amount } = req.body;
        const userId = req.user!.id;

        if (!planId || !payerEmail || !payerCpf) {
            res.status(400).json({
                success: false,
                error: 'Plan ID, email e CPF são obrigatórios'
            });
            return;
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, error: 'Usuário não encontrado' });
            return;
        }

        const paymentService = getPaymentService();
        const result = await paymentService.createBoletoPayment({
            userId,
            planId,
            payerEmail,
            payerCpf,
            amount: amount || 49.90
        });

        if (result.success) {
            await LogService.log({
                actor: user,
                action: 'BOLETO_PAYMENT_CREATED',
                category: 'BILLING',
                resource: { type: 'Payment', id: result.paymentId || 'boleto', name: planId },
                details: { planId, method: 'boleto' }
            });
        }

        res.json(result);

    } catch (error: any) {
        logger.error('Error creating Boleto payment:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao gerar boleto'
        });
    }
});

/**
 * POST /api/payments/webhook
 * Receive payment notifications from Mercado Pago
 * PUBLIC ROUTE - Called by Mercado Pago servers
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        // Log webhook event TYPE only, not full body (security: avoid logging sensitive data)
        const { type, action, data } = req.body;
        logger.info('Received Mercado Pago webhook', {
            type,
            action,
            dataId: data?.id,
            timestamp: new Date().toISOString()
        });

        // Extract signature headers
        const signature = req.headers['x-signature'] as string;
        const requestId = req.headers['x-request-id'] as string;
        const paymentService = getPaymentService();

        // Verify signature (CRITICAL SECURITY)
        if (!paymentService.verifyWebhookSignature(signature, requestId, req.body)) {
            logger.error('🔴 Webhook signature verification FAILED. Rejecting request.', {
                hasSignature: !!signature,
                hasRequestId: !!requestId
            });
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }

        // ============================================
        // SUBSCRIPTION PREAPPROVAL EVENTS
        // ============================================
        if (type === 'subscription_preapproval' || type === 'preapproval') {
            logger.info(`Processing subscription event: action=${action}, id=${data?.id}`);

            try {
                // Fetch subscription details from MP
                const subscriptionDetails = await paymentService.getSubscriptionDetails(data.id);
                const externalRef = subscriptionDetails.external_reference || '';
                const [userId, planId] = externalRef.split('-');

                if (!userId) {
                    logger.warn(`Subscription ${data.id} has no userId in external_reference`);
                    res.status(200).json({ message: 'No user to update' });
                    return;
                }

                const user = await UserModel.findById(userId);
                if (!user) {
                    logger.warn(`User ${userId} not found for subscription ${data.id}`);
                    res.status(200).json({ message: 'User not found' });
                    return;
                }

                // Handle subscription created
                if (action === 'created') {
                    user.subscription = {
                        planId: planId || 'pro',
                        status: subscriptionDetails.status === 'authorized' ? 'authorized' : 'pending',
                        accessType: 'recurring',
                        startDate: new Date(),
                        nextBillingDate: subscriptionDetails.next_payment_date
                            ? new Date(subscriptionDetails.next_payment_date)
                            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        mpSubscriptionId: data.id,
                        paymentMethod: 'card',
                        lastPaymentDate: new Date(),
                        failedAttempts: 0
                    };
                    await user.save();
                    logger.info(`✅ Subscription created for user ${userId}, plan ${planId}`);
                }

                // Handle subscription updated (status change)
                if (action === 'updated' && user.subscription) {
                    const mpStatus = subscriptionDetails.status;

                    // Map MP status to our status
                    let newStatus: 'authorized' | 'pending' | 'paused' | 'cancelled' = 'pending';
                    if (mpStatus === 'authorized') newStatus = 'authorized';
                    else if (mpStatus === 'paused') newStatus = 'paused';
                    else if (mpStatus === 'cancelled') newStatus = 'cancelled';

                    user.subscription.status = newStatus;

                    // Update next billing date if available
                    if (subscriptionDetails.next_payment_date) {
                        user.subscription.nextBillingDate = new Date(subscriptionDetails.next_payment_date);
                    }

                    await user.save();
                    logger.info(`✅ Subscription ${data.id} updated: status=${newStatus}`);

                    // Log status change
                    await LogService.log({
                        action: newStatus === 'cancelled' ? 'SUBSCRIPTION_CANCELLED' : 'SUBSCRIPTION_UPDATED',
                        category: 'BILLING',
                        resource: { type: 'Subscription', id: data.id, name: planId || 'unknown' },
                        details: { userId, newStatus, mpStatus },
                        actor: user
                    });
                }

            } catch (error: any) {
                logger.error(`Error processing subscription event:`, error);
            }

            res.status(200).json({ message: 'Subscription event processed' });
            return;
        }

        // ============================================
        // AUTHORIZED PAYMENT (SUBSCRIPTION RENEWAL)
        // ============================================
        if (type === 'subscription_authorized_payment') {
            logger.info(`Subscription payment received: id=${data?.id}`);

            try {
                // Fetch payment details using processWebhookNotification
                const paymentResult = await paymentService.processWebhookNotification({ type: 'payment', data: { id: data.id } });
                const externalRef = paymentResult.externalReference || '';
                const [userId, planId] = externalRef.split('-');

                if (userId && paymentResult.status === 'approved') {
                    const user = await UserModel.findById(userId);
                    if (user && user.subscription) {
                        // Renew subscription: +30 days from now
                        user.subscription.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        user.subscription.lastPaymentDate = new Date();
                        user.subscription.mpPaymentId = String(data.id);
                        user.subscription.failedAttempts = 0;
                        user.subscription.status = 'authorized';
                        await user.save();

                        logger.info(`✅ Subscription renewed for user ${userId}, next billing: ${user.subscription.nextBillingDate}`);

                        await LogService.log({
                            action: 'SUBSCRIPTION_RENEWED',
                            category: 'BILLING',
                            resource: { type: 'Payment', id: String(data.id), name: planId || 'unknown' },
                            details: {
                                userId,
                                amount: paymentResult.amount,
                                nextBillingDate: user.subscription.nextBillingDate
                            },
                            actor: user
                        });

                        // Create transaction record
                        await TransactionModel.create({
                            userId: user._id,
                            type: 'payment_approved',
                            provider: 'mercadopago',
                            mpPaymentId: String(data.id),
                            mpSubscriptionId: user.subscription.mpSubscriptionId,
                            planId: planId || user.subscription.planId,
                            amount: paymentResult.amount || 0,
                            currency: 'BRL',
                            status: 'approved',
                            paymentMethod: 'card',
                            userEmail: user.email,
                            userName: user.username
                        });
                    }
                } else if (paymentResult.status === 'rejected') {
                    // Handle failed recurring payment
                    const user = await UserModel.findById(userId);
                    if (user && user.subscription) {
                        user.subscription.failedAttempts = (user.subscription.failedAttempts || 0) + 1;
                        await user.save();
                        logger.warn(`❌ Recurring payment failed for user ${userId}, attempt ${user.subscription.failedAttempts}`);

                        // Create failed transaction record
                        await TransactionModel.create({
                            userId: user._id,
                            type: 'payment_failed',
                            provider: 'mercadopago',
                            mpPaymentId: String(data.id),
                            mpSubscriptionId: user.subscription.mpSubscriptionId,
                            planId: planId || user.subscription.planId,
                            amount: paymentResult.amount || 0,
                            currency: 'BRL',
                            status: 'rejected',
                            statusDetail: paymentResult.statusDetail,
                            paymentMethod: 'card',
                            userEmail: user.email,
                            userName: user.username
                        });
                    }
                }
            } catch (error: any) {
                logger.error(`Error processing authorized payment:`, error);
            }

            res.status(200).json({ message: 'Payment event processed' });
            return;
        }

        // ============================================
        // REGULAR PAYMENT (PIX/BOLETO)
        // ============================================
        if (type === 'payment') {
            const result = await paymentService.processWebhookNotification(req.body);

            if (!result.processed) {
                logger.info(`Webhook ignored: ${result.reason}`);
                res.status(200).json({ message: 'Ignored' });
                return;
            }

            // Determine payment method from result
            const paymentMethod = result.paymentMethod === 'pix' ? 'pix'
                : result.paymentMethod === 'bolbradesco' || result.paymentMethod?.includes('boleto') ? 'boleto'
                    : 'card';

            // Pix/Boleto approved - create fixed-term access
            if (result.status === 'approved' && result.userId && result.planId) {
                const user = await UserModel.findById(result.userId);

                if (user) {
                    const isFixedAccess = paymentMethod === 'pix' || paymentMethod === 'boleto';

                    user.subscription = {
                        planId: result.planId,
                        status: isFixedAccess ? 'authorized' : 'authorized',
                        accessType: isFixedAccess ? 'fixed' : 'recurring',
                        startDate: new Date(),
                        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                        mpPaymentId: String(result.paymentId),
                        paymentMethod: paymentMethod as 'card' | 'pix' | 'boleto',
                        lastPaymentDate: new Date(),
                        failedAttempts: 0
                    };

                    await user.save();

                    await LogService.log({
                        action: 'PAYMENT_APPROVED',
                        category: 'BILLING',
                        resource: { type: 'Payment', id: String(result.paymentId), name: result.planId },
                        details: {
                            userId: result.userId,
                            planId: result.planId,
                            amount: result.amount,
                            paymentMethod,
                            accessType: isFixedAccess ? 'fixed' : 'recurring'
                        },
                        actor: user
                    });

                    // Create transaction record for Pix/Boleto
                    await TransactionModel.create({
                        userId: user._id,
                        type: 'payment_approved',
                        provider: 'mercadopago',
                        mpPaymentId: String(result.paymentId),
                        planId: result.planId,
                        amount: result.amount || 0,
                        currency: 'BRL',
                        status: 'approved',
                        paymentMethod: paymentMethod as 'card' | 'pix' | 'boleto',
                        userEmail: user.email,
                        userName: user.username
                    });

                    logger.info(`✅ ${isFixedAccess ? 'Fixed' : 'Recurring'} access activated for user ${result.userId}, plan ${result.planId}`);
                }
            } else if (result.status === 'rejected' || result.status === 'cancelled') {
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
            return;
        }

        // ============================================
        // CHARGEBACKS - Immediate access suspension
        // ============================================
        if (type === 'chargebacks' || type === 'topic_chargebacks_wh') {
            logger.warn(`⚠️ Chargeback received: ${data?.id}`);

            // Create chargeback transaction record
            // Note: User lookup by payment ID would require storing payment->user mapping
            // For now, log the chargeback event
            try {
                await TransactionModel.create({
                    userId: new mongoose.Types.ObjectId(), // Placeholder - needs lookup
                    type: 'chargeback',
                    provider: 'mercadopago',
                    mpPaymentId: String(data?.id || 'unknown'),
                    planId: 'unknown',
                    amount: 0, // Would need to fetch from MP
                    currency: 'BRL',
                    status: 'cancelled',
                    paymentMethod: 'card'
                });
            } catch (chargebackErr) {
                logger.error('Failed to record chargeback transaction:', chargebackErr);
            }

            res.status(200).json({ message: 'Chargeback acknowledged' });
            return;
        }

        // Unknown event type
        logger.info(`Ignoring unknown webhook type: ${type}`);
        res.status(200).json({ message: 'OK' });

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

/**
 * GET /api/payments/subscription
 * Get current user's subscription status with access check
 * PROTECTED ROUTE - Requires authentication
 */
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await UserModel.findById(userId).select('subscription email');

        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        const { PaymentService } = await import('../services/PaymentService');
        const hasAccess = PaymentService.hasAccess(user.subscription);

        // Calculate days remaining
        let daysRemaining = 0;
        if (user.subscription?.nextBillingDate) {
            const now = new Date();
            const nextBilling = new Date(user.subscription.nextBillingDate);
            daysRemaining = Math.max(0, Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        res.json({
            success: true,
            data: {
                subscription: user.subscription || null,
                hasAccess,
                daysRemaining,
                isRecurring: user.subscription?.accessType === 'recurring',
                canCancel: user.subscription?.status === 'authorized' && user.subscription?.accessType === 'recurring'
            }
        });

    } catch (error: any) {
        logger.error('Error fetching subscription:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
    }
});

/**
 * POST /api/payments/subscription/cancel
 * Cancel user's subscription (keeps access until nextBillingDate)
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/subscription/cancel', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await UserModel.findById(userId);

        if (!user || !user.subscription?.mpSubscriptionId) {
            res.status(400).json({ success: false, error: 'No active subscription found' });
            return;
        }

        if (user.subscription.accessType === 'fixed') {
            res.status(400).json({
                success: false,
                error: 'Pagamentos via Pix/Boleto não podem ser cancelados. Acesso expira automaticamente.'
            });
            return;
        }

        const paymentService = getPaymentService();
        const result = await paymentService.cancelSubscription(user.subscription.mpSubscriptionId);

        if (result.success) {
            user.subscription.status = 'cancelled';
            await user.save();

            await LogService.log({
                action: 'SUBSCRIPTION_CANCELLED',
                category: 'BILLING',
                resource: { type: 'Subscription', id: user.subscription.mpSubscriptionId, name: user.subscription.planId },
                details: {
                    userId,
                    accessUntil: user.subscription.nextBillingDate
                },
                actor: user
            });

            res.json({
                success: true,
                message: 'Assinatura cancelada. Você mantém acesso até ' +
                    (user.subscription.nextBillingDate
                        ? new Date(user.subscription.nextBillingDate).toLocaleDateString('pt-BR')
                        : 'o fim do período atual'),
                accessUntil: user.subscription.nextBillingDate
            });
        } else {
            res.status(500).json({ success: false, error: 'Não foi possível cancelar a assinatura' });
        }

    } catch (error: any) {
        logger.error('Error cancelling subscription:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to cancel subscription' });
    }
});

/**
 * POST /api/payments/subscription/pause
 * Pause user's subscription
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/subscription/pause', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await UserModel.findById(userId);

        if (!user || !user.subscription?.mpSubscriptionId) {
            res.status(400).json({ success: false, error: 'No active subscription found' });
            return;
        }

        const paymentService = getPaymentService();
        const result = await paymentService.pauseSubscription(user.subscription.mpSubscriptionId);

        if (result.success) {
            user.subscription.status = 'paused';
            await user.save();

            res.json({
                success: true,
                message: 'Assinatura pausada. Você não será cobrado até reativar.'
            });
        } else {
            res.status(500).json({ success: false, error: 'Não foi possível pausar a assinatura' });
        }

    } catch (error: any) {
        logger.error('Error pausing subscription:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to pause subscription' });
    }
});

/**
 * POST /api/payments/subscription/reactivate
 * Reactivate a paused subscription
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/subscription/reactivate', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await UserModel.findById(userId);

        if (!user || !user.subscription?.mpSubscriptionId) {
            res.status(400).json({ success: false, error: 'No subscription found' });
            return;
        }

        if (user.subscription.status !== 'paused') {
            res.status(400).json({ success: false, error: 'Subscription is not paused' });
            return;
        }

        const paymentService = getPaymentService();
        const result = await paymentService.reactivateSubscription(user.subscription.mpSubscriptionId);

        if (result.success) {
            user.subscription.status = 'authorized';
            await user.save();

            res.json({
                success: true,
                message: 'Assinatura reativada com sucesso!'
            });
        } else {
            res.status(500).json({ success: false, error: 'Não foi possível reativar a assinatura' });
        }

    } catch (error: any) {
        logger.error('Error reactivating subscription:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to reactivate subscription' });
    }
});

export { router as paymentRoutes };

