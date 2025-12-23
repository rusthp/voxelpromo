import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

const configPath = join(process.cwd(), 'config.json');

// Cache para evitar carregar config repetidamente
let configCache: { mtime: number; data: any } | null = null;
const CACHE_TTL = 1000; // 1 segundo de cache

/**
 * Load configuration from config.json and set environment variables
 * Uses cache to avoid repeated file reads
 */
export function loadConfigFromFile(force = false): void {
  try {
    if (!existsSync(configPath)) {
      if (!force && configCache) {
        return; // Use cached data if file doesn't exist
      }
      logger.info('No config.json found, using environment variables');
      return;
    }

    // Track if we actually loaded from file (not cache) - check BEFORE loading
    const hadCache = !!configCache;

    // Check if we can use cache
    if (!force && configCache) {
      try {
        const stats = statSync(configPath);
        const mtime = stats.mtimeMs;

        // Use cache if file hasn't changed and cache is still fresh
        if (mtime === configCache.mtime && Date.now() - mtime < CACHE_TTL) {
          return; // Use cached config - no logging needed
        }
      } catch (error) {
        // If stat fails, reload config
      }
    }

    // Actually loading from file (not using cache)
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const stats = statSync(configPath);

    // Update cache
    configCache = {
      mtime: stats.mtimeMs,
      data: config,
    };

    // Only log if actually loading from file (not using cache) - reduces log spam
    if (!hadCache || force) {
      logger.debug('Loading configuration from config.json...');
    }

    // Amazon
    if (config.amazon?.accessKey) {
      process.env.AMAZON_ACCESS_KEY = config.amazon.accessKey;
      process.env.AMAZON_SECRET_KEY = config.amazon.secretKey;
      process.env.AMAZON_ASSOCIATE_TAG = config.amazon.associateTag;
      process.env.AMAZON_REGION = config.amazon.region;
    }

    // AliExpress
    if (config.aliexpress?.appKey) {
      process.env.ALIEXPRESS_APP_KEY = config.aliexpress.appKey;
      process.env.ALIEXPRESS_APP_SECRET = config.aliexpress.appSecret;
      process.env.ALIEXPRESS_TRACKING_ID = config.aliexpress.trackingId;
    }

    // Telegram
    if (config.telegram?.botToken) {
      process.env.TELEGRAM_BOT_TOKEN = config.telegram.botToken;
      process.env.TELEGRAM_CHAT_ID = config.telegram.chatId;
      logger.info(`✅ Telegram config loaded (token length: ${config.telegram.botToken.length})`);
    }

    // WhatsApp - always load library setting (regardless of enabled)
    if (config.whatsapp?.library) {
      process.env.WHATSAPP_LIBRARY = config.whatsapp.library;
    }

    if (config.whatsapp?.enabled) {
      process.env.WHATSAPP_ENABLED = config.whatsapp.enabled.toString();
      process.env.WHATSAPP_TARGET_NUMBER = config.whatsapp.targetNumber;
      // Only log when actually loading from file (not using cache) to reduce log spam
      if (force || !configCache) {
        logger.debug(
          `WhatsApp config loaded (library: ${config.whatsapp.library || 'baileys'})`
        );
      }
    }

    // AI Service
    if (config.ai?.groqApiKey) {
      process.env.GROQ_API_KEY = config.ai.groqApiKey;
      logger.info(`✅ Groq API key loaded (length: ${config.ai.groqApiKey.length})`);
    }

    if (config.ai?.openaiApiKey) {
      process.env.OPENAI_API_KEY = config.ai.openaiApiKey;
    }

    if (config.ai?.provider) {
      process.env.AI_PROVIDER = config.ai.provider;
    }

    // X (Twitter) Service
    if (config.x?.bearerToken) {
      process.env.X_BEARER_TOKEN = config.x.bearerToken;
      logger.info(`✅ X (Twitter) Bearer Token loaded`);
    }

    if (config.x?.apiKey) {
      process.env.X_API_KEY = config.x.apiKey;
      process.env.X_API_KEY_SECRET = config.x.apiKeySecret || '';
      process.env.X_ACCESS_TOKEN = config.x.accessToken || '';
      process.env.X_ACCESS_TOKEN_SECRET = config.x.accessTokenSecret || '';
      logger.info(`✅ X (Twitter) OAuth 1.0a credentials loaded`);
    }

    // X (Twitter) OAuth 2.0
    if (config.x?.oauth2ClientId) {
      process.env.X_OAUTH2_CLIENT_ID = config.x.oauth2ClientId;
      process.env.X_OAUTH2_CLIENT_SECRET = config.x.oauth2ClientSecret || '';
      process.env.X_OAUTH2_REDIRECT_URI =
        config.x.oauth2RedirectUri || 'http://localhost:3000/api/x/auth/callback';
      logger.info(`✅ X (Twitter) OAuth 2.0 Client credentials loaded`);
    }

    if (config.x?.oauth2AccessToken) {
      process.env.X_OAUTH2_ACCESS_TOKEN = config.x.oauth2AccessToken;
      if (config.x.oauth2RefreshToken) {
        process.env.X_OAUTH2_REFRESH_TOKEN = config.x.oauth2RefreshToken;
      }
      logger.info(`✅ X (Twitter) OAuth 2.0 Access Token loaded`);
    }

    // Instagram
    if (config.instagram?.appId) {
      process.env.INSTAGRAM_APP_ID = config.instagram.appId;
      process.env.INSTAGRAM_APP_SECRET = config.instagram.appSecret || '';
      if (config.instagram.accessToken) {
        process.env.INSTAGRAM_ACCESS_TOKEN = config.instagram.accessToken;
      }
      if (config.instagram.pageId) {
        process.env.INSTAGRAM_PAGE_ID = config.instagram.pageId;
      }
      if (config.instagram.igUserId) {
        process.env.INSTAGRAM_IG_USER_ID = config.instagram.igUserId;
      }
      if (config.instagram.webhookVerifyToken) {
        process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN = config.instagram.webhookVerifyToken;
      }
      logger.info(`✅ Instagram config loaded`);
    }

    // Only log if we actually loaded from file (not using cache)
    // This prevents log spam when config is loaded repeatedly but using cache
    if (!hadCache || force) {
      logger.debug('✅ Configuration loaded from config.json');
    }
  } catch (error: any) {
    logger.error('Error loading config.json:', error.message);
    configCache = null; // Clear cache on error
  }
}

/**
 * Clear config cache (useful when config is updated)
 */
export function clearConfigCache(): void {
  configCache = null;
}
