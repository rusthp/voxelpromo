import { Router } from 'express';
import { RakutenService } from '../services/rakuten/RakutenService';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/rakuten/test:
 *   get:
 *     summary: Test Rakuten API connection
 *     tags: [Rakuten]
 *     security:
 *       - bearerAuth: []
 */
router.get('/test', authenticate, async (_req, res) => {
  try {
    const rakutenService = new RakutenService();
    const result = await rakutenService.testConnection();
    return res.json(result);
  } catch (error: any) {
    logger.error(`Error testing Rakuten connection: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/rakuten/advertisers:
 *   get:
 *     summary: Get list of Rakuten advertisers
 *     tags: [Rakuten]
 *     security:
 *       - bearerAuth: []
 */
router.get('/advertisers', authenticate, async (_req, res) => {
  try {
    const rakutenService = new RakutenService();

    if (!rakutenService.isConfigured()) {
      return res.status(400).json({ success: false, message: 'Rakuten não configurado' });
    }

    const advertisers = await rakutenService.getCampaigns();
    return res.json({ success: true, advertisers, count: advertisers.length });
  } catch (error: any) {
    logger.error(`Error fetching Rakuten advertisers: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/rakuten/coupons:
 *   get:
 *     summary: Get Rakuten coupons
 *     tags: [Rakuten]
 *     security:
 *       - bearerAuth: []
 */
router.get('/coupons', authenticate, async (_req, res) => {
  try {
    const rakutenService = new RakutenService();

    if (!rakutenService.isConfigured()) {
      return res.status(400).json({ success: false, message: 'Rakuten não configurado' });
    }

    const coupons = await rakutenService.getCoupons();
    return res.json({ success: true, coupons, count: coupons.length });
  } catch (error: any) {
    logger.error(`Error fetching Rakuten coupons: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/rakuten/deeplink:
 *   post:
 *     summary: Generate Rakuten deeplink
 *     tags: [Rakuten]
 *     security:
 *       - bearerAuth: []
 */
router.post('/deeplink', authenticate, async (req, res) => {
  try {
    const { url, advertiserId } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL é obrigatória' });
    }

    const rakutenService = new RakutenService();

    if (!rakutenService.isConfigured()) {
      return res.status(400).json({ success: false, message: 'Rakuten não configurado' });
    }

    const deeplink = await rakutenService.getDeeplink(url, advertiserId);

    if (deeplink) {
      return res.json({ success: true, deeplink });
    } else {
      return res.status(400).json({ success: false, message: 'Não foi possível gerar deeplink' });
    }
  } catch (error: any) {
    logger.error(`Error generating Rakuten deeplink: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
