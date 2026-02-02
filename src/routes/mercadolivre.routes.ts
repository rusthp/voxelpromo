import { Router, Response } from 'express';
import crypto from 'crypto';
import { MercadoLivreService, MercadoLivreProduct } from '../services/mercadolivre/MercadoLivreService';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUserSettingsService } from '../services/user/UserSettingsService';

const router = Router();

// Helper to get ML service for a specific user
const getServiceForUser = async (userId: string): Promise<MercadoLivreService> => {
  const userSettingsService = getUserSettingsService();
  const settings = await userSettingsService.getSettings(userId);

  if (!settings || !settings.mercadolivre) {
    throw new Error('Mercado Livre settings not found for user');
  }

  // Inject user specific config
  return new MercadoLivreService({
    clientId: settings.mercadolivre.clientId || '',
    clientSecret: settings.mercadolivre.clientSecret || '',
    redirectUri: settings.mercadolivre.redirectUri || process.env.MERCADOLIVRE_REDIRECT_URI || 'https://proplaynews.com.br/',
    accessToken: settings.mercadolivre.accessToken,
    refreshToken: settings.mercadolivre.refreshToken,
    tokenExpiresAt: settings.mercadolivre.tokenExpiresAt ? new Date(settings.mercadolivre.tokenExpiresAt).getTime() : undefined,
    affiliateCode: settings.mercadolivre.affiliateCode,
    codeVerifier: settings.mercadolivre.codeVerifier,
    sessionCookies: settings.mercadolivre.sessionCookies,
    csrfToken: settings.mercadolivre.csrfToken,
    affiliateTag: settings.mercadolivre.affiliateTag
  });
};

/**
 * GET /api/mercadolivre/status
 * Diagnostic route to test token and check user status
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userSettingsService = getUserSettingsService();
    const settings = await userSettingsService.getSettings(userId);

    const mlSettings = settings?.mercadolivre;

    if (!mlSettings?.accessToken) {
      return res.json({
        success: false,
        error: 'No access token configured',
        configured: !!(mlSettings?.clientId && mlSettings?.clientSecret),
      });
    }

    // Isolate service for this user
    const mercadoLivreService = await getServiceForUser(userId);
    const config = mercadoLivreService.getConfig();

    // Test token by calling /users/me via the service (or direct axios if preferred, but service is cleaner if it had a getUser method)
    // We'll keep the direct axios call here for diagnostic clarity, but use the USER'S access token
    try {
      const { default: axios } = await import('axios');
      const userResponse = await axios.get('https://api.mercadolibre.com/users/me', {
        headers: {
          Authorization: `Bearer ${config.accessToken} `,
        },
      });

      const userData = userResponse.data;

      // Check token expiry
      const now = Date.now();
      const expiresAt = config.tokenExpiresAt || now;
      const isExpired = now >= expiresAt;
      const expiresInMinutes = Math.round((expiresAt - now) / 1000 / 60);

      return res.json({
        success: true,
        configured: true,
        token: {
          valid: true,
          expired: isExpired,
          expiresInMinutes: isExpired ? 0 : expiresInMinutes,
          expiresAt: new Date(expiresAt).toISOString(),
        },
        user: {
          id: userData.id,
          nickname: userData.nickname,
          email: userData.email,
          status: userData.status,
          siteId: userData.site_id,
          userType: userData.user_type,
        },
        permissions: {
          canRead: true,
          canWrite: userData.status === 'active',
        },
      });
    } catch (apiError: any) {
      const status = apiError.response?.status;
      const errorData = apiError.response?.data;

      return res.json({
        success: false,
        configured: true,
        token: {
          valid: false,
          error: errorData?.message || apiError.message,
          statusCode: status,
        },
        diagnosis: {
          403: status === 403 ? 'Token sem permissão (verificar scopes ou usuário inativo)' : null,
          401: status === 401 ? 'Token inválido ou expirado (renovar autenticação)' : null,
          other: `Erro ${status}: ${errorData?.message} `
        },
      });
    }
  } catch (error: any) {
    logger.error('Error in /status:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/mercadolivre/auth/url
 * Get authorization URL for OAuth flow
 */
