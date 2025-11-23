import { OfferModel } from '../../models/Offer';
import { Offer, FilterOptions } from '../../types';
import { logger } from '../../utils/logger';
import { AIService } from '../ai/AIService';
import { TelegramService } from '../messaging/TelegramService';
import { WhatsAppServiceFactory } from '../messaging/WhatsAppServiceFactory';
import { IWhatsAppService } from '../messaging/IWhatsAppService';
import { XService } from '../messaging/XService';

export class OfferService {
  private aiService: AIService | null = null;
  private telegramService: TelegramService | null = null;
  private whatsappService: IWhatsAppService | null = null;
  private xService: XService | null = null;

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

  private getWhatsAppService(): IWhatsAppService {
    if (!this.whatsappService) {
      const library = process.env.WHATSAPP_LIBRARY || 'whatsapp-web.js';
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
   * Save or update offer
   */
  async saveOffer(offer: Offer): Promise<Offer> {
    try {
      // Validate numeric fields before saving
      const validatedOffer = this.validateOfferNumbers(offer);

      // Check if offer already exists (by URL) - check both active and inactive
      const existing = await OfferModel.findOne({ productUrl: validatedOffer.productUrl });

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
        return this.convertToOffer(existing.toObject());
      } else {
        // Create new offer
        const newOffer = new OfferModel(validatedOffer);
        await newOffer.save();
        return this.convertToOffer(newOffer.toObject());
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
  async saveOffers(offers: Offer[]): Promise<number> {
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

    // Batch check for existing offers - only check ACTIVE offers
    // Also check inactive offers to reactivate them if needed
    const activeOffers = await OfferModel.find({
      isActive: true,
      $or: [
        { productUrl: { $in: productUrls } },
        ...(productIds.length > 0
          ? [{ productUrl: { $regex: new RegExp(productIds.join('|')) } }]
          : []),
      ],
    }).lean();

    // Also check inactive offers to see if we should reactivate them
    const inactiveOffers = await OfferModel.find({
      isActive: false,
      $or: [
        { productUrl: { $in: productUrls } },
        ...(productIds.length > 0
          ? [{ productUrl: { $regex: new RegExp(productIds.join('|')) } }]
          : []),
      ],
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
        const validatedOffer = this.validateOfferNumbers(offer);

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
   * Filter offers based on criteria
   */
  async filterOffers(options: FilterOptions): Promise<Offer[]> {
    try {
      const query: any = { isActive: true };

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

      const limit = options.limit || 50;

      const offers = await OfferModel.find(query)
        .sort({ discountPercentage: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      return offers.map((doc) => this.convertToOffer(doc));
    } catch (error) {
      logger.error('Error filtering offers:', error);
      throw error;
    }
  }

  /**
   * Get all offers
   */
  async getAllOffers(limit?: number, skip: number = 0): Promise<Offer[]> {
    try {
      let query = OfferModel.find({ isActive: true }).sort({ createdAt: -1 }).skip(skip);

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
   * Get offer by ID
   */
  async getOfferById(id: string): Promise<Offer | null> {
    try {
      const offer = await OfferModel.findById(id).lean();
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
   * Generate AI post for offer
   */
  async generateAIPost(
    offerId: string,
    tone?: 'casual' | 'professional' | 'viral' | 'urgent'
  ): Promise<string> {
    try {
      const offer = await this.getOfferById(offerId);
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
   * Post offer to channels
   */
  async postOffer(offerId: string, channels: string[] = ['telegram']): Promise<boolean> {
    try {
      const offer = await this.getOfferById(offerId);
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

      // Send to Telegram
      if (channels.includes('telegram')) {
        const telegramSuccess = await this.getTelegramService().sendOffer(offer);
        if (telegramSuccess) {
          postedChannels.push('telegram');
          success = true;
        }
      }

      // Send to WhatsApp
      if (channels.includes('whatsapp')) {
        const whatsappSuccess = await this.getWhatsAppService().sendOffer(offer);
        if (whatsappSuccess) {
          postedChannels.push('whatsapp');
          success = true;
        }
      }

      // Send to X (Twitter)
      if (channels.includes('x') || channels.includes('twitter')) {
        try {
          logger.info(`📤 Attempting to post offer ${offerId} to X (Twitter)`);
          const xSuccess = await this.getXService().sendOffer(offer);
          if (xSuccess) {
            postedChannels.push('x');
            success = true;
            logger.info(`✅ Successfully posted offer ${offerId} to X (Twitter)`);
          } else {
            logger.warn(`⚠️ Failed to post offer ${offerId} to X (Twitter) - check logs above`);
          }
        } catch (xError: any) {
          logger.error(
            `❌ Error posting offer ${offerId} to X (Twitter): ${xError.message}`,
            xError
          );
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
  async postOffers(offerIds: string[], channels: string[] = ['telegram']): Promise<number> {
    let successCount = 0;

    for (const offerId of offerIds) {
      try {
        const success = await this.postOffer(offerId, channels);
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
   * Delete offer (soft delete - marks as inactive)
   */
  async deleteOffer(id: string, permanent: boolean = false): Promise<boolean> {
    try {
      if (permanent) {
        // Permanent deletion
        await OfferModel.findByIdAndDelete(id);
        logger.info(`Permanently deleted offer: ${id}`);
      } else {
        // Soft delete - mark as inactive
        await OfferModel.findByIdAndUpdate(id, { isActive: false });
        logger.info(`Soft deleted offer: ${id}`);
      }
      return true;
    } catch (error) {
      logger.error('Error deleting offer:', error);
      return false;
    }
  }

  /**
   * Delete multiple offers
   */
  async deleteOffers(ids: string[], permanent: boolean = false): Promise<number> {
    try {
      let deletedCount = 0;

      if (permanent) {
        // Permanent deletion
        const result = await OfferModel.deleteMany({ _id: { $in: ids } });
        deletedCount = result.deletedCount || 0;
        logger.info(`Permanently deleted ${deletedCount} offers`);
      } else {
        // Soft delete - mark as inactive
        const result = await OfferModel.updateMany({ _id: { $in: ids } }, { isActive: false });
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
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    try {
      // Count all active offers
      const total = await OfferModel.countDocuments({ isActive: true });

      // Count posted offers
      const posted = await OfferModel.countDocuments({ isActive: true, isPosted: true });

      // Count not posted offers (should be total - posted)
      const notPosted = total - posted;

      // Log for debugging
      logger.debug('Statistics calculated:', { total, posted, notPosted });

      const bySource = await OfferModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]);

      const byCategory = await OfferModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);

      // Calculate average discount - only include offers with valid discount > 0
      // MongoDB doesn't support $ne: NaN, so we filter manually
      const offersWithDiscount = await OfferModel.find({
        isActive: true,
        discountPercentage: { $exists: true, $ne: null, $gt: 0 },
      })
        .select('discountPercentage')
        .lean();

      let avgDiscount = 0;
      if (offersWithDiscount.length > 0) {
        // Filter out NaN values and calculate average
        const validDiscounts = offersWithDiscount
          .map((offer: any) => offer.discountPercentage)
          .filter((discount: any) => {
            const num = Number(discount);
            return !isNaN(num) && num > 0 && isFinite(num);
          });

        if (validDiscounts.length > 0) {
          const sum = validDiscounts.reduce((acc: number, discount: number) => acc + discount, 0);
          avgDiscount = Math.round((sum / validDiscounts.length) * 10) / 10; // Round to 1 decimal
        }
      }

      return {
        total,
        posted,
        notPosted,
        bySource,
        byCategory,
        avgDiscount: avgDiscount || 0,
      };
    } catch (error) {
      logger.error('Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
