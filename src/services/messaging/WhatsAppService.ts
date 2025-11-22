import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';

export class WhatsAppService {
  private client: Client | null = null;
  private isReady = false;
  private targetNumber: string;

  constructor() {
    const enabled = process.env.WHATSAPP_ENABLED === 'true';
    this.targetNumber = process.env.WHATSAPP_TARGET_NUMBER || '';

    // Don't initialize WhatsApp on startup - it's slow and requires QR code
    // Initialize only when actually needed
    if (enabled && this.targetNumber) {
      logger.info('WhatsApp enabled - will initialize on first use');
    } else {
      logger.warn('WhatsApp not enabled or target number not configured');
    }
  }

  /**
   * Initialize WhatsApp client
   */
  private initializeClient(): void {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.client.on('qr', (qr) => {
      logger.info('WhatsApp QR Code generated. Scan with your phone.');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      logger.info('WhatsApp client is ready!');
      this.isReady = true;
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('WhatsApp authentication failure:', msg);
    });

    this.client.on('disconnected', (reason) => {
      logger.warn('WhatsApp disconnected:', reason);
      this.isReady = false;
    });

    this.client.initialize().catch((error) => {
      logger.error('Error initializing WhatsApp:', error);
    });
  }

  /**
   * Wait for client to be ready
   */
  private async waitForReady(): Promise<boolean> {
    if (this.isReady) {
      return true;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.isReady) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 1000);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 30000);
    });
  }

  /**
   * Send offer to WhatsApp
   */
  async sendOffer(offer: Offer): Promise<boolean> {
    // Initialize client if not already done
    if (!this.client) {
      const enabled = process.env.WHATSAPP_ENABLED === 'true';
      this.targetNumber = process.env.WHATSAPP_TARGET_NUMBER || '';
      
      if (!enabled || !this.targetNumber) {
        logger.warn('WhatsApp not enabled or target number not configured');
        return false;
      }
      
      this.initializeClient();
    }

    const ready = await this.waitForReady();
    if (!ready) {
      logger.error('WhatsApp client not ready');
      return false;
    }

    if (!this.client) {
      logger.error('WhatsApp client not initialized');
      return false;
    }

    try {
      const message = this.formatMessage(offer);
      const chatId = `${this.targetNumber}@c.us`;

      // WhatsApp Web.js - send message (images require different handling)
      await this.client.sendMessage(chatId, message);
      
      // If there's an image, try to send it separately
      if (offer.imageUrl && this.client) {
        try {
          // Note: WhatsApp Web.js image sending requires MessageMedia
          // For now, we'll just send the message with the URL
          await this.client.sendMessage(chatId, `📷 Imagem: ${offer.imageUrl}`);
        } catch (imageError) {
          logger.warn('Could not send image to WhatsApp:', imageError);
        }
      }

      logger.info(`Offer sent to WhatsApp: ${offer.title}`);
      return true;
    } catch (error) {
      logger.error('Error sending offer to WhatsApp:', error);
      return false;
    }
  }

  /**
   * Format offer message for WhatsApp
   */
  private formatMessage(offer: Offer): string {
    const post = offer.aiGeneratedPost || this.generateDefaultPost(offer);

    return `${post}\n\n🔗 ${offer.affiliateUrl}`;
  }

  /**
   * Generate default post
   */
  private generateDefaultPost(offer: Offer): string {
    return `🔥 *${offer.title}*

💰 De R$ ${offer.originalPrice.toFixed(2)} por R$ ${offer.currentPrice.toFixed(2)}
🎯 ${offer.discountPercentage.toFixed(0)}% OFF

${offer.rating ? `⭐ ${offer.rating}/5` : ''}
${offer.reviewsCount ? `📊 ${offer.reviewsCount} avaliações` : ''}`;
  }

  /**
   * Send multiple offers
   */
  async sendOffers(offers: Offer[]): Promise<number> {
    let successCount = 0;

    for (const offer of offers) {
      const success = await this.sendOffer(offer);
      if (success) {
        successCount++;
        await this.delay(3000); // WhatsApp needs longer delays
      }
    }

    return successCount;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

