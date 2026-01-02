import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { MercadoLivreService } from '../services/mercadolivre/MercadoLivreService';
import { logger } from '../utils/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

const router = Router();
const mercadoLivreService = new MercadoLivreService();

// Helper to get Mercado Livre credentials
const getMercadoLivreConfig = () => {
  const configPath = join(process.cwd(), 'config.json');
  if (!existsSync(configPath)) {
    throw new Error('Config file not found');
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));

  if (!config.mercadolivre) {
    throw new Error('Mercado Livre config not found');
  }

  return {
    clientId: config.mercadolivre.clientId,
    clientSecret: config.mercadolivre.clientSecret,
    accessToken: config.mercadolivre.accessToken,
    refreshToken: config.mercadolivre.refreshToken,
    tokenExpiresAt: config.mercadolivre.tokenExpiresAt,
  };
};

/**
 * GET /api/mercadolivre/status
 * Diagnostic route to test token and check user status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const config = getMercadoLivreConfig();

    if (!config.accessToken) {
      return res.json({
        success: false,
        error: 'No access token configured',
        configured: false,
      });
    }

    // Test token by calling /users/me
    try {
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
          canRead: true, // If we got here, read permission works
          canWrite: userData.status === 'active', // Only active users can write
        },
      });
    } catch (apiError: any) {
      // Token is configured but API call failed
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
          other: status && status !== 403 && status !== 401 ? `Erro ${status}: ${errorData?.message} ` : null,
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
router.get('/auth/url', (req, res) => {
  try {
    const state = (req.query.state as string) || crypto.randomBytes(16).toString('hex');
    const { url: authUrl, codeVerifier } = mercadoLivreService.getAuthorizationUrl(state);

    // Save codeVerifier to config.json for later use in exchange
    const configPath = join(process.cwd(), 'config.json');
    let config: any = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.mercadolivre) {
      config.mercadolivre = {};
    }

    config.mercadolivre.codeVerifier = codeVerifier;
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

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
router.post('/auth/exchange', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    // Exchange code for token
    const tokens = await mercadoLivreService.exchangeCodeForToken(code);

    // Save tokens to config.json
    const configPath = join(process.cwd(), 'config.json');
    let config: any = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.mercadolivre) {
      config.mercadolivre = {};
    }

    config.mercadolivre.accessToken = tokens.access_token;
    config.mercadolivre.refreshToken = tokens.refresh_token;
    config.mercadolivre.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    logger.info('✅ Mercado Livre tokens saved to config.json');

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

    // Handle specific OAuth errors
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      const errorType = errorData?.error || '';
      const errorDescription = errorData?.error_description || '';

      // OAuth specific errors
      if (errorType === 'invalid_grant' || errorDescription.includes('invalid_grant')) {
        return res.status(400).json({
          success: false,
          error: 'Código OAuth expirado ou já usado. Os códigos expiram em 10 minutos.',
          details: {
            error: 'invalid_grant',
            error_description: errorDescription,
          },
        });
      }

      if (errorType === 'invalid_client' || errorDescription.includes('invalid_client')) {
        return res.status(400).json({
          success: false,
          error: 'Client ID ou Client Secret inválidos. Verifique as credenciais.',
          details: errorData,
        });
      }

      return res.status(400).json({
        success: false,
        error: errorDescription || error.message || 'Erro ao trocar código por token',
        details: errorData,
      });
    }

    // Handle missing credentials
    if (error.message?.includes('Client ID or Client Secret not configured')) {
      return res.status(400).json({
        success: false,
        error: 'Client Secret não configurado. Por favor, salve o Client Secret primeiro.',
        details: { error: 'missing_credentials' },
      });
    }

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
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

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

    // Exchange code for token
    const tokens = await mercadoLivreService.exchangeCodeForToken(code as string);

    // Save tokens to config.json
    const configPath = join(process.cwd(), 'config.json');
    let config: any = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.mercadolivre) {
      config.mercadolivre = {};
    }

    config.mercadolivre.accessToken = tokens.access_token;
    config.mercadolivre.refreshToken = tokens.refresh_token;
    config.mercadolivre.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    logger.info('✅ Mercado Livre tokens saved to config.json');

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
router.post('/auth/refresh', async (_req, res) => {
  try {
    const tokens = await mercadoLivreService.refreshAccessToken();

    // Save tokens to config.json
    const configPath = join(process.cwd(), 'config.json');
    let config: any = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.mercadolivre) {
      config.mercadolivre = {};
    }

    config.mercadolivre.accessToken = tokens.access_token;
    config.mercadolivre.refreshToken = tokens.refresh_token;
    config.mercadolivre.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    logger.info('✅ Mercado Livre tokens refreshed and saved');

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
router.get('/auth/status', async (_req, res) => {
  try {
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
 * Useful for specific offers pages like /ofertas?container_id=MLB779362-1
 */
