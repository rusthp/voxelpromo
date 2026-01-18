import axios from 'axios';
import { join } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { logger } from '../../utils/logger';
import { Offer } from '../../types';
import { UrlShortenerService } from '../link/UrlShortenerService';
import crypto from 'crypto';

interface MercadoLivreConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  affiliateCode?: string;
  codeVerifier?: string;
  // Internal API for affiliate links (Phase 1 - Personal Use)
  sessionCookies?: string;  // Full cookie string from logged-in session
  csrfToken?: string;       // x-csrf-token from affiliate page
  affiliateTag?: string;    // Your affiliate tag (e.g., "voxelpromo")
}

export interface MercadoLivreProduct {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number | string;
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
  discount_percentage?: number; // Scraped discount percentage from badge
  seller_id?: number;
  seller?: {
    id: number;
    nickname: string;
    reputation?: {
      level_id?: string;
      transactions?: {
        completed: number;
        canceled: number;
        period: string;
      };
    };
  };
  attributes?: Array<{
    id: string;
    name: string;
    value_name: string;
  }>;
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
  private scraper: any = null;
  private urlShortener: UrlShortenerService | null = null;

  private getUrlShortener(): UrlShortenerService {
    if (!this.urlShortener) {
      this.urlShortener = new UrlShortenerService();
    }
    return this.urlShortener;
  }

  private needsShortening(url: string): boolean {
    // Already our short link
    if (url.includes('voxelpromo.com/s/') || url.includes('/s/')) return false;

    // Official ML short link
    if (url.includes('mercadolivre.com/sec/')) return false;

    // Link is already short enough (e.g. < 40 chars)
    if (url.length < 40) return false;

    return true;
  }

  // Cache em memória para resultados de busca
  private searchCache = new Map<string, CacheEntry<MercadoLivreProduct[]>>();
  private cacheDuration = 10 * 60 * 1000; // 10 minutos

  // Controle de rate limiting
  private lastRequestTime = 0;
  private minRequestDelay = 250; // 250ms entre requisições

  // Helper for PKCE
  private base64URLEncode(str: Buffer): string {
    return str.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private sha256(buffer: Buffer): Buffer {
    return crypto.createHash('sha256').update(buffer).digest();
  }

  private generatePKCE() {
    const codeVerifier = this.base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = this.base64URLEncode(this.sha256(Buffer.from(codeVerifier)));
    return { codeVerifier, codeChallenge };
  }

  getConfig(): MercadoLivreConfig {
    // Try to load from config.json first
    try {
      const configPath = join(process.cwd(), 'config.json');

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.mercadolivre?.clientId || config.mercadolivre?.sessionCookies) {
          return {
            clientId: config.mercadolivre.clientId || '',
            clientSecret: config.mercadolivre.clientSecret || '',
            redirectUri: config.mercadolivre.redirectUri || 'https://proplaynews.com.br/',
            accessToken: config.mercadolivre.accessToken,
            refreshToken: config.mercadolivre.refreshToken,
            tokenExpiresAt: config.mercadolivre.tokenExpiresAt,
            affiliateCode: process.env.MERCADOLIVRE_AFFILIATE_CODE || config.mercadolivre.affiliateCode,
            codeVerifier: config.mercadolivre.codeVerifier,
            // Internal API config
            sessionCookies: config.mercadolivre.sessionCookies,
            csrfToken: config.mercadolivre.csrfToken,
            affiliateTag: config.mercadolivre.affiliateTag,
          };
        }
      }
    } catch (error) {
      // Fall back to environment variables
    }

