import { logger } from '../../utils/logger';

/**
 * Intelligent category detection service
 * Analyzes product title and description to determine the correct category
 */
export class CategoryService {
  /**
   * Category keywords mapping
   * Each category has multiple keywords in Portuguese and English
   */
  private categoryKeywords: Record<string, string[]> = {
    electronics: [
      // Portuguese
      'smartphone',
      'celular',
      'iphone',
      'samsung',
      'xiaomi',
      'motorola',
      'notebook',
      'laptop',
      'computador',
      'pc',
      'desktop',
      'tablet',
      'ipad',
      'fone',
      'headphone',
      'headset',
      'earphone',
      'airpods',
      'mouse',
      'teclado',
      'keyboard',
      'monitor',
      'tela',
      'display',
      'tv',
      'televisão',
      'smart tv',
      'câmera',
      'camera',
      'webcam',
      'carregador',
      'charger',
      'cabo',
      'cable',
      'bateria',
      'battery',
      'power bank',
      'roteador',
      'router',
      'modem',
      'smartwatch',
      'relógio inteligente',
      'drone',
      'gopro',
      'console',
      'playstation',
      'xbox',
      'nintendo',
      'processador',
      'cpu',
      'gpu',
      'placa de vídeo',
      'memória',
      'ram',
      'ssd',
      'hd',
      'led',
      'lâmpada inteligente',
      'smart light',
      'alexa',
      'google home',
      'assistente virtual',
    ],
    fashion: [
      // Portuguese
      'chinelo',
      'sandália',
      'sapato',
      'tênis',
      'sneaker',
      'camiseta',
      'camisa',
      'blusa',
      'blusa',
      'calça',
      'jeans',
      'bermuda',
      'short',
      'vestido',
      'saia',
      'macacão',
      'casaco',
      'jaqueta',
      'blazer',
      'moletom',
      'bolsa',
      'mochila',
      'carteira',
      'necessaire',
      'relógio',
      'watch',
      'pulseira',
      'bracelet',
      'óculos',
      'oculos',
      'sunglasses',
      'óculos de sol',
      'chapéu',
      'boné',
      'gorro',
      'meia',
      'sock',
      'meias',
      'cueca',
      'calcinha',
      'lingerie',
      'biquíni',
      'maiô',
      'swimwear',
      'perfume',
      'colônia',
      'fragrância',
    ],
    home: [
      // Portuguese
      'pote',
      'vasilha',
      'recipiente',
      'container',
      'vidro',
      'glass',
      'hermético',
      'hermetic',
      'tampa',
      'lid',
      'frasco',
      'jar',
      'organizador',
      'organizer',
      'caixa',
      'box',
      'decoração',
      'decoration',
      'quadro',
      'picture',
      'almofada',
      'pillow',
      'cushion',
      'cortina',
      'curtain',
      'persiana',
      'tapete',
      'rug',
      'carpet',
      'luminária',
      'lamp',
      'abajur',
      'vaso',
      'vase',
      'planta',
      'espelho',
      'mirror',
      'prateleira',
      'shelf',
      'estante',
      'gaveta',
      'drawer',
      'cômoda',
      'mesa',
      'table',
      'cadeira',
      'chair',
      'sofá',
      'sofa',
      'poltrona',
      'cama',
      'bed',
      'colchão',
      'mattress',
      'travesseiro',
      'pillow',
      'edredom',
      'duvet',
      'toalha',
      'towel',
      'toalha de mesa',
      'panela',
      'pot',
      'frigideira',
      'pan',
      'talher',
      'utensílio',
      'cutlery',
      'prato',
      'plate',
      'xícara',
      'cup',
      'copos',
      'glasses',
      'caneca',
      'mug',
    ],
    beauty: [
      // Portuguese
      'maquiagem',
      'makeup',
      'batom',
      'lipstick',
      'base',
      'foundation',
      'pó',
      'powder',
      'sombra',
      'eyeshadow',
      'máscara',
      'mascara',
      'delineador',
      'eyeliner',
      'rimel',
      'pincel',
      'brush',
      'esponja',
      'sponge',
      'perfume',
      'fragrance',
      'colônia',
      'creme',
      'cream',
      'hidratante',
      'moisturizer',
      'sérum',
      'serum',
      'essência',
      'protetor solar',
      'sunscreen',
      'fps',
      'shampoo',
      'condicionador',
      'conditioner',
      'sabonete',
      'soap',
      'gel de limpeza',
      'esfoliante',
      'scrub',
      'máscara facial',
      'esmalte',
      'nail polish',
      'unha',
      'barbeador',
      'razor',
      'gilete',
      'aparelho de barbear',
      'shaver',
      'secador',
      'hair dryer',
      'chapinha',
      'straightener',
      'escova',
      'brush',
      'pente',
      'comb',
    ],
    sports: [
      // Portuguese
      'academia',
      'gym',
      'fitness',
      'halter',
      'dumbbell',
      'peso',
      'weight',
      'bicicleta',
      'bike',
      'bicicleta ergométrica',
      'esteira',
      'treadmill',
      'corrida',
      'yoga',
      'pilates',
      'alongamento',
      'tênis',
      'sneaker',
      'sapato esportivo',
      'camiseta esportiva',
      'dry fit',
      'short esportivo',
      'legging',
      'garrafa',
      'bottle',
      'squeeze',
      'corda',
      'rope',
      'pular corda',
      'bola',
      'ball',
      'futebol',
      'basquete',
      'raquete',
      'racket',
      'tênis de mesa',
      'prancha',
      'surf',
      'stand up paddle',
    ],
    toys: [
      // Portuguese
      'brinquedo',
      'toy',
      'boneca',
      'doll',
      'carrinho',
      'car',
      'carro de brinquedo',
      'lego',
      'bloco',
      'block',
      'puzzle',
      'quebra-cabeça',
      'pelúcia',
      'stuffed animal',
      'ursinho',
      'jogo',
      'game',
      'tabuleiro',
      'board game',
      'bicicleta infantil',
      'triciclo',
      'patinete',
      'scooter',
      'bola',
      'ball',
      'futebol',
      'boneco',
      'action figure',
    ],
    books: [
      // Portuguese
      'livro',
      'book',
      'ebook',
      'e-book',
      'revista',
      'magazine',
      'mangá',
      'manga',
      'quadrinho',
      'comic',
      'caderno',
      'notebook',
      'agenda',
      'caneta',
      'pen',
      'lápis',
      'pencil',
      'marca-texto',
      'highlighter',
      'post-it',
      'adesivo',
      'sticker',
    ],
    automotive: [
      // Portuguese
      'carro',
      'car',
      'automóvel',
      'moto',
      'motorcycle',
      'motocicleta',
      'pneu',
      'tire',
      'pneu',
      'bateria automotiva',
      'car battery',
      'óleo',
      'oil',
      'óleo de motor',
      'filtro',
      'filter',
      'filtro de ar',
      'farol',
      'headlight',
      'lanterna',
      'limpador',
      'wiper',
      'palheta',
      'capa',
      'cover',
      'capa de volante',
      'suporte',
      'mount',
      'suporte para celular',
      'carregador veicular',
      'car charger',
    ],
    pets: [
      // Portuguese
      'pet',
      'cachorro',
      'dog',
      'gato',
      'cat',
      'ração',
      'food',
      'ração para',
      'brinquedo pet',
      'pet toy',
      'coleira',
      'collar',
      'guia',
      'leash',
      'casinha',
      'house',
      'cama pet',
      'comedouro',
      'feeder',
      'bebedouro',
      'areia',
      'litter',
      'granulado',
      'shampoo pet',
      'pet shampoo',
    ],
    food: [
      // Portuguese
      'comida',
      'food',
      'alimento',
      'bebida',
      'drink',
      'refrigerante',
      'chocolate',
      'doce',
      'candy',
      'café',
      'coffee',
      'café em cápsula',
      'chá',
      'tea',
      'mate',
      'arroz',
      'rice',
      'feijão',
      'bean',
      'óleo',
      'oil',
      'azeite',
      'açúcar',
      'sugar',
      'sal',
      'salt',
      'farinha',
      'flour',
      'trigo',
      'leite',
      'milk',
      'iogurte',
      'yogurt',
      'queijo',
      'cheese',
      'manteiga',
      'butter',
    ],
    health: [
      // Portuguese
      'vitamina',
      'vitamin',
      'suplemento',
      'medicamento',
      'medicine',
      'remédio',
      'termômetro',
      'thermometer',
      'balança',
      'scale',
      'balança digital',
      'tensiômetro',
      'blood pressure',
      'máscara',
      'mask',
      'máscara cirúrgica',
      'álcool',
      'alcohol',
      'álcool em gel',
      'curativo',
      'bandage',
      'gaze',
    ],
  };

