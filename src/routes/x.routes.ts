import { Router } from 'express';
import { XService } from '../services/messaging/XService';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUserSettingsService } from '../services/user/UserSettingsService';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/x/config
 * Get X (Twitter) configuration
 */
router.get('/config', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const settingsService = getUserSettingsService();
    const settings = await settingsService.getSettings(userId);

    // Return safe settings
    const xSettings = settings?.x || { isConfigured: false } as any;

    return res.json({
      success: true,
      config: {
        bearerToken: xSettings.bearerToken ? '********' : undefined,
        apiKey: xSettings.apiKey ? '********' : undefined,
        apiKeySecret: xSettings.apiKeySecret ? '********' : undefined,
        accessToken: xSettings.accessToken ? '********' : undefined,
        accessTokenSecret: xSettings.accessTokenSecret ? '********' : undefined,
        hasApiKey: !!xSettings.apiKey,
        hasApiSecret: !!xSettings.apiKeySecret,
        hasAccessToken: !!xSettings.accessToken,
        hasAccessSecret: !!xSettings.accessTokenSecret,
        oauth2ClientId: xSettings.oauth2ClientId,
        hasOAuth2Secret: !!xSettings.oauth2ClientSecret,
        oauth2RedirectUri: xSettings.oauth2RedirectUri,
        isConfigured: xSettings.isConfigured
      }
    });
  } catch (error: any) {
    logger.error(`Error getting X config: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/x/config
 * Update X (Twitter) configuration
 */
router.post('/config', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      bearerToken,
      apiKey,
      apiKeySecret,
      accessToken,
      accessTokenSecret,
      oauth2ClientId,
      oauth2ClientSecret,
      oauth2RedirectUri
    } = req.body;

    const { getUserSettingsService } = await import('../services/user/UserSettingsService');
    const settingsService = getUserSettingsService();
    const currentSettings = await settingsService.getSettings(userId);
    const currentX = currentSettings?.x || {} as any;

    const newSettings = {
      ...currentX,
      bearerToken: bearerToken !== undefined ? bearerToken : currentX.bearerToken,
      apiKey: apiKey !== undefined ? apiKey : currentX.apiKey,
      apiKeySecret: apiKeySecret !== undefined ? apiKeySecret : currentX.apiKeySecret,
      accessToken: accessToken !== undefined ? accessToken : currentX.accessToken,
      accessTokenSecret: accessTokenSecret !== undefined ? accessTokenSecret : currentX.accessTokenSecret,
      oauth2ClientId: oauth2ClientId !== undefined ? oauth2ClientId : currentX.oauth2ClientId,
      oauth2ClientSecret: oauth2ClientSecret !== undefined ? oauth2ClientSecret : currentX.oauth2ClientSecret,
      oauth2RedirectUri: oauth2RedirectUri !== undefined ? oauth2RedirectUri : currentX.oauth2RedirectUri,
    };

    // Determine isConfigured
    const hasOAuth1 = !!(newSettings.apiKey && newSettings.apiKeySecret && newSettings.accessToken && newSettings.accessTokenSecret);
    const hasOAuth2 = !!(newSettings.oauth2ClientId && newSettings.oauth2ClientSecret);
    const hasBearer = !!newSettings.bearerToken;

    newSettings.isConfigured = hasOAuth1 || hasOAuth2 || hasBearer;

    await settingsService.updateSettings(userId, { x: newSettings });

    return res.json({
      success: true,
      message: 'X (Twitter) settings updated successfully',
      isConfigured: newSettings.isConfigured
    });
  } catch (error: any) {
    logger.error(`Error updating X config: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/x/auth/url
 * Get OAuth 2.0 authorization URL
 */
router.get('/auth/url', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const service = await XService.createForUser(userId);
    const state = (req.query.state as string) || crypto.randomBytes(16).toString('hex');

    // We pass state but typically we should also store it somewhere to verify callback.
    // For now, stateless generation.
    const authUrl = service.getAuthorizationUrl(state);

    return res.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error: any) {
    logger.error('Error generating X OAuth 2.0 auth URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'OAuth 2.0 Client ID not configured',
    });
  }
});

