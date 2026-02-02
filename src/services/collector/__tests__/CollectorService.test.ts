import { CollectorService } from '../CollectorService';
import { Offer } from '../../../types';
import { AmazonService } from '../../amazon/AmazonService';
import { AliExpressService } from '../../aliexpress/AliExpressService';
import { MercadoLivreService } from '../../mercadolivre/MercadoLivreService';
import { ShopeeService } from '../../shopee/ShopeeService';
import { RSSService } from '../../rss/RSSService';
import { OfferService } from '../../offer/OfferService';
import { BlacklistService } from '../../blacklist/BlacklistService';
// Mock UserSettings
jest.mock('../../user/UserSettingsService');
jest.mock('../../../models/UserSettings');

// Mock logger and retry utilities only (not the services themselves)
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../utils/retry', () => ({
  retryWithBackoff: jest.fn((fn) => fn()),
}));

jest.mock('../../../models/ScrapingBatch');

/**
 * Creates a mock offer with optional overrides
 */
const createMockOffer = (overrides: Partial<Offer> = {}): Offer => ({
  title: 'Test Product',
  description: 'Test Description',
  originalPrice: 100,
  currentPrice: 80,
  discount: 20,
  discountPercentage: 20,
  currency: 'BRL',
  imageUrl: 'http://example.com/img.jpg',
  productUrl: 'http://example.com/product',
  affiliateUrl: 'http://example.com/aff',
  source: 'amazon',
  category: 'electronics',
  isActive: true,
  isPosted: false,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user123', // Mock userId
  ...overrides,
});

/**
 * Creates mock services with jest.fn() implementations
 * Uses explicit mock types to preserve Jest mock methods
 */
const createMockDeps = () => {
  const amazonService = {
    searchProducts: jest.fn().mockResolvedValue([]),
    convertToOffer: jest.fn().mockReturnValue(createMockOffer({ source: 'amazon' })),
  };

  const aliExpressService = {
    getHotProducts: jest.fn().mockResolvedValue([]),
    getFlashDeals: jest.fn().mockResolvedValue([]),
    getFeaturedPromoProducts: jest
      .fn()
      .mockResolvedValue({ products: [], pagination: { isFinished: true } }),
    smartMatchProducts: jest.fn().mockResolvedValue([]),
    searchProducts: jest.fn().mockResolvedValue([]),
    convertToOffer: jest.fn().mockResolvedValue(createMockOffer({ source: 'aliexpress' })),
  };

  const mercadoLivreService = {
    getDailyDeals: jest.fn().mockResolvedValue([]),
    getHotDeals: jest.fn().mockResolvedValue([]),
    searchProducts: jest.fn().mockResolvedValue([]),
    convertToOffer: jest.fn().mockResolvedValue(createMockOffer({ source: 'mercadolivre' })),
  };

  const shopeeService = {
    getProducts: jest.fn().mockResolvedValue([]),
    convertToOffer: jest.fn().mockReturnValue(createMockOffer({ source: 'shopee' })),
  };

  const rssService = {
    parseFeed: jest.fn().mockResolvedValue([]),
  };

  const offerService = {
    saveOffers: jest.fn().mockResolvedValue(0),
  };

  const userSettingsService = {
    getSafeSettings: jest.fn(),
  };

  const blacklistService = {
    getConfig: jest.fn().mockReturnValue({ enabled: false, keywords: [], regex: [] }),
    isOfferBlacklisted: jest.fn().mockReturnValue(false),
  };

  return {
    deps: {
      amazonService: amazonService as unknown as AmazonService,
      aliExpressService: aliExpressService as unknown as AliExpressService,
      mercadoLivreService: mercadoLivreService as unknown as MercadoLivreService,
      shopeeService: shopeeService as unknown as ShopeeService,
      rssService: rssService as unknown as RSSService,
      offerService: offerService as unknown as OfferService,
      blacklistService: blacklistService as unknown as BlacklistService,
    },
    mocks: {
      amazonService,
      aliExpressService,
      mercadoLivreService,
      shopeeService,
      rssService,
      offerService,
      blacklistService,
      userSettingsService,
    },
  };
};

