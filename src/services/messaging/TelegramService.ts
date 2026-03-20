import { Telegraf } from 'telegraf';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { AIService } from '../ai/AIService';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export class TelegramService {
  private bot: Telegraf | null = null;
  private chatId: string;
  private token: string | undefined;
  private aiService: AIService | null = null;

  constructor(config?: TelegramConfig) {
    // Don't initialize bot on startup - lazy initialization
    if (config) {
      this.chatId = config.chatId;
      this.token = config.botToken;
      // logger.debug('TelegramService initialized with instance config');
    } else {
      this.chatId = process.env.TELEGRAM_CHAT_ID || '';
      this.token = process.env.TELEGRAM_BOT_TOKEN;

      if (this.token && this.chatId) {
        logger.info('✅ Telegram configured (Env) - will initialize on first use');
      } else {
        logger.warn('⚠️ Telegram bot token or chat ID not configured');
      }
    }
  }

  /**
   * Get AI service (lazy initialization)
   */
  private getAIService(): AIService {
    if (!this.aiService) {
      this.aiService = new AIService();
    }
    return this.aiService;
  }

  /**
   * Initialize bot if not already done
   */
  private initializeBot(): void {
    if (this.bot) {
      return; // Already initialized
    }

    const token = this.token || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      logger.warn('⚠️ Telegram bot token not configured');
      return;
    }

    this.bot = new Telegraf(token);
    logger.debug('✅ Telegram bot initialized');
  }

  /**
   * Send offer to Telegram channel
   */
  async sendOffer(offer: Offer): Promise<boolean> {
    if (!this.chatId) {
      logger.warn('⚠️ Telegram chat ID not configured, skipping send');
      return false;
    }

    // Initialize bot if not already done
    this.initializeBot();

    if (!this.bot) {
      logger.warn('⚠️ Telegram bot not initialized, skipping send');
      return false;
    }

    try {
      // Verify link before sending
      if (offer.affiliateUrl) {
        // Use a shorter timeout for Telegram to avoid blocking too long
        // require('../link/LinkVerifier').LinkVerifier to avoid circular deps if any or just import
        const { LinkVerifier } = await import('../link/LinkVerifier');
        const isValid = await LinkVerifier.verify(offer.affiliateUrl);
        if (!isValid) {
          logger.warn(`🛑 Skipping Telegram offer due to invalid link: ${offer.affiliateUrl}`);
          return false;
        }
      }

      logger.info(`📤 Sending offer to Telegram - Title: ${offer.title}, Chat ID: ${this.chatId}`);

      /**
       * 🔗 Priority chain (mutually exclusive — never mix sources):
       *   1. offer.rendered.text   → from AutomationService + TemplateService (automation flow)
       *   2. offer.aiGeneratedPost → from AIService (manual post with AI)
       *   3. formatMessage()       → legacy fallback (manual post without AI)
       */
      let message: string;
      if (offer.rendered?.text) {
        message = offer.rendered.text;
        logger.info(`📝 Telegram using template (id: ${offer.rendered.templateId || 'default'}, tone: ${offer.rendered.tone || 'n/a'})`);
      } else if (offer.aiGeneratedPost) {
        message = offer.aiGeneratedPost;
        logger.info('📝 Telegram using AI generated post');
      } else {
        logger.warn('⚠️ Telegram: No rendered template — using fallback formatMessage');
        message = await this.formatMessage(offer);
      }

      if (offer.imageUrl) {
        logger.debug(`📷 Sending offer with image: ${offer.imageUrl}`);
        await this.bot.telegram.sendPhoto(this.chatId, offer.imageUrl, {
          caption: message,
          parse_mode: 'HTML',
        });
      } else {
        logger.debug('📝 Sending offer without image');
        await this.bot.telegram.sendMessage(this.chatId, message, {
          parse_mode: 'HTML',
        });
      }

      logger.info(`✅ Offer sent successfully to Telegram: ${offer.title} (ID: ${offer._id})`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Error sending offer to Telegram: ${error.message}`, error);
      logger.error(`   Offer details - ID: ${offer._id}, Title: ${offer.title}`);
      return false;
    }
  }

  /**
   * Format offer message for Telegram (Standardized with X style)
   */
  private async formatMessage(offer: Offer): Promise<string> {
    const impactPhrase = await this.getImpactPhrase(offer);
    const categoryEmoji = this.getCategoryEmoji(offer.category || '');

    // Format price
    const priceFormatted = offer.currentPrice.toFixed(2).replace('.', ',');
    const hasDiscount = offer.discountPercentage >= 5 && offer.originalPrice > offer.currentPrice;

    // Build message parts
    const parts: string[] = [];

    // Impact phrase (Bold)
    parts.push(`<b>${impactPhrase}!</b>`);

    // Product title with category emoji
    parts.push(`${categoryEmoji} ${offer.title}`);

    // Price
    if (hasDiscount) {
      const originalFormatted = offer.originalPrice.toFixed(2).replace('.', ',');
      parts.push(`💰 De R$ ${originalFormatted} por <b>R$ ${priceFormatted}</b>`);
      parts.push(`🎯 ${offer.discountPercentage.toFixed(0)}% OFF`);
    } else {
      parts.push(`🔥 POR <b>R$ ${priceFormatted}</b>`);
    }

    // Coupons
    if (offer.coupons && offer.coupons.length > 0) {
      parts.push(`🎟️ CUPOM: <b>${offer.coupons[0]}</b>`);
    }

    // Link
    parts.push(`🔗 ${offer.affiliateUrl}`);

    // Hashtags
    const hashtags = this.generateHashtags(offer);
    if (hashtags.length > 0) {
      parts.push(hashtags.join(' '));
    }

    // Join with double newlines for spacing
    return parts.join('\n\n');
  }

  /**
   * Generate dynamic impact phrase using AI (Groq) or fallback
   * (Mirrors XService logic)
   */
  private async getImpactPhrase(offer: Offer): Promise<string> {
    try {
      // Try to use AI to generate a creative phrase
      const aiPhrase = await Promise.race([
        this.getAIService().generateImpactPhrase(offer),
        new Promise<string>((resolve) => {
          setTimeout(() => resolve(''), 2000); // 2 second timeout
        }),
      ]);

      if (aiPhrase && aiPhrase.length > 0) {
        logger.debug(`✅ Using AI-generated impact phrase: "${aiPhrase}"`);
        return aiPhrase;
      }
    } catch (error: any) {
      logger.debug(`⚠️ AI phrase generation failed, using fallback: ${error.message}`);
    }

    // Fallback to static phrases
    return this.getFallbackImpactPhrase(offer);
  }

  /**
   * Get fallback impact phrase (static phrases)
   */
  private getFallbackImpactPhrase(offer: Offer): string {
    const discount = offer.discountPercentage;

    if (discount >= 50) {
      const phrases = [
        'NUNCA VI TÃO BARATO',
        'PROMOÇÃO IMPERDÍVEL',
        'DESCONTO INSANO',
        'OPORTUNIDADE ÚNICA',
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (discount >= 30) {
      const phrases = ['SUPER PROMOÇÃO', 'OFERTA ESPECIAL', 'DESCONTO IMPERDÍVEL'];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (discount >= 15) {
      return 'ÓTIMA OFERTA';
    }

    if (discount >= 5) {
      return 'EM PROMOÇÃO';
    }

    return 'OFERTA DISPONÍVEL';
  }

  /**
   * Get emoji for category
   */
  private getCategoryEmoji(category: string): string {
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
    return categoryEmojis[category.toLowerCase()] || '🔥';
  }

  /**
   * Generate hashtags for the offer
   */
  private generateHashtags(offer: Offer): string[] {
    const hashtags: string[] = [];

    // Category hashtag
    if (offer.category) {
      const categoryTag = `#${offer.category.toLowerCase().replace(/\s+/g, '')}`;
      hashtags.push(categoryTag);
    }

    // Source hashtag
    if (offer.source) {
      const sourceTag = `#${offer.source.toLowerCase()}`;
      hashtags.push(sourceTag);
    }

    // Discount hashtag
    if (offer.discountPercentage >= 50) {
      hashtags.push('#superdesconto');
    } else if (offer.discountPercentage >= 30) {
      hashtags.push('#megaoferta');
    } else if (offer.discountPercentage >= 15) {
      hashtags.push('#promocao');
    }

    // Always add these
    hashtags.push('#oferta', '#promocao', '#desconto');

    // Remove duplicates and return
    return Array.from(new Set(hashtags));
  }

  /**
   * Send multiple offers
   */
  async sendOffers(offers: Offer[]): Promise<number> {
    if (!this.chatId) {
      logger.warn('⚠️ Telegram chat ID not configured, skipping send');
      return 0;
    }

    // Initialize bot if not already done
    this.initializeBot();

    if (!this.bot) {
      logger.warn('⚠️ Telegram bot not initialized, skipping send');
      return 0;
    }

    logger.info(`📤 Sending ${offers.length} offers to Telegram...`);
    let successCount = 0;

    for (const offer of offers) {
      const success = await this.sendOffer(offer);
      if (success) {
        successCount++;
        // Add delay between messages to avoid rate limiting
        await this.delay(2000);
      }
    }

    logger.info(`✅ Sent ${successCount}/${offers.length} offers to Telegram`);
    return successCount;
  }

  /**
   * Send test message to verify bot configuration
   */
  async sendTestMessage(): Promise<boolean> {
    if (!this.chatId) {
      logger.warn('⚠️ Telegram chat ID not configured, cannot send test message');
      return false;
    }

    // Initialize bot if not already done
    this.initializeBot();

    if (!this.bot) {
      logger.warn('⚠️ Telegram bot not initialized, cannot send test message');
      return false;
    }

    try {
      const testMessage = `🤖 <b>Teste do VoxelPromo</b>

✅ Bot Telegram configurado com sucesso!

📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}
🔗 Sistema: VoxelPromo - Monitoramento de Ofertas

Se você recebeu esta mensagem, o bot está funcionando corretamente! 🎉`;

      logger.info(`📤 Sending test message to Telegram chat ${this.chatId}...`);
      await this.bot.telegram.sendMessage(this.chatId, testMessage, {
        parse_mode: 'HTML',
      });

      logger.info('✅ Test message sent successfully to Telegram');
      return true;
    } catch (error: any) {
      logger.error(`❌ Error sending test message to Telegram: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get bot instance (for routes that need to call bot methods directly)
   */
  getBot(): Telegraf | null {
    this.initializeBot();
    return this.bot;
  }

  /**
   * List all chats/groups where the bot has received messages
   * Uses getUpdates to discover groups the bot is in
   */
  async listChats(): Promise<{ id: string; title: string; type: string }[]> {
    this.initializeBot();

    if (!this.bot) {
      logger.warn('⚠️ Cannot list chats: Telegram bot not initialized');
      return [];
    }

    try {
      // Get recent updates to discover chats
      const updates = await this.bot.telegram.getUpdates(0, 100, 0, []);

      const chatsMap = new Map<string, { id: string; title: string; type: string }>();

      for (const update of updates) {
        const message = 'message' in update ? update.message :
                        'channel_post' in update ? update.channel_post : undefined;
        // 'my_chat_member' is also part of Update, but to keep it simple we can just check 'chat' in it
        const my_chat_member = 'my_chat_member' in update ? update.my_chat_member : undefined;

        if (message && 'chat' in message) {
          const chat = message.chat;
          const chatId = chat.id.toString();

          // Only add groups and channels (skip private chats)
          if (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') {
            if (!chatsMap.has(chatId)) {
              chatsMap.set(chatId, {
                id: chatId,
                title: 'title' in chat ? chat.title : `Chat ${chatId}`,
                type: chat.type,
              });
            }
          }
        }

        // Also check my_chat_member updates (when bot is added to a group)
        if (my_chat_member) {
          const chat = my_chat_member.chat;
          const chatId = chat.id.toString();

          if (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') {
            if (!chatsMap.has(chatId)) {
              chatsMap.set(chatId, {
                id: chatId,
                title: 'title' in chat ? chat.title : `Chat ${chatId}`,
                type: chat.type,
              });
            }
          }
        }
      }

      const chats = Array.from(chatsMap.values());
      logger.info(`📋 Found ${chats.length} chats/groups for Telegram bot`);
      return chats;
    } catch (error: any) {
      logger.error(`❌ Error listing Telegram chats: ${error.message}`);
      return [];
    }
  }
}
