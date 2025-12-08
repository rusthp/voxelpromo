import TelegramBot from 'node-telegram-bot-api';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';


export class TelegramService {
  private bot: TelegramBot | null = null;
  private chatId: string;


  constructor() {
    // Don't initialize bot on startup - lazy initialization
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (token && this.chatId) {
      logger.info('✅ Telegram configured - will initialize on first use');
    } else {
      logger.warn('⚠️ Telegram bot token or chat ID not configured');
    }
  }



  /**
   * Initialize bot if not already done
   */
  private initializeBot(): void {
    if (this.bot) {
      return; // Already initialized
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      logger.warn('⚠️ Telegram bot token not configured');
      return;
    }

    this.bot = new TelegramBot(token, { polling: false });
    logger.info('✅ Telegram bot initialized');
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
      logger.info(`📤 Sending offer to Telegram - Title: ${offer.title}, Chat ID: ${this.chatId}`);
      const message = await this.formatMessage(offer);

      if (offer.imageUrl) {
        logger.debug(`📷 Sending offer with image: ${offer.imageUrl}`);
        await this.bot.sendPhoto(this.chatId, offer.imageUrl, {
          caption: message,
          parse_mode: 'HTML',
        });
      } else {
        logger.debug('📝 Sending offer without image');
        await this.bot.sendMessage(this.chatId, message, {
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
   * Format offer message for Telegram
   */
  private async formatMessage(offer: Offer): Promise<string> {
    let post = offer.aiGeneratedPost || (await this.generateDefaultPost(offer));

    // Convert Markdown to HTML if needed (IA might return Markdown)
    post = this.convertMarkdownToHtml(post);

    // If AI generated post doesn't have hashtags, add them
    if (offer.aiGeneratedPost && !post.includes('#')) {
      const hashtags = this.generateHashtags(offer);
      if (hashtags.length > 0) {
        post += '\n\n' + hashtags.join(' ');
      }
    }

    // Preserve spacing - don't collapse newlines (keep the spacing we added)
    // Only limit excessive newlines (more than 4) to avoid spam
    post = post.replace(/\n{5,}/g, '\n\n\n'); // Max 3 newlines for spacing

    // Include link directly in the message, not as a separate "Ver oferta" link
    return post;
  }

  /**
   * Convert Markdown bold (*text*) to HTML bold (<b>text</b>)
   * Telegram uses HTML, not Markdown
   * Also removes <br> tags (Telegram doesn't support them in HTML mode)
   * Preserves spacing between sections
   */
  private convertMarkdownToHtml(text: string): string {
    // Remove <br> and <br/> tags (Telegram doesn't support them)
    let cleaned = text
      .replace(/<br\s*\/?>/gi, '\n') // Replace <br> with newline
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>') // **bold** to <b>bold</b>
      .replace(/\*([^*]+)\*/g, '<b>$1</b>') // *bold* to <b>bold</b>
      .replace(/<\s*b\s*>/g, '<b>') // Fix broken < b > tags
      .replace(/<\s*\/b\s*>/g, '</b>'); // Fix broken </ b > tags

    // Preserve spacing - don't collapse too many newlines (keep at least 2 for spacing)
    // But limit to max 3 consecutive newlines to avoid excessive spacing
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n'); // Max 3 newlines

    return cleaned;
  }







  /**
   * Generate default post if AI didn't generate one
   * Format: Dynamic impact phrase + Product + Price + Coupon + Link + Hashtags
   * Spacious format with proper line breaks
   */
  private async generateDefaultPost(offer: Offer): Promise<string> {
    const originalPrice = `R$ ${offer.originalPrice.toFixed(2).replace('.', ',')}`;
    const price = `R$ ${offer.currentPrice.toFixed(2).replace('.', ',')}`;
    const discountPercent = `${offer.discountPercentage.toFixed(0)}%`;
    const sourceMap: Record<string, string> = {
      amazon: 'Amazon',
      aliexpress: 'AliExpress',
      shopee: 'Shopee',
      mercadolivre: 'Mercado Livre'
    };
    const source = sourceMap[offer.source.toLowerCase()] || offer.source;

    return `🚨 <b>IMPERDÍVEL! BAIXOU MUITO!</b> 🚨

📦 <b>${offer.title}</b>

🔥 De: <del>${originalPrice}</del>
💰 <b>Por: ${price}</b>
📉 <b>${discountPercent} OFF</b>

💳 <i>Pagamento seguro via ${source}</i>

🏃‍♂️ Corra antes que acabe:
👉 ${offer.affiliateUrl}

#${source.replace(/\s+/g, '')} #Ofertas #Promoção`;
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
      await this.bot.sendMessage(this.chatId, testMessage, {
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
}
