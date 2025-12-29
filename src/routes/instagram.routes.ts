import { Router, Request, Response } from 'express';
import { InstagramService } from '../services/messaging/InstagramService';
import { logger } from '../utils/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const router = Router();

// Singleton instance
let instagramService: InstagramService | null = null;

/**
 * Get Instagram service instance (singleton)
 */
function getInstagramService(): InstagramService {
    if (!instagramService) {
        instagramService = new InstagramService();
    }
    return instagramService;
}

/**
 * @swagger
 * /api/instagram/status:
 *   get:
 *     summary: Get Instagram connection status
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instagram status
 */
router.get('/status', async (_req: Request, res: Response) => {
    try {
        const service = getInstagramService();
        const configured = service.isConfigured();
        const authenticated = service.isAuthenticated();
        const rateLimit = service.getRateLimitStatus();

        let accountInfo = null;
        if (authenticated) {
            accountInfo = await service.getAccountInfo();
        }

        return res.json({
            success: true,
            configured,
            authenticated,
            account: accountInfo,
            rateLimit,
        });
    } catch (error: any) {
        logger.error('Error getting Instagram status:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/instagram/auth/url:
 *   get:
 *     summary: Get Instagram OAuth authorization URL
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authorization URL
 */
router.get('/auth/url', (req: Request, res: Response) => {
    try {
        const service = getInstagramService();

        if (!service.isConfigured()) {
            return res.status(400).json({
                success: false,
                error: 'Instagram não configurado. Configure o App ID e App Secret primeiro.',
            });
        }

        // Build redirect URI
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = `${protocol}://${host}`;
        const redirectUri = `${baseUrl}/api/instagram/auth/callback`;

        // Generate state for CSRF protection
        const state = Math.random().toString(36).substring(2, 15);

        // Store state in session or temp storage (simplified for now)
        const configPath = join(process.cwd(), 'config.json');
        let config: any = {};
        if (existsSync(configPath)) {
            config = JSON.parse(readFileSync(configPath, 'utf-8'));
        }
        config.instagram = config.instagram || {};
        config.instagram._oauthState = state;
        config.instagram._oauthRedirectUri = redirectUri;
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        const authUrl = service.getAuthorizationUrl(redirectUri, state);

        return res.json({
            success: true,
            authUrl,
            redirectUri,
        });
    } catch (error: any) {
        logger.error('Error generating Instagram auth URL:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/instagram/auth/callback:
 *   get:
 *     summary: Instagram OAuth callback
 *     tags: [Instagram]
 *     responses:
 *       302:
 *         description: Redirect to frontend
 */
router.get('/auth/callback', async (req: Request, res: Response) => {
    try {
        const { code, state, error, error_reason } = req.query;

        if (error) {
            logger.error(`Instagram OAuth error: ${error} - ${error_reason}`);
            return res.redirect(`/settings?tab=messaging&instagram_error=${encodeURIComponent(String(error_reason || error))}`);
        }

        if (!code) {
            return res.redirect('/settings?tab=messaging&instagram_error=no_code');
        }

        // Verify state
        const configPath = join(process.cwd(), 'config.json');
        let config: any = {};
        if (existsSync(configPath)) {
            config = JSON.parse(readFileSync(configPath, 'utf-8'));
        }

        const savedState = config.instagram?._oauthState;
        const redirectUri = config.instagram?._oauthRedirectUri;

        if (state && savedState && state !== savedState) {
            logger.warn('Instagram OAuth state mismatch');
            return res.redirect('/settings?tab=messaging&instagram_error=state_mismatch');
        }

        // Exchange code for token
        const service = getInstagramService();
        await service.exchangeCodeForToken(String(code), redirectUri);

        // Clean up temp state
        if (config.instagram) {
            delete config.instagram._oauthState;
            delete config.instagram._oauthRedirectUri;
            writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        }

        // Reload service credentials
        service.reloadCredentials();

        logger.info('✅ Instagram OAuth completed successfully');
        return res.redirect('/settings?tab=messaging&instagram_success=true');
    } catch (error: any) {
        logger.error('Instagram OAuth callback error:', error);
        return res.redirect(`/settings?tab=messaging&instagram_error=${encodeURIComponent(error.message)}`);
    }
});

/**
 * @swagger
 * /api/instagram/auth/exchange:
 *   post:
 *     summary: Exchange authorization code for token (manual)
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/auth/exchange', async (req: Request, res: Response) => {
    try {
        const { code, redirectUri } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code is required',
            });
        }

        const service = getInstagramService();

        // Use provided redirectUri or try to get from config
        let finalRedirectUri = redirectUri;
        if (!finalRedirectUri) {
            const configPath = join(process.cwd(), 'config.json');
            if (existsSync(configPath)) {
                const config = JSON.parse(readFileSync(configPath, 'utf-8'));
                finalRedirectUri = config.instagram?._oauthRedirectUri;
            }
        }

        if (!finalRedirectUri) {
            return res.status(400).json({
                success: false,
                error: 'Redirect URI is required. Please start OAuth flow first.',
            });
        }

        const tokenResponse = await service.exchangeCodeForToken(code, finalRedirectUri);
        service.reloadCredentials();

        return res.json({
            success: true,
            message: 'Instagram conectado com sucesso!',
            expiresIn: tokenResponse.expires_in,
        });
    } catch (error: any) {
        logger.error('Error exchanging Instagram code:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/instagram/auth/disconnect:
 *   post:
 *     summary: Disconnect Instagram account
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/auth/disconnect', async (_req: Request, res: Response) => {
    try {
        const service = getInstagramService();
        await service.disconnect();

        return res.json({
            success: true,
            message: 'Instagram desconectado com sucesso',
        });
    } catch (error: any) {
        logger.error('Error disconnecting Instagram:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/instagram/webhook:
 *   get:
 *     summary: Verify webhook (Meta challenge)
 *     tags: [Instagram]
 */
router.get('/webhook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const service = getInstagramService();
    const result = service.verifyWebhook(mode, token, challenge);

    if (result) {
        return res.status(200).send(result);
    }

    return res.sendStatus(403);
});

/**
 * @swagger
 * /api/instagram/webhook:
 *   post:
 *     summary: Receive webhook events from Meta
 *     tags: [Instagram]
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const service = getInstagramService();
        await service.handleWebhook(req.body);

        // Always respond with 200 OK to acknowledge receipt
        return res.sendStatus(200);
    } catch (error: any) {
        logger.error('Error handling Instagram webhook:', error);
        // Still respond with 200 to prevent retries
        return res.sendStatus(200);
    }
});

/**
 * @swagger
 * /api/instagram/test:
 *   post:
 *     summary: Test Instagram connection
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/test', async (_req: Request, res: Response) => {
    try {
        const service = getInstagramService();

        if (!service.isAuthenticated()) {
            return res.status(400).json({
                success: false,
                error: 'Instagram não está conectado. Complete a autenticação OAuth primeiro.',
            });
        }

        const success = await service.sendTestMessage();

        if (success) {
            const accountInfo = await service.getAccountInfo();
            return res.json({
                success: true,
                message: `Conexão verificada! Conectado como @${accountInfo?.username}`,
                account: accountInfo,
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Falha ao verificar conexão. Verifique os logs.',
            });
        }
    } catch (error: any) {
        logger.error('Error testing Instagram:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/instagram/config:
 *   post:
 *     summary: Update Instagram configuration
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/config', async (req: Request, res: Response) => {
    try {
        const { appId, appSecret, webhookVerifyToken, accessToken, igUserId } = req.body;

        const configPath = join(process.cwd(), 'config.json');
        let config: any = {};

        if (existsSync(configPath)) {
            config = JSON.parse(readFileSync(configPath, 'utf-8'));
        }

        config.instagram = config.instagram || {};

        // Only update if provided and not masked
        if (appId && appId !== '***') {
            config.instagram.appId = appId;
        }
        if (appSecret && appSecret !== '***') {
            config.instagram.appSecret = appSecret;
        }
        if (webhookVerifyToken !== undefined) {
            config.instagram.webhookVerifyToken = webhookVerifyToken;
        }

        // Manual token flow - directly save accessToken and igUserId
        if (accessToken && accessToken !== '***') {
            config.instagram.accessToken = accessToken;
            logger.info('✅ Instagram manual access token saved');
        }
        if (igUserId && igUserId !== '***') {
            config.instagram.igUserId = igUserId;
            logger.info('✅ Instagram IG User ID saved');
        }

        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        // Update environment variables for immediate use
        if (accessToken && accessToken !== '***') {
            process.env.INSTAGRAM_ACCESS_TOKEN = accessToken;
        }
        if (igUserId && igUserId !== '***') {
            process.env.INSTAGRAM_IG_USER_ID = igUserId;
        }

        // Reload service credentials
        const service = getInstagramService();
        service.reloadCredentials();

        return res.json({
            success: true,
            message: 'Configuração atualizada com sucesso',
        });
    } catch (error: any) {
        logger.error('Error updating Instagram config:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/instagram/rate-limit:
 *   get:
 *     summary: Get rate limit status
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.get('/rate-limit', (_req: Request, res: Response) => {
    try {
        const service = getInstagramService();
        const status = service.getRateLimitStatus();

        return res.json({
            success: true,
            ...status,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/instagram/settings:
 *   get:
 *     summary: Get Instagram personalization settings
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.get('/settings', (_req: Request, res: Response) => {
    try {
        const service = getInstagramService();
        const settings = service.getSettings();

        return res.json({
            success: true,
            settings,
        });
    } catch (error: any) {
        logger.error('Error getting Instagram settings:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/instagram/settings:
 *   post:
 *     summary: Update Instagram personalization settings
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 */
router.post('/settings', async (req: Request, res: Response) => {
    try {
        const { enabled, autoReplyDM, welcomeMessage, keywordReplies } = req.body;
        const service = getInstagramService();

        const updates: any = {};
        if (typeof enabled === 'boolean') updates.enabled = enabled;
        if (typeof autoReplyDM === 'boolean') updates.autoReplyDM = autoReplyDM;
        if (welcomeMessage !== undefined) updates.welcomeMessage = welcomeMessage;
        if (keywordReplies !== undefined) updates.keywordReplies = keywordReplies;

        await service.updateSettings(updates);

        return res.json({
            success: true,
            message: 'Configurações atualizadas com sucesso',
            settings: service.getSettings(),
        });
    } catch (error: any) {
        logger.error('Error updating Instagram settings:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

export default router;

