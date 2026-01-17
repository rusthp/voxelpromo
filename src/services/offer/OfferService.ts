import { OfferModel } from '../../models/Offer';
import { PostHistoryModel } from '../../models/PostHistory';
import { AutomationConfigModel } from '../../models/AutomationConfig';
import { Offer, FilterOptions } from '../../types';
import { logger } from '../../utils/logger';
import { AIService } from '../ai/AIService';
import { TelegramService } from '../messaging/TelegramService';
import { WhatsAppServiceFactory } from '../messaging/WhatsAppServiceFactory';
import { IWhatsAppService } from '../messaging/IWhatsAppService';
import { XService } from '../messaging/XService';
import { InstagramService } from '../messaging/InstagramService';
import { VectorizerService } from '../vectorizer/VectorizerService';
import { sanitizeOffer } from '../../middleware/sanitization';

export class OfferService {
  private aiService: AIService | null = null;
  private telegramService: TelegramService | null = null;
  private whatsappService: IWhatsAppService | null = null;
  private xService: XService | null = null;
  private instagramService: InstagramService | null = null;
  private vectorizerService: VectorizerService | null = null;
  private telegramServices: Map<string, TelegramService> = new Map();

  constructor() {
    // Lazy initialization - only create services when needed
    // This speeds up startup time significantly
  }

  private getAIService(): AIService {
    if (!this.aiService) {
      this.aiService = new AIService();
    }
    return this.aiService;
  }

  private getTelegramService(): TelegramService {
    if (!this.telegramService) {
      this.telegramService = new TelegramService();
    }
    return this.telegramService;
  }

  /**
   * Get Telegram service for specific user (Multi-tenant)
   */
  private async getTelegramServiceForUser(userId?: string | object): Promise<TelegramService | null> {
    const uid = userId?.toString();

    // 1. Fallback / Legacy (No User Context) -> Use ENV variables
    if (!uid) {
      return this.getTelegramService();
    }

    // 2. Check Cache
    if (this.telegramServices.has(uid)) {
      return this.telegramServices.get(uid)!;
    }

    try {
      // 3. Load from DB
      const { UserSettingsModel } = await import('../../models/UserSettings');
      const settings = await UserSettingsModel.findOne({ userId: uid });

      if (settings?.telegram?.isConfigured && settings.telegram.botToken && settings.telegram.channelId) {
        const service = new TelegramService({
          botToken: settings.telegram.botToken,
          chatId: settings.telegram.channelId
        });
        this.telegramServices.set(uid, service);
        return service;
      }
    } catch (e) {
      logger.error(`Failed to load telegram settings for user ${uid}`, e);
    }

    // If user has no config, return null (do not use global/admin bot)
    return null;
  }

  private getWhatsAppService(): IWhatsAppService {
    if (!this.whatsappService) {
      const library = process.env.WHATSAPP_LIBRARY || 'baileys';
      this.whatsappService = WhatsAppServiceFactory.create(library);
    }
    return this.whatsappService;
  }

  private getXService(): XService {
    if (!this.xService) {
      this.xService = new XService();
    }
    return this.xService;
  }

  private getInstagramService(): InstagramService {
    if (!this.instagramService) {
      this.instagramService = new InstagramService();
    }
    return this.instagramService;
  }

  private getVectorizerService(): VectorizerService {
    if (!this.vectorizerService) {
      this.vectorizerService = new VectorizerService();
    }
    return this.vectorizerService;
  }

  /**
   * Index offer in Vectorizer for semantic search
   */
  private async indexOffer(offer: Offer): Promise<void> {
    try {
      // Non-blocking indexing
      const text = `${offer.title}\n\n${offer.description || ''}\n\nPreço: R$ ${offer.currentPrice}\nCategoria: ${offer.category}`;
      const metadata = {
        offerId: offer._id?.toString(),
        category: offer.category,
        source: offer.source,
        price: offer.currentPrice,
        url: offer.productUrl,
        createdAt: new Date().toISOString()
      };

      this.getVectorizerService().insert(text, {
        collection: 'voxelpromo-offers',
        metadata
      }).then(result => {
        if (!result.success) {
          logger.warn(`⚠️ Failed to index offer ${offer._id}: ${result.error}`);
        } else {
          logger.debug(`🧠 Indexed offer ${offer._id} in Vectorizer`);
        }
      }).catch(err => {
        logger.error(`Error indexing offer ${offer._id}:`, err);
      });
    } catch (error) {
      logger.error('Error preparing offer for indexing:', error);
    }
  }

