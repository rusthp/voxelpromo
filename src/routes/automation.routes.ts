import { Router, Request, Response } from 'express';
import { AutomationService } from '../services/automation/AutomationService';
import { logger } from '../utils/logger';

const router = Router();
const automationService = new AutomationService();

/**
 * @swagger
 * /api/automation/config:
 *   get:
 *     summary: Get active automation configuration
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Automation configuration
 *       404:
 *         description: No configuration found
 */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await automationService.getActiveConfig();

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
 *     summary: Save or update automation configuration
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
router.post('/config', async (req: Request, res: Response) => {
  try {
    const config = await automationService.saveConfig(req.body);
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
 *     summary: Get automation status
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current automation status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await automationService.getStatus();
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
 *     summary: Start automation
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Automation started
 */
router.post('/start', async (_req: Request, res: Response) => {
  try {
    const config = await automationService.getActiveConfig();

    if (!config) {
      return res
        .status(404)
        .json({ error: 'No configuration found. Please configure automation first.' });
    }

    // Set config as active
    await automationService.saveConfig({ ...config, isActive: true });

    // Trigger immediate distribution for Smart Planner (if enabled)
    let scheduledCount = 0;
    if (config.postsPerHour && config.postsPerHour > 0) {
      logger.info('📅 Triggering initial Smart Planner distribution...');
      scheduledCount = await automationService.distributeHourlyPosts();
    }

    logger.info('✅ Automation started');
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
 *     summary: Stop automation
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Automation stopped
 */
router.post('/stop', async (_req: Request, res: Response) => {
  try {
    const config = await automationService.getActiveConfig();

    if (!config) {
      return res.json({ success: true, message: 'Automation was not running' });
    }

    // Set config as inactive
    await automationService.saveConfig({ ...config, isActive: false });

    logger.info('⏸️ Automation stopped');
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
 *     summary: Test automation (preview next posts)
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preview of next posts
 */
router.post('/test', async (_req: Request, res: Response) => {
  try {
    const config = await automationService.getActiveConfig();

    if (!config) {
      return res.status(404).json({ error: 'No configuration found' });
    }

    // Get next 5 offers that would be posted
    const nextOffers = await automationService.getNextScheduledOffers(config, 5);

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
