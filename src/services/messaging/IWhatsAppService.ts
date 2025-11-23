import { Offer } from '../../types';

/**
 * Interface comum para todos os serviços WhatsApp
 */
export interface IWhatsAppService {
  /**
   * Envia uma oferta para WhatsApp
   */
  sendOffer(offer: Offer): Promise<boolean>;

  /**
   * Envia múltiplas ofertas
   */
  sendOffers(offers: Offer[]): Promise<number>;

  /**
   * Verifica se o serviço está pronto
   */
  isReady(): boolean;

  /**
   * Inicializa o serviço (lazy initialization)
   */
  initialize(): Promise<void>;

  /**
   * Obtém o QR code atual (se disponível)
   */
  getQRCode(): string | null;

  /**
   * Callback para quando QR code for gerado
   */
  onQRCode(callback: (qr: string) => void): void;
}
