/**
 * ShopeeAffiliateService - GraphQL API Integration
 *
 * Integrates with Shopee Affiliate Open API using GraphQL.
 * API Docs: https://open-api.affiliate.shopee.com.br/
 *
 * Features:
 * - SHA256 authentication
 * - getBrandOffers with scrollId pagination
 * - generateShortLink (lazy, on-demand)
 * - Rate limiting awareness (2000 req/hour)
 * - Response caching
 */

import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { Offer } from '../../types';
import { CategoryService } from '../category/CategoryService';

// ============================================
// Types
// ============================================

export interface ShopeeApiConfig {
    appId: string;
    appSecret: string;
    enabled: boolean;
}

export interface ShopeeApiProduct {
    offerName: string;
    commissionRate: number;
    productUrl?: string;
    imageUrl?: string;
    price?: number;
    originalPrice?: number;
    discountPercentage?: number;
    category?: string;
    brand?: string;
    rating?: number;
    shopName?: string;
}

export interface BrandOfferOptions {
    limit?: number; // Max 500 per page
    scrollId?: string; // For pagination (valid 30 seconds)
}

export interface ShortLinkOptions {
    subId?: string; // Custom tracking sub-ID
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// ============================================
// Constants
// ============================================

const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';
const MAX_RESULTS_PER_PAGE = 500;
const CACHE_TTL_OFFERS = 30 * 60 * 1000; // 30 minutes
const CACHE_TTL_SHORT_LINKS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================
// Rate Limiter
// ============================================

class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private readonly capacity: number;
    private readonly refillRate: number; // Tokens per ms

    constructor(limitPerHour: number) {
        this.capacity = limitPerHour;
        this.tokens = limitPerHour;
        this.lastRefill = Date.now();
        this.refillRate = limitPerHour / (60 * 60 * 1000);
    }

    tryConsume(cost: number = 1): boolean {
        this.refill();
        if (this.tokens >= cost) {
            this.tokens -= cost;
            return true;
        }
        return false;
    }

    getRemaining(): number {
        this.refill();
        return Math.floor(this.tokens);
    }

    private refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const newTokens = elapsed * this.refillRate;

        if (newTokens > 0) {
            this.tokens = Math.min(this.capacity, this.tokens + newTokens);
            this.lastRefill = now;
        }
    }
}

// ============================================
// Service
// ============================================

export class ShopeeAffiliateService {
    private static instances = new Map<string, ShopeeAffiliateService>();

    private categoryService: CategoryService;
    private config: ShopeeApiConfig;
    private rateLimiter: RateLimiter | null = null;

    // Cache (per-instance, not shared)
    private offersCache: CacheEntry<ShopeeApiProduct[]> | null = null;
    private shortLinkCache = new Map<string, CacheEntry<string>>();

    /**
     * Create service instance with explicit credentials
     * For multi-tenant: each user has their own credentials
     */
    constructor(config: ShopeeApiConfig, rateLimitPerHour: number = 2000) {
        this.config = config;
        this.categoryService = new CategoryService();
        if (config.enabled && rateLimitPerHour > 0) {
            this.rateLimiter = new RateLimiter(rateLimitPerHour);
        }
    }

    // ============================================
    // Factory Methods (Multi-Tenant)
    // ============================================

    /**
     * Create service instance for a specific user
     * Loads credentials from UserSettings and Plan from User
     * Uses persistent instances to maintain cache and rate limits
     */
    static async forUser(userId: string): Promise<ShopeeAffiliateService | null> {
        try {
            // Check for existing instance
            if (this.instances.has(userId)) {
                return this.instances.get(userId)!;
            }

            const { UserSettingsModel } = await import('../../models/UserSettings');
            const { UserModel } = await import('../../models/User');

            const [settings, user] = await Promise.all([
                UserSettingsModel.findOne({ userId }),
                UserModel.findById(userId)
            ]);

            if (!settings?.shopee?.appId || !settings?.shopee?.appSecret) {
                logger.debug('Shopee API not configured for user', { userId });
                return null;
            }

            // Determine rate limit based on plan
            let limit = 0; // Free plan default
            const planTier = user?.plan?.tier || 'free';
            const isSubActive = user?.subscription?.status === 'active';

            if (isSubActive) {
                if (planTier === 'pro') limit = 500;
                else if (planTier === 'agency') limit = 1500;
            }

            // Create new instance
            const instance = new ShopeeAffiliateService({
                appId: settings.shopee.appId,
                appSecret: settings.shopee.appSecret,
                enabled: settings.shopee.apiEnabled !== false && limit > 0,
            }, limit);

            // Store in map
            this.instances.set(userId, instance);

            return instance;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to create ShopeeAffiliateService for user', { userId, error: message });
            return null;
        }
    }

