/**
 * VoxelPromo Subscription Plans Configuration
 * Mercado Pago Integration
 */

export interface PlanConfig {
    id: string;
    name: string;
    displayName: string;
    price: number; // In cents (BRL)
    priceDisplay: string;
    billingCycle: 'monthly' | 'yearly';
    limits: {
        postsPerDay: number; // -1 = unlimited
        automationRules: number;
        channelsAllowed: string[]; // ['telegram', 'whatsapp', 'instagram', 'x']
    };
    features: string[];
    trialDays?: number;
    recommended?: boolean;
}

export const PLANS: Record<string, PlanConfig> = {
    trial: {
        id: 'trial',
        name: 'Trial',
        displayName: 'Teste Grátis',
        price: 0,
        priceDisplay: 'Grátis por 7 dias',
        billingCycle: 'monthly',
        limits: {
            postsPerDay: 10,
            automationRules: 2,
            channelsAllowed: ['telegram', 'whatsapp']
        },
        features: [
            '7 dias de teste grátis',
            '10 posts por dia',
            '2 regras de automação',
            'Telegram e WhatsApp',
            'Suporte por email'
        ],
        trialDays: 7
    },

    'basic-monthly': {
        id: 'basic-monthly',
        name: 'Basic Monthly',
        displayName: 'Básico Mensal',
        price: 2990, // R$ 29.90
        priceDisplay: 'R$ 29,90/mês',
        billingCycle: 'monthly',
        limits: {
            postsPerDay: 50,
            automationRules: 5,
            channelsAllowed: ['telegram', 'whatsapp', 'instagram', 'x']
        },
        features: [
            '50 posts por dia',
            '5 regras de automação',
            'Todos os canais disponíveis',
            'Analytics básico',
            'Suporte por email'
        ]
    },

    'premium-annual': {
        id: 'premium-annual',
        name: 'Premium Annual',
        displayName: 'Premium Anual',
        price: 99900, // R$ 999.00 (anual - desconto de ~20%)
        priceDisplay: 'R$ 999,00/ano',
        billingCycle: 'yearly',
        limits: {
            postsPerDay: 200,
            automationRules: 20,
            channelsAllowed: ['telegram', 'whatsapp', 'instagram', 'x']
        },
        features: [
            '200 posts por dia',
            '20 regras de automação',
            'Todos os canais disponíveis',
            'Analytics avançado',
            'Exportação de dados',
            'Suporte prioritário',
            'Sem marca d\'água',
            '2 meses grátis (economia de R$ 200)'
        ],
        recommended: true
    },

    pro: {

        id: 'pro',
        name: 'Pro',
        displayName: 'Profissional',
        price: 4990, // R$ 49.90
        priceDisplay: 'R$ 49,90/mês',
        billingCycle: 'monthly',
        limits: {
            postsPerDay: 100,
            automationRules: 10,
            channelsAllowed: ['telegram', 'whatsapp', 'instagram', 'x']
        },
        features: [
            '100 posts por dia',
            '10 regras de automação',
            'Todos os canais disponíveis',
            'Analytics e relatórios',
            'Suporte prioritário',
            'Sem marca d\'água'
        ],
        recommended: true
    },

    agency: {
        id: 'agency',
        name: 'Agency',
        displayName: 'Agência',
        price: 19990, // R$ 199.90
        priceDisplay: 'R$ 199,90/mês',
        billingCycle: 'monthly',
        limits: {
            postsPerDay: -1, // unlimited
            automationRules: -1, // unlimited
            channelsAllowed: ['telegram', 'whatsapp', 'instagram', 'x']
        },
        features: [
            'Posts ilimitados',
            'Regras de automação ilimitadas',
            'Todos os canais disponíveis',
            'White-label (sua marca)',
            'API de integração',
            'Multi-usuários (até 5)',
            'Suporte dedicado (WhatsApp)',
            'Consultoria mensal'
        ]
    }
};

/**
 * Get plan by ID
 */
export function getPlan(planId: string): PlanConfig | null {
    return PLANS[planId] || null;
}

/**
 * Get all available plans (excluding trial)
 */
export function getAvailablePlans(): PlanConfig[] {
    return Object.values(PLANS).filter(plan => plan.id !== 'trial');
}

/**
 * Check if user has access based on plan limits
 */
export function canUserPerformAction(
    userPlan: string,
    action: 'post' | 'automation' | 'channel',
    currentUsage?: { posts?: number; automations?: number },
    channel?: string
): boolean {
    const plan = getPlan(userPlan);
    if (!plan) return false;

    switch (action) {
        case 'post':
            if (plan.limits.postsPerDay === -1) return true;
            return (currentUsage?.posts || 0) < plan.limits.postsPerDay;

        case 'automation':
            if (plan.limits.automationRules === -1) return true;
            return (currentUsage?.automations || 0) < plan.limits.automationRules;

        case 'channel':
            if (!channel) return false;
            return plan.limits.channelsAllowed.includes(channel);

        default:
            return false;
    }
}
