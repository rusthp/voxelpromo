import axios, { AxiosInstance } from 'axios';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { NetworkApiAbstract, NetworkApiConfig, NetworkMetadata } from '../affiliate/NetworkApiAbstract';

/**
 * Default Awin API URL templates
 * These can be overridden via config.json
 */
const DEFAULT_AWIN_API_CONFIG: NetworkApiConfig = {
    campaigns: 'https://api.awin.com/publishers/{publisherId}/programmes',
    coupons: 'https://api.awin.com/publishers/{publisherId}/promotions',
    deeplink: 'https://api.awin.com/publishers/{publisherId}/linkbuilder',
    productFeed: 'https://ui.awin.com/productdata-darwin-download/publisher/{publisherId}/{dataFeedApiKey}/1/{advertiserId}-retail-{locale}.csv',
    feedList: 'https://ui.awin.com/productdata-darwin-download/publisher/{publisherId}/{dataFeedApiKey}/1/feedList',
};

/**
 * Awin Affiliate Network Service
 * Integrates with Awin Publisher API to fetch offers and generate affiliate links.
 * 
 * Now extends NetworkApiAbstract for consistency with other network services.
 * Uses configurable URL templates with {variable} substitution.
 * 
 * API Docs: https://help.awin.com/apidocs
 * Rate Limit: 20 requests/minute for Publisher API, 5/min for Product Feeds
 */
export class AwinService extends NetworkApiAbstract {
    private client: AxiosInstance;
    private enabled: boolean = false;

