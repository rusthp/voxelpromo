import { Router } from 'express';
import { OfferModel } from '../models/Offer';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import { AffiliateHealthCheckService } from '../services/link/AffiliateHealthCheckService';

const router = Router();
const startTime = Date.now();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Main health check endpoint - overall system status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System health status
 */
router.get('/', async (_req, res) => {
    try {
        const services: Record<string, string> = {};

        // Check database
        const dbState = mongoose.connection.readyState;
        services.database = dbState === 1 ? 'connected' : 'disconnected';

        // Check environment variables for configured services
        services.telegram = process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not_configured';
        services.ai = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY ? 'configured' : 'not_configured';
        services.amazon = process.env.AMAZON_ACCESS_KEY ? 'configured' : 'not_configured';
        services.aliexpress = process.env.ALIEXPRESS_APP_KEY ? 'configured' : 'not_configured';
        services.mercadolivre = process.env.MERCADOLIVRE_CLIENT_ID ? 'configured' : 'not_configured';
        services.whatsapp = process.env.WHATSAPP_ENABLED === 'true' ? 'configured' : 'not_configured';

        // Calculate uptime
        const uptime = Math.floor((Date.now() - startTime) / 1000); // seconds

        // Overall status
        const status = services.database === 'connected' ? 'healthy' : 'degraded';

        res.json({
            status,
            timestamp: new Date().toISOString(),
            uptime,
            services,
            version: '1.0.0',
        });
    } catch (error: any) {
        logger.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/health/sources:
 *   get:
 *     summary: Check health status of all collection sources
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status of all sources
 */
router.get('/sources', async (_req, res) => {
    try {
        const sources = ['aliexpress', 'shopee', 'amazon', 'rss', 'mercadolivre'];
        const results = [];
        let overallStatus = 'healthy';

        for (const source of sources) {
            try {
                // Get last collection time and count for this source
                const lastOffer = await OfferModel.findOne({ source })
                    .sort({ createdAt: -1 })
                    .select('createdAt')
                    .lean();

                const offersCount = await OfferModel.countDocuments({
                    source,
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
                });

                // Source is considered healthy if it has collected offers in the last 24h
                const isHealthy = offersCount > 0;

                results.push({
                    name: source,
                    enabled: true,
                    status: isHealthy ? 'healthy' : 'warning',
                    lastCollection: lastOffer?.createdAt,
                    offersCount,
                });
            } catch (error: any) {
                logger.error(`Health check failed for source ${source}:`, error);
                results.push({
                    name: source,
                    enabled: true,
                    status: 'error',
                    lastCollection: null,
                    offersCount: 0,
                    errorMessage: error.message,
                });
                overallStatus = 'degraded';
            }
        }

        // Determine overall status
        const errorCount = results.filter((r) => r.status === 'error').length;
        if (errorCount === results.length) {
            overallStatus = 'unhealthy';
        } else if (errorCount > 0) {
            overallStatus = 'degraded';
        }

        res.json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            sources: results,
        });
    } catch (error: any) {
        logger.error('Health check error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/health/database:
 *   get:
 *     summary: Check database connection health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database health status
 */
router.get('/database', async (_req, res) => {
    try {
        // Simple database ping
        const result = await OfferModel.countDocuments();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            totalOffers: result,
        });
    } catch (error: any) {
        logger.error('Database health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check with system metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed system health and metrics
 */
router.get('/detailed', async (_req, res) => {
    try {
        const memUsage = process.memoryUsage();
        const uptime = Math.floor((Date.now() - startTime) / 1000);

        // Database check
        const dbState = mongoose.connection.readyState;
        const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

        // Get offer stats
        const [totalOffers, postedOffers, activeOffers] = await Promise.all([
            OfferModel.countDocuments(),
            OfferModel.countDocuments({ isPosted: true }),
            OfferModel.countDocuments({ isActive: true }),
        ]);

        // Response times (simple tracking)
        const checks = {
            database: dbStatus === 'connected',
            memory: memUsage.heapUsed < memUsage.heapTotal * 0.9, // Less than 90% heap usage
        };

        const overallStatus = Object.values(checks).every(c => c) ? 'healthy' : 'degraded';

        res.json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.1.0',
            uptime: {
                seconds: uptime,
                formatted: formatUptime(uptime),
            },
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                pid: process.pid,
            },
            memory: {
                heapUsed: formatBytes(memUsage.heapUsed),
                heapTotal: formatBytes(memUsage.heapTotal),
                rss: formatBytes(memUsage.rss),
                external: formatBytes(memUsage.external),
                heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
            },
            database: {
                status: dbStatus,
                totalOffers,
                postedOffers,
                activeOffers,
                pendingOffers: activeOffers - postedOffers,
            },
            checks,
        });
    } catch (error: any) {
        logger.error('Detailed health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Kubernetes/Docker readiness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (_req, res) => {
    try {
        // Check if database is connected
        const dbReady = mongoose.connection.readyState === 1;

        if (!dbReady) {
            return res.status(503).json({
                status: 'not_ready',
                reason: 'Database not connected',
            });
        }

        // Quick database ping
        await mongoose.connection.db?.admin().ping();

        return res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        return res.status(503).json({
            status: 'not_ready',
            reason: error.message,
        });
    }
});

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Kubernetes/Docker liveness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (_req, res) => {
    // Simple liveness check - if the server can respond, it's alive
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
    });
});

// Helper functions
function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}

// ============================================================
// AFFILIATE LINK HEALTH CHECK ENDPOINTS
// ============================================================

const affiliateHealthService = new AffiliateHealthCheckService();

/**
 * @swagger
 * /api/health/links:
 *   get:
 *     summary: Get affiliate link health report
 *     tags: [Health]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Max number of links to check
 *     responses:
 *       200:
 *         description: Link health report
 */
router.get('/links', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const report = await affiliateHealthService.generateHealthReport(limit);

        return res.json({
            success: true,
            ...report
        });
    } catch (error: any) {
        logger.error('Link health check error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/health/links/broken:
 *   get:
 *     summary: Get only broken affiliate links
 *     tags: [Health]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: List of broken links
 */
router.get('/links/broken', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const brokenLinks = await affiliateHealthService.getBrokenLinks(limit);

        return res.json({
            success: true,
            count: brokenLinks.length,
            brokenLinks
        });
    } catch (error: any) {
        logger.error('Broken links check error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/health/links/verify:
 *   post:
 *     summary: Verify a single affiliate link
 *     tags: [Health]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Link verification result
 */
router.post('/links/verify', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const result = await affiliateHealthService.verifyLink(url, false);

        return res.json({
            success: true,
            result
        });
    } catch (error: any) {
        logger.error('Single link verify error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/health/links/batch-verify:
 *   post:
 *     summary: Verify multiple affiliate links
 *     tags: [Health]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Batch verification results
 */
router.post('/links/batch-verify', async (req, res) => {
    try {
        const { urls } = req.body;

        if (!urls || !Array.isArray(urls)) {
            return res.status(400).json({ error: 'urls array is required' });
        }

        if (urls.length > 50) {
            return res.status(400).json({ error: 'Maximum 50 URLs allowed per batch' });
        }

        const results = await affiliateHealthService.verifyBatch(urls, 5);
        const healthy = results.filter(r => r.isValid).length;
        const broken = results.filter(r => !r.isValid).length;

        return res.json({
            success: true,
            total: results.length,
            healthy,
            broken,
            percentage: results.length > 0 ? Math.round((healthy / results.length) * 100) : 100,
            results
        });
    } catch (error: any) {
        logger.error('Batch verify error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/health/links/cache:
 *   get:
 *     summary: Get link verification cache statistics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Cache statistics
 */
router.get('/links/cache', (_req, res) => {
    const stats = affiliateHealthService.getCacheStats();
    res.json({
        success: true,
        ...stats
    });
});

/**
 * @swagger
 * /api/health/links/cache:
 *   delete:
 *     summary: Clear link verification cache
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Cache cleared
 */
router.delete('/links/cache', (_req, res) => {
    affiliateHealthService.clearCache();
    res.json({
        success: true,
        message: 'Cache cleared'
    });
});

export { router as healthRoutes };
