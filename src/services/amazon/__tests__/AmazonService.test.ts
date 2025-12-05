import { AmazonService } from '../AmazonService';
import axios from 'axios';


// Mock dependencies
jest.mock('axios');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('AmazonService', () => {
    let service: AmazonService;
    const mockedAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        process.env.AMAZON_ACCESS_KEY = 'test-access-key';
        process.env.AMAZON_SECRET_KEY = 'test-secret-key';
        process.env.AMAZON_ASSOCIATE_TAG = 'test-tag';
        process.env.AMAZON_REGION = 'BR';

        service = new AmazonService();
        jest.clearAllMocks();
    });

    describe('searchProducts', () => {
        it('should search products successfully', async () => {
            const mockResponse = {
                data: {
                    SearchResult: {
                        Items: [
                            {
                                ASIN: '123',
                                ItemInfo: { Title: { DisplayValue: 'Test Product' } }
                            }
                        ]
                    }
                }
            };
            mockedAxios.post.mockResolvedValue(mockResponse);

            const result = await service.searchProducts('test');

            expect(result).toHaveLength(1);
            expect(result[0].ASIN).toBe('123');
            expect(mockedAxios.post).toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            const mockResponse = {
                data: {
                    Errors: [{ Code: 'Error', Message: 'API Error' }]
                }
            };
            mockedAxios.post.mockResolvedValue(mockResponse);

            await expect(service.searchProducts('test')).rejects.toThrow('Amazon API Error: API Error');
        });

        it('should include signed headers in request', async () => {
            const mockResponse = { data: { SearchResult: { Items: [] } } };
            mockedAxios.post.mockResolvedValue(mockResponse);

            await service.searchProducts('test');

            const callArgs = mockedAxios.post.mock.calls[0];
            const headers = callArgs[2]?.headers;

            expect(headers).toBeDefined();
            expect(headers?.['Authorization']).toMatch(/^AWS4-HMAC-SHA256 Credential=.*, SignedHeaders=.*, Signature=.*$/);
            expect(headers?.['X-Amz-Date']).toBeDefined();
            expect(headers?.['X-Amz-Target']).toBe('com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems');
        });
    });

    describe('getProductByASIN', () => {
        it('should get product by ASIN successfully', async () => {
            const mockResponse = {
                data: {
                    ItemsResult: {
                        Items: [
                            {
                                ASIN: '123',
                                ItemInfo: { Title: { DisplayValue: 'Test Product' } }
                            }
                        ]
                    }
                }
            };
            mockedAxios.post.mockResolvedValue(mockResponse);

            const result = await service.getProductByASIN('123');

            expect(result).toBeDefined();
            expect(result?.ASIN).toBe('123');
        });

        it('should return null if product not found', async () => {
            const mockResponse = {
                data: {
                    ItemsResult: {
                        Items: []
                    }
                }
            };
            mockedAxios.post.mockResolvedValue(mockResponse);

            const result = await service.getProductByASIN('123');

            expect(result).toBeNull();
        });
    });

    describe('convertToOffer', () => {
        it('should convert product to offer', () => {
            const product = {
                ASIN: '123',
                ItemInfo: { Title: { DisplayValue: 'Test Product' } },
                DetailPageURL: 'http://amazon.com/dp/123',
                Offers: {
                    Listings: [{
                        Price: { Amount: 50, Currency: 'BRL', DisplayAmount: 'R$ 50,00' },
                        SavingBasis: { Amount: 100, Currency: 'BRL', DisplayAmount: 'R$ 100,00' }
                    }]
                },
                Images: { Primary: { Large: { URL: 'http://image.jpg' } } }
            };

            const offer = service.convertToOffer(product as any);

            expect(offer).toBeDefined();
            expect(offer?.title).toBe('Test Product');
            expect(offer?.currentPrice).toBe(50);
            expect(offer?.originalPrice).toBe(100);
            expect(offer?.discountPercentage).toBe(50);
        });

        it('should return null if discount is less than 5%', () => {
            const product = {
                ASIN: '123',
                ItemInfo: { Title: { DisplayValue: 'Test Product' } },
                DetailPageURL: 'http://amazon.com/dp/123',
                Offers: {
                    Listings: [{
                        Price: { Amount: 99, Currency: 'BRL', DisplayAmount: 'R$ 99,00' },
                        SavingBasis: { Amount: 100, Currency: 'BRL', DisplayAmount: 'R$ 100,00' }
                    }]
                }
            };

            const offer = service.convertToOffer(product as any);

            expect(offer).toBeNull();
        });
    });
});