    return {
      clientId: process.env.MERCADOLIVRE_CLIENT_ID || '',
      clientSecret: process.env.MERCADOLIVRE_CLIENT_SECRET || '',
      redirectUri: process.env.MERCADOLIVRE_REDIRECT_URI || 'https://proplaynews.com.br/',
      accessToken: process.env.MERCADOLIVRE_ACCESS_TOKEN,
      refreshToken: process.env.MERCADOLIVRE_REFRESH_TOKEN,
      tokenExpiresAt: process.env.MERCADOLIVRE_TOKEN_EXPIRES_AT
        ? parseInt(process.env.MERCADOLIVRE_TOKEN_EXPIRES_AT)
        : undefined,
      affiliateCode: process.env.MERCADOLIVRE_AFFILIATE_CODE,
      codeVerifier: process.env.MERCADOLIVRE_CODE_VERIFIER,
      // Internal API config from env
      sessionCookies: process.env.MERCADOLIVRE_SESSION_COOKIES,
      csrfToken: process.env.MERCADOLIVRE_CSRF_TOKEN,
      affiliateTag: process.env.MERCADOLIVRE_AFFILIATE_TAG,
    };
  }

  getAuthorizationUrl(state?: string): { url: string; codeVerifier: string } {
    const config = this.getConfig();
    const { codeVerifier, codeChallenge } = this.generatePKCE();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (state) {
      params.append('state', state);
    }

    return {
      url: `${this.authUrl}/authorization?${params.toString()}`,
      codeVerifier
    };
  }

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

    // PKCE requires code_verifier if it was sent during auth
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri,
    });

    if (config.codeVerifier) {
      params.append('code_verifier', config.codeVerifier);
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        params,
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

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      const status = error.response?.status;
      const isRateLimit = status === 429;
      const isPolicyAgent = status === 403 && error.response?.data?.blocked_by === 'PolicyAgent';

      if ((isRateLimit || isPolicyAgent) && attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logger.warn(
          `Rate limit or PolicyAgent block (${status}). Retrying in ${waitTime}ms... (attempt ${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.retryRequest(requestFn, maxRetries, attempt + 1);
      }
      throw error;
    }
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestDelay) {
      const waitTime = this.minRequestDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private getCacheKey(keyword: string, limit: number, options?: any): string {
    const optionsStr = JSON.stringify(options || {});
    return `search:${keyword}:${limit}:${optionsStr}`;
  }

  private getCachedResults(cacheKey: string): MercadoLivreProduct[] | null {
    const cached = this.searchCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.expiresAt) {
      this.searchCache.delete(cacheKey);
      return null;
    }

    logger.debug(`Using cached search results for key: ${cacheKey.substring(0, 50)}...`);
    return cached.data;
  }

  private cacheResults(cacheKey: string, data: MercadoLivreProduct[]): void {
    const now = Date.now();
    this.searchCache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + this.cacheDuration,
    });

    if (this.searchCache.size > 1000) {
      const entries = Array.from(this.searchCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - 1000);
      toRemove.forEach(([key]) => this.searchCache.delete(key));
    }
  }

  /**
   * Save tokens to config.json
   */
  private saveTokensToConfig(accessToken: string, refreshToken: string, expiresIn: number): void {
    try {
      const configPath = join(process.cwd(), 'config.json');
      let config: any = {};

      if (existsSync(configPath)) {
        config = JSON.parse(readFileSync(configPath, 'utf-8'));
      }

      if (!config.mercadolivre) {
        config.mercadolivre = {};
      }

      config.mercadolivre.accessToken = accessToken;
      config.mercadolivre.refreshToken = refreshToken;
      config.mercadolivre.tokenExpiresAt = Date.now() + expiresIn * 1000;

      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.info('💾 Tokens saved to config.json');
    } catch (error) {
      logger.error('❌ Failed to save tokens to config:', error);
    }
  }

  /**
   * Check if token is expired and auto-refresh if needed
   */
  private async ensureValidToken(): Promise<string> {
    const config = this.getConfig();

    if (!config.accessToken) {
      throw new Error('Access token not configured. Please authenticate first.');
    }

    // Check if token is expired (or will expire in next 5 minutes)
    if (config.tokenExpiresAt) {
      const now = Date.now();
      const expiresAt = config.tokenExpiresAt;
      const fiveMinutes = 5 * 60 * 1000;

      if (now >= expiresAt - fiveMinutes) {
        logger.info('🔄 Token expired or expiring soon, refreshing...');
        try {
          const refreshed = await this.refreshAccessToken();

          // Save the refreshed tokens automatically
          this.saveTokensToConfig(
            refreshed.access_token,
            refreshed.refresh_token,
            refreshed.expires_in
          );

          logger.info('✅ Token auto-refreshed and saved successfully');
          return refreshed.access_token;
        } catch (error) {
          logger.error('❌ Failed to auto-refresh token:', error);
          throw error;
        }
      }
    }

    return config.accessToken;
  }

  /**
   * Get trending products (Hot Items) from Mercado Livre
   * Uses public API to avoid 403 errors
   */
  async getTrendingProducts(limit: number = 20): Promise<MercadoLivreProduct[]> {
    try {
      logger.info('🔥 Fetching trending products from Mercado Livre...');

      // Use authenticated endpoint 
      const accessToken = await this.ensureValidToken();

      const response = await this.retryRequest(async () => {
        return await axios.get(`${this.baseUrl}/trends/MLB`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
          timeout: 10000,
        });
      });

      const trends = response.data || [];
      logger.info(`✅ Found ${trends.length} trending products`);

      // Trends API returns keywords/search terms, not product IDs directly
      const trendKeywords = trends
        .slice(0, Math.min(limit, trends.length))
        .map((trend: any) => trend.keyword || trend.url || trend)
        .filter((keyword: any) => typeof keyword === 'string');

      logger.info(`📊 Searching for ${trendKeywords.length} trending keywords...`);

      // Search for products using trending keywords
      const allProducts: MercadoLivreProduct[] = [];

      for (const keyword of trendKeywords.slice(0, 5)) { // Limit to 5 keywords to avoid rate limiting
        try {
          // Use the main search method which now includes Fallback to HTML Scraping
          const validProducts = await this.searchProducts(keyword, 4);
          allProducts.push(...validProducts);

          if (validProducts.length > 0) {
            logger.debug(`  ✓ "${keyword}": found ${validProducts.length} products`);
          } else {
            logger.debug(`  - "${keyword}": no products found`);
          }
        } catch (error: any) {
          logger.warn(`  ✗ Failed to search for "${keyword}": ${error.message}`);
        }
      }

      logger.info(`✅ Retrieved ${allProducts.length} trending products with prices`);
      return allProducts.slice(0, limit);

    } catch (error: any) {
      logger.error('❌ Error fetching trending products:', error.message);
      if (error.response) {
        logger.error(`Response Data: ${JSON.stringify(error.response.data)}`);
      }
      return [];
    }
  }

  /**
   * Alias for getTrendingProducts to satisfy CollectorService
   */
  async getHotDeals(limit: number = 20): Promise<MercadoLivreProduct[]> {
    return this.getTrendingProducts(limit);
  }

  /**
   * Search products using PUBLIC Search API (no authentication needed, returns prices directly)
   */
  async searchProducts(keyword: string, limit: number = 50, options?: any): Promise<MercadoLivreProduct[]> {
    try {
      const cacheKey = this.getCacheKey(keyword, limit, options);
      const cached = this.getCachedResults(cacheKey);
      if (cached) return cached;

      await this.throttleRequest();

      const validLimit = Math.min(Math.max(limit, 1), 50);

      logger.info(`🔍 Searching Mercado Livre for "${keyword}"...`);

      // ⚠️ Auth failed with 403 (PolicyAgent), so we try Public API with enhanced headers
      // to mimic a real browser and bypass WAF
      const searchResponse = await this.retryRequest(async () => {
        return await axios.get(`${this.baseUrl}/sites/MLB/search`, {
          params: {
            q: keyword,
            limit: validLimit,
            sort: options?.sort || 'relevance',
            condition: options?.condition || 'new',
          },
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'max-age=0',
            'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          },
          timeout: 10000,
        });
      });

      const results = searchResponse.data.results || [];
      logger.info(`✅ Found ${results.length} products from search`);

      // Filter products with valid prices
      const validProducts = results.filter((p: any) => p.price && p.price > 0);
      logger.info(`✅ ${validProducts.length} products have valid prices`);

      this.cacheResults(cacheKey, validProducts);
      return validProducts;

    } catch (error: any) {
      logger.error('Error searching Mercado Livre products via API:', error.message);
      if (error.response) {
        logger.error(`Response Data: ${JSON.stringify(error.response.data)}`);
      }

      // Fallback to HTML Scraping
      logger.warn('⚠️ API failed, attempting HTML scraping fallback...');
      const scrapedProducts = await this.scrapeSearchProducts(keyword, limit);

      if (scrapedProducts.length > 0) {
        const cacheKey = this.getCacheKey(keyword, limit, options);
        this.cacheResults(cacheKey, scrapedProducts);
        return scrapedProducts;
      }

      return [];
    }
  }

  async getProductDetails(itemId: string): Promise<MercadoLivreProduct | null> {
    try {
      await this.throttleRequest();

      // Try primary endpoint first: /items/{id}
      try {
        const response = await this.retryRequest(async () => {
          return await axios.get(`${this.baseUrl}/items/${itemId}`, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 10000,
          });
        });
        return response.data;
      } catch (primaryError: any) {
        logger.warn(`Primary endpoint /items/ failed for ${itemId}, trying /pdp/item/ fallback...`);

        // Fallback to /pdp/item/ endpoint - always returns correct price
        const fallbackResponse = await axios.get(`${this.baseUrl}/pdp/item/${itemId}`, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 10000,
        });

        const pdpData = fallbackResponse.data;

        // Map PDP response to MercadoLivreProduct format
        return {
          id: pdpData.id || itemId,
          title: pdpData.title || '',
          price: pdpData.price || pdpData.price_info?.price || 0,
          original_price: pdpData.original_price || pdpData.price_info?.original_price,
          currency_id: pdpData.currency_id || 'BRL',
          available_quantity: pdpData.available_quantity || 1,
          condition: pdpData.condition || 'new',
          permalink: pdpData.permalink || `https://www.mercadolivre.com.br/p/${itemId}`,
          thumbnail: pdpData.thumbnail || (pdpData.pictures?.[0]?.url) || '',
          pictures: pdpData.pictures || [],
        };
      }
    } catch (error: any) {
      logger.warn(`Failed to fetch details for ${itemId} from both endpoints: ${error.message}`);
      return null;
    }
  }

  async getCategoryPrediction(title: string): Promise<string | null> {
    try {
      // Use public endpoint
      const response = await this.retryRequest(async () => {
        return await axios.get(`${this.baseUrl}/sites/MLB/domain_discovery/search`, {
          params: { q: title, limit: 1 },
          headers: {
            // No Authorization header
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 5000,
        });
      });

      if (response.data && response.data.length > 0) {
        return response.data[0].category_name;
      }
      return null;
    } catch (error) {
      logger.warn(`Failed to predict category for "${title}":`, error);
      return null;
    }
  }


  /**
   * Generate affiliate link using Mercado Livre's internal API (createLink)
   * This requires valid session cookies and CSRF token from a logged-in session
   * 
   * @param productUrl - The original product URL to convert
   * @returns The short affiliate URL (e.g., https://mercadolivre.com/sec/...)
   */
  async generateAffiliateLink(productUrl: string): Promise<string | null> {
    const config = this.getConfig();

    // Check if internal API is configured
    if (!config.sessionCookies || !config.csrfToken) {
      logger.debug('🔗 Internal API not configured, will use fallback method');
      return null;
    }

    const tag = config.affiliateTag || 'voxelpromo';

    try {
      logger.info(`🔗 Generating affiliate link via internal API for: ${productUrl.substring(0, 60)}...`);

      // Sanitize cookies: remove line breaks and other invalid header characters
      let sanitizedCookies = config.sessionCookies || '';
      sanitizedCookies = sanitizedCookies
        .replace(/[\r\n]+/g, '') // Remove line breaks
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .trim();

      if (!sanitizedCookies) {
        logger.warn('⚠️ No valid session cookies found');
        return null;
      }

      const response = await axios.post(
        'https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink',
        {
          urls: [productUrl],
          tag: tag,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': config.csrfToken,
            'Cookie': sanitizedCookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Origin': 'https://www.mercadolivre.com.br',
            'Referer': 'https://www.mercadolivre.com.br/affiliate-program/link-builder',
          },
          timeout: 15000,
        }
      );

      if (response.data?.urls?.[0]?.short_url) {
        const shortUrl = response.data.urls[0].short_url;
        logger.info(`✅ Affiliate link generated: ${shortUrl}`);
        return shortUrl;
      }

      logger.warn('⚠️ Internal API response missing short_url:', response.data);
      return null;
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        logger.error('❌ Session expired or invalid. Please update cookies and csrf-token in settings.');
      } else {
        logger.error(`❌ Failed to generate affiliate link via internal API: ${error.message}`);
      }
      return null;
    }
  }

  private buildAffiliateLink(productUrl: string, _itemId: string): string {
    const config = this.getConfig();
    const affiliateCode = config.affiliateCode;

    if (!affiliateCode || affiliateCode.trim() === '') {
      return productUrl;
    }

    try {
      // If affiliateCode is a Social Link URL (contains matt_tool or matt_word)
      if (affiliateCode.startsWith('http://') || affiliateCode.startsWith('https://')) {
        const affiliateUrlObj = new URL(affiliateCode);
        const productUrlObj = new URL(productUrl);

        // Check for ML Social Link format (matt_tool, matt_word)
        const mattTool = affiliateUrlObj.searchParams.get('matt_tool');
        const mattWord = affiliateUrlObj.searchParams.get('matt_word');

        if (mattTool || mattWord) {
          // ML Social Link format - apply matt_* params
          if (mattTool) productUrlObj.searchParams.set('matt_tool', mattTool);
          if (mattWord) productUrlObj.searchParams.set('matt_word', mattWord);

          // Add tracking params for better attribution
          productUrlObj.searchParams.set('forceInApp', 'true');

          // Generate unique tracking_id for each link (UUID v4 format)
          const trackingId = crypto.randomUUID();
          productUrlObj.searchParams.set('tracking_id', trackingId);

          logger.debug(`🔗 ML Affiliate Link built with matt_tool=${mattTool}, matt_word=${mattWord}`);
          return productUrlObj.toString();
        }

        // Generic URL format - copy all params except ref (session-specific)
        logger.debug(`🔗 Parsing Affiliate URL: ${affiliateCode.substring(0, 80)}...`);

        affiliateUrlObj.searchParams.forEach((value, key) => {
          // Skip 'ref' as it's session-specific and shouldn't be reused
          if (key !== 'ref') {
            productUrlObj.searchParams.set(key, value);
          }
        });

        return productUrlObj.toString();
      }

      // Simple code format (just the affiliate ID)
      const url = new URL(productUrl);

      // Critical check for placeholder
      if (affiliateCode === 'your-affiliate-code-or-url' || affiliateCode.includes('your-affiliate')) {
        logger.warn(`⚠️ Affiliate code is placeholder '${affiliateCode}'. Returning original URL.`);
        return productUrl;
      }

      // If it looks like a matt_tool ID (numeric), use matt_tool param
      if (/^\d+$/.test(affiliateCode.trim())) {
        url.searchParams.set('matt_tool', affiliateCode.trim());
        url.searchParams.set('tracking_id', crypto.randomUUID());
        return url.toString();
      }

      // Legacy format - append as 'a' param
      url.searchParams.set('a', affiliateCode);
      return url.toString();
    } catch (error) {
      logger.error('Error building affiliate link:', error);
      // Fallback for malformed URLs
      const separator = productUrl.includes('?') ? '&' : '?';
      return `${productUrl}${separator}matt_tool=${encodeURIComponent(affiliateCode)}`;
    }
  }


  async convertToOffer(product: MercadoLivreProduct, category: string = 'electronics'): Promise<Offer | null> {
    try {
      const currentPrice = product.sale_price || product.price || 0;
      const originalPrice = product.original_price || product.base_price || product.price || currentPrice;

      // Prioritize scraped discount percentage from badge, fallback to calculated
      let discountPercentage = product.discount_percentage || 0;

      if (!discountPercentage && originalPrice > currentPrice) {
        discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      }

      if (currentPrice <= 0) return null;

      let affiliateLink = product.permalink;

      // Priority 1: Try Internal API (createLink) - most reliable
      const internalLink = await this.generateAffiliateLink(product.permalink);
      if (internalLink) {
        affiliateLink = internalLink;
      } else {
        // Priority 2: Use Puppeteer/Scraper if configured
        const generatorEndpoint = process.env.MERCADOLIVRE_LINK_GENERATOR_ENDPOINT;
        if (generatorEndpoint) {
          try {
            if (!this.scraper) {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { MercadoLivreScraper } = require('./MercadoLivreScraper');
              this.scraper = MercadoLivreScraper.getInstance();
            }
            affiliateLink = await this.scraper.generateAffiliateLink(product.permalink);
          } catch (e) {
            logger.warn(`⚠️ Failed to generate affiliate link via scraper, falling back to standard: ${e}`);
            affiliateLink = this.buildAffiliateLink(product.permalink, product.id);
          }
        } else {
          // Priority 3: Legacy/Standard method (URL param appending)
          affiliateLink = this.buildAffiliateLink(product.permalink, product.id);
        }
      }

      // Final check: Apply internal shortener fallback if link is still long
      if (this.needsShortening(affiliateLink)) {
        try {
          const shortener = this.getUrlShortener();
          // Pass offerId if we have it, although we are creating the offer now so we might not have the ID yet if it's new.
          // But we can update it later or just track the source.
          const shortLinkDoc = await shortener.createShortLink(affiliateLink, {
            source: 'mercadolivre_fallback',
            offerId: product.id // Use product ID as reference for now
          });

          if (shortLinkDoc && shortLinkDoc.shortUrl) {
            affiliateLink = shortLinkDoc.shortUrl;
            logger.info(`✂️ Shortened long ML link for ${product.id}`);
          }
        } catch (shortenerError: any) {
          logger.warn('⚠️ Failed to shorten ML link (using original):', shortenerError.message);
          // Fallback is automatic: affiliateLink remains the long version
        }
      }

      return {
        title: product.title,
        description: `Oferta Mercado Livre: ${product.title}`,
        originalPrice: originalPrice > currentPrice ? originalPrice : 0,
        currentPrice: currentPrice,
        discount: originalPrice > currentPrice ? originalPrice - currentPrice : 0,
        discountPercentage: discountPercentage > 0 ? discountPercentage : 0,
        currency: product.currency_id || 'BRL',
        imageUrl: product.pictures && product.pictures.length > 0 ? product.pictures[0].url : product.thumbnail,
        productUrl: product.permalink,
        affiliateUrl: affiliateLink,
        source: 'mercadolivre',
        category: category,
        tags: ['mercadolivre', category],
        isActive: true,
        isPosted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        availability: Number(product.available_quantity) > 0 ? 'in_stock' : 'out_of_stock',
      };
    } catch (error) {
      logger.error(`Error converting product ${product.id} to offer:`, error);
      return null;
    }

  }


  /**
   * Scrape search results using Hybrid Strategy (Puppeteer Stealth + Axios)
   */
  private async scrapeSearchProducts(keyword: string, limit: number = 50): Promise<MercadoLivreProduct[]> {
    try {
      logger.info(`🕷️ Hybrid Scraping Mercado Livre for "${keyword}"...`);

      // Lazy load scraper to avoid overhead if not needed
      if (!this.scraper) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MercadoLivreScraper } = require('./MercadoLivreScraper');
        this.scraper = MercadoLivreScraper.getInstance();
      }

      const encodedKeyword = encodeURIComponent(keyword).replace(/%20/g, '-');
      const url = `https://lista.mercadolivre.com.br/${encodedKeyword}`;

      let html = '';

      // Step 1: Try Axios with Stealth Headers (Fast)
      try {
        const headers = await this.scraper.getHeaders();
        const response = await axios.get(url, { headers, timeout: 15000 });
        html = response.data;
      } catch (axiosError) {
        logger.warn('⚠️ Axios with Stealth Headers failed, switching to Full Browser Scraping...');
        // Step 2: Fallback to Full Browser DOM Extraction (Slow but Robust)
        return await this.scraper.scrapeSearchResults(url);
      }

      const products: MercadoLivreProduct[] = [];

      // Regex Extraction (Legacy fallback for Axios response)
      const itemRegex = /<li class="ui-search-layout__item".*?>(.*?)<\/li>/gs;
      let match;

      while ((match = itemRegex.exec(html)) !== null && products.length < limit) {
        const itemHtml = match[1];
        try {
          // Extract Title
          const titleMatch = itemHtml.match(/<h2[^>]*>(.*?)<\/h2>/) || itemHtml.match(/class="ui-search-item__title"[^>]*>(.*?)<\/a>/);
          const title = titleMatch ? titleMatch[1].trim() : '';

          // Extract URL
          const urlMatch = itemHtml.match(/href="(https:\/\/www\.mercadolivre\.com\.br\/[^"]+)"/);
          const permalink = urlMatch ? urlMatch[1] : '';

          // Extract ID
          let id = '';
          if (permalink) {
            const idMatch = permalink.match(/(MLB-?\d+)/i) || permalink.match(/\/p\/(MLB\d+)/);
            id = idMatch ? idMatch[1].replace('-', '') : '';
          }

          // Extract Price
          const priceMatch = itemHtml.match(/<span class="andes-money-amount__fraction">([\d.]+)<\/span>/);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '')) : 0;

          // Extract Thumbnail
          const imgMatch = itemHtml.match(/src="(https:\/\/[^"]+)"/);
          const thumbnail = imgMatch ? imgMatch[1] : '';

          if (title && price > 0 && permalink) {
            products.push({
              id: id || `MLB${Date.now()}${Math.random().toString().slice(2, 5)}`,
              title,
              price,
              currency_id: 'BRL',
              available_quantity: 1,
              condition: 'new',
              permalink,
              thumbnail,
              pictures: [{ url: thumbnail }]
            });
          }
        } catch (err) {
          // Skip item
        }
      }

      logger.info(`✅ Hybrid Scraper found ${products.length} products`);
      return products;

    } catch (error: any) {
      logger.error(`❌ Hybrid Scraping failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Scrape "Ofertas do Dia" page (Page 1 only)
   */
  async getDailyDeals(): Promise<MercadoLivreProduct[]> {
    try {
      logger.info('🔥 Fetching Daily Deals from Mercado Livre...');

      // Lazy load scraper
      if (!this.scraper) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MercadoLivreScraper } = require('./MercadoLivreScraper');
        this.scraper = MercadoLivreScraper.getInstance();
      }

      return await this.scraper.scrapeDailyDeals();
    } catch (error: any) {
      logger.error(`❌ Failed to fetch daily deals: ${error.message}`);
      return [];
    }
  }
}