  /**
   * Detect category from product title and description
   * Uses intelligent keyword matching with priority scoring
   */
  detectCategory(title: string, description?: string, providedCategory?: string): string {
    const text = `${title} ${description || ''}`.toLowerCase();

    // If a valid category is provided and it's not "electronics" (default), use it
    if (
      providedCategory &&
      providedCategory !== 'electronics' &&
      providedCategory !== 'general' &&
      Object.keys(this.categoryKeywords).includes(providedCategory.toLowerCase())
    ) {
      // Verify it matches the product
      const providedCategoryLower = providedCategory.toLowerCase();
      const keywords = this.categoryKeywords[providedCategoryLower] || [];
      const hasMatch = keywords.some((keyword) => text.includes(keyword));

      if (hasMatch) {
        logger.debug(`✅ Using provided category "${providedCategoryLower}" (verified)`, {
          title: title.substring(0, 50),
        });
        return providedCategoryLower;
      }
    }

    // Score each category based on keyword matches
    const categoryScores: Record<string, number> = {};

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      let score = 0;

      for (const keyword of keywords) {
        // Exact word match (higher score)
        const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (wordRegex.test(text)) {
          score += 2;
        }
        // Partial match (lower score)
        else if (text.includes(keyword)) {
          score += 1;
        }
      }

      if (score > 0) {
        categoryScores[category] = score;
      }
    }

