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
        limit: 5
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
        limit: 10
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

  logger.info('Cron jobs scheduled');
}