    constructor() {
        // Load config and create instance
        const { config, metadata, enabled } = AwinService.loadConfiguration();
        super(config, metadata);
        this.enabled = enabled;

        this.client = axios.create({
            baseURL: 'https://api.awin.com',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Load Awin configuration from config.json or environment variables
     */
    private static loadConfiguration(): { config: NetworkApiConfig; metadata: NetworkMetadata; enabled: boolean } {
        let metadata: NetworkMetadata = {};
        let config: NetworkApiConfig = { ...DEFAULT_AWIN_API_CONFIG };
        let enabled = false;

        // Try environment variables first
        const envToken = process.env.AWIN_API_TOKEN;
        const envPublisherId = process.env.AWIN_PUBLISHER_ID;
        const envEnabled = process.env.AWIN_ENABLED === 'true';
        const envDataFeedKey = process.env.AWIN_DATA_FEED_API_KEY;

        if (envToken && envPublisherId) {
            metadata = {
                token: envToken,
                publisherId: envPublisherId,
                dataFeedApiKey: envDataFeedKey,
            };
            enabled = envEnabled;
            logger.debug('✅ Awin config loaded from environment variables');
        }

        // Try config.json (can override env vars)
        try {
            const configPath = join(process.cwd(), 'config.json');
            if (existsSync(configPath)) {
                const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
                if (fileConfig.awin?.apiToken && fileConfig.awin?.publisherId) {
                    metadata = {
                        token: fileConfig.awin.apiToken,
                        publisherId: fileConfig.awin.publisherId,
                        dataFeedApiKey: fileConfig.awin.dataFeedApiKey,
                    };
                    enabled = fileConfig.awin.enabled ?? false;

                    // Load custom API URLs if provided
                    if (fileConfig.awin.apiLinks) {
                        config = { ...config, ...fileConfig.awin.apiLinks };
                    }

                    logger.debug('✅ Awin config loaded from config.json');
                }
            }
        } catch (error) {
            logger.warn('⚠️ Could not load Awin config from config.json');
        }

        if (!metadata.token || !metadata.publisherId) {
            logger.warn('⚠️ Awin not configured - set AWIN_API_TOKEN and AWIN_PUBLISHER_ID');
        }

        return { config, metadata, enabled };
    }

    /**
     * Get authorization headers for API requests
     */
    protected getAuthHeaders(): Record<string, string> {
        if (!this.metadata.token) {
            throw new Error('Awin API token not configured');
        }
        return {
            Authorization: `Bearer ${this.metadata.token}`,
        };
    }

    /**
     * Check if Awin is configured and enabled
     */
    isConfigured(): boolean {
        return !!(this.metadata.token && this.metadata.publisherId && this.enabled);
    }

    /**
     * Check if Product Feed download is configured
     */
    hasDataFeedApiKey(): boolean {
        return !!this.metadata.dataFeedApiKey;
    }

    /**
     * Test connection to Awin API using the /accounts endpoint
     */
    async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
        if (!this.metadata.token || !this.metadata.publisherId) {
            return {
                success: false,
                message: 'Awin API Token ou Publisher ID não configurados',
            };
        }

        try {
            const response = await this.client.get('/accounts', {
                headers: this.getAuthHeaders(),
            });

            if (response.status === 200 && response.data?.accounts) {
                const account = response.data.accounts.find(
                    (acc: any) => acc.accountId === parseInt(this.metadata.publisherId!, 10)
                );
                return {
                    success: true,
                    message: `Conectado à Awin! Publisher: ${account?.accountName || this.metadata.publisherId}`,
                    data: response.data,
                };
            }

            return {
                success: false,
                message: `Resposta inesperada: ${response.status}`,
            };
        } catch (error: any) {
            if (error.response?.status === 401) {
                return {
                    success: false,
                    message: 'Token inválido ou expirado',
                };
            }
            return {
                success: false,
                message: `Erro: ${error.message}`,
            };
        }
    }

    /**
     * Get campaigns/advertisers from Awin
     */
    async getCampaigns(): Promise<any[]> {
        if (!this.isConfigured() || !this.config.campaigns) {
            return [];
        }

        try {
            const url = this.formatUrl(this.config.campaigns);
            const response = await this.client.get(url, {
                headers: this.getAuthHeaders(),
            });

            return response.data || [];
        } catch (error: any) {
            logger.error(`❌ Error fetching Awin campaigns: ${error.message}`);
            return [];
        }
    }

    /**
     * Get coupons/promotions from Awin
     */
    async getCoupons(): Promise<any[]> {
        if (!this.isConfigured() || !this.config.coupons) {
            return [];
        }

        try {
            const url = this.formatUrl(this.config.coupons);
            const response = await this.client.post(url, {
                filters: {
                    exclusiveOnly: false,
                    regionCodes: ['BR'],
                    type: 'voucher',
                },
                pagination: {
                    page: 1,
                    pageSize: 100,
                },
            }, {
                headers: this.getAuthHeaders(),
            });

            const coupons = response.data?.data || [];
            return coupons.map((coupon: any) => ({
                title: coupon.title,
                description: coupon.description,
                code: coupon.voucher?.code,
                active: coupon.status === 'active',
                expiration: new Date(coupon.endDate),
                link: coupon.url,
                advertiser: coupon.advertiser?.id,
                promotionId: coupon.promotionId,
                deeplink: coupon.urlTracking,
            }));
        } catch (error: any) {
            logger.error(`❌ Error fetching Awin coupons: ${error.message}`);
            return [];
        }
    }

    /**
     * Generate affiliate deeplink for a product URL
     * Uses the Link Builder API: POST /publishers/{publisherId}/linkbuilder
     */
    async getDeeplink(destinationUrl: string, advertiserId: string): Promise<string | null> {
        if (!this.isConfigured() || !this.config.deeplink) {
            logger.warn('⚠️ Awin not configured, cannot generate link');
            return null;
        }

        try {
            const url = this.formatUrl(this.config.deeplink);
            const response = await this.client.post(url, {
                advertiserId: parseInt(advertiserId, 10),
                destinationUrl: destinationUrl,
                shorten: true,
            }, {
                headers: this.getAuthHeaders(),
            });

            const trackingUrl = response.data?.shortUrl || response.data?.url;
            if (trackingUrl) {
                logger.debug(`✅ Generated Awin affiliate link: ${trackingUrl}`);
                return trackingUrl;
            }

            return null;
        } catch (error: any) {
            logger.error(`❌ Error generating Awin affiliate link: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetch list of available Product Feeds
     */
    async fetchFeedList(): Promise<any[]> {
        if (!this.metadata.dataFeedApiKey || !this.config.feedList) {
            logger.warn('⚠️ Data Feed API Key not configured');
            return [];
        }

        try {
            logger.info('📡 Fetching Awin Product Feed list...');

            const url = this.formatUrl(this.config.feedList);
            const response = await axios.get(url, {
                timeout: 120000,
                responseType: 'text',
            });

            if (!response.data) {
                return [];
            }

            // Parse CSV response
            const lines = response.data.split('\n').filter((line: string) => line.trim());
            if (lines.length < 2) {
                return [];
            }

            const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
            const feeds: any[] = [];

            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length >= headers.length) {
                    const feed: any = {};
                    headers.forEach((header: string, idx: number) => {
                        feed[header] = values[idx];
                    });
                    feeds.push(feed);
                }
            }

            logger.info(`✅ Found ${feeds.length} available Product Feeds`);
            return feeds;
        } catch (error: any) {
            logger.error(`❌ Error fetching feed list: ${error.message}`);
            return [];
        }
    }

    /**
     * Parse a CSV line handling quoted values
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    /**
     * Fetch product feed from an advertiser
     */
    async getProductFeed(advertiserId: string, options?: { locale?: string; maxProducts?: number }): Promise<Offer[]> {
        const locale = options?.locale || 'pt_BR';
        const maxProducts = options?.maxProducts || 100;

        if (!this.metadata.dataFeedApiKey) {
            logger.warn('⚠️ Data Feed API Key not configured');
            return [];
        }

        try {
            logger.info(`📡 Fetching product feed from Awin advertiser ${advertiserId}...`);

            // Build feed URL with dynamic parameters
            const feedUrl = this.formatUrl(
                'https://ui.awin.com/productdata-darwin-download/publisher/{publisherId}/{dataFeedApiKey}/1/{advertiserId}-retail-{locale}.csv',
                { advertiserId, locale }
            );

            const response = await axios.get(feedUrl, {
                timeout: 300000,
                responseType: 'text',
                decompress: true,
            });

            if (!response.data) {
                return [];
            }

            // Parse CSV
            const lines = response.data.split('\n').filter((line: string) => line.trim());
            if (lines.length < 2) {
                return [];
            }

            const headers = this.parseCSVLine(lines[0]);
            const offers: Offer[] = [];
            const limit = maxProducts > 0 ? Math.min(maxProducts + 1, lines.length) : lines.length;

            for (let i = 1; i < limit; i++) {
                try {
                    const values = this.parseCSVLine(lines[i]);
                    const product: any = {};
                    headers.forEach((header: string, idx: number) => {
                        product[header] = values[idx] || '';
                    });

                    const offer = this.convertFeedProductToOffer(product);
                    if (offer) {
                        offers.push(offer);
                    }
                } catch {
                    continue;
                }
            }

            logger.info(`✅ Parsed ${offers.length} products from feed`);
            return offers;
        } catch (error: any) {
            if (error.response?.status === 404) {
                logger.error(`❌ Product feed not found for advertiser ${advertiserId}`);
            } else {
                logger.error(`❌ Error fetching Awin product feed: ${error.message}`);
            }
            return [];
        }
    }

    /**
     * Download and parse a Product Feed from URL
     * Handles gzip compression automatically
     */
    async downloadFeed(feedUrl: string, maxProducts: number = 100): Promise<Offer[]> {
        try {
            logger.info(`📡 Downloading Product Feed...`);

            // Download as arraybuffer to handle gzip properly
            const response = await axios.get(feedUrl, {
                timeout: 300000,
                responseType: 'arraybuffer',
            });

            if (!response.data) {
                return [];
            }

            const buffer = Buffer.from(response.data);
            let csvData: string;

            // Check if data is gzipped (starts with 0x1f 0x8b magic bytes)
            const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;

            if (isGzip) {
                logger.debug('📦 Decompressing gzip feed...');
                const { promisify } = await import('util');
                const { gunzip } = await import('zlib');
                const gunzipAsync = promisify(gunzip);
                const decompressed = await gunzipAsync(buffer);
                csvData = decompressed.toString('utf-8');
            } else {
                csvData = buffer.toString('utf-8');
            }

            const lines = csvData.split('\n').filter((line: string) => line.trim());
            if (lines.length < 2) {
                logger.warn('⚠️ Feed has no data rows');
                return [];
            }

            logger.info(`📦 Feed has ${lines.length - 1} products`);

            const headers = this.parseCSVLine(lines[0]);
            logger.info(`📋 Awin CSV Headers: ${headers.join(' | ')}`); // Log headers

            const offers: Offer[] = [];
            const limit = maxProducts > 0 ? Math.min(maxProducts + 1, lines.length) : lines.length;

            for (let i = 1; i < limit; i++) {
                try {
                    const values = this.parseCSVLine(lines[i]);
                    const product: any = {};
                    headers.forEach((header: string, idx: number) => {
                        product[header] = values[idx] || '';
                    });

                    // Debug log for first 5 products regardless of random chance
                    if (i <= 5) {
                        logger.debug(`🔍 Awin Raw Product ${i}:`, {
                            name: product.product_name,
                            id: product.aw_product_id,
                            search_price: product.search_price,
                            store_price: product.store_price,
                            // Log keys to see if they match expected property names
                            keys: Object.keys(product)
                        });
                    }

                    const offer = this.convertFeedProductToOffer(product);
                    if (offer) {
                        offers.push(offer);
                    }
                } catch {
                    continue;
                }
            }

            logger.info(`✅ Parsed ${offers.length} products from feed`);
            return offers;
        } catch (error: any) {
            logger.error(`❌ Error downloading feed: ${error.message}`);
            return [];
        }
    }

    /**
     * Convert Awin Product Feed CSV row to VoxelPromo Offer
     */
    private convertFeedProductToOffer(product: any): Offer | null {
        // Support multiple field names (Standard Awin vs Google Shopping format)
        const id = product.aw_product_id || product.id || product.MPN;
        const title = product.product_name || product.title;

        if (!title && !id) {
            return null;
        }

        const parsePrice = (priceStr: string): number => {
            if (!priceStr) return 0;
            // Remove currency codes and whitespace (e.g. "BRL 100.00" -> "100.00")
            const cleaned = priceStr.replace(/[A-Z]{3}/g, '').trim();
            // Replace comma with dot if it looks like decimal separator
            const normalized = cleaned.replace(',', '.');
            return parseFloat(normalized) || 0;
        };

        // Determine prices
        // Prioritize sale_price if available, otherwise price/search_price
        let currentPrice = 0;
        let originalPrice = 0;

        if (product.sale_price) {
            currentPrice = parsePrice(product.sale_price);
            originalPrice = parsePrice(product.price || product.rrp_price || product.store_price);
        } else {
            currentPrice = parsePrice(product.price || product.search_price || product.store_price);
            originalPrice = parsePrice(product.rrp_price || product.price);
        }

        // If parsed 0, fallback strategies
        if (currentPrice === 0 && originalPrice > 0) currentPrice = originalPrice;
        if (originalPrice === 0 && currentPrice > 0) originalPrice = currentPrice;

        const discount = originalPrice > currentPrice ? originalPrice - currentPrice : 0;
        const discountPercentage = originalPrice > 0 ? (discount / originalPrice) * 100 : 0;

        // Map other fields
        const imageUrl = product.aw_image_url || product.merchant_image_url || product.image_link || '';
        const affiliateUrl = product.aw_deep_link || product.merchant_deep_link || product.link || '';
        const category = product.category_name || product.merchant_category || product.google_product_category || 'outros';
        const brand = product.brand_name || product.merchant_name || product.brand || '';
        const description = product.description || product.product_short_description || title;

        const offer: Partial<Offer> = {
            title: title || id,
            description,

            originalPrice,
            currentPrice,
            discount,
            discountPercentage,
            currency: product.currency || 'BRL',
            imageUrl,
            productUrl: affiliateUrl,
            affiliateUrl,
            source: 'awin',
            category,
            brand,
            isActive: true,
            isPosted: false,
            tags: ['awin', brand?.toLowerCase() || ''].filter(Boolean),
        };

        if (!offer.affiliateUrl) {
            return null;
        }

        return offer as Offer;
    }

    /**
     * Get list of advertisers the publisher has access to
     */
    async getAdvertisers(): Promise<any[]> {
        if (!this.isConfigured()) {
            return [];
        }

        try {
            const response = await this.client.get('/accounts', {
                headers: this.getAuthHeaders(),
            });

            return response.data?.accounts || [];
        } catch (error: any) {
            logger.error(`❌ Error fetching Awin accounts: ${error.message}`);
            return [];
        }
    }
}
