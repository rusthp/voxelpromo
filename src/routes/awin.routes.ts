import { Router, Response } from 'express';
import { AwinService } from '../services/awin/AwinService';
import { AwinFeedManager } from '../services/awin/AwinFeedManager';
import { OfferModel } from '../models/Offer';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/awin/test:
 *   get:
 *     summary: Test Awin API connection
 *     tags: [Awin]
 *     responses:
 *       200:
 *         description: Connection test result
 */
router.get('/test', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const awinService = await AwinService.createForUser(userId);
    const result = await awinService.testConnection();
    return res.json(result);
  } catch (error: any) {
    logger.error('Error testing Awin connection:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/awin/collect:
 *   post:
 *     summary: Manually trigger Awin offer collection (USER-SCOPED)
 *     tags: [Awin]
 *     responses:
 *       200:
 *         description: Collection result with count of offers
 */
router.post('/collect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const awinService = await AwinService.createForUser(userId);

    if (!awinService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Awin não está configurado. Configure em Configurações > Awin.',
      });
    }

    logger.info(`📡 Starting manual Awin collection for user: ${req.user!.username}...`);
    const offers = await awinService.getCoupons();

    if (offers.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma oferta encontrada na Awin',
        count: 0,
      });
    }

    // Save offers to database
    let savedCount = 0;
    let skippedCount = 0;

    for (const offer of offers) {
      try {
        const existing = await OfferModel.findOne({
          userId,
          productUrl: offer.productUrl,
        });
        if (existing) {
          skippedCount++;
          continue;
        }

        await OfferModel.create({ ...offer, userId });
        savedCount++;
      } catch (saveError: any) {
        if (saveError.code === 11000) {
          skippedCount++;
        } else {
          logger.warn(`Error saving Awin offer: ${saveError.message}`);
        }
      }
    }

    logger.info(
      `✅ Awin collection complete for ${req.user!.username}: ${savedCount} saved, ${skippedCount} skipped`
    );

    return res.json({
      success: true,
      message: `Coleta Awin concluída`,
      count: savedCount,
      skipped: skippedCount,
      total: offers.length,
    });
  } catch (error: any) {
    logger.error('Error collecting Awin offers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/awin/config:
 *   get:
 *     summary: Get Awin configuration (masked)
 *     tags: [Awin]
 *     responses:
 *       200:
 *         description: Awin configuration
 */
router.get('/config', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { getUserSettingsService } = await import('../services/user/UserSettingsService');
    const settingsService = getUserSettingsService();
    const settings = await settingsService.getSettings(userId);
    const awin = settings?.awin || { isConfigured: false };

    return res.json({
      enabled: awin.enabled ?? false,
      apiToken: awin.apiToken ? '***' : '',
      publisherId: awin.publisherId || '',
      dataFeedApiKey: awin.dataFeedApiKey ? '***' : '',
      feedId: awin.feedId || '',
      userLogin: awin.userLogin || '',
      hasPassword: !!awin.password,
      hasRecoveryCode: !!awin.recoveryCode,
      isConfigured: awin.isConfigured
    });
  } catch (error: any) {
    logger.error('Error reading Awin config:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/awin/config:
 *   post:
 *     summary: Save Awin configuration
 *     tags: [Awin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               apiToken:
 *                 type: string
 *               publisherId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuration saved
 */
router.post('/config', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      enabled,
      apiToken,
      publisherId,
      dataFeedApiKey,
      feedId,
      userLogin,
      password,
      recoveryCode
    } = req.body;

    const { getUserSettingsService } = await import('../services/user/UserSettingsService');
    const settingsService = getUserSettingsService();
    const currentSettings = await settingsService.getSettings(userId);
    const currentAwin = currentSettings?.awin || {} as any;

    const newSettings = {
      ...currentAwin,
      enabled: enabled ?? currentAwin.enabled ?? false,
      apiToken: apiToken && apiToken !== '***' ? apiToken : currentAwin.apiToken,
      publisherId: publisherId || currentAwin.publisherId,
      dataFeedApiKey: dataFeedApiKey && dataFeedApiKey !== '***' ? dataFeedApiKey : currentAwin.dataFeedApiKey,
      feedId: feedId || currentAwin.feedId,
      userLogin: userLogin || currentAwin.userLogin,
      password: password && password !== '***' ? password : currentAwin.password,
      recoveryCode: recoveryCode && recoveryCode !== '***' ? recoveryCode : currentAwin.recoveryCode,
    };

    // Determine isConfigured
    // Valid if we have minimal info: apiToken + publisherId OR login + (password or something)
    // Actually the standard API needs token+publisherId.
    // The feed logic needs feedId or dataFeedApiKey.
    const hasApi = !!(newSettings.apiToken && newSettings.publisherId);
    newSettings.isConfigured = hasApi; // or other condition

    await settingsService.updateSettings(userId, { awin: newSettings });

    logger.info(`✅ Awin config saved for user ${userId}`);

    return res.json({ success: true, message: 'Configuração Awin salva' });
  } catch (error: any) {
    logger.error('Error saving Awin config:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/awin/feeds:
 *   get:
 *     summary: Get list of available Product Feeds
 *     tags: [Awin]
 *     responses:
 *       200:
 *         description: List of available feeds with download URLs
 */
router.get('/feeds', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const awinService = await AwinService.createForUser(userId);

    // Note: AwinService has a specific method check? hasDataFeedApiKey()
    // Since we removed 'hasDataFeedApiKey' from public interface in Refactor? No, it's inherited from NetworkApiAbstract probably?
    // Let's check NetworkApiAbstract... It has 'hasDataFeedApiKey()'.

    if (!awinService.hasDataFeedApiKey()) {
      return res.status(400).json({
        success: false,
        message: 'Data Feed API Key (ou Token) não configurado.',
      });
    }

    const feeds = await awinService.fetchFeedList();
    return res.json({
      success: true,
      count: feeds.length,
      feeds,
    });
  } catch (error: any) {
    logger.error('Error fetching Awin feeds:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/awin/feeds/download:
 *   post:
 *     summary: Download and import products from a feed URL (USER-SCOPED)
 *     tags: [Awin]
 */
router.post('/feeds/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { feedUrl, maxProducts = 100, save = false } = req.body;

    if (!feedUrl) {
      return res.status(400).json({
        success: false,
        message: 'feedUrl é obrigatório',
      });
    }

    const awinService = await AwinService.createForUser(userId);
    const offers = await awinService.downloadFeed(feedUrl, maxProducts);

    if (offers.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum produto encontrado no feed',
        count: 0,
        products: [],
      });
    }

    // Optionally save to database
    let savedCount = 0;
    let skippedCount = 0;

    if (save) {
      for (const offer of offers) {
        try {
          const existing = await OfferModel.findOne({
            userId,
            affiliateUrl: offer.affiliateUrl,
          });
          if (existing) {
            skippedCount++;
            continue;
          }
          await OfferModel.create({ ...offer, userId });
          savedCount++;
        } catch (saveError: any) {
          if (saveError.code === 11000) {
            skippedCount++;
          } else {
            logger.warn(`Error saving product: ${saveError.message}`);
          }
        }
      }
    }

    return res.json({
      success: true,
      message: save
        ? `${savedCount} produtos salvos, ${skippedCount} ignorados`
        : `${offers.length} produtos encontrados`,
      count: offers.length,
      saved: save ? savedCount : undefined,
      skipped: save ? skippedCount : undefined,
      products: offers.slice(0, 10), // Return first 10 as preview
    });
  } catch (error: any) {
    logger.error('Error downloading Awin feed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/awin/advertisers:
 *   get:
 *     summary: Get list of advertisers/accounts the publisher has access to
 *     tags: [Awin]
 */
router.get('/advertisers', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const awinService = await AwinService.createForUser(userId);

    if (!awinService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Awin não está configurado',
      });
    }

    const advertisers = await awinService.getAdvertisers();
    return res.json({
      success: true,
      advertisers,
    });
  } catch (error: any) {
    logger.error('Error fetching Awin advertisers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/awin/products/{advertiserId}:
 *   post:
 *     summary: Fetch products from an advertiser's product feed (USER-SCOPED)
 *     tags: [Awin]
 */
router.post('/products/:advertiserId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { advertiserId } = req.params;
    const { locale = 'pt_BR', save = false } = req.body;

    const awinService = await AwinService.createForUser(userId);

    if (!awinService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Awin não está configurado',
      });
    }

    logger.info(`📡 Fetching products from Awin advertiser ${advertiserId}...`);
    const offers = await awinService.getProductFeed(advertiserId, { locale });

    if (offers.length === 0) {
      return res.json({
        success: true,
        message: `Nenhum produto encontrado no feed do anunciante ${advertiserId}`,
        count: 0,
        products: [],
      });
    }

    // Optionally save to database
    let savedCount = 0;
    let skippedCount = 0;

    if (save) {
      for (const offer of offers) {
        try {
          const existing = await OfferModel.findOne({
            userId,
            productUrl: offer.productUrl,
          });
          if (existing) {
            skippedCount++;
            continue;
          }
          await OfferModel.create({ ...offer, userId });
          savedCount++;
        } catch (saveError: any) {
          if (saveError.code === 11000) {
            skippedCount++;
          } else {
            logger.warn(`Error saving Awin product: ${saveError.message}`);
          }
        }
      }
    }

    return res.json({
      success: true,
      message: save
        ? `${savedCount} produtos salvos, ${skippedCount} ignorados`
        : `${offers.length} produtos encontrados`,
      count: offers.length,
      saved: save ? savedCount : undefined,
      skipped: save ? skippedCount : undefined,
      products: offers.slice(0, 10), // Return first 10 products as preview
    });
  } catch (error: any) {
    logger.error('Error fetching Awin products:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/awin/cached-products/{advertiserId}:
 *   get:
 *     summary: Get products with caching and filters
 *     tags: [Awin]
 */
router.get('/cached-products/:advertiserId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { advertiserId } = req.params;
    const { minPrice, maxPrice, minDiscount, maxProducts, forceRefresh, locale } = req.query;

    const feedManager = await AwinFeedManager.createForUser(userId);
    const products = await feedManager.getProducts(advertiserId, {
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      minDiscount: minDiscount ? parseFloat(minDiscount as string) : undefined,
      maxProducts: maxProducts ? parseInt(maxProducts as string, 10) : 50,
      locale: (locale as string) || 'pt_BR',
      forceRefresh: forceRefresh === 'true',
    });

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    logger.error('Error fetching cached products:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/awin/cache/stats:
 *   get:
 *     summary: Get feed cache statistics
 *     tags: [Awin]
 */
router.get('/cache/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const feedManager = await AwinFeedManager.createForUser(userId);
    const stats = feedManager.getStats();
    const cachedFeeds = feedManager.getCachedFeeds();

    return res.json({
      success: true,
      ...stats,
      feeds: cachedFeeds.map((f) => ({
        advertiserId: f.advertiserId,
        locale: f.locale,
        productCount: f.productCount,
        lastUpdated: f.lastUpdated,
        expiresAt: f.expiresAt,
      })),
    });
  } catch (error: any) {
    logger.error('Error getting cache stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/awin/cache/clear:
 *   delete:
 *     summary: Clear feed cache
 *     tags: [Awin]
 */
router.delete('/cache/clear', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { advertiserId } = req.body;
    const feedManager = await AwinFeedManager.createForUser(userId);

    if (advertiserId) {
      feedManager.clearAdvertiserCache(advertiserId);
      return res.json({
        success: true,
        message: `Cache do anunciante ${advertiserId} limpo`,
      });
    }

    feedManager.clearCache();
    return res.json({
      success: true,
      message: 'Todo o cache de feeds foi limpo',
    });
  } catch (error: any) {
    logger.error('Error clearing cache:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