/**
 * GET /api/x/auth/callback
 * Handle OAuth 2.0 callback and exchange code for token
 * Note: This endpoint is hit by Twitter redirect, usually carries state but NOT Auth header.
 * Issue: How to identify user without Auth header?
 * Solution: The 'state' parameter should ideally encode the userId (encrypted or signed), OR we use a cookie.
 * HOWEVER, standard practice for API-based redirect is: Frontend handles the redirect?
 * No, Twitter redirects the browser.
 * If config says redirectUri is '.../api/x/auth/callback', then we land here without Auth Header.
 * 
 * WORKAROUND: We can't identify the user easily here without a session cookie or state param hack.
 * The UserSettings service needs userId.
 * 
 * Alternative: Frontend should handle the callback code reception?
 * The configured redirect URL is `http://localhost:3000/api/x/auth/callback` by default.
 * If I change it to a frontend route, I can grab the code in frontend, then call an authenticated API to exchange.
 * 
 * Given we are refactoring, we SHOULD enable the frontend flow:
 * 1. User clicks "Connect".
 * 2. Backend `/auth/url` returns URL.
 * 3. Frontend redirects.
 * 4. Twitter redirects back to Frontend Route (e.g. `/settings/twitter/callback`).
 * 5. Frontend takes `code` and POSTs to `/api/x/auth/exchange` WITH Bearer Token.
 * 
 * The existing implementation had backend handling callback and returning HTML. This implies the Redirect URI points to Backend.
 * To support multi-tenancy securely, we MUST know which user is authenticating.
 * Simple fix: Check if we can rely on `req.user`? No, callback request from browser *might* have cookies if using session auth, but we use JWT Bearer.
 * 
 * PROPOSAL: The HTML response approach is for popup flow where the user is logged in on the main window.
 * But we need to save the token to the DB.
 * 
 * Hack: Encode userId in `state`.
 */
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.send(`<html><body><h1>Error</h1><p>${error}</p></body></html>`);
    }

    // Attempt to decode userId from state if we implemented that. 
    // If not, we can't save to the correct user.
    // Assuming for now simply displaying the code for manual copy-paste OR relying on a frontend listener.
    // BUT the previous implementation saved to config.json (global).

    // BETTER APPROACH:
    // Return HTML that posts the code back to the parent window?
    // "window.opener.postMessage..."

    return res.send(`
      <html>
        <body>
          <h1>Autenticando...</h1>
          <script>
            // Send code to parent window
            if (window.opener) {
              window.opener.postMessage({ type: 'TWITTER_CALLBACK', code: '${code}', state: '${state}' }, '*');
              window.close();
            } else {
              document.write('<p>Código recebido: ${code}. Copie e cole na aplicação se necessário.</p>');
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    return res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * POST /api/x/auth/exchange
 * Authenticated endpoint to exchange code
 */
router.post('/auth/exchange', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }

    const service = await XService.createForUser(userId);
    const tokens = await service.exchangeCodeForToken(code);

    // Save tokens via UserSettingsService
    const { getUserSettingsService } = await import('../services/user/UserSettingsService');
    const settingsService = getUserSettingsService();
    const currentSettings = await settingsService.getSettings(userId);
    const existingX = currentSettings?.x || {} as any;

    const newSettings = {
      ...existingX,
      accessToken: existingX.accessToken, // Preserve OAuth1
      accessTokenSecret: existingX.accessTokenSecret, // Preserve OAuth1
      oauth2AccessToken: tokens.access_token,
      oauth2RefreshToken: tokens.refresh_token,
      oauth2TokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      oauth2Scope: tokens.scope,
      isConfigured: true // At least OAuth2 is configured
    };

    await settingsService.updateSettings(userId, { x: newSettings });

    return res.json({
      success: true,
      message: 'Tokens saved successfully',
      expiresIn: tokens.expires_in
    });
  } catch (error: any) {
    logger.error('Error exchanging X code:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/x/test
 * Test X connection
 */
router.post('/test', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const service = await XService.createForUser(userId);

    if (!service.isConfigured()) {
      return res.status(400).json({ success: false, message: 'X (Twitter) not configured' });
    }

    return res.json({
      success: true,
      message: 'X Service initialized properly (Credentials present)'
    });
  } catch (error: any) {
    logger.error(`Error testing X config: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export const xRoutes = router;

