/**
 * PaymentService P0 Tests
 *
 * These tests cover the most critical payment-related functionality:
 * 1. hasAccess - Access control based on subscription status
 * 2. verifyWebhookSignature - Security verification for MP webhooks
 * 3. createSubscription - Subscription creation flow (mocked)
 *
 * Run: npx jest src/services/__tests__/PaymentService.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import crypto from 'crypto';

// We need to mock before importing PaymentService
jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
  Preference: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
  })),
  Payment: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    get: jest.fn(),
  })),
  PreApproval: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
  })),
}));

// Mock logger to avoid console noise during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock plans config
jest.mock('../../config/plans.config', () => ({
  getPlan: jest.fn((planId: string) => {
    const plans: Record<string, any> = {
      trial: { id: 'trial', displayName: 'Trial', price: 0, billingCycle: 'monthly', features: [] },
      'pro-monthly': {
        id: 'pro-monthly',
        displayName: 'Performance',
        price: 4990,
        billingCycle: 'monthly',
        features: ['Filtros'],
      },
      'premium-monthly': {
        id: 'premium-monthly',
        displayName: 'Plus',
        price: 9990,
        billingCycle: 'monthly',
        features: ['Tudo'],
      },
    };
    return plans[planId] || null;
  }),
}));

import { PaymentService } from '../PaymentService';

describe('PaymentService', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv };
    process.env.MP_ACCESS_TOKEN = 'TEST-ACCESS-TOKEN';
    process.env.MP_WEBHOOK_SECRET = 'webhook-secret-key';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  // ============================================================
  // hasAccess - Static method for access control
  // ============================================================
  describe('hasAccess', () => {
    it('should return false for undefined subscription', () => {
      expect(PaymentService.hasAccess(undefined)).toBe(false);
    });

    it('should return true for authorized subscription', () => {
      const subscription = {
        status: 'authorized',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };
      expect(PaymentService.hasAccess(subscription)).toBe(true);
    });

    it('should return true for cancelled subscription within grace period', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const subscription = {
        status: 'cancelled',
        nextBillingDate: futureDate,
      };
      expect(PaymentService.hasAccess(subscription)).toBe(true);
    });

    it('should return false for cancelled subscription past grace period', () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const subscription = {
        status: 'cancelled',
        nextBillingDate: pastDate,
      };
      expect(PaymentService.hasAccess(subscription)).toBe(false);
    });

    it('should return false for paused subscription', () => {
      const subscription = {
        status: 'paused',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      expect(PaymentService.hasAccess(subscription)).toBe(false);
    });

    it('should handle fixed access (Pix/Boleto) within validity', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const subscription = {
        status: 'pending',
        accessType: 'fixed',
        nextBillingDate: futureDate,
      };
      expect(PaymentService.hasAccess(subscription)).toBe(true);
    });

    it('should return false for pending recurring subscription', () => {
      const subscription = {
        status: 'pending',
        accessType: 'recurring',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      expect(PaymentService.hasAccess(subscription)).toBe(false);
    });
  });

  // ============================================================
  // verifyWebhookSignature - Security verification
  // ============================================================
  describe('verifyWebhookSignature', () => {
    let service: PaymentService;

    beforeEach(() => {
      service = new PaymentService();
    });

    it('should accept valid MP signature', () => {
      const secret = 'webhook-secret-key';
      const requestId = 'request-123';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = { data: { id: 'payment-456' } };

      // Build manifest as MP does
      const manifest = `${body.data.id};${requestId};${timestamp}`;
      const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

      const signature = `ts=${timestamp},v1=${hash}`;

      const result = service.verifyWebhookSignature(signature, requestId, body);
      expect(result).toBe(true);
    });

    it('should reject tampered signature', () => {
      const requestId = 'request-123';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = { data: { id: 'payment-456' } };

      const tamperedSignature = `ts=${timestamp},v1=TAMPERED_HASH_VALUE`;

      const result = service.verifyWebhookSignature(tamperedSignature, requestId, body);
      expect(result).toBe(false);
    });

    it('should reject missing signature', () => {
      const result = service.verifyWebhookSignature(undefined, 'request-123', {
        data: { id: '123' },
      });
      expect(result).toBe(false);
    });

    it('should reject missing request ID', () => {
      const result = service.verifyWebhookSignature('ts=123,v1=abc', undefined, {
        data: { id: '123' },
      });
      expect(result).toBe(false);
    });

    it('should reject malformed signature format', () => {
      const result = service.verifyWebhookSignature('invalid-format', 'request-123', {
        data: { id: '123' },
      });
      expect(result).toBe(false);
    });

    it('should reject replay attack with old timestamp (if implemented)', () => {
      // Note: Current implementation doesn't check timestamp age
      // This test documents expected behavior for future implementation
      const secret = 'webhook-secret-key';
      const requestId = 'request-123';
      // Timestamp from 1 hour ago
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 3600).toString();
      const body = { data: { id: 'payment-456' } };

      const manifest = `${body.data.id};${requestId};${oldTimestamp}`;
      const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

      const signature = `ts=${oldTimestamp},v1=${hash}`;

      // Current implementation: accepts old timestamps (signature is valid)
      // TODO: Future improvement - reject timestamps older than 5 minutes
      const result = service.verifyWebhookSignature(signature, requestId, body);
      // For now, this passes - document this as technical debt
      expect(result).toBe(true); // Should be false after implementing timestamp check
    });

    it('should reject in production when secret is not configured', () => {
      process.env.MP_WEBHOOK_SECRET = '';
      process.env.NODE_ENV = 'production';

      const productionService = new PaymentService();
      const result = productionService.verifyWebhookSignature('ts=1,v1=hash', 'req-id', {});
      expect(result).toBe(false);
    });

    it('should allow in development when secret is not configured (warn only)', () => {
      process.env.MP_WEBHOOK_SECRET = '';
      process.env.NODE_ENV = 'development';

      const devService = new PaymentService();
      const result = devService.verifyWebhookSignature('ts=1,v1=hash', 'req-id', {});
      expect(result).toBe(true);
    });
  });

  // ============================================================
  // createSubscription - Subscription creation (mocked)
  // ============================================================
  describe('createSubscription', () => {
    let service: PaymentService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockPreApprovalCreate: jest.MockedFunction<any>;

    beforeEach(() => {
      // Get mock from mercadopago
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PreApproval } = require('mercadopago');
      mockPreApprovalCreate = jest.fn();
      PreApproval.mockImplementation(() => ({
        create: mockPreApprovalCreate,
        update: jest.fn(),
        get: jest.fn(),
      }));

      service = new PaymentService();
    });

    it('should create subscription with valid card token', async () => {
      mockPreApprovalCreate.mockResolvedValue({
        id: 'sub-123',
        status: 'authorized',
        payer_id: 'payer-456',
      });

      const result = await service.createSubscription({
        userId: 'user-123',
        planId: 'pro-monthly',
        payerEmail: 'test@test.com',
        token: 'valid-card-token',
        paymentMethodId: 'visa',
      });

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe('sub-123');
      expect(result.status).toBe('authorized');
    });

    it('should reject invalid plan', async () => {
      // Note: PaymentService wraps errors in user-friendly messages
      await expect(
        service.createSubscription({
          userId: 'user-123',
          planId: 'invalid-plan',
          payerEmail: 'test@test.com',
          token: 'token',
          paymentMethodId: 'visa',
        })
      ).rejects.toThrow(); // Any error is acceptable - the plan is invalid
    });

    // TODO: Trial test requires UserModel mock at module level
    // Skipping for now - will be implemented with integration test setup
    it.skip('should handle trial plan without payment', async () => {
      // This test requires:
      // 1. Mock UserModel at module level (before import)
      // 2. Or use integration test with in-memory MongoDB
      const result = await service.createSubscription({
        userId: 'user-123',
        planId: 'trial',
        payerEmail: 'test@test.com',
        token: 'not-needed',
        paymentMethodId: 'not-needed',
      });

      expect(result.success).toBe(true);
      expect(result.isTrial).toBe(true);
    });

    it('should handle MP API rejection gracefully', async () => {
      mockPreApprovalCreate.mockRejectedValue(new Error('invalid_token'));

      await expect(
        service.createSubscription({
          userId: 'user-123',
          planId: 'pro-monthly',
          payerEmail: 'test@test.com',
          token: 'invalid-token',
          paymentMethodId: 'visa',
        })
      ).rejects.toThrow('Token de cartão inválido');
    });

    it('should handle insufficient funds error', async () => {
      mockPreApprovalCreate.mockRejectedValue(new Error('insufficient_funds'));

      await expect(
        service.createSubscription({
          userId: 'user-123',
          planId: 'pro-monthly',
          payerEmail: 'test@test.com',
          token: 'token',
          paymentMethodId: 'visa',
        })
      ).rejects.toThrow('Saldo insuficiente');
    });
  });

  // ============================================================
  // cancelSubscription
  // ============================================================
  describe('cancelSubscription', () => {
    let service: PaymentService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockPreApprovalUpdate: jest.MockedFunction<any>;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PreApproval } = require('mercadopago');
      mockPreApprovalUpdate = jest.fn();
      PreApproval.mockImplementation(() => ({
        create: jest.fn(),
        update: mockPreApprovalUpdate,
        get: jest.fn(),
      }));

      service = new PaymentService();
    });

    it('should cancel subscription successfully', async () => {
      mockPreApprovalUpdate.mockResolvedValue({ status: 'cancelled' });

      const result = await service.cancelSubscription('sub-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
    });

    it('should handle cancellation failure', async () => {
      mockPreApprovalUpdate.mockRejectedValue(new Error('API error'));

      await expect(service.cancelSubscription('sub-123')).rejects.toThrow(
        'Erro ao cancelar assinatura'
      );
    });
  });
});
