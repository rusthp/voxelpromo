import { IWhatsAppService } from './IWhatsAppService';
import { WhatsAppServiceWebJS } from './WhatsAppServiceWebJS';
import { WhatsAppServiceBaileys } from './WhatsAppServiceBaileys';
import { logger } from '../../utils/logger';

export type WhatsAppLibrary = 'whatsapp-web.js' | 'baileys';

/**
 * Factory para criar instâncias de serviços WhatsApp
 */
export class WhatsAppServiceFactory {
  /**
   * Cria uma instância do serviço WhatsApp baseado na configuração
   */
  static create(library?: string): IWhatsAppService {
    const libraryName = (
      library ||
      process.env.WHATSAPP_LIBRARY ||
      'whatsapp-web.js'
    ).toLowerCase();

    switch (libraryName) {
      case 'baileys':
        logger.info('Using WhatsApp library: Baileys');
        return new WhatsAppServiceBaileys();

      case 'whatsapp-web.js':
      case 'whatsappwebjs':
      default:
        logger.info('Using WhatsApp library: whatsapp-web.js');
        return new WhatsAppServiceWebJS();
    }
  }

  /**
   * Lista bibliotecas disponíveis
   */
  static getAvailableLibraries(): WhatsAppLibrary[] {
    return ['whatsapp-web.js', 'baileys'];
  }
}
