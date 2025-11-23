import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { AIPostRequest, AIPostResponse, Offer } from '../../types';
import { logger } from '../../utils/logger';

export class AIService {
  private groqClient: Groq | null = null;
  private openaiClient: OpenAI | null = null;
  private provider: 'groq' | 'openai';

  constructor() {
    this.provider = (process.env.AI_PROVIDER || 'groq') as 'groq' | 'openai';

    if (this.provider === 'groq' && process.env.GROQ_API_KEY) {
      this.groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    } else if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
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
      } else {
        throw new Error('No AI provider configured');
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
      casual: 'Use linguagem casual e descontraída, como se estivesse conversando com um amigo.',
      professional: 'Use linguagem profissional e informativa.',
      viral:
        'Crie um post que seja irresistível e viralizável, use gatilhos mentais como urgência e escassez.',
      urgent: 'Crie senso de urgência, mostre que a oferta é limitada e imperdível.',
    };

    const toneText = toneInstructions[tone || 'viral'] || toneInstructions.viral;

    return `Você é um especialista em criar posts para canais de ofertas e promoções no Telegram.

Crie um post sobre esta oferta seguindo este formato:

FORMATO OBRIGATÓRIO (use HTML <b> para negrito, NÃO use Markdown *):
<b>[FRASE DE IMPACTO EM MAIÚSCULAS]</b>

[EMOJI DA CATEGORIA] <b>[NOME DO PRODUTO]</b>

[Se tiver desconto >= 5%:]
💰 De R$ [PREÇO ORIGINAL] por apenas R$ [PREÇO ATUAL]

🎯 [DESCONTO]% OFF

NOTA: Quando tiver desconto, NÃO mostre "🔥 POR" - mostre apenas a linha com desconto para evitar duplicação.

[Se NÃO tiver desconto >= 5%:]
🔥 POR [PREÇO COM VÍRGULA]

[Se tiver cupom:]
🎟️ CUPOM: <b>[CÓDIGO DO CUPOM]</b>

🔗 [LINK DIRETO DO PRODUTO]

[Hashtags - SEMPRE adicione no final:]
#oferta #promocao #desconto #[categoria] #[fonte]

IMPORTANTE:
- Use HTML <b>texto</b> para negrito, NUNCA use Markdown *texto*
- NÃO use <br> ou <br/> - use quebras de linha (\n) para espaçamento
- NÃO mostre o preço duas vezes - se tiver desconto, mostre apenas a linha com desconto
- NÃO mostre "🎯 0% OFF" quando não há desconto real
- Use vírgula no preço (ex: 12,59 ao invés de 12.59)
- SEMPRE adicione hashtags no final (linha separada com espaço antes)
- Use espaçamento generoso entre seções (linhas vazias entre cada seção)
- Cada seção deve ter pelo menos uma linha vazia antes e depois

Dados da oferta:
Título: ${offer.title}
Preço Original: R$ ${offer.originalPrice.toFixed(2)}
Preço Atual: R$ ${offer.currentPrice.toFixed(2)}
Desconto: ${offer.discountPercentage.toFixed(0)}%
Categoria: ${offer.category}
${offer.coupons && offer.coupons.length > 0 ? `Cupons: ${offer.coupons.join(', ')}` : ''}
${offer.rating ? `Avaliação: ${offer.rating}/5` : ''}
${offer.reviewsCount ? `Avaliações: ${offer.reviewsCount}` : ''}
Link: ${offer.affiliateUrl}

Instruções:
- ${toneText}
- Use frases de impacto como "NUNCA VI TÃO BARATO ASSIM", "SUPER PROMOÇÃO", "OFERTA IMPERDÍVEL" baseado no desconto
- ${maxLength ? `Máximo de ${maxLength} caracteres` : 'Seja conciso mas persuasivo'}
- ${includeEmojis !== false ? 'Use emojis relevantes (🔥, 💰, 🎯, 🎟️, 🔗)' : 'Não use emojis'}
- ${includeHashtags !== false ? 'Inclua hashtags relevantes' : 'Não use hashtags'}
- SEMPRE inclua o link diretamente no final (não use "Ver oferta" ou "Link na bio")
- Use vírgula no preço (ex: 12,59 ao invés de 12.59)
- Destaque o desconto e o valor
- Torne o post atrativo e que gere interesse

Retorne APENAS um JSON válido com esta estrutura:
{
  "title": "título curto e impactante",
  "description": "descrição persuasiva da oferta",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "emojis": ["🔥", "💰"],
  "fullPost": "post completo formatado EXATAMENTE como o formato obrigatório acima, incluindo o link direto no final"
}`;
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

