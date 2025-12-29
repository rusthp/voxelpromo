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
    targetGroups: string[];
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

export interface AwinConfig {
    enabled: boolean;
    apiToken: string;
    publisherId: string;
    dataFeedApiKey?: string;
}

export interface LomadeeConfig {
    enabled: boolean;
    appToken: string;
    sourceId: string;
}

export interface AfilioConfig {
    enabled: boolean;
    apiToken: string;
}

export interface RakutenConfig {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    sid: string;
}

export interface InstagramConfig {
    appId: string;
    appSecret: string;
    accessToken: string;
    pageId: string;
    igUserId: string;
    webhookVerifyToken: string;
    // Personalization settings
    enabled?: boolean;
    autoReplyDM?: boolean;
    welcomeMessage?: string;
    keywordReplies?: { [keyword: string]: string };
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
    schedule: string;
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
    awin?: AwinConfig;
    lomadee?: LomadeeConfig;
    afilio?: AfilioConfig;
    rakuten?: RakutenConfig;
    instagram?: InstagramConfig;
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
