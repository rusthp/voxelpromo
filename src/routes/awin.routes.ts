import { Router, Response } from 'express';
import { AwinService } from '../services/awin/AwinService';
import { AwinFeedManager } from '../services/awin/AwinFeedManager';
import { OfferModel } from '../models/Offer';
import { logger } from '../utils/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const configPath = join(process.cwd(), 'config.json');

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
router.get('/test', async (_req, res) => {
  try {
    const awinService = new AwinService();
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
    const awinService = new AwinService();

    if (!awinService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Awin não está configurado. Configure o API Token e Publisher ID.',
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

    // Save offers to database with userId
    let savedCount = 0;
    let skippedCount = 0;

    for (const offer of offers) {
      try {
        // Check if offer already exists FOR THIS USER (by productUrl + userId)
        const existing = await OfferModel.findOne({
          userId,
          productUrl: offer.productUrl,
        });
        if (existing) {
          skippedCount++;
          continue;
        }

        // Create new offer with userId
        await OfferModel.create({ ...offer, userId });
        savedCount++;
      } catch (saveError: any) {
        if (saveError.code === 11000) {
          // Duplicate key error
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
router.get('/config', (_req, res) => {
  try {
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return res.json({
        enabled: config.awin?.enabled ?? false,
        apiToken: config.awin?.apiToken ? '***' : '',
        publisherId: config.awin?.publisherId || '',
      });
    }
    return res.json({ enabled: false, apiToken: '', publisherId: '' });
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
router.post('/config', (req, res) => {
  try {
    const { enabled, apiToken, publisherId, dataFeedApiKey } = req.body;

    // Load existing config
    let existingConfig: any = {};
    if (existsSync(configPath)) {
      existingConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    // Update Awin config
    existingConfig.awin = {
      enabled: enabled ?? existingConfig.awin?.enabled ?? false,
      apiToken: apiToken && apiToken !== '***' ? apiToken : existingConfig.awin?.apiToken || '',
      publisherId: publisherId || existingConfig.awin?.publisherId || '',
      dataFeedApiKey:
        dataFeedApiKey && dataFeedApiKey !== '***'
          ? dataFeedApiKey
          : existingConfig.awin?.dataFeedApiKey || '',
    };

    // Also update environment for immediate use
    if (existingConfig.awin.apiToken) {
      process.env.AWIN_API_TOKEN = existingConfig.awin.apiToken;
    }
    if (existingConfig.awin.publisherId) {
      process.env.AWIN_PUBLISHER_ID = existingConfig.awin.publisherId;
    }
    if (existingConfig.awin.dataFeedApiKey) {
      process.env.AWIN_DATA_FEED_API_KEY = existingConfig.awin.dataFeedApiKey;
    }
    process.env.AWIN_ENABLED = String(existingConfig.awin.enabled);

    // Save config
    writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
    logger.info('✅ Awin config saved');

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
router.get('/feeds', async (_req, res) => {
  try {
    const awinService = new AwinService();

    if (!awinService.hasDataFeedApiKey()) {
      return res.status(400).json({
        success: false,
        message: 'Data Feed API Key não configurada. Configure em Awin → Create-a-Feed.',
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [feedUrl]
 *             properties:
 *               feedUrl:
 *                 type: string
 *                 description: Full download URL from feed list
 *               maxProducts:
 *                 type: number
 *                 default: 100
 *               save:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Products downloaded and optionally saved
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

    const awinService = new AwinService();
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
 *     responses:
 *       200:
 *         description: List of Awin accounts
 */
router.get('/advertisers', async (_req, res) => {
  try {
    const awinService = new AwinService();

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
 *     parameters:
 *       - in: path
 *         name: advertiserId
 *         required: true
 *         schema:
 *           type: string
 *         description: Awin Advertiser ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               locale:
 *                 type: string
 *                 default: pt_BR
 *               save:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Products fetched from advertiser feed
 */
router.post('/products/:advertiserId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { advertiserId } = req.params;
    const { locale = 'pt_BR', save = false } = req.body;

    const awinService = new AwinService();

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
 *     parameters:
 *       - in: path
 *         name: advertiserId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: minDiscount
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxProducts
 *         schema:
 *           type: number
 *       - in: query
 *         name: forceRefresh
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Filtered products from cache or fresh download
 */
router.get('/cached-products/:advertiserId', async (req, res) => {
  try {
    const { advertiserId } = req.params;
    const { minPrice, maxPrice, minDiscount, maxProducts, forceRefresh, locale } = req.query;

    const feedManager = new AwinFeedManager();
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
 *     responses:
 *       200:
 *         description: Cache statistics
 */
router.get('/cache/stats', (_req, res) => {
  try {
    const feedManager = new AwinFeedManager();
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               advertiserId:
 *                 type: string
 *                 description: Optional - clear only this advertiser's cache
 *     responses:
 *       200:
 *         description: Cache cleared
 */
router.delete('/cache/clear', (req, res) => {
  try {
    const { advertiserId } = req.body;
    const feedManager = new AwinFeedManager();

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
