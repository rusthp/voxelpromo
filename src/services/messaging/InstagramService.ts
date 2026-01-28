import axios from 'axios';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { AIService } from '../ai/AIService';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Instagram Service - Business Login for Instagram
 * Provides automation for Instagram publishing via official Meta API
 *
 * Requirements:
 * - Instagram Professional account (Business or Creator)
 * - Meta Developer App with Business Login for Instagram configured
 * - Permissions:
 *   - instagram_business_basic
 *   - instagram_business_content_publish
 *
 * @see https://developers.facebook.com/docs/instagram/platform/instagram-api/business-login
 */

// Types for Instagram API
interface InstagramWebhookPayload {
  object: 'instagram';
  entry: InstagramWebhookEntry[];
}

interface InstagramWebhookEntry {
  id: string;
  time: number;
  messaging?: InstagramMessagingEvent[];
  changes?: InstagramChangeEvent[];
}

interface InstagramMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: { type: string; payload: { url: string } }[];
    // Reply context - identifies which media user is responding to
    reply_to?: {
      story?: { id: string; url?: string }; // Story reply
      mid?: string; // Message reply
    };
  };
  postback?: {
    payload: string;
  };
}

interface InstagramChangeEvent {
  field: string;
  value: {
    id: string;
    text?: string;
    from?: { id: string; username: string };
    media?: { id: string };
  };
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user_id?: string;
  permissions?: string;
}

interface InstagramSettings {
  enabled: boolean;
  autoReplyDM: boolean;
  welcomeMessage: string;
  keywordReplies: { [keyword: string]: string };
  conversionKeywords: string[];
}

interface InstagramAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

export class InstagramService {
  private aiService: AIService | null = null;

  // User context for multi-tenant
  private userId: string | null = null;

  // OAuth2 credentials (Business Login for Instagram)
  private appId: string | null = null; // Instagram App ID (not Facebook App ID!)
  private appSecret: string | null = null; // Instagram App Secret
  private accessToken: string | null = null; // Instagram User access token
  private igUserId: string | null = null; // Instagram-scoped user ID
  private webhookVerifyToken: string | null = null;
  private tokenExpiresAt: Date | null = null; // Token expiration tracking

  // Configurable settings
  private settings: InstagramSettings = {
    enabled: true,
    autoReplyDM: true,
    welcomeMessage:
      'Olá! 👋 Obrigado por entrar em contato!\n\nConfira nossas melhores ofertas com descontos imperdíveis! 🔥\n\nDigite "ofertas" para ver as promoções mais recentes.',
    keywordReplies: {
      ofertas: 'Buscando as melhores ofertas para você... 🔍',
      promoções: 'Buscando as melhores promoções para você... 🔍',
      desconto: 'Confira nossos melhores descontos! 💰',
    },
    conversionKeywords: ['quero', 'eu quero', 'link', 'comprar'],
  };

  // API configuration - Business Login for Instagram endpoints
  private readonly apiVersion = 'v21.0';
  private readonly graphApiBase = 'https://graph.instagram.com'; // All API calls go here
  private readonly oauthBase = 'https://www.instagram.com'; // OAuth authorization (per Meta docs)
  private readonly tokenApiBase = 'https://api.instagram.com'; // Token exchange

  // Rate limiting
  private messagesSent = 0;
  private lastHourReset = Date.now();
  private readonly MAX_MESSAGES_PER_HOUR = 200; // Meta rate limit 2024

  constructor(userId?: string) {
    this.userId = userId || null;
    this.loadCredentials();
  }

  /**
   * Factory method to create user-specific Instagram service
   * MULTI-TENANT: Each user gets their own credentials
   */
  static async createForUser(userId: string): Promise<InstagramService> {
    const { getUserSettingsService } = require('../user/UserSettingsService'); // eslint-disable-line
    const settingsService = getUserSettingsService();
    const credentials = await settingsService.getInstagramCredentials(userId);

    const service = new InstagramService(userId);

    // Override with user-specific credentials if available
    if (credentials.isConfigured) {
      service.accessToken = credentials.accessToken;
      service.igUserId = credentials.igUserId;
      service.igUserId = credentials.igUserId;

      // Load automation settings
      service.settings = {
        enabled: true,
        autoReplyDM: credentials.autoReplyDM,
        welcomeMessage: credentials.welcomeMessage,
        keywordReplies: credentials.keywordReplies instanceof Map
          ? Object.fromEntries(credentials.keywordReplies)
          : (credentials.keywordReplies || {}),
        conversionKeywords: credentials.conversionKeywords || ['quero', 'eu quero', 'link', 'comprar']
      };

      logger.debug(`📱 Instagram loaded for user ${userId} (@${credentials.username})`);
    }

    return service;
  }

  /**
   * Get current user ID (for multi-tenant context)
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get Instagram User ID (IG account ID)
   */
  getIgUserId(): string | null {
    return this.igUserId;
  }

