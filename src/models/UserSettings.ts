import mongoose, { Schema, Document } from 'mongoose';

/**
 * UserSettings - Configurações de integrações por usuário
 * MULTI-TENANT: Cada usuário tem suas próprias credenciais
 */

// === AFILIADOS ===

export interface AmazonSettings {
  accessKey?: string;
  secretKey?: string;
  associateTag?: string;
  region?: string;
  isConfigured: boolean;
}

export interface AliExpressSettings {
  appKey?: string;
  appSecret?: string;
  trackingId?: string;
  isConfigured: boolean;
}

export interface MercadoLivreSettings {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  affiliateCode?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  // Internal API (Phase 1)
  sessionCookies?: string;
  csrfToken?: string;
  affiliateTag?: string;
  isConfigured: boolean;
}

export interface AwinSettings {
  apiToken?: string;
  publisherId?: string;
  dataFeedApiKey?: string;
  enabled?: boolean;
  isConfigured: boolean;
}

export interface ShopeeSettings {
  // API Credentials (GraphQL)
  appId?: string;
  appSecret?: string;
  apiEnabled?: boolean; // Toggle API vs CSV-only
  // CSV Feed Settings
  feedUrls?: string[];
  affiliateCode?: string;
  // Collection Filters
  minDiscount?: number;
  maxPrice?: number;
  minPrice?: number;
  cacheEnabled?: boolean;
  isConfigured: boolean;
}

// === MENSAGEIROS ===

export interface TelegramSettings {
  botToken?: string;
  channelId?: string;
  isConfigured: boolean;
}

export interface InstagramSettings {
  appId?: string;
  appSecret?: string;
  accessToken?: string;
  pageAccessToken?: string;
  pageId?: string;
  igUserId?: string;
  username?: string;
  accountType?: string;
  webhookVerifyToken?: string;
  pendingOAuth?: boolean;
  isConfigured: boolean;
  // Automation settings
  autoReplyDM?: boolean;
  welcomeMessage?: string;
  keywordReplies?: Map<string, string>;
  conversionKeywords?: string[];
  // OAuth State (Temporary)
  _oauthState?: string;
  _oauthRedirectUri?: string;
}

export interface WhatsAppSettings {
  enabled?: boolean;
  targetNumber?: string;
  targetGroups?: string[];
  library?: string;
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  isConfigured: boolean;
}

export interface XSettings {
  bearerToken?: string;
  apiKey?: string;
  apiKeySecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  // OAuth 2.0
  oauth2ClientId?: string;
  oauth2ClientSecret?: string;
  oauth2RedirectUri?: string;
  oauth2AccessToken?: string;
  oauth2RefreshToken?: string;
  oauth2TokenExpiresAt?: Date;
  oauth2Scope?: string;
  isConfigured: boolean;
}

// === IA ===

export interface AISettings {
  provider?: 'groq' | 'openai';
  groqApiKey?: string;
  openaiApiKey?: string;
  isConfigured: boolean;
}

// === COLETA ===

export interface CollectionSettings {
  enabled: boolean;
  schedule?: string;
  sources: string[];
}

// === MAIN INTERFACE ===

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;

  // Afiliados
  amazon: AmazonSettings;
  aliexpress: AliExpressSettings;
  mercadolivre: MercadoLivreSettings;
  awin: AwinSettings;
  shopee: ShopeeSettings;

  // Mensageiros
  telegram: TelegramSettings;
  instagram: InstagramSettings;
  whatsapp: WhatsAppSettings;
  x: XSettings;

  // IA
  ai: AISettings;

  // Coleta
  rss: string[];
  collectionSettings: CollectionSettings;

  // Metadados de migração
  migratedFrom?: string;
  migratedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// === SCHEMAS ===

