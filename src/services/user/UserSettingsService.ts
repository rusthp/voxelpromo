import { UserSettingsModel, IUserSettings } from '../../models/UserSettings';
import { logger } from '../../utils/logger';

/**
 * Service for managing user-specific settings
 * MULTI-TENANT: All configurations are now per-user
 */
export class UserSettingsService {
  /**
   * Get or create settings for a user
   */
  async getSettings(userId: string): Promise<IUserSettings> {
    let settings = await UserSettingsModel.findOne({ userId });
    if (!settings) {
      settings = await UserSettingsModel.create({ userId });
      logger.info(`Created new UserSettings for user: ${userId}`);
    }
    return settings;
  }

  /**
   * Get settings as plain object (for API response)
   * Masks sensitive fields with ***
   */
  async getSafeSettings(userId: string): Promise<any> {
    const settings = await this.getSettings(userId);
    const doc = settings.toObject();

    return {
      amazon: {
        accessKey: doc.amazon?.accessKey ? '***' : '',
        secretKey: doc.amazon?.secretKey ? '***' : '',
        associateTag: doc.amazon?.associateTag || '',
        region: doc.amazon?.region || 'sa-east-1',
        isConfigured: doc.amazon?.isConfigured || false,
      },
      aliexpress: {
        appKey: doc.aliexpress?.appKey ? '***' : '',
        appSecret: doc.aliexpress?.appSecret ? '***' : '',
        trackingId: doc.aliexpress?.trackingId || '',
        isConfigured: doc.aliexpress?.isConfigured || false,
      },
      mercadolivre: {
        clientId: doc.mercadolivre?.clientId || '',
        clientSecret: doc.mercadolivre?.clientSecret ? '***' : '',
        redirectUri: doc.mercadolivre?.redirectUri || '',
        affiliateCode: doc.mercadolivre?.affiliateCode || '',
        accessToken: doc.mercadolivre?.accessToken ? '***' : '',
        refreshToken: doc.mercadolivre?.refreshToken ? '***' : '',
        tokenExpiresAt: doc.mercadolivre?.tokenExpiresAt || null,
        sessionCookies: doc.mercadolivre?.sessionCookies ? '***' : '',
        csrfToken: doc.mercadolivre?.csrfToken ? '***' : '',
        affiliateTag: doc.mercadolivre?.affiliateTag || '',
        isConfigured: doc.mercadolivre?.isConfigured || false,
      },
      awin: {
        apiToken: doc.awin?.apiToken ? '***' : '',
        publisherId: doc.awin?.publisherId || '',
        dataFeedApiKey: doc.awin?.dataFeedApiKey ? '***' : '',
        enabled: doc.awin?.enabled || false,
        isConfigured: doc.awin?.isConfigured || false,
      },
      shopee: {
        feedUrls: doc.shopee?.feedUrls || [],
        affiliateCode: doc.shopee?.affiliateCode || '',
        minDiscount: doc.shopee?.minDiscount,
        maxPrice: doc.shopee?.maxPrice,
        minPrice: doc.shopee?.minPrice,
        cacheEnabled: doc.shopee?.cacheEnabled,
        isConfigured: doc.shopee?.isConfigured || false,
        // Multi-tenant API credentials
        appId: doc.shopee?.appId ? '***' : '',
        appSecret: doc.shopee?.appSecret ? '***' : '',
        apiEnabled: doc.shopee?.apiEnabled ?? false,
      },
      telegram: {
        botToken: doc.telegram?.botToken ? '***' : '',
        channelId: doc.telegram?.channelId || '',
        isConfigured: doc.telegram?.isConfigured || false,
      },
      instagram: {
        appId: doc.instagram?.appId ? '***' : '',
        appSecret: doc.instagram?.appSecret ? '***' : '',
        accessToken: doc.instagram?.accessToken ? '***' : '',
        pageAccessToken: doc.instagram?.pageAccessToken ? '***' : '',
        pageId: doc.instagram?.pageId || '',
        igUserId: doc.instagram?.igUserId || '',
        webhookVerifyToken: doc.instagram?.webhookVerifyToken || '',
        isConfigured: doc.instagram?.isConfigured || false,
      },
      whatsapp: {
        enabled: doc.whatsapp?.enabled || false,
        targetNumber: doc.whatsapp?.targetNumber || '',
        targetGroups: doc.whatsapp?.targetGroups || [],
        library: doc.whatsapp?.library || 'baileys',
        isConfigured: doc.whatsapp?.isConfigured || false,
      },
      x: {
        bearerToken: doc.x?.bearerToken ? '***' : '',
        apiKey: doc.x?.apiKey ? '***' : '',
        apiKeySecret: doc.x?.apiKeySecret ? '***' : '',
        accessToken: doc.x?.accessToken ? '***' : '',
        accessTokenSecret: doc.x?.accessTokenSecret ? '***' : '',
        oauth2ClientId: doc.x?.oauth2ClientId ? '***' : '',
        oauth2ClientSecret: doc.x?.oauth2ClientSecret ? '***' : '',
        oauth2RedirectUri: doc.x?.oauth2RedirectUri || 'http://localhost:3000/api/x/auth/callback',
        oauth2AccessToken: doc.x?.oauth2AccessToken ? '***' : '',
        oauth2RefreshToken: doc.x?.oauth2RefreshToken ? '***' : '',
        oauth2TokenExpiresAt: doc.x?.oauth2TokenExpiresAt || null,
        oauth2Scope: doc.x?.oauth2Scope || '',
        isConfigured: doc.x?.isConfigured || false,
      },
      ai: {
        provider: doc.ai?.provider || 'groq',
        groqApiKey: doc.ai?.groqApiKey ? '***' : '',
        openaiApiKey: doc.ai?.openaiApiKey ? '***' : '',
        isConfigured: doc.ai?.isConfigured || false,
      },
      rss: doc.rss || [],
      collection: doc.collectionSettings || { enabled: true, sources: [] },
    };
  }

