import axios from 'axios';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as cheerio from 'cheerio';
import { logger } from '../../utils/logger';
import { Offer } from '../../types';

interface MercadoLivreConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  affiliateCode?: string;
}

interface MercadoLivreProduct {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  /**
   * Available quantity - NOTE: Returns reference values, not exact quantities
   * RANGO_1_50 = 1, RANGO_51_100 = 50, RANGO_101_150 = 100, etc.
   * See: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
   */
  available_quantity: number | string; // Can be number or range string like "RANGO_1_50"
  condition: string;
  permalink: string;
  thumbnail: string;
  pictures?: Array<{ url: string }>;
  shipping?: {
    free_shipping: boolean;
  };
  discounts?: {
    amount: number;
    percent: number;
  };
  original_price?: number;
  // Additional fields from detailed product endpoint
  seller_id?: number;
  seller?: {
    id: number;
    nickname: string;
    reputation?: {
      level_id?: string;
      power_seller_status?: string;
      transactions?: {
        completed: number;
        canceled: number;
        period: string;
      };
    };
  };
  descriptions?: Array<{ id: string }>;
  attributes?: Array<{
    id: string;
    name: string;
    value_name: string;
  }>;
  video_id?: string;
  warranty?: string;
  category_id?: string;
  listing_type_id?: string;
  sale_price?: number;
  base_price?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class MercadoLivreService {
  private baseUrl = 'https://api.mercadolibre.com';
  private authUrl = 'https://auth.mercadolivre.com.br';

  // Cache em memória para resultados de busca
  private searchCache = new Map<string, CacheEntry<MercadoLivreProduct[]>>();
  private cacheDuration = 10 * 60 * 1000; // 10 minutos

  // Controle de rate limiting - última requisição
  private lastRequestTime = 0;
  private minRequestDelay = 250; // 250ms entre requisições

  /**
   * Get current config from environment variables or config.json
   */
  getConfig(): MercadoLivreConfig {
    // Try to load from config.json first
    try {
      const configPath = join(process.cwd(), 'config.json');

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.mercadolivre?.clientId) {
          return {
            clientId: config.mercadolivre.clientId,
            clientSecret: config.mercadolivre.clientSecret || '',
            redirectUri: config.mercadolivre.redirectUri || 'https://proplaynews.com.br/',
            accessToken: config.mercadolivre.accessToken,
            refreshToken: config.mercadolivre.refreshToken,
            tokenExpiresAt: config.mercadolivre.tokenExpiresAt,
          };
        }
      }
    } catch (error) {
      // Fall back to environment variables
    }

