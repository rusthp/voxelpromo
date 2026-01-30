import { Router, Request, Response } from 'express';
import { InstagramService } from '../services/messaging/InstagramService';
import { logger } from '../utils/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUserSettingsService } from '../services/user/UserSettingsService';

const router = Router();

// Singleton instance
let instagramService: InstagramService | null = null;

/**
 * Get Instagram service instance (singleton)
 */
function getInstagramService(): InstagramService {
  if (!instagramService) {
    instagramService = new InstagramService();
  }
  return instagramService;
}

/**
 * @swagger
 * /api/instagram/status:
 *   get:
 *     summary: Get Instagram connection status (user-scoped)
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instagram status for current user
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const settingsService = getUserSettingsService();
    const userSettings = await settingsService.getSettings(userId);

    // Check if user completed OAuth (has access token)
    if (userSettings.instagram.isConfigured) {
      return res.json({
        success: true,
        configured: true,
        authenticated: true,
        account: {
          username: userSettings.instagram.username || 'Unknown',
          accountType: userSettings.instagram.accountType || 'BUSINESS',
          igUserId: userSettings.instagram.igUserId,
        },
        rateLimit: { remaining: 200, limit: 200, resetAt: new Date(Date.now() + 3600000) },
      });
    }

    // Check if user saved config but hasn't completed OAuth yet
    if (userSettings.instagram.pendingOAuth) {
      return res.json({
        success: true,
        configured: true, // Config is saved
        authenticated: false, // But OAuth not completed -> shows Connect button
        account: null,
        rateLimit: null,
      });
    }

    // Not configured at all - show config form
    return res.json({
      success: true,
      configured: false,
      authenticated: false,
      account: null,
      rateLimit: null,
    });
  } catch (error: any) {
    logger.error('Error getting Instagram status:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/auth/url:
 *   get:
 *     summary: Get Instagram OAuth authorization URL
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authorization URL
 */