  /**
   * Validate offer numeric fields to prevent NaN values
   */
  private validateOfferNumbers(offer: Offer): Offer {
    const validated = { ...offer };

    // Validate and fix numeric fields
    validated.originalPrice =
      isNaN(offer.originalPrice) || offer.originalPrice <= 0 ? 0 : offer.originalPrice;
    validated.currentPrice =
      isNaN(offer.currentPrice) || offer.currentPrice <= 0 ? 0 : offer.currentPrice;
    validated.discount = isNaN(offer.discount) ? 0 : offer.discount;
    validated.discountPercentage = isNaN(offer.discountPercentage) ? 0 : offer.discountPercentage;
    validated.rating =
      offer.rating === undefined || offer.rating === null || isNaN(offer.rating) ? 0 : offer.rating;
    validated.reviewsCount =
      offer.reviewsCount === undefined || offer.reviewsCount === null || isNaN(offer.reviewsCount)
        ? 0
        : offer.reviewsCount;

    // Ensure originalPrice >= currentPrice
    if (validated.originalPrice < validated.currentPrice) {
      validated.originalPrice = validated.currentPrice;
    }

    // Recalculate discount if needed
    if (validated.originalPrice > 0 && validated.currentPrice >= 0) {
      validated.discount = validated.originalPrice - validated.currentPrice;
      validated.discountPercentage = (validated.discount / validated.originalPrice) * 100;
    }

    return validated;
  }

  /**
   * Save or update offer (user-scoped)
   */
  async saveOffer(offer: Offer, userId?: string): Promise<Offer> {
    try {
      // Sanitize offer data before validation
      const sanitized = sanitizeOffer(offer);

      // Validate numeric fields after sanitization
      const validatedOffer = this.validateOfferNumbers(sanitized);

      // Apply userId if provided
      if (userId) {
        (validatedOffer as any).userId = userId;
      }

      // Check if offer already exists matches user scope
      const query: any = { productUrl: validatedOffer.productUrl };
      if (userId) {
        query.userId = userId;
      }

      const existing = await OfferModel.findOne(query);

      if (existing) {
        // If inactive, reactivate it
        if (!existing.isActive) {
          existing.isActive = true;
          logger.info(`♻️  Reactivating offer: ${validatedOffer.title.substring(0, 50)}...`);
        }

        // Update existing offer
        Object.assign(existing, validatedOffer);
        existing.updatedAt = new Date();
        await existing.save();

        // Re-index updated offer
        const updatedOffer = this.convertToOffer(existing.toObject());
        this.indexOffer(updatedOffer);

        return updatedOffer;
      } else {
        // Create new offer
        const newOffer = new OfferModel(validatedOffer);
        await newOffer.save();

        // Index new offer
        const savedOffer = this.convertToOffer(newOffer.toObject());
        this.indexOffer(savedOffer);

        return savedOffer;
      }
    } catch (error) {
      logger.error('Error saving offer:', error);
      throw error;
    }
  }

  /**
   * Convert OfferDocument to Offer (convert ObjectId to string)
   */
  private convertToOffer(doc: any): Offer {
    return {
      ...doc,
      _id: doc._id?.toString() || doc._id,
    } as Offer;
  }