const AmazonSettingsSchema = new Schema(
  {
    accessKey: String,
    secretKey: String,
    associateTag: String,
    region: { type: String, default: 'sa-east-1' },
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const AliExpressSettingsSchema = new Schema(
  {
    appKey: String,
    appSecret: String,
    trackingId: String,
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const MercadoLivreSettingsSchema = new Schema(
  {
    clientId: String,
    clientSecret: String,
    redirectUri: String,
    affiliateCode: String,
    accessToken: String,
    refreshToken: String,
    tokenExpiresAt: Date,
    sessionCookies: String,
    csrfToken: String,
    affiliateTag: String,
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const AwinSettingsSchema = new Schema(
  {
    apiToken: String,
    publisherId: String,
    dataFeedApiKey: String,
    enabled: { type: Boolean, default: false },
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const ShopeeSettingsSchema = new Schema(
  {
    // API Credentials (GraphQL)
    appId: String,
    appSecret: String,
    apiEnabled: { type: Boolean, default: false },
    // CSV Feed Settings
    feedUrls: [String],
    affiliateCode: String,
    // Collection Filters
    minDiscount: Number,
    maxPrice: Number,
    minPrice: Number,
    cacheEnabled: Boolean,
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const TelegramSettingsSchema = new Schema(
  {
    botToken: String,
    channelId: String,
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const InstagramSettingsSchema = new Schema(
  {
    appId: String,
    appSecret: String,
    accessToken: String,
    pageAccessToken: String,
    pageId: String,
    igUserId: String,
    username: String,
    accountType: String,
    webhookVerifyToken: String,
    pendingOAuth: { type: Boolean, default: false },
    isConfigured: { type: Boolean, default: false },
    autoReplyDM: { type: Boolean, default: true },
    welcomeMessage: { type: String, default: 'Olá! Como posso ajudar?' },
    keywordReplies: { type: Map, of: String, default: {} },
    conversionKeywords: { type: [String], default: ['quero', 'eu quero', 'link', 'comprar'] },
    _oauthState: String,
    _oauthRedirectUri: String,
  },
  { _id: false }
);

const WhatsAppSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    targetNumber: String,
    targetGroups: [String],
    library: { type: String, default: 'baileys' },
    accessToken: String,
    phoneNumberId: String,
    businessAccountId: String,
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const XSettingsSchema = new Schema(
  {
    bearerToken: String,
    apiKey: String,
    apiKeySecret: String,
    accessToken: String,
    accessTokenSecret: String,
    oauth2ClientId: String,
    oauth2ClientSecret: String,
    oauth2RedirectUri: { type: String, default: 'http://localhost:3000/api/x/auth/callback' },
    oauth2AccessToken: String,
    oauth2RefreshToken: String,
    oauth2TokenExpiresAt: Date,
    oauth2Scope: String,
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const AISettingsSchema = new Schema(
  {
    provider: { type: String, enum: ['groq', 'openai'], default: 'groq' },
    groqApiKey: String,
    openaiApiKey: String,
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

const CollectionSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    schedule: { type: String, default: '0 */6 * * *' },
    sources: { type: [String], default: ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'] },
  },
  { _id: false }
);

// === MAIN SCHEMA ===

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Afiliados
    amazon: { type: AmazonSettingsSchema, default: () => ({ isConfigured: false }) },
    aliexpress: { type: AliExpressSettingsSchema, default: () => ({ isConfigured: false }) },
    mercadolivre: { type: MercadoLivreSettingsSchema, default: () => ({ isConfigured: false }) },
    awin: { type: AwinSettingsSchema, default: () => ({ isConfigured: false }) },
    shopee: { type: ShopeeSettingsSchema, default: () => ({ isConfigured: false }) },

    // Mensageiros
    telegram: { type: TelegramSettingsSchema, default: () => ({ isConfigured: false }) },
    instagram: { type: InstagramSettingsSchema, default: () => ({ isConfigured: false }) },
    whatsapp: { type: WhatsAppSettingsSchema, default: () => ({ isConfigured: false }) },
    x: { type: XSettingsSchema, default: () => ({ isConfigured: false }) },

    // IA
    ai: { type: AISettingsSchema, default: () => ({ provider: 'groq', isConfigured: false }) },

    // Coleta
    rss: { type: [String], default: [] },
    collectionSettings: {
      type: CollectionSettingsSchema,
      default: () => ({ enabled: true, sources: [] }),
    },

    // Metadados de migração
    migratedFrom: String,
    migratedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Índice único para garantir uma configuração por usuário
UserSettingsSchema.index({ userId: 1 }, { unique: true, name: 'user_settings_unique' });

export const UserSettingsModel = mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
