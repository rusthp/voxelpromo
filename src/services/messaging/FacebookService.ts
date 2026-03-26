import axios from 'axios';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { PostHistoryModel } from '../../models/PostHistory';
import { FacebookSettings } from '../../models/UserSettings';

const GRAPH_API = 'https://graph.facebook.com/v19.0';

/**
 * FacebookService — posts offers to a Facebook Page via Graph API.
 *
 * Requirements:
 * - Facebook App with `pages_manage_posts` + `pages_read_engagement` permissions
 * - Long-lived Page Access Token (never expires unless user revokes)
 * - Page ID
 *
 * @see https://developers.facebook.com/docs/pages/publishing
 */
export class FacebookService {
  private config: FacebookSettings | undefined;
  private userId?: string;

  constructor(config?: FacebookSettings, userId?: string) {
    this.config = config;
    this.userId = userId;
  }

  static async createForUser(userId: string): Promise<FacebookService> {
    const { getUserSettingsService } = await import('../user/UserSettingsService');
    const settingsService = getUserSettingsService();
    const settings = await settingsService.getSettings(userId);
    return new FacebookService(settings?.facebook, userId);
  }

  isConfigured(): boolean {
    return !!(this.config?.pageAccessToken && this.config?.pageId && this.config?.isConfigured);
  }

  /**
   * Post an offer to the Facebook Page.
   * Uses /photos endpoint when imageUrl is present, /feed otherwise.
   */
  async sendOffer(offer: Offer): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn(`⚠️ Facebook not configured for user ${this.userId}`);
      return false;
    }

    try {
      const rateLimit = await this.checkRateLimit();
      if (!rateLimit.allowed) {
        logger.warn(`⚠️ Skipping Facebook post: ${rateLimit.reason}`);
        return false;
      }

      const message = this.formatMessage(offer);
      const { pageId, pageAccessToken } = this.config!;

      let postId: string;

      if (offer.imageUrl) {
        // Photo post — image + caption
        const response = await axios.post(
          `${GRAPH_API}/${pageId}/photos`,
          {
            url: offer.imageUrl,
            caption: message,
            access_token: pageAccessToken,
          },
          { timeout: 15000 }
        );
        postId = response.data.post_id || response.data.id;
      } else {
        // Text/link post
        const response = await axios.post(
          `${GRAPH_API}/${pageId}/feed`,
          {
            message,
            link: offer.affiliateUrl,
            access_token: pageAccessToken,
          },
          { timeout: 15000 }
        );
        postId = response.data.id;
      }

      logger.info(`✅ Offer posted to Facebook Page (post: ${postId}) — ${offer.title}`);

      await PostHistoryModel.create({
        offerId: offer._id,
        platform: 'facebook',
        postContent: message,
        status: 'success',
        userId: this.userId || offer.userId,
        metadata: { postId, affiliateUrl: offer.affiliateUrl },
      });

      return true;
    } catch (error: any) {
      const fbError = error.response?.data?.error;
      if (fbError?.code === 190) {
        logger.error(`❌ Facebook token expired for user ${this.userId}. Reconnect required.`);
      } else {
        logger.error(`❌ Facebook post failed: ${fbError?.message || error.message}`);
      }

      await PostHistoryModel.create({
        offerId: offer._id,
        platform: 'facebook',
        postContent: '',
        status: 'failed',
        userId: this.userId || offer.userId,
        error: fbError?.message || error.message,
      });

      return false;
    }
  }

  async sendOffers(offers: Offer[]): Promise<number> {
    let count = 0;
    for (const offer of offers) {
      const ok = await this.sendOffer(offer);
      if (ok) {
        count++;
        await this.delay(5000);
      }
    }
    return count;
  }

  private formatMessage(offer: Offer): string {
    if (offer.rendered?.text) return offer.rendered.text.replace(/<[^>]+>/g, '');
    if (offer.aiGeneratedPost) return offer.aiGeneratedPost.replace(/<[^>]+>/g, '');

    const price = offer.currentPrice.toFixed(2).replace('.', ',');
    const lines: string[] = [];

    if (offer.discountPercentage >= 5 && offer.originalPrice > offer.currentPrice) {
      const original = offer.originalPrice.toFixed(2).replace('.', ',');
      lines.push(`🔥 ${offer.title}`);
      lines.push(`💰 De R$ ${original} por R$ ${price} (${offer.discountPercentage.toFixed(0)}% OFF)`);
    } else {
      lines.push(`🔥 ${offer.title}`);
      lines.push(`💰 R$ ${price}`);
    }

    if (offer.coupons?.length) lines.push(`🎟️ Cupom: ${offer.coupons[0]}`);
    lines.push(`🔗 ${offer.affiliateUrl}`);
    lines.push(`\n#oferta #promocao #desconto`);

    return lines.join('\n');
  }

  private async checkRateLimit(): Promise<{ allowed: boolean; reason?: string }> {
    const MAX_DAILY = 25;
    const MIN_INTERVAL_MIN = 30;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyCount = await PostHistoryModel.countDocuments({
      platform: 'facebook',
      postedAt: { $gt: oneDayAgo },
      status: 'success',
    });

    if (dailyCount >= MAX_DAILY) {
      return { allowed: false, reason: `Daily limit reached (${dailyCount}/${MAX_DAILY})` };
    }

    const lastPost = await PostHistoryModel.findOne({
      platform: 'facebook',
      status: 'success',
      ...(this.userId ? { userId: this.userId } : {}),
    }).sort({ postedAt: -1 });

    if (lastPost) {
      const mins = (Date.now() - new Date(lastPost.postedAt).getTime()) / 60000;
      if (mins < MIN_INTERVAL_MIN) {
        return { allowed: false, reason: `Min interval not reached (${mins.toFixed(1)}/${MIN_INTERVAL_MIN} min)` };
      }
    }

    return { allowed: true };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
