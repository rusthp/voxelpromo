import cron from 'node-cron';
import { logger } from '../../utils/logger';
import { UserSettingsModel } from '../../models/UserSettings';

/**
 * Job to check Instagram Token Expiry daily
 * CRITICAL COMMERCIAL FEATURE
 */
export class TokenExpiryJob {
    private job: cron.ScheduledTask;

    constructor() {
        // Run every day at 09:00 AM
        // scheduled: false ensures it doesn't start immediately
        this.job = cron.schedule('0 9 * * *', () => {
            this.checkAllUsers();
        }, { scheduled: false });
    }

    start() {
        logger.info('⏰ TokenExpiryJob scheduled (Daily at 09:00)');
        this.job.start();
    }

    async checkAllUsers() {
        logger.info('🔍 Starting Daily Instagram Token Expiry Check...');

        try {
            const users = await UserSettingsModel.find({
                'instagram.isConfigured': true,
                'instagram.tokenStatus': { $ne: 'expired' } // Don't re-alert already expired
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
                    // TODO: Send Email/Telegram Alert
                    continue;
                }

                // 2. Check for Warning (< 7 days)
                if (expiryDate < warningThreshold) {
                    logger.warn(`⚠️ Instagram Token EXPIRING in ${daysRemaining} days for user ${settings.userId}.`);

                    if (settings.instagram.tokenStatus !== 'expiring') {
                        settings.instagram.tokenStatus = 'expiring';
                        await settings.save();
                        // TODO: Send Email/Telegram Alert
                    }
                }
            }

            logger.info(`✅ Token Expiry Check complete. Checked ${users.length} users.`);
        } catch (error: any) {
            logger.error(`❌ Error in TokenExpiryJob: ${error.message}`);
        }
    }
}
