import { Router, Response } from 'express';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
import { OfferModel } from '../models/Offer';
import { AuthRequest, authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * DELETE /api/users/me
 * Delete user account with LGPD-compliant data anonymization
 * 
 * LGPD Article 18º, V: Right to deletion
 * 
 * This endpoint:
 * - Anonymizes user data instead of hard deletion (preserves transaction history for legal/tax reasons)
 * - Cancels active subscriptions
 * - Removes all user-created offers
 * - Clears refresh tokens
 * - Logs the deletion event
 * 
 * PROTECTED ROUTE - Requires authentication
 */
router.delete('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await UserModel.findById(userId);

        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        logger.info(`User account deletion requested: ${userId} (${user.email})`);

        // 1. Cancel active subscription (if exists)
        if (user.subscription?.mpSubscriptionId && user.subscription?.status === 'authorized') {
            try {
                const { getPaymentService } = await import('../services/PaymentService');
                const paymentService = getPaymentService();
                await paymentService.cancelSubscription(user.subscription.mpSubscriptionId);
                logger.info(`Subscription cancelled for deleted user: ${userId}`);
            } catch (error) {
                logger.warn(`Failed to cancel subscription for user ${userId}:`, error);
                // Continue with deletion even if subscription cancel fails
            }
        }

        // 2. Delete all user-created offers
        const deletedOffers = await OfferModel.deleteMany({ createdBy: userId });
        logger.info(`Deleted ${deletedOffers.deletedCount} offers for user ${userId}`);

        // 3. Anonymize user data (LGPD-compliant)
        // We keep the user record for transaction history (5-year legal requirement)
        // but anonymize all personal data
        const anonymizedEmail = `deleted-${userId}@anonymized.local`;
        const anonymizedUsername = `deleted-${userId}`;

        user.email = anonymizedEmail;
        user.username = anonymizedUsername;
        user.password = crypto.randomBytes(32).toString('hex'); // Invalidate password
        (user as any).name = undefined;
        (user as any).document = undefined;
        (user as any).avatar = undefined;
        user.role = 'user'; // Demote admin if applicable
        user.subscription = undefined;
        (user as any).integrations = undefined;
        (user as any).preferences = undefined;

        // Mark as deleted
        (user as any).deletedAt = new Date();
        (user as any).deletionReason = 'user_requested';

        await user.save();

        // 5. Delete all refresh tokens
        const { RefreshTokenModel } = await import('../models/RefreshToken');
        await RefreshTokenModel.deleteMany({ userId });

        // 6. Keep transaction records (legal requirement: 5 years for tax purposes)
        // But anonymize user email in transactions
        await TransactionModel.updateMany(
            { userId },
            {
                userEmail: anonymizedEmail,
                userName: anonymizedUsername
            }
        );

        logger.info(`✅ User account anonymized and deleted: ${userId}`);

        // Return success
        res.json({
            success: true,
            message: 'Conta excluída com sucesso. Seus dados pessoais foram anonimizados conforme LGPD.'
        });

    } catch (error: any) {
        logger.error('Error deleting user account:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao excluir conta. Tente novamente.'
        });
    }
});

/**
 * GET /api/users/me/export
 * Export user data in JSON format
 * 
 * LGPD Article 18º, VII: Right to data portability
 * 
 * Returns all user data in a structured, machine-readable format
 * 
 * PROTECTED ROUTE - Requires authentication
 */
router.get('/me/export', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const user = await UserModel.findById(userId).select('-password').lean();

        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        // Get user's transactions
        const transactions = await TransactionModel.find({ userId }).lean();

        // Get user's offers
        const offers = await OfferModel.find({ createdBy: userId }).lean();

        // Build export package
        const exportData = {
            exportDate: new Date().toISOString(),
            userData: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: (user as any).name,
                document: (user as any).document,
                accountType: (user as any).accountType,
                role: user.role,
                createdAt: user.createdAt,
                subscription: user.subscription
            },
            transactions: transactions.map(t => ({
                id: t._id,
                type: t.type,
                amount: t.amount,
                currency: t.currency,
                status: t.status,
                planId: t.planId,
                createdAt: t.createdAt
            })),
            offers: offers.map(o => ({
                id: o._id,
                title: o.title,
                description: o.description,
                price: (o as any).price,
                source: o.source,
                createdAt: o.createdAt
            })),
            metadata: {
                totalTransactions: transactions.length,
                totalOffers: offers.length,
                exportFormat: 'JSON',
                lgpdCompliant: true
            }
        };

        // Set headers for download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="voxelpromo-data-export-${userId}-${Date.now()}.json"`);

        logger.info(`Data export requested by user: ${userId}`);

        res.json(exportData);

    } catch (error: any) {
        logger.error('Error exporting user data:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao exportar dados. Tente novamente.'
        });
    }
});

export { router as usersRoutes };
