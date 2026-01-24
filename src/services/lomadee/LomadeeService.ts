import axios, { AxiosInstance } from 'axios';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  NetworkApiAbstract,
  NetworkApiConfig,
  NetworkMetadata,
} from '../affiliate/NetworkApiAbstract';

/**
 * Default Lomadee API URL templates
 * Uses {appToken} and {sourceId} substitution
 */
const DEFAULT_LOMADEE_API_CONFIG: NetworkApiConfig = {
  campaigns: 'https://api.lomadee.com/v3/{appToken}/advertiser/_all?sourceId={sourceId}',
  coupons: 'https://api.lomadee.com/v3/{appToken}/coupon/_all?sourceId={sourceId}',
  offers:
    'https://api.lomadee.com/v3/{appToken}/offer/_search?sourceId={sourceId}&keyword={keyword}',
  deeplink: 'https://api.lomadee.com/v2/{appToken}/deeplink/_create?sourceId={sourceId}&url={url}',
};

/**
 * Lomadee Affiliate Network Service
 * Popular Brazilian affiliate network with Magazine Luiza, Americanas, Submarino, etc.
 *
 * API Docs: https://developer.lomadee.com/
 *
 * Required credentials:
 * - App Token: Your Lomadee application token
 * - Source ID: Your traffic source identifier
 */
export class LomadeeService extends NetworkApiAbstract {
  private client: AxiosInstance;
  private enabled: boolean = false;

