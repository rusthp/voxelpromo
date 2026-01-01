// Baileys is an ESM-only module, so we need to use dynamic import
// We'll import the types for TypeScript, but use dynamic import at runtime
import type {
  WASocket,
  ConnectionState,
} from 'baileys';
import { Boom } from '@hapi/boom';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { IWhatsAppService } from './IWhatsAppService';
import QRCode from 'qrcode';
import { JIDValidator } from './whatsapp/utils/JIDValidator';
import { RetryHelper } from './whatsapp/utils/RetryHelper';
import { readdirSync, unlinkSync, rmdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadConfigFromFile } from '../../utils/loadConfig';

/**
 * WhatsApp Service usando Baileys (recomendado - mais leve e rápido)
 */
export class WhatsAppServiceBaileys implements IWhatsAppService {
  private sock: WASocket | null = null;
  private _isReady = false;
  private targetNumber: string = '';
  private targetGroups: string[] = []; // Array de IDs de grupos
  private initialized = false;
  private currentQRCode: string | null = null;
  private currentQRCodeDataURL: string | null = null; // QR code as Data URL (base64 image)
  private qrCodeCallbacks: ((qr: string) => void)[] = [];
  private qrCodeTimestamp: number = 0; // Track when QR code was last updated
  private connectionState: string = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
  private lastError: string | null = null;
  private messagesSent = 0;
  private messagesFailed = 0;

  constructor() {
    // Load target number from environment or config
    this.loadTargetNumber();
  }