      const prompt = `Crie UMA frase de impacto curta e poderosa (máximo 8 palavras) para uma oferta de ${category} com ${discount.toFixed(0)}% de desconto, preço R$ ${price}.

A frase deve:
- Ser impactante e chamar atenção
- Criar urgência ou desejo
- Ser em MAIÚSCULAS
- Ser curta e direta (ex: "NUNCA VI TÃO BARATO ASSIM", "PROMOÇÃO IMPERDÍVEL", "DESCONTO INSANO")
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
      logger.debug(`⚠️ Failed to generate impact phrase with Groq: ${error.message}`);
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
    return this.parseAIResponse(content, request.offer);
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
    return this.parseAIResponse(content, request.offer);
  }

  /**
   * Parse AI response
   * Handles JSON with control characters and newlines robustly
   */
  private parseAIResponse(content: string, offer: Offer): AIPostResponse {
    try {
      // Clean the content first
      let cleanedContent = content.trim();

      // Remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try to extract JSON from response
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      let jsonContent = jsonMatch ? jsonMatch[0] : cleanedContent;

      // Parse with multiple fallback strategies
      let parsed: any;

      // Strategy 1: Direct parse
      try {
        parsed = JSON.parse(jsonContent);
      } catch (error1: any) {
        logger.debug(`Parse attempt 1 failed: ${error1.message}`);

        // Strategy 2: Fix newlines and control characters in string values
        try {
          // Use a more sophisticated approach: parse character by character
          // and properly escape strings
          jsonContent = this.fixJsonString(jsonContent);
          parsed = JSON.parse(jsonContent);
        } catch (error2: any) {
          logger.debug(`Parse attempt 2 failed: ${error2.message}`);

          // Strategy 3: Try to manually extract fields using regex
          try {
            parsed = this.extractJsonFields(jsonContent);
          } catch (error3: any) {
            logger.debug(`Parse attempt 3 failed: ${error3.message}`);
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
        fullPost: cleanString(parsed.fullPost) || this.generateFallbackPost(offer).fullPost,
      };
    } catch (error: any) {
      logger.error('Error parsing AI response:', {
        message: error.message,
        contentPreview: content.substring(0, 200),
      });
      logger.debug('Full AI response content:', content);
      return this.generateFallbackPost(offer);
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
    const fullPostMatch = json.match(/"fullPost"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s);
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
  private generateFallbackPost(offer: Offer): AIPostResponse {
    // Get impact phrase based on discount
    const discount = offer.discountPercentage;
    let impactPhrase = 'OFERTA DISPONÍVEL';

    if (discount >= 50) {
      impactPhrase = 'NUNCA VI TÃO BARATO ASSIM';
    } else if (discount >= 30) {
      impactPhrase = 'SUPER PROMOÇÃO';
    } else if (discount >= 15) {
      impactPhrase = 'ÓTIMA OFERTA';
    }

    // Get category emoji
    const categoryEmojis: Record<string, string> = {
      electronics: '📱',
      fashion: '👕',
      home: '🏠',
      beauty: '💄',
      sports: '⚽',
      toys: '🧸',
      books: '📚',
      automotive: '🚗',
      pets: '🐾',
      food: '🍔',
      health: '💊',
      other: '📦',
    };
    const categoryEmoji = categoryEmojis[offer.category?.toLowerCase() || ''] || '🔥';

    const priceFormatted = offer.currentPrice.toFixed(2).replace('.', ',');
    const hasDiscount = offer.discountPercentage >= 5 && offer.originalPrice > offer.currentPrice;
    const parts: string[] = [];

    // Use HTML for bold, not Markdown - with spacious formatting
    parts.push(`<b>${impactPhrase}</b>`);
    parts.push(''); // Empty line for spacing
    parts.push(''); // Extra empty line for more spacing

    parts.push(`${categoryEmoji} <b>${offer.title}</b>`);
    parts.push(''); // Empty line for spacing
    parts.push(''); // Extra empty line for more spacing

    // Price - NO duplication: if has discount, show only discount format
    if (hasDiscount) {
      // If has discount, show ONLY discount format (no "🔥 POR" line)
      const originalFormatted = offer.originalPrice.toFixed(2).replace('.', ',');
      parts.push(`💰 De R$ ${originalFormatted} por apenas R$ ${priceFormatted}`);
      parts.push(''); // Empty line
      parts.push(`🎯 ${offer.discountPercentage.toFixed(0)}% OFF`);
    } else {
      // If no discount, show simple price (don't show 0% OFF)
      parts.push(`🔥 POR ${priceFormatted}`);
    }

    // Coupons
    if (offer.coupons && offer.coupons.length > 0) {
      parts.push(''); // Empty line before coupon
      parts.push(''); // Extra empty line
      parts.push(`🎟️ CUPOM: <b>${offer.coupons[0]}</b>`);
    }

    // Link
    parts.push(''); // Empty line before link
    parts.push(''); // Extra empty line for more spacing
    parts.push(`🔗 ${offer.affiliateUrl}`);

    // Hashtags
    parts.push(''); // Empty line before hashtags
    const hashtagList: string[] = [];
    if (offer.category) {
      hashtagList.push(`#${offer.category.toLowerCase().replace(/\s+/g, '')}`);
    }
    if (offer.discountPercentage >= 50) {
      hashtagList.push('#superdesconto');
    } else if (offer.discountPercentage >= 30) {
      hashtagList.push('#megaoferta');
    } else if (offer.discountPercentage >= 15) {
      hashtagList.push('#promocao');
    }
    hashtagList.push('#oferta', '#promocao', '#desconto');
    const uniqueHashtags = Array.from(new Set(hashtagList));
    parts.push(uniqueHashtags.join(' '));

    const fullPost = parts.join('\n');
    const hashtags = uniqueHashtags;

    return {
      title: offer.title,
      description: `Oferta de ${offer.discountPercentage.toFixed(0)}% OFF`,
      hashtags,
      emojis: [categoryEmoji, '🔥', '💰', '🎯'],
      fullPost,
    };
  }
}
