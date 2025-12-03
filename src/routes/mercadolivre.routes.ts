import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { MercadoLivreService } from '../services/mercadolivre/MercadoLivreService';
import { logger } from '../utils/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

const router = Router();
const mercadoLivreService = new MercadoLivreService();

// Helper to get Mercado Livre credentials
const getMercadoLivreConfig = () => {
  const configPath = join(process.cwd(), 'config.json');
  if (!existsSync(configPath)) {
    throw new Error('Config file not found');
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));

  if (!config.mercadolivre) {
    throw new Error('Mercado Livre config not found');
  }

  return {
    clientId: config.mercadolivre.clientId,
    clientSecret: config.mercadolivre.clientSecret,
    accessToken: config.mercadolivre.accessToken,
    refreshToken: config.mercadolivre.refreshToken,
    tokenExpiresAt: config.mercadolivre.tokenExpiresAt,
  };
};

/**
 * GET /api/mercadolivre/status
 * Diagnostic route to test token and check user status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const config = getMercadoLivreConfig();

    if (!config.accessToken) {
      return res.json({
        success: false,
        error: 'No access token configured',
        configured: false,
      });
    }

    // Test token by calling /users/me
    try {
      const userResponse = await axios.get('https://api.mercadolibre.com/users/me', {
        headers: {
          Authorization: `Bearer ${config.accessToken} `,
        },
      });

      const userData = userResponse.data;

      // Check token expiry
      const now = Date.now();
      const expiresAt = config.tokenExpiresAt || now;
      const isExpired = now >= expiresAt;
      const expiresInMinutes = Math.round((expiresAt - now) / 1000 / 60);

      return res.json({
        success: true,
        configured: true,
        token: {
          valid: true,
          expired: isExpired,
          expiresInMinutes: isExpired ? 0 : expiresInMinutes,
          expiresAt: new Date(expiresAt).toISOString(),
        },
        user: {
          id: userData.id,
          nickname: userData.nickname,
          email: userData.email,
          status: userData.status,
          siteId: userData.site_id,
          userType: userData.user_type,
        },
        permissions: {
          canRead: true, // If we got here, read permission works
          canWrite: userData.status === 'active', // Only active users can write
        },
      });
    } catch (apiError: any) {
      // Token is configured but API call failed
      const status = apiError.response?.status;
      const errorData = apiError.response?.data;

      return res.json({
        success: false,
        configured: true,
        token: {
          valid: false,
          error: errorData?.message || apiError.message,
          statusCode: status,
        },
        diagnosis: {
          403: status === 403 ? 'Token sem permissão (verificar scopes ou usuário inativo)' : null,
          401: status === 401 ? 'Token inválido ou expirado (renovar autenticação)' : null,
          other: status && status !== 403 && status !== 401 ? `Erro ${status}: ${errorData?.message} ` : null,
        },
      });
    }
  } catch (error: any) {
    logger.error('Error in /status:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/mercadolivre/auth/url
 * Get authorization URL for OAuth flow
 */
