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
      channelsAllowed: ['telegram', 'whatsapp'],
    },
    features: [
      '7 dias de teste grátis',
      '10 posts por dia',
      '2 regras de automação',
      'Telegram e WhatsApp',
      'Suporte por email',
    ],
    trialDays: 7,
  },

  pro: {
    id: 'pro',
    name: 'Performance',
    displayName: 'Performance',
    price: 7990, // R$ 79.90
    priceDisplay: 'R$ 79,90/mês',
    billingCycle: 'monthly',
    limits: {
      postsPerDay: 200,
      automationRules: 10,
      channelsAllowed: ['telegram', 'whatsapp', 'instagram', 'x'],
    },
    features: [
      '200 posts por dia',
      '10 regras de automação',
      'Todos os canais (inclui Instagram)',
      'Filtros Seguros (Whitelist/Blacklist)',
      'Analytics e Relatórios',
      'Suporte Prioritário',
    ],
    recommended: true,
  },

  agency: {
    id: 'agency',
    name: 'Plus',
    displayName: 'Plus',
    price: 11990, // R$ 119.90
    priceDisplay: 'R$ 119,90/mês',
    billingCycle: 'monthly',
    limits: {
      postsPerDay: -1, // unlimited
      automationRules: -1, // unlimited
      channelsAllowed: ['telegram', 'whatsapp', 'instagram', 'x'],
    },
    features: [
      'Ofertas Ilimitadas',
      'Automação Ilimitada',
      'Múltiplas Contas',
      'Filtros Avançados & Regex',
      'API de Integração',
      'Atendimento Dedicado (WhatsApp)',
      'Consultoria Mensal',
    ],
  },
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
  return Object.values(PLANS).filter((plan) => plan.id !== 'trial');
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
