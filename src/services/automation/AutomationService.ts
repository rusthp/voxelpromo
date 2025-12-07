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
    private static readonly CACHE_KEY_CONFIG = 'automation:config';
    private static readonly CACHE_KEY_STATUS = 'automation:status';

    constructor() {
        this.prioritizationService = new PrioritizationService();
        this.templateService = new TemplateService();
    }

    /**
     * Get active automation configuration (🚀 TURBO: with cache)
     */
    async getActiveConfig(): Promise<any | null> {
        try {
            // 🚀 TURBO: Check cache first
            const cached = configCache.get(AutomationService.CACHE_KEY_CONFIG);
            if (cached) {
                logger.debug('🚀 Turbo: Config loaded from cache');
                return cached;
            }

            // Cache miss - fetch from database
            const config = await AutomationConfigModel.findOne({ isActive: true })
                .populate('messageTemplateId')
                .lean();

            // 🚀 TURBO: Cache the result for 5 minutes
            if (config) {
                configCache.set(AutomationService.CACHE_KEY_CONFIG, config);
            }

            return config;
        } catch (error) {
            logger.error('Error getting active config:', error);
            return null;
        }
    }

    /**
     * Save or update automation configuration
     */
    async saveConfig(configData: any): Promise<any> {
        try {
            // If setting this config as active, deactivate all others
            if (configData.isActive) {
                await AutomationConfigModel.updateMany({}, { isActive: false });
            }

            // Check if we have an existing config
            const existing = await AutomationConfigModel.findOne({});

            if (existing) {
                // Update existing config
                Object.assign(existing, configData);
                existing.updatedAt = new Date();
                await existing.save();
                logger.info('✅ Automation config updated');

                // 🚀 TURBO: Invalidate cache
                configCache.invalidate(AutomationService.CACHE_KEY_CONFIG);
                configCache.invalidate(AutomationService.CACHE_KEY_STATUS);

                return existing.toObject();
            } else {
                // Create new config
                const newConfig = new AutomationConfigModel(configData);
                await newConfig.save();
                logger.info('✅ Automation config created');

                // 🚀 TURBO: Invalidate cache
                configCache.invalidate(AutomationService.CACHE_KEY_CONFIG);
                configCache.invalidate(AutomationService.CACHE_KEY_STATUS);

                return newConfig.toObject();
            }
        } catch (error) {
            logger.error('Error saving config:', error);
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
     */
    async getNextScheduledOffers(config: any, limit: number = 5): Promise<Offer[]> {
        try {
            // Build query based on filters
            const query: any = {
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
                .select('title productUrl currentPrice originalPrice discountPercentage source category _id')
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
                productUrl: { $in: productUrls }
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

            // Return top N offers
            return offersWithPriority.slice(0, limit).map(({ _priority, ...offer }) => offer as Offer);
        } catch (error) {
            logger.error('Error getting next scheduled offers:', error);
            return [];
        }
    }

    /**
     * 🚀 TURBO: Synchronous priority calculation (no async DB calls)
     * Used for batch processing - stats are pre-loaded
     */
    private calculatePrioritySync(offer: any, stats: any | null, currentHour: number, config: any): number {
        // Calculate component scores
        const peakScore = this.prioritizationService.getPeakHourScore(currentHour, config.peakHours);
        const salesScore = stats ? stats.salesScore : 0;
        const discountScore = this.prioritizationService.getDiscountScore(
            offer.discountPercentage,
            config.minDiscount || 20
        );

        // Calculate final score
        const finalScore = this.prioritizationService.calculateFinalScore(
            {
                peakScore,
                salesScore,
                discountScore,
            },
            {
                isPeakHour: peakScore > 50,
                prioritizeBestSellersInPeak: config.prioritizeBestSellersInPeak,
                prioritizeBigDiscountsInPeak: config.prioritizeBigDiscountsInPeak,
                discountWeightVsSales: config.discountWeightVsSales,
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
     */
    async processScheduledPosts(): Promise<number> {
        try {
            const config = await this.getActiveConfig();

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

            // Get next offers to post
            const offers = await this.getNextScheduledOffers(config, 1); // Get 1 offer per cycle

            if (offers.length === 0) {
                logger.debug('📭 No offers available for posting');
                return 0;
            }

            const offer = offers[0];

            // Render message using template
            let message = '';
            if (config.messageTemplateId) {
                const template = await this.templateService.getTemplate(config.messageTemplateId.toString());
                if (template) {
                    message = this.templateService.renderTemplate(template, offer);
                }
            }

            // If no template or rendering failed, use default
            if (!message) {
                message = this.templateService.renderDefaultTemplate(offer);
            }

            logger.info(`📤 Automation posting offer: ${offer.title.substring(0, 50)}...`);
            logger.info(`📝 Using message: ${message.substring(0, 100)}...`);

            // Check if offer has specific channels override, otherwise use config
            const channels = config.enabledChannels && config.enabledChannels.length > 0
                ? config.enabledChannels
                : ['telegram'];

            // Initialize OfferService dynamically to avoid circular dependencies
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { OfferService } = require('../offer/OfferService');
            const offerService = new OfferService();

            // Actually post using OfferService
            // Note: OfferService handles history logging and status updates itself
            const success = await offerService.postOffer(offer._id!.toString(), channels);

            if (success) {
                // Determine if we generated an AI post for this
                // If message is different from default format, save it
                if (message && !message.includes(offer.productUrl)) {
                    // This is a naive check, but serves to detect if we used a template
                    await OfferModel.findByIdAndUpdate(offer._id, {
                        aiGeneratedPost: message
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
     */
    async getStatus(): Promise<any> {
        try {
            const config = await this.getActiveConfig();

            if (!config) {
                return {
                    isActive: false,
                    message: 'No automation configured',
                };
            }

            const shouldPost = this.shouldPostNow(config);
            const nextOffers = await this.getNextScheduledOffers(config, 5);

            return {
                isActive: config.isActive,
                shouldPost,
                currentHour: new Date().getHours(),
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
     * Example: Distribute 10 posts -> 09:05, 09:12, 09:27...
     */
    async distributeHourlyPosts(): Promise<number> {
        try {
            const config = await this.getActiveConfig();
            if (!config || !config.isActive) return 0;

            // Only run if Smart Planner is enabled (postsPerHour > 0)
            if (!config.postsPerHour || config.postsPerHour <= 0) {
                return 0;
            }

            // Check if we are inside working hours
            if (!this.shouldPostNow(config)) {
                logger.info('⏰ Smart Planner: Outside working hours, skipping distribution.');
                return 0;
            }

            const quantity = config.postsPerHour;
            logger.info(`📅 Smart Planner: Distributing ${quantity} posts for this hour...`);

            // Get candidate offers (get 2x quantity to have backup)
            const offers = await this.getNextScheduledOffers(config, quantity * 2);

            // Filter offers that are NOT already scheduled
            const availableOffers = offers.filter((o: any) => !o.scheduledAt);

            if (availableOffers.length === 0) {
                logger.warn('⚠️ Smart Planner: No offers available to distribute.');
                return 0;
            }

            // Take the exact quantity needed
            const selectedOffers = availableOffers.slice(0, quantity);

            // Initialize OfferService
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { OfferService } = require('../offer/OfferService');
            const offerService = new OfferService();

            const now = new Date();
            let scheduledCount = 0;

            for (const offer of selectedOffers) {
                // Generate random minute (from now + 1min until end of hour - 1min)
                // We leave 1min buffer at start and end
                const remainingMinutes = 59 - now.getMinutes();
                if (remainingMinutes < 2) break; // Not enough time left in this hour

                const randomMinuteOffset = Math.floor(Math.random() * remainingMinutes) + 1;
                const scheduleTime = new Date(now.getTime() + randomMinuteOffset * 60000);

                // Schedule it
                await offerService.scheduleOffer(offer._id!.toString(), scheduleTime);
                scheduledCount++;
            }

            logger.info(`✅ Smart Planner: Successfully scheduled ${scheduledCount} offers for this hour.`);
            return scheduledCount;
        } catch (error) {
            logger.error('❌ Error in Smart Planner:', error);
            return 0;
        }
    }
}
