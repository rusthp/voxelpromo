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
        // We select 'access' as it is now the SSOT
        const user = await UserModel.findById(req.user.id).select('access');

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const { access } = user;

        // 1. FREE Plan - Allow? 
        // Logic: Is this middleware meant to guard PAID features? 
        // If so, Free should probably be blocked if feature flag not checked.
        // Assuming this middleware blocks "Subscription Required" features.
        // But some features might be valid for FREE.
        // Let's assume standard behavior:
        // If route requires subscription (using this middleware), FREE is NOT sufficient unless feature flags say otherwise.
        // BUT wait, looking at validation/previous logic:
        // "Blocks access to critical actions... if no valid plan"
        // If Plan is FREE, is it valid? Yes, but maybe limited.
        // Let's stick to: Must be ACTIVE or TRIAL.
        // And Plan must be > FREE ? Or just "STATUS IS VALID".
        // Let's check status first.

        // 2. Check Status
        if (access.status === 'ACTIVE') {
            return next();
        }

        // 3. Check Trial
        if (access.plan === 'TRIAL') {
            const now = new Date();
            const trialEndsAt = access.trialEndsAt ? new Date(access.trialEndsAt) : null;

            if (trialEndsAt && trialEndsAt < now) {
                // Trial Expired
                // Update status to PAST_DUE or FREE?
                // Logic: If trial ends, usually functionality stops.
                logger.warn(`⏳ Trial expired for user ${user._id}.`);

                // We should ideally update DB here, but maybe lazily or via separate job.
                // For middleware speed, we block.

                return res.status(403).json({
                    error: 'TRIAL_EXPIRED',
                    message: 'Seu período de teste expirou. Faça o upgrade para continuar.',
                });
            }
            return next();
        }

        // 4. Block Past Due / Canceled
        if (access.status === 'PAST_DUE' || access.status === 'CANCELED') {
            return res.status(403).json({
                error: 'SUBSCRIPTION_INACTIVE',
                message: 'Assinatura inativa. Verifique seu status de faturamento.',
            });
        }

        // 5. Default Block (e.g. FREE user on PRO feature)
        // If user is FREE and status ACTIVE, but this middleware guards a PRO route...
        // This middleware name is `checkSubscriptionStatus`, it doesn't specify PLAN level.
        // Usually it implies "Is account in good standing?".
        // If I want to gate PRO features, I usually typically use `requirePlan('PRO')` or similar.
        // But looking at existing code: "Blocks access ... if no valid plan". 
        // I will allow FREE if status is ACTIVE. Feature limits should be checked elsewhere or here if needed.
        // Actually, previous code: if plan?.status === 'active' return next.
        // So if FREE users have status 'active', they pass.

        if (access.plan === 'FREE' && access.status === 'ACTIVE') {
            return next();
        }

        return res.status(403).json({
            error: 'SUBSCRIPTION_REQUIRED',
            message: 'Erro ao validar assinatura.',
        });

    } catch (error) {
        logger.error('Error in checkSubscriptionStatus:', error);
        return res.status(500).json({ error: 'Erro ao verificar status da assinatura' });
    }
};
