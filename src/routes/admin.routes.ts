import { Router, Request, Response } from 'express';
import { OfferModel } from '../models/Offer';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { LogService } from '../services/LogService';

const router = Router();

// Middleware to ensure all admin routes require admin privileges
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/users
 * List all users with pagination and filtering
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const query: any = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Change user role
 */
router.patch('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid role' });
      return;
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Log the action
    await LogService.log({
      req,
      action: 'USER_ROLE_UPDATE',
      category: 'USER',
      resource: { type: 'User', id: user._id.toString(), name: user.username },
      details: { role },
      actor: req.user as any
    });

    res.json({ success: true, user });
  } catch (error: any) {
    logger.error('Error updating user role:', error);
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

/**
 * GET /api/admin/audit-logs
 * View system audit logs
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category;
    const userId = req.query.userId;
    const action = req.query.action;

    const result = await LogService.getLogs(page, limit, {
      category,
      userId,
      action
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

/**
 * DELETE /api/admin/clear-all-offers
 * Clear all offers from database (for testing)
 */
router.delete('/clear-all-offers', async (req: AuthRequest, res: Response) => {
  try {
    logger.warn('⚠️ CLEARING ALL OFFERS - This is a destructive operation!');

    const result = await OfferModel.deleteMany({});
    const deletedCount = result.deletedCount || 0;

    logger.info(`🗑️ Cleared ${deletedCount} offers from database`);

    await LogService.log({
      req,
      action: 'OFFERS_CLEAR_ALL',
      category: 'SYSTEM',
      details: { deletedCount },
      actor: req.user as any
    });

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
 */
router.post('/reset-database', async (req: AuthRequest, res: Response) => {
  try {
    logger.warn('⚠️ RESETTING DATABASE - This will clear all data!');

    // Clear all offers
    const offersResult = await OfferModel.deleteMany({});

    await LogService.log({
      req,
      action: 'DATABASE_RESET',
      category: 'SYSTEM',
      details: { offersDeleted: offersResult.deletedCount },
      actor: req.user as any
    });

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
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const totalOffers = await OfferModel.countDocuments();
    const activeOffers = await OfferModel.countDocuments({ isActive: true });
    const inactiveOffers = await OfferModel.countDocuments({ isActive: false });
    const postedOffers = await OfferModel.countDocuments({ isPosted: true });
    const totalUsers = await UserModel.countDocuments();

    res.json({
      success: true,
      stats: {
        totalOffers,
        activeOffers,
        inactiveOffers,
        postedOffers,
        totalUsers
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

import jwt from 'jsonwebtoken';

// Helper to get JWT Secret (duplicated from auth.routes.ts since it's not exported)
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return secret;
}

/**
 * POST /api/admin/impersonate/:userId
 * Impersonate a user (generate a token for them)
 * PROTECTED ROUTE - Requires authentication & Admin
 */
router.post('/impersonate/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // 1. Find the target user
    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'Target user not found' });
      return;
    }

    // 2. Security Check: Prevent impersonating other admins (optional, but good practice)
    // For now, allowing it, but logging heavily.

    // 3. Generate Token for the Target User
    // We use a shorter expiry for impersonation tokens (e.g., 1 hour) to reduce risk
    const accessToken = jwt.sign(
      {
        id: targetUser._id.toString(),
        username: targetUser.username,
        role: targetUser.role
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // 4. Log the Impersonation Action
    await LogService.log({
      req,
      action: 'AUTH_IMPERSONATE',
      category: 'AUTH',
      resource: {
        type: 'User',
        id: targetUser._id.toString(),
        name: targetUser.username
      },
      details: {
        adminId: req.user?.id,
        reason: 'Support/Troubleshooting'
      },
      actor: req.user as any
    });

    logger.warn(`👮 Admin ${req.user?.username} is impersonating user ${targetUser.username}`);

    res.json({
      success: true,
      accessToken,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
      },
      message: `Impersonating ${targetUser.username}`
    });

  } catch (error: any) {
    logger.error('Error impersonating user:', error);
    res.status(500).json({ success: false, error: 'Failed to impersonate user' });
  }
});

/**
 * GET /api/admin/health-stats
 * Get operational health statistics for the dashboard
 * PROTECTED ROUTE - Requires authentication & Admin
 */
router.get('/health-stats', async (_req: Request, res: Response) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Audit Log Metrics (Errors in last 24h)
    const rawErrorCount = await import('../models/AuditLog').then(m =>
      m.AuditLogModel.countDocuments({
        status: 'FAILURE',
        createdAt: { $gte: oneDayAgo }
      })
    );


    // 2. Offer Metrics
    const totalOffers = await OfferModel.countDocuments();
    const activeOffers = await OfferModel.countDocuments({ isActive: true });

    // Offers created in last 24h
    const newOffers24h = await OfferModel.countDocuments({
      createdAt: { $gte: oneDayAgo }
    });

    // 3. User Metrics
    const totalUsers = await UserModel.countDocuments();
    const newUsers24h = await UserModel.countDocuments({
      createdAt: { $gte: oneDayAgo }
    });

    // 4. System Info
    const memory = process.memoryUsage();

    res.json({
      success: true,
      data: {
        health: {
          status: rawErrorCount > 50 ? 'CRITICAL' : rawErrorCount > 10 ? 'WARNING' : 'HEALTHY',
          errorRate24h: rawErrorCount
        },
        offers: {
          total: totalOffers,
          active: activeOffers,
          new24h: newOffers24h
        },
        users: {
          total: totalUsers,
          new24h: newUsers24h
        },
        system: {
          uptime: process.uptime(),
          memoryUsedMB: Math.round(memory.heapUsed / 1024 / 1024)
        }
      }
    });

  } catch (error: any) {
    logger.error('Error fetching health stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch health stats' });
  }
});

/**
 * GET /api/admin/users/:id/details
 * Get detailed information about a specific user
 * PROTECTED ROUTE - Requires authentication & Admin
 */
router.get('/users/:id/details', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Get user info
    const user = await UserModel.findById(id).select('-password').lean();
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 2. Get recent activity logs (last 10 actions)
    const recentActivity = await import('../models/AuditLog').then(m =>
      m.AuditLogModel.find({
        'actor.userId': id
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    );

    // 3. Get error count (24h and 7d)
    const [errors24h, errors7d] = await Promise.all([
      import('../models/AuditLog').then(m =>
        m.AuditLogModel.countDocuments({
          'actor.userId': id,
          status: 'FAILURE',
          createdAt: { $gte: oneDayAgo }
        })
      ),
      import('../models/AuditLog').then(m =>
        m.AuditLogModel.countDocuments({
          'actor.userId': id,
          status: 'FAILURE',
          createdAt: { $gte: oneWeekAgo }
        })
      )
    ]);

    // 4. Calculate "posts used today" (based on Post History or similar)
    // For now, using a placeholder - you'd integrate with your actual post tracking
    const postsToday = 0; // TODO: Implement based on your post tracking system

    res.json({
      success: true,
      data: {
        user,
        activity: {
          recent: recentActivity,
          errors24h,
          errors7d,
          lastActive: recentActivity[0]?.createdAt || user.lastLogin
        },
        usage: {
          postsToday,
          postsLimit: user.plan?.limits?.postsPerDay || 10,
          planTier: user.plan?.tier || 'free'
        }
      }
    });

  } catch (error: any) {
    logger.error('Error fetching user details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user details' });
  }
});

export { router as adminRoutes };
