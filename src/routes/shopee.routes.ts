import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUserSettingsService } from '../services/user/UserSettingsService';
import { logger } from '../utils/logger';
import { ShopeeService } from '../services/shopee/ShopeeService';

const router = Router();

/**
 * GET /api/shopee/config
 * Get Shopee configuration for the user
 */
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const settingsService = getUserSettingsService();
        const settings = await settingsService.getSettings(userId);

        return res.json({
            success: true,
            config: settings?.shopee || {
                isConfigured: false,
                feedUrls: [],
                apiEnabled: false
            }
        });
    } catch (error: any) {
        logger.error(`Error fetching Shopee config: ${error.message}`);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/**
 * POST /api/shopee/config
 * Update Shopee configuration
 */
router.post('/config', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const {
            appId,
            appSecret,
            apiEnabled,
            feedUrls,
            affiliateCode,
            minDiscount,
            maxPrice,
            minPrice,
            cacheEnabled
        } = req.body;

        const settingsService = getUserSettingsService();
        const currentSettings = await settingsService.getSettings(userId);

        await settingsService.updateSettings(userId, {
            shopee: {
                ...currentSettings?.shopee,
                appId,
                appSecret,
                apiEnabled,
                feedUrls: Array.isArray(feedUrls) ? feedUrls : [],
                affiliateCode,
                minDiscount,
                maxPrice,
                minPrice,
                cacheEnabled,
                isConfigured: !!(affiliateCode || (appId && appSecret))
            }
        });

        return res.json({
            success: true,
            message: 'Shopee settings updated successfully'
        });
    } catch (error: any) {
        logger.error(`Error updating Shopee config: ${error.message}`);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

/**
 * POST /api/shopee/test
 * Test Shopee connection/scraping
 */
router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        // Create service for user
        const shopeeService = await ShopeeService.createForUser(userId);

        // Fetch products as a test (limit 5)
        const products = await shopeeService.getProducts('electronics', 5);

        return res.json({
            success: true,
            count: products.length,
            sample: products.slice(0, 2)
        });
    } catch (error: any) {
        logger.error(`Error testing Shopee: ${error.message}`);
        return res.status(500).json({ success: false, error: error.message });
    }
});

export const shopeeRoutes = router;
