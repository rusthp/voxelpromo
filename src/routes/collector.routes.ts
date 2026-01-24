import { Router, Request, Response } from 'express';
import { CollectorService } from '../services/collector/CollectorService';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Protect all collector routes with authentication
router.use(authenticate);

/**
 * POST /api/collector/amazon
 * Collect offers from Amazon
 */
router.post('/amazon', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { keywords, category } = req.body;
    const collectorService = new CollectorService({}, userId);
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
router.post('/aliexpress', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { category } = req.body;
    const collectorService = new CollectorService({}, userId);
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
router.post('/mercadolivre', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { category } = req.body;
    const collectorService = new CollectorService({}, userId);
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
router.post('/shopee', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { category } = req.body;
    const collectorService = new CollectorService({}, userId);
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
router.post('/rss', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { feedUrl, source } = req.body;
    const collectorService = new CollectorService({}, userId);
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
router.post('/run-all', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const collectorService = new CollectorService({}, userId);
    const result = await collectorService.collectAll();
    res.json(result);
  } catch (error: any) {
    logger.error('Error running all collectors:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as collectorRoutes };