    // Find category with highest score
    const sortedCategories = Object.entries(categoryScores).sort(([, a], [, b]) => b - a);

    if (sortedCategories.length > 0 && sortedCategories[0][1] > 0) {
      const detectedCategory = sortedCategories[0][0];
      logger.debug(
        `🎯 Detected category: "${detectedCategory}" (score: ${sortedCategories[0][1]})`,
        {
          title: title.substring(0, 50),
          topMatches: sortedCategories
            .slice(0, 3)
            .map(([cat, score]) => `${cat}:${score}`)
            .join(', '),
        }
      );
      return detectedCategory;
    }

    // Fallback: try to detect from common patterns
    const fallbackCategory = this.detectFromPatterns(text);
    if (fallbackCategory) {
      logger.debug(`🔍 Fallback category detection: "${fallbackCategory}"`, {
        title: title.substring(0, 50),
      });
      return fallbackCategory;
    }

    // Last resort: return "other"
    logger.debug(`⚠️ No category detected, using "other"`, {
      title: title.substring(0, 50),
    });
    return 'other';
  }

  /**
   * Detect category from common patterns
   */
  private detectFromPatterns(text: string): string | null {
    // Kitchen/home patterns
    if (text.match(/\b(pote|vasilha|recipiente|container|vidro|hermético)\b/i)) {
      return 'home';
    }

    // Footwear patterns
    if (text.match(/\b(chinelo|sandália|sapato|tênis|sneaker)\b/i)) {
      return 'fashion';
    }

    // Clothing patterns
    if (text.match(/\b(camiseta|camisa|blusa|calça|vestido|casaco)\b/i)) {
      return 'fashion';
    }

    // Electronics patterns (be more specific)
    if (text.match(/\b(smartphone|celular|notebook|laptop|tablet|fone|headphone)\b/i)) {
      return 'electronics';
    }

    return null;
  }

  /**
   * Get all available categories
   */
  getAvailableCategories(): string[] {
    return Object.keys(this.categoryKeywords);
  }

  /**
   * Validate if a category exists
   */
  isValidCategory(category: string): boolean {
    return Object.keys(this.categoryKeywords).includes(category.toLowerCase());
  }
}
