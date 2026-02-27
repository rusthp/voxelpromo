import { Router, Response } from 'express';
import { AutomationService } from '../services/automation/AutomationService';
import { logger } from '../utils/logger';
import { validate } from '../middleware/validate';
import { automationConfigSchema } from '../validation/automation.validation';
import { checkSubscriptionStatus } from '../middleware/SubscriptionMiddleware';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Stateless singleton — all methods receive userId as parameter
const automationService = new AutomationService();

/**
 * @swagger
 * /api/automation/config:
 *   get:
 *     summary: Get active automation configuration for the logged-in user
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Automation configuration
 *       404:
 *         description: No configuration found
 */
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const config = await automationService.getActiveConfig(userId);

    if (!config) {
      return res.status(404).json({ error: 'No automation configuration found' });
    }

    return res.json(config);
  } catch (error: any) {
    logger.error('Error getting automation config:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/automation/config:
 *   post:
 *     summary: Save or update automation configuration for the logged-in user
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuration saved successfully
 */
router.post('/config', authenticate, validate(automationConfigSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const config = await automationService.saveConfig(userId, req.body);
    return res.json({ success: true, config });
  } catch (error: any) {
    logger.error('Error saving automation config:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/automation/status:
 *   get:
 *     summary: Get automation status for the logged-in user
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current automation status
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const status = await automationService.getStatus(userId);
    return res.json(status);
  } catch (error: any) {
    logger.error('Error getting automation status:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/automation/start:
 *   post:
 *     summary: Start automation for the logged-in user
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Automation started
 */
router.post('/start', authenticate, checkSubscriptionStatus, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const config = await automationService.getActiveConfig(userId);

    if (!config) {
      return res
        .status(404)
        .json({ error: 'No configuration found. Please configure automation first.' });
    }

    // Set config as active
    await automationService.saveConfig(userId, { ...config, isActive: true });

    // Trigger immediate distribution for Smart Planner (if enabled)
    let scheduledCount = 0;
    if (config.postsPerHour && config.postsPerHour > 0) {
      logger.info(`📅 Triggering initial Smart Planner distribution for user ${userId}...`);
      scheduledCount = await automationService.distributeHourlyPosts(userId);
    }

    logger.info(`✅ Automation started for user ${userId}`);
    return res.json({
      success: true,
      message: 'Automation started successfully',
      initialScheduledPosts: scheduledCount,
    });
  } catch (error: any) {
    logger.error('Error starting automation:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/automation/stop:
 *   post:
 *     summary: Stop automation for the logged-in user
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Automation stopped
 */
router.post('/stop', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const config = await automationService.getActiveConfig(userId);

    if (!config) {
      return res.json({ success: true, message: 'Automation was not running' });
    }

    // Set config as inactive
    await automationService.saveConfig(userId, { ...config, isActive: false });

    logger.info(`⏸️ Automation stopped for user ${userId}`);
    return res.json({ success: true, message: 'Automation stopped successfully' });
  } catch (error: any) {
    logger.error('Error stopping automation:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/automation/test:
 *   post:
 *     summary: Test automation (preview next posts for the logged-in user)
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preview of next posts
 */
router.post('/test', authenticate, checkSubscriptionStatus, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const config = await automationService.getActiveConfig(userId);

    if (!config) {
      return res.status(404).json({ error: 'No configuration found' });
    }

    // Get next 5 offers that would be posted (scoped to this user)
    const nextOffers = await automationService.getNextScheduledOffers(userId, config, 5);

    return res.json({
      success: true,
      config: {
        startHour: config.startHour,
        endHour: config.endHour,
        intervalMinutes: config.intervalMinutes,
        enabledChannels: config.enabledChannels,
      },
      nextOffers: nextOffers.map((offer) => ({
        id: offer._id,
        title: offer.title,
        price: offer.currentPrice,
        discount: offer.discountPercentage,
        source: offer.source,
      })),
    });
  } catch (error: any) {
    logger.error('Error testing automation:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export const automationRoutes = router;
