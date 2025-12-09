import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import {
  validateTelegramBotToken,
  validateTelegramChatId,
  validateGroqApiKey,
  validateOpenAIApiKey
} from '../utils/validators';

const router = Router();
const configPath = join(process.cwd(), 'config.json');

/**
 * GET /api/config
 * Get current configuration
 */
router.get('/', (_req, res) => {
  try {
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      // Don't send sensitive data
      const safeConfig = {
        ...config,
        amazon: config.amazon
          ? {
            accessKey: config.amazon.accessKey ? '***' : '',
            secretKey: config.amazon.secretKey ? '***' : '',
            associateTag: config.amazon.associateTag || '',
            region: config.amazon.region || 'sa-east-1',
          }
          : {},
        aliexpress: config.aliexpress
          ? {
            appKey: config.aliexpress.appKey ? '***' : '',
            appSecret: config.aliexpress.appSecret ? '***' : '',
            trackingId: config.aliexpress.trackingId || '',
          }
          : {},
        mercadolivre: config.mercadolivre
          ? {
            clientId: config.mercadolivre.clientId || '',
            clientSecret: config.mercadolivre.clientSecret ? '***' : '',
            redirectUri: config.mercadolivre.redirectUri || '',
            affiliateCode: config.mercadolivre.affiliateCode || '',
            accessToken: config.mercadolivre.accessToken ? '***' : '',
            refreshToken: config.mercadolivre.refreshToken ? '***' : '',
            tokenExpiresAt: config.mercadolivre.tokenExpiresAt || null,
            // Internal API for affiliate links
            sessionCookies: config.mercadolivre.sessionCookies ? '***' : '',
            csrfToken: config.mercadolivre.csrfToken ? '***' : '',
            affiliateTag: config.mercadolivre.affiliateTag || '',
          }
          : {},
        telegram: config.telegram
          ? {
            botToken: config.telegram.botToken ? '***' : '',
            chatId: config.telegram.chatId || '',
          }
          : {},
        whatsapp: config.whatsapp
          ? {
            enabled: config.whatsapp.enabled || false,
            targetNumber: config.whatsapp.targetNumber || '',
            library: config.whatsapp.library || 'whatsapp-web.js',
          }
          : {},
        x: config.x
          ? {
            bearerToken: config.x.bearerToken ? '***' : '',
            apiKey: config.x.apiKey ? '***' : '',
            apiKeySecret: config.x.apiKeySecret ? '***' : '',
            accessToken: config.x.accessToken ? '***' : '',
            accessTokenSecret: config.x.accessTokenSecret ? '***' : '',
            oauth2ClientId: config.x.oauth2ClientId ? '***' : '',
            oauth2ClientSecret: config.x.oauth2ClientSecret ? '***' : '',
            oauth2RedirectUri:
              config.x.oauth2RedirectUri || 'http://localhost:3000/api/x/auth/callback',
            oauth2AccessToken: config.x.oauth2AccessToken ? '***' : '',
            oauth2RefreshToken: config.x.oauth2RefreshToken ? '***' : '',
            oauth2TokenExpiresAt: config.x.oauth2TokenExpiresAt || null,
            oauth2Scope: config.x.oauth2Scope || '',
          }
          : {},
        ai: config.ai
          ? {
            provider: config.ai.provider || 'groq',
            groqApiKey: config.ai.groqApiKey ? '***' : '',
            openaiApiKey: config.ai.openaiApiKey ? '***' : '',
          }
          : {},
        rss: config.rss || [],
        collection: config.collection || {
          enabled: true,
          schedule: '0 */6 * * *',
          sources: ['amazon', 'aliexpress', 'shopee', 'rss'],
        },
      };
      return res.json(safeConfig);
    } else {
      return res.json({
        amazon: {},
        aliexpress: {},
        mercadolivre: {},
        telegram: {},
        whatsapp: { enabled: false, library: 'whatsapp-web.js' },
        ai: { provider: 'groq' },
        rss: [],
        collection: {
          enabled: true,
          schedule: '0 */6 * * *',
          sources: ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'],
        },
      });
    }
  } catch (error: any) {
    logger.error('Error reading config:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/config
 * Save configuration
 */
router.post('/', (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is required' });
    }
    const config = req.body;

    // Log received values (for debugging)
    logger.info('Received config:', {
      telegram: {
        hasBotToken: !!config.telegram?.botToken,
        botTokenLength: config.telegram?.botToken?.length || 0,
        botTokenPreview: config.telegram?.botToken?.substring(0, 10) || 'empty',
        chatId: config.telegram?.chatId,
      },
      ai: {
        hasGroqKey: !!config.ai?.groqApiKey,
        groqKeyLength: config.ai?.groqApiKey?.length || 0,
        groqKeyPreview: config.ai?.groqApiKey?.substring(0, 10) || 'empty',
      },
    });

    // Validate inputs before saving
    const validationErrors: string[] = [];

    // Validate Telegram Bot Token (if provided and not masked)
    if (config.telegram?.botToken && config.telegram.botToken !== '***' && config.telegram.botToken.trim().length > 0) {
      const validation = validateTelegramBotToken(config.telegram.botToken);
      if (!validation.isValid) {
        validationErrors.push(`Telegram Bot Token: ${validation.error}`);
      }
    }

    // Validate Telegram Chat ID (if provided)
    if (config.telegram?.chatId && config.telegram.chatId.trim().length > 0) {
      const validation = validateTelegramChatId(config.telegram.chatId);
      if (!validation.isValid) {
        validationErrors.push(`Telegram Chat ID: ${validation.error}`);
      }
    }

    // Validate Groq API Key (if provided and not masked)
    if (config.ai?.groqApiKey && config.ai.groqApiKey !== '***' && config.ai.groqApiKey.trim().length > 0) {
      const validation = validateGroqApiKey(config.ai.groqApiKey);
      if (!validation.isValid) {
        validationErrors.push(`Groq API Key: ${validation.error}`);
      }
    }

    // Validate OpenAI API Key (if provided and not masked)
    if (config.ai?.openaiApiKey && config.ai.openaiApiKey !== '***' && config.ai.openaiApiKey.trim().length > 0) {
      const validation = validateOpenAIApiKey(config.ai.openaiApiKey);
      if (!validation.isValid) {
        validationErrors.push(`OpenAI API Key: ${validation.error}`);
      }
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      logger.warn('❌ Validation failed:', validationErrors);
      return res.status(400).json({
        success: false,
        error: 'Erro de validação',
        details: validationErrors,
        message: `Encontrados ${validationErrors.length} erro(s) de validação: ${validationErrors.join('; ')}`
      });
    }

    // Load existing config to preserve sensitive data
    let existingConfig: any = {};
    if (existsSync(configPath)) {
      existingConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      logger.info('Existing config loaded:', {
        telegram: {
          hasBotToken: !!existingConfig.telegram?.botToken,
          botTokenLength: existingConfig.telegram?.botToken?.length || 0,
        },
        ai: {
          hasGroqKey: !!existingConfig.ai?.groqApiKey,
          groqKeyLength: existingConfig.ai?.groqApiKey?.length || 0,
        },
      });
    }

    // Merge configs, only update fields that are provided
    const mergedConfig = {
      ...existingConfig,
      amazon: {
        ...existingConfig.amazon,
        ...config.amazon,
        // Only update keys if they're not masked
        accessKey:
          config.amazon?.accessKey && config.amazon.accessKey !== '***'
            ? config.amazon.accessKey
            : existingConfig.amazon?.accessKey || '',
        secretKey:
          config.amazon?.secretKey && config.amazon.secretKey !== '***'
            ? config.amazon.secretKey
            : existingConfig.amazon?.secretKey || '',
      },
      aliexpress: {
        ...existingConfig.aliexpress,
        ...config.aliexpress,
        appKey:
          config.aliexpress?.appKey && config.aliexpress.appKey !== '***'
            ? config.aliexpress.appKey
            : existingConfig.aliexpress?.appKey || '',
        appSecret:
          config.aliexpress?.appSecret && config.aliexpress.appSecret !== '***'
            ? config.aliexpress.appSecret
            : existingConfig.aliexpress?.appSecret || '',
      },
      mercadolivre: {
        ...existingConfig.mercadolivre,
        ...config.mercadolivre,
        clientId:
          config.mercadolivre?.clientId !== undefined
            ? config.mercadolivre.clientId || ''
            : existingConfig.mercadolivre?.clientId || '',
        clientSecret:
          config.mercadolivre?.clientSecret !== undefined
            ? config.mercadolivre.clientSecret !== '***' &&
              config.mercadolivre.clientSecret.trim().length > 0
              ? config.mercadolivre.clientSecret.trim()
              : ''
            : existingConfig.mercadolivre?.clientSecret || '',
        redirectUri:
          config.mercadolivre?.redirectUri !== undefined
            ? config.mercadolivre.redirectUri || ''
            : existingConfig.mercadolivre?.redirectUri || '',
        affiliateCode:
          config.mercadolivre?.affiliateCode !== undefined
            ? config.mercadolivre.affiliateCode || ''
            : existingConfig.mercadolivre?.affiliateCode || '',
        // Preserve tokens - they should only be updated via OAuth endpoints
        accessToken:
          config.mercadolivre?.accessToken !== undefined &&
            config.mercadolivre.accessToken !== '***'
            ? config.mercadolivre.accessToken
            : existingConfig.mercadolivre?.accessToken || '',
        refreshToken:
          config.mercadolivre?.refreshToken !== undefined &&
            config.mercadolivre.refreshToken !== '***'
            ? config.mercadolivre.refreshToken
            : existingConfig.mercadolivre?.refreshToken || '',
        tokenExpiresAt:
          config.mercadolivre?.tokenExpiresAt !== undefined
            ? config.mercadolivre.tokenExpiresAt
            : existingConfig.mercadolivre?.tokenExpiresAt || null,
        // Internal API for affiliate links (Phase 1 - Personal Use)
        sessionCookies:
          config.mercadolivre?.sessionCookies !== undefined
            ? config.mercadolivre.sessionCookies === '***'
              ? existingConfig.mercadolivre?.sessionCookies || ''
              : config.mercadolivre.sessionCookies || ''
            : existingConfig.mercadolivre?.sessionCookies || '',
        csrfToken:
          config.mercadolivre?.csrfToken !== undefined
            ? config.mercadolivre.csrfToken === '***'
              ? existingConfig.mercadolivre?.csrfToken || ''
              : config.mercadolivre.csrfToken || ''
            : existingConfig.mercadolivre?.csrfToken || '',
        affiliateTag:
          config.mercadolivre?.affiliateTag !== undefined
            ? config.mercadolivre.affiliateTag || ''
            : existingConfig.mercadolivre?.affiliateTag || '',
      },
      telegram: {
        ...existingConfig.telegram,
        ...config.telegram,
        // Handle botToken:
        // - If provided and valid (not masked, not empty after trim), use it
        // - If masked as '***', preserve existing value
        // - If explicitly set to empty string, clear it
        // - If undefined, preserve existing value
        botToken:
          config.telegram?.botToken !== undefined
            ? config.telegram.botToken === '***'
              ? existingConfig.telegram?.botToken || '' // Preserve if masked
              : config.telegram.botToken.trim().length > 0
                ? config.telegram.botToken.trim()
                : '' // Clear if empty
            : existingConfig.telegram?.botToken || '', // Preserve if undefined
        chatId:
          config.telegram?.chatId !== undefined
            ? config.telegram.chatId || ''
            : existingConfig.telegram?.chatId || '',
      },
      whatsapp: {
        ...existingConfig.whatsapp,
        ...config.whatsapp,
      },
      x: {
        ...existingConfig.x,
        ...config.x,
        // Handle X credentials - preserve if masked
        bearerToken:
          config.x?.bearerToken !== undefined
            ? config.x.bearerToken === '***'
              ? existingConfig.x?.bearerToken || '' // Preserve if masked
              : config.x.bearerToken.trim().length > 0
                ? config.x.bearerToken.trim()
                : '' // Clear if empty
            : existingConfig.x?.bearerToken || '',
        apiKey:
          config.x?.apiKey !== undefined
            ? config.x.apiKey === '***'
              ? existingConfig.x?.apiKey || '' // Preserve if masked
              : config.x.apiKey.trim().length > 0
                ? config.x.apiKey.trim()
                : ''
            : existingConfig.x?.apiKey || '',
        apiKeySecret:
          config.x?.apiKeySecret !== undefined
            ? config.x.apiKeySecret === '***'
              ? existingConfig.x?.apiKeySecret || '' // Preserve if masked
              : config.x.apiKeySecret.trim().length > 0
                ? config.x.apiKeySecret.trim()
                : ''
            : existingConfig.x?.apiKeySecret || '',
        accessToken:
          config.x?.accessToken !== undefined
            ? config.x.accessToken === '***'
              ? existingConfig.x?.accessToken || '' // Preserve if masked
              : config.x.accessToken.trim().length > 0
                ? config.x.accessToken.trim()
                : ''
            : existingConfig.x?.accessToken || '',
        accessTokenSecret:
          config.x?.accessTokenSecret !== undefined
            ? config.x.accessTokenSecret === '***'
              ? existingConfig.x?.accessTokenSecret || '' // Preserve if masked
              : config.x.accessTokenSecret.trim().length > 0
                ? config.x.accessTokenSecret.trim()
                : ''
            : existingConfig.x?.accessTokenSecret || '',
        // OAuth 2.0 credentials
        oauth2ClientId:
          config.x?.oauth2ClientId !== undefined
            ? config.x.oauth2ClientId === '***'
              ? existingConfig.x?.oauth2ClientId || '' // Preserve if masked
              : config.x.oauth2ClientId.trim().length > 0
                ? config.x.oauth2ClientId.trim()
                : ''
            : existingConfig.x?.oauth2ClientId || '',
        oauth2ClientSecret:
          config.x?.oauth2ClientSecret !== undefined
            ? config.x.oauth2ClientSecret === '***'
              ? existingConfig.x?.oauth2ClientSecret || '' // Preserve if masked
              : config.x.oauth2ClientSecret.trim().length > 0
                ? config.x.oauth2ClientSecret.trim()
                : ''
            : existingConfig.x?.oauth2ClientSecret || '',
        oauth2RedirectUri:
          config.x?.oauth2RedirectUri ||
          existingConfig.x?.oauth2RedirectUri ||
          'http://localhost:3000/api/x/auth/callback',
        // OAuth 2.0 tokens (preserve if they exist, don't overwrite with empty)
        oauth2AccessToken:
          config.x?.oauth2AccessToken !== undefined && config.x.oauth2AccessToken !== '***'
            ? config.x.oauth2AccessToken
            : existingConfig.x?.oauth2AccessToken || '',
        oauth2RefreshToken:
          config.x?.oauth2RefreshToken !== undefined && config.x.oauth2RefreshToken !== '***'
            ? config.x.oauth2RefreshToken
            : existingConfig.x?.oauth2RefreshToken || '',
        oauth2TokenExpiresAt:
          config.x?.oauth2TokenExpiresAt || existingConfig.x?.oauth2TokenExpiresAt || null,
        oauth2Scope: config.x?.oauth2Scope || existingConfig.x?.oauth2Scope || '',
      },
      ai: {
        ...existingConfig.ai,
        ...config.ai,
        // Handle groqApiKey:
        // - If provided and valid (not masked, not empty after trim), use it
        // - If masked as '***', preserve existing value
        // - If explicitly set to empty string, clear it
        // - If undefined, preserve existing value
        groqApiKey:
          config.ai?.groqApiKey !== undefined
            ? config.ai.groqApiKey === '***'
              ? existingConfig.ai?.groqApiKey || '' // Preserve if masked
              : config.ai.groqApiKey.trim().length > 0
                ? config.ai.groqApiKey.trim()
                : '' // Clear if empty
            : existingConfig.ai?.groqApiKey || '', // Preserve if undefined
        openaiApiKey:
          config.ai?.openaiApiKey !== undefined
            ? config.ai.openaiApiKey === '***'
              ? existingConfig.ai?.openaiApiKey || '' // Preserve if masked
              : config.ai.openaiApiKey.trim().length > 0
                ? config.ai.openaiApiKey.trim()
                : '' // Clear if empty
            : existingConfig.ai?.openaiApiKey || '', // Preserve if undefined
      },
      rss: config.rss || existingConfig.rss || [],
      collection: {
        ...existingConfig.collection,
        ...config.collection,
      },
      shopee: {
        ...existingConfig.shopee,
        ...config.shopee,
        feedUrls: config.shopee?.feedUrls || existingConfig.shopee?.feedUrls || [],
        affiliateCode: config.shopee?.affiliateCode || existingConfig.shopee?.affiliateCode,
        minDiscount: config.shopee?.minDiscount || existingConfig.shopee?.minDiscount,
        maxPrice: config.shopee?.maxPrice || existingConfig.shopee?.maxPrice,
        minPrice: config.shopee?.minPrice || existingConfig.shopee?.minPrice,
        cacheEnabled: config.shopee?.cacheEnabled !== undefined ? config.shopee.cacheEnabled : existingConfig.shopee?.cacheEnabled,
      },
    };

    // Save config to file
    writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2));
    logger.info('Configuration saved to config.json');
    logger.info('File path:', configPath.toString());

    // Log actual lengths (for debugging)
    const botTokenLength = mergedConfig.telegram?.botToken?.length || 0;
    const groqKeyLength = mergedConfig.ai?.groqApiKey?.length || 0;
    logger.info(`Telegram botToken length: ${botTokenLength}`);
    logger.info(`Groq API key length: ${groqKeyLength}`);

    // Log if values are empty (to help debug)
    if (botTokenLength === 0) {
      logger.warn('⚠️  Telegram botToken is empty!');
    }
    if (groqKeyLength === 0) {
      logger.warn('⚠️  Groq API key is empty!');
    }

    // Verify the file was written correctly
    if (existsSync(configPath)) {
      const verifyConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      logger.info('Verified saved config:', {
        telegramTokenLength: verifyConfig.telegram?.botToken?.length || 0,
        groqKeyLength: verifyConfig.ai?.groqApiKey?.length || 0,
      });
    }

    // Update environment variables (for current session)
    if (mergedConfig.amazon?.accessKey) {
      process.env.AMAZON_ACCESS_KEY = mergedConfig.amazon.accessKey;
      process.env.AMAZON_SECRET_KEY = mergedConfig.amazon.secretKey;
      process.env.AMAZON_ASSOCIATE_TAG = mergedConfig.amazon.associateTag;
      process.env.AMAZON_REGION = mergedConfig.amazon.region;
    }

    if (mergedConfig.aliexpress?.appKey) {
      process.env.ALIEXPRESS_APP_KEY = mergedConfig.aliexpress.appKey;
      process.env.ALIEXPRESS_APP_SECRET = mergedConfig.aliexpress.appSecret;
      process.env.ALIEXPRESS_TRACKING_ID = mergedConfig.aliexpress.trackingId;
    }

    if (mergedConfig.telegram?.botToken) {
      process.env.TELEGRAM_BOT_TOKEN = mergedConfig.telegram.botToken;
      process.env.TELEGRAM_CHAT_ID = mergedConfig.telegram.chatId;
    }

    if (mergedConfig.whatsapp?.enabled) {
      process.env.WHATSAPP_ENABLED = mergedConfig.whatsapp.enabled.toString();
      process.env.WHATSAPP_TARGET_NUMBER = mergedConfig.whatsapp.targetNumber;
      process.env.WHATSAPP_LIBRARY = mergedConfig.whatsapp.library || 'whatsapp-web.js';
    }

    if (mergedConfig.x?.bearerToken) {
      process.env.X_BEARER_TOKEN = mergedConfig.x.bearerToken;
    }

    if (mergedConfig.x?.apiKey) {
      process.env.X_API_KEY = mergedConfig.x.apiKey;
      process.env.X_API_KEY_SECRET = mergedConfig.x.apiKeySecret || '';
      process.env.X_ACCESS_TOKEN = mergedConfig.x.accessToken || '';
      process.env.X_ACCESS_TOKEN_SECRET = mergedConfig.x.accessTokenSecret || '';
    }

    if (mergedConfig.x?.oauth2ClientId) {
      process.env.X_OAUTH2_CLIENT_ID = mergedConfig.x.oauth2ClientId;
      process.env.X_OAUTH2_CLIENT_SECRET = mergedConfig.x.oauth2ClientSecret || '';
      process.env.X_OAUTH2_REDIRECT_URI =
        mergedConfig.x.oauth2RedirectUri || 'http://localhost:3000/api/x/auth/callback';
    }

    if (mergedConfig.x?.oauth2AccessToken) {
      process.env.X_OAUTH2_ACCESS_TOKEN = mergedConfig.x.oauth2AccessToken;
      if (mergedConfig.x.oauth2RefreshToken) {
        process.env.X_OAUTH2_REFRESH_TOKEN = mergedConfig.x.oauth2RefreshToken;
      }
    }

    if (mergedConfig.ai?.groqApiKey) {
      process.env.GROQ_API_KEY = mergedConfig.ai.groqApiKey;
    }

    if (mergedConfig.ai?.openaiApiKey) {
      process.env.OPENAI_API_KEY = mergedConfig.ai.openaiApiKey;
    }

    process.env.AI_PROVIDER = mergedConfig.ai?.provider || 'groq';

    logger.info('Configuration saved successfully');
    logger.info('Saved config sections:', Object.keys(mergedConfig));

    // Send response BEFORE any potential nodemon restart
    const response = res.json({
      success: true,
      message: 'Configuração salva com sucesso!',
      saved: {
        telegram: {
          hasToken: !!mergedConfig.telegram?.botToken,
          tokenLength: mergedConfig.telegram?.botToken?.length || 0,
        },
        ai: {
          hasGroqKey: !!mergedConfig.ai?.groqApiKey,
          groqKeyLength: mergedConfig.ai?.groqApiKey?.length || 0,
        },
      },
    });

    // Small delay to ensure response is sent (nodemon may restart after this)
    setTimeout(() => {
      logger.info('Response sent, config saved successfully');
    }, 100);

    return response;
  } catch (error: any) {
    logger.error('Error saving config:', error);
    const errorMessage = error.message || 'Erro desconhecido ao salvar configuração';
    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/config/test
 * Test configuration - Improved version with actual connection tests
 */
router.post('/test', async (req, res) => {
  try {
    const { service } = req.body;
    const results: any = {};

    // Load config to get actual credentials for testing
    let testConfig: any = {};
    if (existsSync(configPath)) {
      testConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    // Temporarily set environment variables from config for testing
    const originalEnv: any = {};

    if (testConfig.amazon?.accessKey) {
      originalEnv.AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
      originalEnv.AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
      originalEnv.AMAZON_ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG;
      originalEnv.AMAZON_REGION = process.env.AMAZON_REGION;

      process.env.AMAZON_ACCESS_KEY = testConfig.amazon.accessKey;
      process.env.AMAZON_SECRET_KEY = testConfig.amazon.secretKey;
      process.env.AMAZON_ASSOCIATE_TAG = testConfig.amazon.associateTag;
      process.env.AMAZON_REGION = testConfig.amazon.region || 'sa-east-1';
    }

    if (testConfig.telegram?.botToken) {
      originalEnv.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      originalEnv.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

      process.env.TELEGRAM_BOT_TOKEN = testConfig.telegram.botToken;
      process.env.TELEGRAM_CHAT_ID = testConfig.telegram.chatId;
    }

    if (testConfig.ai?.groqApiKey) {
      originalEnv.GROQ_API_KEY = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = testConfig.ai.groqApiKey;
    }

    if (testConfig.ai?.openaiApiKey) {
      originalEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = testConfig.ai.openaiApiKey;
    }

    if (testConfig.ai?.provider) {
      originalEnv.AI_PROVIDER = process.env.AI_PROVIDER;
      process.env.AI_PROVIDER = testConfig.ai.provider;
    }

    if (testConfig.x?.bearerToken) {
      originalEnv.X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
      process.env.X_BEARER_TOKEN = testConfig.x.bearerToken;
    }

    if (testConfig.x?.apiKey) {
      originalEnv.X_API_KEY = process.env.X_API_KEY;
      originalEnv.X_API_KEY_SECRET = process.env.X_API_KEY_SECRET;
      originalEnv.X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
      originalEnv.X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;

      process.env.X_API_KEY = testConfig.x.apiKey;
      process.env.X_API_KEY_SECRET = testConfig.x.apiKeySecret || '';
      process.env.X_ACCESS_TOKEN = testConfig.x.accessToken || '';
      process.env.X_ACCESS_TOKEN_SECRET = testConfig.x.accessTokenSecret || '';
    }

    try {
      // Test Amazon
      if (service === 'amazon' || !service) {
        try {
          if (!testConfig.amazon?.accessKey || !testConfig.amazon?.secretKey) {
            results.amazon = { success: false, message: 'Credenciais não configuradas' };
          } else {
            const { AmazonService } = await import('../services/amazon/AmazonService');
            const amazon = new AmazonService();
            // Try a simple search to test connection
            await amazon.searchProducts('electronics', 1);
            results.amazon = { success: true, message: '✅ Conexão com Amazon PA-API OK' };
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Erro desconhecido';
          let friendlyMsg = errorMsg;
          if (errorMsg.includes('401') || errorMsg.includes('Invalid')) {
            friendlyMsg = 'Credenciais inválidas';
          } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
            friendlyMsg = 'Acesso negado - verifique permissões';
          } else if (errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
            friendlyMsg = 'Erro de conexão - verifique internet';
          }
          results.amazon = { success: false, message: `❌ ${friendlyMsg}` };
        }
      }

      // Test X (Twitter)
      if (service === 'x' || service === 'twitter' || !service) {
        try {
          // Check if we have OAuth 1.0a credentials (preferred)
          if (
            testConfig.x?.apiKey &&
            testConfig.x?.apiKeySecret &&
            testConfig.x?.accessToken &&
            testConfig.x?.accessTokenSecret
          ) {
            const { TwitterApi } = await import('twitter-api-v2');
            const client = new TwitterApi({
              appKey: testConfig.x.apiKey,
              appSecret: testConfig.x.apiKeySecret,
              accessToken: testConfig.x.accessToken,
              accessSecret: testConfig.x.accessTokenSecret,
            });

            // Step 1: Verify authentication by getting user info
            const user = await client.v2.me();
            const username = user.data.username || user.data.name || 'usuário';

            // Step 2: Test if we can actually POST (most important test)
            try {
              const testTweetText = `🧪 Teste do VoxelPromo - ${new Date().toLocaleString('pt-BR')} - Este tweet será deletado automaticamente.`;

              // Create a test tweet
              const tweet = await client.v2.tweet({
                text: testTweetText,
              });

              const tweetId = tweet.data.id;

              // Immediately delete the test tweet
              try {
                await client.v2.deleteTweet(tweetId);
                logger.info(`✅ Test tweet created and deleted successfully (ID: ${tweetId})`);
              } catch (deleteError: any) {
                // Tweet was created but couldn't delete - still a success for posting
                logger.warn(
                  `⚠️ Test tweet created (ID: ${tweetId}) but couldn't delete: ${deleteError.message}`
                );
              }

              results.x = {
                success: true,
                message: `✅ X (Twitter) OAuth 1.0a configurado e testado! Usuário: @${username} - Postagem funcionando perfeitamente!`,
              };
            } catch (postError: any) {
              // Authentication works but posting doesn't
              const postErrorMsg = postError.message || '';
              if (postErrorMsg.includes('403') || postErrorMsg.includes('Forbidden')) {
                results.x = {
                  success: false,
                  message: `⚠️ Autenticação OK (@${username}), mas sem permissão para postar. Verifique as permissões do app no Twitter Developer Portal.`,
                };
              } else if (postErrorMsg.includes('429') || postErrorMsg.includes('Too Many Requests') || (postError as any).code === 429) {
                results.x = {
                  success: false,
                  message: `⚠️ Autenticação OK (@${username}), mas você atingiu o limite de postagens do Twitter (Rate Limit). O plano Grátis permite ~50 tweets/24h.`,
                };
              } else {
                results.x = {
                  success: false,
                  message: `⚠️ Autenticação OK (@${username}), mas erro ao testar postagem: ${postErrorMsg}`,
                };
              }
            }
          } else if (testConfig.x?.bearerToken) {
            // Fallback to Bearer Token
            const { TwitterApi } = await import('twitter-api-v2');
            const client = new TwitterApi(testConfig.x.bearerToken);

            // Try to get user info (may fail if Bearer Token is read-only)
            try {
              const user = await client.v2.me();
              const username = user.data.username || user.data.name || 'usuário';

              // Try to test posting (will likely fail with Bearer Token)
              try {
                const testTweetText = `🧪 Teste do VoxelPromo - ${new Date().toLocaleString('pt-BR')}`;
                await client.v2.tweet({ text: testTweetText });
                results.x = {
                  success: true,
                  message: `✅ X (Twitter) Bearer Token configurado! Usuário: @${username} - Postagem funcionando!`,
                };
              } catch (postError: any) {
                // Bearer Token usually can't post
                results.x = {
                  success: false,
                  message: `⚠️ X (Twitter) Bearer Token configurado (@${username}), mas não consegue postar. Use OAuth 1.0a para acesso completo.`,
                };
              }
            } catch (bearerError: any) {
              // Bearer Token might be read-only, but it's still valid
              results.x = {
                success: false,
                message: `⚠️ X (Twitter) Bearer Token configurado, mas não consegue autenticar ou postar. Use OAuth 1.0a para acesso completo.`,
              };
            }
          } else if (testConfig.x?.oauth2AccessToken) {
            // Test OAuth 2.0 Access Token
            const { TwitterApi } = await import('twitter-api-v2');
            const client = new TwitterApi(testConfig.x.oauth2AccessToken);

            try {
              const user = await client.v2.me();
              const username = user.data.username || user.data.name || 'usuário';

              // Test posting
              try {
                const testTweetText = `🧪 Teste do VoxelPromo - ${new Date().toLocaleString('pt-BR')} - Este tweet será deletado automaticamente.`;
                const tweet = await client.v2.tweet({ text: testTweetText });
                const tweetId = tweet.data.id;

                // Try to delete
                try {
                  await client.v2.deleteTweet(tweetId);
                  logger.info(
                    `✅ OAuth 2.0 test tweet created and deleted successfully (ID: ${tweetId})`
                  );
                } catch (deleteError: any) {
                  logger.warn(
                    `⚠️ OAuth 2.0 test tweet created (ID: ${tweetId}) but couldn't delete: ${deleteError.message}`
                  );
                }

                results.x = {
                  success: true,
                  message: `✅ X (Twitter) OAuth 2.0 configurado e testado! Usuário: @${username} - Postagem funcionando perfeitamente!`,
                };
              } catch (postError: any) {
                const postErrorMsg = postError.message || '';
                if (postErrorMsg.includes('403') || postErrorMsg.includes('Forbidden')) {
                  results.x = {
                    success: false,
                    message: `⚠️ Autenticação OK (@${username}), mas sem permissão para postar. Verifique as permissões do app no Twitter Developer Portal.`,
                  };
                } else {
                  results.x = {
                    success: false,
                    message: `⚠️ Autenticação OK (@${username}), mas erro ao testar postagem: ${postErrorMsg}`,
                  };
                }
              }
            } catch (authError: any) {
              results.x = {
                success: false,
                message: `⚠️ Erro ao autenticar com OAuth 2.0: ${authError.message}. Verifique se o token não expirou.`,
              };
            }
          } else if (testConfig.x?.oauth2ClientId && testConfig.x?.oauth2ClientSecret) {
            // OAuth 2.0 Client ID/Secret configured but no access token yet
            results.x = {
              success: false,
              message:
                'OAuth 2.0 Client ID/Secret configurados, mas ainda não autenticado. Clique em "Conectar com X" para autorizar.',
            };
          } else {
            results.x = { success: false, message: 'Credenciais do X (Twitter) não configuradas' };
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Erro desconhecido';
          let friendlyMsg = errorMsg;
          if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            friendlyMsg = 'Credenciais inválidas ou expiradas';
          } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
            friendlyMsg = 'Acesso negado - verifique permissões do app';
          } else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
            friendlyMsg = 'Limite de requisições excedido - tente novamente em alguns minutos';
          } else if (errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
            friendlyMsg = 'Erro de conexão - verifique internet';
          }
          results.x = { success: false, message: `❌ ${friendlyMsg}` };
        }
      }

      // Test Telegram
      if (service === 'telegram' || !service) {
        try {
          // Check if botToken exists and is not empty/masked
          const botToken = testConfig.telegram?.botToken;
          if (!botToken || botToken === '***' || botToken.trim().length === 0) {
            results.telegram = { success: false, message: 'Bot Token não configurado' };
          } else {
            const TelegramBot = (await import('node-telegram-bot-api')).default;
            const bot = new TelegramBot(botToken, { polling: false });

            // Test by getting bot info (real API call)
            const botInfo = await bot.getMe();
            if (botInfo && botInfo.username) {
              const chatId = testConfig.telegram.chatId;
              if (chatId) {
                // Try to send a test message
                try {
                  const testMessage = `🤖 <b>Teste do VoxelPromo</b>

✅ Bot configurado com sucesso!

📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}
🔗 Sistema: VoxelPromo - Monitoramento de Ofertas

Se você recebeu esta mensagem, o bot está funcionando corretamente! 🎉`;

                  logger.info(`Sending test message to Telegram chat ${chatId}`);
                  await bot.sendMessage(chatId, testMessage, { parse_mode: 'HTML' });

                  results.telegram = {
                    success: true,
                    message: `✅ Bot "@${botInfo.username}" configurado e mensagem de teste enviada! Verifique seu Telegram/grupo.`,
                  };
                  logger.info('Test message sent successfully to Telegram');
                } catch (sendError: any) {
                  // Bot is valid but couldn't send message
                  const sendErrorMsg = sendError.message || '';
                  if (
                    sendErrorMsg.includes('chat not found') ||
                    sendErrorMsg.includes('Forbidden') ||
                    sendErrorMsg.includes('bot was blocked')
                  ) {
                    results.telegram = {
                      success: false,
                      message: `⚠️ Bot válido, mas não conseguiu enviar mensagem. Verifique se o Chat ID está correto e se o bot foi adicionado ao grupo/canal.`,
                    };
                    logger.warn(`Telegram bot valid but cannot send: ${sendErrorMsg}`);
                  } else {
                    results.telegram = {
                      success: true,
                      message: `✅ Bot "@${botInfo.username}" configurado. Chat ID: ${chatId} (erro ao enviar teste: ${sendErrorMsg})`,
                    };
                    logger.warn(`Telegram bot configured but test send failed: ${sendErrorMsg}`);
                  }
                }
              } else {
                results.telegram = {
                  success: true,
                  message: `✅ Bot "@${botInfo.username}" configurado, mas Chat ID não definido`,
                };
              }
            } else {
              results.telegram = {
                success: false,
                message: 'Não foi possível obter informações do bot',
              };
            }
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Erro desconhecido';
          let friendlyMsg = errorMsg;
          if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            friendlyMsg = 'Token inválido - verifique o Bot Token';
          } else if (errorMsg.includes('ETELEGRAM')) {
            friendlyMsg = 'Token inválido ou bot não encontrado';
          }
          logger.error(`Telegram test failed: ${errorMsg}`);
          results.telegram = { success: false, message: `❌ ${friendlyMsg}` };
        }
      }

      // Test AI Service
      if (service === 'ai' || !service) {
        try {
          const provider = testConfig.ai?.provider || 'groq';
          const apiKey =
            provider === 'groq' ? testConfig.ai?.groqApiKey : testConfig.ai?.openaiApiKey;

          if (!apiKey) {
            results.ai = {
              success: false,
              message: `${provider === 'groq' ? 'Groq' : 'OpenAI'} API Key não configurada`,
            };
          } else {
            if (provider === 'groq') {
              const Groq = (await import('groq-sdk')).default;
              const groq = new Groq({ apiKey });
              // Test with a simple completion (real API call)
              await groq.chat.completions.create({
                messages: [{ role: 'user', content: 'test' }],
                model: 'llama-3.3-70b-versatile',
                max_tokens: 5,
              });
              results.ai = { success: true, message: '✅ Conexão com Groq OK' };
            } else {
              const OpenAI = (await import('openai')).default;
              const openai = new OpenAI({ apiKey });
              // Test with a simple completion (real API call)
              await openai.chat.completions.create({
                messages: [{ role: 'user', content: 'test' }],
                model: 'gpt-3.5-turbo',
                max_tokens: 5,
              });
              results.ai = { success: true, message: '✅ Conexão com OpenAI OK' };
            }
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Erro desconhecido';
          let friendlyMsg = errorMsg;
          if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            friendlyMsg = 'API Key inválida';
          } else if (errorMsg.includes('429')) {
            friendlyMsg = 'Limite de requisições excedido';
          } else if (errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
            friendlyMsg = 'Erro de conexão - verifique internet';
          }
          results.ai = { success: false, message: `❌ ${friendlyMsg}` };
        }
      }

      // Test Mercado Livre
      if (service === 'mercadolivre' || !service) {
        try {
          if (!testConfig.mercadolivre?.clientId || !testConfig.mercadolivre?.clientSecret) {
            results.mercadolivre = {
              success: false,
              message: 'Client ID ou Client Secret não configurados',
            };
          } else {
            const { MercadoLivreService } = await import(
              '../services/mercadolivre/MercadoLivreService'
            );
            const mercadoLivre = new MercadoLivreService();

            // Test by checking authentication status
            const config = mercadoLivre.getConfig();
            if (config.accessToken) {
              // Try to get user info (requires authentication)
              try {
                const axios = (await import('axios')).default;
                const response = await axios.get('https://api.mercadolibre.com/users/me', {
                  headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    Accept: 'application/json',
                  },
                  timeout: 10000,
                });

                if (response.data && response.data.id) {
                  results.mercadolivre = {
                    success: true,
                    message: `✅ Autenticado como ${response.data.nickname || response.data.id}`,
                  };
                } else {
                  results.mercadolivre = {
                    success: false,
                    message: 'Token inválido ou expirado',
                  };
                }
              } catch (authError: any) {
                if (authError.response?.status === 401) {
                  results.mercadolivre = {
                    success: false,
                    message: 'Token expirado - use "Renovar Token" na página de configurações',
                  };
                } else {
                  throw authError;
                }
              }
            } else {
              // Test public search endpoint (doesn't require auth)
              const axios = (await import('axios')).default;
              await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
                params: { q: 'test', limit: 1 },
                timeout: 10000,
              });
              results.mercadolivre = {
                success: true,
                message:
                  '✅ API acessível (não autenticado - configure OAuth para usar recursos autenticados)',
              };
            }
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Erro desconhecido';
          let friendlyMsg = errorMsg;
          if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            friendlyMsg = 'Token inválido ou expirado';
          } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
            friendlyMsg = 'Acesso negado - verifique permissões';
          } else if (
            errorMsg.includes('network') ||
            errorMsg.includes('ECONNREFUSED') ||
            errorMsg.includes('timeout')
          ) {
            friendlyMsg = 'Erro de conexão - verifique internet';
          }
          logger.error(`Mercado Livre test failed: ${errorMsg}`);
          results.mercadolivre = { success: false, message: `❌ ${friendlyMsg}` };
        }
      }
    } finally {
      // Restore original environment variables
      Object.keys(originalEnv).forEach((key) => {
        if (originalEnv[key] !== undefined) {
          process.env[key] = originalEnv[key];
        } else {
          delete process.env[key];
        }
      });
    }

    res.json(results);
  } catch (error: any) {
    logger.error('Error testing config:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as configRoutes };
