import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { PaymentFactory } from '../services/payment/PaymentFactory';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
import { LogService } from '../services/LogService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { validate } from '../middleware/validate';
import { createCheckoutSchema, createPixSchema, createBoletoSchema } from '../validation/payment.validation';
import { StripeWebhookService } from '../services/payment/StripeWebhookService';

const router = Router();

/**
 * POST /api/payments/create-checkout
 * Create a Mercado Pago checkout for a subscription plan
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/create-checkout', authenticate, validate(createCheckoutSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = req.body;
    const userId = req.user!.id;

    // Get user info
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Determine provider implies intent. Default for Cards/Plans is Stripe now (as per plan). 
    // Usually frontend might send 'provider' param. If not, default to Stripe for new checkouts.
    // Determine provider implies intent.
    const provider = req.body.provider || 'stripe';

    // Create checkout
    const paymentService = PaymentFactory.getService(provider);
    const checkout = await paymentService.createCheckout(userId, planId, user.email, user.username, {
      hasUsedTrial: user.hasUsedTrial
    });

    // Log checkout creation
    await LogService.log({
      actor: user,
      action: 'PAYMENT_CHECKOUT_CREATED',
      category: 'BILLING',
      resource: { type: 'Checkout', id: checkout.preferenceId || 'trial', name: planId },
      details: { planId, price: checkout.price },
    });

    res.json(checkout);
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
      payerIdentification,
    } = req.body;

    const userId = req.user!.id;

    if (!planId || !token) {
      res.status(400).json({
        success: false,
        error: 'Plan ID e token do cartão são obrigatórios',
      });
      return;
    }

    // Get user info
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      return;
    }

    // Transparent Checkout is Legacy Mercado Pago feature. Force MP service.
    const paymentService = PaymentFactory.getService('mercadopago');
    const result = await paymentService.createSubscription({
      userId,
      planId,
      payerEmail: payerEmail || user.email,
      token,
      paymentMethodId,
      payerIdentification,
    });

    if (result.success) {
      // Update user's access and billing status
      user.access.plan = 'PRO'; // Or map based on planId if multiple tiers
      user.access.status = 'ACTIVE';

      // Update billing data
      user.billing.mpSubscriptionId = result.subscriptionId;
      user.billing.provider = 'MERCADOPAGO';
      user.billing.mpPaymentId = result.subscriptionId; // Using sub id for now as initial reference

      // Migration: Keep legacy subscription object for now if needed, or better, remove usage.
      // We will populate it for legacy compat if strictly necessary, but preferably we move forward.
      // Keeping legacy minimal sync:
      user.subscription = {
        planId: result.planId!,
        status: 'authorized',
        accessType: 'recurring',
        startDate: new Date(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        mpSubscriptionId: result.subscriptionId,
        provider: 'mercadopago',
        paymentMethod: 'card',
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
          name: result.planName || planId,
        },
        details: {
          planId,
          price: result.price,
          subscriptionId: result.subscriptionId,
        },
      });

      logger.info(`✅ Subscription created for user ${userId}, plan ${planId}`);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error processing subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar assinatura',
    });
  }
});

/**
 * POST /api/payments/create-pix
 * Generate a Pix payment for a subscription plan
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/create-pix', authenticate, validate(createPixSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { planId, payerEmail, payerCpf, amount } = req.body;
    const userId = req.user!.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      return;
    }

    const paymentService = PaymentFactory.getService('mercadopago'); // Pix is always MP
    const result = await paymentService.createPixPayment!({
      userId,
      planId,
      payerEmail,
      payerCpf,
      amount: amount || 49.9,
    });

    if (result.success) {
      await LogService.log({
        actor: user,
        action: 'PIX_PAYMENT_CREATED',
        category: 'BILLING',
        resource: { type: 'Payment', id: result.paymentId || 'pix', name: planId },
        details: { planId, method: 'pix' },
      });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Error creating Pix payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar código Pix',
    });
  }
});

/**
 * POST /api/payments/create-boleto
 * Generate a Boleto payment for a subscription plan
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/create-boleto', authenticate, validate(createBoletoSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { planId, payerEmail, payerCpf, amount, address } = req.body;
    const userId = req.user!.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      return;
    }

    const paymentService = PaymentFactory.getService('mercadopago'); // Boleto is always MP
    const result = await paymentService.createBoletoPayment!({
      userId,
      planId,
      payerEmail,
      payerCpf,
      amount: amount || 49.9,
      address,
    });

    if (result.success) {
      await LogService.log({
        actor: user,
        action: 'BOLETO_PAYMENT_CREATED',
        category: 'BILLING',
        resource: { type: 'Payment', id: result.paymentId || 'boleto', name: planId },
        details: { planId, method: 'boleto' },
      });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Error creating Boleto payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar boleto',
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
      timestamp: new Date().toISOString(),
    });

    // Extract signature headers
    const signature = req.headers['x-signature'] as string;
    const requestId = req.headers['x-request-id'] as string;

    // MP Webhook
    const paymentService = PaymentFactory.getService('mercadopago');

    // Verify signature (CRITICAL SECURITY)
    if (!paymentService.verifyWebhookSignature(signature, requestId, req.body)) {
      logger.error('🔴 Webhook signature verification FAILED. Rejecting request.', {
        hasSignature: !!signature,
        hasRequestId: !!requestId,
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
        const subscriptionDetails = (await paymentService.getSubscriptionDetails(data.id)) as any;
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
          user.access.plan = 'PRO';
          user.access.status = 'ACTIVE';
          user.billing.mpSubscriptionId = data.id.toString();
          user.billing.provider = 'MERCADOPAGO';

          await user.save();
          logger.info(`✅ Subscription created for user ${userId}, plan ${planId}`);
        }

        // Handle subscription updated (status change)
        if (action === 'updated') {
          const mpStatus = subscriptionDetails.status;

          if (mpStatus === 'authorized') {
            user.access.status = 'ACTIVE';
          } else if (mpStatus === 'paused') {
            // Keep ACTIVE if within paid period ideally, but strictly following status:
            // Logic: Paused usually implies stop billing, but access might remain until end of period.
            // For simplified MVP, we can keep ACTIVE.
          } else if (mpStatus === 'cancelled') {
            user.access.status = 'CANCELED';
          }

          await user.save();
          logger.info(`✅ Subscription ${data.id} updated: status=${mpStatus}`);

          // Log status change
          await LogService.log({
            action: mpStatus === 'cancelled' ? 'SUBSCRIPTION_CANCELLED' : 'SUBSCRIPTION_UPDATED',
            category: 'BILLING',
            resource: { type: 'Subscription', id: data.id, name: planId || 'unknown' },
            details: { userId, mpStatus },
            actor: user,
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
        const paymentResult = await paymentService.processWebhookNotification({
          type: 'payment',
          data: { id: data.id },
        });
        const externalRef = paymentResult.externalReference || '';
        const [userId, planId] = externalRef.split('-');

        if (userId && paymentResult.status === 'approved') {
          const user = await UserModel.findById(userId);
          if (user) {
            // Renew subscription access
            user.access.status = 'ACTIVE';

            // Store payment info if needed for records (Transaction model handles history)
            user.billing.mpPaymentId = String(data.id);

            await user.save();

            logger.info(
              `✅ Subscription renewed for user ${userId}`
            );

            await LogService.log({
              action: 'SUBSCRIPTION_RENEWED',
              category: 'BILLING',
              resource: { type: 'Payment', id: String(data.id), name: planId || 'unknown' },
              details: {
                userId,
                amount: paymentResult.amount,
              },
              actor: user,
            });

            // Create transaction record
            await TransactionModel.create({
              userId: user._id,
              type: 'payment_approved',
              provider: 'mercadopago',
              mpPaymentId: String(data.id),
              mpSubscriptionId: user.billing.mpSubscriptionId,
              planId: planId || 'pro',
              amount: paymentResult.amount || 0,
              currency: 'BRL',
              status: 'approved',
              paymentMethod: 'card',
              userEmail: user.email,
              userName: user.username,
            });
          }
        } else if (paymentResult.status === 'rejected') {
          // Handle failed recurring payment
          const user = await UserModel.findById(userId);
          if (user) {
            // Optional: Set to PAST_DUE
            // user.access.status = 'PAST_DUE';
            // await user.save();

            logger.warn(
              `❌ Recurring payment failed for user ${userId}`
            );

            // Create failed transaction record
            await TransactionModel.create({
              userId: user._id,
              type: 'payment_failed',
              provider: 'mercadopago',
              mpPaymentId: String(data.id),
              mpSubscriptionId: user.billing.mpSubscriptionId,
              planId: planId || 'pro',
              amount: paymentResult.amount || 0,
              currency: 'BRL',
              status: 'rejected',
              statusDetail: paymentResult.statusDetail,
              paymentMethod: 'card',
              userEmail: user.email,
              userName: user.username,
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
      const paymentMethod =
        result.paymentMethod === 'pix'
          ? 'pix'
          : result.paymentMethod === 'bolbradesco' || result.paymentMethod?.includes('boleto')
            ? 'boleto'
            : 'card';

      // Pix/Boleto approved - create fixed-term access
      if (result.status === 'approved' && result.userId && result.planId) {
        const user = await UserModel.findById(result.userId);

        if (user) {
          user.access.status = 'ACTIVE';
          user.access.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days fixed

          user.billing.mpPaymentId = String(result.paymentId);
          user.billing.provider = 'MERCADOPAGO';

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
            },
            actor: user,
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
            userName: user.username,
          });

          logger.info(
            `✅ Access activated for user ${result.userId}, plan ${result.planId}`
          );
        }
      } else if (result.status === 'rejected' || result.status === 'cancelled') {
        await LogService.log({
          action: 'PAYMENT_FAILED',
          category: 'BILLING',
          resource: {
            type: 'Payment',
            id: String(result.paymentId),
            name: result.planId || 'unknown',
          },
          details: {
            userId: result.userId,
            status: result.status,
            statusDetail: result.statusDetail,
          },
          status: 'FAILURE',
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
          paymentMethod: 'card',
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
/**
 * GET /api/payments/status/:preferenceId
 * Check payment status (for frontend polling)
 * PROTECTED ROUTE - Requires authentication
 */