  /**
   * Update settings from config payload
   * Handles masked values (***) by preserving existing values
   */
  async updateSettings(userId: string, payload: any): Promise<IUserSettings> {
    const settings = await this.getSettings(userId);

    // Helper to update only non-masked values
    const updateIfNotMasked = (current: any, incoming: any) => {
      if (incoming !== undefined && incoming !== '***' && incoming !== null) {
        return incoming.toString().trim() || current;
      }
      return current;
    };

    // Amazon
    if (payload.amazon) {
      if (!settings.amazon) settings.amazon = { isConfigured: false };
      settings.amazon.accessKey = updateIfNotMasked(
        settings.amazon.accessKey,
        payload.amazon.accessKey
      );
      settings.amazon.secretKey = updateIfNotMasked(
        settings.amazon.secretKey,
        payload.amazon.secretKey
      );
      settings.amazon.associateTag = payload.amazon.associateTag ?? settings.amazon.associateTag;
      settings.amazon.region = payload.amazon.region ?? settings.amazon.region;
      settings.amazon.isConfigured = !!(settings.amazon.accessKey && settings.amazon.secretKey);
    }

    // AliExpress
    if (payload.aliexpress) {
      if (!settings.aliexpress) settings.aliexpress = { isConfigured: false };
      settings.aliexpress.appKey = updateIfNotMasked(
        settings.aliexpress.appKey,
        payload.aliexpress.appKey
      );
      settings.aliexpress.appSecret = updateIfNotMasked(
        settings.aliexpress.appSecret,
        payload.aliexpress.appSecret
      );
      settings.aliexpress.trackingId =
        payload.aliexpress.trackingId ?? settings.aliexpress.trackingId;
      settings.aliexpress.isConfigured = !!(
        settings.aliexpress.appKey && settings.aliexpress.appSecret
      );
    }

    // Mercado Livre
    if (payload.mercadolivre) {
      if (!settings.mercadolivre) settings.mercadolivre = { isConfigured: false };
      settings.mercadolivre.clientId =
        payload.mercadolivre.clientId ?? settings.mercadolivre.clientId;
      settings.mercadolivre.clientSecret = updateIfNotMasked(
        settings.mercadolivre.clientSecret,
        payload.mercadolivre.clientSecret
      );
      settings.mercadolivre.redirectUri =
        payload.mercadolivre.redirectUri ?? settings.mercadolivre.redirectUri;
      settings.mercadolivre.affiliateCode =
        payload.mercadolivre.affiliateCode ?? settings.mercadolivre.affiliateCode;
      settings.mercadolivre.accessToken = updateIfNotMasked(
        settings.mercadolivre.accessToken,
        payload.mercadolivre.accessToken
      );
      settings.mercadolivre.refreshToken = updateIfNotMasked(
        settings.mercadolivre.refreshToken,
        payload.mercadolivre.refreshToken
      );
      settings.mercadolivre.tokenExpiresAt =
        payload.mercadolivre.tokenExpiresAt ?? settings.mercadolivre.tokenExpiresAt;
      settings.mercadolivre.sessionCookies = updateIfNotMasked(
        settings.mercadolivre.sessionCookies,
        payload.mercadolivre.sessionCookies
      );
      settings.mercadolivre.csrfToken = updateIfNotMasked(
        settings.mercadolivre.csrfToken,
        payload.mercadolivre.csrfToken
      );
      settings.mercadolivre.affiliateTag =
        payload.mercadolivre.affiliateTag ?? settings.mercadolivre.affiliateTag;
      settings.mercadolivre.codeVerifier =
        payload.mercadolivre.codeVerifier ?? settings.mercadolivre.codeVerifier;
      settings.mercadolivre.isConfigured = !!(
        settings.mercadolivre.accessToken || settings.mercadolivre.affiliateCode
      );
    }

    // Awin
    if (payload.awin) {
      if (!settings.awin) settings.awin = { isConfigured: false };
      settings.awin.apiToken = updateIfNotMasked(settings.awin.apiToken, payload.awin.apiToken);
      settings.awin.publisherId = payload.awin.publisherId ?? settings.awin.publisherId;
      settings.awin.dataFeedApiKey = updateIfNotMasked(
        settings.awin.dataFeedApiKey,
        payload.awin.dataFeedApiKey
      );
      settings.awin.enabled = payload.awin.enabled ?? settings.awin.enabled;
      settings.awin.isConfigured = !!(settings.awin.apiToken && settings.awin.publisherId);
    }

    // Shopee
    if (payload.shopee) {
      if (!settings.shopee) settings.shopee = { isConfigured: false };
      settings.shopee.feedUrls = payload.shopee.feedUrls ?? settings.shopee.feedUrls;
      settings.shopee.affiliateCode = payload.shopee.affiliateCode ?? settings.shopee.affiliateCode;
      settings.shopee.minDiscount = payload.shopee.minDiscount ?? settings.shopee.minDiscount;
      settings.shopee.maxPrice = payload.shopee.maxPrice ?? settings.shopee.maxPrice;
      settings.shopee.minPrice = payload.shopee.minPrice ?? settings.shopee.minPrice;
      settings.shopee.cacheEnabled = payload.shopee.cacheEnabled ?? settings.shopee.cacheEnabled;
      // Multi-tenant API credentials
      settings.shopee.appId = updateIfNotMasked(settings.shopee.appId, payload.shopee.appId);
      settings.shopee.appSecret = updateIfNotMasked(settings.shopee.appSecret, payload.shopee.appSecret);
      settings.shopee.apiEnabled = payload.shopee.apiEnabled ?? settings.shopee.apiEnabled;
      settings.shopee.isConfigured = !!(
        settings.shopee.feedUrls?.length ||
        settings.shopee.affiliateCode ||
        (settings.shopee.appId && settings.shopee.appSecret)
      );
    }

    // Telegram
    if (payload.telegram) {
      if (!settings.telegram) settings.telegram = { isConfigured: false };
      settings.telegram.botToken = updateIfNotMasked(
        settings.telegram.botToken,
        payload.telegram.botToken
      );
      settings.telegram.channelId = payload.telegram.channelId ?? settings.telegram.channelId;
      settings.telegram.isConfigured = !!(
        settings.telegram.botToken && settings.telegram.channelId
      );
    }

    // Instagram
    if (payload.instagram) {
      if (!settings.instagram) settings.instagram = { isConfigured: false };
      settings.instagram.appId = updateIfNotMasked(
        settings.instagram.appId,
        payload.instagram.appId
      );
      settings.instagram.appSecret = updateIfNotMasked(
        settings.instagram.appSecret,
        payload.instagram.appSecret
      );
      settings.instagram.accessToken = updateIfNotMasked(
        settings.instagram.accessToken,
        payload.instagram.accessToken
      );
      settings.instagram.pageAccessToken = updateIfNotMasked(
        settings.instagram.pageAccessToken,
        payload.instagram.pageAccessToken
      );
      settings.instagram.pageId = payload.instagram.pageId ?? settings.instagram.pageId;
      settings.instagram.igUserId = payload.instagram.igUserId ?? settings.instagram.igUserId;
      settings.instagram.webhookVerifyToken =
        payload.instagram.webhookVerifyToken ?? settings.instagram.webhookVerifyToken;
      settings.instagram.isConfigured = !!(
        settings.instagram.accessToken && settings.instagram.igUserId
      );
    }

    // WhatsApp
    if (payload.whatsapp) {
      if (!settings.whatsapp) settings.whatsapp = { isConfigured: false };
      settings.whatsapp.enabled = payload.whatsapp.enabled ?? settings.whatsapp.enabled;
      settings.whatsapp.targetNumber =
        payload.whatsapp.targetNumber ?? settings.whatsapp.targetNumber;
      settings.whatsapp.targetGroups =
        payload.whatsapp.targetGroups ?? settings.whatsapp.targetGroups;
      settings.whatsapp.library = payload.whatsapp.library ?? settings.whatsapp.library;
      settings.whatsapp.isConfigured = !!(
        settings.whatsapp.enabled &&
        (settings.whatsapp.targetNumber || settings.whatsapp.targetGroups?.length)
      );
    }

    // X (Twitter)
    if (payload.x) {
      if (!settings.x) settings.x = { isConfigured: false };
      settings.x.bearerToken = updateIfNotMasked(settings.x.bearerToken, payload.x.bearerToken);
      settings.x.apiKey = updateIfNotMasked(settings.x.apiKey, payload.x.apiKey);
      settings.x.apiKeySecret = updateIfNotMasked(settings.x.apiKeySecret, payload.x.apiKeySecret);
      settings.x.accessToken = updateIfNotMasked(settings.x.accessToken, payload.x.accessToken);
      settings.x.accessTokenSecret = updateIfNotMasked(
        settings.x.accessTokenSecret,
        payload.x.accessTokenSecret
      );
      settings.x.oauth2ClientId = updateIfNotMasked(
        settings.x.oauth2ClientId,
        payload.x.oauth2ClientId
      );
      settings.x.oauth2ClientSecret = updateIfNotMasked(
        settings.x.oauth2ClientSecret,
        payload.x.oauth2ClientSecret
      );
      settings.x.oauth2RedirectUri = payload.x.oauth2RedirectUri ?? settings.x.oauth2RedirectUri;
      settings.x.oauth2AccessToken = updateIfNotMasked(
        settings.x.oauth2AccessToken,
        payload.x.oauth2AccessToken
      );
      settings.x.oauth2RefreshToken = updateIfNotMasked(
        settings.x.oauth2RefreshToken,
        payload.x.oauth2RefreshToken
      );
      settings.x.oauth2TokenExpiresAt =
        payload.x.oauth2TokenExpiresAt ?? settings.x.oauth2TokenExpiresAt;
      settings.x.oauth2Scope = payload.x.oauth2Scope ?? settings.x.oauth2Scope;
      settings.x.isConfigured = !!(
        settings.x.apiKey ||
        settings.x.bearerToken ||
        settings.x.oauth2AccessToken
      );
    }

    // AI
    if (payload.ai) {
      if (!settings.ai) settings.ai = { isConfigured: false, provider: 'groq' };
      settings.ai.provider = payload.ai.provider ?? settings.ai.provider;
      settings.ai.groqApiKey = updateIfNotMasked(settings.ai.groqApiKey, payload.ai.groqApiKey);
      settings.ai.openaiApiKey = updateIfNotMasked(
        settings.ai.openaiApiKey,
        payload.ai.openaiApiKey
      );
      settings.ai.isConfigured = !!(settings.ai.groqApiKey || settings.ai.openaiApiKey);
    }

    // RSS & CollectionSettings
    if (payload.rss) {
      settings.rss = payload.rss;
    }
    if (payload.collection) {
      settings.collectionSettings = { ...settings.collectionSettings, ...payload.collection };
    }
    if (payload.collectionSettings) {
      settings.collectionSettings = {
        ...settings.collectionSettings,
        ...payload.collectionSettings,
      };
    }

    await settings.save();
    logger.info(`Updated UserSettings for user: ${userId}`);
    return settings;
  }

