import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Middleware to check if the user has a valid subscription or active trial.
 * Updates trial status to 'past_due' if expired.
 * Blocks access to critical actions (POST/PUT/DELETE) if no valid plan.
 */
export const checkSubscriptionStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        // Admins bypass all checks
        if (req.user.role === 'admin') {
            return next();
        }

        // Fetch fresh user data (to get current plan status)
        const user = await UserModel.findById(req.user.id).select('plan');

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const { plan } = user;

        // 1. Active Plan - Allow
        if (plan?.status === 'active') {
            return next();
        }

        // 2. Trialing Plan
        if (plan?.status === 'trialing') {
            const now = new Date();
            const validUntil = plan.validUntil ? new Date(plan.validUntil) : null;

            // Check if trial is expired
            if (validUntil && validUntil < now) {
                logger.warn(`⏳ Trial expired for user ${user._id}. Updating status to past_due.`);

                // Side-effect: Update status to past_due
                user.plan!.status = 'past_due';
                await user.save();

                return res.status(403).json({
                    error: 'TRIAL_EXPIRED',
                    message: 'Seu período de teste expirou. Faça o upgrade para continuar aproveitando todos os recursos.',
                });
            }

            // Valid trial - Allow
            return next();
        }

        // 3. Past Due or Canceled or Unknown - Block
        if (plan?.status === 'past_due' || plan?.status === 'canceled') {
            return res.status(403).json({
                error: 'TRIAL_EXPIRED',
                message: 'Seu plano está inativo. Faça o upgrade para continuar.',
            });
        }

        // Default catch-all (safety)
        return res.status(403).json({
            error: 'SUBSCRIPTION_REQUIRED',
            message: 'Assinatura ativa necessária para realizar esta ação.',
        });

    } catch (error) {
        logger.error('Error in checkSubscriptionStatus:', error);
        return res.status(500).json({ error: 'Erro ao verificar status da assinatura' });
    }
};
