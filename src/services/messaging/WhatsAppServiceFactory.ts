import { IWhatsAppService } from './IWhatsAppService';
import { WhatsAppServiceBaileys } from './WhatsAppServiceBaileys';
import { logger } from '../../utils/logger';

/**
 * Factory para criar instâncias do serviço WhatsApp
 * Usa exclusivamente Baileys (mais leve, sem Puppeteer)
 */
export class WhatsAppServiceFactory {
  /**
   * Cria uma instância do serviço WhatsApp (Baileys)
   */
  static create(_library?: string): IWhatsAppService {
    logger.info('Using WhatsApp library: Baileys');
    return new WhatsAppServiceBaileys();
  }

  /**
   * Retorna biblioteca disponível
   */
  static getAvailableLibraries(): string[] {
    return ['baileys'];
  }
}
