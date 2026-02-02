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
  codeVerifier?: string;
  // Internal API (Phase 1)
  sessionCookies?: string;
  csrfToken?: string;
  affiliateTag?: string;
  isConfigured: boolean;
}

export interface ShopeeSettings {
  appId?: string;
  appSecret?: string;
  apiEnabled?: boolean;
  feedUrls?: string[];
  affiliateCode?: string;
  minDiscount?: number;
  maxPrice?: number;
  minPrice?: number;
  cacheEnabled?: boolean;
  isConfigured: boolean;
}

// ... lines 40-208 skipped ...

const AmazonSettingsSchema = new Schema(
  {
    accessKey: String,
    secretKey: String,
    associateTag: String,
    region: String,
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
    codeVerifier: String,
    sessionCookies: String,
    csrfToken: String,
    affiliateTag: String,
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

export interface TelegramSettings {
  botToken?: string;
  channelId?: string;
  isConfigured: boolean;
}

const TelegramSettingsSchema = new Schema(
  {
    botToken: String,
    channelId: String,
    isConfigured: { type: Boolean, default: false },
  },
  { _id: false }
);

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
  autoReplyDM?: boolean;
  welcomeMessage?: string;
  keywordReplies?: Map<string, string>;
  conversionKeywords?: string[];
  _oauthState?: string;
  _oauthRedirectUri?: string;
  tokenStatus?: 'active' | 'expiring' | 'expired';
  tokenExpiresAt?: Date;
}

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
    tokenStatus: {
      type: String,
      enum: ['active', 'expiring', 'expired'],
      default: 'active'
    },
    username: String,
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

const AutomationSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const CollectionSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    schedule: { type: String, default: '0 */6 * * *' },
    sources: { type: [String], default: ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'] },
    niches: { type: [String], default: ['diversified'] },
  },
  { _id: false }
);

// --- Awin Settings ---
export interface AwinSettings {
  publisherId?: string;
  apiToken?: string;
  dataFeedApiKey?: string;
  feedId?: string;
  userLogin?: string; // Stored for manual login reference if needed
  password?: string;
  recoveryCode?: string;
  enabled?: boolean;
  isConfigured: boolean;
}

const AwinSettingsSchema = new Schema({
  publisherId: { type: String },
  apiToken: { type: String },
  dataFeedApiKey: { type: String },
  feedId: { type: String },
  userLogin: { type: String },
  password: { type: String },
  recoveryCode: { type: String },
  enabled: { type: Boolean, default: false },
  isConfigured: { type: Boolean, default: false }
}, { _id: false });

export interface TwitterSettings {
  bearerToken?: string;
  apiKey?: string;
  apiKeySecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  oauth2ClientId?: string;
  oauth2ClientSecret?: string;
  oauth2RedirectUri?: string;
  oauth2AccessToken?: string;
  oauth2RefreshToken?: string;
  oauth2TokenExpiresAt?: Date;
  oauth2Scope?: string;
  tokenStatus?: 'active' | 'expiring' | 'expired';
  username?: string;
  isConfigured: boolean;
}

export interface AISettings {
  provider: 'groq' | 'openai';
  groqApiKey?: string;
  openaiApiKey?: string;
  isConfigured: boolean;
}

export interface CollectionSettings {
  enabled: boolean;
  schedule: string;
  sources: string[];
  niches: string[];
}

// === MAIN SCHEMA ===

export interface AutomationSettings {
  enabled: boolean;
}

export interface IUserSettings extends Document {
  userId: string; // Changed to string to be consistent with services using string IDs
  amazon?: AmazonSettings;
  aliexpress?: AliExpressSettings;
  mercadolivre?: MercadoLivreSettings;
  awin?: AwinSettings;
  shopee?: ShopeeSettings; // Already defined previously
  telegram?: TelegramSettings; // Ensure this exists or use any if not found, checking...
  instagram?: InstagramSettings;
  whatsapp?: WhatsAppSettings;
  x?: TwitterSettings;
  ai?: AISettings;
  automation?: AutomationSettings;
  rss?: string[];
  collectionSettings?: CollectionSettings;
  migratedFrom?: string;
  migratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    } as any,

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

    // Automação
    automation: { type: AutomationSettingsSchema, default: () => ({ enabled: false }) },

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
