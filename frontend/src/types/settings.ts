// Settings Configuration Types
export interface AIConfig {
    provider: string;
    groqApiKey: string;
    openaiApiKey: string;
    deepseekApiKey?: string;
}

export interface TelegramConfig {
    botToken: string;
    chatId: string;
}

export interface WhatsAppConfig {
    enabled: boolean;
    targetNumber: string;
    library: string;
}

export interface XConfig {
    bearerToken: string;
    apiKey: string;
    apiKeySecret: string;
    accessToken: string;
    accessTokenSecret: string;
}

export interface AmazonConfig {
    accessKey: string;
    secretKey: string;
    associateTag: string;
    region: string;
}

export interface AliExpressConfig {
    appKey: string;
    appSecret: string;
    trackingId: string;
}

export interface MercadoLivreConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    affiliateCode: string;
    sessionCookies: string;
    csrfToken: string;
    affiliateTag: string;
}

export interface ShopeeConfig {
    feedUrls: string[];
    affiliateCode: string;
    minDiscount: number;
}

export interface AutomationConfig {
    isActive: boolean;
    startHour: number;
    endHour: number;
    intervalMinutes: number;
    enabledChannels: string[];
    minDiscount: number;
    maxPrice: number;
    postsPerHour: number;
}

export interface CollectionConfig {
    sources: string[];
    enabled: boolean;
}

export interface ConfigState {
    ai: AIConfig;
    telegram: TelegramConfig;
    whatsapp: WhatsAppConfig;
    x: XConfig;
    amazon: AmazonConfig;
    aliexpress: AliExpressConfig;
    mercadolivre: MercadoLivreConfig;
    shopee: ShopeeConfig;
    automation: AutomationConfig;
    collection: CollectionConfig;
    rss: string[];
}

export interface MlAuthStatus {
    authenticated: boolean;
    hasRefreshToken: boolean;
    isExpired: boolean;
    expiresIn: number;
    expiresAt: string | null;
    loading: boolean;
    error?: string;
}

export interface AutomationStatus {
    isActive: boolean;
    shouldPost: boolean;
    currentHour?: number;
    lastPostedAt?: string | null;
    lastPostedTitle?: string | null;
    postsToday?: number;
    totalPosted?: number;
    pendingCount?: number;
    config?: {
        startHour: number;
        endHour: number;
        intervalMinutes: number;
        postsPerHour?: number;
        enabledChannels: string[];
    };
    message?: string;
}

export type TemplateTone = 'casual' | 'professional' | 'urgent' | 'viral';

export interface MessageTemplate {
    _id: string;
    name: string;
    tone: TemplateTone;
    content: string;
    isActive: boolean;
    isDefault: boolean;
    timesUsed: number;
    createdAt: string;
    updatedAt: string;
}
