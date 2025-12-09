import { TwitterApi } from 'twitter-api-v2';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { AIService } from '../ai/AIService';
import { PostHistoryModel } from '../../models/PostHistory';
import axios from 'axios';
import crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class XService {
  private client: TwitterApi | null = null;
  private aiService: AIService | null = null;
  private oauth2ClientId: string | null = null;
  private oauth2ClientSecret: string | null = null;
  private oauth2RedirectUri: string | null = null;

  constructor() {
    // Don't initialize client on startup - lazy initialization
    const bearerToken = process.env.X_BEARER_TOKEN;
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_KEY_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;
    const oauth2AccessToken = process.env.X_OAUTH2_ACCESS_TOKEN;

    // OAuth 2.0 credentials - load from environment or config
    this.oauth2ClientId = process.env.X_OAUTH2_CLIENT_ID || null;
    this.oauth2ClientSecret = process.env.X_OAUTH2_CLIENT_SECRET || null;
    this.oauth2RedirectUri =
      process.env.X_OAUTH2_REDIRECT_URI || 'http://localhost:3000/api/x/auth/callback';

    // Try to load from config.json if not in environment
    if (!this.oauth2ClientId || !this.oauth2ClientSecret) {
      try {
        const configPath = join(process.cwd(), 'config.json');
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf-8'));
          if (config.x?.oauth2ClientId) {
            this.oauth2ClientId = config.x.oauth2ClientId;
          }
          if (config.x?.oauth2ClientSecret) {
            this.oauth2ClientSecret = config.x.oauth2ClientSecret;
          }
          if (config.x?.oauth2RedirectUri) {
            this.oauth2RedirectUri = config.x.oauth2RedirectUri;
          }
        }
      } catch (error) {
        // Ignore errors loading config
      }
    }

    if (
      bearerToken ||
      (apiKey && apiSecret && accessToken && accessSecret) ||
      oauth2AccessToken ||
      (this.oauth2ClientId && this.oauth2ClientSecret)
    ) {
      logger.info('✅ X (Twitter) configured - will initialize on first use');
    } else {
      logger.warn('⚠️ X (Twitter) credentials not configured');
    }
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
   * Initialize Twitter client if not already done
   * Priority: OAuth 1.0a > OAuth 2.0 Access Token > Bearer Token
   */
  private initializeClient(): void {
    if (this.client) {
      return; // Already initialized
    }

    // Try OAuth 1.0a first (full access - required for posting)
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_KEY_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

    logger.debug(
      `X (Twitter) credentials check: apiKey=${!!apiKey}, apiSecret=${!!apiSecret}, accessToken=${!!accessToken}, accessSecret=${!!accessSecret}`
    );

    if (apiKey && apiSecret && accessToken && accessSecret) {
      this.client = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
      });
      logger.info('✅ X (Twitter) client initialized with OAuth 1.0a');
      return;
    }

    // Try OAuth 2.0 Access Token (from OAuth 2.0 flow)
    const oauth2AccessToken = process.env.X_OAUTH2_ACCESS_TOKEN;
    if (oauth2AccessToken) {
      this.client = new TwitterApi(oauth2AccessToken);
      logger.info('✅ X (Twitter) client initialized with OAuth 2.0 Access Token');
      return;
    }

    // Fallback to OAuth 2.0 Bearer Token (may have limited permissions)
    const bearerToken = process.env.X_BEARER_TOKEN;
    if (bearerToken) {
      // Decode URL-encoded bearer token if needed
      const decodedToken = decodeURIComponent(bearerToken);
      this.client = new TwitterApi(decodedToken);
      logger.info(
        '✅ X (Twitter) client initialized with Bearer Token (may have limited permissions)'
      );
      return;
    }

    logger.warn(
      '⚠️ X (Twitter) credentials not configured - check config.json or environment variables'
    );
  }

  /**
   * Load OAuth 2.0 credentials from config.json if not already loaded
   */
  private loadOAuth2Credentials(): void {
    if (this.oauth2ClientId && this.oauth2ClientSecret) {
      return; // Already loaded
    }

    try {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.x?.oauth2ClientId) {
          this.oauth2ClientId = config.x.oauth2ClientId.trim(); // Trim whitespace
          if (this.oauth2ClientId) {
            logger.debug(`Loaded OAuth 2.0 Client ID (length: ${this.oauth2ClientId.length})`);
          }
        }
        if (config.x?.oauth2ClientSecret) {
          this.oauth2ClientSecret = config.x.oauth2ClientSecret.trim(); // Trim whitespace
        }
        if (config.x?.oauth2RedirectUri) {
          this.oauth2RedirectUri = config.x.oauth2RedirectUri.trim(); // Trim whitespace
        }
      }
    } catch (error) {
      logger.error('Error loading OAuth 2.0 credentials:', error);
    }
  }

  /**
   * Get OAuth 2.0 authorization URL
   * According to X (Twitter) API docs: https://docs.x.com/en/authentication/guides/authentication-with-oauth-2-0
   * @param state Optional state parameter for CSRF protection
   * @returns Authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    // Try to load credentials if not already loaded
    this.loadOAuth2Credentials();

    if (!this.oauth2ClientId) {
      throw new Error('OAuth 2.0 Client ID not configured');
    }

    const redirectUri = this.oauth2RedirectUri || 'http://localhost:3000/api/x/auth/callback';
    const stateParam = state || crypto.randomBytes(16).toString('hex');

    // Build URL according to X API documentation
    // Note: X API OAuth 2.0 does NOT require PKCE for web applications
    const params = new URLSearchParams();
    params.append('response_type', 'code');
    params.append('client_id', this.oauth2ClientId);
    params.append('redirect_uri', redirectUri);
    params.append('scope', 'tweet.read tweet.write users.read offline.access');
    params.append('state', stateParam);
    // Add code_challenge and code_challenge_method only if using PKCE (optional)
    // For simplicity, we'll use without PKCE first

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    if (this.oauth2ClientId) {
      logger.debug(`Generated OAuth 2.0 URL with client_id length: ${this.oauth2ClientId.length}`);
    }
    return authUrl;
  }

  /**
   * Exchange authorization code for access token (OAuth 2.0)
   * @param code Authorization code from callback
   * @param codeVerifier Code verifier (for PKCE, optional)
   * @returns Access token and refresh token
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier?: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }> {
    // Try to load credentials if not already loaded
    this.loadOAuth2Credentials();

    if (!this.oauth2ClientId || !this.oauth2ClientSecret) {
      throw new Error('OAuth 2.0 Client ID or Client Secret not configured');
    }

    const redirectUri = this.oauth2RedirectUri || 'http://localhost:3000/api/x/auth/callback';

    try {
      // According to X API docs, token exchange uses Basic Auth with client_id:client_secret
      const tokenParams: any = {
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      };

      // Add code verifier if provided (PKCE - optional)
      if (codeVerifier) {
        tokenParams.code_verifier = codeVerifier;
      }

      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams(tokenParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${this.oauth2ClientId}:${this.oauth2ClientSecret}`).toString('base64')}`,
          },
        }
      );

      logger.info('✅ Successfully exchanged OAuth 2.0 code for access token');

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in || 7200, // Default 2 hours
        token_type: response.data.token_type || 'bearer',
        scope: response.data.scope || '',
      };
    } catch (error: any) {
      logger.error('Error exchanging OAuth 2.0 code for token:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(
        `Failed to exchange code for token: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * Refresh OAuth 2.0 access token using refresh token
   * @param refreshToken Refresh token
   * @returns New access token and refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }> {
    // Try to load credentials if not already loaded
    this.loadOAuth2Credentials();

    if (!this.oauth2ClientId || !this.oauth2ClientSecret) {
      throw new Error('OAuth 2.0 Client ID or Client Secret not configured');
    }

    try {
      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          client_id: this.oauth2ClientId,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${this.oauth2ClientId}:${this.oauth2ClientSecret}`).toString('base64')}`,
          },
        }
      );

      logger.info('✅ Successfully refreshed OAuth 2.0 access token');

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in || 7200,
        token_type: response.data.token_type || 'bearer',
        scope: response.data.scope || '',
      };
    } catch (error: any) {
      logger.error('Error refreshing OAuth 2.0 access token:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(
        `Failed to refresh token: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * Send offer to X (Twitter)
   */
  async sendOffer(offer: Offer): Promise<boolean> {
    // Initialize client if not already done
    this.initializeClient();

    if (!this.client) {
      logger.warn('⚠️ X (Twitter) client not initialized, skipping send');
      logger.debug('X (Twitter) credentials check:');
      logger.debug(`  X_API_KEY: ${process.env.X_API_KEY ? 'SET' : 'NOT SET'}`);
      logger.debug(`  X_API_KEY_SECRET: ${process.env.X_API_KEY_SECRET ? 'SET' : 'NOT SET'}`);
      logger.debug(`  X_ACCESS_TOKEN: ${process.env.X_ACCESS_TOKEN ? 'SET' : 'NOT SET'}`);
      logger.debug(
        `  X_ACCESS_TOKEN_SECRET: ${process.env.X_ACCESS_TOKEN_SECRET ? 'SET' : 'NOT SET'}`
      );
      logger.debug(`  X_BEARER_TOKEN: ${process.env.X_BEARER_TOKEN ? 'SET' : 'NOT SET'}`);
      return false;
    }

    // Check rate limits logic
    try {
      const rateLimit = await this.checkRateLimit();
      if (!rateLimit.allowed) {
        logger.warn(`⚠️ Skipping X (Twitter) post due to internal rate limiting: ${rateLimit.reason}`);
        return false;
      }
    } catch (err: any) {
      logger.warn(`⚠️ Failed to check rate limits, proceeding anyway: ${err.message}`);
    }

    try {
      logger.info(`📤 Sending offer to X (Twitter) - Title: ${offer.title}`);

      // Format message for X (Twitter has 280 char limit, but we'll try to keep it concise)
      const message = await this.formatMessage(offer);

      // X/Twitter API v2 - create tweet
      // Use readWrite client if available (OAuth 1.0a), otherwise use regular client
      const rwClient = this.client.readWrite || this.client;

      // Note: For images, we need to upload media first, then attach to tweet
      if (offer.imageUrl) {
        logger.debug(`📷 Sending offer with image: ${offer.imageUrl}`);

        // Download image and upload to Twitter
        try {
          const axios = (await import('axios')).default;
          const imageResponse = await axios.get(offer.imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
          });

          const imageBuffer = Buffer.from(imageResponse.data);

          // Upload media (requires OAuth 1.0a, not Bearer Token)
          if (this.client.readWrite) {
            const mediaId = await this.client.readWrite.v1.uploadMedia(imageBuffer, {
              mimeType: imageResponse.headers['content-type'] || 'image/jpeg',
            });

            // Create tweet with media
            const tweet = await this.client.readWrite.v2.tweet({
              text: message,
              media: {
                media_ids: [mediaId],
              },
            });

            logger.info(
              `✅ Offer sent successfully to X (Twitter): ${offer.title} (Tweet ID: ${tweet.data.id})`
            );
            return true;
          } else {
            // Bearer Token doesn't support media upload, send text with URL
            throw new Error('OAuth 1.0a required for media upload');
          }
        } catch (imageError: any) {
          logger.warn(`⚠️ Could not upload image to X, sending text only: ${imageError.message}`);
          // Fallback to text-only tweet
          const tweet = await rwClient.v2.tweet({
            text: `${message}\n\n📷 ${offer.imageUrl}`,
          });
          logger.info(
            `✅ Offer sent successfully to X (Twitter) (text only): ${offer.title} (Tweet ID: ${tweet.data.id})`
          );
          return true;
        }
      } else {
        // Text-only tweet
        logger.debug('📝 Sending offer without image');
        const tweet = await rwClient.v2.tweet({
          text: message,
        });

        logger.info(
          `✅ Offer sent successfully to X (Twitter): ${offer.title} (Tweet ID: ${tweet.data.id})`
        );
        return true;
      }
    } catch (error: any) {
      if (error.code === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        logger.error(`❌ X (Twitter) Rate Limit exceeded (429). You have hit the daily/monthly limit.`);
        logger.warn(`   Note: Free tier allows ~50 tweets/24h. Check Developer Portal for usage.`);
      } else {
        logger.error(`❌ Error sending offer to X (Twitter): ${error.message}`, error);
      }
      logger.error(`   Offer details - ID: ${offer._id}, Title: ${offer.title}`);
      return false;
    }
  }

  /**
   * Format offer message for X (Twitter)
   * X has 280 character limit, so we need to be concise
   */
  private async formatMessage(offer: Offer): Promise<string> {
    const impactPhrase = await this.getImpactPhrase(offer);
    const categoryEmoji = this.getCategoryEmoji(offer.category || '');

    // Format price
    const priceFormatted = offer.currentPrice.toFixed(2).replace('.', ',');
    const hasDiscount = offer.discountPercentage >= 5 && offer.originalPrice > offer.currentPrice;

    // Build message parts - X format is more compact
    const parts: string[] = [];

    // Impact phrase
    parts.push(`${impactPhrase}!`);

    // Product title with category emoji (truncate if too long)
    const title = offer.title.length > 80 ? offer.title.substring(0, 77) + '...' : offer.title;
    parts.push(`${categoryEmoji} ${title}`);

    // Price
    if (hasDiscount) {
      const originalFormatted = offer.originalPrice.toFixed(2).replace('.', ',');
      parts.push(`💰 De R$ ${originalFormatted} por R$ ${priceFormatted}`);
      parts.push(`🎯 ${offer.discountPercentage.toFixed(0)}% OFF`);
    } else {
      parts.push(`🔥 POR R$ ${priceFormatted}`);
    }

    // Coupons
    if (offer.coupons && offer.coupons.length > 0) {
      parts.push(`🎟️ CUPOM: ${offer.coupons[0]}`);
    }

    // Link (shortened if possible)
    parts.push(`🔗 ${offer.affiliateUrl}`);

    // Hashtags (limit to fit in 280 chars)
    const hashtags = this.generateHashtags(offer);
    const hashtagString = hashtags.join(' ');

    // Build full message
    let message = parts.join('\n\n');

    // Add hashtags if we have space (280 char limit)
    const messageWithHashtags = message + '\n\n' + hashtagString;
    if (messageWithHashtags.length <= 280) {
      message = messageWithHashtags;
    } else {
      // Try to fit at least some hashtags
      const availableSpace = 280 - message.length - 2; // -2 for \n\n
      if (availableSpace > 20) {
        // Add most important hashtags
        const importantHashtags = ['#oferta', '#promocao', '#desconto'];
        const hashtagsToAdd = importantHashtags.filter((h) => (message + '\n\n' + h).length <= 280);
        if (hashtagsToAdd.length > 0) {
          message += '\n\n' + hashtagsToAdd.join(' ');
        }
      }
    }

    return message;
  }

  /**
   * Generate dynamic impact phrase using AI (Groq) or fallback
   */
  private async getImpactPhrase(offer: Offer): Promise<string> {
    try {
      // Try to use AI to generate a creative phrase
      const aiPhrase = await Promise.race([
        this.getAIService().generateImpactPhrase(offer),
        new Promise<string>((resolve) => {
          setTimeout(() => resolve(''), 2000); // 2 second timeout
        }),
      ]);

      if (aiPhrase && aiPhrase.length > 0) {
        logger.debug(`✅ Using AI-generated impact phrase: "${aiPhrase}"`);
        return aiPhrase;
      }
    } catch (error: any) {
      logger.debug(`⚠️ AI phrase generation failed, using fallback: ${error.message}`);
    }

    // Fallback to static phrases
    return this.getFallbackImpactPhrase(offer);
  }

  /**
   * Get fallback impact phrase (static phrases)
   */
  private getFallbackImpactPhrase(offer: Offer): string {
    const discount = offer.discountPercentage;

    if (discount >= 50) {
      const phrases = [
        'NUNCA VI TÃO BARATO',
        'PROMOÇÃO IMPERDÍVEL',
        'DESCONTO INSANO',
        'OPORTUNIDADE ÚNICA',
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (discount >= 30) {
      const phrases = ['SUPER PROMOÇÃO', 'OFERTA ESPECIAL', 'DESCONTO IMPERDÍVEL'];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (discount >= 15) {
      return 'ÓTIMA OFERTA';
    }

    if (discount >= 5) {
      return 'EM PROMOÇÃO';
    }

    return 'OFERTA DISPONÍVEL';
  }

  /**
   * Get emoji for category
   */
  private getCategoryEmoji(category: string): string {
    const categoryEmojis: Record<string, string> = {
      electronics: '📱',
      fashion: '👕',
      home: '🏠',
      beauty: '💄',
      sports: '⚽',
      toys: '🧸',
      books: '📚',
      automotive: '🚗',
      pets: '🐾',
      food: '🍔',
      health: '💊',
      other: '📦',
    };
    return categoryEmojis[category.toLowerCase()] || '🔥';
  }

  /**
   * Generate hashtags for the offer
   */
  private generateHashtags(offer: Offer): string[] {
    const hashtags: string[] = [];

    // Category hashtag
    if (offer.category) {
      const categoryTag = `#${offer.category.toLowerCase().replace(/\s+/g, '')}`;
      hashtags.push(categoryTag);
    }

    // Source hashtag
    if (offer.source) {
      const sourceTag = `#${offer.source.toLowerCase()}`;
      hashtags.push(sourceTag);
    }

    // Discount hashtag
    if (offer.discountPercentage >= 50) {
      hashtags.push('#superdesconto');
    } else if (offer.discountPercentage >= 30) {
      hashtags.push('#megaoferta');
    } else if (offer.discountPercentage >= 15) {
      hashtags.push('#promocao');
    }

    // Always add these
    hashtags.push('#oferta', '#promocao', '#desconto');

    // Remove duplicates and return
    return Array.from(new Set(hashtags));
  }

  /**
   * Check if we can post to X (Twitter) based on rate limits
   * - Max ~50 posts per 24h (Free Tier)
   * - Enforce minimum interval to spread posts
   */
  private async checkRateLimit(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const MAX_DAILY_POSTS = 48; // Leave a small buffer below 50
      const MIN_INTERVAL_MINUTES = 30; // Spread posts to cover 24h (24h * 60m / 48 = 30m)

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check daily count
      const dailyCount = await PostHistoryModel.countDocuments({
        platform: { $in: ['x', 'twitter'] },
        postedAt: { $gt: oneDayAgo },
        status: 'success'
      });

      if (dailyCount >= MAX_DAILY_POSTS) {
        return {
          allowed: false,
          reason: `Daily limit reached (${dailyCount}/${MAX_DAILY_POSTS} posts in last 24h)`
        };
      }

      // Check interval
      const lastPost = await PostHistoryModel.findOne({
        platform: { $in: ['x', 'twitter'] },
        status: 'success'
      }).sort({ postedAt: -1 });

      if (lastPost) {
        const lastPostTime = new Date(lastPost.postedAt).getTime();
        const minutesSinceLastPost = (now.getTime() - lastPostTime) / (1000 * 60);

        if (minutesSinceLastPost < MIN_INTERVAL_MINUTES) {
          return {
            allowed: false,
            reason: `Minimum interval not reached (${minutesSinceLastPost.toFixed(1)}/${MIN_INTERVAL_MINUTES} mins)`
          };
        }
      }

      return { allowed: true };
    } catch (error: any) {
      logger.error('Error checking rate limits:', error);
      // Fail safe - allow if DB error, or maybe deny? Let's allow to not block completely if DB is flaky
      // But safer to deny if we want to be strict. Let's allow with warning.
      return { allowed: true, reason: 'Error checking limits' };
    }
  }

  /**
   * Send multiple offers
   */
  async sendOffers(offers: Offer[]): Promise<number> {
    // Initialize client if not already done
    this.initializeClient();

    if (!this.client) {
      logger.warn('⚠️ X (Twitter) client not initialized, skipping send');
      return 0;
    }

    logger.info(`📤 Sending ${offers.length} offers to X (Twitter)...`);
    let successCount = 0;

    for (const offer of offers) {
      const success = await this.sendOffer(offer);
      if (success) {
        successCount++;
        // Add delay between tweets to avoid rate limiting
        await this.delay(5000); // 5 seconds between tweets
      }
    }

    logger.info(`✅ Sent ${successCount}/${offers.length} offers to X (Twitter)`);
    return successCount;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
