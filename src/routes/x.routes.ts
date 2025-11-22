import { Router } from 'express';
import { XService } from '../services/messaging/XService';
import { logger } from '../utils/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const router = Router();
const xService = new XService();
const configPath = join(process.cwd(), 'config.json');

/**
 * GET /api/x/auth/url
 * Get OAuth 2.0 authorization URL
 */
router.get('/auth/url', (req, res) => {
  try {
    const state = req.query.state as string || crypto.randomBytes(16).toString('hex');
    
    // Debug: Log credentials status
    const { readFileSync, existsSync } = require('fs');
    const { join } = require('path');
    const configPath = join(process.cwd(), 'config.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      logger.debug('OAuth 2.0 Config:', {
        hasClientId: !!config.x?.oauth2ClientId,
        clientIdLength: config.x?.oauth2ClientId?.length || 0,
        clientIdPreview: config.x?.oauth2ClientId?.substring(0, 10) || 'none',
        redirectUri: config.x?.oauth2RedirectUri || 'not set'
      });
    }
    
    const authUrl = xService.getAuthorizationUrl(state);
    
    logger.info('Generated OAuth 2.0 authorization URL');
    
    return res.json({
      success: true,
      authUrl,
      state
    });
  } catch (error: any) {
    logger.error('Error generating X OAuth 2.0 auth URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'OAuth 2.0 Client ID not configured'
    });
  }
});

/**
 * GET /api/x/auth/callback
 * Handle OAuth 2.0 callback and exchange code for token
 */
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      logger.error('X OAuth 2.0 error:', error);
      return res.send(`
        <html>
          <head><title>X OAuth Error</title></head>
          <body>
            <h1>Erro na Autenticação</h1>
            <p>Erro: ${error}</p>
            <p><a href="/settings">Voltar para Configurações</a></p>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.send(`
        <html>
          <head><title>X OAuth Error</title></head>
          <body>
            <h1>Erro na Autenticação</h1>
            <p>Código de autorização não fornecido</p>
            <p><a href="/settings">Voltar para Configurações</a></p>
          </body>
        </html>
      `);
    }

    // Exchange code for token
    const tokens = await xService.exchangeCodeForToken(code as string);
    
    // Save tokens to config.json
    let config: any = {};
    
    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.x) {
      config.x = {};
    }

    // Save OAuth 2.0 tokens
    config.x.oauth2AccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      config.x.oauth2RefreshToken = tokens.refresh_token;
    }
    config.x.oauth2TokenExpiresAt = Date.now() + (tokens.expires_in * 1000);
    config.x.oauth2Scope = tokens.scope;

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    logger.info('✅ X (Twitter) OAuth 2.0 tokens saved to config.json');

    // Load tokens into environment
    process.env.X_OAUTH2_ACCESS_TOKEN = tokens.access_token;
    if (tokens.refresh_token) {
      process.env.X_OAUTH2_REFRESH_TOKEN = tokens.refresh_token;
    }

    return res.send(`
      <html>
        <head><title>X OAuth Success</title></head>
        <body>
          <h1>✅ Autenticação Bem-Sucedida!</h1>
          <p>Tokens salvos com sucesso. Você pode fechar esta janela.</p>
          <p><a href="/settings">Voltar para Configurações</a></p>
          <script>
            // Auto-close after 3 seconds if opened in popup
            if (window.opener) {
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    logger.error('Error in X OAuth 2.0 callback:', error);
    return res.send(`
      <html>
        <head><title>X OAuth Error</title></head>
        <body>
          <h1>Erro na Autenticação</h1>
          <p>${error.message || 'Erro desconhecido'}</p>
          <p><a href="/settings">Voltar para Configurações</a></p>
        </body>
      </html>
    `);
  }
});

/**
 * POST /api/x/auth/exchange
 * Manually exchange authorization code for access token
 */
router.post('/auth/exchange', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    const tokens = await xService.exchangeCodeForToken(code);
    
    // Save tokens to config.json
    let config: any = {};
    
    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    if (!config.x) {
      config.x = {};
    }

    config.x.oauth2AccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      config.x.oauth2RefreshToken = tokens.refresh_token;
    }
    config.x.oauth2TokenExpiresAt = Date.now() + (tokens.expires_in * 1000);
    config.x.oauth2Scope = tokens.scope;

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Load tokens into environment
    process.env.X_OAUTH2_ACCESS_TOKEN = tokens.access_token;
    if (tokens.refresh_token) {
      process.env.X_OAUTH2_REFRESH_TOKEN = tokens.refresh_token;
    }

    logger.info('✅ X (Twitter) OAuth 2.0 tokens saved to config.json');

    return res.json({
      success: true,
      message: 'Tokens saved successfully',
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    });
  } catch (error: any) {
    logger.error('Error exchanging X OAuth 2.0 code for token:', error);
    
    // Handle specific OAuth errors
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      const errorType = errorData?.error || '';
      const errorDescription = errorData?.error_description || '';
      
      if (errorType === 'invalid_grant' || errorDescription.includes('invalid_grant')) {
        return res.status(400).json({
          success: false,
          error: 'Código OAuth expirado ou já usado. Os códigos expiram rapidamente.',
          details: {
            error: 'invalid_grant',
            error_description: errorDescription
          }
        });
      }
      
      if (errorType === 'invalid_client' || errorDescription.includes('invalid_client')) {
        return res.status(400).json({
          success: false,
          error: 'Client ID ou Client Secret inválidos. Verifique as credenciais.',
          details: errorData
        });
      }
      
      return res.status(400).json({
        success: false,
        error: errorDescription || error.message || 'Erro ao trocar código por token',
        details: errorData
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro desconhecido',
      details: error.response?.data
    });
  }
});

/**
 * POST /api/x/auth/refresh
 * Refresh OAuth 2.0 access token
 */
router.post('/auth/refresh', async (_req, res) => {
  try {
    let config: any = {};
    
    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    const refreshToken = config.x?.oauth2RefreshToken || process.env.X_OAUTH2_REFRESH_TOKEN;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token not found. Please re-authenticate.'
      });
    }

    const tokens = await xService.refreshAccessToken(refreshToken);

    // Update config.json
    if (!config.x) {
      config.x = {};
    }

    config.x.oauth2AccessToken = tokens.access_token;
    config.x.oauth2RefreshToken = tokens.refresh_token;
    config.x.oauth2TokenExpiresAt = Date.now() + (tokens.expires_in * 1000);
    config.x.oauth2Scope = tokens.scope;

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Update environment
    process.env.X_OAUTH2_ACCESS_TOKEN = tokens.access_token;
    process.env.X_OAUTH2_REFRESH_TOKEN = tokens.refresh_token;

    logger.info('✅ X (Twitter) OAuth 2.0 access token refreshed');

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    });
  } catch (error: any) {
    logger.error('Error refreshing X OAuth 2.0 token:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao atualizar token'
    });
  }
});

export { router as xRoutes };

