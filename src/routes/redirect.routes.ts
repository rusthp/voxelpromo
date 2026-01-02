import { Router, Request, Response } from 'express';
import { UrlShortenerService } from '../services/link/UrlShortenerService';
import { logger } from '../utils/logger';

const router = Router();
const shortenerService = new UrlShortenerService();

/**
 * GET /s/:code
 * Redirect to original URL
 */
router.get('/:code', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;

        const originalUrl = await shortenerService.resolveCode(code);

        if (!originalUrl) {
            logger.warn(`🔗 Short link not found or expired: ${code}`);
            return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link não encontrado</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
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
      `);
        }

        // HTTP 301 Permanent Redirect for SEO
        return res.redirect(301, originalUrl);
    } catch (error: any) {
        logger.error('Error resolving short link:', error);
        return res.status(500).send('Erro interno');
    }
});

export default router;