router.post('/scrape-url', async (req, res) => {
  try {
    const { url, saveToDatabase = true } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    // Validate it's a Mercado Livre URL
    if (!url.includes('mercadolivre.com.br') && !url.includes('mercadolibre.com')) {
      return res.status(400).json({
        success: false,
        error: 'URL must be from Mercado Livre',
      });
    }

    logger.info(`🕷️ Starting custom URL scrape: ${url}`);

    // Use the scraper to get products
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MercadoLivreScraper } = require('../services/mercadolivre/MercadoLivreScraper');
    const scraper = new MercadoLivreScraper();

    try {
      const products = await scraper.scrapeSearchResults(url);

      logger.info(`✅ Scraped ${products.length} products from custom URL`);

      if (products.length === 0) {
        return res.json({
          success: true,
          message: 'No products found on this page',
          products: [],
          saved: 0,
        });
      }

      let savedCount = 0;

      if (saveToDatabase) {
        // Convert and save to database
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { OfferService } = require('../services/offer/OfferService');
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

        const validOffers = offers.filter((o: any) => o !== null);
        savedCount = await offerService.saveOffers(validOffers);
        logger.info(`💾 Saved ${savedCount} offers to database`);
      }

      return res.json({
        success: true,
        message: `Scraped ${products.length} products`,
        products: products.slice(0, 10), // Return first 10 for preview
        totalFound: products.length,
        saved: savedCount,
      });
    } finally {
      await scraper.closeSession();
    }
  } catch (error: any) {
    logger.error('Error scraping custom URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/mercadolivre/collect-daily-offers
 * Collect offers from the default ML offers page (one-click collection)
 * Uses: https://www.mercadolivre.com.br/ofertas#nav-header
 */
router.get('/collect-daily-offers', async (_req, res) => {
  try {
    const DEFAULT_OFFERS_URL = 'https://www.mercadolivre.com.br/ofertas#nav-header';

    logger.info(`🔥 Collecting daily offers from default page: ${DEFAULT_OFFERS_URL}`);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MercadoLivreScraper } = require('../services/mercadolivre/MercadoLivreScraper');
    const scraper = new MercadoLivreScraper();

    try {
      const products = await scraper.scrapeDailyDeals();

      logger.info(`✅ Collected ${products.length} offers from daily deals page`);

      if (products.length === 0) {
        return res.json({
          success: true,
          message: 'No offers found on the page',
          products: [],
          saved: 0,
        });
      }

      // Convert and save to database
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OfferService } = require('../services/offer/OfferService');
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

      const validOffers = offers.filter((o: any) => o !== null);
      const savedCount = await offerService.saveOffers(validOffers);

      logger.info(`💾 Saved ${savedCount} offers to database`);

      return res.json({
        success: true,
        message: `Collected ${products.length} offers, saved ${savedCount} to database`,
        url: DEFAULT_OFFERS_URL,
        products: products.slice(0, 5), // Preview first 5
        totalFound: products.length,
        saved: savedCount,
      });
    } finally {
      await scraper.closeSession();
    }
  } catch (error: any) {
    logger.error('Error collecting daily offers:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/mercadolivre/generate-affiliate-link
 * Generate affiliate link for a single product URL
 * Body: { url: string }
 * Returns: { success: boolean, originalUrl: string, affiliateUrl: string }
 */
router.post('/generate-affiliate-link', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    // Validate it's a Mercado Livre URL
    if (!url.includes('mercadolivre.com.br') && !url.includes('mercadolibre.com')) {
      return res.status(400).json({
        success: false,
        error: 'URL must be from Mercado Livre',
      });
    }

    logger.info(`🔗 Generating affiliate link for: ${url.substring(0, 60)}...`);

    // Try internal API first (generates short links like mercadolivre.com/sec/...)
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

    // Fallback: Build affiliate link using Social Link params
    // This requires affiliateCode to be configured
    const config = mercadoLivreService.getConfig();

    if (!config.affiliateCode) {
      return res.status(400).json({
        success: false,
        error: 'Affiliate code not configured. Please set your Social Link in settings.',
        help: 'Go to Settings > Affiliate > Mercado Livre and paste your Social Link URL',
      });
    }

    // Use the service's internal method via a workaround
    // Create a fake product to get the affiliate link
    const fakeProduct = {
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

    return res.status(500).json({
      success: false,
      error: 'Failed to generate affiliate link',
    });

  } catch (error: any) {
    logger.error('Error generating affiliate link:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as mercadoLivreRoutes };

