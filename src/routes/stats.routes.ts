import { Router, Request, Response } from 'express';
import { OfferModel } from '../models/Offer';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/stats
 * Get basic statistics
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [total, posted, notPosted, avgDiscountResult] = await Promise.all([
      OfferModel.countDocuments(),
      OfferModel.countDocuments({ isPosted: true }),
      OfferModel.countDocuments({ isPosted: false }),
      OfferModel.aggregate([
        {
          $group: {
            _id: null,
            avgDiscount: { $avg: '$discountPercentage' }
          }
        }
      ])
    ]);

    const avgDiscount = avgDiscountResult.length > 0 ? avgDiscountResult[0].avgDiscount : 0;

    res.json({
      total,
      posted,
      notPosted,
      avgDiscount: Math.round(avgDiscount * 100) / 100
    });
  } catch (error: any) {
    logger.error('Error getting stats:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar estatísticas' });
  }
});

/**
 * GET /api/stats/analytics
 * Get comprehensive analytics data
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, days = 30 } = req.query;

    // Calculate date range
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate
      ? new Date(startDate as string)
      : new Date(end.getTime() - parseInt(days as string) * 24 * 60 * 60 * 1000);

    // Get offers by source
    const offersBySource = await OfferModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          avgDiscount: { $avg: '$discountPercentage' },
          totalRevenue: { $sum: '$currentPrice' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get offers by category
    const offersByCategory = await OfferModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgDiscount: { $avg: '$discountPercentage' },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Get offers by day (time series)
    const offersByDay = await OfferModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          avgDiscount: { $avg: '$discountPercentage' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get top offers by discount
    const topOffers = await OfferModel.find({
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ discountPercentage: -1 })
      .limit(10)
      .select('title currentPrice originalPrice discountPercentage source createdAt productUrl imageUrl');

    // Get posting statistics
    const postingStats = await OfferModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          postedOffers: {
            $sum: { $cond: ['$isPosted', 1, 0] },
          },
          scheduledOffers: {
            $sum: { $cond: ['$scheduledAt', 1, 0] },
          },
        },
      },
    ]);

    // Calculate conversion rate
    const conversionRate =
      postingStats.length > 0
        ? ((postingStats[0].postedOffers / postingStats[0].totalOffers) * 100).toFixed(2)
        : 0;

    res.json({
      success: true,
      analytics: {
        dateRange: {
          start,
          end,
          days: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        },
        offersBySource: offersBySource.map((item) => ({
          source: item._id,
          count: item.count,
          avgDiscount: Math.round(item.avgDiscount * 100) / 100,
          totalRevenue: Math.round(item.totalRevenue * 100) / 100,
        })),
        offersByCategory: offersByCategory.map((item) => ({
          category: item._id,
          count: item.count,
          avgDiscount: Math.round(item.avgDiscount * 100) / 100,
        })),
        offersByDay: offersByDay.map((item) => ({
          date: item._id,
          count: item.count,
          avgDiscount: Math.round(item.avgDiscount * 100) / 100,
        })),
        topOffers,
        postingStats: postingStats[0] || {
          totalOffers: 0,
          postedOffers: 0,
          scheduledOffers: 0,
        },
        conversionRate: parseFloat(conversionRate as string),
      },
    });
  } catch (error: any) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar analytics' });
  }
});

/**
 * GET /api/stats/sources
 * Get statistics by source
 */
router.get('/sources', async (_req: Request, res: Response) => {
  try {
    const sourceStats = await OfferModel.aggregate([
      {
        $group: {
          _id: '$source',
          total: { $sum: 1 },
          posted: {
            $sum: { $cond: ['$isPosted', 1, 0] },
          },
          avgDiscount: { $avg: '$discountPercentage' },
          maxDiscount: { $max: '$discountPercentage' },
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    res.json({
      success: true,
      sources: sourceStats.map((stat) => ({
        source: stat._id,
        total: stat.total,
        posted: stat.posted,
        avgDiscount: Math.round(stat.avgDiscount * 100) / 100,
        maxDiscount: Math.round(stat.maxDiscount * 100) / 100,
        postingRate: Math.round((stat.posted / stat.total) * 100 * 100) / 100,
      })),
    });
  } catch (error: any) {
    logger.error('Error getting source stats:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar estatísticas por fonte' });
  }
});

export { router as statsRoutes };