  /**
   * Save multiple offers
   */
  /**
   * Save multiple offers, avoiding duplicates
   * Checks for existing offers by productUrl and product_id (if available)
   */
  async saveOffers(offers: Offer[], userId?: string): Promise<number> {
    if (offers.length === 0) {
      return 0;
    }

    let savedCount = 0;
    let duplicateCount = 0;

    // Extract all product URLs and IDs for batch checking
    const productUrls = offers.map((o) => o.productUrl).filter(Boolean);
    const productIds = offers
      .map((o) => {
        // Try to extract product ID from URL or use a custom field if available
        const urlMatch = o.productUrl?.match(/\/item\/(\d+)\.html/);
        return urlMatch ? urlMatch[1] : null;
      })
      .filter(Boolean);

    // Build query base
    const baseQuery: any = {
      $or: [
        { productUrl: { $in: productUrls } },
        ...(productIds.length > 0
          ? [{ productUrl: { $regex: new RegExp(productIds.join('|')) } }]
          : []),
      ],
    };

    if (userId) {
      baseQuery.userId = userId;
    }

    // Batch check for existing offers - only check ACTIVE offers
    const activeOffers = await OfferModel.find({
      ...baseQuery,
      isActive: true,
    }).lean();

    // Also check inactive offers to see if we should reactivate them
    const inactiveOffers = await OfferModel.find({
      ...baseQuery,
      isActive: false,
    }).lean();

    // Create Sets for fast lookup - only active offers count as duplicates
    const activeUrls = new Set(activeOffers.map((o: any) => o.productUrl));
    const activeIds = new Set(
      activeOffers
        .map((o: any) => {
          const match = o.productUrl?.match(/\/item\/(\d+)\.html/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    );

    // Map inactive offers by URL for reactivation
    const inactiveOffersMap = new Map(inactiveOffers.map((o: any) => [o.productUrl, o]));

    // Process offers
    for (const offer of offers) {
      try {
        // Sanitize and validate
        const sanitized = sanitizeOffer(offer);
        const validatedOffer = this.validateOfferNumbers(sanitized);

        // Apply userId if provided
        if (userId) {
          (validatedOffer as any).userId = userId;
        }

        // Check if already exists as ACTIVE offer
        const urlMatch = validatedOffer.productUrl?.match(/\/item\/(\d+)\.html/);
        const productId = urlMatch ? urlMatch[1] : null;
        const urlExists = activeUrls.has(validatedOffer.productUrl);
        const idExists = productId ? activeIds.has(productId) : false;

        if (urlExists || idExists) {
          duplicateCount++;
          logger.debug(
            `Skipping duplicate active offer: ${validatedOffer.title.substring(0, 50)}...`
          );
          continue;
        }

        // Check if exists as INACTIVE offer - reactivate it instead of creating new
        const inactiveOffer = inactiveOffersMap.get(validatedOffer.productUrl);
        if (inactiveOffer) {
          // Reactivate and update the offer
          await OfferModel.findByIdAndUpdate(inactiveOffer._id, {
            ...validatedOffer,
            isActive: true,
            updatedAt: new Date(),
          });
          savedCount++;
          logger.info(`♻️  Reactivated offer: ${validatedOffer.title.substring(0, 50)}...`);

          // Index reactivated offer
          const reactivatedOffer = { ...validatedOffer, _id: inactiveOffer._id.toString() };
          this.indexOffer(reactivatedOffer as Offer);

          // Add to active sets to avoid duplicates in the same batch
          activeUrls.add(validatedOffer.productUrl);
          if (productId) {
            activeIds.add(productId);
          }
          continue;
        }

        // Save new offer
        const newOffer = new OfferModel(validatedOffer);
        await newOffer.save();
        savedCount++;

        // Index new offer
        const savedOffer = this.convertToOffer(newOffer.toObject());
        this.indexOffer(savedOffer);

        // Add to existing sets to avoid duplicates in the same batch
        activeUrls.add(validatedOffer.productUrl);
        if (productId) {
          activeIds.add(productId);
        }
      } catch (error: any) {
        logger.error(`Error saving offer "${offer.title?.substring(0, 50)}...":`, error.message);
      }
    }

    if (savedCount > 0 || duplicateCount > 0) {
      logger.info(`💾 Saved ${savedCount} new offers, skipped ${duplicateCount} duplicates`);
    }

    return savedCount;
  }

  /**
   * Filter offers based on criteria (user-scoped)
   */
  async filterOffers(options: FilterOptions, userId?: string): Promise<Offer[]> {
    try {
      const query: any = { isActive: true };

      // Multi-tenant: filter by userId if provided
      if (userId) {
        query.userId = userId;
      }

      if (options.minDiscount) {
        query.discountPercentage = { $gte: options.minDiscount };
      }

      if (options.maxPrice) {
        query.currentPrice = { ...query.currentPrice, $lte: options.maxPrice };
      }

      if (options.minPrice) {
        query.currentPrice = { ...query.currentPrice, $gte: options.minPrice };
      }

      if (options.minRating) {
        query.rating = { $gte: options.minRating };
      }

      if (options.categories && options.categories.length > 0) {
        query.category = { $in: options.categories };
      }

      if (options.sources && options.sources.length > 0) {
        query.source = { $in: options.sources };
      }

      if (options.excludePosted) {
        query.isPosted = false;
      }

      // NEW: Search by title (case-insensitive regex)
      if (options.search && options.search.trim()) {
        query.title = { $regex: options.search.trim(), $options: 'i' };
      }

      const limit = options.limit || 50;
      const skip = (options as any).skip || 0; // Add skip support for pagination
      const sortBy = (options as any).sortBy || 'newest';

      let sort: any = { createdAt: -1 };
      switch (sortBy) {
        case 'discount':
          sort = { discountPercentage: -1 };
          break;
        case 'price_asc':
          sort = { currentPrice: 1 };
          break;
        case 'price_desc':
          sort = { currentPrice: -1 };
          break;
        case 'newest':
        default:
          sort = { createdAt: -1 };
          break;
      }

      const offers = await OfferModel.find(query)
        .sort(sort)
        .skip(skip) // Add skip to query chain
        .limit(limit)
        .lean();

      return offers.map((doc) => this.convertToOffer(doc));
    } catch (error) {
      logger.error('Error filtering offers:', error);
      throw error;
    }
  }

  /**
   * Get all offers (user-scoped)
   */
  async getAllOffers(limit?: number, skip: number = 0, sortBy: string = 'newest', userId?: string): Promise<Offer[]> {
    try {
      let sort: any = { createdAt: -1 };

      switch (sortBy) {
        case 'discount':
          sort = { discountPercentage: -1 };
          break;
        case 'price_asc':
          sort = { currentPrice: 1 };
          break;
        case 'price_desc':
          sort = { currentPrice: -1 };
          break;
        case 'newest':
        default:
          sort = { createdAt: -1 };
          break;
      }

      // Multi-tenant: filter by userId if provided
      const queryFilter: any = { isActive: true };
      if (userId) {
        queryFilter.userId = userId;
      }

      let query = OfferModel.find(queryFilter).sort(sort).skip(skip);

      // Only apply limit if provided
      if (limit !== undefined && limit > 0) {
        query = query.limit(limit);
      }

      const offers = await query.lean();

      return offers.map((doc) => this.convertToOffer(doc));
    } catch (error) {
      logger.error('Error getting offers:', error);
      throw error;
    }
  }

  /**
   * Get offer by ID (user-scoped for ownership check)
   */
  async getOfferById(id: string, userId?: string): Promise<Offer | null> {
    try {
      const query: any = { _id: id };

      // Multi-tenant: verify ownership if userId provided
      if (userId) {
        query.userId = userId;
      }

      const offer = await OfferModel.findOne(query).lean();
      if (!offer) {
        return null;
      }
      return this.convertToOffer(offer);
    } catch (error) {
      logger.error('Error getting offer:', error);
      return null;
    }
  }

  /**
   * Generate AI post for offer (user-scoped)
   */
  async generateAIPost(
    offerId: string,
    tone?: 'casual' | 'professional' | 'viral' | 'urgent',
    userId?: string
  ): Promise<string> {
    try {
      const offer = await this.getOfferById(offerId, userId);
      if (!offer) {
        throw new Error('Offer not found');
      }

      const aiResponse = await this.getAIService().generatePost({
        offer,
        tone: tone || 'viral',
        includeEmojis: true,
        includeHashtags: true,
      });

      // Update offer with AI generated post
      await OfferModel.findByIdAndUpdate(offerId, {
        aiGeneratedPost: aiResponse.fullPost,
        updatedAt: new Date(),
      });

      return aiResponse.fullPost;
    } catch (error) {
      logger.error('Error generating AI post:', error);
      throw error;
    }
  }

  /**
   * Post offer to channels (user-scoped)
   */
  async postOffer(offerId: string, channels: string[] = ['telegram'], userId?: string): Promise<boolean> {
    try {
      const offer = await this.getOfferById(offerId, userId);
      if (!offer) {
        throw new Error('Offer not found');
      }

      // Generate AI post if not exists (non-blocking - don't fail if AI is not configured)
      if (!offer.aiGeneratedPost) {
        try {
          await this.generateAIPost(offerId);
          const updatedOffer = await this.getOfferById(offerId);
          if (updatedOffer) {
            Object.assign(offer, updatedOffer);
          }
        } catch (aiError: any) {
          // Log but don't fail - AI post is optional
          logger.warn(`⚠️ Could not generate AI post (non-blocking): ${aiError.message}`);
        }
      }

      let success = false;
      const postedChannels: string[] = [];

      // Prepare post content
      const postContent = offer.aiGeneratedPost || `${offer.title}\n\nPreço: R$ ${offer.currentPrice}\nDesconto: ${offer.discountPercentage}%\n\n${offer.productUrl}`;

      // Send to Telegram
      if (channels.includes('telegram') && !offer.postedChannels?.includes('telegram')) {
        try {
          // Retrieve user settings to check for filters
          const { UserModel } = await import('../../models/User');
          const user = await UserModel.findById(offer.userId);

          // Apply Content Filters (Whitelist/Blacklist)
          if (user?.filters) {
            const { whitelist, blacklist } = user.filters;

            // Helper to normalize text (remove accents, lowercase)
            const normalize = (text: string) =>
              text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

            const textToScan = normalize(`${offer.title} ${offer.description || ''}`);

            // 1. Whitelist Check (Match at least one)
            if (whitelist && whitelist.length > 0) {
              const hasMatch = whitelist.some(term => textToScan.includes(normalize(term)));
              if (!hasMatch) {
                logger.info(`🚫 Offer blocked by whitelist: ${offer.title}`);
                // Return true to "pretend" success so it doesn't retry, but don't post
                return true;
              }
            }

            // 2. Blacklist Check (Must NOT match any)
            if (blacklist && blacklist.length > 0) {
              const hasForbidden = blacklist.some(term => textToScan.includes(normalize(term)));
              if (hasForbidden) {
                logger.info(`🚫 Offer blocked by blacklist: ${offer.title}`);
                return true;
              }
            }
          }

          const telegramService = await this.getTelegramServiceForUser(offer.userId);

          if (telegramService) {
            const telegramSuccess = await telegramService.sendOffer(offer);
            if (telegramSuccess) {
              postedChannels.push('telegram');
              success = true;

              // Save to history
              await PostHistoryModel.create({
                offerId,
                platform: 'telegram',
                postContent,
                status: 'success',
                userId: offer.userId // Add userId to history
              });
            } else {
              // Save failed attempt
              await PostHistoryModel.create({
                offerId,
                platform: 'telegram',
                postContent,
                status: 'failed',
                error: 'Failed to send to Telegram',
                userId: offer.userId
              });
            }
          } else {
            logger.debug(`ℹ️ Skipping Telegram for offer ${offerId}: User not configured`);
          }
        } catch (error: any) {
          logger.error('Error posting to Telegram:', error);
          await PostHistoryModel.create({
            offerId,
            platform: 'telegram',
            postContent,
            status: 'failed',
            error: error.message,
            userId: offer.userId
          });
        }
      }

      // Send to WhatsApp
      if (channels.includes('whatsapp') && !offer.postedChannels?.includes('whatsapp')) {
        try {
          const whatsappSuccess = await this.getWhatsAppService().sendOffer(offer);
          if (whatsappSuccess) {
            postedChannels.push('whatsapp');
            success = true;

            // Save to history
            await PostHistoryModel.create({
              offerId,
              platform: 'whatsapp',
              postContent,
              status: 'success',
            });
          } else {
            // Save failed attempt
            await PostHistoryModel.create({
              offerId,
              platform: 'whatsapp',
              postContent,
              status: 'failed',
              error: 'Failed to send to WhatsApp',
            });
          }
        } catch (error: any) {
          logger.error('Error posting to WhatsApp:', error);
          await PostHistoryModel.create({
            offerId,
            platform: 'whatsapp',
            postContent,
            status: 'failed',
            error: error.message,
          });
        }
      }

      // Send to X (Twitter)
      if ((channels.includes('x') || channels.includes('twitter')) &&
        !offer.postedChannels?.includes('x') &&
        !offer.postedChannels?.includes('twitter')) {
        try {
          logger.info(`📤 Attempting to post offer ${offerId} to X (Twitter)`);
          const xSuccess = await this.getXService().sendOffer(offer);
          if (xSuccess) {
            postedChannels.push('x');
            success = true;
            logger.info(`✅ Successfully posted offer ${offerId} to X (Twitter)`);

            // Save to history
            await PostHistoryModel.create({
              offerId,
              platform: 'x',
              postContent,
              status: 'success',
            });
          } else {
            logger.warn(`⚠️ Failed to post offer ${offerId} to X (Twitter) - check logs above`);
            // Save failed attempt
            await PostHistoryModel.create({
              offerId,
              platform: 'x',
              postContent,
              status: 'failed',
              error: 'Failed to post to X',
            });
          }
        } catch (xError: any) {
          logger.error(
            `❌ Error posting offer ${offerId} to X (Twitter): ${xError.message}`,
            xError
          );
          // Save failed attempt
          await PostHistoryModel.create({
            offerId,
            platform: 'x',
            postContent,
            status: 'failed',
            error: xError.message,
          });
        }
      }

      // Send to Instagram
      if (channels.includes('instagram') && !offer.postedChannels?.includes('instagram')) {
        try {
          logger.info(`📤 Attempting to post offer ${offerId} to Instagram`);
          const instagramSuccess = await this.getInstagramService().sendOffer(offer);
          if (instagramSuccess) {
            postedChannels.push('instagram');
            success = true;
            logger.info(`✅ Successfully posted offer ${offerId} to Instagram`);

            // Save to history
            await PostHistoryModel.create({
              offerId,
              platform: 'instagram',
              postContent,
              status: 'success',
            });
          } else {
            logger.warn(`⚠️ Failed to post offer ${offerId} to Instagram - check logs`);
            // Save failed attempt
            await PostHistoryModel.create({
              offerId,
              platform: 'instagram',
              postContent,
              status: 'failed',
              error: 'Failed to post to Instagram',
            });
          }
        } catch (instagramError: any) {
          logger.error(
            `❌ Error posting offer ${offerId} to Instagram: ${instagramError.message}`,
            instagramError
          );
          // Save failed attempt
          await PostHistoryModel.create({
            offerId,
            platform: 'instagram',
            postContent,
            status: 'failed',
            error: instagramError.message,
          });
        }
      }

      // Update offer status
      if (success) {
        await OfferModel.findByIdAndUpdate(offerId, {
          isPosted: true,
          postedAt: new Date(),
          postedChannels,
          updatedAt: new Date(),
        });
      }

      return success;
    } catch (error) {
      logger.error('Error posting offer:', error);
      return false;
    }
  }

  /**
   * Post multiple offers
   */
  async postOffers(offerIds: string[], channels: string[] = ['telegram'], userId?: string): Promise<number> {
    let successCount = 0;

    for (const offerId of offerIds) {
      try {
        const success = await this.postOffer(offerId, channels, userId);
        if (success) {
          successCount++;
          // Add delay between posts
          await this.delay(5000);
        }
      } catch (error) {
        logger.error(`Error posting offer ${offerId}:`, error);
      }
    }

    return successCount;
  }

  /**
   * Delete offer (user-scoped, soft delete - marks as inactive)
   */
  async deleteOffer(id: string, permanent: boolean = false, userId?: string): Promise<boolean> {
    try {
      // Multi-tenant: verify ownership if userId provided
      const query: any = { _id: id };
      if (userId) {
        query.userId = userId;
      }

      if (permanent) {
        const result = await OfferModel.deleteOne(query);
        if (result.deletedCount === 0) return false;
        logger.info(`Permanently deleted offer: ${id}`);
      } else {
        const result = await OfferModel.updateOne(query, { isActive: false });
        if (result.matchedCount === 0) return false;
        logger.info(`Soft deleted offer: ${id}`);
      }
      return true;
    } catch (error) {
      logger.error('Error deleting offer:', error);
      return false;
    }
  }

  /**
   * Delete multiple offers (user-scoped)
   */
  async deleteOffers(ids: string[], permanent: boolean = false, userId?: string): Promise<number> {
    try {
      let deletedCount = 0;

      // Multi-tenant: filter by userId if provided
      const query: any = { _id: { $in: ids } };
      if (userId) {
        query.userId = userId;
      }

      if (permanent) {
        const result = await OfferModel.deleteMany(query);
        deletedCount = result.deletedCount || 0;
        logger.info(`Permanently deleted ${deletedCount} offers`);
      } else {
        const result = await OfferModel.updateMany(query, { isActive: false });
        deletedCount = result.modifiedCount || 0;
        logger.info(`Soft deleted ${deletedCount} offers`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error deleting offers:', error);
      throw error;
    }
  }

  /**
   * Delete ALL offers (user-scoped)
   */
  async deleteAllOffers(permanent: boolean = false, userId?: string): Promise<number> {
    try {
      let deletedCount = 0;

      // Multi-tenant: filter by userId if provided
      const query: any = userId ? { userId } : {};

      if (permanent) {
        const result = await OfferModel.deleteMany(query);
        deletedCount = result.deletedCount || 0;
        logger.info(`Permanently deleted ${userId ? 'user' : 'ALL'} offers (${deletedCount})`);
      } else {
        const result = await OfferModel.updateMany(query, { isActive: false });
        deletedCount = result.modifiedCount || 0;
        logger.info(`Soft deleted ${userId ? 'user' : 'ALL'} offers (${deletedCount})`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error deleting all offers:', error);
      throw error;
    }
  }

  /**
   * Schedule offer for posting (user-scoped)
   */
  async scheduleOffer(id: string, date: Date, userId?: string): Promise<boolean> {
    try {
      // Multi-tenant: verify ownership
      const query: any = { _id: id };
      if (userId) {
        query.userId = userId;
      }

      const offer = await OfferModel.findOne(query);
      if (!offer) {
        throw new Error('Offer not found');
      }

      await OfferModel.findByIdAndUpdate(id, {
        scheduledAt: date,
        updatedAt: new Date(),
      });

      logger.info(`📅 Scheduled offer ${id} for ${date.toISOString()}`);
      return true;
    } catch (error) {
      logger.error('Error scheduling offer:', error);
      return false;
    }
  }

  /**
   * Process scheduled offers
   */
  async processScheduledOffers(): Promise<number> {
    try {
      const now = new Date();
      const scheduledOffers = await OfferModel.find({
        isActive: true,
        isPosted: false,
        scheduledAt: { $lte: now },
      });

      if (scheduledOffers.length === 0) {
        return 0;
      }

      logger.info(`⏰ Processing ${scheduledOffers.length} scheduled offers...`);
      let processedCount = 0;

      for (const offer of scheduledOffers) {
        try {
          // Fetch automation config to get enabled channels
          const config = await AutomationConfigModel.findOne({}).lean();
          const enabledChannels = config?.enabledChannels && config.enabledChannels.length > 0
            ? config.enabledChannels
            : ['telegram']; // Default to telegram if no config

          // Post to configured channels
          const success = await this.postOffer(offer._id.toString(), enabledChannels);

          if (success) {
            // Clear scheduledAt after successful posting
            await OfferModel.findByIdAndUpdate(offer._id, {
              $unset: { scheduledAt: 1 }
            });
            processedCount++;
            await this.delay(2000); // Rate limit
          }
        } catch (error: any) {
          logger.error(`Error processing scheduled offer ${offer._id}:`, error.message);
        }
      }

      return processedCount;
    } catch (error) {
      logger.error('Error processing scheduled offers:', error);
      return 0;
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup old offers (older than specified days)
   * Used by scheduler to keep database clean
   */
  async cleanupOldOffers(daysToKeep: number = 3): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await OfferModel.deleteMany({
        createdAt: { $lt: cutoffDate },
        isActive: false // Only delete inactive offers
      });

      const deletedCount = result.deletedCount || 0;
      if (deletedCount > 0) {
        logger.info(`🗑️ Cleaned up ${deletedCount} old inactive offers (older than ${daysToKeep} days)`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old offers:', error);
      return 0;
    }
  }
}
