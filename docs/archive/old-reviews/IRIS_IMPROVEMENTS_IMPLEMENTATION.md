# 🚀 Implementação de Melhorias Baseadas no Iris

Este documento contém exemplos práticos de código para implementar as melhorias identificadas na análise do projeto Iris.

## 📋 Índice

1. [Validação de JIDs](#1-validação-de-jids)
2. [Sistema de Retry](#2-sistema-de-retry)
3. [Rate Limiting](#3-rate-limiting)
4. [Handlers Modulares](#4-handlers-modulares)
5. [Monitoramento de Status](#5-monitoramento-de-status)
6. [Tratamento de Erros Melhorado](#6-tratamento-de-erros-melhorado)

## 1. Validação de JIDs

### Implementação

```typescript
// src/services/messaging/whatsapp/utils/JIDValidator.ts

export class JIDValidator {
  private static readonly JID_REGEX = /^(\d+)@(s\.whatsapp\.net|g\.us|c\.us)$/;
  private static readonly PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

  /**
   * Valida se um JID está no formato correto
   */
  static isValidJID(jid: string): boolean {
    return this.JID_REGEX.test(jid);
  }

  /**
   * Valida se um número de telefone está no formato correto
   */
  static isValidPhoneNumber(phone: string): boolean {
    // Remove caracteres não numéricos exceto +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    return this.PHONE_REGEX.test(cleanPhone);
  }

  /**
   * Formata um número para JID
   */
  static formatToJID(number: string, isGroup: boolean = false): string {
    // Remove todos os caracteres não numéricos
    const cleanNumber = number.replace(/\D/g, '');
    
    if (!cleanNumber) {
      throw new Error('Invalid number: empty after cleaning');
    }

    if (isGroup) {
      return `${cleanNumber}@g.us`;
    }
    return `${cleanNumber}@s.whatsapp.net`;
  }

  /**
   * Normaliza um JID (remove @c.us, converte para @s.whatsapp.net)
   */
  static normalizeJID(jid: string): string {
    if (this.isValidJID(jid)) {
      // Se já é um JID válido, normaliza para @s.whatsapp.net ou mantém @g.us
      if (jid.includes('@g.us')) {
        return jid;
      }
      // Converte @c.us para @s.whatsapp.net
      return jid.replace('@c.us', '@s.whatsapp.net');
    }

    // Se não é JID, tenta formatar como número
    if (this.isValidPhoneNumber(jid)) {
      return this.formatToJID(jid);
    }

    throw new Error(`Invalid JID format: ${jid}`);
  }

  /**
   * Detecta se um JID é de grupo
   */
  static isGroupJID(jid: string): boolean {
    return jid.includes('@g.us');
  }

  /**
   * Extrai o número de um JID
   */
  static extractNumber(jid: string): string {
    const match = jid.match(/^(\d+)@/);
    return match ? match[1] : '';
  }
}
```

### Uso no WhatsAppServiceBaileys

```typescript
// Adicionar no início do arquivo
import { JIDValidator } from './utils/JIDValidator';

// No método sendOffer
async sendOffer(offer: Offer): Promise<boolean> {
  // ... código existente ...

  try {
    // Validar e formatar JID
    let jid: string;
    
    if (JIDValidator.isValidJID(this.targetNumber)) {
      jid = JIDValidator.normalizeJID(this.targetNumber);
    } else if (JIDValidator.isValidPhoneNumber(this.targetNumber)) {
      jid = JIDValidator.formatToJID(this.targetNumber);
    } else {
      throw new Error(`Invalid target number format: ${this.targetNumber}`);
    }

    logger.debug(`Sending to JID: ${jid} (isGroup: ${JIDValidator.isGroupJID(jid)})`);

    // Enviar mensagem
    await this.sock.sendMessage(jid, { text: message });
    
    // ... resto do código ...
  } catch (error) {
    logger.error('Error sending offer:', error);
    return false;
  }
}
```

## 2. Sistema de Retry

### Implementação

```typescript
// src/services/messaging/whatsapp/utils/RetryHelper.ts

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export class RetryHelper {
  /**
   * Executa uma função com retry automático
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryableErrors = []
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Se não é um erro retryable, lança imediatamente
        if (retryableErrors.length > 0) {
          const errorMessage = error?.message || String(error);
          const isRetryable = retryableErrors.some(pattern => 
            errorMessage.includes(pattern)
          );
          
          if (!isRetryable) {
            throw error;
          }
        }

        // Se é a última tentativa, lança o erro
        if (attempt === maxRetries) {
          throw error;
        }

        // Calcula delay com backoff exponencial
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );

        logger.warn(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms. Error: ${error?.message}`
        );

        await this.delay(delay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Uso no WhatsAppServiceBaileys

```typescript
import { RetryHelper } from './utils/RetryHelper';

async sendOffer(offer: Offer): Promise<boolean> {
  // ... código de validação ...

  try {
    const message = this.formatMessage(offer);
    const jid = JIDValidator.normalizeJID(this.targetNumber);

    // Enviar mensagem com retry
    await RetryHelper.retry(
      async () => {
        await this.sock!.sendMessage(jid, { text: message });
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'Connection closed']
      }
    );

    // Enviar imagem com retry
    if (offer.imageUrl) {
      await RetryHelper.retry(
        async () => {
          const imageResponse = await axios.get(offer.imageUrl!, {
            responseType: 'arraybuffer'
          });
          const imageBuffer = Buffer.from(imageResponse.data);

          await this.sock!.sendMessage(jid, {
            image: imageBuffer,
            caption: offer.title
          });
        },
        {
          maxRetries: 2,
          initialDelay: 2000
        }
      );
    }

    logger.info(`Offer sent to WhatsApp: ${offer.title}`);
    return true;
  } catch (error) {
    logger.error('Error sending offer after retries:', error);
    return false;
  }
}
```

## 3. Rate Limiting

### Implementação

```typescript
// src/services/messaging/whatsapp/utils/RateLimiter.ts

export interface RateLimitConfig {
  maxMessagesPerMinute?: number;
  maxMessagesPerHour?: number;
  maxMessagesPerDay?: number;
}

export class RateLimiter {
  private messages: Date[] = [];
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      maxMessagesPerMinute: config.maxMessagesPerMinute || 20,
      maxMessagesPerHour: config.maxMessagesPerHour || 200,
      maxMessagesPerDay: config.maxMessagesPerDay || 1000
    };
  }

  /**
   * Verifica se pode enviar mensagem e aguarda se necessário
   */
  async waitIfNeeded(): Promise<void> {
    const now = new Date();
    
    // Limpa mensagens antigas
    this.cleanOldMessages(now);

    // Verifica limite por minuto
    if (this.messages.length >= this.config.maxMessagesPerMinute) {
      const oldest = this.messages[0];
      const waitTime = 60000 - (now.getTime() - oldest.getTime());
      
      if (waitTime > 0) {
        logger.debug(`Rate limit: waiting ${waitTime}ms before next message`);
        await this.delay(waitTime);
        // Limpa novamente após esperar
        this.cleanOldMessages(new Date());
      }
    }

    // Verifica limite por hora
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const messagesLastHour = this.messages.filter(msg => msg > oneHourAgo);
    if (messagesLastHour.length >= this.config.maxMessagesPerHour) {
      const oldest = messagesLastHour[0];
      const waitTime = 3600000 - (now.getTime() - oldest.getTime());
      
      if (waitTime > 0) {
        logger.warn(`Hourly rate limit reached. Waiting ${waitTime}ms`);
        await this.delay(waitTime);
      }
    }

    // Verifica limite por dia
    const oneDayAgo = new Date(now.getTime() - 86400000);
    const messagesLastDay = this.messages.filter(msg => msg > oneDayAgo);
    if (messagesLastDay.length >= this.config.maxMessagesPerDay) {
      throw new Error('Daily rate limit reached. Please wait before sending more messages.');
    }

    // Registra mensagem
    this.messages.push(new Date());
  }

  /**
   * Remove mensagens antigas (mais de 1 dia)
   */
  private cleanOldMessages(now: Date): void {
    const oneDayAgo = new Date(now.getTime() - 86400000);
    this.messages = this.messages.filter(msg => msg > oneDayAgo);
  }

  /**
   * Obtém estatísticas de rate limit
   */
  getStats(): {
    messagesLastMinute: number;
    messagesLastHour: number;
    messagesLastDay: number;
  } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    return {
      messagesLastMinute: this.messages.filter(msg => msg > oneMinuteAgo).length,
      messagesLastHour: this.messages.filter(msg => msg > oneHourAgo).length,
      messagesLastDay: this.messages.filter(msg => msg > oneDayAgo).length
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Uso no WhatsAppServiceBaileys

```typescript
import { RateLimiter } from './utils/RateLimiter';

export class WhatsAppServiceBaileys implements IWhatsAppService {
  private rateLimiter: RateLimiter;

  constructor() {
    // ... código existente ...
    this.rateLimiter = new RateLimiter({
      maxMessagesPerMinute: 20,
      maxMessagesPerHour: 200,
      maxMessagesPerDay: 1000
    });
  }

  async sendOffer(offer: Offer): Promise<boolean> {
    // ... código de validação ...

    try {
      // Aguardar rate limit
      await this.rateLimiter.waitIfNeeded();

      // Enviar mensagem
      await this.sock.sendMessage(jid, { text: message });
      
      // ... resto do código ...
    } catch (error) {
      // ... tratamento de erro ...
    }
  }
}
```

## 4. Handlers Modulares

### ConnectionHandler

```typescript
// src/services/messaging/whatsapp/handlers/ConnectionHandler.ts

import { WASocket, ConnectionState } from 'baileys';
import { Boom } from '@hapi/boom';
import { DisconnectReason } from 'baileys';
import { logger } from '../../../utils/logger';

export class ConnectionHandler {
  private sock: WASocket;
  private onConnected?: () => void;
  private onDisconnected?: (error?: string) => void;
  private onQRCode?: (qr: string) => void;

  constructor(
    sock: WASocket,
    callbacks: {
      onConnected?: () => void;
      onDisconnected?: (error?: string) => void;
      onQRCode?: (qr: string) => void;
    }
  ) {
    this.sock = sock;
    this.onConnected = callbacks.onConnected;
    this.onDisconnected = callbacks.onDisconnected;
    this.onQRCode = callbacks.onQRCode;

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      this.handleConnectionUpdate(update);
    });
  }

  private handleConnectionUpdate(update: Partial<ConnectionState>): void {
    const { connection, lastDisconnect, qr } = update;

    // Handle QR code
    if (qr && this.onQRCode) {
      this.onQRCode(qr);
    }

    // Handle connection open
    if (connection === 'open') {
      logger.info('✅ WhatsApp connected!');
      if (this.onConnected) {
        this.onConnected();
      }
    }

    // Handle connection close
    if (connection === 'close') {
      this.handleDisconnect(lastDisconnect);
    }
  }

  private handleDisconnect(lastDisconnect?: any): void {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
    const error = lastDisconnect?.error;

    // Check for different disconnect reasons
    if (statusCode === DisconnectReason.loggedOut) {
      logger.warn('WhatsApp logged out - need to scan QR code again');
      if (this.onDisconnected) {
        this.onDisconnected('Logged out');
      }
    } else if (statusCode === DisconnectReason.restartRequired) {
      logger.info('WhatsApp restart required - reconnecting...');
      // Will be handled by reconnection logic
    } else if (statusCode === DisconnectReason.timedOut) {
      logger.warn('WhatsApp connection timed out - reconnecting...');
      if (this.onDisconnected) {
        this.onDisconnected('Connection timed out');
      }
    } else {
      logger.warn(`WhatsApp disconnected: ${error?.message || 'Unknown error'}`);
      if (this.onDisconnected) {
        this.onDisconnected(error?.message || 'Unknown error');
      }
    }
  }
}
```

### Uso no WhatsAppServiceBaileys

```typescript
import { ConnectionHandler } from './handlers/ConnectionHandler';

export class WhatsAppServiceBaileys implements IWhatsAppService {
  private connectionHandler: ConnectionHandler | null = null;

  private async initializeSocket(): Promise<void> {
    // ... código de inicialização do socket ...

    // Criar connection handler
    this.connectionHandler = new ConnectionHandler(this.sock, {
      onConnected: () => {
        this._isReady = true;
        this.connectionState = 'connected';
      },
      onDisconnected: (error) => {
        this._isReady = false;
        this.connectionState = 'disconnected';
        this.lastError = error || null;
        // Trigger reconnection
        this.handleReconnection();
      },
      onQRCode: (qr) => {
        this.currentQRCode = qr;
        this.qrCodeTimestamp = Date.now();
        this.notifyQRCodeCallbacks(qr);
      }
    });
  }
}
```

## 5. Monitoramento de Status

### Implementação

```typescript
// src/services/messaging/whatsapp/types/ConnectionStatus.ts

export interface ConnectionStatus {
  isConnected: boolean;
  isReady: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected';
  lastConnected: Date | null;
  connectionUptime: number | null;
  reconnectCount: number;
  lastError: string | null;
  qrCodeGenerated: boolean;
  qrCodeExpiresAt: Date | null;
  messagesSent: number;
  messagesFailed: number;
  hasAuthFiles: boolean;
  rateLimitStats?: {
    messagesLastMinute: number;
    messagesLastHour: number;
    messagesLastDay: number;
  };
}
```

### Uso no WhatsAppServiceBaileys

```typescript
export class WhatsAppServiceBaileys implements IWhatsAppService {
  private connectionStartTime: Date | null = null;
  private reconnectCount = 0;
  private messagesSent = 0;
  private messagesFailed = 0;

  getConnectionInfo(): ConnectionStatus {
    const { existsSync } = require('fs');
    const { join } = require('path');
    const authDir = join(process.cwd(), 'auth_info_baileys');

    const uptime = this.connectionStartTime
      ? Date.now() - this.connectionStartTime.getTime()
      : null;

    return {
      isConnected: this.connectionState === 'connected',
      isReady: this._isReady,
      connectionState: this.connectionState as any,
      lastConnected: this.connectionStartTime,
      connectionUptime: uptime,
      reconnectCount: this.reconnectCount,
      lastError: this.lastError,
      qrCodeGenerated: !!this.currentQRCode,
      qrCodeExpiresAt: this.currentQRCode
        ? new Date(Date.now() + 60000) // QR code expira em ~1 minuto
        : null,
      messagesSent: this.messagesSent,
      messagesFailed: this.messagesFailed,
      hasAuthFiles: existsSync(authDir),
      rateLimitStats: this.rateLimiter?.getStats()
    };
  }

  async sendOffer(offer: Offer): Promise<boolean> {
    try {
      // ... código de envio ...
      this.messagesSent++;
      return true;
    } catch (error) {
      this.messagesFailed++;
      return false;
    }
  }
}
```

## 6. Tratamento de Erros Melhorado

### Implementação

```typescript
// src/services/messaging/whatsapp/handlers/ErrorHandler.ts

import { logger } from '../../../utils/logger';

export enum WhatsAppErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  MESSAGE_ERROR = 'MESSAGE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class WhatsAppError extends Error {
  constructor(
    public type: WhatsAppErrorType,
    message: string,
    public originalError?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

export class ErrorHandler {
  static handle(error: any): WhatsAppError {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || '';

    // Connection errors
    if (errorCode === 'ECONNRESET' || errorCode === 'ETIMEDOUT') {
      return new WhatsAppError(
        WhatsAppErrorType.CONNECTION_ERROR,
        `Connection error: ${errorMessage}`,
        error,
        true
      );
    }

    // Authentication errors
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return new WhatsAppError(
        WhatsAppErrorType.AUTHENTICATION_ERROR,
        'Authentication failed. Please scan QR code again.',
        error,
        false
      );
    }

    // Rate limit errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return new WhatsAppError(
        WhatsAppErrorType.RATE_LIMIT_ERROR,
        'Rate limit exceeded. Please wait before sending more messages.',
        error,
        true
      );
    }

    // Validation errors
    if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
      return new WhatsAppError(
        WhatsAppErrorType.VALIDATION_ERROR,
        `Validation error: ${errorMessage}`,
        error,
        false
      );
    }

    // Unknown error
    return new WhatsAppError(
      WhatsAppErrorType.UNKNOWN_ERROR,
      `Unknown error: ${errorMessage}`,
      error,
      false
    );
  }

  static log(error: WhatsAppError): void {
    const logLevel = error.retryable ? 'warn' : 'error';
    logger[logLevel](`[${error.type}] ${error.message}`, {
      originalError: error.originalError,
      retryable: error.retryable
    });
  }
}
```

### Uso no WhatsAppServiceBaileys

```typescript
import { ErrorHandler, WhatsAppError } from './handlers/ErrorHandler';

async sendOffer(offer: Offer): Promise<boolean> {
  try {
    // ... código de envio ...
  } catch (error) {
    const whatsappError = ErrorHandler.handle(error);
    ErrorHandler.log(whatsappError);

    // Se for retryable, pode tentar novamente
    if (whatsappError.retryable) {
      logger.info('Error is retryable, will retry on next attempt');
    }

    return false;
  }
}
```

## 📝 Próximos Passos

1. Implementar validação de JIDs
2. Adicionar sistema de retry
3. Implementar rate limiting
4. Criar handlers modulares
5. Adicionar monitoramento de status
6. Melhorar tratamento de erros

## 🔗 Referências

- [Análise do Projeto Iris](IRIS_PROJECT_ANALYSIS.md)
- [Implementação WhatsApp Atual](WHATSAPP_IMPLEMENTATION.md)