    /**
     * Create service with credentials from environment (fallback/testing)
     * @deprecated Use forUser() for production
     */
    static fromEnv(): ShopeeAffiliateService {
        return new ShopeeAffiliateService({
            appId: process.env.SHOPEE_APP_ID || '',
            appSecret: process.env.SHOPEE_APP_SECRET || '',
            enabled: process.env.SHOPEE_API_ENABLED !== 'false',
        });
    }

    // ============================================
    // Configuration
    // ============================================

    /**
     * Get current configuration
     */
    getConfig(): ShopeeApiConfig {
        return this.config;
    }

    /**
     * Check if API is configured and enabled
     */
    isConfigured(): boolean {
        return !!this.config.appId && !!this.config.appSecret && this.config.enabled;
    }

    // ============================================
    // Authentication
    // ============================================

    /**
     * Generate SHA256 signature for Shopee API
     * Format: SHA256(AppId + Timestamp + Payload + Secret)
     */
    generateSignature(appId: string, timestamp: number, payload: string, secret: string): string {
        const signatureBase = `${appId}${timestamp}${payload}${secret}`;
        return crypto.createHash('sha256').update(signatureBase, 'utf8').digest('hex');
    }

    /**
     * Build Authorization header
     * Format: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={signature}
     */
    buildAuthHeader(payload: string): string {
        const config = this.getConfig();
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = this.generateSignature(config.appId, timestamp, payload, config.appSecret);

        return `SHA256 Credential=${config.appId}, Timestamp=${timestamp}, Signature=${signature}`;
    }

    // ============================================
    // API Methods
    // ============================================

    /**
     * Make GraphQL request to Shopee API
     */
    private async makeRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
        if (!this.isConfigured()) {
            throw new Error('Shopee API not configured or disabled.');
        }

        if (this.rateLimiter && !this.rateLimiter.tryConsume(1)) {
            logger.warn('⚠️ Shopee Internal Rate Limit Exceeded', {
                remaining: this.rateLimiter.getRemaining()
            });
            throw new Error('Internal Rate Limit Exceeded. Upgrade your plan for more.');
        }

        const payload = JSON.stringify({
            query,
            ...(variables && { variables }),
        });

        const authHeader = this.buildAuthHeader(payload);

        logger.debug('🔑 Shopee API: Sending request', {
            queryPreview: query.substring(0, 100) + '...',
        });

