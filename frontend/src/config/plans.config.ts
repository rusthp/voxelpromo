
export interface Plan {
    id: string;
    name: string; // Internal name or short name
    displayName: string; // Display name
    description: string; // Brief description
    price: number; // in cents
    priceDisplay: string; // Formatted string
    billingCycle: string; // e.g. 'por mês'
    features: string[];
    recommended?: boolean;
    trialDays?: number;
}

export const PLANS: Plan[] = [
    {
        id: 'trial',
        name: 'Teste Grátis',
        displayName: 'Teste Grátis',
        description: 'Experimente o VoxelPromo',
        price: 0,
        priceDisplay: 'R$ 0,00',
        billingCycle: '7 dias grátis',
        features: [
            '10 posts/dia',
            'Telegram e WhatsApp',
            'Suporte por email',
            'Acesso completo por 7 dias',
            'Automação básica'
        ],
        trialDays: 7
    },
    {
        id: 'pro',
        name: 'Performance',
        displayName: 'Performance',
        description: 'Para afiliados profissionais',
        price: 7990,
        priceDisplay: 'R$ 79,90',
        billingCycle: 'por mês',
        features: [
            '200 posts/dia',
            'Todos os canais',
            'Analytics',
            'Filtros inteligentes',
            'Suporte prioritário'
        ],
        recommended: true,
        trialDays: 7
    },
    {
        id: 'agency',
        name: 'Plus',
        displayName: 'Plus',
        description: 'Para times e empresas',
        price: 11990,
        priceDisplay: 'R$ 119,90',
        billingCycle: 'por mês',
        features: [
            'Posts ilimitados',
            'White-label',
            'API',
            'Suporte dedicado',
            'Múltiplas Contas',
            'Consultoria Mensal'
        ],
        trialDays: 7
    }
];

export const getPlanById = (id: string): Plan | undefined => {
    return PLANS.find(p => p.id === id);
};
