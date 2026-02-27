import { Router } from 'express';
import { OfferModel } from '../models/Offer';
import { ShortLinkModel } from '../models/ShortLink';
import { ClickModel } from '../models/Click';
import { logger } from '../utils/logger';

const router = Router();

/** Reusable HTML 404 page for missing/expired links */
const notFoundHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Link não encontrado</title>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #111; color: #eee; }
      h1 { color: #e74c3c; }
      a { color: #3498db; }
    </style>
  </head>
  <body>
    <h1>🔗 Link não encontrado</h1>
    <p>Este link curto não existe ou expirou.</p>
    <a href="/">Voltar ao início</a>
  </body>
  </html>
`;

/**
 * GET /s/:code
 * Redirect short URL and track click
 * Lookup order: OfferModel.shortCode → ShortLinkModel.code (fallback)
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const channel = (req.query.ch as string) || 'unknown';

    // ── Priority 1: Offer short code ──
    const offer = await OfferModel.findOne({ shortCode: code });

    if (offer) {
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

      // Increment click count on offer
      OfferModel.updateOne({ _id: offer._id }, { $inc: { clicks: 1 } }).catch((err) =>
        logger.error('Error incrementing clicks:', err)
      );

      logger.debug(`Redirecting ${code} -> ${offer.affiliateUrl}`);
      return res.redirect(302, offer.affiliateUrl);
    }

    // ── Priority 2: ShortLinkModel (UrlShortenerService – ML fallback links etc.) ──
    const shortLink = await ShortLinkModel.findOne({ code, isActive: true });

    if (shortLink) {
      // Check expiration
      if (shortLink.expiresAt && shortLink.expiresAt < new Date()) {
        logger.warn(`🔗 Short link expired: ${code}`);
        return res.status(404).send(notFoundHtml);
      }

      // Increment click counter (non-blocking, with crash-safe catch)
      ShortLinkModel.updateOne({ _id: shortLink._id }, { $inc: { clicks: 1 } })
        .exec()
        .catch((err) => logger.error(`Erro ao computar clique no link ${code}:`, err));

      logger.debug(`Redirecting (ShortLink) ${code} -> ${shortLink.originalUrl.substring(0, 80)}...`);
      return res.redirect(302, shortLink.originalUrl);
    }

    // ── Not found in either model ──
    logger.warn(`Short URL not found in Offer or ShortLink: ${code}`);
    return res.status(404).send(notFoundHtml);
  } catch (error: any) {
    logger.error('Short URL error:', error);
    return res.status(500).send('Erro ao processar link');
  }
});

export { router as shorturlRoutes };
