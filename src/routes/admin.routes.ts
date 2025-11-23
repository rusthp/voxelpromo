import { Router, Request, Response } from 'express';
import { OfferModel } from '../models/Offer';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * DELETE /api/admin/clear-all-offers
 * Clear all offers from database (for testing)
 * PROTECTED ROUTE - Requires authentication
 */
router.delete('/clear-all-offers', authenticate, async (_req: Request, res: Response) => {
  try {
    logger.warn('⚠️ CLEARING ALL OFFERS - This is a destructive operation!');

    const result = await OfferModel.deleteMany({});
    const deletedCount = result.deletedCount || 0;

    logger.info(`🗑️ Cleared ${deletedCount} offers from database`);

    res.json({
      success: true,
      message: `Successfully cleared ${deletedCount} offers`,
      deletedCount,
    });
  } catch (error: any) {
    logger.error('Error clearing offers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear offers',
    });
  }
});

/**
 * POST /api/admin/reset-database
 * Reset database to initial state (for testing)
 * PROTECTED ROUTE - Requires authentication
 */
router.post('/reset-database', authenticate, async (_req: Request, res: Response) => {
  try {
    logger.warn('⚠️ RESETTING DATABASE - This will clear all data!');

    // Clear all offers
    const offersResult = await OfferModel.deleteMany({});

    logger.info(`🗑️ Database reset complete:`, {
      offersDeleted: offersResult.deletedCount || 0,
    });

    res.json({
      success: true,
      message: 'Database reset successfully',
      stats: {
        offersDeleted: offersResult.deletedCount || 0,
      },
    });
  } catch (error: any) {
    logger.error('Error resetting database:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset database',
    });
  }
});

/**
 * GET /api/admin/stats
 * Get admin statistics
 * PROTECTED ROUTE - Requires authentication
 */
router.get('/stats', authenticate, async (_req: Request, res: Response) => {
  try {
    const totalOffers = await OfferModel.countDocuments();
    const activeOffers = await OfferModel.countDocuments({ isActive: true });
    const inactiveOffers = await OfferModel.countDocuments({ isActive: false });
    const postedOffers = await OfferModel.countDocuments({ isPosted: true });

    res.json({
      success: true,
      stats: {
        total: totalOffers,
        active: activeOffers,
        inactive: inactiveOffers,
        posted: postedOffers,
      },
    });
  } catch (error: any) {
    logger.error('Error getting admin stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stats',
    });
  }
});

export { router as adminRoutes };
