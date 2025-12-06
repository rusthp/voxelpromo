import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { IWhatsAppService } from './IWhatsAppService';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadConfigFromFile } from '../../utils/loadConfig';

/**
 * WhatsApp Service usando whatsapp-web.js
 */
export class WhatsAppServiceWebJS implements IWhatsAppService {
  private client: Client | null = null;
  private _isReady = false;
  private targetNumber: string = '';
  private targetGroups: string[] = []; // NOVO: Array de IDs de grupos
  private initialized = false;
  private currentQRCode: string | null = null;
  private qrCodeCallbacks: ((qr: string) => void)[] = [];

  constructor() {
    // Load target number from environment or config
    this.loadTargetNumber();
  }

  /**
   * Load target number and groups from environment or config.json
   */
  private loadTargetNumber(): void {
    // Use loadConfigFromFile to ensure env vars are up to date
    loadConfigFromFile();

    // Read from environment (which was set by loadConfigFromFile)
    this.targetNumber = process.env.WHATSAPP_TARGET_NUMBER || '';

    // Load targetGroups from config.json directly
    try {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        this.targetGroups = config.whatsapp?.targetGroups || [];
      }
    } catch (error) {
      logger.warn('Could not load targetGroups from config.json:', error);
      this.targetGroups = [];
    }

