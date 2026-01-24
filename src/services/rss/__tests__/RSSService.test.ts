import { RSSService } from '../RSSService';
import Parser from 'rss-parser';

// Mock dependencies
jest.mock('rss-parser');
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('RSSService', () => {
  let service: RSSService;
  const mockedParser = Parser as jest.MockedClass<typeof Parser>;
  const mockParseURL = jest.fn();

  beforeEach(() => {
    // Mock Parser constructor to return an object with parseURL method
    mockedParser.mockImplementation(
      () =>
        ({
          parseURL: mockParseURL,
        }) as any
    );

    service = new RSSService();
    jest.clearAllMocks();
  });

  describe('parseFeed', () => {
    it('should parse feed successfully', async () => {
      mockParseURL.mockResolvedValue({
        items: [
          {
            title: 'Product 1 - R$ 100,00 de R$ 200,00',
            contentSnippet: 'Description',
            link: 'http://link.com',
            categories: ['electronics'],
          },
        ],
      });

      const result = await service.parseFeed('http://feed.com');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Product 1 - R$ 100,00 de R$ 200,00');
      expect(result[0].currentPrice).toBe(100);
    });

    it('should handle empty feed', async () => {
      mockParseURL.mockResolvedValue({ items: [] });

      const result = await service.parseFeed('http://feed.com');

      expect(result).toHaveLength(0);
    });

    it('should handle parser errors', async () => {
      mockParseURL.mockRejectedValue(new Error('Parser Error'));

      const result = await service.parseFeed('http://feed.com');

      expect(result).toHaveLength(0);
    });
  });

  describe('parseItem', () => {
    it('should extract price from title', async () => {
      mockParseURL.mockResolvedValue({
        items: [
          {
            title: 'Product - R$ 50,00 de R$ 100,00',
            contentSnippet: 'Description',
            link: 'http://link.com',
          },
        ],
      });

      const result = await service.parseFeed('http://feed.com');

      expect(result[0].currentPrice).toBe(50);
    });

    it('should extract original price and calculate discount', async () => {
      mockParseURL.mockResolvedValue({
        items: [
          {
            title: 'Product - R$ 50,00 de R$ 100,00',
            contentSnippet: 'Description',
            link: 'http://link.com',
          },
        ],
      });

      const result = await service.parseFeed('http://feed.com');

      expect(result[0].currentPrice).toBe(50);
      expect(result[0].originalPrice).toBe(100);
      expect(result[0].discountPercentage).toBe(50);
    });

    it('should skip items without price', async () => {
      mockParseURL.mockResolvedValue({
        items: [
          {
            title: 'Product without price',
            contentSnippet: 'Description',
            link: 'http://link.com',
          },
        ],
      });

      const result = await service.parseFeed('http://feed.com');

      expect(result).toHaveLength(0);
    });
  });

  describe('parseMultipleFeeds', () => {
    it('should parse multiple feeds', async () => {
      mockParseURL
        .mockResolvedValueOnce({
          items: [{ title: 'P1 - R$ 10 de R$ 20', link: 'l1' }],
        })
        .mockResolvedValueOnce({
          items: [{ title: 'P2 - R$ 20 de R$ 40', link: 'l2' }],
        });

      const feeds = [
        { url: 'f1', source: 'custom' as const, category: 'cat1' },
        { url: 'f2', source: 'custom' as const, category: 'cat2' },
      ];

      const result = await service.parseMultipleFeeds(feeds);

      expect(result).toHaveLength(2);
    });
  });
});