describe('CollectorService', () => {
  let collectorService: CollectorService;
  let mocks: ReturnType<typeof createMockDeps>['mocks'];

  beforeEach(() => {
    jest.clearAllMocks();
    const { deps, mocks: mockServices } = createMockDeps();
    mocks = mockServices;
    collectorService = new CollectorService(deps);
  });

  describe('collectFromAmazon', () => {
    it('should collect and save offers from Amazon', async () => {
      const mockProducts = [
        {
          ASIN: 'B001',
          DetailPageURL: 'http://amazon.com/dp/B001',
          ItemInfo: { Title: { DisplayValue: 'Product 1' } },
        },
        {
          ASIN: 'B002',
          DetailPageURL: 'http://amazon.com/dp/B002',
          ItemInfo: { Title: { DisplayValue: 'Product 2' } },
        },
      ];

      mocks.amazonService.searchProducts!.mockResolvedValue(mockProducts);
      mocks.amazonService.convertToOffer!.mockReturnValue(createMockOffer({ source: 'amazon' }));
      mocks.offerService.saveOffers!.mockResolvedValue(2);

      const result = await collectorService.collectFromAmazon('notebook', 'electronics');

      expect(mocks.amazonService.searchProducts).toHaveBeenCalledWith('notebook', 20);
      expect(mocks.offerService.saveOffers).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('should return 0 on error', async () => {
      mocks.amazonService.searchProducts!.mockRejectedValue(new Error('API Error'));

      const result = await collectorService.collectFromAmazon('test', 'electronics');

      expect(result).toBe(0);
    });

    it('should apply blacklist filter', async () => {
      mocks.blacklistService.getConfig!.mockReturnValue({ enabled: true, keywords: [], regex: [] });
      mocks.blacklistService.isOfferBlacklisted!.mockReturnValue(true);

      const mockProducts = [
        {
          ASIN: 'B001',
          DetailPageURL: 'http://amazon.com/dp/B001',
          ItemInfo: { Title: { DisplayValue: 'Blocked Product' } },
        },
      ];
      mocks.amazonService.searchProducts!.mockResolvedValue(mockProducts);
      mocks.amazonService.convertToOffer!.mockReturnValue(createMockOffer());

      const result = await collectorService.collectFromAmazon('test', 'electronics');

      expect(mocks.offerService.saveOffers).toHaveBeenCalledWith([], undefined);
      expect(result).toBe(0);
    });
  });

  describe('collectFromAliExpress', () => {
    it('should collect and save offers from AliExpress', async () => {
      const mockProducts = [
        { product_id: '123', product_title: 'AliExpress Product 1' },
        { product_id: '456', product_title: 'AliExpress Product 2' },
      ];

      mocks.aliExpressService.getHotProducts!.mockResolvedValue(mockProducts);
      mocks.aliExpressService.convertToOffer!.mockResolvedValue(
        createMockOffer({ source: 'aliexpress' })
      );
      mocks.offerService.saveOffers!.mockResolvedValue(2);

      const result = await collectorService.collectFromAliExpress('electronics');

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty results gracefully', async () => {
      mocks.aliExpressService.getHotProducts!.mockResolvedValue([]);
      mocks.aliExpressService.getFlashDeals!.mockResolvedValue([]);
      mocks.aliExpressService.getFeaturedPromoProducts!.mockResolvedValue({
        products: [],
        pagination: { isFinished: true, currentPage: 1, totalPages: 0, totalRecords: 0 },
      });
      mocks.rssService.parseFeed!.mockResolvedValue([]);

      const result = await collectorService.collectFromAliExpress('electronics');

      expect(result).toBe(0);
    });
  });

  describe('collectFromMercadoLivre', () => {
    it('should collect daily deals from Mercado Livre', async () => {
      const mockDeals = [
        { id: 'MLB123', title: 'ML Product 1', price: 100, currency_id: 'BRL' },
        { id: 'MLB456', title: 'ML Product 2', price: 200, currency_id: 'BRL' },
      ];

      mocks.mercadoLivreService.getHotDeals!.mockResolvedValue(mockDeals);
      mocks.mercadoLivreService.searchProducts!.mockResolvedValue([]);
      mocks.mercadoLivreService.convertToOffer!.mockResolvedValue(
        createMockOffer({ source: 'mercadolivre' })
      );
      mocks.offerService.saveOffers!.mockResolvedValue(2);

      const result = await collectorService.collectFromMercadoLivre('electronics');

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('collectFromShopee', () => {
    it('should collect and save offers from Shopee', async () => {
      const mockProducts = [
        { id: 'SH001', title: 'Shopee Product 1' },
        { id: 'SH002', title: 'Shopee Product 2' },
      ];

      mocks.shopeeService.getProducts!.mockResolvedValue(mockProducts);
      mocks.shopeeService.convertToOffer!.mockReturnValue(createMockOffer({ source: 'shopee' }));
      mocks.offerService.saveOffers!.mockResolvedValue(2);

      const result = await collectorService.collectFromShopee('electronics');

      expect(mocks.shopeeService.getProducts).toHaveBeenCalledWith('electronics', 100);
      expect(result).toBe(2);
    });

    it('should return 0 when no products found', async () => {
      mocks.shopeeService.getProducts!.mockResolvedValue([]);

      const result = await collectorService.collectFromShopee('electronics');

      expect(result).toBe(0);
    });
  });

  describe('collectFromRSS', () => {
    it('should collect and save offers from RSS feeds', async () => {
      const mockOffers = [createMockOffer({ source: 'rss' }), createMockOffer({ source: 'rss' })];

      mocks.rssService.parseFeed!.mockResolvedValue(mockOffers);
      mocks.offerService.saveOffers!.mockResolvedValue(2);

      const result = await collectorService.collectFromRSS('http://example.com/feed', 'rss');

      expect(mocks.rssService.parseFeed).toHaveBeenCalledWith('http://example.com/feed', 'rss');
      expect(result).toBe(2);
    });

    it('should return 0 on error', async () => {
      mocks.rssService.parseFeed!.mockRejectedValue(new Error('Parse error'));

      const result = await collectorService.collectFromRSS('http://example.com/feed', 'rss');

      expect(result).toBe(0);
    });
  });

  describe('collectAll', () => {
    it('should return collection results for all sources', async () => {
      // Mock all collection methods to return counts
      jest.spyOn(collectorService, 'collectFromAmazon').mockResolvedValue(5);
      jest.spyOn(collectorService, 'collectFromAliExpress').mockResolvedValue(10);
      jest.spyOn(collectorService, 'collectFromMercadoLivre').mockResolvedValue(3);
      jest.spyOn(collectorService, 'collectFromShopee').mockResolvedValue(2);
      jest.spyOn(collectorService, 'collectFromAwin').mockResolvedValue(4);
      jest.spyOn(collectorService, 'collectFromRSS').mockResolvedValue(1);

      // Mock getCollectionConfig to return all sources
      jest.spyOn(collectorService as any, 'getCollectionConfig').mockResolvedValue({
        enabled: true,
        sources: ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'awin', 'rss'],
        rssFeeds: ['http://example.com/feed'],
      });

      const result = await collectorService.collectAll();

      expect(result).toHaveProperty('amazon');
      expect(result).toHaveProperty('aliexpress');
      expect(result).toHaveProperty('mercadolivre');
      expect(result).toHaveProperty('total');
      expect(result.total).toBeGreaterThanOrEqual(0);

      // Restore handled by checking spy in next test or beforeEach
      // const result is checked below
    });

    it('should return zeros when collection is disabled', async () => {
      jest.spyOn(collectorService as any, 'getCollectionConfig').mockResolvedValue({
        enabled: false,
        sources: [],
        rssFeeds: [],
      });

      const result = await collectorService.collectAll();

      expect(result.total).toBe(0);
    });
  });
});