    // Retrocompatibilidade: se targetGroups vazio, usar targetNumber
    if (this.targetGroups.length === 0 && this.targetNumber) {
      this.targetGroups = [this.targetNumber];
      logger.debug(`Using targetNumber as single target: ${this.targetNumber}`);
    } else if (this.targetGroups.length > 0) {
      logger.debug(`Loaded ${this.targetGroups.length} target groups from config`);
    }
  }

  /**
   * Initialize WhatsApp client
   */
  private initializeClient(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    // Get Chrome path from environment or use Puppeteer's default cache location
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
      process.env.CHROME_PATH ||
      (process.platform === 'win32'
        ? `${process.env.USERPROFILE}\\.cache\\puppeteer\\chrome\\win64-121.0.6167.85\\chrome-win64\\chrome.exe`
        : undefined);

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: '.wwebjs_auth',
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...(chromePath && { executablePath: chromePath }),
      },
    });

    this.client.on('qr', (qr) => {
      const qrChanged = this.currentQRCode !== qr;
      this.currentQRCode = qr;

      if (qrChanged) {
        logger.info('WhatsApp (whatsapp-web.js) QR Code generated/updated. Scan with your phone.');
      } else {
        logger.debug('WhatsApp (whatsapp-web.js) QR Code still valid.');
      }

      qrcode.generate(qr, { small: true });
      // Notify all callbacks (always notify to ensure frontend gets updates)
      this.qrCodeCallbacks.forEach((callback) => callback(qr));
    });

    this.client.on('ready', () => {
      logger.info('WhatsApp (whatsapp-web.js) client is ready!');
      this._isReady = true;
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp (whatsapp-web.js) authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('WhatsApp (whatsapp-web.js) authentication failure:', msg);
    });

    this.client.on('disconnected', (reason) => {
      logger.warn('WhatsApp (whatsapp-web.js) disconnected:', reason);
      this._isReady = false;
    });

    // Listen for messages to help identify group IDs
    this.client.on('message', (msg) => {
      if (msg.from && msg.from.includes('@g.us')) {
        logger.info(`📱 💡 Grupo detectado! ID do grupo: ${msg.from}`);
        logger.info(`   Use este ID na configuração: ${msg.from}`);
      }
    });

    this.client.initialize().catch((error: any) => {
      logger.error('Error initializing WhatsApp (whatsapp-web.js):', error);

      // If Chromium is missing, suggest using Baileys instead
      if (error.message && error.message.includes('Could not find expected browser')) {
        logger.error('');
        logger.error('❌ whatsapp-web.js requer Chromium/Puppeteer que não foi encontrado.');
        logger.error('');
        logger.error('💡 SOLUÇÃO RECOMENDADA: Use Baileys (mais leve, não precisa de Puppeteer)');
        logger.error('   1. Vá em Configurações → WhatsApp');
        logger.error('   2. Altere "Biblioteca WhatsApp" para "Baileys"');
        logger.error('   3. Salve e tente novamente');
        logger.error('');
        logger.error('   Ou instale Chromium manualmente:');
        logger.error('   npx puppeteer browsers install chrome');
        logger.error('');
      }

      this.initialized = false;
      this._isReady = false;
    });
  }

  /**
   * Wait for client to be ready
   */
  private async waitForReady(): Promise<boolean> {
    if (this._isReady) {
      return true;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this._isReady) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 1000);

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 60000);
    });
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    // Reload config before checking
    this.loadTargetNumber();

    // Check enabled from env or config
    let enabled = process.env.WHATSAPP_ENABLED === 'true';

    // Always check config.json to ensure we have the latest
    try {
      const configPath = join(process.cwd(), 'config.json');

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.whatsapp?.enabled !== undefined) {
          enabled = config.whatsapp.enabled === true;
          process.env.WHATSAPP_ENABLED = enabled.toString();
          logger.debug(`WhatsApp enabled status loaded from config: ${enabled}`);
        }
        if (config.whatsapp?.targetNumber && !this.targetNumber) {
          this.targetNumber = config.whatsapp.targetNumber;
          process.env.WHATSAPP_TARGET_NUMBER = this.targetNumber;
          logger.debug(`WhatsApp target number loaded from config: ${this.targetNumber}`);
        }
      }
    } catch (error) {
      logger.warn('Error loading WhatsApp config:', error);
    }

    if (!enabled || !this.targetNumber) {
      logger.warn(
        `WhatsApp (whatsapp-web.js) not enabled or target number not configured. Enabled: ${enabled}, Target: ${this.targetNumber || 'empty'}`
      );
      return;
    }

    logger.info(`WhatsApp (whatsapp-web.js) initializing with target: ${this.targetNumber}`);

    if (!this.client) {
      this.initializeClient();
    }
  }

  /**
   * Check if service is ready
   */
  public isReady(): boolean {
    return this._isReady;
  }

  /**
   * Lista todos os grupos WhatsApp disponíveis
   */
  async listGroups(): Promise<import('./IWhatsAppService').WhatsAppGroup[]> {
    if (!this.client || !this._isReady) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      const chats = await this.client.getChats();
      const groups = chats.filter((chat: any) => chat.isGroup);

      logger.info(`Found ${groups.length} WhatsApp groups`);

      return groups.map((group: any) => ({
        id: group.id._serialized,
        name: group.name,
        participantCount: group.participants?.length || 0,
        isActive: this.targetGroups.includes(group.id._serialized),
      }));
    } catch (error) {
      logger.error('Error listing WhatsApp groups:', error);
      throw error;
    }
  }

  /**
   * Send offer to WhatsApp (supports multiple target groups)
   */
  async sendOffer(offer: Offer): Promise<boolean> {
    await this.initialize();

    const ready = await this.waitForReady();
    if (!ready) {
      logger.error('WhatsApp (whatsapp-web.js) client not ready');
      return false;
    }

    if (!this.client) {
      logger.error('WhatsApp (whatsapp-web.js) client not initialized');
      return false;
    }

    try {
      // Se não há targetGroups configurados, não enviar
      if (this.targetGroups.length === 0) {
        logger.warn('No target groups configured. Skipping WhatsApp send.');
        return false;
      }

      const message = this.formatMessage(offer);
      let successCount = 0;

      // Enviar para todos os grupos/números configurados
      for (const target of this.targetGroups) {
        try {
          let chatId: string;

          // Check if it's already a full JID (group or individual)
          if (target.includes('@g.us')) {
            // Group ID format: 120363123456789012@g.us
            chatId = target;
            logger.info(`Sending to WhatsApp group: ${chatId}`);
          } else if (
            target.includes('@c.us') ||
            target.includes('@s.whatsapp.net')
          ) {
            // Already a full JID for individual
            chatId = target.replace('@s.whatsapp.net', '@c.us'); // Normalize to @c.us for whatsapp-web.js
            logger.info(`Sending to WhatsApp number: ${chatId}`);
          } else if (target.length > 15 || target.includes('-')) {
            // Group IDs are typically longer than 15 digits or contain hyphens
            // Format: 120363123456789012@g.us
            chatId = target.includes('@') ? target : `${target}@g.us`;
            logger.info(`Detected group ID, sending to: ${chatId}`);
          } else {
            // Individual number: format is country code + DDD + number (usually 10-15 digits)
            chatId = `${target}@c.us`;
            logger.info(`Sending to WhatsApp number: ${chatId}`);
          }

          await this.client.sendMessage(chatId, message);

          // Note: WhatsApp automatically generates link preview from the URL in the message
          // No need to send image URL separately as it creates duplicate messages

          logger.info(`✅ Offer sent to WhatsApp target (${chatId}): ${offer.title}`);
          successCount++;

          // Delay anti-ban (exceto para o último)
          if (this.targetGroups.indexOf(target) < this.targetGroups.length - 1) {
            logger.debug('⏳ Waiting 3s before next send (anti-ban)');
            await this.delay(3000);
          }
        } catch (targetError) {
          logger.error(`❌ Failed to send to ${target}:`, targetError);
          // Continuar para os próximos targets
        }
      }

      logger.info(`📊 WhatsApp send summary: ${successCount}/${this.targetGroups.length} successful`);
      return successCount > 0;
    } catch (error) {
      logger.error('Error sending offer to WhatsApp (whatsapp-web.js):', error);
      return false;
    }
  }

  /**
   * Format offer message for WhatsApp
   * Converts HTML formatting to WhatsApp format
   */
  private formatMessage(offer: Offer): string {
    const post = offer.aiGeneratedPost || this.generateDefaultPost(offer);
    const formattedPost = this.convertHtmlToWhatsApp(post);

    // Only add link if it's not already in the post
    if (offer.affiliateUrl && !formattedPost.includes(offer.affiliateUrl)) {
      return `${formattedPost}\n\n🔗 ${offer.affiliateUrl}`;
    }

    return formattedPost;
  }

  /**
   * Convert HTML formatting to WhatsApp formatting
   * WhatsApp uses: *bold*, _italic_, ~strikethrough~, ```monospace```
   */
  private convertHtmlToWhatsApp(text: string): string {
    return text
      // Bold: <b>text</b> or <strong>text</strong> -> *text*
      .replace(/<b>(.*?)<\/b>/gi, '*$1*')
      .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
      // Italic: <i>text</i> or <em>text</em> -> _text_
      .replace(/<i>(.*?)<\/i>/gi, '_$1_')
      .replace(/<em>(.*?)<\/em>/gi, '_$1_')
      // Strikethrough: <s>text</s> or <strike>text</strike> -> ~text~
      .replace(/<s>(.*?)<\/s>/gi, '~$1~')
      .replace(/<strike>(.*?)<\/strike>/gi, '~$1~')
      // Code: <code>text</code> -> ```text```
      .replace(/<code>(.*?)<\/code>/gi, '```$1```')
      // Remove other HTML tags
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      // Clean up any double formatting that might occur
      .replace(/\*\*+/g, '*')
      .replace(/__+/g, '_')
      .replace(/~~+/g, '~');
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
   * Get current QR code
   */
  getQRCode(): string | null {
    return this.currentQRCode;
  }

  /**
   * Register callback for QR code generation
   */
  onQRCode(callback: (qr: string) => void): void {
    this.qrCodeCallbacks.push(callback);
    // If QR code already exists, call immediately
    if (this.currentQRCode) {
      callback(this.currentQRCode);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
