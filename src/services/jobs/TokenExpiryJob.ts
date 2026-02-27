import cron from 'node-cron';
import { logger } from '../../utils/logger';
import { UserSettingsModel } from '../../models/UserSettings';

/**
 * Job to check token expiry for Instagram and Mercado Livre.
 * - Instagram: alerts on expiry (long-lived tokens, 60 days)
 * - Mercado Livre: auto-refreshes tokens (short-lived, 6 hours)
 * CRITICAL COMMERCIAL FEATURE
 */
export class TokenExpiryJob {
    private job: cron.ScheduledTask;

    constructor() {
        // Run every 4 hours to catch ML tokens before they expire (6h lifetime)
        this.job = cron.schedule('0 */4 * * *', () => {
            this.checkAllUsers();
        }, { scheduled: false });
    }

    start() {
        logger.info('⏰ TokenExpiryJob scheduled (Every 4 hours)');
        this.job.start();
    }

    async checkAllUsers() {
        logger.info('🔍 Starting Token Expiry Check (Instagram + Mercado Livre)...');

        try {
            await this.checkInstagramTokens();
            await this.checkMercadoLivreTokens();
            logger.info('✅ Token Expiry Check complete.');
        } catch (error: any) {
            logger.error(`❌ Error in TokenExpiryJob: ${error.message}`);
        }
    }

    /**
     * Instagram: alert on expiry (tokens are 60 days, need manual re-auth)
     */
    private async checkInstagramTokens() {
        const users = await UserSettingsModel.find({
            'instagram.isConfigured': true,
            'instagram.tokenStatus': { $ne: 'expired' }
        });

        const now = new Date();
        const warningThreshold = new Date();
        warningThreshold.setDate(now.getDate() + 7); // 7 days from now

        for (const settings of users) {
            if (!settings.instagram?.tokenExpiresAt) continue;

            const expiryDate = new Date(settings.instagram.tokenExpiresAt);
            const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // 1. Check for Expiration
            if (expiryDate < now) {
                logger.error(`🚨 Instagram Token EXPIRED for user ${settings.userId}. Disabling automation.`);
                settings.instagram.tokenStatus = 'expired';
                await settings.save();
                continue;
            }

            // 2. Check for Warning (< 7 days)
            if (expiryDate < warningThreshold) {
                logger.warn(`⚠️ Instagram Token EXPIRING in ${daysRemaining} days for user ${settings.userId}.`);

                if (settings.instagram.tokenStatus !== 'expiring') {
                    settings.instagram.tokenStatus = 'expiring';
                    await settings.save();
                }
            }
        }

        logger.info(`✅ Instagram token check: ${users.length} users checked.`);
    }

    /**
     * Mercado Livre: auto-refresh tokens that are expired or expiring within 30 minutes.
     * ML tokens have a 6-hour lifetime and can be refreshed using the refresh_token.
     */
    private async checkMercadoLivreTokens() {
        const users = await UserSettingsModel.find({
            'mercadolivre.isConfigured': true,
            'mercadolivre.refreshToken': { $exists: true, $ne: null },
        });

        if (users.length === 0) {
            logger.debug('ℹ️ No users with ML tokens to check.');
            return;
        }

        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        let refreshedCount = 0;
        let errorCount = 0;

        for (const settings of users) {
            const ml = settings.mercadolivre;
            if (!ml?.accessToken || !ml?.refreshToken) continue;

            const expiresAt = ml.tokenExpiresAt ? new Date(ml.tokenExpiresAt).getTime() : 0;

            // Skip if token is still valid (more than 30 minutes remaining)
            if (expiresAt > 0 && (expiresAt - now) > thirtyMinutes) {
                continue;
            }

            // Token is expired or expiring soon — auto-refresh
            logger.info(`🔄 ML Token expiring/expired for user ${settings.userId}. Auto-refreshing...`);

            try {
                const { MercadoLivreService } = await import('../mercadolivre/MercadoLivreService');
                const service = new MercadoLivreService({
                    clientId: ml.clientId || '',
                    clientSecret: ml.clientSecret || '',
                    redirectUri: ml.redirectUri || 'https://proplaynews.com.br/',
                    accessToken: ml.accessToken,
                    refreshToken: ml.refreshToken,
                    tokenExpiresAt: expiresAt || undefined,
                    userId: settings.userId?.toString(),
                });

                const tokens = await service.refreshAccessToken();

                // Save refreshed tokens to UserSettings
                settings.mercadolivre!.accessToken = tokens.access_token;
                settings.mercadolivre!.refreshToken = tokens.refresh_token;
                settings.mercadolivre!.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
                await settings.save();

                refreshedCount++;
                logger.info(`✅ ML Token auto-refreshed for user ${settings.userId}. Next expiry: ${settings.mercadolivre!.tokenExpiresAt!.toISOString()}`);

                // Rate limit: wait 3s between users to avoid 429
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error: any) {
                errorCount++;
                logger.error(`❌ Failed to auto-refresh ML token for user ${settings.userId}: ${error.message}`);
            }
        }

        logger.info(`✅ ML token check: ${users.length} users checked. Refreshed: ${refreshedCount}, Errors: ${errorCount}`);
    }
}
