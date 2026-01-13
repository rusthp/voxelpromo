import { Router, Response } from 'express';
import { PostHistoryModel } from '../models/PostHistory';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// All post routes require authentication
router.use(authenticate);

/**
 * GET /api/posts/history
 * Get post history with filters (USER-SCOPED)
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const {
            limit = 50,
            skip = 0,
            platform,
            status,
            startDate,
            endDate,
        } = req.query;

        // Build filter - always include userId
        const filter: any = { userId };

        if (platform) {
            filter.platform = platform;
        }

        if (status) {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.postedAt = {};
            if (startDate) {
                filter.postedAt.$gte = new Date(startDate as string);
            }
            if (endDate) {
                filter.postedAt.$lte = new Date(endDate as string);
            }
        }

        // Get total count
        const total = await PostHistoryModel.countDocuments(filter);

        // Get posts with pagination
        const posts = await PostHistoryModel.find(filter)
            .populate('offerId', 'title imageUrl productUrl source discountPercentage currentPrice')
            .sort({ postedAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(skip as string));

        res.json({
            success: true,
            posts,
            pagination: {
                total,
                limit: parseInt(limit as string),
                skip: parseInt(skip as string),
                hasMore: total > parseInt(skip as string) + parseInt(limit as string),
            },
        });
    } catch (error: any) {
        logger.error('Error getting post history:', error);
        res.status(500).json({ error: error.message || 'Erro ao buscar histórico de posts' });
    }
});

/**
 * GET /api/posts/history/stats
 * Get posting statistics (USER-SCOPED)
 */
router.get('/history/stats', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        // Overall stats - filtered by userId
        const [totalPosts, successPosts, failedPosts] = await Promise.all([
            PostHistoryModel.countDocuments({ userId }),
            PostHistoryModel.countDocuments({ userId, status: 'success' }),
            PostHistoryModel.countDocuments({ userId, status: 'failed' }),
        ]);

        // Stats by platform
        const byPlatform = await PostHistoryModel.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: '$platform',
                    total: { $sum: 1 },
                    success: {
                        $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
                    },
                    failed: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
                    },
                },
            },
            { $sort: { total: -1 } },
        ]);

        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentActivity = await PostHistoryModel.aggregate([
            {
                $match: {
                    userId: userId,
                    postedAt: { $gte: sevenDaysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$postedAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            success: true,
            stats: {
                total: totalPosts,
                success: successPosts,
                failed: failedPosts,
                successRate: totalPosts > 0 ? ((successPosts / totalPosts) * 100).toFixed(2) : 0,
                byPlatform,
                recentActivity: recentActivity.map((item) => ({
                    date: item._id,
                    count: item.count,
                })),
            },
        });
    } catch (error: any) {
        logger.error('Error getting post stats:', error);
        res.status(500).json({ error: error.message || 'Erro ao buscar estatísticas de posts' });
    }
});

/**
 * GET /api/posts/history/:id
 * Get specific post history entry (USER-SCOPED)
 */
router.get('/history/:id', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const post = await PostHistoryModel.findOne({
            _id: req.params.id,
            userId
        }).populate(
            'offerId',
            'title imageUrl productUrl source discountPercentage currentPrice originalPrice'
        );

        if (!post) {
            return res.status(404).json({ error: 'Post não encontrado' });
        }

        return res.json({ success: true, post });
    } catch (error: any) {
        logger.error('Error getting post:', error);
        return res.status(500).json({ error: error.message || 'Erro ao buscar post' });
    }
});

export { router as postsRoutes };
