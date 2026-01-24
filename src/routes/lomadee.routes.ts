import { Router } from 'express';
import { LomadeeService } from '../services/lomadee/LomadeeService';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/lomadee/test:
 *   get:
 *     summary: Test Lomadee API connection
 *     tags: [Lomadee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection test result
 */
router.get('/test', authenticate, async (_req, res) => {
  try {
    const lomadeeService = new LomadeeService();
    const result = await lomadeeService.testConnection();
    return res.json(result);
  } catch (error: any) {
    logger.error(`Error testing Lomadee connection: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/lomadee/advertisers:
 *   get:
 *     summary: Get list of Lomadee advertisers
 *     tags: [Lomadee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of advertisers
 */
router.get('/advertisers', authenticate, async (_req, res) => {
  try {
    const lomadeeService = new LomadeeService();

    if (!lomadeeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Lomadee não configurado',
      });
    }

    const advertisers = await lomadeeService.getCampaigns();
    return res.json({ success: true, advertisers, count: advertisers.length });
  } catch (error: any) {
    logger.error(`Error fetching Lomadee advertisers: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/lomadee/coupons:
 *   get:
 *     summary: Get Lomadee coupons
 *     tags: [Lomadee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons
 */
router.get('/coupons', authenticate, async (_req, res) => {
  try {
    const lomadeeService = new LomadeeService();

    if (!lomadeeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Lomadee não configurado',
      });
    }

    const coupons = await lomadeeService.getCoupons();
    return res.json({ success: true, coupons, count: coupons.length });
  } catch (error: any) {
    logger.error(`Error fetching Lomadee coupons: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/lomadee/offers:
 *   get:
 *     summary: Search Lomadee offers by keyword
 *     tags: [Lomadee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of offers
 */
router.get('/offers', authenticate, async (req, res) => {
  try {
    const { keyword, limit = 50 } = req.query;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Keyword é obrigatório',
      });
    }

    const lomadeeService = new LomadeeService();

    if (!lomadeeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Lomadee não configurado',
      });
    }

    const offers = await lomadeeService.searchOffers(keyword, Number(limit));
    return res.json({ success: true, offers, count: offers.length });
  } catch (error: any) {
    logger.error(`Error searching Lomadee offers: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/lomadee/deeplink:
 *   post:
 *     summary: Generate Lomadee deeplink
 *     tags: [Lomadee]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Generated deeplink
 */
router.post('/deeplink', authenticate, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL é obrigatória',
      });
    }

    const lomadeeService = new LomadeeService();

    if (!lomadeeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Lomadee não configurado',
      });
    }

    const deeplink = await lomadeeService.getDeeplink(url);

    if (deeplink) {
      return res.json({ success: true, deeplink });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Não foi possível gerar deeplink',
      });
    }
  } catch (error: any) {
    logger.error(`Error generating Lomadee deeplink: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