    // Fall back to environment variables
    return {
      clientId: process.env.MERCADOLIVRE_CLIENT_ID || '',
      clientSecret: process.env.MERCADOLIVRE_CLIENT_SECRET || '',
      redirectUri: process.env.MERCADOLIVRE_REDIRECT_URI || 'https://proplaynews.com.br/',
      accessToken: process.env.MERCADOLIVRE_ACCESS_TOKEN,
      refreshToken: process.env.MERCADOLIVRE_REFRESH_TOKEN,
      tokenExpiresAt: process.env.MERCADOLIVRE_TOKEN_EXPIRES_AT
        ? parseInt(process.env.MERCADOLIVRE_TOKEN_EXPIRES_AT)
        : undefined,
    };
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(state?: string): string {
    const config = this.getConfig();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.authUrl}/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user_id: number;
    scope: string;
  }> {
    const config = this.getConfig();

    if (!config.clientId || !config.clientSecret) {
      throw new Error('Mercado Livre Client ID or Client Secret not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: code,
          redirect_uri: config.redirectUri,
        }),
        {
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logger.info('✅ Successfully exchanged code for access token');

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        user_id: response.data.user_id,
        scope: response.data.scope,
      };
    } catch (error: any) {
      logger.error('Error exchanging code for token:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(
        `Failed to exchange code for token: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const config = this.getConfig();

    if (!config.refreshToken) {
      throw new Error('Refresh token not available');
    }

    if (!config.clientId || !config.clientSecret) {
      throw new Error('Mercado Livre Client ID or Client Secret not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: config.refreshToken,
        }),
        {
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logger.info('✅ Successfully refreshed access token');

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('Error refreshing token:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(
        `Failed to refresh token: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * Retry request with exponential backoff
   * Handles rate limiting (403, 429) automatically
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 5,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      const status = error.response?.status;
      const isRateLimit = status === 403 || status === 429;

      if (isRateLimit && attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms, 8000ms
        const waitTime = Math.min(500 * Math.pow(2, attempt - 1), 10000);

        logger.warn(
          `Rate limit atingido (${status}). Tentando novamente em ${waitTime}ms... (tentativa ${attempt}/${maxRetries})`
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.retryRequest(requestFn, maxRetries, attempt + 1);
      }

      // Se não for rate limit ou excedeu tentativas, lança o erro
      throw error;
    }
  }

  /**
   * Throttle requests to avoid rate limiting
   * Ensures minimum delay between requests
   */
  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestDelay) {
      const waitTime = this.minRequestDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Generate cache key from search parameters
   */
  private getCacheKey(keyword: string, limit: number, options?: any): string {
    const optionsStr = JSON.stringify(options || {});
    return `search:${keyword}:${limit}:${optionsStr}`;
  }

  /**
   * Get cached search results if available and valid
   */
  private getCachedResults(cacheKey: string): MercadoLivreProduct[] | null {
    const cached = this.searchCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now > cached.expiresAt) {
      // Cache expirado, remove
      this.searchCache.delete(cacheKey);
      return null;
    }

    logger.debug(`Using cached search results for key: ${cacheKey.substring(0, 50)}...`);
    return cached.data;
  }

  /**
   * Cache search results
   */
  private cacheResults(cacheKey: string, data: MercadoLivreProduct[]): void {
    const now = Date.now();
    this.searchCache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + this.cacheDuration,
    });

    // Limpar cache antigo (manter apenas últimos 1000 itens)
    if (this.searchCache.size > 1000) {
      const entries = Array.from(this.searchCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - 1000);
      toRemove.forEach(([key]) => this.searchCache.delete(key));
    }
  }

  /**
   * Search products by keyword
   * Reference: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
   * Note: Public search endpoint doesn't require authentication
   *
   * Features:
   * - Automatic retry with exponential backoff for rate limits
   * - Request throttling (250ms minimum delay)
   * - Result caching (10 minutes)
   *
   * @param keyword - Search keyword
   * @param limit - Maximum results (default: 20, max: 100)
   * @param options - Additional search options
   * @returns Array of products
   */
  async searchProducts(
    keyword: string = 'eletrônicos',
    limit: number = 20,
    options?: {
      sort?: string; // e.g., 'price_asc', 'price_desc', 'relevance'
      condition?: 'new' | 'used' | 'not_specified';
      category?: string; // Category ID
      shippingCost?: 'free' | 'paid';
      sellerId?: string; // Search by seller ID
      nickname?: string; // Search by seller nickname
    }
  ): Promise<MercadoLivreProduct[]> {
    try {
      logger.info(`Searching Mercado Livre products with keyword: "${keyword}"`);

      // Validate limit (max 100 per API documentation)
      const validLimit = Math.min(Math.max(limit, 1), 100);

      // Build search parameters
      const params: Record<string, any> = {
        q: keyword,
        limit: validLimit,
      };

      // Add sort (default: price_asc to find deals)
      params.sort = options?.sort || 'price_asc';

      // Add condition filter
      if (options?.condition) {
        params.condition = options.condition;
      } else {
        params.condition = 'new'; // Default to new products
      }

      // Add category filter
      if (options?.category) {
        params.category = options.category;
      }

      // Add shipping cost filter (free shipping)
      if (options?.shippingCost === 'free') {
        params.shipping_cost = 'free';
      }

      // Add seller filter (by ID or nickname)
      if (options?.sellerId) {
        params.seller_id = options.sellerId;
      } else if (options?.nickname) {
        params.nickname = options.nickname;
      }

      // Check cache first
      const cacheKey = this.getCacheKey(keyword, validLimit, options);
      const cached = this.getCachedResults(cacheKey);
      if (cached) {
        logger.info(`✅ Found ${cached.length} products from cache`, { keyword });
        return cached;
      }

      // Throttle request to avoid rate limiting
      await this.throttleRequest();

      // Make request with retry logic
      const response = await this.retryRequest(async () => {
        return await axios.get(`${this.baseUrl}/sites/MLB/search`, {
          params,
          headers: {
            Accept: 'application/json',
          },
          timeout: 30000,
        });
      });

      if (response.data.results && Array.isArray(response.data.results)) {
        logger.info(`✅ Found ${response.data.results.length} products from Mercado Livre`, {
          keyword,
          limit: validLimit,
          totalResults: response.data.paging?.total || 0,
          hasOriginalPrice: response.data.results.filter((p: any) => p.original_price).length,
          hasDiscounts: response.data.results.filter((p: any) => p.discounts).length,
        });

        // Log first product structure for debugging
        if (response.data.results.length > 0) {
          const firstProduct = response.data.results[0];
          logger.debug('📦 First product structure:', {
            id: firstProduct.id,
            title: firstProduct.title?.substring(0, 50),
            price: firstProduct.price,
            original_price: firstProduct.original_price,
            hasDiscounts: !!firstProduct.discounts,
            condition: firstProduct.condition,
            free_shipping: firstProduct.shipping?.free_shipping,
          });
        }

        // Cache results
        this.cacheResults(cacheKey, response.data.results);

        // Note: available_quantity returns reference values, not exact quantities
        // RANGO_1_50 = 1, RANGO_51_100 = 50, etc.

        return response.data.results;
      }

      logger.warn('No products found in response', {
        keyword,
        responseKeys: Object.keys(response.data || {}),
        hasResults: !!response.data.results,
      });
      return [];
    } catch (error: any) {
      logger.error('Error searching Mercado Livre products:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return [];
    }
  }

  /**
   * Get hot deals / promotions
   * Uses public search endpoint (no authentication required)
   * Optimized for finding products with discounts and free shipping
   *
   * Improvements:
   * - Reduced search terms (2 instead of 5) to avoid rate limiting
   * - Increased limit per search to get more results
   * - Automatic delay between searches
   * - Uses cached results when available
   */
  async getHotDeals(limit: number = 20): Promise<MercadoLivreProduct[]> {
    try {
      logger.info('Fetching hot deals from Mercado Livre...');

      const allDeals: MercadoLivreProduct[] = [];

      // Reduced search terms to avoid rate limiting
      // Using only 2 most effective terms instead of 5
      const searchTerms = ['promoção', 'desconto'];

      // Calculate how many products to fetch per term
      const productsPerTerm = Math.ceil(limit / searchTerms.length);

      for (const term of searchTerms) {
        try {
          // Search with higher limit per term to get more results
          const deals = await this.searchProducts(term, Math.min(productsPerTerm * 2, 50), {
            sort: 'price_asc',
            condition: 'new',
            // Removed shippingCost: 'free' to get more results
          });

          logger.debug(`Found ${deals.length} products for term "${term}"`);

          // Add all products (we'll filter by discount later when we have details)
          for (const product of deals) {
            if (!allDeals.find((d: any) => d.id === product.id)) {
              allDeals.push(product);
            }
          }

          // Stop if we have enough products
          if (allDeals.length >= limit) {
            break;
          }

          // Delay between searches to avoid rate limiting
          // Only delay if not the last term
          if (searchTerms.indexOf(term) < searchTerms.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error: any) {
          logger.debug(`Search term "${term}" failed: ${error.message}`);
          // Continue with next term even if one fails
        }
      }

      logger.info(`🔥 Found ${allDeals.length} potential deals from Mercado Livre`);

      // Return all products - we'll filter by discount when converting to offers
      // This allows us to fetch product details first to get accurate original_price
      return allDeals.slice(0, limit);
    } catch (error: any) {
      logger.error('Error fetching hot deals:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return [];
    }
  }

  /**
   * Get detailed product information by item ID
   * Reference: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
   *
   * @param itemId - Mercado Livre item ID (e.g., "MLB123456789")
   * @returns Detailed product information
   */
  async getProductDetails(itemId: string): Promise<MercadoLivreProduct | null> {
    try {
      logger.info(`Fetching product details for item: ${itemId}`);

      // Throttle request
      await this.throttleRequest();

      // Public endpoint - no authentication required
      const response = await this.retryRequest(async () => {
        return await axios.get(`${this.baseUrl}/items/${itemId}`, {
          headers: {
            Accept: 'application/json',
          },
          timeout: 30000,
        });
      });

      if (response.data && response.data.id) {
        logger.info(`✅ Retrieved details for product: ${response.data.title.substring(0, 50)}...`);
        return response.data;
      }

      logger.warn(`No product details found for item: ${itemId}`);
      return null;
    } catch (error: any) {
      logger.error('Error fetching product details:', {
        itemId,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return null;
    }
  }

  /**
   * Get multiple products by IDs (Multiget)
   * Reference: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
   * Maximum 20 items per request
   *
   * @param itemIds - Array of item IDs (max 20)
   * @param attributes - Optional: specific attributes to return
   * @returns Array of products with status codes
   */
  async getMultipleProducts(
    itemIds: string[],
    _attributes?: string[]
  ): Promise<Array<{ code: number; body?: MercadoLivreProduct; error?: any }>> {
    try {
      // Limit to 20 items per API documentation
      const ids = itemIds.slice(0, 20).join(',');

      const params: Record<string, any> = {
        ids,
      };

      // Note: Mercado Livre API doesn't support attributes filter in multiget
      // The attributes parameter is ignored here but kept for API compatibility

      logger.info(`Fetching ${itemIds.length} products via multiget (limited to 20)`);

      // Throttle request
      await this.throttleRequest();

      const response = await this.retryRequest(async () => {
        return await axios.get(`${this.baseUrl}/items`, {
          params,
          headers: {
            Accept: 'application/json',
          },
          timeout: 30000,
        });
      });

      if (Array.isArray(response.data)) {
        logger.info(`✅ Retrieved ${response.data.length} products via multiget`);
        // Mercado Livre returns array of objects, each can be:
        // - {code: 200, body: {...}} for successful requests
        // - {code: 404, error: ...} for failed requests
        return response.data;
      }

      logger.warn('Multiget response is not an array');
      return [];
    } catch (error: any) {
      logger.error('Error fetching multiple products:', {
        itemIds: itemIds.slice(0, 5),
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return [];
    }
  }

  /**
   * Search products by seller (for affiliate programs)
   * Reference: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
   *
   * @param sellerId - Seller ID
   * @param nickname - Seller nickname (alternative to sellerId)
   * @param limit - Maximum results
   * @param options - Additional search options
   * @returns Array of products from seller
   */
  async searchBySeller(
    sellerId?: string,
    nickname?: string,
    limit: number = 20,
    options?: {
      category?: string;
      sort?: string;
      shippingCost?: 'free' | 'paid';
    }
  ): Promise<MercadoLivreProduct[]> {
    try {
      if (!sellerId && !nickname) {
        throw new Error('Either sellerId or nickname must be provided');
      }

      logger.info(`Searching products by seller: ${sellerId || nickname}`);

      return await this.searchProducts('', limit, {
        sellerId,
        nickname,
        category: options?.category,
        sort: options?.sort || 'price_asc',
        shippingCost: options?.shippingCost,
        condition: 'new',
      });
    } catch (error: any) {
      logger.error('Error searching by seller:', {
        sellerId,
        nickname,
        message: error.message,
      });
      return [];
    }
  }

  /**
   * Get product prices (original and sale price)
   * Reference: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
   *
   * @param itemId - Mercado Livre item ID
   * @returns Price information
   */
  async getProductPrices(itemId: string): Promise<{ original: number; sale: number } | null> {
    try {
      // Throttle request
      await this.throttleRequest();

      const response = await this.retryRequest(async () => {
        return await axios.get(`${this.baseUrl}/items/${itemId}/prices`, {
          headers: {
            Accept: 'application/json',
          },
          timeout: 30000,
        });
      });

      if (response.data) {
        return {
          original: response.data.original_price || response.data.price || 0,
          sale: response.data.sale_price || response.data.price || 0,
        };
      }

      return null;
    } catch (error: any) {
      logger.error('Error fetching product prices:', {
        itemId,
        message: error.message,
      });
      return null;
    }
  }

  /**
   * Build affiliate link for Mercado Livre product
   *
   * Supported formats:
   * 1. Simple affiliate code: https://produto.mercadolivre.com.br/MLB-123456?a=SEU_CODIGO
   * 2. Hub de Afiliados: https://www.mercadolivre.com.br/afiliados/hub?u=PRODUCT_URL
   * 3. Direct permalink (if no affiliate code): PRODUCT_PERMALINK
   *
   * @param productUrl - Product permalink or URL
   * @param itemId - Mercado Livre item ID
   * @returns Affiliate link
   */
  buildAffiliateLink(productUrl: string, itemId: string): string {
    const config = this.getConfig();
    const affiliateCode = config.affiliateCode;

    // If no affiliate code, return original URL
    if (!affiliateCode || affiliateCode.trim() === '') {
      logger.debug('No affiliate code configured, using direct product URL');
      return productUrl;
    }

    try {
      // Check if affiliate code looks like a hub URL or tracking ID
      // Hub format: https://www.mercadolivre.com.br/afiliados/hub#... or with query params
      if (affiliateCode.startsWith('http://') || affiliateCode.startsWith('https://')) {
        // If it's a full URL (hub de afiliados), append product URL as parameter
        const hubUrl = new URL(affiliateCode);

        // Preserve hash fragment if present
        const hash = hubUrl.hash;
        hubUrl.hash = ''; // Remove hash temporarily to add query param

        // Add product URL as parameter
        hubUrl.searchParams.set('u', productUrl);

        // Restore hash fragment if it existed
        if (hash) {
          hubUrl.hash = hash;
        }

        logger.debug(`Built affiliate link using hub format for item ${itemId}`);
        return hubUrl.toString();
      }

      // Method 1: Simple affiliate code (most common)
      // Format: https://produto.mercadolivre.com.br/MLB-123456?a=SEU_CODIGO
      const url = new URL(productUrl);

      // Add affiliate code as query parameter
      url.searchParams.set('a', affiliateCode);

      logger.debug(`Built affiliate link for item ${itemId} with code ${affiliateCode}`);
      return url.toString();
    } catch (error) {
      // If URL parsing fails, try simple concatenation
      logger.warn('Failed to parse product URL, using simple concatenation');
      const separator = productUrl.includes('?') ? '&' : '?';
      return `${productUrl}${separator}a=${affiliateCode}`;
    }
  }

  /**
   * Convert Mercado Livre product to Offer format
   * Uses detailed product information when available
   */
  convertToOffer(product: MercadoLivreProduct, category: string = 'electronics'): Offer | null {
    try {
      // Get prices - prioritize detailed product data
      const currentPrice = product.sale_price || product.price || 0;
      const originalPrice =
        product.original_price || product.base_price || product.price || currentPrice;

      // Calculate discount
      const discount = originalPrice - currentPrice;
      const discountPercentage = originalPrice > 0 ? (discount / originalPrice) * 100 : 0;

      // Filter by minimum discount (3% minimum - reduced to get more products)
      // Only filter if we have a valid original price and discount
      if (originalPrice > currentPrice && discountPercentage < 3) {
        logger.debug('Product filtered: discount too low', {
          productId: product.id,
          discountPercentage: discountPercentage.toFixed(2),
          currentPrice,
          originalPrice,
        });
        return null;
      }

      // If no discount but product has discounts field, accept it
      // (some products may have discounts that aren't reflected in original_price)
      if (discountPercentage === 0 && !product.discounts && originalPrice === currentPrice) {
        logger.debug('Product filtered: no discount detected', {
          productId: product.id,
          hasDiscountsField: !!product.discounts,
        });
        // Still accept products without discount if they're new and have good rating
        // This allows more products to appear
      }

      // Get image URL - prioritize high-quality images
      let imageUrl = '';
      if (product.pictures && product.pictures.length > 0) {
        // Get the first high-quality image
        imageUrl = product.pictures[0].url || product.thumbnail || '';
      } else {
        imageUrl = product.thumbnail || '';
      }

      // Build product URL
      const productUrl =
        product.permalink || `https://produto.mercadolivre.com.br/MLB-${product.id}`;

      // Build affiliate link
      const affiliateUrl = this.buildAffiliateLink(productUrl, product.id);

      // Extract brand from attributes if available
      let brand = '';
      if (product.attributes && Array.isArray(product.attributes)) {
        const brandAttr = product.attributes.find(
          (attr) => attr.id === 'BRAND' || attr.name?.toLowerCase().includes('marca')
        );
        if (brandAttr) {
          brand = brandAttr.value_name || '';
        }
      }

      // Get seller reputation/rating if available
      let rating = 0;
      let reviewsCount = 0;
      if (product.seller?.reputation?.transactions) {
        reviewsCount = product.seller.reputation.transactions.completed || 0;
        // Mercado Livre doesn't provide explicit rating, but we can use seller level
        const levelId = product.seller.reputation.level_id;
        if (levelId) {
          // Map level_id to approximate rating (1-5 scale)
          // Level IDs: 5_green (best), 4_light_green, 3_yellow, 2_orange, 1_red
          const levelMap: { [key: string]: number } = {
            '5_green': 5,
            '4_light_green': 4,
            '3_yellow': 3,
            '2_orange': 2,
            '1_red': 1,
          };
          rating = levelMap[levelId] || 0;
        }
      }

      // Build tags from product attributes
      const tags: string[] = [];
      if (product.condition) {
        tags.push(product.condition === 'new' ? 'Novo' : 'Usado');
      }
      if (product.shipping?.free_shipping) {
        tags.push('Frete Grátis');
      }
      if (discountPercentage >= 20) {
        tags.push('Super Desconto');
      } else if (discountPercentage >= 10) {
        tags.push('Ótimo Desconto');
      }

      // Build description
      let description = product.title;
      if (product.attributes && Array.isArray(product.attributes)) {
        const keyAttributes = product.attributes
          .filter((attr) => ['MODEL', 'BRAND', 'COLOR', 'STORAGE_CAPACITY'].includes(attr.id))
          .map((attr) => `${attr.name}: ${attr.value_name}`)
          .join(', ');
        if (keyAttributes) {
          description = `${product.title} - ${keyAttributes}`;
        }
      }

      const now = new Date();
      return {
        title: product.title,
        description,
        originalPrice: Math.round(originalPrice * 100) / 100,
        currentPrice: Math.round(currentPrice * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        discountPercentage: Math.round(discountPercentage * 100) / 100,
        currency: product.currency_id || 'BRL',
        imageUrl,
        productUrl,
        affiliateUrl, // Now uses buildAffiliateLink method
        source: 'mercadolivre',
        category,
        rating,
        reviewsCount,
        brand,
        tags,
        isActive: true,
        isPosted: false,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      logger.error('Error converting Mercado Livre product to offer:', error);
      return null;
    }
  }

  /**
   * Scrape products from Mercado Livre Affiliates Hub page
   * Alternative method when API is rate-limited
   *
   * @param hubUrl - URL of the affiliates hub page
   * @param limit - Maximum number of products to scrape
   * @returns Array of products
   */
  async scrapeAffiliatesHub(
    hubUrl: string = 'https://www.mercadolivre.com.br/afiliados/hub',
    limit: number = 50
  ): Promise<MercadoLivreProduct[]> {
    try {
      logger.info(`🔍 Scraping Mercado Livre Affiliates Hub: ${hubUrl}`);

      // Throttle request
      await this.throttleRequest();

      // Make request with retry
      const response = await this.retryRequest(async () => {
        return await axios.get(hubUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          timeout: 30000,
        });
      });

      const $ = cheerio.load(response.data);
      const products: MercadoLivreProduct[] = [];

      // Try multiple selectors for product cards (Mercado Livre may change structure)
      const productSelectors = [
        'article[data-testid="product-card"]',
        '.ui-search-result',
        '[data-testid="product"]',
        '.item',
        'li[class*="item"]',
        'div[class*="item"]',
      ];

      let productElements: cheerio.Cheerio<any> | null = null;

      for (const selector of productSelectors) {
        productElements = $(selector);
        if (productElements.length > 0) {
          logger.debug(
            `Found products using selector: ${selector} (${productElements.length} items)`
          );
          break;
        }
      }

      if (!productElements || productElements.length === 0) {
        logger.debug('No products found with standard selectors, trying fallback...');
        // Try to find any product-like elements
        productElements = $('a[href*="/produto/"], a[href*="/MLB-"]').parent();
        if (productElements.length === 0) {
          // Try finding divs with item-like classes
          productElements = $('div[class*="item"], li[class*="item"]');
          if (productElements.length === 0) {
            logger.warn('No products found using any selectors');
            return [];
          }
        }
      }

      productElements.slice(0, limit).each((_index, element) => {
        try {
          const $el = $(element);

          // Extract product information - try multiple methods
          // Title - try multiple selectors and fallbacks
          let title = $el
            .find(
              'h2, h3, .ui-search-item__title, [data-testid="product-title"], .item-title, [class*="title"]'
            )
            .first()
            .text()
            .trim();

          if (!title) {
            // Try from link
            const linkEl = $el
              .find('a[href*="/produto/"], a[href*="/MLB-"], a[href*="item.mercadolivre"]')
              .first();
            title = linkEl.attr('title') || linkEl.text().trim();
          }

          if (!title) {
            // Try from any link in the element
            title = $el.find('a').first().attr('title') || $el.find('a').first().text().trim();
          }

          if (!title || title.length < 5) {
            return; // Skip if no valid title
          }

          // Price - try multiple selectors
          let priceText = $el
            .find(
              '.price-tag, .ui-search-price, [data-testid="price"], .price, [class*="price"], .andes-money-amount'
            )
            .first()
            .text()
            .trim();

          // If no price found, search in all text
          if (!priceText || !priceText.match(/R\$\s*[\d.,]+/)) {
            const allText = $el.text();
            const priceMatch = allText.match(/R\$\s*([\d.,]+)/);
            priceText = priceMatch ? `R$ ${priceMatch[1]}` : '';
          }

          const priceMatch = priceText.match(/R\$\s*([\d.,]+)/) || priceText.match(/([\d.,]+)/);
          const price = priceMatch
            ? parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'))
            : 0;

          // Original price (if discounted)
          const originalPriceText = $el
            .find(
              '.price-tag-original, .ui-search-price__original, [data-testid="original-price"], [class*="original"]'
            )
            .first()
            .text()
            .trim();
          const originalPriceMatch = originalPriceText.match(/R\$\s*([\d.,]+)/);
          const originalPrice = originalPriceMatch
            ? parseFloat(originalPriceText.replace(/[^\d.,]/g, '').replace(',', '.'))
            : price;

          // Product URL - try multiple patterns
          let productLink = $el
            .find('a[href*="/produto/"], a[href*="/MLB-"], a[href*="item.mercadolivre"]')
            .first()
            .attr('href');

          if (!productLink) {
            // Try any link that might be a product
            productLink = $el.find('a[href*="mercadolivre"]').first().attr('href');
          }

          const productUrl = productLink
            ? productLink.startsWith('http')
              ? productLink
              : `https://www.mercadolivre.com.br${productLink}`
            : '';

          // Extract product ID from URL
          const idMatch =
            productUrl.match(/MLB-(\d+)/) ||
            productUrl.match(/\/produto\/([^/?]+)/) ||
            productUrl.match(/\/item\/([^/?]+)/);
          const productId = idMatch
            ? idMatch[1]
            : `scraped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Image - try multiple attributes
          const imageUrl =
            $el.find('img').first().attr('src') ||
            $el.find('img').first().attr('data-src') ||
            $el.find('img').first().attr('data-lazy') ||
            $el.find('img').first().attr('data-original') ||
            '';

          // Condition
          const conditionText =
            $el.find('[class*="condition"], .item-condition').first().text().toLowerCase() ||
            $el.text().toLowerCase();
          const condition = conditionText.includes('novo')
            ? 'new'
            : conditionText.includes('usado')
              ? 'used'
              : 'not_specified';

          // Free shipping
          const freeShipping =
            $el.find('[class*="free-shipping"], [class*="frete-gratis"], .shipping-free').length >
              0 ||
            $el.text().toLowerCase().includes('frete grátis') ||
            $el.text().toLowerCase().includes('frete gratis');

          // Only add if we have minimum required data
          if (price > 0 && title && productUrl) {
            products.push({
              id: productId,
              title: title.substring(0, 200), // Limit title length
              price,
              original_price: originalPrice > price ? originalPrice : undefined,
              currency_id: 'BRL',
              condition,
              permalink: productUrl,
              thumbnail: imageUrl,
              shipping: {
                free_shipping: freeShipping,
              },
              available_quantity: 1,
            });
          }
        } catch (error: any) {
          logger.debug(`Error parsing product element: ${error.message}`);
        }
      });

      logger.info(`✅ Scraped ${products.length} products from Affiliates Hub`);
      return products;
    } catch (error: any) {
      logger.error('Error scraping Affiliates Hub:', {
        message: error.message,
        status: error.response?.status,
        url: hubUrl,
      });
      return [];
    }
  }

  /**
   * Collect products using scraping as fallback when API is rate-limited
   *
   * @param category - Product category
   * @param limit - Maximum products to collect
   * @returns Array of products
   */
  async collectViaScraping(
    _category: string = 'electronics',
    limit: number = 50
  ): Promise<MercadoLivreProduct[]> {
    try {
      logger.info('🕷️ Using scraping method to collect products (API fallback)');

      const allProducts: MercadoLivreProduct[] = [];

      // Try scraping the affiliates hub
      const hubProducts = await this.scrapeAffiliatesHub(
        'https://www.mercadolivre.com.br/afiliados/hub',
        limit
      );
      allProducts.push(...hubProducts);

      // Try scraping category pages
      const categoryUrls = [
        'https://www.mercadolivre.com.br/ofertas',
        'https://www.mercadolivre.com.br/ofertas/eletronicos',
        'https://www.mercadolivre.com.br/ofertas/celulares',
      ];

      for (const url of categoryUrls) {
        if (allProducts.length >= limit) break;

        try {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay between requests
          const products = await this.scrapeAffiliatesHub(
            url,
            Math.min(20, limit - allProducts.length)
          );

          // Add unique products
          for (const product of products) {
            if (!allProducts.find((p) => p.id === product.id)) {
              allProducts.push(product);
            }
          }
        } catch (error: any) {
          logger.debug(`Failed to scrape ${url}: ${error.message}`);
        }
      }

      logger.info(`🕷️ Total products collected via scraping: ${allProducts.length}`);
      return allProducts.slice(0, limit);
    } catch (error: any) {
      logger.error('Error in scraping collection:', error);
      return [];
    }
  }
}
