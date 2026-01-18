import cron from 'node-cron';
import { CollectorService } from '../services/collector/CollectorService';
import { OfferService } from '../services/offer/OfferService';
import { logger } from '../utils/logger';
import { UserModel } from '../models/User';

/**
 * Helper to run a job for all active users
 * Ensures error isolation between users
 */
async function runJobForActiveUsers(jobName: string, action: (user: any) => Promise<void>) {
  const startTime = Date.now();
  logger.info(`👥 [Multi-Tenant Job] Starting ${jobName}...`);

  try {
    // Find active users
    // For now, checks 'isActive' flag. In future, check subscription status too.
    const users = await UserModel.find({ isActive: true });

    if (users.length === 0) {
      logger.info(`ℹ️ No active users found for ${jobName}.`);
      return;
    }

    logger.info(`👥 Found ${users.length} active users. Processing...`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        await action(user);
        successCount++;
      } catch (userError: any) {
        errorCount++;
        logger.error(`❌ Error in ${jobName} for user ${user.email} (${user._id}): ${userError.message}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ [Multi-Tenant Job] ${jobName} completed in ${duration}s. Success: ${successCount}, Errors: ${errorCount}.`);
  } catch (error: any) {
    logger.error(`❌ Critical Error running multi-tenant job ${jobName}: ${error.message}`, error);
  }
}

/**
 * Setup all cron jobs
 */
export function setupCronJobs(): void {
  const offerService = new OfferService(); // Stateless helper (methods accept userId)

  // 1. Collect offers every 6 hours (Multi-Tenant)
  // Runs at 4:00, 10:00, 16:00, 22:00
  cron.schedule('0 4,10,16,22 * * *', async () => {
    await runJobForActiveUsers('Collection', async (user) => {
      // Ensure userId is a string (user._id is an ObjectId)
      const userId = user._id?.toString() || user.id?.toString();
      if (!userId) {
        logger.error(`❌ User ${user.email} has no valid ID. Skipping collection.`);
        return;
      }

      logger.debug(`📋 Starting collection for user ${user.email} (ID: ${userId})`);

      // Instantiate collector with user context
      const collectorService = new CollectorService({}, userId);

      // collectAll now looks up UserSettings for this user
      const result = await collectorService.collectAll();

      if (result.total > 0) {
        logger.info(`   -> User ${user.email}: Collected ${result.total} offers`);
      }
    });
  });

  // 2. Post best offers every day at 9 AM (Multi-Tenant)
  cron.schedule('0 9 * * *', async () => {
    await runJobForActiveUsers('Morning Posting', async (user) => {
      logger.debug(`   -> Checking morning posts for ${user.email}...`);

      // Find best offers for THIS user
      const offers = await offerService.filterOffers({
        excludePosted: true,
        minDiscount: 20,
        limit: 5,
        userId: user.id
      });

      if (offers.length > 0) {
        const offerIds = offers.map(o => o._id!.toString());
        logger.info(`   -> User ${user.email}: Found ${offers.length} offers to post.`);

        // Post offers using user context (will load user's Telegram/X keys)
        const postedCount = await offerService.postOffers(offerIds, ['telegram', 'x'], user.id);

        if (postedCount > 0) {
          logger.info(`   -> User ${user.email}: ✅ Successfully posted ${postedCount} offers.`);
        }
      } else {
        // logger.debug(`   -> User ${user.email}: No offers to post.`);
      }
    });
  });

  // 3. Generate AI posts every 12 hours (Multi-Tenant)
  cron.schedule('0 */12 * * *', async () => {
    await runJobForActiveUsers('AI Generation', async (user) => {
      const offers = await offerService.filterOffers({
        excludePosted: true,
        limit: 10,
        userId: user.id
      });

      let generated = 0;
      for (const offer of offers) {
        if (offer._id && !offer.aiGeneratedPost) {
          try {
            await offerService.generateAIPost(offer._id, 'viral', user.id.toString());
            generated++;
            // Basic rate limit
            await new Promise(r => setTimeout(r, 1000));
          } catch (e) {
            // Ignore individual failures
          }
        }
      }
      if (generated > 0) {
        logger.info(`   -> User ${user.email}: Generated ${generated} AI posts`);
      }
    });
  });

  // 4. Process scheduled offers (Global Loop)
  // This runs every minute and processes offers from ALL users.
  // The offerService.processScheduledOffers() method iterates through DUE offers
  // and internally calls postOffer(), which correctly loads credentials based on offer.userId.
  cron.schedule('* * * * *', async () => {
    try {
      await offerService.processScheduledOffers();
    } catch (error) {
      logger.error('❌ Error processing scheduled offers:', error);
    }
  });

  // 5. Daily Cleanup (3 AM) - Global
  // Keeps logic to cleanup old offers for everyone
  cron.schedule('0 3 * * *', async () => {
    logger.info('🧹 Running Daily Offer Cleanup (Global)');
    try {
      const deletedCount = await offerService.cleanupOldOffers(3); // Keep 3 days
      logger.info(`✅ Cleanup completed: ${deletedCount} offers deactivated`);
    } catch (error) {
      logger.error('❌ Error in daily cleanup:', error);
    }
  });

  // 6. Subscription Sync (6 em 6 hours) - Already Multi-Tenant aware
  cron.schedule('0 */6 * * *', async () => {
    logger.info('💳 Running Subscription Status Sync');
    try {
      // Import dynamically to avoid circular dependencies with User
      const { UserModel: User } = await import('../models/User'); // Re-import to be safe or use global
      const { getPaymentService } = await import('../services/PaymentService');

      let paymentService;
      try {
        paymentService = getPaymentService();
      } catch {
        logger.debug('⏭️ PaymentService not configured, skipping subscription sync');
        return;
      }

      // Find all users with active recurring subscriptions
      const usersWithSubscriptions = await User.find({
        'subscription.mpSubscriptionId': { $exists: true, $ne: null },
        'subscription.accessType': 'recurring',
        'subscription.status': { $in: ['authorized', 'paused', 'pending'] }
      }).limit(100);

      if (usersWithSubscriptions.length === 0) return;

      let syncedCount = 0;
      for (const user of usersWithSubscriptions) {
        try {
          if (!user.subscription?.mpSubscriptionId) continue;
          const mpDetails = await paymentService.getSubscriptionDetails(user.subscription.mpSubscriptionId);

          let newStatus: any = user.subscription.status;
          if (mpDetails.status === 'authorized') newStatus = 'authorized';
          else if (mpDetails.status === 'paused') newStatus = 'paused';
          else if (mpDetails.status === 'cancelled') newStatus = 'cancelled';
          else if (mpDetails.status === 'pending') newStatus = 'pending';

          if (user.subscription.status !== newStatus) {
            user.subscription.status = newStatus;
          }
          if (mpDetails.next_payment_date) {
            user.subscription.nextBillingDate = new Date(mpDetails.next_payment_date);
          }
          await user.save();
          syncedCount++;
          await new Promise(resolve => setTimeout(resolve, 6000)); // Rate limit
        } catch (error) {
          // Log error
        }
      }
      logger.info(`✅ Subscription Sync: ${syncedCount} synced`);
    } catch (error) {
      logger.error('❌ Error in Subscription Sync:', error);
    }
  });

  // 7. Awin Feed Sync (Legacy/Global)
  // Maintains existing behavior for now (Admin keys/Env)
  cron.schedule('30 */6 * * *', async () => {
    logger.info('🔄 Running Awin Feed Sync (Global/System)');
    try {
      const { AwinFeedManager } = await import('../services/awin/AwinFeedManager');
      const { AwinService } = await import('../services/awin/AwinService');
      const awinService = new AwinService(); // Global config

      if (!awinService.isConfigured()) return;

      const feedManager = new AwinFeedManager();
      const cachedFeeds = feedManager.getCachedFeeds();

      if (cachedFeeds.length > 0) {
        let refreshedCount = 0;
        for (const feed of cachedFeeds) {
          try {
            await feedManager.getProducts(feed.advertiserId, { forceRefresh: true });
            refreshedCount++;
            await new Promise(resolve => setTimeout(resolve, 15000));
          } catch (e) { /* Ignore individual feed refresh errors */ }
        }
        logger.info(`✅ Awin Feed Sync: Refreshed ${refreshedCount} feeds`);
      }
    } catch (error) {
      logger.error('❌ Error in Awin Feed Sync:', error);
    }
  });

  logger.info('✅ Cron jobs scheduled (Multi-Tenant Mode)');
}

