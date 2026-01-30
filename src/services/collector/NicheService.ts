export interface PlatformNicheConfig {
    keywords: string;
    category: string;
}

export interface NicheDefinition {
    id: string;
    label: string;
    description: string;
    platforms: {
        amazon: PlatformNicheConfig;
        shopee: PlatformNicheConfig;
        aliexpress: PlatformNicheConfig;
        mercadolivre: PlatformNicheConfig;
    };
}

export const SUPPORTED_NICHES: Record<string, NicheDefinition> = {
    diversified: {
        id: 'diversified',
        label: 'Diversificado (Tech & Mix)',
        description: 'Mix equilibrado com viés em eletrônicos populares e ofertas variadas.',
        platforms: {
            amazon: { keywords: 'electronics gadgets', category: 'electronics' },
            shopee: { keywords: 'eletronicos casa', category: 'electronics' },
            aliexpress: { keywords: 'electronics mix', category: 'electronics' },
            mercadolivre: { keywords: 'eletronicos diversos', category: 'electronics' },
        },
    },
    tech: {
        id: 'tech',
        label: 'Tecnologia & Gadgets',
        description: 'Focado em smartphones, notebooks, acessórios e inovação.',
        platforms: {
            amazon: { keywords: 'smartphone notebook tablet headphones', category: 'electronics' },
            shopee: { keywords: 'celular fone bluetooth smartwatch', category: 'electronics' },
            aliexpress: { keywords: 'xiaomi smartphone tech gadgets', category: 'electronics' },
            mercadolivre: { keywords: 'celular notebook placa de video', category: 'electronics' },
        },
    },
    games: {
        id: 'games',
        label: 'Games & Consoles',
        description: 'Consoles (PS5, Xbox, Switch), jogos, controles e PCs gamer.',
        platforms: {
            amazon: { keywords: 'playstation xbox nintendo switch games', category: 'videogames' },
            shopee: { keywords: 'console controle ps5 nintendo', category: 'games' },
            aliexpress: { keywords: 'handheld console gaming accessories', category: 'consumer_electronics' },
            mercadolivre: { keywords: 'ps5 xbox series nintendo switch', category: 'games' },
        },
    },
    fashion: {
        id: 'fashion',
        label: 'Moda & Acessórios',
        description: 'Roupas, calçados, bolsas, relógios e tendências.',
        platforms: {
            amazon: { keywords: 'moda roupas relogio', category: 'fashion' },
            shopee: { keywords: 'roupas femininas moda masculina teni', category: 'fashion' },
            aliexpress: { keywords: 'fashion clothing accessories', category: 'Apparel' },
            mercadolivre: { keywords: 'tenis nike adidas roupas', category: 'fashion' },
        },
    },
    home: {
        id: 'home',
        label: 'Casa & Cozinha',
        description: 'Eletroportáteis, ferramentas, decoração e utilidades.',
        platforms: {
            amazon: { keywords: 'cozinha airfryer aspirador', category: 'home_garden' },
            shopee: { keywords: 'casa decoração cozinha', category: 'home' },
            aliexpress: { keywords: 'smart home gadget kitchen', category: 'home' },
            mercadolivre: { keywords: 'airfryer aspirador robo ferramentas', category: 'home' },
        },
    },
    beauty: {
        id: 'beauty',
        label: 'Beleza & Cuidados',
        description: 'Maquiagem, skincare, perfumes e cuidados pessoais.',
        platforms: {
            amazon: { keywords: 'beleza skincare perfume', category: 'beauty' },
            shopee: { keywords: 'maquiagem skincare perfume', category: 'beauty' },
            aliexpress: { keywords: 'makeup skincare beauty tools', category: 'beauty' },
            mercadolivre: { keywords: 'perfume maquiagem', category: 'beauty' },
        },
    },
};

export class NicheService {
    /**
     * Get configuration for a specific niche and platform
     */
    static getConfig(
        nicheId: string,
        platform: 'amazon' | 'shopee' | 'aliexpress' | 'mercadolivre'
    ): PlatformNicheConfig {
        const niche = SUPPORTED_NICHES[nicheId] || SUPPORTED_NICHES['diversified'];
        return niche.platforms[platform];
    }

    /**
     * Get all supported niches
     */
    static getNiches(): NicheDefinition[] {
        return Object.values(SUPPORTED_NICHES);
    }

    /**
     * Get consolidated keyword string for a set of niches
     * Useful for platforms that accept a single search query
     */
    static getMergedKeywords(
        nicheIds: string[],
        platform: 'amazon' | 'shopee' | 'aliexpress' | 'mercadolivre'
    ): string {
        const validIds = nicheIds.length > 0 ? nicheIds : ['diversified'];
        const keywordsSet = new Set<string>();

        validIds.forEach((id) => {
            const config = this.getConfig(id, platform);
            config.keywords.split(' ').forEach((k) => keywordsSet.add(k));
        });

        return Array.from(keywordsSet).join(' ');
    }
}
