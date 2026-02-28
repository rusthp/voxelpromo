import { AutomationConfigModel } from '../../models/AutomationConfig';
import { OfferModel } from '../../models/Offer';
import { ProductStatsModel } from '../../models/ProductStats';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { configCache } from '../../utils/cache';
import { PrioritizationService } from './PrioritizationService';
import { TemplateService } from './TemplateService';

export class AutomationService {
  private prioritizationService: PrioritizationService;
  private templateService: TemplateService;
  private static readonly CACHE_KEY_CONFIG_PREFIX = 'automation:config';
  private static readonly CACHE_KEY_STATUS_PREFIX = 'automation:status';

  constructor() {
    this.prioritizationService = new PrioritizationService();
    this.templateService = new TemplateService();
  }

  /**
   * Get active automation configuration for a specific user (🚀 TURBO: with cache)
   */
  async getActiveConfig(userId: string): Promise<any | null> {
    try {
      // 🚀 TURBO: Check cache first (per-user key)
      const cacheKey = `${AutomationService.CACHE_KEY_CONFIG_PREFIX}:${userId}`;
      const cached = configCache.get(cacheKey);
      if (cached) {
        logger.debug(`🚀 Turbo: Config loaded from cache for user ${userId}`);
        return cached;
      }

      // Cache miss - fetch from database (scoped by userId)
      const config = await AutomationConfigModel.findOne({ userId })
        .sort({ updatedAt: -1 })
        .populate('messageTemplateId')
        .lean();

      // 🚀 TURBO: Cache the result for 5 minutes
      if (config) {
        configCache.set(cacheKey, config);
      }

      return config;
    } catch (error) {
      logger.error(`Error getting active config for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Save or update automation configuration for a specific user
   */
  async saveConfig(userId: string, configData: any): Promise<any> {
    try {
      // If setting this config as active, deactivate other configs for this user
      if (configData.isActive) {
        await AutomationConfigModel.updateMany({ userId }, { isActive: false });
      }

      // Check if this user has an existing config
      const existing = await AutomationConfigModel.findOne({ userId });

      if (existing) {
        const wasActive = existing.isActive;
        // Update existing config
        Object.assign(existing, configData);
        existing.userId = userId; // Ensure userId is always set
        existing.updatedAt = new Date();
        await existing.save();
        logger.info(`✅ Automation config updated for user ${userId}`);

        // If pausing automation, clear already scheduled pending posts
        if (wasActive && !configData.isActive) {
          logger.info(`⏸️ Automation paused for user ${userId}. Clearing pending scheduled offers...`);
          await OfferModel.updateMany(
            { userId, isPosted: false, scheduledAt: { $exists: true } },
            { $unset: { scheduledAt: 1 } }
          );
        }

        // 🚀 TURBO: Invalidate cache for this user
        configCache.invalidate(`${AutomationService.CACHE_KEY_CONFIG_PREFIX}:${userId}`);
        configCache.invalidate(`${AutomationService.CACHE_KEY_STATUS_PREFIX}:${userId}`);

        return existing.toObject();
      } else {
        // Create new config with userId
        const newConfig = new AutomationConfigModel({ ...configData, userId });
        await newConfig.save();
        logger.info(`✅ Automation config created for user ${userId}`);

        if (configData.isActive === false) {
          await OfferModel.updateMany(
            { userId, isPosted: false, scheduledAt: { $exists: true } },
            { $unset: { scheduledAt: 1 } }
          );
        }

        // 🚀 TURBO: Invalidate cache for this user
        configCache.invalidate(`${AutomationService.CACHE_KEY_CONFIG_PREFIX}:${userId}`);
        configCache.invalidate(`${AutomationService.CACHE_KEY_STATUS_PREFIX}:${userId}`);

        return newConfig.toObject();
      }
    } catch (error) {
      logger.error(`Error saving config for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if we should post now based on schedule
   */
  shouldPostNow(config: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    // Check if within allowed hours
    // Handle overnight posting (e.g., 8h to 1h means 8:00-23:59 and 0:00-1:00)
    if (config.startHour <= config.endHour) {
      // Normal range (e.g., 8h to 18h)
      if (currentHour < config.startHour || currentHour >= config.endHour) {
        return false;
      }
    } else {
      // Overnight range (e.g., 8h to 1h)
      if (currentHour < config.startHour && currentHour >= config.endHour) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get next offers to post based on configuration and prioritization
   * 🚀 TURBO: Optimized with batch processing and lean queries
   * Multi-tenant: Scoped by userId
   */
  async getNextScheduledOffers(userId: string, config: any, limit: number = 5): Promise<Offer[]> {
    try {
      // Build query based on filters — always scoped by userId
      const query: any = {
        userId,
        isActive: true,
        isPosted: false,
      };

      // Filter by sources
      if (config.enabledSources && config.enabledSources.length > 0) {
        query.source = { $in: config.enabledSources };
      }

      // Filter by categories
      if (config.enabledCategories && config.enabledCategories.length > 0) {
        query.category = { $in: config.enabledCategories };
      }

      // Filter by minimum discount
      if (config.minDiscount && config.minDiscount > 0) {
        query.discountPercentage = { $gte: config.minDiscount };
      }

      // Filter by maximum price
      if (config.maxPrice && config.maxPrice > 0) {
        query.currentPrice = { $lte: config.maxPrice };
      }

      // 🚀 TURBO: Use lean() for faster queries, limit fields
      const offers = await OfferModel.find(query)
        .select(
          'title productUrl currentPrice originalPrice discountPercentage source category scheduledAt _id'
        )
        .lean()
        .limit(limit * 3); // Get 3x to have options after prioritization

      if (offers.length === 0) {
        return [];
      }

      // Get current hour for prioritization
      const currentHour = new Date().getHours();

      // 🚀 TURBO: Batch load all product stats in ONE query
      const productUrls = offers.map((o: any) => o.productUrl);
      const statsMap = new Map();

      const allStats = await ProductStatsModel.find({
        productUrl: { $in: productUrls },
      })
        .select('productUrl salesScore popularityScore peakHourScore')
        .lean();

      allStats.forEach((stat: any) => {
        statsMap.set(stat.productUrl, stat);
      });

      // Calculate priority for each offer (synchronous - no DB calls)
      const offersWithPriority = offers.map((offer: any) => {
        const stats = statsMap.get(offer.productUrl);
        const priority = this.calculatePrioritySync(offer, stats, currentHour, config);
        return {
          ...offer,
          _priority: priority,
        };
      });

      // Sort by priority (descending)
      offersWithPriority.sort((a, b) => b._priority - a._priority);

      // 🔄 Source rotation: interleave offers from different sources
      // Groups by source, then round-robins (ML → Shopee → ML → Shopee...)
      const bySource = new Map<string, any[]>();
      for (const offer of offersWithPriority) {
        const src = offer.source || 'unknown';
        if (!bySource.has(src)) bySource.set(src, []);
        bySource.get(src)!.push(offer);
      }

      const sourceQueues = Array.from(bySource.values());
      const interleaved: any[] = [];
      let idx = 0;

      while (interleaved.length < limit && sourceQueues.some(q => q.length > 0)) {
        const queue = sourceQueues[idx % sourceQueues.length];
        if (queue.length > 0) {
          interleaved.push(queue.shift()!);
        }
        idx++;
        // Safety: prevent infinite loop if all queues are empty
        if (idx > offersWithPriority.length * 2) break;
      }

      // Return interleaved offers
      return interleaved.slice(0, limit).map(({ _priority, ...offer }) => offer as Offer);
    } catch (error) {
      logger.error('Error getting next scheduled offers:', error);
      return [];
    }
  }

  /**
   * 🚀 TURBO: Synchronous priority calculation (no async DB calls)
   * Used for batch processing - stats are pre-loaded
   */
  private calculatePrioritySync(
    offer: any,
    stats: any | null,
    currentHour: number,
    config: any
  ): number {
    // Calculate component scores
    const peakScore = this.prioritizationService.getPeakHourScore(currentHour, config.peakHours);
    const salesScore = stats ? stats.salesScore : 0;
    const discountScore = this.prioritizationService.getDiscountScore(
      offer.discountPercentage,
      config.minDiscount || 20
    );

    // NEW: Calculate seasonal score
    const seasonalScore = this.prioritizationService.getSeasonalScore(offer);

    // NEW: Calculate revenue score (High Ticket Strategy)
    const revenueScore = this.prioritizationService.getRevenueScore(
      offer.discountPercentage,
      offer.currentPrice || 0
    );

    // Calculate price score (0-100) for "Cheap Item Boost" strategy
    // Favor cheap items (< 50 = 100 score, > 200 = 0 score) for off-peak times
    let priceScore = 0;
    if (offer.currentPrice && offer.currentPrice > 0) {
      if (offer.currentPrice < 50) priceScore = 100;
      else if (offer.currentPrice > 200) priceScore = 0;
      else {
        // Linear interpolation between 50 and 200: (200 - price) / 1.5
        // 50 -> 150/1.5 = 100
        // 125 -> 75/1.5 = 50
        // 200 -> 0
        priceScore = (200 - offer.currentPrice) / 1.5;
      }
    }

    // Calculate final score
    const finalScore = this.prioritizationService.calculateFinalScore(
      {
        peakScore,
        salesScore,
        discountScore,
        priceScore,
        seasonalScore,
        revenueScore,
      },
      {
        isPeakHour: peakScore > 50,
        prioritizeBestSellersInPeak: config.prioritizeBestSellersInPeak,
        prioritizeBigDiscountsInPeak: config.prioritizeBigDiscountsInPeak,
        discountWeightVsSales: config.discountWeightVsSales,
        prioritizeHighTicket: config.prioritizeHighTicket,
        highTicketThreshold: config.highTicketThreshold,
        minPriceForHighTicket: config.minPriceForHighTicket,
        minDiscountForHighTicket: config.minDiscountForHighTicket,
        currentPrice: offer.currentPrice || 0,
        discountPercent: offer.discountPercentage || 0,
      }
    );

    return finalScore;
  }

  /**
   * Calculate priority score for an offer (legacy method - kept for compatibility)
   * Note: getNextScheduledOffers() now uses batch processing instead
   */
  async calculatePriority(offer: any, currentHour: number, config: any): Promise<number> {
    try {
      // Get product stats if available
      const stats = await ProductStatsModel.findOne({ productUrl: offer.productUrl }).lean();

      return this.calculatePrioritySync(offer, stats, currentHour, config);
    } catch (error) {
      logger.error('Error calculating priority:', error);
      return 0;
    }
  }

  /**
   * Process scheduled posts - called by cron job
   * Multi-tenant: Scoped by userId
   */
  async processScheduledPosts(userId: string): Promise<number> {
    try {
      const config = await this.getActiveConfig(userId);

      if (!config || !config.isActive) {
        return 0;
      }

      // If Smart Planner is enabled, skip this legacy interval check
      if (config.postsPerHour && config.postsPerHour > 0) {
        logger.debug('⚙️ Smart Planner active: Skipping legacy interval check.');
        return 0;
      }

      // Check if we should post now
      if (!this.shouldPostNow(config)) {
        logger.debug('⏰ Outside posting hours, skipping automation');
        return 0;
      }

      // Get next offers to post (scoped by userId)
      const offers = await this.getNextScheduledOffers(userId, config, 1); // Get 1 offer per cycle

      if (offers.length === 0) {
        logger.debug('📭 No offers available for posting');
        return 0;
      }

      const offer = offers[0];

      // Render message using template
      let message = '';
      let templateTone = '';
      let templateId = '';
      if (config.messageTemplateId) {
        const template = await this.templateService.getTemplate(
          config.messageTemplateId.toString()
        );
        if (template) {
          message = this.templateService.renderTemplate(template, offer);
          templateTone = template.tone || '';
          templateId = template._id?.toString() || config.messageTemplateId.toString();
        }
      }

      // If no template or rendering failed, use default
      if (!message) {
        message = this.templateService.renderDefaultTemplate(offer);
        templateTone = 'default';
      }

      // 🔗 Attach rendered message to offer — channels MUST use this
      offer.rendered = {
        text: message,
        templateId: templateId || undefined,
        tone: templateTone,
        generatedAt: new Date(),
      };

      logger.info(`📤 Automation posting offer: ${offer.title.substring(0, 50)}...`);
      logger.info(`📝 Using message: ${message.substring(0, 100)}...`);

      // Check if offer has specific channels override, otherwise use config
      const channels =
        config.enabledChannels && config.enabledChannels.length > 0
          ? config.enabledChannels
          : ['telegram'];

      // Initialize OfferService dynamically to avoid circular dependencies
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OfferService } = require('../offer/OfferService');
      const offerService = new OfferService();

      // Actually post using OfferService
      // Note: OfferService handles history logging and status updates itself
      const success = await offerService.postOffer(offer._id!.toString(), channels, userId);

      if (success) {
        // Determine if we generated an AI post for this
        // If message is different from default format, save it
        if (message && !message.includes(offer.productUrl)) {
          // This is a naive check, but serves to detect if we used a template
          await OfferModel.findByIdAndUpdate(offer._id, {
            aiGeneratedPost: message,
          });
        }

        // Update product stats
        await this.updateProductStats(offer.productUrl, offer.source);

        logger.info('✅ Automation post successful');
        return 1;
      } else {
        logger.warn('⚠️ Automation post failed in OfferService');
        return 0;
      }
    } catch (error) {
      logger.error('❌ Error processing scheduled posts:', error);
      return 0;
    }
  }

  /**
   * Update product stats after posting
   */
  private async updateProductStats(productUrl: string, source: string): Promise<void> {
    try {
      let stats = await ProductStatsModel.findOne({ productUrl });

      if (!stats) {
        stats = new ProductStatsModel({
          productUrl,
          source,
        });
      }

      stats.incrementPost();
      stats.calculateScores();
      await stats.save();
    } catch (error) {
      logger.error('Error updating product stats:', error);
    }
  }

  /**
   * Get automation status (for frontend)
   * Multi-tenant: Scoped by userId
   */
  async getStatus(userId: string): Promise<any> {
    try {
      const config = await this.getActiveConfig(userId);

      if (!config) {
        return {
          isActive: false,
          message: 'No automation configured',
        };
      }

      const shouldPost = this.shouldPostNow(config);
      const nextOffers = await this.getNextScheduledOffers(userId, config, 5);

      // Get last posted offer for this user
      const lastPostedOffer = await OfferModel.findOne({ userId, isPosted: true })
        .sort({ updatedAt: -1 })
        .select('title updatedAt')
        .lean();

      // Get today's post count for this user
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const postsToday = await OfferModel.countDocuments({
        userId,
        isPosted: true,
        updatedAt: { $gte: today },
      });

      // Get total posted for this user
      const totalPosted = await OfferModel.countDocuments({ userId, isPosted: true });

      // Get pending offers count for this user
      const pendingCount = await OfferModel.countDocuments({
        userId,
        isActive: true,
        isPosted: false,
        discountPercentage: { $gte: config.minDiscountPercentage || 0 },
      });

      return {
        isActive: config.isActive,
        shouldPost,
        currentHour: new Date().getHours(),
        lastPostedAt: lastPostedOffer?.updatedAt || null,
        lastPostedTitle: lastPostedOffer?.title || null,
        postsToday,
        totalPosted,
        pendingCount,
        nextOffers: nextOffers.map((o) => ({
          id: o._id,
          title: o.title,
          discount: o.discountPercentage,
          source: o.source,
        })),
        config: {
          startHour: config.startHour,
          endHour: config.endHour,
          intervalMinutes: config.intervalMinutes,
          postsPerHour: config.postsPerHour,
          enabledChannels: config.enabledChannels,
        },
      };
    } catch (error) {
      logger.error('Error getting automation status:', error);
      return {
        isActive: false,
        error: 'Error getting status',
      };
    }
  }

  /**
   * Smart Hourly Planner: Distribute quantity of posts randomly within the current hour
   * Uses unique random minutes to avoid collisions - more human-like behavior
   * Example: postsPerHour=5 -> posts at 09:05, 09:12, 09:27, 09:38, 09:51
   * Multi-tenant: Scoped by userId
   */
  async distributeHourlyPosts(userId: string): Promise<number> {
    try {
      const config = await this.getActiveConfig(userId);
      if (!config || !config.isActive) {
        logger.debug(`📅 Smart Planner: Config not active for user ${userId}, skipping.`);
        return 0;
      }

      // Only run if Smart Planner is enabled (postsPerHour > 0)
      if (!config.postsPerHour || config.postsPerHour <= 0) {
        logger.debug('📅 Smart Planner: Disabled (postsPerHour <= 0).');
        return 0;
      }

      // Check if we are inside working hours
      if (!this.shouldPostNow(config)) {
        const now = new Date();
        logger.info(
          `⏰ Smart Planner: Outside working hours (${config.startHour}h-${config.endHour}h), current: ${now.getHours()}h. Skipping.`
        );
        return 0;
      }

      const quantity = config.postsPerHour;
      const now = new Date();
      const currentMinute = now.getMinutes();
      const remainingMinutes = 59 - currentMinute;

      logger.info(
        `📅 Smart Planner: Distributing up to ${quantity} posts for hour ${now.getHours()}:00...`
      );
      logger.info(
        `   Current time: ${now.getHours()}:${String(currentMinute).padStart(2, '0')}, ${remainingMinutes} minutes remaining.`
      );

      // Check if we have enough time
      if (remainingMinutes < 1) {
        logger.warn('⚠️ Smart Planner: Not enough time left in this hour.');
        return 0;
      }

      // Get candidate offers (get 2x quantity to have backup), scoped by userId
      const offers = await this.getNextScheduledOffers(userId, config, quantity * 2);

      // Filter offers that are NOT already scheduled
      const availableOffers = offers.filter((o: any) => !o.scheduledAt);

      if (availableOffers.length === 0) {
        logger.warn('⚠️ Smart Planner: No offers available to distribute.');
        return 0;
      }

      // Take the exact quantity needed (limited by available offers and remaining time)
      const maxPosts = Math.min(quantity, availableOffers.length, remainingMinutes);
      const selectedOffers = availableOffers.slice(0, maxPosts);

      if (maxPosts < quantity) {
        logger.info(
          `   Adjusted to ${maxPosts} posts (offers: ${availableOffers.length}, time: ${remainingMinutes}min).`
        );
      }

      // Allocate Chunked Randomness logic
      // We divide the remaining runtime (e.g., 60 minutes) into equal blocks based on how many
      // posts we want, and pick a random minute within each block to guarantee spacing.
      const selectedMinutes: number[] = [];
      const chunkSize = Math.floor(remainingMinutes / selectedOffers.length);

      for (let i = 0; i < selectedOffers.length; i++) {
        // For each block, determine start and end boundaries
        const minOffset = i * chunkSize + 1; // e.g. 1
        const maxOffset = (i + 1) * chunkSize; // e.g. 12
        // Pick a random minute inside this block
        const randomMinute = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
        selectedMinutes.push(randomMinute);
      }

      // Initialize OfferService
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OfferService } = require('../offer/OfferService');
      const offerService = new OfferService();

      let scheduledCount = 0;

      for (let i = 0; i < selectedOffers.length && i < selectedMinutes.length; i++) {
        const offer = selectedOffers[i];
        const minuteOffset = selectedMinutes[i];
        const scheduleTime = new Date(now.getTime() + minuteOffset * 60000);

        // Schedule it
        await offerService.scheduleOffer(offer._id!.toString(), scheduleTime);

        const timeStr = `${String(scheduleTime.getHours()).padStart(2, '0')}:${String(scheduleTime.getMinutes()).padStart(2, '0')}`;
        const titlePreview =
          offer.title.length > 35 ? offer.title.substring(0, 35) + '...' : offer.title;
        logger.info(`   📍 Scheduled: "${titlePreview}" → ${timeStr}`);

        scheduledCount++;
      }

      logger.info(
        `✅ Smart Planner: Successfully scheduled ${scheduledCount} posts for this hour.`
      );
      return scheduledCount;
    } catch (error) {
      logger.error('❌ Error in Smart Planner:', error);
      return 0;
    }
  }
}
