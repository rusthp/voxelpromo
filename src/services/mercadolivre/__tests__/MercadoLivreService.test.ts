import { MercadoLivreService } from '../MercadoLivreService';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('fs');
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Scraper with Singleton Pattern
const mockScraperInstance = {
  generateAffiliateLink: jest.fn().mockResolvedValue('http://affiliate.link'),
  scrapeSearchResults: jest.fn().mockResolvedValue([]),
  getHeaders: jest.fn().mockResolvedValue({}),
  scrapeDailyDeals: jest.fn().mockResolvedValue([]),
};
jest.mock('../MercadoLivreScraper', () => ({
  MercadoLivreScraper: {
    getInstance: jest.fn(() => mockScraperInstance),
  },
}));

// Mock UrlShortenerService
const mockCreateShortLink = jest
  .fn()
  .mockResolvedValue({ shortUrl: 'http://voxelpromo.com/s/xyz', code: 'xyz' });
jest.mock('../../link/UrlShortenerService', () => ({
  UrlShortenerService: jest.fn().mockImplementation(() => ({
    createShortLink: mockCreateShortLink,
  })),
}));

describe('MercadoLivreService', () => {
  let service: MercadoLivreService;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    process.env.MERCADOLIVRE_CLIENT_ID = 'test-client-id';
    process.env.MERCADOLIVRE_CLIENT_SECRET = 'test-client-secret';
    process.env.MERCADOLIVRE_REDIRECT_URI = 'http://localhost/callback';

    service = new MercadoLivreService();
    jest.clearAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate valid authorization URL', () => {
      const { url } = service.getAuthorizationUrl('state123');
      expect(url).toContain('https://auth.mercadolivre.com.br/authorization');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=state123');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for token successfully', async () => {
      const mockResponse = {
        data: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          user_id: 123,
          scope: 'offline_access',
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.exchangeCodeForToken('code123');

      expect(result.access_token).toBe('access-token');
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  describe('searchProducts', () => {
    it('should search products via API successfully', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 'MLB123',
              title: 'Test Product',
              price: 100,
              permalink: 'http://ml.com/product',
              thumbnail: 'http://ml.com/img.jpg',
            },
          ],
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.searchProducts('test');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('MLB123');
    });

    it('should fallback to scraping when API fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      // Update the mock instance for fallback scraping
      mockScraperInstance.scrapeSearchResults = jest.fn().mockResolvedValue([
        {
          id: 'MLB456',
          title: 'Scraped Product',
          price: 200,
          permalink: 'http://ml.com/scraped',
          thumbnail: 'http://ml.com/img.jpg',
        },
      ]);
      mockScraperInstance.getHeaders = jest.fn().mockRejectedValue(new Error('Header Error'));

      const result = await service.searchProducts('test');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('MLB456');
    });
  });

  describe('getTrendingProducts', () => {
    it('should fetch trending products', async () => {
      // Mock ensureValidToken
      jest.spyOn(service as any, 'ensureValidToken').mockResolvedValue('token');

      // Mock trends API response
      mockedAxios.get.mockResolvedValueOnce({ data: [{ keyword: 'trend1' }] });

      // Mock searchProducts
      jest.spyOn(service, 'searchProducts').mockResolvedValue([
        {
          id: 'MLB1',
          title: 'Trend Product',
          price: 100,
          permalink: 'url',
          thumbnail: 'img',
        } as any,
      ]);

      const result = await service.getTrendingProducts(1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('MLB1');
    });
  });

  describe('convertToOffer', () => {
    it('should convert product to offer', async () => {
      const product = {
        id: 'MLB123',
        title: 'Test Product',
        price: 100,
        currency_id: 'BRL',
        available_quantity: 1,
        condition: 'new',
        permalink: 'http://ml.com/product',
        thumbnail: 'http://ml.com/img.jpg',
      };

      const offer = await service.convertToOffer(product as any);

      expect(offer).toBeDefined();
      expect(offer?.title).toBe('Test Product');
      expect(offer?.currentPrice).toBe(100);
      expect(offer?.affiliateUrl).toBeDefined();
    });

    it('should fallback to UrlShortenerService for long links', async () => {
      const product = {
        id: 'MLBLONG',
        title: 'Product with Long Link',
        price: 150,
        // Simulate a VERY long permalink
        permalink:
          'https://www.mercadolivre.com.br/p/MLB12345/product-name-is-very-very-long-and-needs-shortening-because-it-does-not-look-good-in-messages-and-takes-up-too-much-space?tracking_id=very-long-tracking-id-that-makes-it-even-longer',
      };

      // Force internal generator to return null/undefined to trigger fallback/buildAffiliateLink
      jest.spyOn(service as any, 'generateAffiliateLink').mockResolvedValue(null);

      // Allow buildAffiliateLink to run (it creates a long link)

      const offer = await service.convertToOffer(product as any);

      expect(offer?.affiliateUrl).toBe('http://voxelpromo.com/s/xyz');
      expect(mockCreateShortLink).toHaveBeenCalled();
    });

    it('should NOT shorten native short links (/sec/)', async () => {
      const product = {
        id: 'MLBSEC',
        title: 'Sec Link Product',
        price: 200,
        permalink: 'https://mercadolivre.com/sec/short',
      };

      // Mock generator to return a /sec/ link
      jest
        .spyOn(service as any, 'generateAffiliateLink')
        .mockResolvedValue('https://mercadolivre.com/sec/short');

      const offer = await service.convertToOffer(product as any);

      expect(offer?.affiliateUrl).toBe('https://mercadolivre.com/sec/short');
      // Mock shouldn't be called for /sec/ links (reset mock count before this test ideally, but assuming flow)
    });
  });

  describe('getProductDetails', () => {
    it('should get product details', async () => {
      mockedAxios.get.mockResolvedValue({ data: { id: 'MLB1', title: 'Detail' } });
      const result = await service.getProductDetails('MLB1');
      expect(result?.id).toBe('MLB1');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token', async () => {
      process.env.MERCADOLIVRE_REFRESH_TOKEN = 'refresh';
      mockedAxios.post.mockResolvedValue({
        data: { access_token: 'new', refresh_token: 'new_refresh', expires_in: 3600 },
      });

      const result = await service.refreshAccessToken();
      expect(result.access_token).toBe('new');
    });
  });
});
