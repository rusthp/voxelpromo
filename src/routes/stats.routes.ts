import { Router } from 'express';
import { OfferService } from '../services/offer/OfferService';

const router = Router();
const offerService = new OfferService();

/**
 * GET /api/stats
 * Get statistics
 */
router.get('/', async (_req, res) => {
  try {
    const stats = await offerService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as statsRoutes };