  /**
   * Disconnect a specific integration
   */
  async disconnectIntegration(userId: string, integration: string): Promise<IUserSettings> {
    const settings = await this.getSettings(userId);

    const resetMap: Record<string, () => void> = {
      telegram: () => {
        settings.telegram = { isConfigured: false };
      },
      instagram: () => {
        settings.instagram = { isConfigured: false };
      },
      whatsapp: () => {
        settings.whatsapp = { isConfigured: false, enabled: false };
      },
      x: () => {
        settings.x = { isConfigured: false };
      },
      amazon: () => {
        settings.amazon = { isConfigured: false };
      },
      aliexpress: () => {
        settings.aliexpress = { isConfigured: false };
      },
      mercadolivre: () => {
        settings.mercadolivre = { isConfigured: false };
      },
      awin: () => {
        settings.awin = { isConfigured: false, enabled: false };
      },
      shopee: () => {
        settings.shopee = { isConfigured: false };
      },
    };

    if (resetMap[integration]) {
      resetMap[integration]();
      await settings.save();
      logger.info(`Disconnected ${integration} for user: ${userId}`);
    }

    return settings;
  }

  /**
   * Get integration status summary
   */
  async getIntegrationStatus(userId: string) {
    const settings = await this.getSettings(userId);

    return {
      affiliates: {
        amazon: settings.amazon?.isConfigured || false,
        aliexpress: settings.aliexpress?.isConfigured || false,
        mercadolivre: settings.mercadolivre?.isConfigured || false,
        awin: settings.awin?.isConfigured || false,
        shopee: settings.shopee?.isConfigured || false,
      },
      messaging: {
        telegram: settings.telegram?.isConfigured || false,
        instagram: settings.instagram?.isConfigured || false,
        whatsapp: settings.whatsapp?.isConfigured || false,
        x: settings.x?.isConfigured || false,
      },
      ai: settings.ai?.isConfigured || false,
    };
  }