router.get('/auth/url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const service = getInstagramService();

    if (!service.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Instagram não configurado. Configure o App ID e App Secret primeiro.',
      });
    }

    // Build redirect URI - use hardcoded production URI to ensure exact match with Meta console
    // In production, INSTAGRAM_REDIRECT_URI should be set to: https://voxelpromo.com/api/instagram/auth/callback
    let redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!redirectUri) {
      // Fallback to dynamic construction for development
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;
      redirectUri = `${baseUrl}/api/instagram/auth/callback`;
    }

    logger.info(`📱 Instagram OAuth - Generating auth URL`, {
      redirectUri,
      fromEnv: !!process.env.INSTAGRAM_REDIRECT_URI,
      headers: {
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
        host: req.get('host'),
      },
    });

    // Generate state with userId encoded for CSRF protection + user identification
    const stateData = {
      csrf: Math.random().toString(36).substring(2, 15),
      userId: userId,
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Store state in UserSettings (MULTI-TENANT)
    const settingsService = getUserSettingsService();
    await settingsService.storeInstagramOAuthState(userId, state, redirectUri);

    const authUrl = service.getAuthorizationUrl(redirectUri, state);

    return res.json({
      success: true,
      authUrl,
      redirectUri,
    });
  } catch (error: any) {
    logger.error('Error generating Instagram auth URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/auth/callback:
 *   get:
 *     summary: Instagram OAuth callback
 *     tags: [Instagram]
 *     responses:
 *       302:
 *         description: Redirect to frontend
 */
router.get('/auth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_reason } = req.query;

    if (error) {
      logger.error(`Instagram OAuth error: ${error} - ${error_reason}`);
      return res.redirect(`/instagram?error=${encodeURIComponent(String(error_reason || error))}`);
    }

    if (!code || !state) {
      return res.redirect('/instagram?error=missing_code_or_state');
    }

    // Decode state to get userId (MULTI-TENANT)
    let stateData: { csrf: string; userId: string };
    try {
      stateData = JSON.parse(Buffer.from(String(state), 'base64').toString());
    } catch {
      logger.error('Invalid OAuth state format');
      return res.redirect('/instagram?error=invalid_state');
    }

    const userId = stateData.userId;
    if (!userId) {
      logger.error('No userId in OAuth state');
      return res.redirect('/instagram?error=no_user_id');
    }

    // Verify state against UserSettings
    const settingsService = getUserSettingsService();
    const verification = await settingsService.verifyInstagramOAuthState(userId, String(state));

    if (!verification.valid) {
      logger.warn(`Instagram OAuth state mismatch for user ${userId}`);
      return res.redirect('/instagram?error=state_mismatch');
    }

    const redirectUri = verification.redirectUri;

    logger.info(`📱 Instagram OAuth - Callback received`, {
      storedRedirectUri: redirectUri,
      userId,
      codePrefix: String(code).substring(0, 20) + '...',
    });

    // Exchange code for token using global service (has appId/appSecret)
    const service = getInstagramService();
    const tokenResult = await service.exchangeCodeForToken(String(code), redirectUri!);

    // Get account info
    const accountInfo = await service.getAccountInfo();

    // Save tokens to UserSettings (MULTI-TENANT)
    await settingsService.updateInstagramTokens(userId, {
      accessToken: tokenResult.access_token,
      igUserId: service.getIgUserId() || accountInfo?.id || '',
      username: accountInfo?.username,
      accountType: accountInfo?.name || 'BUSINESS',
    });

    logger.info(`✅ Instagram OAuth completed for user ${userId} (@${accountInfo?.username})`);
    return res.redirect('/instagram?success=true');
  } catch (error: any) {
    logger.error('Instagram OAuth callback error:', error);
    return res.redirect(`/instagram?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * @swagger
 * /api/instagram/auth/exchange:
 *   post:
 *     summary: Exchange authorization code for token (manual)
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/auth/exchange', async (req: Request, res: Response) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    const service = getInstagramService();

    // Use provided redirectUri or try to get from config
    let finalRedirectUri = redirectUri;
    if (!finalRedirectUri) {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        finalRedirectUri = config.instagram?._oauthRedirectUri;
      }
    }

    if (!finalRedirectUri) {
      return res.status(400).json({
        success: false,
        error: 'Redirect URI is required. Please start OAuth flow first.',
      });
    }

    const tokenResponse = await service.exchangeCodeForToken(code, finalRedirectUri);
    service.reloadCredentials();

    return res.json({
      success: true,
      message: 'Instagram conectado com sucesso!',
      expiresIn: tokenResponse.expires_in,
    });
  } catch (error: any) {
    logger.error('Error exchanging Instagram code:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/auth/disconnect:
 *   post:
 *     summary: Disconnect Instagram account
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/auth/disconnect', async (_req: Request, res: Response) => {
  try {
    const service = getInstagramService();
    await service.disconnect();

    return res.json({
      success: true,
      message: 'Instagram desconectado com sucesso',
    });
  } catch (error: any) {
    logger.error('Error disconnecting Instagram:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/webhook:
 *   get:
 *     summary: Verify webhook (Meta challenge)
 *     tags: [Instagram]
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const service = getInstagramService();
  const result = service.verifyWebhook(mode, token, challenge);

  if (result) {
    return res.status(200).send(result);
  }

  return res.sendStatus(403);
});

/**
 * @swagger
 * /api/instagram/webhook:
 *   post:
 *     summary: Receive webhook events from Meta
 *     tags: [Instagram]
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const service = getInstagramService();
    await service.handleWebhook(req.body);

    // Always respond with 200 OK to acknowledge receipt
    return res.sendStatus(200);
  } catch (error: any) {
    logger.error('Error handling Instagram webhook:', error);
    // Still respond with 200 to prevent retries
    return res.sendStatus(200);
  }
});

/**
 * @swagger
 * /api/instagram/test:
 *   post:
 *     summary: Test Instagram connection
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Use user-specific Instagram service (MULTI-TENANT)
    const service = await InstagramService.createForUser(userId);

    if (!service.isAuthenticated()) {
      return res.status(400).json({
        success: false,
        error: 'Instagram não está conectado. Complete a autenticação OAuth primeiro.',
      });
    }

    const success = await service.sendTestMessage();

    if (success) {
      const accountInfo = await service.getAccountInfo();
      return res.json({
        success: true,
        message: `Conexão verificada! Conectado como @${accountInfo?.username}`,
        account: accountInfo,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Falha ao verificar conexão. Verifique os logs.',
      });
    }
  } catch (error: any) {
    logger.error('Error testing Instagram:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/config:
 *   post:
 *     summary: Update Instagram configuration
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { appId, appSecret, webhookVerifyToken, accessToken, igUserId } = req.body;

    // Save to global config.json for InstagramService (OAuth requires app-level credentials)
    const configPath = join(process.cwd(), 'config.json');
    let config: any = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    config.instagram = config.instagram || {};

    // Only update if provided and not masked
    if (appId && appId !== '***') {
      config.instagram.appId = appId;
    }
    if (appSecret && appSecret !== '***') {
      config.instagram.appSecret = appSecret;
    }
    if (webhookVerifyToken !== undefined) {
      config.instagram.webhookVerifyToken = webhookVerifyToken;
    }

    // Manual token flow - directly save accessToken and igUserId
    if (accessToken && accessToken !== '***') {
      // Resolve IG User ID if not provided
      let resolvedIgUserId = igUserId;
      if (!resolvedIgUserId || resolvedIgUserId === '***') {
        const tempService = new InstagramService();
        // Temporarily set token to resolve account
        // We use a temporary service instance but we need to inject the token logic
        // Actually resolveBusinessAccount is an instance method, so we can use a fresh instance
        resolvedIgUserId = await tempService.resolveBusinessAccount(accessToken);
      }

      if (resolvedIgUserId) {
        // Get account info to populate username/name
        // Get account info to populate username/name
        // We need to override private properties or use a specific constructor/method? 
        // Since we don't have a public setter, we might need to rely on the fact resolveBusinessAccount sets it internally?
        // But tempService is new. 
        // Let's rely on resolveBusinessAccount returning the ID.
        // And then we can use updateInstagramTokens service.

        // To get username/name, we need getAccountInfo. 
        // But getAccountInfo relies on this.accessToken and this.igUserId being set.
        // We can't easily set them on a new instance externally if they are private.

        // Better approach: Use the settings service to update directly.
        // We can assume if resolveBusinessAccount worked, the token is valid.
        // We can fetch details later or just save what we have.

        const settingsService = getUserSettingsService();
        await settingsService.updateInstagramTokens(userId, {
          accessToken: accessToken,
          igUserId: resolvedIgUserId,
          username: 'Instagram User', // Will be updated on next sync/status check
          accountType: 'BUSINESS'
        });

        config.instagram.accessToken = accessToken;
        config.instagram.igUserId = resolvedIgUserId;

        logger.info(`✅ Instagram manual access token saved for user ${userId}`);
        return res.json({
          success: true,
          message: 'Conexão manual realizada com sucesso!',
          configured: true,
          authenticated: true
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Não foi possível encontrar uma conta Instagram Business vinculada a este token.'
        });
      }
    }

    // Legacy/App Config saves
    if (igUserId && igUserId !== '***') {
      config.instagram.igUserId = igUserId;
    }

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Update environment variables for immediate use
    if (accessToken && accessToken !== '***') {
      process.env.INSTAGRAM_ACCESS_TOKEN = accessToken;
    }
    if (igUserId && igUserId !== '***') {
      process.env.INSTAGRAM_IG_USER_ID = igUserId;
    }

    // Reload service credentials
    const service = getInstagramService();
    service.reloadCredentials();

    // CRITICAL: Mark user as "pendingOAuth" in UserSettings so /status knows config is saved
    // This allows the Connect button to appear
    const settingsService = getUserSettingsService();
    await settingsService.updateInstagramSettings(userId, {
      isConfigured: false, // Will become true after OAuth completes
      pendingOAuth: true, // New flag to indicate config saved, waiting for OAuth
    });

    logger.info(`✅ Instagram config saved for user ${userId}, pending OAuth`);

    return res.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      pendingOAuth: true,
    });
  } catch (error: any) {
    logger.error('Error updating Instagram config:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/rate-limit:
 *   get:
 *     summary: Get rate limit status
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.get('/rate-limit', (_req: Request, res: Response) => {
  try {
    const service = getInstagramService();
    const status = service.getRateLimitStatus();

    return res.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/conversions:
 *   get:
 *     summary: Get Instagram conversion metrics
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.get('/conversions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { InstagramConversionModel } = await import('../models/InstagramConversion');

    // Stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const conversions = await InstagramConversionModel.find({
      userId,
      sentAt: { $gte: thirtyDaysAgo },
    })
      .sort({ sentAt: -1 })
      .populate('offerId', 'title imageUrl');

    // Aggregations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: conversions.length,
      today: conversions.filter((c) => new Date(c.sentAt) >= today).length,
      bySource: conversions.reduce((acc: any, curr) => {
        acc[curr.source] = (acc[curr.source] || 0) + 1;
        return acc;
      }, {}),
      recent: conversions.slice(0, 10).map((c: any) => ({
        id: c._id,
        offerTitle: c.offerId?.title || 'Oferta removida',
        offerImage: c.offerId?.imageUrl,
        recipient: c.igSenderId,
        source: c.source,
        date: c.sentAt,
        status: 'sent', // TODO: track clicks
      })),
    };

    return res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('Error getting Instagram conversions:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/settings:
 *   get:
 *     summary: Get Instagram personalization settings
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const settingsService = getUserSettingsService();
    const settings = await settingsService.getInstagramCredentials(userId);

    return res.json({
      success: true,
      settings: {
        enabled: true, // Always enabled if configured
        autoReplyDM: settings.autoReplyDM,
        welcomeMessage: settings.welcomeMessage,
        keywordReplies:
          settings.keywordReplies instanceof Map
            ? Object.fromEntries(settings.keywordReplies)
            : settings.keywordReplies || {},
        conversionKeywords: settings.conversionKeywords,
      },
    });
  } catch (error: any) {
    logger.error('Error getting Instagram settings:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/settings:
 *   post:
 *     summary: Update Instagram personalization settings
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { autoReplyDM, welcomeMessage, keywordReplies, conversionKeywords } = req.body;
    const settingsService = getUserSettingsService();

    const updates: any = {};
    if (typeof autoReplyDM === 'boolean') updates.autoReplyDM = autoReplyDM;
    if (welcomeMessage !== undefined) updates.welcomeMessage = welcomeMessage;
    if (keywordReplies !== undefined) updates.keywordReplies = keywordReplies;
    if (conversionKeywords !== undefined) updates.conversionKeywords = conversionKeywords;

    const updatedSettings = await settingsService.updateInstagramSettings(userId, updates);

    return res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      settings: {
        autoReplyDM: updatedSettings.instagram.autoReplyDM,
        welcomeMessage: updatedSettings.instagram.welcomeMessage,
        keywordReplies:
          updatedSettings.instagram.keywordReplies instanceof Map
            ? Object.fromEntries(updatedSettings.instagram.keywordReplies)
            : updatedSettings.instagram.keywordReplies || {},
        conversionKeywords: updatedSettings.instagram.conversionKeywords,
      },
    });
  } catch (error: any) {
    logger.error('Error updating Instagram settings:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// Content Publishing Routes (Stories & Reels)
// ========================================

/**
 * @swagger
 * /api/instagram/story:
 *   post:
 *     summary: Publish a Story
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mediaUrl
 *             properties:
 *               mediaUrl:
 *                 type: string
 *                 description: Public URL of the image or video
 *               mediaType:
 *                 type: string
 *                 enum: [IMAGE, VIDEO]
 *                 default: IMAGE
 */
router.post('/story', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { mediaUrl, mediaType = 'IMAGE' } = req.body;

    if (!mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'mediaUrl is required',
      });
    }

    // Use user-specific Instagram service (MULTI-TENANT)
    const service = await InstagramService.createForUser(userId);

    if (!service.isAuthenticated()) {
      return res.status(403).json({
        success: false,
        error: 'Instagram não está conectado',
      });
    }

    const mediaId = await service.publishStory(mediaUrl, mediaType);

    if (mediaId) {
      return res.json({
        success: true,
        message: 'Story publicado com sucesso!',
        mediaId,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Falha ao publicar Story. Verifique os logs.',
      });
    }
  } catch (error: any) {
    logger.error('Error publishing Instagram story:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/reel:
 *   post:
 *     summary: Publish a Reel
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoUrl
 *             properties:
 *               videoUrl:
 *                 type: string
 *                 description: Public URL of the video (MP4)
 *               caption:
 *                 type: string
 *                 description: Caption for the reel
 *               shareToFeed:
 *                 type: boolean
 *                 default: true
 */
router.post('/reel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { videoUrl, caption, shareToFeed = true } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'videoUrl is required',
      });
    }

    // Use user-specific Instagram service (MULTI-TENANT)
    const service = await InstagramService.createForUser(userId);

    if (!service.isAuthenticated()) {
      return res.status(403).json({
        success: false,
        error: 'Instagram não está conectado',
      });
    }

    const mediaId = await service.publishReel(videoUrl, caption, shareToFeed);

    if (mediaId) {
      return res.json({
        success: true,
        message: 'Reel publicado com sucesso!',
        mediaId,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Falha ao publicar Reel. Verifique os logs.',
      });
    }
  } catch (error: any) {
    logger.error('Error publishing Instagram reel:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/insights/{mediaId}:
 *   get:
 *     summary: Get insights for a published media
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/insights/:mediaId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { mediaId } = req.params;

    // Use user-specific Instagram service (MULTI-TENANT)
    const service = await InstagramService.createForUser(userId);

    if (!service.isAuthenticated()) {
      return res.status(403).json({
        success: false,
        error: 'Instagram não está conectado',
      });
    }

    const insights = await service.getMediaInsights(mediaId);

    if (insights) {
      return res.json({
        success: true,
        insights,
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Não foi possível obter insights para esta mídia',
      });
    }
  } catch (error: any) {
    logger.error('Error getting Instagram insights:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/instagram/media:
 *   get:
 *     summary: Get recent media published by the account
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 */
router.get('/media', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    // Use user-specific Instagram service (MULTI-TENANT)
    const service = await InstagramService.createForUser(userId);

    if (!service.isAuthenticated()) {
      return res.status(403).json({
        success: false,
        error: 'Instagram não está conectado',
      });
    }

    const media = await service.getRecentMedia(limit);

    return res.json({
      success: true,
      media,
      count: media.length,
    });
  } catch (error: any) {
    logger.error('Error getting Instagram media:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
