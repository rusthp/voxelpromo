import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

const configPath = join(process.cwd(), 'config.json');

/**
 * Load configuration from config.json and set environment variables
 */
export function loadConfigFromFile(): void {
  try {
    if (!existsSync(configPath)) {
      logger.info('No config.json found, using environment variables');
      return;
    }

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    logger.info('Loading configuration from config.json...');

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

    // WhatsApp
    if (config.whatsapp?.enabled) {
      process.env.WHATSAPP_ENABLED = config.whatsapp.enabled.toString();
      process.env.WHATSAPP_TARGET_NUMBER = config.whatsapp.targetNumber;
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
      process.env.X_OAUTH2_REDIRECT_URI = config.x.oauth2RedirectUri || 'http://localhost:3000/api/x/auth/callback';
      logger.info(`✅ X (Twitter) OAuth 2.0 Client credentials loaded`);
    }

    if (config.x?.oauth2AccessToken) {
      process.env.X_OAUTH2_ACCESS_TOKEN = config.x.oauth2AccessToken;
      if (config.x.oauth2RefreshToken) {
        process.env.X_OAUTH2_REFRESH_TOKEN = config.x.oauth2RefreshToken;
      }
      logger.info(`✅ X (Twitter) OAuth 2.0 Access Token loaded`);
    }

    logger.info('✅ Configuration loaded from config.json');
  } catch (error: any) {
    logger.error('Error loading config.json:', error.message);
  }
}