  // ========================================
  // Instagram Multi-Tenant Methods
  // ========================================

  /**
   * Update Instagram settings partially (for config, OAuth state, etc.)
   * Used by /config route to mark user as pending OAuth
   */
  async updateInstagramSettings(
    userId: string,
    updates: Partial<{
      isConfigured: boolean;
      pendingOAuth: boolean;
      appId: string;
      appSecret: string;
      webhookVerifyToken: string;
      autoReplyDM: boolean;
      welcomeMessage: string;
      keywordReplies: Map<string, string>;
      conversionKeywords: string[];
    }>
  ): Promise<IUserSettings> {
    const settings = await this.getSettings(userId);
    if (!settings.instagram) settings.instagram = { isConfigured: false };

    if (updates.isConfigured !== undefined) {
      settings.instagram!.isConfigured = updates.isConfigured;
    }
    if (updates.pendingOAuth !== undefined) {
      settings.instagram!.pendingOAuth = updates.pendingOAuth;
    }
    if (updates.appId !== undefined) {
      settings.instagram!.appId = updates.appId;
    }
    if (updates.appSecret !== undefined) {
      settings.instagram!.appSecret = updates.appSecret;
    }
    if (updates.webhookVerifyToken !== undefined) {
      settings.instagram!.webhookVerifyToken = updates.webhookVerifyToken;
    }
    if (updates.autoReplyDM !== undefined) {
      settings.instagram!.autoReplyDM = updates.autoReplyDM;
    }
    if (updates.welcomeMessage !== undefined) {
      settings.instagram!.welcomeMessage = updates.welcomeMessage;
    }
    if (updates.keywordReplies !== undefined) {
      settings.instagram!.keywordReplies = updates.keywordReplies;
    }
    if (updates.conversionKeywords !== undefined) {
      settings.instagram!.conversionKeywords = updates.conversionKeywords;
    }

    await settings.save();
    logger.info(`Instagram settings updated for user: ${userId}`);
    return settings;
  }

