import { Router } from 'express';
import { AfilioService } from '../services/afilio/AfilioService';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/afilio/test:
 *   get:
 *     summary: Test Afilio API connection
 *     tags: [Afilio]
 *     security:
 *       - bearerAuth: []
 */
router.get('/test', authenticate, async (_req, res) => {
    try {
        const afilioService = new AfilioService();
        const result = await afilioService.testConnection();
        return res.json(result);
    } catch (error: any) {
        logger.error(`Error testing Afilio connection: ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /api/afilio/campaigns:
 *   get:
 *     summary: Get list of Afilio campaigns
 *     tags: [Afilio]
 *     security:
 *       - bearerAuth: []
 */
router.get('/campaigns', authenticate, async (_req, res) => {
    try {
        const afilioService = new AfilioService();

        if (!afilioService.isConfigured()) {
            return res.status(400).json({ success: false, message: 'Afilio não configurado' });
        }

        const campaigns = await afilioService.getCampaigns();
        return res.json({ success: true, campaigns, count: campaigns.length });
    } catch (error: any) {
        logger.error(`Error fetching Afilio campaigns: ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /api/afilio/coupons:
 *   get:
 *     summary: Get Afilio coupons
 *     tags: [Afilio]
 *     security:
 *       - bearerAuth: []
 */
router.get('/coupons', authenticate, async (_req, res) => {
    try {
        const afilioService = new AfilioService();

        if (!afilioService.isConfigured()) {
            return res.status(400).json({ success: false, message: 'Afilio não configurado' });
        }

        const coupons = await afilioService.getCoupons();
        return res.json({ success: true, coupons, count: coupons.length });
    } catch (error: any) {
        logger.error(`Error fetching Afilio coupons: ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /api/afilio/deeplink:
 *   post:
 *     summary: Generate Afilio deeplink
 *     tags: [Afilio]
 *     security:
 *       - bearerAuth: []
 */
router.post('/deeplink', authenticate, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, message: 'URL é obrigatória' });
        }

        const afilioService = new AfilioService();

        if (!afilioService.isConfigured()) {
            return res.status(400).json({ success: false, message: 'Afilio não configurado' });
        }

        const deeplink = await afilioService.getDeeplink(url);

        if (deeplink) {
            return res.json({ success: true, deeplink });
        } else {
            return res.status(400).json({ success: false, message: 'Não foi possível gerar deeplink' });
        }
    } catch (error: any) {
        logger.error(`Error generating Afilio deeplink: ${error.message}`);
        return res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
