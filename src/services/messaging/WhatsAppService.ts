/**
 * @deprecated Use WhatsAppServiceFactory instead
 * This file is kept for backward compatibility
 */
import { WhatsAppServiceFactory } from './WhatsAppServiceFactory';
import { IWhatsAppService } from './IWhatsAppService';

/**
 * WhatsApp Service - Wrapper para manter compatibilidade
 * Agora usa factory para escolher a biblioteca
 */
export class WhatsAppService implements IWhatsAppService {
  private service: IWhatsAppService;

  constructor() {
    this.service = WhatsAppServiceFactory.create();
  }

  async sendOffer(offer: any): Promise<boolean> {
    return this.service.sendOffer(offer);
  }

  async sendOffers(offers: any[]): Promise<number> {
    return this.service.sendOffers(offers);
  }

  isReady(): boolean {
    return this.service.isReady();
  }

  async initialize(): Promise<void> {
    return this.service.initialize();
  }

  getQRCode(): string | null {
    return this.service.getQRCode();
  }

  onQRCode(callback: (qr: string) => void): void {
    return this.service.onQRCode(callback);
  }

  async listGroups(): Promise<any[]> {
    return this.service.listGroups();
  }
}
