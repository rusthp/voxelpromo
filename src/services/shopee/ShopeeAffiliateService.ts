
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { cache } from '../../utils/cache';


interface ShopeeConfig {
    appId: string;
    appSecret: string;
    endpoint?: string;
}

interface ShopeeGraphQLError {
    message: string;
    code?: number;
}

export interface ShopeeApiProduct {
    itemId: string;
    productName: string;
    imageUrl: string;
    priceMin: number | string;       // Price in R$ (may be string or number)
    priceMax: number | string;       // Price in R$ (may be string or number)
    priceDiscountRate: number | string; // Discount percentage (may be string like "50")
    commissionRate: string;          // String ratio e.g. "0.0850" = 8.5%
    sellerCommissionRate: string;    // String ratio e.g. "0.10" = 10%
    shopeeCommissionRate: string;    // String ratio e.g. "0.03" = 3%
    commission: number | string;     // Estimated commission in R$
    sales: number;
    ratingStar: number;
    productLink: string;
    offerLink: string;
    shopId: string;
    shopName?: string;
    shopType?: string | number;
    periodStartTime?: number;
    periodEndTime?: number;
}

export class ShopeeAffiliateService {
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly endpoint: string;
    private readonly client: AxiosInstance;

    constructor(config?: ShopeeConfig) {
        this.appId = config?.appId || process.env.SHOPEE_APP_ID || '';
        this.appSecret = config?.appSecret || process.env.SHOPEE_APP_SECRET || '';
        this.endpoint = config?.endpoint || 'https://open-api.affiliate.shopee.com.br/graphql';

        if (!this.appId || !this.appSecret) {
            logger.warn('⚠️ Shopee API Credentials missing (SHOPEE_APP_ID or SHOPEE_APP_SECRET)');
        }

        this.client = axios.create({
            baseURL: this.endpoint,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Generates the SHA256 signature for authentication
     * Signature = SHA256(AppId + Timestamp + Payload + Secret)
     */
    public generateSignature(payload: string, timestamp: number): string {
        const data = `${this.appId}${timestamp}${payload}${this.appSecret}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Builds the Authorization header
     * Format: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={signature}
     */
    private buildAuthHeader(payload: string, timestamp: number): string {
        const signature = this.generateSignature(payload, timestamp);
        return `SHA256 Credential=${this.appId}, Timestamp=${timestamp}, Signature=${signature}`;
    }

    /**
     * Fetches brand offers using GraphQL (Cached: 30 mins)
     */
    async getBrandOffers(limit: number = 20, options?: { keyword?: string; listType?: number; sortType?: number; page?: number; scrollId?: string }): Promise<{ products: ShopeeApiProduct[], nextScrollId?: string }> {
        if (!this.appId || !this.appSecret) {
            throw new Error('Shopee API credentials not configured');
        }

        // Check Cache
        const cacheKey = `shopee:offers:${limit}:${options?.scrollId || options?.page || 'first'}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            logger.debug(`🚀 Shopee API: Returning cached offers for ${options?.scrollId || 'first page'}`);
            return cached;
        }

        const query = `
      query GetBrandOffers($limit: Int, $keyword: String, $listType: Int, $sortType: Int, $page: Int) {
        productOfferV2(limit: $limit, keyword: $keyword, listType: $listType, sortType: $sortType, page: $page) {
          nodes {
            itemId
            productName
            imageUrl
            priceMin
            priceMax
            priceDiscountRate
            commissionRate
            sellerCommissionRate
            shopeeCommissionRate
            commission
            sales
            ratingStar
            productLink
            offerLink
            shopId
            shopName
            shopType
            periodStartTime
            periodEndTime
          }
          pageInfo {
            page
            limit
            hasNextPage
          }
        }
      }
    `;

        const variables = {
            limit,
            keyword: options?.keyword,
            listType: options?.listType ?? 0,
            sortType: options?.sortType ?? 1,
            page: options?.page ?? 1,
        };
        const payload = JSON.stringify({ query, variables });
        const timestamp = Math.floor(Date.now() / 1000);

        try {
            const response = await this.client.post('', payload, {
                headers: {
                    'Authorization': this.buildAuthHeader(payload, timestamp),
                },
            });

            if (response.data.errors) {
                const errors = response.data.errors as ShopeeGraphQLError[];
                logger.error(`❌ Shopee GraphQL Error: ${errors.map((e) => e.message).join(', ')}`);
                throw new Error(errors[0].message);
            }

            const data = response.data.data.productOfferV2;
            const result = {
                products: data.nodes || [],
                nextScrollId: data.pageInfo?.hasNextPage ? data.pageInfo.scrollId : undefined,
            };

            // Save to Cache (30 mins)
            cache.set(cacheKey, result, 30 * 60 * 1000);

            return result;

        } catch (error: any) {
            logger.error(`❌ Error fetching Shopee offers: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generates a short link for a product (Cached: 24 hours)
     */
    async generateShortLink(productUrl: string, subIds?: string[]): Promise<string> {
        if (!this.appId || !this.appSecret) {
            // Fallback logic could go here if needed, but optimally we need credentials
            logger.warn('⚠️ Cannot generate short link: Missing credentials');
            return productUrl;
        }

        // Check Cache (24h)
        const cacheKey = `shopee:link:${productUrl}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const query = `
      mutation GenerateShortLink($input: ShortLinkInput!) {
        generateShortLink(input: $input) {
          shortLink
        }
      }
    `;

        const variables = {
            input: {
                originUrl: productUrl,
                ...(subIds && subIds.length > 0 ? { subIds } : {}),
            },
        };
        const payload = JSON.stringify({ query, variables });
        const timestamp = Math.floor(Date.now() / 1000);

        try {
            const response = await this.client.post('', payload, {
                headers: {
                    'Authorization': this.buildAuthHeader(payload, timestamp),
                },
            });

            if (response.data.errors) {
                const errors = response.data.errors as ShopeeGraphQLError[];
                logger.error(`❌ Shopee ShortLink Error: ${errors.map((e) => e.message).join(', ')}`);
                throw new Error(errors[0].message);
            }

            const shortLink = response.data.data.generateShortLink.shortLink;

            // Save to Cache (24 hours)
            cache.set(cacheKey, shortLink, 24 * 60 * 60 * 1000);

            return shortLink;
        } catch (error: any) {
            logger.error(`❌ Error generating short link: ${error.message}`);
            return productUrl; // Fail safe return original URL
        }
    }
}