  /**
   * Load credentials from config.json or environment
   */
  private loadCredentials(): void {
    try {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.instagram) {
          // Business Login for Instagram uses Instagram App ID/Secret (NOT Facebook App ID!)
          this.appId =
            config.instagram.instagramAppId ||
            config.instagram.appId ||
            process.env.INSTAGRAM_APP_ID ||
            null;
          this.appSecret =
            config.instagram.instagramAppSecret ||
            config.instagram.appSecret ||
            process.env.INSTAGRAM_APP_SECRET ||
            null;
          this.accessToken =
            config.instagram.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || null;
          this.igUserId = config.instagram.igUserId || process.env.INSTAGRAM_IG_USER_ID || null;
          this.webhookVerifyToken =
            config.instagram.webhookVerifyToken ||
            process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ||
            null;
          // Token expiration tracking
          if (config.instagram.tokenExpiresAt) {
            this.tokenExpiresAt = new Date(config.instagram.tokenExpiresAt);
          }

          // Load settings
          if (config.instagram.settings) {
            this.settings = {
              ...this.settings,
              ...config.instagram.settings,
            };
          } else {
            // Backward compatibility - load individual fields
            if (typeof config.instagram.enabled === 'boolean') {
              this.settings.enabled = config.instagram.enabled;
            }
            if (typeof config.instagram.autoReplyDM === 'boolean') {
              this.settings.autoReplyDM = config.instagram.autoReplyDM;
            }
            if (config.instagram.welcomeMessage) {
              this.settings.welcomeMessage = config.instagram.welcomeMessage;
            }
            if (config.instagram.keywordReplies) {
              this.settings.keywordReplies = config.instagram.keywordReplies;
            }
          }
        }
      }

      // Fallback to environment variables
      this.appId = this.appId || process.env.INSTAGRAM_APP_ID || null;
      this.appSecret = this.appSecret || process.env.INSTAGRAM_APP_SECRET || null;
      this.accessToken = this.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || null;
      this.webhookVerifyToken =
        this.webhookVerifyToken || process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || null;

