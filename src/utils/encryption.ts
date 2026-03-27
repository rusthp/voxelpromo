/**
 * AES-256-GCM encryption utility for sensitive fields (OAuth tokens, API keys)
 *
 * Format: `enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * Backward compatible: values without the prefix are treated as plaintext.
 *
 * Required env var: ENCRYPTION_KEY — 32 random bytes as 64 hex chars.
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // bytes
const ENC_PREFIX = 'enc:v1:';

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  const buf = Buffer.from(key, 'hex');
  if (buf.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
  return buf;
}

/**
 * Encrypt a plaintext string.
 * Returns the original value unchanged if it is empty or already encrypted.
 */
export function encrypt(value: string): string {
  if (!value || value.startsWith(ENC_PREFIX)) return value;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a previously encrypted string.
 * Returns the original value unchanged if it is empty or already plaintext
 * (backward compatibility — values saved before encryption was introduced).
 */
export function decrypt(value: string): string {
  if (!value || !value.startsWith(ENC_PREFIX)) return value; // plaintext passthrough

  try {
    const key = getKey();
    const payload = value.slice(ENC_PREFIX.length);
    const parts = payload.split(':');
    if (parts.length !== 3) return value; // malformed — return as-is

    const [ivHex, tagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  } catch {
    // Decryption failed (wrong key, corrupted data) — return empty string rather than crash
    return '';
  }
}

/**
 * Encrypt all sensitive fields in a raw settings document in-place.
 * Called by the Mongoose pre-save hook.
 */
export function encryptSettingsDoc(doc: any): void {
  // Amazon
  if (doc.amazon?.accessKey) doc.amazon.accessKey = encrypt(doc.amazon.accessKey);
  if (doc.amazon?.secretKey) doc.amazon.secretKey = encrypt(doc.amazon.secretKey);

  // AliExpress
  if (doc.aliexpress?.appKey) doc.aliexpress.appKey = encrypt(doc.aliexpress.appKey);
  if (doc.aliexpress?.appSecret) doc.aliexpress.appSecret = encrypt(doc.aliexpress.appSecret);

  // Mercado Livre
  if (doc.mercadolivre?.clientSecret) doc.mercadolivre.clientSecret = encrypt(doc.mercadolivre.clientSecret);
  if (doc.mercadolivre?.accessToken) doc.mercadolivre.accessToken = encrypt(doc.mercadolivre.accessToken);
  if (doc.mercadolivre?.refreshToken) doc.mercadolivre.refreshToken = encrypt(doc.mercadolivre.refreshToken);
  if (doc.mercadolivre?.sessionCookies) doc.mercadolivre.sessionCookies = encrypt(doc.mercadolivre.sessionCookies);
  if (doc.mercadolivre?.csrfToken) doc.mercadolivre.csrfToken = encrypt(doc.mercadolivre.csrfToken);
  if (doc.mercadolivre?.codeVerifier) doc.mercadolivre.codeVerifier = encrypt(doc.mercadolivre.codeVerifier);

  // Awin
  if (doc.awin?.apiToken) doc.awin.apiToken = encrypt(doc.awin.apiToken);
  if (doc.awin?.dataFeedApiKey) doc.awin.dataFeedApiKey = encrypt(doc.awin.dataFeedApiKey);

  // Shopee
  if (doc.shopee?.appSecret) doc.shopee.appSecret = encrypt(doc.shopee.appSecret);

  // Telegram
  if (doc.telegram?.botToken) doc.telegram.botToken = encrypt(doc.telegram.botToken);

  // Instagram
  if (doc.instagram?.appSecret) doc.instagram.appSecret = encrypt(doc.instagram.appSecret);
  if (doc.instagram?.accessToken) doc.instagram.accessToken = encrypt(doc.instagram.accessToken);
  if (doc.instagram?.pageAccessToken) doc.instagram.pageAccessToken = encrypt(doc.instagram.pageAccessToken);

  // Facebook
  if (doc.facebook?.accessToken) doc.facebook.accessToken = encrypt(doc.facebook.accessToken);
  if (doc.facebook?.pageAccessToken) doc.facebook.pageAccessToken = encrypt(doc.facebook.pageAccessToken);

  // X / Twitter
  if (doc.x?.bearerToken) doc.x.bearerToken = encrypt(doc.x.bearerToken);
  if (doc.x?.apiKeySecret) doc.x.apiKeySecret = encrypt(doc.x.apiKeySecret);
  if (doc.x?.accessToken) doc.x.accessToken = encrypt(doc.x.accessToken);
  if (doc.x?.accessTokenSecret) doc.x.accessTokenSecret = encrypt(doc.x.accessTokenSecret);
  if (doc.x?.oauth2ClientSecret) doc.x.oauth2ClientSecret = encrypt(doc.x.oauth2ClientSecret);
  if (doc.x?.oauth2AccessToken) doc.x.oauth2AccessToken = encrypt(doc.x.oauth2AccessToken);
  if (doc.x?.oauth2RefreshToken) doc.x.oauth2RefreshToken = encrypt(doc.x.oauth2RefreshToken);

  // AI
  if (doc.ai?.groqApiKey) doc.ai.groqApiKey = encrypt(doc.ai.groqApiKey);
  if (doc.ai?.openaiApiKey) doc.ai.openaiApiKey = encrypt(doc.ai.openaiApiKey);
}

/**
 * Decrypt all sensitive fields in a raw settings document in-place.
 * Called after loading from MongoDB to restore plaintext values for services.
 */
export function decryptSettingsDoc(doc: any): void {
  // Amazon
  if (doc.amazon?.accessKey) doc.amazon.accessKey = decrypt(doc.amazon.accessKey);
  if (doc.amazon?.secretKey) doc.amazon.secretKey = decrypt(doc.amazon.secretKey);

  // AliExpress
  if (doc.aliexpress?.appKey) doc.aliexpress.appKey = decrypt(doc.aliexpress.appKey);
  if (doc.aliexpress?.appSecret) doc.aliexpress.appSecret = decrypt(doc.aliexpress.appSecret);

  // Mercado Livre
  if (doc.mercadolivre?.clientSecret) doc.mercadolivre.clientSecret = decrypt(doc.mercadolivre.clientSecret);
  if (doc.mercadolivre?.accessToken) doc.mercadolivre.accessToken = decrypt(doc.mercadolivre.accessToken);
  if (doc.mercadolivre?.refreshToken) doc.mercadolivre.refreshToken = decrypt(doc.mercadolivre.refreshToken);
  if (doc.mercadolivre?.sessionCookies) doc.mercadolivre.sessionCookies = decrypt(doc.mercadolivre.sessionCookies);
  if (doc.mercadolivre?.csrfToken) doc.mercadolivre.csrfToken = decrypt(doc.mercadolivre.csrfToken);
  if (doc.mercadolivre?.codeVerifier) doc.mercadolivre.codeVerifier = decrypt(doc.mercadolivre.codeVerifier);

  // Awin
  if (doc.awin?.apiToken) doc.awin.apiToken = decrypt(doc.awin.apiToken);
  if (doc.awin?.dataFeedApiKey) doc.awin.dataFeedApiKey = decrypt(doc.awin.dataFeedApiKey);

  // Shopee
  if (doc.shopee?.appSecret) doc.shopee.appSecret = decrypt(doc.shopee.appSecret);

  // Telegram
  if (doc.telegram?.botToken) doc.telegram.botToken = decrypt(doc.telegram.botToken);

  // Instagram
  if (doc.instagram?.appSecret) doc.instagram.appSecret = decrypt(doc.instagram.appSecret);
  if (doc.instagram?.accessToken) doc.instagram.accessToken = decrypt(doc.instagram.accessToken);
  if (doc.instagram?.pageAccessToken) doc.instagram.pageAccessToken = decrypt(doc.instagram.pageAccessToken);

  // Facebook
  if (doc.facebook?.accessToken) doc.facebook.accessToken = decrypt(doc.facebook.accessToken);
  if (doc.facebook?.pageAccessToken) doc.facebook.pageAccessToken = decrypt(doc.facebook.pageAccessToken);

  // X / Twitter
  if (doc.x?.bearerToken) doc.x.bearerToken = decrypt(doc.x.bearerToken);
  if (doc.x?.apiKeySecret) doc.x.apiKeySecret = decrypt(doc.x.apiKeySecret);
  if (doc.x?.accessToken) doc.x.accessToken = decrypt(doc.x.accessToken);
  if (doc.x?.accessTokenSecret) doc.x.accessTokenSecret = decrypt(doc.x.accessTokenSecret);
  if (doc.x?.oauth2ClientSecret) doc.x.oauth2ClientSecret = decrypt(doc.x.oauth2ClientSecret);
  if (doc.x?.oauth2AccessToken) doc.x.oauth2AccessToken = decrypt(doc.x.oauth2AccessToken);
  if (doc.x?.oauth2RefreshToken) doc.x.oauth2RefreshToken = decrypt(doc.x.oauth2RefreshToken);

  // AI
  if (doc.ai?.groqApiKey) doc.ai.groqApiKey = decrypt(doc.ai.groqApiKey);
  if (doc.ai?.openaiApiKey) doc.ai.openaiApiKey = decrypt(doc.ai.openaiApiKey);
}
