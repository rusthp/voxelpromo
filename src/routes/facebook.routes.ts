import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUserSettingsService } from '../services/user/UserSettingsService';
import { logger } from '../utils/logger';

const router = Router();

const GRAPH_API = 'https://graph.facebook.com/v19.0';

// ─── OAuth Flow ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/facebook/auth/start:
 *   get:
 *     summary: Start Facebook OAuth flow
 *     tags: [Facebook]
 *     security:
 *       - bearerAuth: []
 */
router.get('/auth/start', authenticate, (req: AuthRequest, res: Response) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return res.status(503).json({
      success: false,
      message: 'Facebook App não configurado no servidor. Defina FACEBOOK_APP_ID e FACEBOOK_REDIRECT_URI.',
    });
  }

  const state = Buffer.from(JSON.stringify({ userId: req.user!.id })).toString('base64');
  const scopes = ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'].join(',');

  const authUrl =
    `https://www.facebook.com/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code`;

  return res.json({ success: true, authUrl });
});

/**
 * @swagger
 * /api/facebook/auth/callback:
 *   get:
 *     summary: Facebook OAuth callback — exchanges code for page token
 *     tags: [Facebook]
 */
router.get('/auth/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    logger.warn(`Facebook OAuth denied: ${error}`);
    return res.redirect(`${process.env.FRONTEND_URL}/settings/facebook?error=access_denied`);
  }

  if (!code || !state) {
    return res.status(400).json({ success: false, message: 'code e state são obrigatórios.' });
  }

  let userId: string;
  try {
    userId = JSON.parse(Buffer.from(state, 'base64').toString()).userId;
  } catch {
    return res.status(400).json({ success: false, message: 'state inválido.' });
  }

  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI!;

  try {
    // 1. Exchange code for short-lived user token
    const tokenRes = await axios.get(`${GRAPH_API}/oauth/access_token`, {
      params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
      timeout: 10000,
    });
    const shortToken: string = tokenRes.data.access_token;

    // 2. Exchange for long-lived user token
    const longRes = await axios.get(`${GRAPH_API}/oauth/access_token`, {
      params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken },
      timeout: 10000,
    });
    const longToken: string = longRes.data.access_token;

    // 3. Fetch pages managed by this user
    const pagesRes = await axios.get(`${GRAPH_API}/me/accounts`, {
      params: { access_token: longToken, fields: 'id,name,access_token' },
      timeout: 10000,
    });

    const pages: { id: string; name: string; access_token: string }[] = pagesRes.data.data;

    if (!pages.length) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/facebook?error=no_pages`);
    }

    // If user manages a single page, auto-select it; otherwise redirect to page selection
    const page = pages[0];

    // 4. Save to UserSettings
    const settingsService = getUserSettingsService();
    await settingsService.updateSettings(userId, {
      facebook: {
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        appId,
        appSecret,
        tokenStatus: 'active',
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // ~60 days
        isConfigured: true,
      },
    });

    logger.info(`✅ Facebook connected for user ${userId} → Page: ${page.name} (${page.id})`);

    if (pages.length > 1) {
      // Redirect to page selector with all pages as query param
      const encoded = encodeURIComponent(JSON.stringify(pages.map((p) => ({ id: p.id, name: p.name }))));
      return res.redirect(`${process.env.FRONTEND_URL}/settings/facebook?pages=${encoded}&connected=true`);
    }

    return res.redirect(`${process.env.FRONTEND_URL}/settings/facebook?connected=true`);
  } catch (err: any) {
    const fbErr = err.response?.data?.error;
    logger.error(`❌ Facebook OAuth callback failed: ${fbErr?.message || err.message}`);
    return res.redirect(`${process.env.FRONTEND_URL}/settings/facebook?error=oauth_failed`);
  }
});

/**
 * @swagger
 * /api/facebook/auth/select-page:
 *   post:
 *     summary: Select which Facebook Page to use (when user manages multiple pages)
 *     tags: [Facebook]
 *     security:
 *       - bearerAuth: []
 */
router.post('/auth/select-page', authenticate, async (req: AuthRequest, res: Response) => {
  const { pageId, pageName, pageAccessToken } = req.body;

  if (!pageId || !pageName || !pageAccessToken) {
    return res.status(400).json({ success: false, message: 'pageId, pageName e pageAccessToken são obrigatórios.' });
  }

  try {
    const settingsService = getUserSettingsService();
    await settingsService.updateSettings(req.user!.id, {
      facebook: {
        pageId,
        pageName,
        pageAccessToken,
        tokenStatus: 'active',
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isConfigured: true,
      },
    });

    return res.json({ success: true, message: `Página "${pageName}" selecionada com sucesso.` });
  } catch (err: any) {
    logger.error(`❌ Facebook select-page failed: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao salvar página.' });
  }
});

// ─── Status ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/facebook/status:
 *   get:
 *     summary: Get Facebook connection status
 *     tags: [Facebook]
 *     security:
 *       - bearerAuth: []
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settingsService = getUserSettingsService();
    const settings = await settingsService.getSettings(req.user!.id);
    const fb = settings?.facebook;

    if (!fb?.isConfigured) {
      return res.json({ success: true, configured: false, authenticated: false, account: null });
    }

    return res.json({
      success: true,
      configured: true,
      authenticated: fb.tokenStatus !== 'expired',
      account: {
        pageId: fb.pageId,
        pageName: fb.pageName,
        tokenStatus: fb.tokenStatus || 'active',
        tokenExpiresAt: fb.tokenExpiresAt,
      },
    });
  } catch (err: any) {
    logger.error(`❌ Facebook status error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao verificar status.' });
  }
});

// ─── Disconnect ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/facebook/disconnect:
 *   delete:
 *     summary: Disconnect Facebook Page
 *     tags: [Facebook]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settingsService = getUserSettingsService();
    await settingsService.updateSettings(req.user!.id, {
      facebook: {
        pageId: undefined,
        pageName: undefined,
        pageAccessToken: undefined,
        appId: undefined,
        appSecret: undefined,
        tokenStatus: undefined,
        tokenExpiresAt: undefined,
        isConfigured: false,
      },
    });

    logger.info(`🔌 Facebook disconnected for user ${req.user!.id}`);
    return res.json({ success: true, message: 'Facebook desconectado com sucesso.' });
  } catch (err: any) {
    logger.error(`❌ Facebook disconnect error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao desconectar.' });
  }
});

// ─── Webhook Verification (Meta) ──────────────────────────────────────────────

/**
 * @swagger
 * /api/facebook/webhook:
 *   get:
 *     summary: Meta webhook verification (GET)
 *     tags: [Facebook]
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    logger.info('✅ Facebook webhook verified');
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ success: false, message: 'Token inválido.' });
});

export default router;
