import { IPaymentService } from './IPaymentService';
import { MercadoPagoService } from './MercadoPagoService';
import { StripeService } from './StripeService';

export class PaymentFactory {
    private static mercadoPagoService: MercadoPagoService;
    private static stripeService: StripeService;

    static getService(provider: 'mercadopago' | 'stripe'): IPaymentService {
        if (provider === 'stripe') {
            if (!this.stripeService) {
                this.stripeService = new StripeService();
            }
            return this.stripeService;
        }

        // Default to Mercado Pago
        if (!this.mercadoPagoService) {
            this.mercadoPagoService = new MercadoPagoService();
        }
        return this.mercadoPagoService;
    }
}
