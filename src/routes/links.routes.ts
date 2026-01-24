import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/link/UrlShortenerService';
import { logger } from '../utils/logger';

const router = Router();
const shortenerService = new UrlShortenerService();

/**
 * POST /api/links/shorten
 * Create a short link
 */
router.post('/shorten', async (req: Request, res: Response) => {
  try {
    const { url, source, offerId, expiresAt } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const shortLink = await shortenerService.createShortLink(url, {
      source,
      offerId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return res.json({
      success: true,
      shortUrl: shortLink.shortUrl,
      code: shortLink.code,
      originalUrl: shortLink.originalUrl,
    });
  } catch (error: any) {
    logger.error('Error creating short link:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/links/stats/:code
 * Get stats for a short link
 */
router.get('/stats/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const stats = await shortenerService.getStats(code);

    if (!stats) {
      return res.status(404).json({ error: 'Link not found' });
    }

    return res.json({
      code: stats.code,
      shortUrl: stats.shortUrl,
      originalUrl: stats.originalUrl,
      clicks: stats.clicks,
      source: stats.source,
      createdAt: stats.createdAt,
      isActive: stats.isActive,
    });
  } catch (error: any) {
    logger.error('Error fetching link stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/links
 * List all short links
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await shortenerService.getAll(page, limit);
    return res.json(result);
  } catch (error: any) {
    logger.error('Error listing links:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/links/top
 * Get top performing links
 */
router.get('/top', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topLinks = await shortenerService.getTopLinks(limit);
    return res.json({ links: topLinks });
  } catch (error: any) {
    logger.error('Error fetching top links:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/links/:code
 * Deactivate a short link
 */
router.delete('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const success = await shortenerService.deactivate(code);

    if (!success) {
      return res.status(404).json({ error: 'Link not found' });
    }

    return res.json({ success: true, message: 'Link deactivated' });
  } catch (error: any) {
    logger.error('Error deactivating link:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
