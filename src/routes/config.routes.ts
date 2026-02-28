import { Router, Response } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import {
  validateTelegramBotToken,
  validateTelegramChatId,
  validateGroqApiKey,
  validateOpenAIApiKey,
} from '../utils/validators';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUserSettingsService } from '../services/user/UserSettingsService';

const router = Router();
const configPath = join(process.cwd(), 'config.json');

/**
 * GET /api/config
 * Get current configuration (USER-SCOPED)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const settingsService = getUserSettingsService();
    const safeConfig = await settingsService.getSafeSettings(userId);

    return res.json(safeConfig);
  } catch (error: any) {
    logger.error('Error reading config:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/config
 * Save configuration (USER-SCOPED)
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is required' });
    }

    const userId = req.user!.id;
    const config = req.body;

    // Log received values (for debugging)
    logger.info(`Saving config for user: ${req.user!.username}`, {
      telegram: {
        hasBotToken: !!config.telegram?.botToken,
        chatId: config.telegram?.chatId,
      },
      ai: {
        hasGroqKey: !!config.ai?.groqApiKey,
        provider: config.ai?.provider,
      },
    });

    // Validate inputs before saving
    const validationErrors: string[] = [];

    // Validate Telegram Bot Token (if provided and not masked)
    if (
      config.telegram?.botToken &&
      !/^[*•]+$/.test(config.telegram.botToken) &&
      config.telegram.botToken.trim().length > 0
    ) {
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
    if (
      config.ai?.groqApiKey &&
      config.ai.groqApiKey !== '***' &&
      config.ai.groqApiKey.trim().length > 0
    ) {
      const validation = validateGroqApiKey(config.ai.groqApiKey);
      if (!validation.isValid) {
        validationErrors.push(`Groq API Key: ${validation.error}`);
      }
    }

    // Validate OpenAI API Key (if provided and not masked)
    if (
      config.ai?.openaiApiKey &&
      config.ai.openaiApiKey !== '***' &&
      config.ai.openaiApiKey.trim().length > 0
    ) {
      const validation = validateOpenAIApiKey(config.ai.openaiApiKey);
      if (!validation.isValid) {
        validationErrors.push(`OpenAI API Key: ${validation.error}`);
      }
    }

    // Log validation warnings (but don't block saving)
    if (validationErrors.length > 0) {
      logger.warn('❌ Validation warnings:', validationErrors);
    }

    // Save to UserSettings (multi-tenant)
    const settingsService = getUserSettingsService();
    const updatedSettings = await settingsService.updateSettings(userId, config);

    logger.info(`Configuration saved for user: ${req.user!.username}`);

    return res.json({
      success: true,
      message: 'Configuração salva com sucesso!',
      saved: {
        telegram: {
          hasToken: updatedSettings.telegram?.isConfigured || false,
        },
        ai: {
          hasKey: updatedSettings.ai?.isConfigured || false,
        },
      },
    });
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
    if (
      config.telegram?.botToken &&
      !/^[*•]+$/.test(config.telegram.botToken) &&
      config.telegram.botToken.trim().length > 0
    ) {
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
    if (
      config.ai?.groqApiKey &&
      config.ai.groqApiKey !== '***' &&
      config.ai.groqApiKey.trim().length > 0
    ) {
      const validation = validateGroqApiKey(config.ai.groqApiKey);
      if (!validation.isValid) {
        validationErrors.push(`Groq API Key: ${validation.error}`);
      }
    }

    // Validate OpenAI API Key (if provided and not masked)
    if (
      config.ai?.openaiApiKey &&
      config.ai.openaiApiKey !== '***' &&
      config.ai.openaiApiKey.trim().length > 0
    ) {
      const validation = validateOpenAIApiKey(config.ai.openaiApiKey);
      if (!validation.isValid) {
        validationErrors.push(`OpenAI API Key: ${validation.error}`);
      }
    }

    // Log validation warnings (but don't block saving)
    if (validationErrors.length > 0) {
      logger.warn('❌ Validation failed:', validationErrors);
      // Continue saving anyway - just log the warnings
      // The validation errors will be logged but won't block the save
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
            ? /^[*•]+$/.test(config.telegram.botToken)
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
        cacheEnabled:
          config.shopee?.cacheEnabled !== undefined
            ? config.shopee.cacheEnabled
            : existingConfig.shopee?.cacheEnabled,
      },
      awin: {
        ...existingConfig.awin,
        ...config.awin,
        enabled:
          config.awin?.enabled !== undefined
            ? config.awin.enabled
            : (existingConfig.awin?.enabled ?? false),
        apiToken:
          config.awin?.apiToken !== undefined
            ? config.awin.apiToken === '***'
              ? existingConfig.awin?.apiToken || ''
              : config.awin.apiToken || ''
            : existingConfig.awin?.apiToken || '',
        publisherId:
          config.awin?.publisherId !== undefined
            ? config.awin.publisherId || ''
            : existingConfig.awin?.publisherId || '',
        dataFeedApiKey:
          config.awin?.dataFeedApiKey !== undefined
            ? config.awin.dataFeedApiKey === '***'
              ? existingConfig.awin?.dataFeedApiKey || ''
              : config.awin.dataFeedApiKey || ''
            : existingConfig.awin?.dataFeedApiKey || '',
      },
      instagram: {
        ...existingConfig.instagram,
        ...config.instagram,
        appId:
          config.instagram?.appId !== undefined
            ? config.instagram.appId === '***'
              ? existingConfig.instagram?.appId || ''
              : config.instagram.appId || ''
            : existingConfig.instagram?.appId || '',
        appSecret:
          config.instagram?.appSecret !== undefined
            ? config.instagram.appSecret === '***'
              ? existingConfig.instagram?.appSecret || ''
              : config.instagram.appSecret || ''
            : existingConfig.instagram?.appSecret || '',
        accessToken:
          config.instagram?.accessToken !== undefined && config.instagram.accessToken !== '***'
            ? config.instagram.accessToken
            : existingConfig.instagram?.accessToken || '',
        pageAccessToken:
          config.instagram?.pageAccessToken !== undefined &&
            config.instagram.pageAccessToken !== '***'
            ? config.instagram.pageAccessToken
            : existingConfig.instagram?.pageAccessToken || '',
        pageId:
          config.instagram?.pageId !== undefined
            ? config.instagram.pageId || ''
            : existingConfig.instagram?.pageId || '',
        igUserId:
          config.instagram?.igUserId !== undefined
            ? config.instagram.igUserId || ''
            : existingConfig.instagram?.igUserId || '',
        webhookVerifyToken:
          config.instagram?.webhookVerifyToken !== undefined
            ? config.instagram.webhookVerifyToken || ''
            : existingConfig.instagram?.webhookVerifyToken || '',
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
      // targetGroups are loaded directly from config.json by the service, no need for env var unless we want to serialize it
      process.env.WHATSAPP_LIBRARY = mergedConfig.whatsapp.library || 'baileys';
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
router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { service } = req.body;
    const results: any = {};

    // Fetch user settings from database
    const settingsService = getUserSettingsService();
    const userSettings = await settingsService.getSettings(userId);

    // Test Telegram
    if (service === 'telegram' || !service) {
      try {
        const botToken = userSettings.telegram?.botToken;
        // Check if token exists and is valid (not masked unless we decide to handle masked retrieval differently, 
        // but getSettings usually returns fully unless specific safe method used. 
        // Actually getSettings returns the document, so it has the real token)

        if (!botToken || botToken.trim().length === 0) {
          results.telegram = { success: false, message: 'Bot Token não configurado' };
        } else {
          const TelegramBot = (await import('node-telegram-bot-api')).default;
          const bot = new TelegramBot(botToken, { polling: false });

          // Test by getting bot info
          const botInfo = await bot.getMe();
          if (botInfo && botInfo.username) {
            const chatId = userSettings.telegram?.channelId; // Mapped to channelId in DB
            if (chatId) {
              try {
                const testMessage = `🤖 <b>Teste do VoxelPromo</b>\n\n✅ Bot configurado com sucesso!\n\n📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}\n🔗 Sistema: VoxelPromo - Monitoramento de Ofertas\n\nSe você recebeu esta mensagem, o bot está funcionando corretamente! 🎉`;

                logger.info(`Sending test message to Telegram chat ${chatId}`);
                await bot.sendMessage(chatId, testMessage, { parse_mode: 'HTML' });

                results.telegram = {
                  success: true,
                  message: `✅ Bot "@${botInfo.username}" configurado e mensagem de teste enviada!`,
                };
              } catch (sendError: any) {
                const sendErrorMsg = sendError.message || '';
                results.telegram = {
                  success: true, // Config is valid, just send failed (maybe wrong chat ID)
                  message: `✅ Bot "@${botInfo.username}" configurado, mas erro ao enviar mensagem: ${sendErrorMsg}`,
                };
              }
            } else {
              results.telegram = {
                success: true,
                message: `✅ Bot "@${botInfo.username}" configurado, mas Chat ID não definido`,
              };
            }
          } else {
            results.telegram = { success: false, message: 'Não foi possível obter informações do bot' };
          }
        }
      } catch (error: any) {
        let friendlyMsg = error.message;
        if (error.message.includes('401')) friendlyMsg = 'Token inválido';
        results.telegram = { success: false, message: `❌ ${friendlyMsg}` };
      }
    }

    // Test AI
    if (service === 'ai' || !service) {
      try {
        const provider = userSettings.ai?.provider || 'groq';
        const apiKey = provider === 'groq' ? userSettings.ai?.groqApiKey : userSettings.ai?.openaiApiKey;

        if (!apiKey) {
          results.ai = { success: false, message: `${provider} API Key não configurada` };
        } else {
          if (provider === 'groq') {
            const Groq = (await import('groq-sdk')).default;
            const groq = new Groq({ apiKey });
            await groq.chat.completions.create({
              messages: [{ role: 'user', content: 'test' }],
              model: 'llama-3.3-70b-versatile',
              max_tokens: 5,
            });
            results.ai = { success: true, message: '✅ Conexão com Groq OK' };
          } else {
            const OpenAI = (await import('openai')).default;
            const openai = new OpenAI({ apiKey });
            await openai.chat.completions.create({
              messages: [{ role: 'user', content: 'test' }],
              model: 'gpt-3.5-turbo',
              max_tokens: 5,
            });
            results.ai = { success: true, message: '✅ Conexão com OpenAI OK' };
          }
        }
      } catch (error: any) {
        results.ai = { success: false, message: `❌ Erro AI: ${error.message}` };
      }
    }

    // Test Amazon (Placeholder for multi-tenant refactor)
    if (service === 'amazon' || !service) {
      if (userSettings.amazon?.accessKey) {
        // TODO: Instantiate AmazonService with userSettings
        results.amazon = { success: true, message: '✅ Credenciais presentes (Teste real pendente de refatoração do serviço)' };
      } else {
        results.amazon = { success: false, message: 'Credenciais Amazon não configuradas' };
      }
    }

    // Test X (Twitter)
    if (service === 'x' || !service) {
      if (userSettings.x?.accessToken && userSettings.x?.accessTokenSecret) {
        // TODO: Implement X test with user tokens
        results.x = { success: true, message: '✅ Credenciais X presentes (Teste real pendente)' };
      } else {
        results.x = { success: false, message: 'Credenciais X não configuradas' };
      }
    }

    res.json(results);

  } catch (error: any) {
    logger.error('Error testing config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to get user-specific status
router.get('/setup-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const settingsService = getUserSettingsService();
    const userSettings = await settingsService.getSettings(userId);

    // Check offer count for THIS user
    const offersStatus = await getOffersSetupStatus(userId);

    // Derive status from UserSettings (multi-tenant)
    // We check both the settings object AND env vars as fallback for some system-wide services if needed
    // But primarily we look at what the user has configured.

    const telegramConfigured =
      (userSettings.telegram?.botToken && userSettings.telegram.botToken !== '***') ||
      !!process.env.TELEGRAM_BOT_TOKEN;

    const aiConfigured =
      (userSettings.ai?.groqApiKey && userSettings.ai.groqApiKey !== '***') ||
      (userSettings.ai?.openaiApiKey && userSettings.ai.openaiApiKey !== '***') ||
      !!process.env.GROQ_API_KEY ||
      !!process.env.OPENAI_API_KEY;

    const whatsappConfigured =
      (userSettings.whatsapp?.enabled) ||
      process.env.WHATSAPP_ENABLED === 'true';

    const automationConfigured = userSettings.automation?.enabled || false;

    const status = {
      telegram: {
        configured: !!telegramConfigured,
        botUsername: undefined // We could fetch this if needed, but 'configured' boolean is what UI checks
      },
      ai: {
        configured: !!aiConfigured,
        provider: userSettings.ai?.provider || process.env.AI_PROVIDER || 'groq'
      },
      whatsapp: {
        configured: !!whatsappConfigured,
        connected: false // WhatsApp connection status is dynamic, handled by separate status check usually
      },
      offers: offersStatus,
      automation: {
        configured: !!automationConfigured,
        enabled: automationConfigured
      },
    };

    return res.json(status);
  } catch (error: any) {
    logger.error('Error getting setup status:', error);
    return res.status(500).json({ error: error.message });
  }
});

// No longer needed as separate exported functions for this route, logic inlined for clarity + user context
// But we keep getOffersSetupStatus as it's complex DB operation

async function getOffersSetupStatus(userId: string): Promise<{ hasOffers: boolean; count?: number }> {
  try {
    const mongoose = await import('mongoose');

    if (mongoose.default.connection.readyState !== 1) {
      return { hasOffers: false };
    }

    // CRITICAL FIX: Filter by userId to ensure data isolation
    const count = await mongoose.default.connection.db
      ?.collection('offers')
      .countDocuments({
        isActive: true,
        userId: userId // Only count offers belonging to this user
      });

    return { hasOffers: (count || 0) > 0, count: count || 0 };
  } catch {
    return { hasOffers: false };
  }
}

export { router as configRoutes };