router.get('/auth/url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const mercadoLivreService = await getServiceForUser(userId);

    // Check if client ID is configured
    const config = mercadoLivreService.getConfig();
    if (!config.clientId || !config.redirectUri) {
      return res.status(400).json({
        success: false,
        error: 'Client ID and Redirect URI must be configured in settings first.'
      });
    }

    const state = (req.query.state as string) || crypto.randomBytes(16).toString('hex');
    // Encode userId in state to verify later if needed, though we rely on auth middleware
    const { url: authUrl, codeVerifier } = mercadoLivreService.getAuthorizationUrl(state);

    // Save codeVerifier to UserSettings (DB)
    const userSettingsService = getUserSettingsService();
    const currentSettings = await userSettingsService.getSettings(userId);

    await userSettingsService.updateSettings(userId, {
      mercadolivre: {
        ...currentSettings?.mercadolivre,
        codeVerifier: codeVerifier,
        isConfigured: !!currentSettings?.mercadolivre?.isConfigured // Preserve or update based on logic
      }
    });

    return res.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error: any) {
    logger.error('Error generating auth URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/mercadolivre/auth/exchange
 * Exchange authorization code for access token (manual)
 */
router.post('/auth/exchange', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user!.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    const mercadoLivreService = await getServiceForUser(userId);

    // Exchange code for token
    // Service will use the codeVerifier injected from UserSettings in getServiceForUser
    const tokens = await mercadoLivreService.exchangeCodeForToken(code);

    // Save tokens to UserSettings
    const userSettingsService = getUserSettingsService();
    const currentSettings = await userSettingsService.getSettings(userId);

    await userSettingsService.updateSettings(userId, {
      mercadolivre: {
        ...currentSettings?.mercadolivre,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isConfigured: true
      }
    });

    logger.info(`✅ Mercado Livre tokens saved for user ${userId}`);

    return res.json({
      success: true,
      message: 'Authorization successful! Tokens saved.',
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        userId: tokens.user_id,
        scope: tokens.scope,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error exchanging code for token:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to exchange code for token',
      details: error.response?.data,
    });
  }
});

/**
 * GET /api/mercadolivre/auth/callback
 * Handle OAuth callback and exchange code for token
 */