router.get('/status/:preferenceId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's current subscription status
    const user = await UserModel.findById(userId).select('access billing');

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        subscription: {
          planId: user.access.plan,
          status: user.access.status.toLowerCase(), // map for frontend compat
        },
      },
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
    const user = await UserModel.findById(userId).select('access billing email createdAt');

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // New logic: Access is derived from user.access.status + effective end date
    const now = new Date();
    let validUntil = user.access.validUntil;

    // Always consider trialEndsAt as a valid end date (regardless of plan name)
    // This covers users whose plan was changed from TRIAL to BASIC but still have trialEndsAt set
    if (user.access.trialEndsAt) {
      if (!validUntil || user.access.trialEndsAt > validUntil) {
        validUntil = user.access.trialEndsAt;
      }
    }

    // Fallback: if both dates are null (legacy users), use createdAt + 7 days
    if (!validUntil && user.createdAt) {
      validUntil = new Date(user.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const hasAccess = user.access.status === 'ACTIVE' && (!validUntil || validUntil > now);

    // Calculate days remaining
    let daysRemaining = 0;
    if (validUntil && validUntil > now) {
      const diffTime = Math.abs(validUntil.getTime() - now.getTime());
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Legacy support for frontend response shape
    const subscriptionData = {
      planId: (user.access.plan || 'free').toLowerCase(),
      status: hasAccess ? user.access.status.toLowerCase() : 'expired',
      provider: user.billing.provider?.toLowerCase(),
      nextBillingDate: validUntil,
      startDate: user.createdAt, // Fallback start date
    };

    res.json({
      success: true,
      data: {
        subscription: subscriptionData,
        hasAccess,
        daysRemaining: daysRemaining || 0,
        isRecurring: !!user.billing.stripeSubscriptionId || !!user.billing.mpSubscriptionId,
        canCancel: (user.access.status === 'ACTIVE' || user.access.status === 'PAST_DUE') && (!!user.billing.stripeSubscriptionId || !!user.billing.mpSubscriptionId),
      },
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

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const provider = user.billing.provider?.toLowerCase() || 'mercadopago';
    const subId = provider === 'stripe' ? user.billing.stripeSubscriptionId : user.billing.mpSubscriptionId;

    if (!subId) {
      res.status(400).json({ success: false, error: 'No active subscription found to cancel' });
      return;
    }

    const paymentService = PaymentFactory.getService(provider as any);
    const result = await paymentService.cancelSubscription(subId);

    if (result.success) {
      user.access.status = 'CANCELED'; // Or keep ACTIVE until end of period if supported by service return
      await user.save();

      await LogService.log({
        action: 'SUBSCRIPTION_CANCELLED',
        category: 'BILLING',
        resource: {
          type: 'Subscription',
          id: subId,
          name: user.access.plan,
        },
        details: {
          userId,
        },
        actor: user,
      });

      res.json({
        success: true,
        message: 'Assinatura cancelada.',
      });
    } else {
      res.status(500).json({ success: false, error: 'Não foi possível cancelar a assinatura' });
    }
  } catch (error: any) {
    logger.error('Error cancelling subscription:', error);
    res
      .status(500)
      .json({ success: false, error: error.message || 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/payments/subscription/pause
 * Pause user's subscription
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/subscription/pause', authenticate, async (_req: AuthRequest, res: Response) => {
  // Logic similar to cancel, but calling pause
  // For MVP, implementing placeholder or reusing logic structure
  res.status(501).json({ error: 'Not implemented' });
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

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const provider = user.billing.provider?.toLowerCase() || 'mercadopago';
    const subId = provider === 'stripe' ? user.billing.stripeSubscriptionId : user.billing.mpSubscriptionId;

    if (!subId) {
      res.status(400).json({ success: false, error: 'No subscription found' });
      return;
    }

    const paymentService = PaymentFactory.getService(provider as any);
    const result = await paymentService.reactivateSubscription(subId);

    if (result.success) {
      user.access.status = 'ACTIVE';
      await user.save();
      res.json({ success: true, message: 'Assinatura reativada.' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to reactivate' });
    }

  } catch (error: any) {
    logger.error('Error reactivating:', error);
    res.status(500).json({ success: false, error: 'Error' });
  }
});


/**
 * POST /api/payments/stripe/webhook
 * Receive payment notifications from Stripe
 */
router.post('/stripe/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    logger.warn('⚠️ Stripe webhook signature missing or secret not configured');
    res.status(400).send('Webhook Error: Missing signature/secret');
    return;
  }

  try {
    const stripeService = PaymentFactory.getService('stripe');

    // Use rawBody that was preserved by our custom middleware in server.ts
    const rawBody = (req as any).rawBody || req.body;

    let event;
    try {
      event = (stripeService as any).constructEvent(rawBody, sig as string);
    } catch (err: any) {
      logger.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    logger.info(`Received Stripe webhook: ${event.type}`);


    if (event.type === 'checkout.session.completed' ||
      event.type === 'invoice.payment_succeeded' ||
      event.type === 'invoice.payment_failed' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted') {

      const stripeWebhookService = new StripeWebhookService();
      await stripeWebhookService.handleEvent(event);
    }

    res.json({ received: true });

  } catch (error: any) {
    logger.error('Error handling Stripe webhook:', error);
    res.status(500).json({ error: error.message });
  }
});


/**
 * POST /api/payments/portal-session
 * Create a Stripe Portal session for managing billing
 */
router.post('/portal-session', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await UserModel.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.billing.provider !== 'STRIPE' || !user.billing.stripeCustomerId) {
      res.status(400).json({ error: 'Billing management is only available for Stripe customers.' });
      return;
    }

    const stripeService = PaymentFactory.getService('stripe');
    if (!stripeService.createPortalSession) {
      // Should not happen if confirmed 'stripe' provider
      res.status(501).json({ error: 'Not implemented for this provider' });
      return;
    }

    const session = await stripeService.createPortalSession(user.billing.stripeCustomerId);
    res.json({ url: session.url });

  } catch (error: any) {
    logger.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
});

export { router as paymentRoutes };
