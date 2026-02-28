import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { AIPostRequest, AIPostResponse, Offer } from '../../types';
import { logger } from '../../utils/logger';
import { TemplateService } from '../automation/TemplateService';

export class AIService {
  private groqClient: Groq | null = null;
  private openaiClient: OpenAI | null = null;
  private deepseekClient: OpenAI | null = null; // DeepSeek uses OpenAI-compatible API
  private provider: 'groq' | 'openai' | 'deepseek';
  private templateService: TemplateService;

  constructor() {
    this.provider = (process.env.AI_PROVIDER || 'groq') as 'groq' | 'openai' | 'deepseek';
    this.templateService = new TemplateService();

    if (this.provider === 'groq' && process.env.GROQ_API_KEY) {
      this.groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    } else if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else if (this.provider === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
      this.deepseekClient = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
      });
    }
  }

  /**
   * Test connection to the AI provider
   * Returns success message or throws error
   */
  async testConnection(
    provider?: string,
    apiKey?: string
  ): Promise<{ success: boolean; message: string; provider: string }> {
    const targetProvider = provider || this.provider;

    try {
      let testClient: Groq | OpenAI | null = null;
      const testPrompt = 'Responda apenas: OK';
      let model = '';

      if (targetProvider === 'groq') {
        const key = apiKey || process.env.GROQ_API_KEY;
        if (!key) throw new Error('Groq API Key não configurada');
        testClient = new Groq({ apiKey: key });
        model = 'llama-3.1-8b-instant';
      } else if (targetProvider === 'openai') {
        const key = apiKey || process.env.OPENAI_API_KEY;
        if (!key) throw new Error('OpenAI API Key não configurada');
        testClient = new OpenAI({ apiKey: key });
        model = 'gpt-3.5-turbo';
      } else if (targetProvider === 'deepseek') {
        const key = apiKey || process.env.DEEPSEEK_API_KEY;
        if (!key) throw new Error('DeepSeek API Key não configurada');
        testClient = new OpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' });
        model = 'deepseek-chat';
      } else {
        throw new Error(`Provedor desconhecido: ${targetProvider}`);
      }

      // Make a minimal test request
      if (targetProvider === 'groq') {
        await (testClient as Groq).chat.completions.create({
          messages: [{ role: 'user', content: testPrompt }],
          model,
          max_tokens: 5,
        });
      } else {
        await (testClient as OpenAI).chat.completions.create({
          messages: [{ role: 'user', content: testPrompt }],
          model,
          max_tokens: 5,
        });
      }

      logger.info(`✅ AI connection test successful for ${targetProvider}`);
      return {
        success: true,
        message: `Conexão com ${targetProvider.toUpperCase()} funcionando!`,
        provider: targetProvider,
      };
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      logger.error(`❌ AI connection test failed for ${targetProvider}:`, errorMsg);

      // Parse common error types for user-friendly messages
      if (
        errorMsg.includes('401') ||
        errorMsg.includes('Unauthorized') ||
        errorMsg.includes('invalid_api_key')
      ) {
        throw new Error(`API Key inválida para ${targetProvider}`);
      } else if (errorMsg.includes('429') || errorMsg.includes('rate_limit')) {
        throw new Error(`Limite de requisições atingido para ${targetProvider}`);
      } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
        throw new Error(`Não foi possível conectar ao servidor ${targetProvider}`);
      }

      throw new Error(`Erro ao conectar com ${targetProvider}: ${errorMsg}`);
    }
  }

  /**
   * Generate post content for an offer
   */
  async generatePost(request: AIPostRequest): Promise<AIPostResponse> {
    try {
      const prompt = this.buildPrompt(request);

      if (this.provider === 'groq' && this.groqClient) {
        return await this.generateWithGroq(prompt, request);
      } else if (this.provider === 'openai' && this.openaiClient) {
        return await this.generateWithOpenAI(prompt, request);
      } else if (this.provider === 'deepseek' && this.deepseekClient) {
        return await this.generateWithDeepSeek(prompt, request);
      } else {
        // No provider configured is a valid state - use fallback without error
        logger.debug('ℹ️ No AI provider configured, using fallback templates.');
        return this.generateFallbackPost(request.offer);
      }
    } catch (error) {
      logger.error('Error generating AI post:', error);
      // Return fallback post
      return this.generateFallbackPost(request.offer);
    }
  }

  /**
   * Build prompt for AI
   */
  private buildPrompt(request: AIPostRequest): string {
    const { offer, tone, maxLength, includeEmojis, includeHashtags } = request;

    const toneInstructions: Record<string, string> = {
      casual:
        'Use linguagem casual, divertida e com humor leve. Faça piadas sutis se apropriado, como um amigo recomendando algo.',
      professional:
        'Use linguagem profissional, direta e informativa, focando nos benefícios técnicos.',
      viral:
        'Crie um post que seja irresistível e viralizável, use gatilhos mentais como urgência e escassez.',
      urgent: 'Crie senso de urgência, mostre que a oferta é limitada e imperdível.',
    };

    const toneText = toneInstructions[tone || 'viral'] || toneInstructions.viral;

    // Category-based storytelling examples
    const categoryStorytellingExamples = this.getCategoryStorytellingExamples(
      offer.category || 'geral'
    );

    return `Você é um copywriter criativo e especialista em ofertas virais para o Telegram e WhatsApp.

REGRA DE #1: NUNCA crie textos iguais. Fuja de clichês! Comece CADA POST de um jeito diferente (piada, pergunta instigante, meme em texto, curiosidade, ou alerta de preço bizarro).
NUNCA, JAMAIS use o termo "IMPERDÍVEL" ou "BAIXOU MUITO". Pense fora da caixa!

${categoryStorytellingExamples}

REGRAS DE FORMATAÇÃO (ESTRITAMENTE OBRIGATÓRIAS):
- Use HTML <b>texto</b> para negrito. NUNCA use asteriscos como *texto* ou **texto**.
- NÃO use HTML <br> ou <br/>, apenas quebras de linha com "Enter" (\\n).
- Destaque o benefício ou a brincadeira no título.
- Se houver um desconto maior ou igual a 5%, mostre o "De R$ X | Por R$ Y". Caso contrário, mostre apenas o "Por R$ Y".
- Sempre coloque o link DIRETO no final (sem frescuras tipo "Link na bio" ou "Compre aqui:"). O formato ideal é um emoji apontando seguido do url. Ex: 👉 {url}
- Use hashtags no final.

ESTRUTURA SUGERIDA (MAS NÃO SE PRENDA A ELA):
<b>[Abertura criativa / engraçada / caótica sobre o produto]</b>

[Emoji] <b>[Nome curto do Produto]</b>

🔥 De: [Preço Antigo]
💰 Por: <b>[Preço Atual]</b> [se parcelado colocar "em X vezes"]
[Se aplicável, % de desconto]

[Se tiver cupom] 🎟️ Cupom: <b>[Código do Cupom]</b>

👉 [URL DO PRODUTO]

#oferta #[categoria]

Dados da oferta da vez:
Título: ${offer.title}
Preço Original: R$ ${offer.originalPrice.toFixed(2)}
Preço Atual: R$ ${offer.currentPrice.toFixed(2)}
Desconto: ${offer.discountPercentage.toFixed(0)}%
Categoria: ${offer.category}
${offer.coupons && offer.coupons.length > 0 ? `Cupons: ${offer.coupons.join(', ')}` : ''}
Link: ${offer.affiliateUrl}

INSTRUÇÕES FINAIS:
${toneText}
${maxLength ? `O post deve ter no máximo ${maxLength} caracteres.` : ''}
${includeEmojis !== false ? 'Use emojis moderadamente, não exagere.' : 'NÃO use emojis.'}
${includeHashtags !== false ? 'Use entre 2 e 4 hashtags.' : 'NÃO use hashtags.'}
Torne o texto VIVO! Imagine que você está mandando mensagem num grupo de amigos para mostrar uma pechincha inacreditável.

Retorne APENAS um JSON válido com esta estrutura:
{
  "title": "título curto e impactante (sem imperdível)",
  "description": "descrição curta focando nos benefícios e na oferta",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "emojis": ["🔥", "💰"],
  "fullPost": "O POST COMPLETO PARA REDES SOCIAIS, PRONTO PARA COPIAR E COLAR, usando a formatação HTML com <b>negrito</b>."
}`;
  }

  /**
   * Get category-specific storytelling examples for the AI prompt
   */
  private getCategoryStorytellingExamples(category: string): string {
    const normalizedCategory = category.toLowerCase();

    const examples: Record<string, string> = {
      calçados: `EXEMPLOS PARA CALÇADOS/TÊNIS:
• "JÁ COMPRA O SABÃO, VAI PRECISAR" (implica que vai correr muito e suar)
• "SEU PÉ VAI PEDIR BIS"
• "CORRE QUE É LITERALMENTE DE CORRIDA"
• "PREPARADO PRA DEIXAR GERAL PRA TRÁS?"`,

      cozinha: `EXEMPLOS PARA COZINHA/CASA:
• "SEU FOGÃO VAI PEDIR DEMISSÃO"
• "A COZINHA VAI VIRAR RESTAURANTE"
• "PREPARA O AVENTAL QUE O CHEF CHEGOU"
• "VIZINHO VAI SENTIR O CHEIRO"`,

      eletrônicos: `EXEMPLOS PARA ELETRÔNICOS:
• "SUA TOMADA VAI PEDIR FÉRIAS"
• "WIFI VAI PEDIR AUMENTO"
• "PREPARA O CARREGADOR"
• "TECNOLOGIA POR ESSE PREÇO É CRIME"`,

      moda: `EXEMPLOS PARA MODA/ROUPAS:
• "ESPELHO VAI PEDIR AUTÓGRAFO"
• "PODE JOGAR O RESTO DO GUARDA-ROUPA FORA"
• "LOOK QUE FAZ PARAR O TRÂNSITO"
• "VAI FALTAR LIKE PRO TANTO ELOGIO"`,

      beleza: `EXEMPLOS PARA BELEZA/COSMÉTICOS:
• "PELE VAI AGRADECER EM LÁGRIMAS DE ALEGRIA"
• "DERMATOLOGISTA VAI PERDER O EMPREGO"
• "AUTOESTIMA VAI LÁ EM CIMA"
• "PREPARADA PRA ARRASAR?"`,

      games: `EXEMPLOS PARA GAMES/JOGOS:
• "DORME MAIS NÃO"
• "CHEFE VAI ESPERAR, FASE NOVA"
• "VIDA REAL? NUNCA NEM VI"
• "PING BAIXO, EMOÇÃO ALTA"`,

      esportes: `EXEMPLOS PARA ESPORTES/FITNESS:
• "SHAPE VEM AÍ"
• "PREGUIÇA FOI DEMITIDA"
• "SEU EU DE AMANHÃ VAI AGRADECER"
• "VERÃO CHEGOU MAIS CEDO"`,

      default: `EXEMPLOS GERAIS (adapte ao produto):
• Crie conexão com o cotidiano do cliente
• Use humor sutil mas inteligente
• Faça o cliente se imaginar usando o produto
• Evite clichês como "MELHOR PREÇO" ou "IMPERDÍVEL"`,
    };

    // Try to find matching category
    for (const [key, value] of Object.entries(examples)) {
      if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
        return value;
      }
    }

    // Check for keywords in category
    if (
      normalizedCategory.includes('tênis') ||
      normalizedCategory.includes('sapato') ||
      normalizedCategory.includes('bota')
    ) {
      return examples['calçados'];
    }
    if (
      normalizedCategory.includes('celular') ||
      normalizedCategory.includes('notebook') ||
      normalizedCategory.includes('tablet') ||
      normalizedCategory.includes('fone')
    ) {
      return examples['eletrônicos'];
    }
    if (
      normalizedCategory.includes('roupa') ||
      normalizedCategory.includes('camisa') ||
      normalizedCategory.includes('vestido')
    ) {
      return examples['moda'];
    }

    return examples['default'];
  }

  /**
   * Generate dynamic impact phrase using Groq AI
   * Fast and efficient - generates a single creative phrase
   */
  async generateImpactPhrase(offer: Offer): Promise<string> {
    try {
      // Only use Groq if configured
      if (!this.groqClient || this.provider !== 'groq') {
        return this.getFallbackImpactPhrase(offer);
      }

      const discount = offer.discountPercentage;
      const category = offer.category || 'produto';
      const price = offer.currentPrice.toFixed(2).replace('.', ',');

      const prompt = `Crie UMA frase de impacto curta e poderosa(máximo 8 palavras) para uma oferta de ${category} com ${discount.toFixed(0)}% de desconto, preço R$ ${price}.

A frase deve:
- Ser impactante e chamar atenção
  - Criar urgência ou desejo
    - Ser em MAIÚSCULAS
      - Ser curta e direta(ex: "NUNCA VI TÃO BARATO ASSIM", "PROMOÇÃO IMPERDÍVEL", "DESCONTO INSANO")
        - Não usar emojis
          - Não usar pontuação final

Retorne APENAS a frase, sem aspas, sem explicações, sem formatação adicional.`;

      const completion = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'Você é um especialista em criar frases de impacto para promoções. Seja criativo mas direto.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.1-8b-instant', // Fast model for quick responses
        temperature: 0.9, // More creative
        max_tokens: 20, // Short phrases only
        stream: false,
      });

      const phrase = completion.choices[0]?.message?.content?.trim() || '';

      if (phrase && phrase.length > 0 && phrase.length < 60) {
        // Clean up the phrase
        const cleanPhrase = phrase
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/\.$/, '') // Remove trailing period
          .trim()
          .toUpperCase();

        if (cleanPhrase.length > 0) {
          logger.debug(`✅ Generated impact phrase with Groq: "${cleanPhrase}"`);
          return cleanPhrase;
        }
      }

      // Fallback if AI response is invalid
      return this.getFallbackImpactPhrase(offer);
    } catch (error: any) {
      logger.debug(`⚠️ Failed to generate impact phrase with Groq: ${error.message} `);
      // Silent fallback - don't log as error since this is optional
      return this.getFallbackImpactPhrase(offer);
    }
  }

  /**
   * Get fallback impact phrase (used when Groq is not available or fails)
   */
  private getFallbackImpactPhrase(offer: Offer): string {
    const discount = offer.discountPercentage;

    if (discount >= 50) {
      const phrases = [
        'NUNCA VI TÃO BARATO ASSIM',
        'PROMOÇÃO IMPERDÍVEL',
        'DESCONTO INSANO',
        'OPORTUNIDADE ÚNICA',
        'PREÇO IMBATÍVEL',
        'OFERTA DO ANO',
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (discount >= 30) {
      const phrases = [
        'SUPER PROMOÇÃO',
        'OFERTA ESPECIAL',
        'DESCONTO IMPERDÍVEL',
        'PROMOÇÃO RELÂMPAGO',
        'OPORTUNIDADE RARA',
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (discount >= 15) {
      const phrases = ['ÓTIMA OFERTA', 'PROMOÇÃO EM ANDAMENTO', 'DESCONTO BOM', 'VALE A PENA'];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (discount >= 5) {
      return 'EM PROMOÇÃO';
    }

    return 'OFERTA DISPONÍVEL';
  }

  /**
   * Generate with Groq
   */
  private async generateWithGroq(prompt: string, request: AIPostRequest): Promise<AIPostResponse> {
    if (!this.groqClient) {
      throw new Error('Groq client not initialized');
    }

    const completion = await this.groqClient.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at creating engaging social media posts for deals and promotions. Always respond with valid JSON only. Escape all newlines and special characters in string values properly.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' }, // Force JSON format
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return await this.parseAIResponse(content, request.offer);
  }

  /**
   * Generate with OpenAI
   */
  private async generateWithOpenAI(
    prompt: string,
    request: AIPostRequest
  ): Promise<AIPostResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at creating engaging social media posts for deals and promotions. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return await this.parseAIResponse(content, request.offer);
  }

  /**
   * Generate with DeepSeek (OpenAI-compatible API)
   */
  private async generateWithDeepSeek(
    prompt: string,
    request: AIPostRequest
  ): Promise<AIPostResponse> {
    if (!this.deepseekClient) {
      throw new Error('DeepSeek client not initialized');
    }

    const completion = await this.deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at creating engaging social media posts for deals and promotions. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return await this.parseAIResponse(content, request.offer);
  }

  /**
   * Parse AI response
   * Handles JSON with control characters and newlines robustly
   */
  private async parseAIResponse(content: string, offer: Offer): Promise<AIPostResponse> {
    try {
      // Clean the content first
      let cleanedContent = content.trim();

      // Remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```json\s * /g, '').replace(/```\s*/g, '');

      // Try to extract JSON from response
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      let jsonContent = jsonMatch ? jsonMatch[0] : cleanedContent;

      // Parse with multiple fallback strategies
      let parsed: any;

      // Strategy 1: Direct parse
      try {
        parsed = JSON.parse(jsonContent);
      } catch (error1: any) {
        logger.debug(`Parse attempt 1 failed: ${error1.message} `);

        // Strategy 2: Fix newlines and control characters in string values
        try {
          // Use a more sophisticated approach: parse character by character
          // and properly escape strings
          jsonContent = this.fixJsonString(jsonContent);
          parsed = JSON.parse(jsonContent);
        } catch (error2: any) {
          logger.debug(`Parse attempt 2 failed: ${error2.message} `);

          // Strategy 3: Try to manually extract fields using regex
          try {
            parsed = this.extractJsonFields(jsonContent);
          } catch (error3: any) {
            logger.debug(`Parse attempt 3 failed: ${error3.message} `);
            throw error3; // Give up and use fallback
          }
        }
      }

      // Clean parsed values (remove any remaining control characters)
      const cleanString = (str: string): string => {
        if (!str || typeof str !== 'string') return str || '';
        // Remove control chars except \n, \r, \t
        return (
          str
            // eslint-disable-next-line no-control-regex
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
            .trim()
        );
      };

      const cleanArray = (arr: any[]): any[] => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item) => (typeof item === 'string' ? cleanString(item) : item));
      };

      return {
        title: cleanString(parsed.title) || offer.title,
        description: cleanString(parsed.description) || offer.description,
        hashtags: cleanArray(parsed.hashtags || []),
        emojis: cleanArray(parsed.emojis || ['🔥', '💰']),
        fullPost: cleanString(parsed.fullPost) || (await this.generateFallbackPost(offer)).fullPost,
      };
    } catch (error: any) {
      logger.error('Error parsing AI response:', {
        message: error.message,
        contentPreview: content.substring(0, 200),
      });
      logger.debug('Full AI response content:', content);
      return await this.generateFallbackPost(offer);
    }
  }

  /**
   * Fix JSON string by properly escaping newlines and control characters
   */
  private fixJsonString(json: string): string {
    let result = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      if (inString) {
        // Inside string: escape control characters
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          // Skip other control characters
          // eslint-disable-next-line no-control-regex
          if (/[\x00-\x1F\x7F]/.test(char)) {
            continue;
          } else {
            result += char;
          }
        }
      } else {
        result += char;
      }
    }

    return result;
  }

  /**
   * Extract JSON fields using regex as last resort
   */
  private extractJsonFields(json: string): any {
    const result: any = {};

    // Extract title
    const titleMatch = json.match(/"title"\s*:\s*"([^"]*)"/);
    if (titleMatch) result.title = titleMatch[1];

    // Extract description
    const descMatch = json.match(/"description"\s*:\s*"([^"]*)"/);
    if (descMatch) result.description = descMatch[1];

    // Extract fullPost (may contain newlines, so use multiline match)
    const fullPostMatch = json.match(/"fullPost"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    if (fullPostMatch) {
      result.fullPost = fullPostMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }

    // Extract hashtags array
    const hashtagsMatch = json.match(/"hashtags"\s*:\s*\[(.*?)\]/);
    if (hashtagsMatch) {
      const tags = hashtagsMatch[1].match(/"([^"]*)"/g);
      result.hashtags = tags ? tags.map((t: string) => t.replace(/"/g, '')) : [];
    }

    // Extract emojis array
    const emojisMatch = json.match(/"emojis"\s*:\s*\[(.*?)\]/);
    if (emojisMatch) {
      const emojis = emojisMatch[1].match(/"([^"]*)"/g);
      result.emojis = emojis ? emojis.map((e: string) => e.replace(/"/g, '')) : [];
    }

    return result;
  }

  /**
   * Generate fallback post if AI fails
   * Uses same format as TelegramService for consistency
   */
  private async generateFallbackPost(offer: Offer): Promise<AIPostResponse> {
    // 1. Try to get default template from DB
    try {
      const defaultTemplate = await this.templateService.getDefaultTemplate();
      if (defaultTemplate) {
        const rendered = this.templateService.renderTemplate(defaultTemplate, offer);
        const cleanContent = rendered.replace(/^["']|["']$/g, '').trim();
        return {
          title: offer.title,
          description: offer.description,
          hashtags: [],
          emojis: [],
          fullPost: cleanContent,
        };
      }
    } catch (error) {
      logger.warn('Failed to use default template for fallback, using hardcoded fallback', error);
    }

    // 2. Hardcoded Fallback logic (using "Standard Viral" style)
    const originalPrice = `R$ ${offer.originalPrice.toFixed(2).replace('.', ',')}`;
    const price = `R$ ${offer.currentPrice.toFixed(2).replace('.', ',')}`;
    const discountPercent = `${offer.discountPercentage.toFixed(0)}%`;
    const sourceMap: Record<string, string> = {
      amazon: 'Amazon',
      aliexpress: 'AliExpress',
      shopee: 'Shopee',
      mercadolivre: 'Mercado Livre',
    };
    const source = sourceMap[offer.source] || offer.source;

    // Randomize the fallback string so it is not always the identical one
    const fallbackOpenings = [
      '🔥 Olha o que eu acabei de achar:',
      '😱 Corre que o preço despencou:',
      '🚀 Oferta imperdível pintando na área:',
      '💣 Preço de banana pra esse produto:',
      '🎯 Achado do dia pra vocês:',
    ];
    const randomOpening = fallbackOpenings[Math.floor(Math.random() * fallbackOpenings.length)];

    const fullPost = `<b>${randomOpening}</b>

📦 <b>${offer.title}</b>

🔥 De: <del>${originalPrice}</del>
💰 <b>Por: ${price}</b>
📉 <b>${discountPercent} OFF</b>

💳 <i>Pagamento seguro via ${source}</i>

🏃‍♂️ Corra antes que acabe:
👉 ${offer.affiliateUrl}

#${source.replace(/\s+/g, '')} #Ofertas #Promoção`;

    return {
      title: offer.title,
      description: `Oferta de ${discountPercent} OFF`,
      hashtags: ['#Ofertas', '#Promoção'],
      emojis: ['🚨', '📦', '🔥', '💰', '📉', '🏃‍♂️'],
      fullPost: fullPost,
    };
  }
}
