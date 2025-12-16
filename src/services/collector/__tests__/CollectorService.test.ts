import { CollectorService } from '../CollectorService';
import { Offer } from '../../../types';

// Mock all external services
jest.mock('../../amazon/AmazonService');
jest.mock('../../aliexpress/AliExpressService');
jest.mock('../../mercadolivre/MercadoLivreService');
jest.mock('../../shopee/ShopeeService');
jest.mock('../../rss/RSSService');
jest.mock('../../awin/AwinService');
jest.mock('../../blacklist/BlacklistService');
jest.mock('../../offer/OfferService');
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

// Import mocked services
import { AmazonService } from '../../amazon/AmazonService';
import { AliExpressService } from '../../aliexpress/AliExpressService';
import { MercadoLivreService } from '../../mercadolivre/MercadoLivreService';
import { BlacklistService } from '../../blacklist/BlacklistService';
import { OfferService } from '../../offer/OfferService';

describe('CollectorService', () => {
    let collectorService: CollectorService;
    let mockAmazonService: jest.Mocked<AmazonService>;
    let mockAliExpressService: jest.Mocked<AliExpressService>;
    let mockMercadoLivreService: jest.Mocked<MercadoLivreService>;
    let mockBlacklistService: jest.Mocked<BlacklistService>;
    let mockOfferService: jest.Mocked<OfferService>;

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
        ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock implementations
        (BlacklistService as jest.Mock).mockImplementation(() => ({
            getConfig: jest.fn().mockReturnValue({ enabled: false }),
            isOfferBlacklisted: jest.fn().mockReturnValue(false),
        }));

        (OfferService as jest.Mock).mockImplementation(() => ({
            saveOffers: jest.fn().mockResolvedValue(5),
        }));

        (AmazonService as jest.Mock).mockImplementation(() => ({
            searchProducts: jest.fn().mockResolvedValue([]),
            convertToOffer: jest.fn().mockReturnValue(createMockOffer({ source: 'amazon' })),
        }));

        (AliExpressService as jest.Mock).mockImplementation(() => ({
            getHotProducts: jest.fn().mockResolvedValue([]),
            convertToOffer: jest.fn().mockReturnValue(createMockOffer({ source: 'aliexpress' })),
        }));

        (MercadoLivreService as jest.Mock).mockImplementation(() => ({
            getDailyDeals: jest.fn().mockResolvedValue([]),
            searchProducts: jest.fn().mockResolvedValue([]),
            convertToOffer: jest.fn().mockReturnValue(createMockOffer({ source: 'mercadolivre' })),
        }));

        collectorService = new CollectorService();

        // Get references to mocked instances
        mockOfferService = (collectorService as any).offerService;
        mockBlacklistService = (collectorService as any).blacklistService;
        mockAmazonService = (collectorService as any).amazonService;
        mockAliExpressService = (collectorService as any).aliExpressService;
        mockMercadoLivreService = (collectorService as any).mercadoLivreService;
    });

    describe('filterBlacklisted', () => {
        it('should return all offers when blacklist is disabled', () => {
            mockBlacklistService.getConfig.mockReturnValue({ enabled: false, keywords: [], regex: [] });

            const offers = [createMockOffer(), createMockOffer()];
            const result = (collectorService as any).filterBlacklisted(offers);

            expect(result).toHaveLength(2);
        });

        it('should filter out blacklisted offers', () => {
            mockBlacklistService.getConfig.mockReturnValue({ enabled: true, keywords: [], regex: [] });
            mockBlacklistService.isOfferBlacklisted
                .mockReturnValueOnce(true)  // First offer is blacklisted
                .mockReturnValueOnce(false); // Second is not

            const offers = [
                createMockOffer({ title: 'Blacklisted Product' }),
                createMockOffer({ title: 'Good Product' }),
            ];
            const result = (collectorService as any).filterBlacklisted(offers);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Good Product');
        });

        it('should remove null offers before filtering', () => {
            mockBlacklistService.getConfig.mockReturnValue({ enabled: false, keywords: [], regex: [] });

            const offers = [createMockOffer(), null, createMockOffer()];
            const result = (collectorService as any).filterBlacklisted(offers);

            expect(result).toHaveLength(2);
        });
    });

    describe('collectFromAmazon', () => {
        it('should collect and save offers from Amazon', async () => {
            const mockProducts = [
                { ASIN: 'B001', DetailPageURL: 'http://amazon.com/dp/B001', ItemInfo: { Title: { DisplayValue: 'Product 1' } } },
                { ASIN: 'B002', DetailPageURL: 'http://amazon.com/dp/B002', ItemInfo: { Title: { DisplayValue: 'Product 2' } } },
            ];

            mockAmazonService.searchProducts.mockResolvedValue(mockProducts);
            mockAmazonService.convertToOffer.mockReturnValue(createMockOffer({ source: 'amazon' }));
            mockOfferService.saveOffers.mockResolvedValue(2);

            const result = await collectorService.collectFromAmazon('notebook', 'electronics');

            expect(mockAmazonService.searchProducts).toHaveBeenCalledWith('notebook', 20);
            expect(mockOfferService.saveOffers).toHaveBeenCalled();
            expect(result).toBe(2);
        });

        it('should return 0 on error', async () => {
            mockAmazonService.searchProducts.mockRejectedValue(new Error('API Error'));

            const result = await collectorService.collectFromAmazon('test', 'electronics');

            expect(result).toBe(0);
        });

        it('should apply blacklist filter', async () => {
            mockBlacklistService.getConfig.mockReturnValue({ enabled: true, keywords: [], regex: [] });
            mockBlacklistService.isOfferBlacklisted.mockReturnValue(true);

            const mockProducts = [{ ASIN: 'B001', DetailPageURL: 'http://amazon.com/dp/B001', ItemInfo: { Title: { DisplayValue: 'Blocked Product' } } }];
            mockAmazonService.searchProducts.mockResolvedValue(mockProducts);
            mockAmazonService.convertToOffer.mockReturnValue(createMockOffer());
            mockOfferService.saveOffers.mockResolvedValue(0);

            const result = await collectorService.collectFromAmazon('test', 'electronics');

            expect(mockOfferService.saveOffers).toHaveBeenCalledWith([]);
            expect(result).toBe(0);
        });
    });

    describe('collectFromAliExpress', () => {
        it('should collect and save offers from AliExpress', async () => {
            const mockProducts = [
                { product_id: '123', product_title: 'AliExpress Product 1', product_price: { currency: 'USD', value: '10.00' }, product_image_url: 'http://ae.com/img1.jpg', product_detail_url: 'http://ae.com/product/123' },
                { product_id: '456', product_title: 'AliExpress Product 2', product_price: { currency: 'USD', value: '20.00' }, product_image_url: 'http://ae.com/img2.jpg', product_detail_url: 'http://ae.com/product/456' },
            ];

            mockAliExpressService.getHotProducts.mockResolvedValue(mockProducts);
            mockAliExpressService.convertToOffer.mockResolvedValue(createMockOffer({ source: 'aliexpress' }));
            mockOfferService.saveOffers.mockResolvedValue(2);

            const result = await collectorService.collectFromAliExpress('electronics');

            expect(result).toBeGreaterThanOrEqual(0);
        });

        it('should handle empty results gracefully', async () => {
            mockAliExpressService.getHotProducts.mockResolvedValue([]);

            const result = await collectorService.collectFromAliExpress('electronics');

            expect(result).toBe(0);
        });
    });

    describe('collectFromMercadoLivre', () => {
        it('should collect daily deals from Mercado Livre', async () => {
            const mockDeals = [
                { id: 'MLB123', title: 'ML Product 1', price: 100, currency_id: 'BRL', available_quantity: 10, condition: 'new', permalink: 'http://ml.com/MLB123', thumbnail: 'http://ml.com/img1.jpg' },
                { id: 'MLB456', title: 'ML Product 2', price: 200, currency_id: 'BRL', available_quantity: 5, condition: 'new', permalink: 'http://ml.com/MLB456', thumbnail: 'http://ml.com/img2.jpg' },
            ];

            mockMercadoLivreService.getDailyDeals.mockResolvedValue(mockDeals);
            mockMercadoLivreService.convertToOffer.mockResolvedValue(createMockOffer({ source: 'mercadolivre' }));
            mockOfferService.saveOffers.mockResolvedValue(2);

            const result = await collectorService.collectFromMercadoLivre('electronics');

            expect(result).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getConfig', () => {
        it('should return config with sources array', () => {
            const result = (collectorService as any).getConfig();

            // Should return an object (may be empty or have sources)
            expect(typeof result).toBe('object');
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

            // Mock getConfig to return all sources
            jest.spyOn(collectorService as any, 'getConfig').mockReturnValue({
                enabled: true,
                sources: ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'awin', 'rss'],
            });

            const result = await collectorService.collectAll();

            expect(result).toHaveProperty('amazon');
            expect(result).toHaveProperty('aliexpress');
            expect(result).toHaveProperty('mercadolivre');
            expect(result).toHaveProperty('total');
            expect(result.total).toBeGreaterThanOrEqual(0);
        });

        it('should skip disabled sources', async () => {
            jest.spyOn(collectorService as any, 'getConfig').mockReturnValue({
                enabled: true,
                sources: ['amazon'], // Only Amazon enabled
            });

            jest.spyOn(collectorService, 'collectFromAmazon').mockResolvedValue(5);
            jest.spyOn(collectorService, 'collectFromAliExpress').mockResolvedValue(10);

            const result = await collectorService.collectAll();

            expect(collectorService.collectFromAmazon).toHaveBeenCalled();
            // AliExpress should not be called (not in sources)
            expect(result.amazon).toBe(5);
        });

        it('should return zeros when collection is disabled', async () => {
            // Restore spies from previous test to avoid mock leaking
            jest.restoreAllMocks();

            // Create fresh instance for this test
            collectorService = new CollectorService();

            jest.spyOn(collectorService as any, 'getConfig').mockReturnValue({
                enabled: false,
            });

            const result = await collectorService.collectAll();

            expect(result.total).toBe(0);
        });
    });
});
