import { Router } from 'express';
import { OfferModel } from '../models/Offer';
import { ClickModel } from '../models/Click';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /s/:code
 * Redirect short URL and track click
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const channel = (req.query.ch as string) || 'unknown';

    // Find offer by short code
    const offer = await OfferModel.findOne({ shortCode: code });

    if (!offer) {
      logger.warn(`Short URL not found: ${code}`);
      return res.status(404).send('Link não encontrado');
    }

    // Extract real client IP (Nginx/Cloudflare compatible)
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip ||
      'unknown';

    // Track click (async, don't block redirect)
    ClickModel.create({
      offerId: offer._id,
      userId: offer.userId,
      shortCode: code,
      channel,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: clientIp,
      referer: req.headers['referer'],
    }).catch((err) => logger.error('Error tracking click:', err));

    // Increment click count on offer (optional, for quick access)
    OfferModel.updateOne({ _id: offer._id }, { $inc: { clicks: 1 } }).catch((err) =>
      logger.error('Error incrementing clicks:', err)
    );

    // Redirect to affiliate URL
    logger.debug(`Redirecting ${code} -> ${offer.affiliateUrl}`);
    return res.redirect(302, offer.affiliateUrl);
  } catch (error: any) {
    logger.error('Short URL error:', error);
    return res.status(500).send('Erro ao processar link');
  }
});

export { router as shorturlRoutes };