  /**
   * Update Instagram OAuth tokens for a user
   * Called after successful OAuth callback
   */
  async updateInstagramTokens(
    userId: string,
    tokens: {
      accessToken?: string;
      igUserId?: string;
      username?: string;
      accountType?: string;
      tokenExpiresAt?: Date;
      tokenStatus?: 'active' | 'expiring' | 'expired';
    }
  ): Promise<IUserSettings> {
    const settings = await this.getSettings(userId);
    if (!settings.instagram) settings.instagram = { isConfigured: false };

    // Set configured flag
    settings.instagram!.isConfigured = true;

    if (tokens.accessToken) settings.instagram!.accessToken = tokens.accessToken;
    if (tokens.igUserId) settings.instagram!.igUserId = tokens.igUserId;
    if (tokens.username) settings.instagram!.username = tokens.username;
    if (tokens.accountType) settings.instagram!.accountType = tokens.accountType;
    if (tokens.tokenExpiresAt) settings.instagram!.tokenExpiresAt = tokens.tokenExpiresAt;
    if (tokens.tokenStatus) settings.instagram!.tokenStatus = tokens.tokenStatus;

    settings.instagram!.isConfigured = true;
    if (tokens.accessToken) settings.instagram!.pendingOAuth = false;

    await settings.save();
    logger.info(`✅ Instagram tokens saved for user: ${userId} (@${settings.instagram!.username})`);
    return settings;
  }

