export interface NicheSubcategory {
    name: string;
    keywords: string;
}

export interface PlatformNicheConfig {
    category: string;
    subcategories: NicheSubcategory[];
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
            amazon: {
                category: 'electronics',
                subcategories: [{ name: 'Geral', keywords: 'electronics gadgets' }]
            },
            shopee: {
                category: 'electronics',
                subcategories: [{ name: 'Geral', keywords: 'eletronicos casa' }]
            },
            aliexpress: {
                category: 'electronics',
                subcategories: [{ name: 'Geral', keywords: 'electronics mix' }]
            },
            mercadolivre: {
                category: 'electronics',
                subcategories: [{ name: 'Geral', keywords: 'eletronicos diversos' }]
            },
        },
    },
    tech: {
        id: 'tech',
        label: 'Tecnologia & Gadgets',
        description: 'Focado em smartphones, notebooks, acessórios e inovação.',
        platforms: {
            amazon: {
                category: 'electronics',
                subcategories: [
                    { name: 'Smartphones', keywords: 'smartphone iphone samsung xiaomi' },
                    { name: 'Notebooks', keywords: 'notebook laptop macbook dell' },
                    { name: 'Tablets', keywords: 'tablet ipad samsung tab' },
                    { name: 'Áudio', keywords: 'headphones fone bluetooth jbl' }
                ]
            },
            shopee: {
                category: 'electronics',
                subcategories: [
                    { name: 'Smartphones', keywords: 'celular smartphone iphone android' },
                    { name: 'Acessórios', keywords: 'smartwatch fone bluetooth carregador' },
                    { name: 'Áudio', keywords: 'caixa de som fone ouvido' }
                ]
            },
            aliexpress: {
                category: 'electronics',
                subcategories: [
                    { name: 'Smartphones', keywords: 'xiaomi poco redmi realme' },
                    { name: 'Gadgets', keywords: 'tech gadgets smart home' },
                    { name: 'Acessórios', keywords: 'charger cable case' }
                ]
            },
            mercadolivre: {
                category: 'electronics',
                subcategories: [
                    { name: 'Celulares', keywords: 'celular smartphone' },
                    { name: 'Informática', keywords: 'notebook monitor placa video' },
                    { name: 'Acessórios', keywords: 'mouse teclado headset' }
                ]
            },
        },
    },
    games: {
        id: 'games',
        label: 'Games & Consoles',
        description: 'Consoles (PS5, Xbox, Switch), jogos, controles e PCs gamer.',
        platforms: {
            amazon: {
                category: 'videogames',
                subcategories: [
                    { name: 'Consoles', keywords: 'playstation 5 xbox series nintendo switch' },
                    { name: 'Jogos', keywords: 'jogos ps5 xbox nintendo games' },
                    { name: 'Controles', keywords: 'controle dualsense xbox controller joycon' },
                    { name: 'PC Gamer', keywords: 'pc gamer monitor gamer teclado mecanico' }
                ]
            },
            shopee: {
                category: 'games',
                subcategories: [
                    { name: 'Consoles', keywords: 'console ps5 xbox nintendo' },
                    { name: 'Controles', keywords: 'controle joystick gamepad' },
                    { name: 'PC Gamer', keywords: 'mouse gamer teclado gamer headset' },
                    { name: 'Portáteis', keywords: 'console portatil r36s miyoo' }
                ]
            },
            aliexpress: {
                category: 'consumer_electronics',
                subcategories: [
                    { name: 'Portáteis', keywords: 'handheld console retro game anbernic' },
                    { name: 'Acessórios', keywords: 'controller gamepad case' },
                    { name: 'PC Parts', keywords: 'gpu ram ssd nvme' }
                ]
            },
            mercadolivre: {
                category: 'games',
                subcategories: [
                    { name: 'Consoles', keywords: 'playstation 5 xbox series s nintendo switch' },
                    { name: 'Controles', keywords: 'controle ps5 controle xbox' },
                    { name: 'Jogos', keywords: 'jogos ps5 midia fisica' }
                ]
            },
        },
    },
    fashion: {
        id: 'fashion',
        label: 'Moda & Acessórios',
        description: 'Roupas, calçados, bolsas, relógios e tendências.',
        platforms: {
            amazon: {
                category: 'fashion',
                subcategories: [{ name: 'Geral', keywords: 'moda roupas relogio' }]
            },
            shopee: {
                category: 'fashion',
                subcategories: [{ name: 'Geral', keywords: 'roupas femininas moda masculina teni' }]
            },
            aliexpress: {
                category: 'Apparel',
                subcategories: [{ name: 'Geral', keywords: 'fashion clothing accessories' }]
            },
            mercadolivre: {
                category: 'fashion',
                subcategories: [{ name: 'Geral', keywords: 'tenis nike adidas roupas' }]
            },
        },
    },
    home: {
        id: 'home',
        label: 'Casa & Cozinha',
        description: 'Eletroportáteis, ferramentas, decoração e utilidades.',
        platforms: {
            amazon: {
                category: 'home_garden',
                subcategories: [
                    { name: 'Cozinha', keywords: 'cozinha airfryer panela' },
                    { name: 'Limpeza', keywords: 'aspirador robo mop' },
                    { name: 'Casa', keywords: 'organizacao decoracao' }
                ]
            },
            shopee: {
                category: 'home',
                subcategories: [{ name: 'Geral', keywords: 'casa decoração cozinha' }]
            },
            aliexpress: {
                category: 'home',
                subcategories: [{ name: 'Geral', keywords: 'smart home gadget kitchen' }]
            },
            mercadolivre: {
                category: 'home',
                subcategories: [{ name: 'Geral', keywords: 'airfryer aspirador robo ferramentas' }]
            },
        },
    },
    beauty: {
        id: 'beauty',
        label: 'Beleza & Cuidados',
        description: 'Maquiagem, skincare, perfumes e cuidados pessoais.',
        platforms: {
            amazon: {
                category: 'beauty',
                subcategories: [{ name: 'Geral', keywords: 'beleza skincare perfume' }]
            },
            shopee: {
                category: 'beauty',
                subcategories: [{ name: 'Geral', keywords: 'maquiagem skincare perfume' }]
            },
            aliexpress: {
                category: 'beauty',
                subcategories: [{ name: 'Geral', keywords: 'makeup skincare beauty tools' }]
            },
            mercadolivre: {
                category: 'beauty',
                subcategories: [{ name: 'Geral', keywords: 'perfume maquiagem' }]
            },
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
            config.subcategories.forEach((sub) => {
                sub.keywords.split(' ').forEach((k) => keywordsSet.add(k));
            });
        });

        return Array.from(keywordsSet).join(' ');
    }
}
