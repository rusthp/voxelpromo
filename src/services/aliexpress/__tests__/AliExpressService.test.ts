import { AliExpressService } from '../AliExpressService';
import { readFileSync, existsSync } from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock ExchangeRateService to always fail (forcing fallback to config/env)
jest.mock('../../exchangerate/ExchangeRateService', () => ({
  ExchangeRateService: jest.fn().mockImplementation(() => ({
    getUSDtoBRLRate: jest.fn().mockRejectedValue(new Error('API unavailable')),
  })),
}));

const mockedReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('AliExpressService', () => {
  let service: AliExpressService;

  beforeEach(() => {
    service = new AliExpressService();
    jest.clearAllMocks();

    // Default mocks
    mockedExistsSync.mockReturnValue(false);
    // Remove env var instead of setting to undefined
    delete process.env.ALIEXPRESS_EXCHANGE_RATE;
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AliExpressService);
    });
  });

  describe('getExchangeRate', () => {
    it('should return default exchange rate when config.json does not exist and API fails', async () => {
      mockedExistsSync.mockReturnValue(false);
      // Ensure env var is not set
      delete process.env.ALIEXPRESS_EXCHANGE_RATE;

      const result = await (service as any).getExchangeRate();

      expect(result).toBe(5.0); // Default value from env fallback
    });

    it('should return exchange rate from config.json when API fails', async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({
          aliexpress: {
            exchangeRate: 5.5,
          },
        })
      );

      const result = await (service as any).getExchangeRate();

      expect(result).toBe(5.5);
    });

    it('should return exchange rate from environment variable when API fails', async () => {
      mockedExistsSync.mockReturnValue(false);
      process.env.ALIEXPRESS_EXCHANGE_RATE = '5.8';

      const result = await (service as any).getExchangeRate();

      // Note: getExchangeRate tries ExchangeRateService first, which will use mocked value or fail
      // Since we're testing fallback behavior, we expect the env var fallback
      expect(result).toBe(5.8);
    });

    it('should fall back to default on error reading config', async () => {
      mockedExistsSync.mockReturnValue(true);
      // Ensure env var is not set
      delete process.env.ALIEXPRESS_EXCHANGE_RATE;
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await (service as any).getExchangeRate();

      expect(result).toBe(5.0); // Default fallback
    });
  });

  describe('convertToBRL', () => {
    it('should convert USD to BRL using exchange rate', async () => {
      mockedExistsSync.mockReturnValue(false);
      process.env.ALIEXPRESS_EXCHANGE_RATE = '5.0';

      const usdPrice = 10;
      const result = await (service as any).convertToBRL(usdPrice);

      expect(result).toBe(50); // 10 * 5.0 = 50
    });

    it('should round to 2 decimal places', async () => {
      mockedExistsSync.mockReturnValue(false);
      process.env.ALIEXPRESS_EXCHANGE_RATE = '5.123';

      const usdPrice = 10;
      const result = await (service as any).convertToBRL(usdPrice);

      // Math.round(10 * 5.123 * 100) / 100 = Math.round(512.3) / 100 = 512 / 100 = 5.12
      expect(result).toBe(51.23); // 10 * 5.123 = 51.23, rounded to 2 decimals
    });
  });

  describe('safeParseFloat', () => {
    it('should parse valid number string', () => {
      const result = (service as any).safeParseFloat('123.45');
      expect(result).toBe(123.45);
    });

    it('should parse valid number', () => {
      const result = (service as any).safeParseFloat(123.45);
      expect(result).toBe(123.45);
    });

    it('should return default for null', () => {
      const result = (service as any).safeParseFloat(null, 0);
      expect(result).toBe(0);
    });

    it('should return default for undefined', () => {
      const result = (service as any).safeParseFloat(undefined, 0);
      expect(result).toBe(0);
    });

    it('should return default for empty string', () => {
      const result = (service as any).safeParseFloat('', 0);
      expect(result).toBe(0);
    });

    it('should return default for NaN', () => {
      const result = (service as any).safeParseFloat('invalid', 0);
      expect(result).toBe(0);
    });

    it('should use custom default value', () => {
      const result = (service as any).safeParseFloat(null, 100);
      expect(result).toBe(100);
    });
  });

  describe('getConfig', () => {
    it('should get config from config.json when available', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({
          aliexpress: {
            appKey: 'test-key',
            appSecret: 'test-secret',
            trackingId: 'test-tracking',
          },
        })
      );

      const config = (service as any).getConfig();

      expect(config).toEqual({
        appKey: 'test-key',
        appSecret: 'test-secret',
        trackingId: 'test-tracking',
      });
    });

    it('should get config from environment variables when config.json not available', () => {
      mockedExistsSync.mockReturnValue(false);
      const originalAppKey = process.env.ALIEXPRESS_APP_KEY;
      const originalAppSecret = process.env.ALIEXPRESS_APP_SECRET;
      const originalTrackingId = process.env.ALIEXPRESS_TRACKING_ID;

      process.env.ALIEXPRESS_APP_KEY = 'env-key';
      process.env.ALIEXPRESS_APP_SECRET = 'env-secret';
      process.env.ALIEXPRESS_TRACKING_ID = 'env-tracking';

      const config = (service as any).getConfig();

      expect(config).toEqual({
        appKey: 'env-key',
        appSecret: 'env-secret',
        trackingId: 'env-tracking',
      });

      // Restore original values
      if (originalAppKey) process.env.ALIEXPRESS_APP_KEY = originalAppKey;
      else delete process.env.ALIEXPRESS_APP_KEY;
      if (originalAppSecret) process.env.ALIEXPRESS_APP_SECRET = originalAppSecret;
      else delete process.env.ALIEXPRESS_APP_SECRET;
      if (originalTrackingId) process.env.ALIEXPRESS_TRACKING_ID = originalTrackingId;
      else delete process.env.ALIEXPRESS_TRACKING_ID;
    });

    it('should use empty strings for missing config values', () => {
      mockedExistsSync.mockReturnValue(false);
      const originalAppKey = process.env.ALIEXPRESS_APP_KEY;
      const originalAppSecret = process.env.ALIEXPRESS_APP_SECRET;
      const originalTrackingId = process.env.ALIEXPRESS_TRACKING_ID;

      delete process.env.ALIEXPRESS_APP_KEY;
      delete process.env.ALIEXPRESS_APP_SECRET;
      delete process.env.ALIEXPRESS_TRACKING_ID;

      const config = (service as any).getConfig();

      expect(config.appKey).toBe('');
      expect(config.appSecret).toBe('');
      expect(config.trackingId).toBe('');

      // Restore original values
      if (originalAppKey) process.env.ALIEXPRESS_APP_KEY = originalAppKey;
      if (originalAppSecret) process.env.ALIEXPRESS_APP_SECRET = originalAppSecret;
      if (originalTrackingId) process.env.ALIEXPRESS_TRACKING_ID = originalTrackingId;
    });
  });
});