router.get('/auth/url', (req, res) => {
  try {
    const state = (req.query.state as string) || crypto.randomBytes(16).toString('hex');
    const { url: authUrl, codeVerifier } = mercadoLivreService.getAuthorizationUrl(state);

    // Save codeVerifier to config.json for later use in exchange
    const configPath = join(process.cwd(), 'config.json');
    let config: any = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.mercadolivre) {
      config.mercadolivre = {};
    }

    config.mercadolivre.codeVerifier = codeVerifier;
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return res.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error: any) {
    logger.error('Error generating auth URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/mercadolivre/auth/exchange
 * Exchange authorization code for access token (manual)
 */
router.post('/auth/exchange', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    // Exchange code for token
    const tokens = await mercadoLivreService.exchangeCodeForToken(code);

    // Save tokens to config.json
    const configPath = join(process.cwd(), 'config.json');
    let config: any = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.mercadolivre) {
      config.mercadolivre = {};
    }

    config.mercadolivre.accessToken = tokens.access_token;
    config.mercadolivre.refreshToken = tokens.refresh_token;
    config.mercadolivre.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    logger.info('✅ Mercado Livre tokens saved to config.json');

    return res.json({
      success: true,
      message: 'Authorization successful! Tokens saved.',
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        userId: tokens.user_id,
        scope: tokens.scope,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error exchanging code for token:', error);

    // Handle specific OAuth errors
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      const errorType = errorData?.error || '';
      const errorDescription = errorData?.error_description || '';

      // OAuth specific errors
      if (errorType === 'invalid_grant' || errorDescription.includes('invalid_grant')) {
        return res.status(400).json({
          success: false,
          error: 'Código OAuth expirado ou já usado. Os códigos expiram em 10 minutos.',
          details: {
            error: 'invalid_grant',
            error_description: errorDescription,
          },
        });
      }

      if (errorType === 'invalid_client' || errorDescription.includes('invalid_client')) {
        return res.status(400).json({
          success: false,
          error: 'Client ID ou Client Secret inválidos. Verifique as credenciais.',
          details: errorData,
        });
      }

      return res.status(400).json({
        success: false,
        error: errorDescription || error.message || 'Erro ao trocar código por token',
        details: errorData,
      });
    }

    // Handle missing credentials
    if (error.message?.includes('Client ID or Client Secret not configured')) {
      return res.status(400).json({
        success: false,
        error: 'Client Secret não configurado. Por favor, salve o Client Secret primeiro.',
        details: { error: 'missing_credentials' },
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to exchange code for token',
      details: error.response?.data,
    });
  }
});

/**
 * GET /api/mercadolivre/auth/callback
 * Handle OAuth callback and exchange code for token
 */
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      logger.error('OAuth error:', error);
      return res.status(400).json({
        success: false,
        error: `OAuth error: ${error} `,
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code not provided',
      });
    }

    // Exchange code for token
    const tokens = await mercadoLivreService.exchangeCodeForToken(code as string);

    // Save tokens to config.json
    const configPath = join(process.cwd(), 'config.json');
    let config: any = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.mercadolivre) {
      config.mercadolivre = {};
    }

    config.mercadolivre.accessToken = tokens.access_token;
    config.mercadolivre.refreshToken = tokens.refresh_token;
    config.mercadolivre.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    logger.info('✅ Mercado Livre tokens saved to config.json');

    return res.json({
      success: true,
      message: 'Authorization successful! Tokens saved.',
      expiresIn: tokens.expires_in,
      userId: tokens.user_id,
    });
  } catch (error: any) {
    logger.error('Error in OAuth callback:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/mercadolivre/auth/refresh
 * Manually refresh access token
 */
router.post('/auth/refresh', async (_req, res) => {
  try {
    const tokens = await mercadoLivreService.refreshAccessToken();

    // Save tokens to config.json
    const configPath = join(process.cwd(), 'config.json');
    let config: any = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.mercadolivre) {
      config.mercadolivre = {};
    }

    config.mercadolivre.accessToken = tokens.access_token;
    config.mercadolivre.refreshToken = tokens.refresh_token;
    config.mercadolivre.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    logger.info('✅ Mercado Livre tokens refreshed and saved');

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error refreshing token:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/mercadolivre/auth/status
 * Check authentication status
 */
router.get('/auth/status', async (_req, res) => {
  try {
    const config = mercadoLivreService.getConfig();
    const now = Date.now();
    const expiresAt = config.tokenExpiresAt || 0;
    const isExpired = expiresAt && now >= expiresAt;
    const expiresIn = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;

    return res.json({
      authenticated: !!config.accessToken,
      hasRefreshToken: !!config.refreshToken,
      isExpired,
      expiresIn,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
  } catch (error: any) {
    logger.error('Error checking auth status:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as mercadoLivreRoutes };
