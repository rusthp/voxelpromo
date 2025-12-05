import { AliExpressService } from '../AliExpressService';
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

// Mock ExchangeRateService
jest.mock('../../exchangerate/ExchangeRateService', () => ({
    ExchangeRateService: jest.fn().mockImplementation(() => ({
        getUSDtoBRLRate: jest.fn().mockResolvedValue(5.0),
    })),
}));

// Mock CategoryService
jest.mock('../../category/CategoryService', () => ({
    CategoryService: jest.fn().mockImplementation(() => ({
        detectCategory: jest.fn().mockReturnValue('electronics'),
    })),
}));

describe('AliExpressService Advanced Tests', () => {
    let service: AliExpressService;
    const mockedAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        service = new AliExpressService();
        jest.clearAllMocks();

        // Mock config via env vars
        process.env.ALIEXPRESS_APP_KEY = 'test-key';
        process.env.ALIEXPRESS_APP_SECRET = 'test-secret';
        process.env.ALIEXPRESS_TRACKING_ID = 'test-tracking';
    });

    describe('searchProducts', () => {
        it('should search products successfully with default parameters', async () => {
            const mockResponse = {
                data: {
                    aliexpress_affiliate_product_query_response: {
                        resp_result: {
                            result: {
                                products: {
                                    product: [
                                        {
                                            product_id: '123',
                                            product_title: 'Test Product',
                                            target_sale_price: '100.00',
                                            target_sale_price_currency: 'BRL',
                                            product_main_image_url: 'http://example.com/image.jpg',
                                            product_detail_url: 'http://example.com/product.html'
                                        }
                                    ]
                                }
                            },
                            resp_code: 200,
                            resp_msg: 'OK'
                        }
                    }
                }
            };

            mockedAxios.get.mockResolvedValue(mockResponse);

            const result = await service.searchProducts('test keyword');

            expect(result).toHaveLength(1);
            expect(result[0].product_id).toBe('123');
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);

            // Verify parameters
            const callArgs = mockedAxios.get.mock.calls[0][1];
            expect(callArgs?.params).toMatchObject({
                method: 'aliexpress.affiliate.product.query',
                app_key: 'test-key',
                keywords: 'test keyword'
            });
        });

        it('should handle empty results gracefully', async () => {
            const mockResponse = {
                data: {
                    aliexpress_affiliate_product_query_response: {
                        resp_result: {
                            result: {
                                products: []
                            },
                            resp_code: 200,
                            resp_msg: 'OK'
                        }
                    }
                }
            };

            mockedAxios.get.mockResolvedValue(mockResponse);

            const result = await service.searchProducts('nonexistent');

            expect(result).toHaveLength(0);
        });

        it('should fallback to alternative methods when primary fails', async () => {
            // First call fails
            mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

            // Second call (alternative method) succeeds
            const mockResponse = {
                data: {
                    aliexpress_affiliate_productsearch_query_response: {
                        products: {
                            product: [
                                {
                                    product_id: '456',
                                    product_title: 'Fallback Product'
                                }
                            ]
                        }
                    }
                }
            };
            mockedAxios.get.mockResolvedValue(mockResponse);

            const result = await service.searchProducts('test');

            // Should have tried multiple times
            expect(mockedAxios.get).toHaveBeenCalled();
            // Should return result from fallback
            expect(result).toHaveLength(1);
            expect(result[0].product_id).toBe('456');
        });
    });

    describe('getHotProducts', () => {
        it('should fetch hot products successfully', async () => {
            const mockResponse = {
                data: {
                    aliexpress_affiliate_hotproduct_query_response: {
                        resp_result: {
                            result: {
                                products: {
                                    product: [
                                        {
                                            product_id: '789',
                                            product_title: 'Hot Product',
                                            target_sale_price: '50.00'
                                        }
                                    ]
                                }
                            },
                            resp_code: 200
                        }
                    }
                }
            };

            mockedAxios.get.mockResolvedValue(mockResponse);

            const result = await service.getHotProducts({ keywords: 'hot' });

            expect(result).toHaveLength(1);
            expect(result[0].product_id).toBe('789');

            const callArgs = mockedAxios.get.mock.calls[0][1];
            expect(callArgs?.params).toMatchObject({
                method: 'aliexpress.affiliate.hotproduct.query',
                keywords: 'hot'
            });
        });

        it('should fallback to featured promo when hot products API is unavailable', async () => {
            // Simulate InvalidApiPath error
            const errorResponse = {
                response: {
                    data: {
                        error_response: {
                            code: 'InvalidApiPath',
                            msg: 'API not available'
                        }
                    }
                }
            };
            mockedAxios.get.mockRejectedValueOnce(errorResponse);

            // Mock featured promo response
            const featuredResponse = {
                data: {
                    aliexpress_affiliate_featuredpromo_products_get_response: {
                        resp_result: {
                            result: {
                                products: {
                                    product: [
                                        {
                                            product_id: '999',
                                            product_title: 'Featured Product'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            };
            mockedAxios.get.mockResolvedValue(featuredResponse);

            const result = await service.getHotProducts();

            expect(result).toHaveLength(1);
            expect(result[0].product_id).toBe('999');
        });
    });

    describe('getFlashDeals', () => {
        it('should fetch flash deals successfully', async () => {
            const mockResponse = {
                data: {
                    aliexpress_affiliate_flashdeal_query_response: {
                        aeop_ae_product_display_dto_list: {
                            aeop_ae_product_display_dto: [
                                {
                                    product_id: '101',
                                    product_title: 'Flash Deal'
                                }
                            ]
                        }
                    }
                }
            };

            mockedAxios.get.mockResolvedValue(mockResponse);

            const result = await service.getFlashDeals();

            expect(result).toHaveLength(1);
            expect(result[0].product_id).toBe('101');
        });
    });

    describe('getProductDetails', () => {
        it('should fetch product details successfully', async () => {
            const mockResponse = {
                data: {
                    aliexpress_affiliate_productdetail_get_response: {
                        resp_result: {
                            result: {
                                products: {
                                    product: [
                                        {
                                            product_id: '202',
                                            product_title: 'Detailed Product'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            };

            mockedAxios.get.mockResolvedValue(mockResponse);

            const result = await service.getProductDetails('202');

            expect(result).toHaveLength(1);
            expect(result[0].product_id).toBe('202');

            const callArgs = mockedAxios.get.mock.calls[0][1];
            expect(callArgs?.params).toMatchObject({
                method: 'aliexpress.affiliate.productdetail.get',
                product_ids: '202'
            });
        });
    });

    describe('smartMatchProducts', () => {
        it('should fetch smart match products successfully', async () => {
            const mockResponse = {
                data: {
                    aliexpress_affiliate_product_smartmatch_response: {
                        resp_result: {
                            result: {
                                products: {
                                    product: [
                                        {
                                            product_id: '303',
                                            product_title: 'Smart Match Product'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            };

            mockedAxios.get.mockResolvedValue(mockResponse);

            const result = await service.smartMatchProducts({ keywords: 'smart' });

            expect(result).toHaveLength(1);
            expect(result[0].product_id).toBe('303');
        });
    });

    describe('convertToOffer', () => {
        it('should convert product to offer correctly', async () => {
            const product = {
                product_id: '404',
                product_title: 'Offer Product',
                target_sale_price: '50.00',
                target_original_price: '100.00',
                target_sale_price_currency: 'BRL',
                product_main_image_url: 'http://example.com/img.jpg',
                product_detail_url: 'http://example.com/prod.html',
                discount: '50%'
            };

            // Mock generateAffiliateLink to return a link
            jest.spyOn(service, 'generateAffiliateLink').mockResolvedValue('http://affiliate.link');

            const offer = await service.convertToOffer(product);

            expect(offer).toBeDefined();
            expect(offer?.title).toBe('Offer Product');
            expect(offer?.currentPrice).toBe(50.00);
            expect(offer?.originalPrice).toBe(100.00);
            expect(offer?.discountPercentage).toBe(50);
            expect(offer?.affiliateUrl).toBe('http://affiliate.link');
        });

        it('should handle USD prices and convert to BRL', async () => {
            const product = {
                product_id: '505',
                product_title: 'USD Product',
                target_sale_price: '10.00', // USD
                target_original_price: '20.00', // USD
                target_sale_price_currency: 'USD',
                target_currency: 'USD'
            };

            // Mock exchange rate is 5.0 (from mock at top)
            jest.spyOn(service, 'generateAffiliateLink').mockResolvedValue('http://affiliate.link');

            const offer = await service.convertToOffer(product);

            expect(offer?.currentPrice).toBe(50.00); // 10 * 5.0
            expect(offer?.originalPrice).toBe(100.00); // 20 * 5.0
            expect(offer?.currency).toBe('BRL');
        });
    });
    describe('makeRequest', () => {
        it('should handle API errors correctly', async () => {
            const errorResponse = {
                response: {
                    data: {
                        error_response: {
                            code: '15',
                            msg: 'Remote service error'
                        }
                    },
                    status: 200
                }
            };
            mockedAxios.get.mockRejectedValue(errorResponse);

            await expect(service.searchProducts('test')).resolves.toEqual([]);
        });

        it('should handle network errors', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Network Error'));
            await expect(service.searchProducts('test')).resolves.toEqual([]);
        });
    });

    describe('convertToOffer complex scenarios', () => {
        it('should prioritize promotion_price over other prices', async () => {
            const product = {
                product_id: '606',
                product_title: 'Promo Product',
                promotion_price: '40.00',
                target_sale_price: '50.00',
                target_original_price: '100.00',
                target_currency: 'BRL'
            };
            jest.spyOn(service, 'generateAffiliateLink').mockResolvedValue('http://link');

            const offer = await service.convertToOffer(product);
            expect(offer?.currentPrice).toBe(40.00);
        });

        it('should extract coupons from multiple sources', async () => {
            const product = {
                product_id: '707',
                product_title: 'Coupon Product',
                target_sale_price: '100.00',
                target_original_price: '200.00',
                target_currency: 'BRL',
                coupon_code: 'CODE1',
                promo_code_info: { promo_code: 'CODE2' }
            };
            jest.spyOn(service, 'generateAffiliateLink').mockResolvedValue('http://link');
            jest.spyOn(service, 'getProductCoupons').mockResolvedValue([]);

            const offer = await service.convertToOffer(product);
            expect(offer).not.toBeNull();
            expect(offer?.coupons).toContain('CODE1');
            expect(offer?.coupons).toContain('CODE2');
        });
    });

    describe('getFeaturedPromoProducts', () => {
        it('should return pagination info', async () => {
            const mockResponse = {
                data: {
                    aliexpress_affiliate_featuredpromo_products_get_response: {
                        resp_result: {
                            result: {
                                current_page_no: 1,
                                total_page_no: 5,
                                total_record_count: 100,
                                products: {
                                    product: []
                                }
                            }
                        }
                    }
                }
            };
            mockedAxios.get.mockResolvedValue(mockResponse);

            const result = await service.getFeaturedPromoProducts();
            expect(result.pagination.currentPage).toBe(1);
            expect(result.pagination.totalPages).toBe(5);
            expect(result.pagination.totalRecords).toBe(100);
        });
    });
});
