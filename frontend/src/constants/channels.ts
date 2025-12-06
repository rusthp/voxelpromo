// Channel and Platform Constants

export const MESSAGING_CHANNELS = {
    TELEGRAM: 'telegram',
    WHATSAPP: 'whatsapp',
    X: 'x',
} as const;

export const MESSAGING_CHANNEL_LABELS: Record<string, string> = {
    [MESSAGING_CHANNELS.TELEGRAM]: 'Telegram',
    [MESSAGING_CHANNELS.WHATSAPP]: 'WhatsApp',
    [MESSAGING_CHANNELS.X]: 'X (Twitter)',
};

export const AFFILIATE_PLATFORMS = {
    AMAZON: 'amazon',
    ALIEXPRESS: 'aliexpress',
    MERCADOLIVRE: 'mercadolivre',
    SHOPEE: 'shopee',
} as const;

export const AI_PROVIDERS = {
    GROQ: 'groq',
    OPENAI: 'openai',
    DEEPSEEK: 'deepseek',
} as const;

export const AI_PROVIDER_LABELS: Record<string, string> = {
    [AI_PROVIDERS.GROQ]: 'Groq (Recomendado - Rápido e Gratuito)',
    [AI_PROVIDERS.OPENAI]: 'OpenAI (GPT-4)',
    [AI_PROVIDERS.DEEPSEEK]: 'DeepSeek (Custo-benefício)',
};

export const AMAZON_REGIONS = {
    BRAZIL: 'sa-east-1',
    USA: 'us-east-1',
} as const;

export const AMAZON_REGION_LABELS: Record<string, string> = {
    [AMAZON_REGIONS.BRAZIL]: 'Brasil (sa-east-1)',
    [AMAZON_REGIONS.USA]: 'EUA (us-east-1)',
};

export const AUTOMATION_INTERVALS = [
    { value: 5, label: '5 minutos (Risco de Spam)' },
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos (Recomendado)' },
    { value: 60, label: '1 hora' },
    { value: 120, label: '2 horas' },
];

export const WHATSAPP_LIBRARIES = [
    { value: 'whatsapp-web.js', label: 'whatsapp-web.js (Mais estável)' },
    { value: 'baileys', label: 'Baileys (Mais leve)' },
];

export type MessagingChannel = typeof MESSAGING_CHANNELS[keyof typeof MESSAGING_CHANNELS];
export type AffiliatePlatform = typeof AFFILIATE_PLATFORMS[keyof typeof AFFILIATE_PLATFORMS];
export type AIProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];
