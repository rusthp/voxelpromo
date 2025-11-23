/**
 * Retry Helper - Sistema de retry automático com backoff exponencial
 * Baseado em melhores práticas do projeto Iris
 */

import { logger } from '../../../../utils/logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  context?: string; // Contexto para logging
}

export class RetryHelper {
  /**
   * Executa uma função com retry automático
   */
  static async retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryableErrors = [],
      context = 'Operation',
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
          const errorCode = error?.code || '';
          const isRetryable = retryableErrors.some(
            (pattern) => errorMessage.includes(pattern) || errorCode.includes(pattern)
          );

          if (!isRetryable) {
            logger.debug(
              `[${context}] Error is not retryable, throwing immediately: ${errorMessage}`
            );
            throw error;
          }
        }

        // Se é a última tentativa, lança o erro
        if (attempt === maxRetries) {
          logger.error(
            `[${context}] Max retries (${maxRetries}) reached. Final error: ${error?.message || String(error)}`
          );
          throw error;
        }

        // Calcula delay com backoff exponencial
        const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

        logger.warn(
          `[${context}] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms. Error: ${error?.message || String(error)}`
        );

        await this.delay(delay);
      }
    }

    throw lastError || new Error(`${context} failed after ${maxRetries} retries`);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry específico para operações de rede
   */
  static async retryNetwork<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    return this.retry(fn, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'Connection closed',
        'timeout',
      ],
      context: context || 'Network operation',
    });
  }

  /**
   * Retry específico para envio de mensagens WhatsApp
   */
  static async retryMessage<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    return this.retry(fn, {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'Connection closed', '503', '429'],
      context: context || 'WhatsApp message',
    });
  }
}