  constructor() {
    const { config, metadata, enabled } = LomadeeService.loadConfiguration();
    super(config, metadata);
    this.enabled = enabled;

    this.client = axios.create({
      baseURL: 'https://api.lomadee.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Load Lomadee configuration from config.json or environment variables
   */
  private static loadConfiguration(): {
    config: NetworkApiConfig;
    metadata: NetworkMetadata;
    enabled: boolean;
  } {
    let metadata: NetworkMetadata = {};
    let config: NetworkApiConfig = { ...DEFAULT_LOMADEE_API_CONFIG };
    let enabled = false;

    // Try environment variables first
    const envToken = process.env.LOMADEE_APP_TOKEN;
    const envSourceId = process.env.LOMADEE_SOURCE_ID;
    const envEnabled = process.env.LOMADEE_ENABLED === 'true';

    if (envToken) {
      metadata = {
        token: envToken,
        publisherId: envSourceId || '',
      };
      enabled = envEnabled;
    }

    // Override with config.json if exists
    try {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (fileConfig.lomadee) {
          metadata = {
            token: fileConfig.lomadee.appToken || envToken || '',
            publisherId: fileConfig.lomadee.sourceId || envSourceId || '',
          };
          enabled = fileConfig.lomadee.enabled ?? envEnabled;

          // Load custom API URLs if provided
          if (fileConfig.lomadee.apiLinks) {
            config = { ...config, ...fileConfig.lomadee.apiLinks };
          }

          logger.debug('✅ Lomadee config loaded from config.json');
        }
      }
    } catch (error) {
      logger.warn('⚠️ Could not load Lomadee config from config.json');
    }

    if (!metadata.token || !metadata.publisherId) {
      logger.warn('⚠️ Lomadee not configured - set LOMADEE_APP_TOKEN and LOMADEE_SOURCE_ID');
    }

    return { config, metadata, enabled };
  }

  /**
   * Check if Lomadee is configured and enabled
   */
  isConfigured(): boolean {
    return !!(this.metadata.token && this.metadata.publisherId && this.enabled);
  }

  /**
   * Get authorization headers for API requests
   * Lomadee uses App Token in URL, not headers
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get product feed - Lomadee uses offer search instead of feeds
   * This is a stub implementation for interface compliance
   */
  async getProductFeed(): Promise<Offer[]> {
    logger.warn('⚠️ Lomadee does not support product feeds. Use searchOffers() instead.');
    return [];
  }

  /**
   * Test connection to Lomadee API
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    if (!this.metadata.token || !this.metadata.publisherId) {
      return {
        success: false,
        message: 'Lomadee App Token ou Source ID não configurados',
      };
    }

    try {
      // Test by fetching advertisers
      if (!this.config.campaigns) {
        return { success: false, message: 'API campaigns URL não configurada' };
      }
      const url = this.formatUrl(this.config.campaigns);
      const response = await this.client.get(url);

      if (response.status === 200 && response.data?.advertisers) {
        const count = response.data.advertisers.length;
        return {
          success: true,
          message: `Conectado à Lomadee! ${count} anunciantes disponíveis`,
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
          message: 'App Token inválido ou expirado',
        };
      }
      return {
        success: false,
        message: `Erro: ${error.message}`,
      };
    }
  }

  /**
   * Get list of advertisers/campaigns
   */
  async getCampaigns(): Promise<any[]> {
    if (!this.isConfigured() || !this.config.campaigns) {
      return [];
    }

    try {
      logger.info('📡 Fetching Lomadee advertisers...');
      const url = this.formatUrl(this.config.campaigns);
      const response = await this.client.get(url);

      const advertisers = response.data?.advertisers || [];

      const campaigns = await Promise.all(
        advertisers.map(async (store: any) => {
          let finalUrl = store.link || '';

          // Try to resolve shortened URL
          try {
            finalUrl = (await this.resolveShortenedUrl(store.link, true)) || store.link;
          } catch {
            // Keep original URL
          }

          return {
            id: store.id,
            name: store.name,
            url: finalUrl,
            image: store.thumbnail || store.image,
            active: true,
            currencyCode: 'BRL',
            domain: new URL(finalUrl).hostname?.replace('www.', ''),
            commission: store.maxCommission || 0,
          };
        })
      );

      logger.info(`✅ Found ${campaigns.length} Lomadee advertisers`);
      return campaigns;
    } catch (error: any) {
      logger.error(`❌ Error fetching Lomadee campaigns: ${error.message}`);
      return [];
    }
  }

  /**
   * Get coupons from Lomadee
   */
  async getCoupons(): Promise<any[]> {
    if (!this.isConfigured() || !this.config.coupons) {
      return [];
    }

    try {
      logger.info('📡 Fetching Lomadee coupons...');
      const url = this.formatUrl(this.config.coupons);
      const response = await this.client.get(url);

      const coupons = response.data?.coupons || [];
      const result = [];

      for (const coupon of coupons) {
        let resolvedLink = coupon.link;

        try {
          resolvedLink = (await this.resolveShortenedUrl(coupon.link, true)) || coupon.link;
        } catch {
          // Keep original
        }

        result.push({
          title: coupon.description,
          description: coupon.description,
          code: coupon.code?.trim(),
          active: true,
          expiration: coupon.vigency ? new Date(coupon.vigency) : null,
          link: resolvedLink,
          advertiser: coupon.store?.id,
          promotionId: coupon.id,
          deeplink: coupon.link,
        });
      }

      logger.info(`✅ Found ${result.length} Lomadee coupons`);
      return result;
    } catch (error: any) {
      logger.error(`❌ Error fetching Lomadee coupons: ${error.message}`);
      return [];
    }
  }

  /**
   * Search offers by keyword
   */
  async searchOffers(keyword: string, limit: number = 50): Promise<Offer[]> {
    if (!this.isConfigured() || !this.config.offers) {
      return [];
    }

    try {
      logger.info(`📡 Searching Lomadee offers for: ${keyword}`);

      // Format URL with keyword
      const baseUrl = this.formatUrl(this.config.offers);
      const url = baseUrl.replace('{keyword}', encodeURIComponent(keyword));

      const response = await this.client.get(url);
      const offers = response.data?.offers || [];

      const result: Offer[] = [];

      for (let i = 0; i < Math.min(offers.length, limit); i++) {
        const offer = offers[i];
        const now = new Date();

        const converted: Offer = {
          title: offer.name || offer.title || '',
          description: offer.description || offer.name || '',
          originalPrice: offer.priceFrom || offer.price || 0,
          currentPrice: offer.price || 0,
          discount: (offer.priceFrom || 0) - (offer.price || 0),
          discountPercentage: this.calculateDiscount(offer.priceFrom, offer.price),
          currency: 'BRL',
          imageUrl: offer.thumbnail || offer.image || '',
          productUrl: offer.link || '',
          affiliateUrl: offer.link || '', // Already has affiliate tracking
          source: 'lomadee',
          category: offer.category?.name || 'outros',
          brand: offer.store?.name || '',
          isActive: true,
          isPosted: false,
          tags: ['lomadee', offer.store?.name?.toLowerCase() || ''].filter(Boolean),
          createdAt: now,
          updatedAt: now,
        };

        if (converted.currentPrice > 0 && converted.title) {
          result.push(converted);
        }
      }

      logger.info(`✅ Found ${result.length} Lomadee offers for "${keyword}"`);
      return result;
    } catch (error: any) {
      logger.error(`❌ Error searching Lomadee offers: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate deeplink for a product URL
   */
  async getDeeplink(destinationUrl: string): Promise<string | null> {
    if (!this.isConfigured() || !this.config.deeplink) {
      logger.warn('⚠️ Lomadee not configured, cannot generate link');
      return null;
    }

    try {
      const baseUrl = this.formatUrl(this.config.deeplink);
      const url = baseUrl.replace('{url}', encodeURIComponent(destinationUrl));

      const response = await this.client.get(url);

      const deeplinks = response.data?.deeplinks || [];
      if (deeplinks.length > 0) {
        const deeplink = deeplinks[0].deeplink;
        logger.debug(`✅ Generated Lomadee deeplink: ${deeplink}`);
        return deeplink;
      }

      return null;
    } catch (error: any) {
      logger.error(`❌ Error generating Lomadee deeplink: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate discount percentage
   */
  private calculateDiscount(originalPrice: number, currentPrice: number): number {
    if (!originalPrice || originalPrice <= currentPrice) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }
}
