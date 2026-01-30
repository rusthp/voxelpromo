
import { ShopeeAffiliateService } from '../ShopeeAffiliateService';
import axios from 'axios';
import crypto from 'crypto';

jest.mock('axios');

describe('ShopeeAffiliateService', () => {
    let service: ShopeeAffiliateService;
    const mockAppId = 'test_app_id';
    const mockAppSecret = 'test_app_secret';

    beforeEach(() => {
        service = new ShopeeAffiliateService({
            appId: mockAppId,
            appSecret: mockAppSecret,
        });
        jest.clearAllMocks();
    });

    describe('Authentication', () => {
        it('should generate correct SHA256 signature', () => {
            const payload = JSON.stringify({ query: 'test' });
            const timestamp = 1234567890;

            const expectedData = `${mockAppId}${timestamp}${payload}${mockAppSecret}`;
            const expectedSignature = crypto.createHash('sha256').update(expectedData).digest('hex');

            const signature = service.generateSignature(payload, timestamp);
            expect(signature).toBe(expectedSignature);
        });

        it('should build correct Authorization header', () => {
            const payload = JSON.stringify({ query: 'test' });
            const timestamp = 1234567890;

            // We accept access to the private method for testing purposes by casting to any
            const header = (service as any).buildAuthHeader(payload, timestamp);

            expect(header).toContain(`SHA256 Credential=${mockAppId}`);
            expect(header).toContain(`Timestamp=${timestamp}`);
            expect(header).toContain('Signature=');
        });
    });

    describe('API Methods', () => {
        it('getBrandOffers should handle success', async () => {
            const mockData = {
                data: {
                    data: {
                        productOfferV2: {
                            nodes: [{ itemId: '1' }],
                            pageInfo: { scrollId: 'abc', hasNextPage: true }
                        }
                    }
                }
            };
            (axios.create as jest.Mock).mockReturnValue({
                post: jest.fn().mockResolvedValue(mockData)
            });

            // Re-init service to pick up mocked axios
            service = new ShopeeAffiliateService({ appId: mockAppId, appSecret: mockAppSecret });

            const result = await service.getBrandOffers();
            expect(result.products).toHaveLength(1);
            expect(result.nextScrollId).toBe('abc');
        });

        it('generateShortLink should handle success', async () => {
            const mockData = {
                data: {
                    data: {
                        generateShortLink: {
                            shortLink: 'https://shope.ee/short'
                        }
                    }
                }
            };
            (axios.create as jest.Mock).mockReturnValue({
                post: jest.fn().mockResolvedValue(mockData)
            });

            service = new ShopeeAffiliateService({ appId: mockAppId, appSecret: mockAppSecret });

            const link = await service.generateShortLink('https://shopee.com.br/product');
            expect(link).toBe('https://shope.ee/short');
        });
    });
});
