import { Router } from 'express';
import { CollectorService } from '../services/collector/CollectorService';
import { logger } from '../utils/logger';

const router = Router();
const collectorService = new CollectorService();

/**
 * POST /api/collector/amazon
 * Collect offers from Amazon
 */
router.post('/amazon', async (req, res) => {
  try {
    const { keywords, category } = req.body;
    const count = await collectorService.collectFromAmazon(keywords || 'electronics', category);
    res.json({ success: true, collected: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/collector/aliexpress
 * Collect offers from AliExpress
 */
router.post('/aliexpress', async (req, res) => {
  try {
    const { category } = req.body;
    const count = await collectorService.collectFromAliExpress(category);
    res.json({ success: true, collected: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/collector/mercadolivre
 * Collect offers from Mercado Livre
 */
router.post('/mercadolivre', async (req, res) => {
  try {
    const { category } = req.body;
    const count = await collectorService.collectFromMercadoLivre(category || 'electronics');
    res.json({ success: true, collected: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/collector/shopee
 * Collect offers from Shopee
 */
router.post('/shopee', async (req, res) => {
  try {
    const { category } = req.body;
    const count = await collectorService.collectFromShopee(category || 'electronics');
    res.json({ success: true, collected: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/collector/rss
 * Collect offers from RSS feeds
 */
router.post('/rss', async (req, res) => {
  try {
    const { feedUrl, source } = req.body;
    const count = await collectorService.collectFromRSS(feedUrl, source);
    res.json({ success: true, collected: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/collector/run-all
 * Run all collectors
 */
router.post('/run-all', async (_req, res) => {
  try {
    const result = await collectorService.collectAll();
    res.json(result);
  } catch (error: any) {
    logger.error('Error running all collectors:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as collectorRoutes };
