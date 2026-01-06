import cron from 'node-cron';
import { CollectorService } from '../services/collector/CollectorService';
import { OfferService } from '../services/offer/OfferService';
import { logger } from '../utils/logger';

const collectorService = new CollectorService();
const offerService = new OfferService();

/**
 * Setup all cron jobs
 */
export function setupCronJobs(): void {
  // Collect offers every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('⏰ ========================================');
    logger.info('⏰ Running scheduled collection job');
    logger.info('⏰ ========================================');
    try {
      const result = await collectorService.collectAll();
      logger.info(`⏰ Scheduled collection completed: ${result.total} total offers`);
    } catch (error) {
      logger.error('❌ Error in scheduled collection:', error);
    }
  });

  // Post best offers every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('⏰ ========================================');
    logger.info('⏰ Running scheduled posting job');
    logger.info('⏰ ========================================');
    try {
      // Get top 5 offers with highest discount that haven't been posted
      logger.info('🔍 Searching for best offers to post...');
      const offers = await offerService.filterOffers({
        excludePosted: true,
        minDiscount: 20,
        limit: 5,
      });

      logger.info(`📊 Found ${offers.length} offers to post`);

      if (offers.length > 0) {
        const offerIds = offers.map((o) => o._id!).filter((id) => id);
        logger.info(`📤 Posting ${offerIds.length} offers to Telegram and X (Twitter)...`);
        const postedCount = await offerService.postOffers(offerIds, ['telegram', 'x']);
        logger.info(`✅ Successfully posted ${postedCount}/${offerIds.length} offers`);
      } else {
        logger.info('ℹ️ No offers to post at this time');
      }
    } catch (error) {
      logger.error('❌ Error in scheduled posting:', error);
    }
  });

  // Generate AI posts for unposted offers every 12 hours
  cron.schedule('0 */12 * * *', async () => {
    logger.info('⏰ ========================================');
    logger.info('⏰ Running scheduled AI post generation');
    logger.info('⏰ ========================================');
    try {
      logger.info('🔍 Searching for offers without AI posts...');
      const offers = await offerService.filterOffers({
        excludePosted: true,
        limit: 10,
      });

      logger.info(`📊 Found ${offers.length} offers to generate AI posts for`);

      let generatedCount = 0;
      for (const offer of offers) {
        if (offer._id && !offer.aiGeneratedPost) {
          try {
            logger.info(`🤖 Generating AI post for offer: ${offer.title}`);
            await offerService.generateAIPost(offer._id);
            generatedCount++;
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Rate limit
          } catch (error) {
            logger.error(`❌ Error generating AI post for offer ${offer._id}:`, error);
          }
        }
      }

      logger.info(`✅ Generated ${generatedCount} AI posts`);
    } catch (error) {
      logger.error('❌ Error in scheduled AI generation:', error);
    }
  });

  // Process scheduled offers every minute
  cron.schedule('* * * * *', async () => {
    try {
      await offerService.processScheduledOffers();
    } catch (error) {
      logger.error('❌ Error processing scheduled offers:', error);
    }
  });

  // Process automation system every 30 minutes (Legacy/Interval Mode)
  cron.schedule('*/30 * * * *', async () => {
    logger.info('⚙️ ========================================');
    logger.info('⚙️ Running automation system (Interval Mode)');
    logger.info('⚙️ ========================================');
    try {
      const { AutomationService } = await import('../services/automation/AutomationService');
      const automationService = new AutomationService();
      const posted = await automationService.processScheduledPosts();
      if (posted > 0) {
        logger.info(`✅ Automation posted ${posted} offer(s)`);
      }
    } catch (error) {
      logger.error('❌ Error in automation system:', error);
    }
  });

  // Smart Planner: Distribute posts every hour (Smart Mode)
  cron.schedule('0 * * * *', async () => {
    logger.info('📅 ========================================');
    logger.info('📅 Running Smart Planner Distribution');
    logger.info('📅 ========================================');
    try {
      const { AutomationService } = await import('../services/automation/AutomationService');
      const automationService = new AutomationService();
      const scheduled = await automationService.distributeHourlyPosts();
      if (scheduled > 0) {
        logger.info(`✅ Smart Planner scheduled ${scheduled} posts for this hour`);
      }
    } catch (error) {
      logger.error('❌ Error in Smart Planner job:', error);
    }
  });

  // Awin Feed Sync: Refresh cached feeds every 6 hours
  cron.schedule('30 */6 * * *', async () => {
    logger.info('🔄 ========================================');
    logger.info('🔄 Running Awin Feed Sync');
    logger.info('🔄 ========================================');
    try {
      const { AwinFeedManager } = await import('../services/awin/AwinFeedManager');
      const { AwinService } = await import('../services/awin/AwinService');
      const awinService = new AwinService();

      if (!awinService.isConfigured() || !awinService.hasDataFeedApiKey()) {
        logger.debug('⏭️ Awin not configured, skipping feed sync');
        return;
      }

      const feedManager = new AwinFeedManager();
      const cachedFeeds = feedManager.getCachedFeeds();

      if (cachedFeeds.length === 0) {
        logger.info('ℹ️ No cached feeds to refresh');
        return;
      }

      let refreshedCount = 0;
      for (const feed of cachedFeeds) {
        try {
          await feedManager.getProducts(feed.advertiserId, {
            locale: feed.locale,
            forceRefresh: true,
          });
          refreshedCount++;
          // Rate limit: max 5 requests per minute
          await new Promise(resolve => setTimeout(resolve, 15000));
        } catch (error) {
          logger.error(`❌ Error refreshing feed ${feed.advertiserId}:`, error);
        }
      }

      logger.info(`✅ Awin Feed Sync: Refreshed ${refreshedCount}/${cachedFeeds.length} feeds`);
    } catch (error) {
      logger.error('❌ Error in Awin Feed Sync:', error);
    }
  });

  // Daily Cleanup: Soft delete offers older than 3 days
  cron.schedule('0 3 * * *', async () => {
    logger.info('🧹 ========================================');
    logger.info('🧹 Running Daily Offer Cleanup');
    logger.info('🧹 ========================================');
    try {
      const deletedCount = await offerService.cleanupOldOffers(3); // Keep 3 days of history
      logger.info(`✅ Cleanup completed: ${deletedCount} offers deactivated`);
    } catch (error) {
      logger.error('❌ Error in daily cleanup:', error);
    }
  });

  logger.info('Cron jobs scheduled');
}