      if (this.appId && this.appSecret) {
        logger.info('✅ Instagram configured - credentials loaded');
      } else {
        logger.debug('⚠️ Instagram not fully configured (missing App ID or App Secret)');
      }
    } catch (error: any) {
      logger.error(`Error loading Instagram credentials: ${error.message}`);
    }
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }

  /**
   * Check if the service is authenticated (has valid access token)
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.igUserId);
  }

  /**
   * Get AI service (lazy initialization)
   */
  private getAIService(): AIService {
    if (!this.aiService) {
      this.aiService = new AIService();
    }
    return this.aiService;
  }

  /**
   * Generate OAuth2 authorization URL for Business Login for Instagram
   * @param redirectUri The callback URL after authorization
   * @param state Optional state for CSRF protection
   * @see https://developers.facebook.com/docs/instagram/platform/instagram-api/business-login
   */
  getAuthorizationUrl(redirectUri: string, state?: string): string {
    if (!this.appId) {
      throw new Error(
        'Instagram App ID not configured. Get it from: App Dashboard > Instagram > API setup with Instagram login > Business login settings'
      );
    }

    // All scopes as configured in Meta Developers Console
    const scopes = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
      'instagram_business_content_publish',
      'instagram_business_manage_insights',
    ].join(',');

    const params = new URLSearchParams({
      client_id: this.appId, // Instagram App ID
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      ...(state && { state }),
    });

    // Business Login uses instagram.com/oauth/authorize (NOT facebook.com!)
    return `${this.oauthBase}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token (Business Login for Instagram)
   * Step 2: Exchange code for short-lived token, then for long-lived token
   * @param code Authorization code from callback (strip #_ suffix if present)
   * @param redirectUri The same redirect URI used in authorization
   * @see https://developers.facebook.com/docs/instagram/platform/instagram-api/business-login#step-2
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenResponse> {
    if (!this.appId || !this.appSecret) {
      throw new Error(
        'Instagram App credentials not configured. Get them from: App Dashboard > Instagram > API setup with Instagram login > Business login settings'
      );
    }

    try {
      // Strip #_ suffix that Meta appends to authorization codes
      const cleanCode = code.replace(/#_$/, '');

      // Step 2: Exchange code for short-lived token
      // IMPORTANT: Must use form-data (application/x-www-form-urlencoded), NOT JSON!
      const formData = new URLSearchParams();
      formData.append('client_id', this.appId);
      formData.append('client_secret', this.appSecret);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', redirectUri);
      formData.append('code', cleanCode);

      const tokenUrl = `${this.tokenApiBase}/oauth/access_token`;
      logger.info(`📱 Instagram OAuth - Exchanging code for token`, {
        tokenUrl,
        redirectUriSent: redirectUri,
        codeLength: cleanCode.length,
        clientId: this.appId,
      });

      const response = await axios.post(
        tokenUrl,
        formData.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      // Response format: { data: [{ access_token, user_id, permissions }] }
      const tokenData = response.data.data?.[0] || response.data;
      const shortLivedToken = tokenData.access_token;
      this.igUserId = tokenData.user_id;

      logger.info(`📱 Instagram short-lived token obtained for user ${this.igUserId}`);

      // Step 3: Exchange for long-lived token (valid for 60 days)
      const longLivedResponse = await axios.get(`${this.graphApiBase}/access_token`, {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.appSecret,
          access_token: shortLivedToken,
        },
      });

      this.accessToken = longLivedResponse.data.access_token;
      const expiresIn = longLivedResponse.data.expires_in || 5184000; // ~60 days
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      // Save to config
      await this.saveCredentials();

      logger.info(
        `✅ Instagram Business Login completed successfully (token expires: ${this.tokenExpiresAt.toISOString()})`
      );

      return {
        access_token: this.accessToken!,
        token_type: 'bearer',
        expires_in: expiresIn,
        user_id: this.igUserId || undefined,
        permissions: tokenData.permissions,
      };
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.error_message ||
        error.message;
      const errorDetails = JSON.stringify(error.response?.data || {});
      logger.error(`Instagram OAuth error: ${errorMsg}`, { details: errorDetails });
      throw new Error(`Failed to exchange code for token: ${errorMsg}`);
    }
  }

  /**
   * Refresh a long-lived access token (must be done before expiration)
   * Token must be at least 24 hours old and not expired
   * @see https://developers.facebook.com/docs/instagram/platform/instagram-api/business-login#step-3
   */
  async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.accessToken) {
      throw new Error('No access token to refresh');
    }

    try {
      const response = await axios.get(`${this.graphApiBase}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: this.accessToken,
        },
      });

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 5184000;
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      await this.saveCredentials();

      logger.info(`🔄 Instagram token refreshed (expires: ${this.tokenExpiresAt.toISOString()})`);

      return {
        access_token: this.accessToken!,
        token_type: 'bearer',
        expires_in: expiresIn,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error(`Instagram token refresh error: ${errorMsg}`);
      throw new Error(`Failed to refresh token: ${errorMsg}`);
    }
  }

  /**
   * Check if token needs refresh (within 7 days of expiration)
   */
  needsTokenRefresh(): boolean {
    if (!this.tokenExpiresAt) return false;
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.tokenExpiresAt < sevenDaysFromNow;
  }

  /**
   * Get token expiration info
   */
  getTokenExpiration(): { expiresAt: Date | null; isExpired: boolean; daysRemaining: number } {
    if (!this.tokenExpiresAt) {
      return { expiresAt: null, isExpired: false, daysRemaining: 0 };
    }
    const now = new Date();
    const isExpired = this.tokenExpiresAt < now;
    const daysRemaining = Math.max(
      0,
      Math.floor((this.tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    return { expiresAt: this.tokenExpiresAt, isExpired, daysRemaining };
  }

  // NOTE: fetchPageAndInstagramIds() removed - Business Login for Instagram
  // does NOT require Facebook Pages. The igUserId is obtained directly
  // from the token exchange response.

  /**
   * Save credentials to config.json
   */
  private async saveCredentials(): Promise<void> {
    try {
      const configPath = join(process.cwd(), 'config.json');
      let config: any = {};

      if (existsSync(configPath)) {
        config = JSON.parse(readFileSync(configPath, 'utf-8'));
      }

      config.instagram = {
        ...config.instagram,
        instagramAppId: this.appId, // Renamed for clarity (not Facebook App ID!)
        instagramAppSecret: this.appSecret,
        accessToken: this.accessToken,
        igUserId: this.igUserId,
        webhookVerifyToken: this.webhookVerifyToken,
        tokenExpiresAt: this.tokenExpiresAt?.toISOString(),
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.debug('Instagram credentials saved to config.json');
    } catch (error: any) {
      logger.error(`Error saving Instagram credentials: ${error.message}`);
    }
  }

  /**
   * Get Instagram account info
   */
  async getAccountInfo(): Promise<InstagramAccount | null> {
    if (!this.igUserId || !this.accessToken) {
      return null;
    }

    try {
      // Business Login for Instagram - always use graph.instagram.com
      const response = await axios.get(`${this.graphApiBase}/${this.apiVersion}/${this.igUserId}`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,username,account_type,media_count,profile_picture_url',
        },
      });

      return {
        id: response.data.id,
        username: response.data.username,
        name: response.data.account_type,
        profile_picture_url: response.data.profile_picture_url,
      };
    } catch (error: any) {
      const errorData = error.response?.data?.error;
      if (errorData) {
        logger.error(
          `Instagram API error: ${errorData.message} (code: ${errorData.code}, type: ${errorData.type})`
        );
      } else {
        logger.error(`Error fetching Instagram account info: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Verify webhook challenge from Meta
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      logger.info('✅ Instagram webhook verified');
      return challenge;
    }
    logger.warn('❌ Instagram webhook verification failed');
    return null;
  }

  /**
   * Handle incoming webhook events
   */
  async handleWebhook(payload: InstagramWebhookPayload): Promise<void> {
    if (payload.object !== 'instagram') {
      logger.debug('Ignoring non-Instagram webhook');
      return;
    }

    for (const entry of payload.entry) {
      // Handle messaging events (DMs)
      if (entry.messaging) {
        for (const event of entry.messaging) {
          await this.handleMessagingEvent(event);
        }
      }

      // Handle change events (comments, mentions)
      if (entry.changes) {
        for (const change of entry.changes) {
          await this.handleChangeEvent(change);
        }
      }
    }
  }

  /**
   * Handle messaging events (DMs)
   */
  private async handleMessagingEvent(event: InstagramMessagingEvent): Promise<void> {
    try {
      const senderId = event.sender.id;

      // Skip messages from our own account
      if (senderId === this.igUserId) {
        return;
      }

      // Check if auto-reply is enabled
      if (!this.settings.autoReplyDM) {
        logger.debug('Instagram auto-reply DM is disabled, skipping response');
        return;
      }

      const messageText = event.message?.text?.toLowerCase().trim() || '';
      logger.info(
        `📨 Instagram DM received from ${senderId}: ${event.message?.text?.substring(0, 50) || '[no text]'}...`
      );

      // LAYER 1: Check if this is a reply to a Story/Post (strongest signal)
      const replyToMediaId = event.message?.reply_to?.story?.id || event.message?.reply_to?.mid;

      if (replyToMediaId) {
        const handled = await this.handleMediaReply(senderId, replyToMediaId, messageText);
        if (handled) return;
      }

      // LAYER 2: Check for conversion keywords even without media reference
      if (this.hasPurchaseIntent(messageText)) {
        await this.handleConversionWithoutMedia(senderId, messageText);
        return;
      }

      // Check for keyword replies (existing functionality)
      const keywordResponse = await this.handleKeywordReply(senderId, messageText);
      if (keywordResponse) {
        return;
      }

      // Otherwise, send welcome message
      await this.sendWelcomeMessage(senderId);
    } catch (error: any) {
      logger.error(`Error handling Instagram messaging event: ${error.message}`);
    }
  }

  /**
   * Handle keyword-based replies
   * @returns true if a keyword was matched and handled
   */
  private async handleKeywordReply(recipientId: string, messageText: string): Promise<boolean> {
    // Check each keyword
    for (const [keyword, response] of Object.entries(this.settings.keywordReplies)) {
      if (messageText.includes(keyword.toLowerCase())) {
        logger.info(`🔑 Keyword "${keyword}" detected, sending response`);

        // If keyword is "ofertas" or "promoções", fetch and send recent offers
        if (keyword === 'ofertas' || keyword === 'promoções') {
          await this.sendDirectMessage(recipientId, response);
          await this.sendRecentOffers(recipientId);
        } else {
          await this.sendDirectMessage(recipientId, response);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Send recent offers to a user
   */
  private async sendRecentOffers(recipientId: string): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { OfferModel } = require('../../models/Offer'); // eslint-disable-line @typescript-eslint/no-var-requires

      const recentOffers = await OfferModel.find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      if (recentOffers.length === 0) {
        await this.sendDirectMessage(
          recipientId,
          'No momento não temos ofertas disponíveis. Volte em breve! 😊'
        );
        return;
      }

      for (const offer of recentOffers) {
        const message = await this.formatMessage(offer);
        await this.sendDirectMessage(recipientId, message);
        await this.delay(1500); // Delay between messages
      }
    } catch (error: any) {
      logger.error(`Error sending recent offers: ${error.message}`);
      await this.sendDirectMessage(
        recipientId,
        'Ops! Não consegui buscar as ofertas no momento. Tente novamente mais tarde! 🙏'
      );
    }
  }

  /**
   * Handle change events (comments, mentions)
   */
  private async handleChangeEvent(change: InstagramChangeEvent): Promise<void> {
    try {
      if (change.field === 'comments') {
        const comment = change.value;
        logger.info(`💬 Instagram comment received: ${comment.text?.substring(0, 50)}...`);

        // Could implement auto-reply to comments here
        // await this.replyToComment(comment.id, 'Obrigado pelo comentário!');
      }
    } catch (error: any) {
      logger.error(`Error handling Instagram change event: ${error.message}`);
    }
  }

  /**
   * Send a welcome message to a user
   */
  private async sendWelcomeMessage(recipientId: string): Promise<boolean> {
    return this.sendDirectMessage(recipientId, this.settings.welcomeMessage);
  }

  /**
   * Send a direct message to a user
   */
  async sendDirectMessage(recipientId: string, message: string): Promise<boolean> {
    if (!this.checkRateLimit()) {
      logger.warn('⚠️ Instagram rate limit reached, skipping message');
      return false;
    }

    if (!this.igUserId || !this.accessToken) {
      logger.warn('⚠️ Instagram not authenticated');
      return false;
    }

    try {
      await axios.post(
        `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/messages`,
        {
          recipient: { id: recipientId },
          message: { text: message },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.messagesSent++;
      logger.info(`✅ Instagram DM sent to ${recipientId}`);
      return true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error(`❌ Error sending Instagram DM: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, message: string): Promise<boolean> {
    if (!this.accessToken) {
      logger.warn('⚠️ Instagram not authenticated');
      return false;
    }

    try {
      await axios.post(
        `${this.graphApiBase}/${this.apiVersion}/${commentId}/replies`,
        { message },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`✅ Instagram comment reply sent`);
      return true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error(`❌ Error replying to Instagram comment: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Send offer to Instagram by publishing a feed post with the offer image
   * This creates a real Instagram post with the offer details
   */
  async sendOffer(offer: Offer): Promise<{ success: boolean; mediaId?: string; caption?: string }> {
    if (!this.isAuthenticated()) {
      logger.warn('⚠️ Instagram not authenticated, skipping offer');
      return { success: false };
    }

    if (!this.igUserId) {
      logger.warn('⚠️ Instagram User ID not set, skipping offer');
      return { success: false };
    }

    if (!this.checkRateLimit()) {
      logger.warn('⚠️ Instagram rate limit reached, skipping offer');
      return { success: false };
    }

    try {
      // Verify affiliate link before posting
      if (offer.affiliateUrl) {
        const { LinkVerifier } = require('../link/LinkVerifier'); // eslint-disable-line @typescript-eslint/no-var-requires
        const isValid = await LinkVerifier.verify(offer.affiliateUrl);
        if (!isValid) {
          logger.warn(`🛑 Skipping Instagram offer due to invalid link: ${offer.affiliateUrl}`);
          return { success: false };
        }
      }

      // Check if we have an image to post
      if (!offer.imageUrl) {
        logger.warn('⚠️ Offer has no image, Instagram requires an image for posts');
        return { success: false };
      }

      // Format caption for Instagram
      const caption = await this.formatMessage(offer);

      logger.info(`📤 Publishing Instagram post for: ${offer.title}`);

      // Create media container for the post
      const containerId = await this.createMediaContainer(
        offer.imageUrl,
        'IMAGE',
        caption,
        false // Not a story, but a feed post
      );

      if (!containerId) {
        logger.error('❌ Failed to create Instagram media container');
        return { success: false };
      }

      // Wait for media processing
      const processed = await this.waitForMediaProcessing(containerId);
      if (!processed) {
        logger.error('❌ Instagram media processing failed');
        return { success: false };
      }

      // Publish the media
      const mediaId = await this.publishMediaContainer(containerId);
      if (!mediaId) {
        logger.error('❌ Failed to publish Instagram media');
        return { success: false };
      }

      logger.info(`✅ Instagram post published successfully! Media ID: ${mediaId}`);
      return { success: true, mediaId, caption };
    } catch (error: any) {
      logger.error(`❌ Error publishing Instagram offer: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Send multiple offers
   */
  async sendOffers(offers: Offer[]): Promise<number> {
    let successCount = 0;

    for (const offer of offers) {
      const success = await this.sendOffer(offer);
      if (success) {
        successCount++;
        // Delay between messages to avoid rate limiting
        await this.delay(3000);
      }
    }

    return successCount;
  }

  /**
   * Format offer message for Instagram DM
   */
  private async formatMessage(offer: Offer): Promise<string> {
    const impactPhrase = await this.getImpactPhrase(offer);
    const priceFormatted = offer.currentPrice.toFixed(2).replace('.', ',');
    const hasDiscount = offer.discountPercentage >= 5 && offer.originalPrice > offer.currentPrice;

    const parts: string[] = [];

    // Impact phrase
    parts.push(`🔥 ${impactPhrase}!`);

    // Product title
    parts.push(`\n📦 ${offer.title}`);

    // Price
    if (hasDiscount) {
      const originalFormatted = offer.originalPrice.toFixed(2).replace('.', ',');
      parts.push(`\n💰 De R$ ${originalFormatted} por R$ ${priceFormatted}`);
      parts.push(`📉 ${offer.discountPercentage.toFixed(0)}% OFF`);
    } else {
      parts.push(`\n💰 Por apenas R$ ${priceFormatted}`);
    }

    // Coupons
    if (offer.coupons && offer.coupons.length > 0) {
      parts.push(`\n🎟️ Use o cupom: ${offer.coupons[0]}`);
    }

    // Link
    parts.push(`\n🛒 Compre aqui: ${offer.affiliateUrl}`);

    return parts.join('');
  }

  /**
   * Get impact phrase using AI or fallback
   */
  private async getImpactPhrase(offer: Offer): Promise<string> {
    try {
      const aiPhrase = await Promise.race([
        this.getAIService().generateImpactPhrase(offer),
        new Promise<string>((resolve) => {
          setTimeout(() => resolve(''), 2000);
        }),
      ]);

      if (aiPhrase && aiPhrase.length > 0) {
        return aiPhrase;
      }
    } catch (error: any) {
      logger.debug(`AI phrase generation failed: ${error.message}`);
    }

    return this.getFallbackImpactPhrase(offer);
  }

  /**
   * Get fallback impact phrase
   */
  private getFallbackImpactPhrase(offer: Offer): string {
    const discount = offer.discountPercentage;

    if (discount >= 50) {
      const phrases = ['PROMOÇÃO IMPERDÍVEL', 'DESCONTO INSANO', 'OPORTUNIDADE ÚNICA'];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (discount >= 30) {
      const phrases = ['SUPER PROMOÇÃO', 'OFERTA ESPECIAL', 'DESCONTO INCRÍVEL'];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (discount >= 15) {
      return 'ÓTIMA OFERTA';
    }

    return 'OFERTA DISPONÍVEL';
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    // Reset counter if an hour has passed
    if (now - this.lastHourReset > hourInMs) {
      this.messagesSent = 0;
      this.lastHourReset = now;
    }

    return this.messagesSent < this.MAX_MESSAGES_PER_HOUR;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { remaining: number; total: number; resetsIn: number } {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    const resetsIn = Math.max(0, hourInMs - (now - this.lastHourReset));

    return {
      remaining: Math.max(0, this.MAX_MESSAGES_PER_HOUR - this.messagesSent),
      total: this.MAX_MESSAGES_PER_HOUR,
      resetsIn: Math.ceil(resetsIn / 1000), // seconds
    };
  }

  /**
   * Send test message (for debugging)
   */
  async sendTestMessage(recipientId?: string): Promise<boolean> {
    const testMessage = `🤖 Teste do VoxelPromo\n\n✅ Instagram configurado com sucesso!\n\n📅 ${new Date().toLocaleString('pt-BR')}\n\nSe você recebeu esta mensagem, a integração está funcionando! 🎉`;

    if (recipientId) {
      return this.sendDirectMessage(recipientId, testMessage);
    }

    // Without a recipientId, we can only verify the connection
    const accountInfo = await this.getAccountInfo();
    if (accountInfo) {
      logger.info(`✅ Instagram test passed - connected as @${accountInfo.username}`);
      return true;
    }

    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reload credentials (useful after config update)
   */
  reloadCredentials(): void {
    this.loadCredentials();
  }

  /**
   * Get current settings
   */
  getSettings(): InstagramSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings: Partial<InstagramSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };

    // Save to config.json
    try {
      const configPath = join(process.cwd(), 'config.json');
      let config: any = {};

      if (existsSync(configPath)) {
        config = JSON.parse(readFileSync(configPath, 'utf-8'));
      }

      config.instagram = {
        ...config.instagram,
        enabled: this.settings.enabled,
        autoReplyDM: this.settings.autoReplyDM,
        welcomeMessage: this.settings.welcomeMessage,
        keywordReplies: this.settings.keywordReplies,
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.info('✅ Instagram settings updated');
    } catch (error: any) {
      logger.error(`Error saving Instagram settings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if Instagram is enabled
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Disconnect (clear credentials)
   */
  async disconnect(): Promise<void> {
    this.accessToken = null;
    this.igUserId = null;
    this.tokenExpiresAt = null;

    // Update config
    try {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.instagram) {
          delete config.instagram.accessToken;

          delete config.instagram.tokenExpiresAt;
          delete config.instagram.igUserId;
          writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        }
      }
    } catch (error: any) {
      logger.error(`Error clearing Instagram credentials: ${error.message}`);
    }

    logger.info('Instagram disconnected');
  }

  // ========================================
  // Content Publishing (Stories & Reels)
  // ========================================

  /**
   * Publish a Story (image or video)
   * @param mediaUrl Public URL of the media (image or video)
   * @param mediaType Type of media: 'IMAGE' or 'VIDEO'
   * @returns Media ID if successful, null otherwise
   */
  async publishStory(
    mediaUrl: string,
    mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE'
  ): Promise<string | null> {
    if (!this.isAuthenticated()) {
      logger.warn('⚠️ Instagram not authenticated for publishing');
      return null;
    }

    try {
      // Step 1: Create media container for story
      const containerId = await this.createMediaContainer(mediaUrl, mediaType, undefined, true);
      if (!containerId) {
        return null;
      }

      // Step 2: Wait for media processing
      await this.waitForMediaProcessing(containerId);

      // Step 3: Publish the container
      const mediaId = await this.publishMediaContainer(containerId);
      if (mediaId) {
        logger.info(`✅ Instagram Story published: ${mediaId}`);
      }
      return mediaId;
    } catch (error: any) {
      logger.error(`❌ Error publishing Instagram Story: ${error.message}`);
      return null;
    }
  }

  /**
   * Publish a Reel (video)
   * @param videoUrl Public URL of the video (MP4, vertical 9:16 recommended)
   * @param caption Caption for the reel
   * @param shareToFeed Whether to also share to main feed
   * @returns Media ID if successful, null otherwise
   */
  async publishReel(
    videoUrl: string,
    caption?: string,
    shareToFeed: boolean = true
  ): Promise<string | null> {
    if (!this.isAuthenticated()) {
      logger.warn('⚠️ Instagram not authenticated for publishing');
      return null;
    }

    try {
      // Step 1: Create reel container
      const containerId = await this.createReelContainer(videoUrl, caption, shareToFeed);
      if (!containerId) {
        return null;
      }

      // Step 2: Wait for video processing (can take longer)
      await this.waitForMediaProcessing(containerId, 60000); // 60 sec max wait

      // Step 3: Publish the reel
      const mediaId = await this.publishMediaContainer(containerId);
      if (mediaId) {
        logger.info(`✅ Instagram Reel published: ${mediaId}`);
      }
      return mediaId;
    } catch (error: any) {
      logger.error(`❌ Error publishing Instagram Reel: ${error.message}`);
      return null;
    }
  }

  /**
   * Create a media container for image/video story or post
   */
  private async createMediaContainer(
    mediaUrl: string,
    mediaType: 'IMAGE' | 'VIDEO',
    caption?: string,
    isStory: boolean = false
  ): Promise<string | null> {
    try {
      const params: any = {
        access_token: this.accessToken,
      };

      if (mediaType === 'IMAGE') {
        params.image_url = mediaUrl;
      } else {
        params.video_url = mediaUrl;
        params.media_type = 'VIDEO';
      }

      if (caption) {
        params.caption = caption;
      }

      if (isStory) {
        params.media_type = 'STORIES';
      }

      const response = await axios.post(
        `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/media`,
        null,
        { params }
      );

      return response.data.id;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error(`Error creating media container: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Create a reel container
   */
  private async createReelContainer(
    videoUrl: string,
    caption?: string,
    shareToFeed: boolean = true
  ): Promise<string | null> {
    try {
      const params: any = {
        access_token: this.accessToken,
        video_url: videoUrl,
        media_type: 'REELS',
        share_to_feed: shareToFeed,
      };

      if (caption) {
        params.caption = caption;
      }

      const response = await axios.post(
        `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/media`,
        null,
        { params }
      );

      return response.data.id;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error(`Error creating reel container: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Wait for media to finish processing
   */
  private async waitForMediaProcessing(
    containerId: string,
    maxWaitMs: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 3000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const response = await axios.get(`${this.graphApiBase}/${this.apiVersion}/${containerId}`, {
          params: {
            access_token: this.accessToken,
            fields: 'status_code',
          },
        });

        const status = response.data.status_code;
        if (status === 'FINISHED') {
          return true;
        }
        if (status === 'ERROR') {
          logger.error('Media processing failed');
          return false;
        }

        await this.delay(pollInterval);
      } catch (error: any) {
        logger.error(`Error checking media status: ${error.message}`);
        return false;
      }
    }

    logger.warn('Media processing timeout');
    return false;
  }

  /**
   * Publish a media container (final step)
   */
  private async publishMediaContainer(containerId: string): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/media_publish`,
        null,
        {
          params: {
            access_token: this.accessToken,
            creation_id: containerId,
          },
        }
      );

      return response.data.id;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error(`Error publishing media: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Get insights for a published media
   */
  async getMediaInsights(mediaId: string): Promise<{
    impressions?: number;
    reach?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saved?: number;
  } | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      const mediaResponse = await axios.get(`${this.graphApiBase}/${this.apiVersion}/${mediaId}`, {
        params: {
          access_token: this.accessToken,
          fields: 'media_type,like_count,comments_count',
        },
      });

      const baseInsights = {
        likes: mediaResponse.data.like_count || 0,
        comments: mediaResponse.data.comments_count || 0,
      };

      try {
        const insightsResponse = await axios.get(
          `${this.graphApiBase}/${this.apiVersion}/${mediaId}/insights`,
          {
            params: {
              access_token: this.accessToken,
              metric: 'impressions,reach,saved,shares',
            },
          }
        );

        const insightsData = insightsResponse.data.data || [];
        const insights: any = { ...baseInsights };

        for (const metric of insightsData) {
          if (metric.name && metric.values?.[0]?.value !== undefined) {
            insights[metric.name] = metric.values[0].value;
          }
        }

        return insights;
      } catch {
        return baseInsights;
      }
    } catch (error: any) {
      logger.error(`Error getting media insights: ${error.message}`);
      return null;
    }
  }

  /**
   * Get recent media published by the account
   */
  async getRecentMedia(limit: number = 10): Promise<any[]> {
    if (!this.isAuthenticated()) {
      return [];
    }

    try {
      const response = await axios.get(
        `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/media`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,media_type,caption,timestamp,like_count,comments_count,permalink',
            limit,
          },
        }
      );

      return response.data.data || [];
    } catch (error: any) {
      logger.error(`Error fetching recent media: ${error.message}`);
      return [];
    }
  }

  // =============================================================
  // CONVERSION DETECTION SYSTEM (4 LAYERS)
  // =============================================================

  /**
   * LAYER 2 - Banned terms filter (hard block)
   */
  private containsBannedTerms(text: string): boolean {
    const bannedTerms = [
      'maconha',
      'droga',
      'bomba',
      'arma',
      'sexo',
      'porn',
      'puta',
      'testando',
      'bot',
      'responde',
      'spam',
      'hack',
      'cocaína',
      'lsd',
      'tráfico',
      'golpe',
      'fraude',
      'pirata',
    ];

    const hasBanned = bannedTerms.some((term) => text.includes(term));
    if (hasBanned) {
      logger.warn(`🚫 Blocked message with banned term: "${text.substring(0, 50)}..."`);
    }
    return hasBanned;
  }

  /**
   * Check if text contains conversion keywords (configurable)
   */
  private isConversionKeyword(text: string): boolean {
    const keywords = this.settings.conversionKeywords || [
      'quero',
      'eu quero',
      'me manda',
      'manda',
      'link',
      'comprar',
      'interessado',
      'interesse',
      'quero esse',
      'como compro',
      'onde compro',
    ];

    // Normalize text for comparison
    const normalizedText = text.toLowerCase();

    return keywords.some((kw) => normalizedText.includes(kw.toLowerCase()));
  }

  /**
   * LAYER 3 - Purchase intent detection
   */
  private hasPurchaseIntent(text: string): boolean {
    return this.isConversionKeyword(text);
  }

  /**
   * LAYER 4 - Offer context matching
   */
  private matchesOfferContext(text: string, offerTitle: string): boolean {
    const titleWords = offerTitle
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    return titleWords.some((word) => text.includes(word));
  }

  /**
   * Handle reply to specific media
   */
  private async handleMediaReply(
    senderId: string,
    mediaId: string,
    messageText: string
  ): Promise<boolean> {
    if (this.containsBannedTerms(messageText)) return true;
    if (!this.hasPurchaseIntent(messageText)) return false;

    try {
      const { PostHistoryModel } = await import('../../models/PostHistory');
      const { OfferModel } = await import('../../models/Offer');

      const postHistory = await PostHistoryModel.findOne({
        'metadata.mediaId': mediaId,
        platform: 'instagram',
        status: 'success',
      });

      if (!postHistory) {
        logger.warn(`No PostHistory found for mediaId ${mediaId}`);
        return false;
      }

      const offer = await OfferModel.findById(postHistory.offerId).lean();
      if (!offer) return false;

      const matchesContext = this.matchesOfferContext(messageText, offer.title || '');
      if (!matchesContext && messageText.length > 20) {
        await this.sendFallbackMessage(senderId, offer);
        return true;
      }

      const { InstagramConversionModel } = await import('../../models/InstagramConversion');
      const alreadySent = await InstagramConversionModel.exists({
        offerId: offer._id,
        igSenderId: senderId,
      });

      if (alreadySent) {
        await this.sendDirectMessage(
          senderId,
          '✅ Você já recebeu o link dessa oferta! Confira suas mensagens anteriores. 😊'
        );
        return true;
      }

      const affiliateUrl = postHistory.metadata?.affiliateUrl || offer.affiliateUrl;
      if (!affiliateUrl) {
        await this.sendDirectMessage(senderId, 'Oferta indisponível no momento. 🙏');
        return true;
      }

      const delayMs = 2000 + Math.random() * 3000;
      await this.delay(delayMs);

      await this.sendOfferLink(senderId, offer, affiliateUrl);

      await this.recordConversion({
        offerId: offer._id,
        userId: offer.userId,
        igSenderId: senderId,
        mediaId: mediaId,
        mediaType: postHistory.metadata?.mediaType || 'story',
        source: 'story_reply',
        affiliateUrl,
        messageText: messageText.substring(0, 200),
        offerTitle: offer.title,
        responseDelayMs: delayMs,
      });

      return true;
    } catch (error: any) {
      logger.error(`Error in handleMediaReply: ${error.message}`);
      return false;
    }
  }

  private async handleConversionWithoutMedia(senderId: string, messageText: string): Promise<void> {
    if (this.containsBannedTerms(messageText)) return;

    try {
      const { PostHistoryModel } = await import('../../models/PostHistory');
      const { OfferModel } = await import('../../models/Offer');

      const recentPost = await PostHistoryModel.findOne({
        platform: 'instagram',
        status: 'success',
        'metadata.mediaType': { $in: ['story', 'post', 'reel'] },
      }).sort({ postedAt: -1 });

      if (!recentPost) {
        await this.sendDirectMessage(senderId, 'Sem ofertas no momento! 👀');
        return;
      }

      const offer = await OfferModel.findById(recentPost.offerId).lean();
      if (!offer) return;

      await this.sendFallbackMessage(senderId, offer);
    } catch (error: any) {
      logger.error(`Error in handleConversionWithoutMedia: ${error.message}`);
    }
  }

  private async sendOfferLink(
    recipientId: string,
    offer: any,
    affiliateUrl: string
  ): Promise<void> {
    const discount = offer.discountPercentage || 0;
    const message =
      `🎁 Aqui está sua oferta!\n\n` +
      `📦 ${offer.title}\n` +
      `💰 De R$ ${Number(offer.originalPrice || 0).toFixed(2)} por R$ ${Number(offer.currentPrice || 0).toFixed(2)}\n` +
      `🔥 ${discount}% OFF\n\n` +
      `👉 ${affiliateUrl}\n\n` +
      `⚡ Corra! Oferta por tempo limitado.`;

    await this.sendDirectMessage(recipientId, message);
    logger.info(`✅ Affiliate link sent to ${recipientId} for offer ${offer._id}`);
  }

  private async sendFallbackMessage(senderId: string, offer: any): Promise<void> {
    const message =
      `🙂 Posso te ajudar sim! \n\n` +
      `Essa oferta é sobre:\n` +
      `📦 ${offer.title}\n\n` +
      `Se quiser o link, responda algo como:\n` +
      `👉 "quero o ${(offer.title || '').split(' ').slice(0, 2).join(' ')}"\n\n` +
      `Ou simplesmente: "manda o link"`;

    await this.sendDirectMessage(senderId, message);
  }

  private async recordConversion(data: any): Promise<void> {
    try {
      const { InstagramConversionModel } = await import('../../models/InstagramConversion');
      await InstagramConversionModel.create({
        ...data,
        sentAt: new Date(),
        metadata: {
          messageText: data.messageText,
          offerTitle: data.offerTitle,
          responseDelayMs: data.responseDelayMs,
        },
      });
      logger.info(`📊 Conversion recorded: ${data.offerId}`);
    } catch (error: any) {
      if (error.code !== 11000) logger.error(`Error recording conversion: ${error.message}`);
    }
  }



}