  /**
   * Get Instagram credentials for a user
   * Used by InstagramService to load user-specific credentials
   */
  async getInstagramCredentials(userId: string): Promise<{
    accessToken: string | null;
    pageAccessToken: string | null;
    pageId: string | null;
    igUserId: string | null;
    username: string | null;
    isConfigured: boolean;
    autoReplyDM: boolean;
    welcomeMessage: string;
    keywordReplies: Map<string, string>;
    conversionKeywords: string[];
  }> {
    const settings = await this.getSettings(userId);

    return {
      accessToken: settings.instagram?.accessToken || null,
      pageAccessToken: settings.instagram?.pageAccessToken || null,
      pageId: settings.instagram?.pageId || null,
      igUserId: settings.instagram?.igUserId || null,
      username: settings.instagram?.username || null,
      isConfigured: settings.instagram?.isConfigured || false,
      autoReplyDM: settings.instagram?.autoReplyDM ?? true,
      welcomeMessage: settings.instagram?.welcomeMessage || '',
      keywordReplies: settings.instagram?.keywordReplies || new Map(),
      conversionKeywords: settings.instagram?.conversionKeywords || [],
    };
  }

  /**
   * Store OAuth state for CSRF protection
   * Used during Instagram OAuth flow
   */
  async storeInstagramOAuthState(
    userId: string,
    state: string,
    redirectUri: string
  ): Promise<void> {
    const settings = await this.getSettings(userId);
    if (!settings.instagram) settings.instagram = { isConfigured: false };

    // Store temporarily in instagram settings (will be cleared after OAuth)
    (settings.instagram as any)._oauthState = state;
    (settings.instagram as any)._oauthRedirectUri = redirectUri;

    await settings.save();
    logger.debug(`Instagram OAuth state stored for user: ${userId}`);
  }

  /**
   * Verify and retrieve OAuth state
   */
  async verifyInstagramOAuthState(
    userId: string,
    state: string
  ): Promise<{ valid: boolean; redirectUri: string | null }> {
    const settings = await this.getSettings(userId);
    if (!settings.instagram) return { valid: false, redirectUri: null };

    const savedState = (settings.instagram as any)?._oauthState;
    const redirectUri = (settings.instagram as any)?._oauthRedirectUri;

    if (savedState && savedState === state) {
      // Clear state after verification
      delete (settings.instagram as any)._oauthState;
      delete (settings.instagram as any)._oauthRedirectUri;
      await settings.save();

      return { valid: true, redirectUri };
    }

    return { valid: false, redirectUri: null };
  }
}

// Singleton instance
let userSettingsService: UserSettingsService | null = null;

export function getUserSettingsService(): UserSettingsService {
  if (!userSettingsService) {
    userSettingsService = new UserSettingsService();
  }
  return userSettingsService;
}