        try {
            const response = await axios.post(ENDPOINT, payload, {
                headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            });

            // Check for GraphQL errors
            if (response.data.errors && response.data.errors.length > 0) {
                const error = response.data.errors[0];
                const errorCode = error.extensions?.code || 'UNKNOWN';
                const errorMessage = error.extensions?.message || error.message || 'Unknown error';

                logger.error('❌ Shopee API GraphQL Error', {
                    code: errorCode,
                    message: errorMessage,
                    path: error.path,
                });

                throw new Error(`Shopee API Error [${errorCode}]: ${errorMessage}`);
            }

            return response.data.data;
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                logger.error('❌ Shopee API HTTP Error', {
                    status: error.response?.status,
                    message: error.message,
                });
            }
            throw error;
        }
    }

    /**
     * Get brand offers from Shopee API
     * Uses scrollId for pagination (valid for 30 seconds)
     */
    async getBrandOffers(options: BrandOfferOptions = {}): Promise<{
        products: ShopeeApiProduct[];
        scrollId?: string;
        hasMore: boolean;
    }> {
        const { limit = MAX_RESULTS_PER_PAGE, scrollId } = options;

        // Check cache (only for first page without scrollId)
        if (!scrollId && this.offersCache) {
            const age = Date.now() - this.offersCache.timestamp;
            if (age < CACHE_TTL_OFFERS) {
                logger.info('💾 Shopee API: Using cached offers', {
                    count: this.offersCache.data.length,
                    cacheAge: `${Math.round(age / 1000 / 60)}min`,
                });
                return {
                    products: this.offersCache.data,
                    hasMore: false,
                };
            }
        }

        // Build GraphQL query
        const scrollIdArg = scrollId ? `, scrollId: "${scrollId}"` : '';
        const query = `{
      brandOffer(limit: ${limit}${scrollIdArg}) {
        nodes {
          offerName
          commissionRate
        }
        scrollId
      }
    }`;

        logger.info('📡 Shopee API: Fetching brand offers', {
            limit,
            hasScrollId: !!scrollId,
            source: 'api',
        });

        const response = await this.makeRequest<{
            brandOffer: {
                nodes: ShopeeApiProduct[];
                scrollId?: string;
            };
        }>(query);

        const products = response.brandOffer?.nodes || [];
        const newScrollId = response.brandOffer?.scrollId;
        const hasMore = !!newScrollId && products.length >= limit;

        logger.info('✅ Shopee API: Fetched brand offers', {
            count: products.length,
            hasMore,
            source: 'api',
        });

        // Cache first page results
        if (!scrollId && products.length > 0) {
            this.offersCache = {
                data: products,
                timestamp: Date.now(),
            };
        }

        return {
            products,
            scrollId: newScrollId,
            hasMore,
        };
    }

    /**
     * Get all brand offers (handles pagination automatically)
     * WARNING: Uses scrollId with 30s TTL - must be fast!
     */
    async getAllBrandOffers(maxProducts: number = 1000): Promise<ShopeeApiProduct[]> {
        const allProducts: ShopeeApiProduct[] = [];
        let scrollId: string | undefined;
        let hasMore = true;

        logger.info('📡 Shopee API: Starting full collection', { maxProducts, source: 'api' });
        const startTime = Date.now();

        while (hasMore && allProducts.length < maxProducts) {
            try {
                const result = await this.getBrandOffers({
                    limit: MAX_RESULTS_PER_PAGE,
                    scrollId,
                });

                allProducts.push(...result.products);
                scrollId = result.scrollId;
                hasMore = result.hasMore;

                // Short delay to avoid rate limiting (but stay under 30s scrollId TTL)
                if (hasMore) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            } catch (error: any) {
                logger.error('❌ Shopee API pagination error', { error: error.message });
                break;
            }
        }

        const duration = Date.now() - startTime;
        logger.info('✅ Shopee API: Collection complete', {
            total: allProducts.length,
            duration: `${duration}ms`,
            source: 'api',
        });

        return allProducts.slice(0, maxProducts);
    }

    /**
     * Generate short link for product URL (lazy, on-demand)
     * Called only when posting, not during collection
     */
    async generateShortLink(productUrl: string, options: ShortLinkOptions = {}): Promise<string> {
        // Check cache
        const cached = this.shortLinkCache.get(productUrl);
        if (cached) {
            const age = Date.now() - cached.timestamp;
            if (age < CACHE_TTL_SHORT_LINKS) {
                logger.debug('💾 Shopee API: Using cached short link');
                return cached.data;
            }
        }

        const subIdArg = options.subId ? `, subId: "${options.subId}"` : '';
        const query = `{
      generateShortLink(url: "${productUrl}"${subIdArg}) {
        shortLink
      }
    }`;

        logger.info('🔗 Shopee API: Generating short link');

        try {
            const response = await this.makeRequest<{
                generateShortLink: {
                    shortLink: string;
                };
            }>(query);

            const shortLink = response.generateShortLink?.shortLink || productUrl;

            // Cache result
            this.shortLinkCache.set(productUrl, {
                data: shortLink,
                timestamp: Date.now(),
            });

            return shortLink;
        } catch (error: any) {
            logger.warn('⚠️ Shopee API: Short link generation failed, using original URL', {
                error: error.message,
            });
            return productUrl;
        }
    }

    // ============================================
    // Conversion
    // ============================================

    /**
     * Convert Shopee API product to Offer format
     */
    convertToOffer(product: ShopeeApiProduct, category: string = 'electronics'): Offer | null {
        try {
            const currentPrice = product.price || 0;
            const originalPrice = product.originalPrice || currentPrice;
            const discount = originalPrice - currentPrice;
            const discountPercentage =
                product.discountPercentage || (originalPrice > 0 ? (discount / originalPrice) * 100 : 0);

            // Filter by minimum discount (3%)
            if (discountPercentage < 3 && discountPercentage > 0) {
                return null;
            }

            const detectedCategory = this.categoryService.detectCategory(
                product.offerName || '',
                '',
                category
            );

            const now = new Date();
            return {
                title: product.offerName || 'Oferta Shopee',
                description: product.offerName || '',
                originalPrice: Math.round(originalPrice * 100) / 100,
                currentPrice: Math.round(currentPrice * 100) / 100,
                discount: Math.round(discount * 100) / 100,
                discountPercentage: Math.round(discountPercentage * 100) / 100,
                currency: 'BRL',
                imageUrl: product.imageUrl || '',
                productUrl: product.productUrl || '',
                affiliateUrl: product.productUrl || '', // Will be replaced on post with short link
                source: 'shopee',
                category: detectedCategory,
                rating: product.rating || 0,
                reviewsCount: 0,
                brand: product.brand || product.shopName || '',
                tags: product.commissionRate ? [`Comissão: ${product.commissionRate}%`] : [],
                isActive: true,
                isPosted: false,
                createdAt: now,
                updatedAt: now,
            };
        } catch (error: any) {
            logger.error('Error converting Shopee API product', { error: error.message });
            return null;
        }
    }

    /**
     * Clear caches (useful for testing/debugging)
     */
    clearCache(): void {
        this.offersCache = null;
        this.shortLinkCache.clear();
        logger.info('🗑️ Shopee API: Cache cleared');
    }
}