router.get('/auth/callback', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code, error } = req.query;
    const userId = req.user!.id;

    if (error) {
      logger.error('OAuth error:', error);
      return res.status(400).json({
        success: false,
        error: `OAuth error: ${error} `,
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code not provided',
      });
    }

    const mercadoLivreService = await getServiceForUser(userId);

    // Exchange code for token
    const tokens = await mercadoLivreService.exchangeCodeForToken(code as string);

    // Save tokens to UserSettings
    const userSettingsService = getUserSettingsService();
    const currentSettings = await userSettingsService.getSettings(userId);

    await userSettingsService.updateSettings(userId, {
      mercadolivre: {
        ...currentSettings?.mercadolivre,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isConfigured: true
      }
    });

    logger.info(`✅ Mercado Livre tokens saved for user ${userId}`);

    return res.json({
      success: true,
      message: 'Authorization successful! Tokens saved.',
      expiresIn: tokens.expires_in,
      userId: tokens.user_id,
    });
  } catch (error: any) {
    logger.error('Error in OAuth callback:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/mercadolivre/auth/refresh
 * Manually refresh access token
 */
router.post('/auth/refresh', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const mercadoLivreService = await getServiceForUser(userId);

    const tokens = await mercadoLivreService.refreshAccessToken();

    // Save tokens to UserSettings
    const userSettingsService = getUserSettingsService();
    const currentSettings = await userSettingsService.getSettings(userId);

    await userSettingsService.updateSettings(userId, {
      mercadolivre: {
        ...currentSettings?.mercadolivre,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      }
    });

    logger.info(`✅ Mercado Livre tokens refreshed for user ${userId}`);

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error refreshing token:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/mercadolivre/auth/status
 * Check authentication status
 */
router.get('/auth/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const mercadoLivreService = await getServiceForUser(userId);
    const config = mercadoLivreService.getConfig();

    const now = Date.now();
    const expiresAt = config.tokenExpiresAt || 0;
    const isExpired = expiresAt && now >= expiresAt;
    const expiresIn = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;

    return res.json({
      authenticated: !!config.accessToken,
      hasRefreshToken: !!config.refreshToken,
      isExpired,
      expiresIn,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
  } catch (error: any) {
    logger.error('Error checking auth status:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/mercadolivre/scrape-url
 * Scrape products from a custom Mercado Livre URL
 */
router.post('/scrape-url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { url, saveToDatabase = true } = req.body;
    const userId = req.user!.id;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    if (!url.includes('mercadolivre.com.br') && !url.includes('mercadolibre.com')) {
      return res.status(400).json({ success: false, error: 'URL must be from Mercado Livre' });
    }

    logger.info(`🕷️ Starting custom URL scrape: ${url}`);

    // Dynamic import to avoid circular dependency / load on demand
    const { MercadoLivreScraper } = await import('../services/mercadolivre/MercadoLivreScraper');
    const scraper = MercadoLivreScraper.getInstance();
    const products = await scraper.scrapeSearchResults(url);

    if (products.length === 0) {
      return res.json({ success: true, message: 'No products found', products: [], saved: 0 });
    }

    let savedCount = 0;
    if (saveToDatabase) {
      // We need the service instantiated for THIS user to get their affiliate code
      const mercadoLivreService = await getServiceForUser(userId);
      const { OfferService } = await import('../services/offer/OfferService');
      const offerService = new OfferService();

      const offers = await Promise.all(
        products.map(async (product: any) => {
          try {
            // Bind context to user-specific service
            return await mercadoLivreService.convertToOffer(product, 'ofertas');
          } catch (e) {
            return null;
          }
        })
      );

      const validOffers = offers.filter((o: any) => o !== null) as any[];
      // Cast to Offer[] for the service call
      const cleanOffers = validOffers as any as import('../types').Offer[];

      cleanOffers.forEach((offer) => {
        if (offer) offer.userId = userId;
      });

      savedCount = await offerService.saveOffers(cleanOffers, userId);
    }

    return res.json({
      success: true,
      message: `Scraped ${products.length} products`,
      products: products.slice(0, 10),
      totalFound: products.length,
      saved: savedCount,
    });
  } catch (error: any) {
    logger.error('Error scraping custom URL:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mercadolivre/collect-daily-offers
 */
router.get('/collect-daily-offers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const DEFAULT_OFFERS_URL = 'https://www.mercadolivre.com.br/ofertas#nav-header';

    const { MercadoLivreScraper } = await import('../services/mercadolivre/MercadoLivreScraper');
    const scraper = MercadoLivreScraper.getInstance();
    const products = await scraper.scrapeDailyDeals();

    if (products.length === 0) {
      return res.json({ success: true, message: 'No offers found', products: [], saved: 0 });
    }

    // Get user specific service for conversion
    const mercadoLivreService = await getServiceForUser(userId);
    const { OfferService } = await import('../services/offer/OfferService');
    const offerService = new OfferService();

    const offers = await Promise.all(
      products.map(async (product: any) => {
        try {
          return await mercadoLivreService.convertToOffer(product, 'ofertas');
        } catch (e) {
          return null;
        }
      })
    );

    const validOffers = offers.filter((o: any) => o !== null) as any[]; // Cast to any[] first to avoid detailed type checks here, or imply Offer[] if we had the type.
    // Better yet, knowing saveOffers expects Offer[], let's trust the runtime check
    const cleanOffers = validOffers as any as import('../types').Offer[];

    cleanOffers.forEach((offer) => {
      if (offer) offer.userId = userId;
    });

    const savedCount = await offerService.saveOffers(cleanOffers, userId);

    return res.json({
      success: true,
      message: `Collected ${products.length} offers`,
      url: DEFAULT_OFFERS_URL,
      products: products.slice(0, 5),
      totalFound: products.length,
      saved: savedCount,
    });
  } catch (error: any) {
    logger.error('Error collecting daily offers:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mercadolivre/generate-affiliate-link
 */
router.post('/generate-affiliate-link', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;
    const userId = req.user!.id;

    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

    // Use user specific service
    const mercadoLivreService = await getServiceForUser(userId);
    const internalLink = await mercadoLivreService.generateAffiliateLink(url);

    if (internalLink) {
      return res.json({
        success: true,
        originalUrl: url,
        affiliateUrl: internalLink,
        method: 'internal_api',
        isShortLink: true,
      });
    }

    // Fallback: Check if affiliate code is configured in user settings
    const config = mercadoLivreService.getConfig();
    if (!config.affiliateCode) {
      return res.status(400).json({
        success: false,
        error: 'Affiliate code not configured.',
      });
    }

    const fakeProduct: MercadoLivreProduct = {
      id: 'TEMP',
      title: 'Temp',
      price: 0,
      currency_id: 'BRL',
      available_quantity: 1,
      condition: 'new',
      permalink: url,
      thumbnail: '',
    };

    const offer = await mercadoLivreService.convertToOffer(fakeProduct, 'temp');

    if (offer && offer.affiliateUrl) {
      return res.json({
        success: true,
        originalUrl: url,
        affiliateUrl: offer.affiliateUrl,
        method: 'social_link_params',
        isShortLink: false,
      });
    }

    return res.status(500).json({ success: false, error: 'Failed to generate affiliate link' });
  } catch (error: any) {
    logger.error('Error generating affiliate link:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export { router as mercadoLivreRoutes };