  /**
   * Load target number and groups from environment or config.json
   */
  private loadTargetNumber(forceReload: boolean = false): void {
    // Use loadConfigFromFile to ensure env vars are up to date
    loadConfigFromFile(forceReload);

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
      if (forceReload) {
        logger.debug(`Using targetNumber as single target: ${this.targetNumber}`);
      }
    } else if (this.targetGroups.length > 0 && forceReload) {
      logger.debug(`Loaded ${this.targetGroups.length} target groups from config`);
    }
  }

  /**
   * Generate QR code as Data URL (base64-encoded PNG image)
   */
  private async generateQRCodeDataURL(qr: string): Promise<string | null> {
    try {
      // Generate QR code as Data URL using qrcode library
      // This ensures consistency with terminal QR code
      const dataURL = await QRCode.toDataURL(qr, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return dataURL;
    } catch (error: any) {
      logger.warn('Error generating QR code Data URL:', error.message);
      return null;
    }
  }

  /**
   * Initialize Baileys socket
   */
  private async initializeSocket(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initialized) {
      logger.debug('WhatsApp (Baileys) already initializing, skipping...');
      return;
    }

    // Reset state before initialization
    // Don't set initialized=true yet - wait until socket is created
    this._isReady = false;
    this.connectionState = 'connecting';
    this.lastError = null;

    try {
      logger.debug('📦 Importing Baileys...');
      // Dynamically import Baileys (ESM module)
      // Use new Function to bypass ts-node transpilation of dynamic import to require()
      const baileys: any = await (new Function('return import("baileys")')());
      const makeWASocket = baileys.default;
      const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;

      logger.debug('🔐 Loading auth state...');
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

      logger.debug('📡 Fetching latest Baileys version...');
      const { version } = await fetchLatestBaileysVersion();
      logger.debug(`✅ Baileys version: ${version.join('.')}`);

      // Mark as initialized only after we start creating the socket
      this.initialized = true;

      logger.debug('🔌 Creating socket...');
      this.sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
        browser: ['VoxelPromo', 'Chrome', '1.0.0'],
      });
      logger.debug('✅ Socket created!');

      this.sock!.ev.on('creds.update', saveCreds);

      this.sock!.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;

        // Track connection state with detailed logging
        if (connection === 'connecting') {
          this.connectionState = 'connecting';
          logger.info('🔄 WhatsApp (Baileys) connecting...');
        } else if (connection === 'close') {
          this.connectionState = 'disconnected';
          if (lastDisconnect?.error) {
            const errorMsg = (lastDisconnect.error as any)?.message || String(lastDisconnect.error);
            this.lastError = errorMsg;
            logger.warn(`⚠️ WhatsApp (Baileys) connection closed: ${errorMsg}`);
          } else {
            logger.warn('⚠️ WhatsApp (Baileys) connection closed (no error details)');
          }
        }
        // Note: 'open' connection is handled separately below after QR code handling

        // Detect pairing completion: when we receive pending notifications after QR scan
        // This indicates the device was successfully paired
        // IMPORTANT: Don't clear QR code immediately - wait for connection to close with code 515
        // This prevents the QR code from disappearing before the pairing is fully processed
        if (receivedPendingNotifications && this.currentQRCode) {
          logger.info('📱 WhatsApp (Baileys) pairing detectado! QR code escaneado com sucesso.');
          logger.debug('   Aguardando reinicialização automática (não limpe o QR code ainda)...');
          // Don't clear QR code here - let it be cleared when connection closes with code 515
          // This ensures the frontend still has the QR code visible during the pairing process
        }

        // Handle QR code (including when it's regenerated after expiration)
        if (qr) {
          const qrChanged = this.currentQRCode !== qr;
          const wasNull = this.currentQRCode === null;
          this.currentQRCode = qr;

          if (qrChanged || wasNull) {
            logger.info('WhatsApp (Baileys) QR Code generated/updated. Scan with your phone.');
            logger.info(`QR Code length: ${qr.length} chars`);
            logger.info(`QR Code hash: ${qr.substring(0, 20)}...${qr.substring(qr.length - 20)}`);
            // Force a timestamp update by clearing and setting again (triggers frontend update)
            this.qrCodeTimestamp = Date.now();

            // Generate Data URL for web display
            this.generateQRCodeDataURL(qr)
              .then((dataURL) => {
                if (dataURL) {
                  this.currentQRCodeDataURL = dataURL;
                  logger.debug('✅ QR Code Data URL generated successfully');
                } else {
                  logger.warn('⚠️ Failed to generate QR Code Data URL');
                }
              })
              .catch((error) => {
                logger.warn('⚠️ Error generating QR Code Data URL:', error);
              });
          } else {
            logger.debug('WhatsApp (Baileys) QR Code still valid (unchanged).');
          }

          // Always notify all callbacks when QR code is available
          // This ensures frontend gets updates immediately, even if QR code is the same
          if (this.qrCodeCallbacks.length > 0) {
            logger.debug(`Notifying ${this.qrCodeCallbacks.length} QR code callbacks`);
          }
          this.qrCodeCallbacks.forEach((callback, index) => {
            try {
              callback(qr);
            } catch (error) {
              logger.warn(`Error in QR code callback ${index}:`, error);
            }
          });
        } else if (this.currentQRCode && connection !== 'open' && connection !== 'connecting') {
          // QR code expired but not connected - clear it
          // But only if we're not in the middle of pairing (no pending notifications)
          // Also check if we're not waiting for restart after pairing (code 515)
          if (!receivedPendingNotifications) {
            logger.debug('WhatsApp (Baileys) QR Code expired, waiting for new one...');
            this.currentQRCode = null;
            this.currentQRCodeDataURL = null; // Clear Data URL too
            this.qrCodeTimestamp = 0; // Clear timestamp when QR code expires
            // Notify callbacks that QR code is gone
            this.qrCodeCallbacks.forEach((callback) => {
              try {
                callback(''); // Empty string to signal QR code cleared
              } catch (error) {
                logger.warn('Error in QR code callback:', error);
              }
            });
          } else {
            logger.debug(
              'WhatsApp (Baileys) QR Code expirou mas pairing em progresso, mantendo QR code visível...'
            );
            // Keep QR code visible during pairing process
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorContent = (lastDisconnect?.error as any)?.output?.payload;
          const isDeviceRemoved =
            statusCode === DisconnectReason.badSession ||
            (statusCode === 401 && errorContent?.content?.[0]?.attrs?.type === 'device_removed');

          // Check if this is a restart after pairing (code 515 = restart required)
          // This happens when QR code is scanned and pairing is successful
          const isRestartAfterPairing = statusCode === 515;

          if (isRestartAfterPairing) {
            logger.info('📱 WhatsApp (Baileys) reiniciando após pairing bem-sucedido...');
            logger.info('   ✅ Pairing configurado! As credenciais foram salvas.');
            logger.info('   🔄 Fechando socket atual e reconectando com novas credenciais...');

            // Reset state
            this._isReady = false;
            this.initialized = false; // Allow re-initialization
            // Clear QR code NOW (after pairing is confirmed and restart is needed)
            this.currentQRCode = null;
            this.currentQRCodeDataURL = null; // Clear Data URL too
            this.qrCodeTimestamp = 0;
            this.connectionState = 'connecting';
            this.lastError = null;

            // Notify callbacks that QR code is cleared (pairing complete)
            this.qrCodeCallbacks.forEach((callback) => {
              try {
                callback(''); // Empty string to signal QR code cleared
              } catch (error) {
                logger.warn('Error in QR code callback:', error);
              }
            });

            // Close current socket properly to allow fresh connection
            if (this.sock) {
              try {
                logger.debug('Fechando socket atual...');
                this.sock.end(undefined);
              } catch (error) {
                logger.warn('Erro ao fechar socket:', error);
              }
              this.sock = null;
            }

            // Reconnect after a short delay to ensure socket is fully closed
            // The auth files are already saved by Baileys, so we just need to reconnect
            setTimeout(() => {
              if (!this._isReady && !this.initialized) {
                logger.info('🔄 Reinicializando após pairing bem-sucedido...');
                logger.info('   Usando credenciais salvas para reconectar...');
                this.initializeSocket();
              }
            }, 1500); // Wait 1.5 seconds for the socket to fully close, then reconnect
            return; // Exit early to prevent immediate reconnection
          }

          // Handle device removed error
          if (isDeviceRemoved) {
            logger.warn('⚠️ WhatsApp (Baileys) dispositivo removido do WhatsApp!');
            logger.warn(
              '   O dispositivo foi desconectado manualmente ou detectado como removido.'
            );
            logger.warn('   Limpando autenticação e gerando novo QR code...');
            this._isReady = false;
            this.initialized = false;
            this.currentQRCode = null;
            this.currentQRCodeDataURL = null; // Clear Data URL too
            this.qrCodeTimestamp = 0;
            this.connectionState = 'disconnected';
            this.lastError = 'Dispositivo removido do WhatsApp. Escaneie o QR code novamente.';
            this.sock = null;

            // Clear auth files to force new QR code
            try {
              const authDir = join(process.cwd(), 'auth_info_baileys');

              if (existsSync(authDir)) {
                logger.info('Limpando arquivos de autenticação após remoção do dispositivo...');
                const files = readdirSync(authDir);
                for (const file of files) {
                  try {
                    unlinkSync(join(authDir, file));
                  } catch (error) {
                    // Ignore errors
                  }
                }
                try {
                  rmdirSync(authDir);
                  logger.info('✅ Arquivos de autenticação limpos. Gere um novo QR code.');
                } catch (error) {
                  // Ignore if directory not empty
                }
              }
            } catch (error) {
              logger.warn('Erro ao limpar arquivos de autenticação:', error);
            }

            // Don't auto-reconnect - user needs to scan QR code again
            return;
          }

          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            logger.info('WhatsApp (Baileys) disconnected, reconnecting...');
            this._isReady = false;
            this.initialized = false;
            this.currentQRCode = null; // Clear old QR code
            this.currentQRCodeDataURL = null; // Clear Data URL too
            this.qrCodeTimestamp = 0; // Clear timestamp
            // Add a delay to prevent connection loops
            setTimeout(() => {
              if (!this._isReady && !this.initialized && this.sock === null) {
                this.initializeSocket();
              }
            }, 3000); // Wait 3 seconds before reconnecting
          } else {
            logger.warn('WhatsApp (Baileys) logged out - resetting state for new QR code');
            this._isReady = false;
            this.initialized = false; // Reset to allow re-initialization
            this.currentQRCode = null; // Clear QR code
            this.currentQRCodeDataURL = null; // Clear Data URL too
            this.qrCodeTimestamp = 0; // Clear timestamp
            this.sock = null; // Clear socket to allow fresh start

            // Clear authentication files to force new QR code on next initialization
            try {
              const authDir = join(process.cwd(), 'auth_info_baileys');

              if (existsSync(authDir)) {
                logger.info('Clearing authentication files after logout...');
                const files = readdirSync(authDir);
                for (const file of files) {
                  try {
                    unlinkSync(join(authDir, file));
                  } catch (error) {
                    // Ignore errors deleting individual files
                  }
                }
                try {
                  rmdirSync(authDir);
                  logger.info(
                    '✅ Authentication files cleared - new QR code will be generated on next initialization'
                  );
                } catch (error) {
                  // Ignore if directory not empty or other errors
                }
              }
            } catch (error) {
              logger.warn('Could not clear authentication files after logout:', error);
              // Continue anyway
            }
          }
        }

        // Handle connection open (successful connection)
        if (connection === 'open') {
          logger.info('✅ WhatsApp (Baileys) connected successfully!');
          this._isReady = true;
          this.connectionState = 'connected';
          this.currentQRCode = null; // Clear QR code when connected
          this.currentQRCodeDataURL = null; // Clear Data URL too
          this.qrCodeTimestamp = 0; // Clear timestamp when connected
          this.lastError = null;
          logger.info('📱 WhatsApp (Baileys) está pronto para enviar mensagens!');
          logger.debug(`   Target: ${this.targetNumber || 'not configured'}`);
        }
      });

      // Listen for messages to help identify group IDs
      this.sock!.ev.on('messages.upsert', (m) => {
        const messages = m.messages || [];
        for (const msg of messages) {
          if (msg.key?.remoteJid && msg.key.remoteJid.includes('@g.us')) {
            const groupId = msg.key.remoteJid;
            logger.info(`📱 💡 Grupo detectado! ID do grupo: ${groupId}`);
            logger.info(`   Use este ID na configuração: ${groupId}`);

            // Store detected group
            if (!this.detectedGroups.has(groupId)) {
              this.detectedGroups.set(groupId, {
                id: groupId,
                name: `Grupo Detectado (${groupId.substring(0, 8)}...)`, // Placeholder name
                timestamp: Date.now()
              });
            }
          }
        }
      });

      logger.info('🔄 WhatsApp (Baileys) initialization started');
      logger.debug(`   Target number: ${this.targetNumber || 'not configured'}`);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const errorStack = error?.stack;

      logger.error(`❌ Error initializing WhatsApp (Baileys): ${errorMsg}`);
      if (errorStack) {
        logger.debug(`   Stack trace:`, errorStack);
      }

      this.initialized = false;
      this._isReady = false;
      this.connectionState = 'disconnected';
      this.lastError = errorMsg;
      this.sock = null;

      // If initialization fails, try again after a delay with exponential backoff
      const retryDelay = 5000; // 5 seconds
      setTimeout(() => {
        if (!this._isReady && !this.initialized) {
          logger.info(`🔄 Tentando reinicializar após erro (delay: ${retryDelay}ms)...`);
          this.initializeSocket();
        }
      }, retryDelay);
    }
  }

  /**
   * Wait for socket to be ready
   */
  private async waitForReady(): Promise<boolean> {
    if (this._isReady) {
      logger.debug('✅ WhatsApp (Baileys) is ready');
      return true;
    }

    logger.debug('⏳ Waiting for WhatsApp (Baileys) to be ready...');
    const startTime = Date.now();

    return new Promise((resolve) => {
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        if (this._isReady) {
          const elapsed = Date.now() - startTime;
          logger.debug(`✅ WhatsApp (Baileys) ready after ${elapsed}ms (${checkCount} checks)`);
          clearInterval(checkInterval);
          resolve(true);
        } else if (checkCount % 10 === 0) {
          // Log every 10 seconds
          logger.debug(`⏳ Still waiting for WhatsApp connection... (${checkCount}s)`);
        }
      }, 1000);

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        const elapsed = Date.now() - startTime;
        logger.warn(`⚠️ WhatsApp (Baileys) not ready after ${elapsed}ms timeout`);
        logger.debug(`   Connection state: ${this.connectionState}`);
        logger.debug(`   Last error: ${this.lastError || 'none'}`);
        resolve(false);
      }, 60000);
    });
  }

  /**
   * Initialize service
   */
  async initialize(force = false): Promise<void> {
    // Reload config before checking (force reload only if explicitly requested)
    this.loadTargetNumber(force);

    // Check enabled from env or config
    let enabled = process.env.WHATSAPP_ENABLED === 'true';

    // Always check config.json to ensure we have the latest
    try {
      const configPath = join(process.cwd(), 'config.json');

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.whatsapp?.enabled !== undefined) {
          // Config overrides env unless env is explicitly 'true' (forced enabled)
          if (process.env.WHATSAPP_ENABLED !== 'true') {
            enabled = config.whatsapp.enabled === true;
          }
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
      const reason = !enabled ? 'not enabled' : 'target number not configured';
      logger.warn(
        `⚠️ WhatsApp (Baileys) ${reason}. Enabled: ${enabled}, Target: ${this.targetNumber || 'empty'}`
      );
      logger.debug(
        `   To enable: Set WHATSAPP_ENABLED=true and WHATSAPP_TARGET_NUMBER in config.json or .env`
      );
      return;
    }

    // Validate target number format
    try {
      JIDValidator.detectAndFormat(this.targetNumber);
      logger.debug(`✅ Target number validated: ${this.targetNumber}`);
    } catch (validationError: any) {
      logger.error(`❌ Invalid target number format: ${this.targetNumber}`);
      logger.error(`   Error: ${validationError.message}`);
      logger.debug(
        `   Expected format: phone number (e.g., 5511999999999) or JID (e.g., 5511999999999@s.whatsapp.net or 120363123456789012@g.us)`
      );
      this.lastError = `Invalid target number: ${validationError.message}`;
      return;
    }

    // If forced, reset state for fresh start
    if (force) {
      logger.info('Force re-initializing WhatsApp (Baileys) client...');
      this.initialized = false;
      this._isReady = false;
      this.currentQRCode = null;
      if (this.sock) {
        try {
          await this.sock.end(undefined);
        } catch (error) {
          // Ignore errors when ending socket
        }
        this.sock = null;
      }

      // Clear authentication files to force new QR code generation
      try {
        const authDir = join(process.cwd(), 'auth_info_baileys');

        if (existsSync(authDir)) {
          logger.info('Clearing old Baileys authentication files to generate new QR code...');
          const files = readdirSync(authDir);
          for (const file of files) {
            try {
              unlinkSync(join(authDir, file));
            } catch (error) {
              // Ignore errors deleting individual files
            }
          }
          try {
            rmdirSync(authDir);
            logger.info('✅ Old authentication files cleared');
          } catch (error) {
            // Ignore if directory not empty or other errors
          }
        }
      } catch (error) {
        logger.warn('Could not clear authentication files:', error);
        // Continue anyway - Baileys will handle it
      }
    }

    logger.info(`WhatsApp (Baileys) initializing with target: ${this.targetNumber}`);

    if (!this.sock || !this.initialized) {
      await this.initializeSocket();
    }
  }

  /**
   * Check if service is ready
   */
  public isReady(): boolean {
    return this._isReady;
  }

  private detectedGroups: Map<string, { id: string; name: string; timestamp: number }> = new Map();

  // ... (inside class, replacing existing listGroups and updating message listener)

  /**
   * List all available WhatsApp groups
   * Merges groups fetched from server with locally detected groups
   */
  async listGroups(): Promise<import('./IWhatsAppService').WhatsAppGroup[]> {
    if (!this.sock || !this._isReady) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      const groups = await this.sock.groupFetchAllParticipating();
      const groupList = Object.values(groups);

      logger.info(`Found ${groupList.length} WhatsApp groups via fetch`);

      // Map fetched groups
      const mappedGroups = groupList.map((group: any) => ({
        id: group.id,
        name: group.subject,
        participantCount: group.participants?.length || 0,
        isActive: this.targetGroups.includes(group.id),
      }));

      // Merge with detected groups (if not already present)
      const groupIds = new Set(mappedGroups.map(g => g.id));

      this.detectedGroups.forEach((group) => {
        if (!groupIds.has(group.id)) {
          mappedGroups.push({
            id: group.id,
            name: group.name || `Grupo Detectado ${group.id.substring(0, 6)}...`,
            participantCount: 0, // Unknown
            isActive: this.targetGroups.includes(group.id),
          });
        }
      });

      return mappedGroups;
    } catch (error) {
      logger.error('Error listing WhatsApp groups:', error);
      // Fallback to detected groups if fetch fails
      return Array.from(this.detectedGroups.values()).map(group => ({
        id: group.id,
        name: group.name,
        participantCount: 0,
        isActive: this.targetGroups.includes(group.id)
      }));
    }
  }

  /**
   * Send offer to WhatsApp (supports multiple target groups)
   */
  async sendOffer(offer: Offer): Promise<boolean> {
    await this.initialize();

    const ready = await this.waitForReady();
    if (!ready) {
      logger.error('WhatsApp (Baileys) not ready');
      return false;
    }

    if (!this.sock) {
      logger.error('WhatsApp (Baileys) socket not initialized');
      return false;
    }

    // Verify link before sending
    if (offer.affiliateUrl) {
      try {
        const { LinkVerifier } = require('../link/LinkVerifier'); // eslint-disable-line @typescript-eslint/no-var-requires
        const isValid = await LinkVerifier.verify(offer.affiliateUrl);
        if (!isValid) {
          logger.warn(`🛑 Skipping WhatsApp offer due to invalid link: ${offer.affiliateUrl}`);
          return false;
        }
      } catch (e) {
        // Warning only if verification module fails hard, but checking logic inside verify catches most
        logger.warn('Error validating link for WhatsApp:', e);
      }
    }

    try {
      // Se não há targetGroups configurados, não enviar
      if (this.targetGroups.length === 0) {
        logger.warn('No target groups configured. Skipping WhatsApp send.');
        return false;
      }

      let successCount = 0;
      const message = this.formatMessage(offer);

      // Enviar para todos os grupos/números configurados
      for (const target of this.targetGroups) {
        try {
          // Validate and format JID using JIDValidator
          let jid: string;
          try {
            jid = JIDValidator.detectAndFormat(target);
            const isGroup = JIDValidator.isGroupJID(jid);
            logger.info(`📤 Sending offer to WhatsApp ${isGroup ? 'group' : 'number'}: ${jid}`);
            logger.debug(`   Offer: ${offer.title.substring(0, 50)}...`);
          } catch (validationError: any) {
            const errorMsg = `Invalid target format: ${target}. Error: ${validationError.message}`;
            logger.error(`❌ ${errorMsg}`);
            this.messagesFailed++;
            continue; // Próximo target
          }

          // Send text message with retry
          try {
            await RetryHelper.retryMessage(async () => {
              if (!this.sock) {
                throw new Error('Socket not initialized');
              }
              await this.sock.sendMessage(jid, { text: message });
            }, `Send message to ${jid}`);
            logger.debug(`✅ Text message sent successfully`);
          } catch (messageError: any) {
            const errorMsg = `Failed to send text message after retries: ${messageError.message}`;
            logger.error(`❌ ${errorMsg}`);
            this.lastError = errorMsg;
            this.messagesFailed++;
            return false;
          }

          // Note: WhatsApp automatically generates link preview from the URL in the message
          // No need to send image separately as it creates duplicate messages

          this.messagesSent++;
          successCount++;
          logger.info(`✅ Offer sent to target (${jid}): ${offer.title}`);

          // Delay anti-ban (exceto para o último)
          if (this.targetGroups.indexOf(target) < this.targetGroups.length - 1) {
            logger.debug('⏳ Waiting 3s before next send (anti-ban)');
            await this.delay(3000);
          }
        } catch (targetError: any) {
          logger.error(`❌ Failed to send to ${target}:`, targetError);
          this.messagesFailed++;
        }
      }

      logger.info(`📊 WhatsApp send summary: ${successCount}/${this.targetGroups.length} successful`);
      return successCount > 0;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      logger.error(`❌ Error sending offer to WhatsApp (Baileys): ${errorMsg}`);
      this.lastError = errorMsg;
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
   * Get current QR code (text)
   */
  getQRCode(): string | null {
    return this.currentQRCode;
  }

  /**
   * Get current QR code as Data URL (image)
   */
  getQRCodeDataURL(): string | null {
    return this.currentQRCodeDataURL;
  }

  /**
   * Get connection information
   */
  getConnectionInfo(): {
    isReady: boolean;
    connectionState: string;
    hasQRCode: boolean;
    lastError: string | null;
    hasAuthFiles: boolean;
    qrCodeTimestamp?: number;
    qrCodeDataURL?: string;
    messagesSent: number;
    messagesFailed: number;
    targetNumber?: string;
  } {
    const authDir = join(process.cwd(), 'auth_info_baileys');

    return {
      isReady: this._isReady,
      connectionState: this.connectionState,
      hasQRCode: !!this.currentQRCode,
      lastError: this.lastError,
      hasAuthFiles: existsSync(authDir),
      qrCodeTimestamp: this.currentQRCode ? this.qrCodeTimestamp : undefined,
      qrCodeDataURL: this.currentQRCodeDataURL || undefined,
      messagesSent: this.messagesSent,
      messagesFailed: this.messagesFailed,
      targetNumber: this.targetNumber || undefined,
    };
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

  // ========================================
  // WhatsApp Status (Stories)
  // ========================================

  /**
   * Post a text status (story)
   * @param text Text content for the status
   * @param backgroundColor Background color (hex)
   * @param font Font style (1-5)
   * @param statusJidList Optional list of JIDs to show the status to
   */
  async postTextStatus(
    text: string,
    backgroundColor?: string,
    font?: number,
    statusJidList?: string[]
  ): Promise<boolean> {
    await this.initialize();

    const ready = await this.waitForReady();
    if (!ready || !this.sock) {
      logger.error('WhatsApp (Baileys) not ready for status posting');
      return false;
    }

    try {
      const jidList = statusJidList || await this.getStatusJidList();

      await this.sock.sendMessage(
        'status@broadcast',
        {
          text: text,
        },
        {
          backgroundColor: backgroundColor || '#075e54',
          font: font || 1,
          statusJidList: jidList,
        } as any
      );

      logger.info('✅ WhatsApp text status posted successfully');
      return true;
    } catch (error: any) {
      logger.error(`❌ Error posting WhatsApp text status: ${error.message}`);
      return false;
    }
  }

  /**
   * Post an image status (story)
   * @param imageUrl URL or local path of the image
   * @param caption Optional caption
   * @param statusJidList Optional list of JIDs to show the status to
   */
  async postImageStatus(
    imageUrl: string,
    caption?: string,
    statusJidList?: string[]
  ): Promise<boolean> {
    await this.initialize();

    const ready = await this.waitForReady();
    if (!ready || !this.sock) {
      logger.error('WhatsApp (Baileys) not ready for status posting');
      return false;
    }

    try {
      const jidList = statusJidList || await this.getStatusJidList();

      await this.sock.sendMessage(
        'status@broadcast',
        {
          image: { url: imageUrl },
          caption: caption || '',
        },
        {
          statusJidList: jidList,
        } as any
      );

      logger.info('✅ WhatsApp image status posted successfully');
      return true;
    } catch (error: any) {
      logger.error(`❌ Error posting WhatsApp image status: ${error.message}`);
      return false;
    }
  }

  /**
   * Post a video status (story)
   * @param videoUrl URL or local path of the video
   * @param caption Optional caption
   * @param statusJidList Optional list of JIDs to show the status to
   */
  async postVideoStatus(
    videoUrl: string,
    caption?: string,
    statusJidList?: string[]
  ): Promise<boolean> {
    await this.initialize();

    const ready = await this.waitForReady();
    if (!ready || !this.sock) {
      logger.error('WhatsApp (Baileys) not ready for status posting');
      return false;
    }

    try {
      const jidList = statusJidList || await this.getStatusJidList();

      await this.sock.sendMessage(
        'status@broadcast',
        {
          video: { url: videoUrl },
          caption: caption || '',
        },
        {
          statusJidList: jidList,
        } as any
      );

      logger.info('✅ WhatsApp video status posted successfully');
      return true;
    } catch (error: any) {
      logger.error(`❌ Error posting WhatsApp video status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get JID list for status (contacts who can see the status)
   * Returns all contacts by default - for Status to work, needs individual phone JIDs
   */
  private async getStatusJidList(): Promise<string[]> {
    try {
      if (!this.sock) return [];

      const jids: string[] = [];

      // Try to get contacts from the store
      try {
        // Get all contacts from the socket store
        const store = (this.sock as any).store;
        if (store?.contacts) {
          for (const [jid, contact] of Object.entries(store.contacts)) {
            // Only add individual contacts (not groups or broadcast)
            if (jid.endsWith('@s.whatsapp.net') && contact) {
              jids.push(jid);
            }
          }
        }
      } catch (storeError) {
        logger.debug('Could not access store contacts:', storeError);
      }

      // If no contacts from store, try to get participants from all groups
      if (jids.length === 0) {
        try {
          const groups = await this.listGroups();
          for (const group of groups) {
            try {
              const metadata = await this.sock!.groupMetadata(group.id);
              if (metadata?.participants) {
                for (const participant of metadata.participants) {
                  // Add participant JID (format: number@s.whatsapp.net)
                  if (participant.id && !jids.includes(participant.id)) {
                    jids.push(participant.id);
                  }
                }
              }
            } catch (groupError) {
              // Skip groups we can't access
            }
            // Stop if we have enough contacts (limit to prevent timeout)
            if (jids.length >= 50) break;
          }
        } catch (groupsError) {
          logger.debug('Could not get group participants:', groupsError);
        }
      }

      // Always add self JID so you can see your own status
      if (this.sock.user?.id && !jids.includes(this.sock.user.id)) {
        jids.unshift(this.sock.user.id);
      }

      // Limit to 50 contacts to prevent timeout
      const limitedJids = jids.slice(0, 50);

      logger.info(`📱 Status will be visible to ${limitedJids.length} contacts (limited from ${jids.length})`);
      return limitedJids;
    } catch (error) {
      logger.warn('Error getting status JID list:', error);
      return [];
    }
  }
}

