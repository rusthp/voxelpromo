import { Offer } from '../../types';

/**
 * Represents a WhatsApp group
 */
export interface WhatsAppGroup {
  id: string;              // Group ID (e.g., "120363123456789012@g.us")
  name: string;            // Group name
  participantCount: number; // Number of participants
  isActive: boolean;       // Whether this group is selected in config
}

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
   * Lista todos os grupos WhatsApp disponíveis
   */
  listGroups(): Promise<WhatsAppGroup[]>;

  /**
   * Obtém o QR code atual (se disponível)
   */
  getQRCode(): string | null;

  /**
   * Callback para quando QR code for gerado
   */
  onQRCode(callback: (qr: string) => void): void;
}
