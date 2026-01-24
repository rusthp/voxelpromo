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
 * Default Afilio API URL templates
 * Uses {token} and {publisherId} substitution
 */
const DEFAULT_AFILIO_API_CONFIG: NetworkApiConfig = {
  campaigns: 'https://api.afilio.com.br/feed/affiliate/v2/campaigns?token={token}',
  coupons: 'https://api.afilio.com.br/feed/affiliate/v2/coupons?token={token}',
  deeplink: 'https://api.afilio.com.br/feed/affiliate/v2/deeplink?token={token}&url={url}',
};

/**
 * Afilio Affiliate Network Service
 * Popular Brazilian affiliate network
 *
 * Required credentials:
 * - API Token: Your Afilio affiliate API token
 */
export class AfilioService extends NetworkApiAbstract {
  private client: AxiosInstance;
  private enabled: boolean = false;

  constructor() {
    const { config, metadata, enabled } = AfilioService.loadConfiguration();
    super(config, metadata);
    this.enabled = enabled;

    this.client = axios.create({
      baseURL: 'https://api.afilio.com.br',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Load Afilio configuration from config.json or environment variables
   */
  private static loadConfiguration(): {
    config: NetworkApiConfig;
    metadata: NetworkMetadata;
    enabled: boolean;
  } {
    let metadata: NetworkMetadata = {};
    let config: NetworkApiConfig = { ...DEFAULT_AFILIO_API_CONFIG };
    let enabled = false;

    // Try environment variables first
    const envToken = process.env.AFILIO_API_TOKEN;
    const envEnabled = process.env.AFILIO_ENABLED === 'true';

    if (envToken) {
      metadata = { token: envToken };
      enabled = envEnabled;
    }

    // Override with config.json if exists
    try {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (fileConfig.afilio) {
          metadata = { token: fileConfig.afilio.apiToken || envToken || '' };
          enabled = fileConfig.afilio.enabled ?? envEnabled;

          // Load custom API URLs if provided
          if (fileConfig.afilio.apiLinks) {
            config = { ...config, ...fileConfig.afilio.apiLinks };
          }

          logger.debug('✅ Afilio config loaded from config.json');
        }
      }
    } catch (error) {
      logger.warn('⚠️ Could not load Afilio config from config.json');
    }

    if (!metadata.token) {
      logger.warn('⚠️ Afilio not configured - set AFILIO_API_TOKEN');
    }

    return { config, metadata, enabled };
  }

  /**
   * Check if Afilio is configured and enabled
   */
  isConfigured(): boolean {
    return !!(this.metadata.token && this.enabled);
  }

  /**
   * Get authorization headers for API requests
   */
  protected getAuthHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  /**
   * Get product feed - Afilio doesn't support product feeds
   */
  async getProductFeed(): Promise<Offer[]> {
    logger.warn('⚠️ Afilio does not support product feeds.');
    return [];
  }

  /**
   * Test connection to Afilio API
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    if (!this.metadata.token) {
      return { success: false, message: 'Afilio API Token não configurado' };
    }

    try {
      if (!this.config.campaigns) {
        return { success: false, message: 'API campaigns URL não configurada' };
      }
      const url = this.formatUrl(this.config.campaigns);
      const response = await this.client.get(url);

      if (response.status === 200) {
        const campaigns = response.data?.[0]?.['Affiliate Campaign'] || [];
        return {
          success: true,
          message: `Conectado à Afilio! ${Object.keys(campaigns).length} campanhas disponíveis`,
          data: response.data,
        };
      }

      return { success: false, message: `Resposta inesperada: ${response.status}` };
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { success: false, message: 'API Token inválido ou expirado' };
      }
      return { success: false, message: `Erro: ${error.message}` };
    }
  }

  /**
   * Get campaigns from Afilio
   */
  async getCampaigns(): Promise<any[]> {
    if (!this.isConfigured() || !this.config.campaigns) {
      return [];
    }

    try {
      logger.info('📡 Fetching Afilio campaigns...');
      const url = this.formatUrl(this.config.campaigns);
      const response = await this.client.get(url);

      const data = response.status === 200 ? response.data : {};
      const campaigns = data[0]?.['Affiliate Campaign'] || {};
      const result = [];

      for (const key in campaigns) {
        const campaign = campaigns[key];
        const urlParsed = new URL(campaign.url || 'https://example.com');
        const domain = urlParsed.hostname?.replace('www.', '');

        result.push({
          id: campaign.campaign_id,
          name: campaign.campaign_name?.split(' | ')[0] || '',
          description: campaign.campaign_description || '',
          url: campaign.url?.split('?')[0] || '',
          image: '',
          active: campaign.campaign_status === 1,
          currencyCode: campaign.commissions?.[0]?.currency || 'BRL',
          sector: campaign.category_name || '',
          domain: domain,
        });
      }

      logger.info(`✅ Found ${result.length} Afilio campaigns`);
      return result;
    } catch (error: any) {
      logger.error(`❌ Error fetching Afilio campaigns: ${error.message}`);
      return [];
    }
  }

  /**
   * Get coupons from Afilio
   */
  async getCoupons(): Promise<any[]> {
    if (!this.isConfigured() || !this.config.coupons) {
      return [];
    }

    try {
      logger.info('📡 Fetching Afilio coupons...');
      const url = this.formatUrl(this.config.coupons);
      const response = await this.client.get(url);

      const data = response.status === 200 ? response.data : [];
      const coupons = data[0] || {};
      const result = [];

      for (const key in coupons) {
        const coupon = coupons[key];
        let resolvedLink = coupon.shortened || '';

        try {
          resolvedLink =
            (await this.resolveShortenedUrl(coupon.shortened, true)) || coupon.shortened;
        } catch {
          // Keep original
        }

        const isIndefinite = coupon.expiration_date === 'Indefinido';
        const expirationDate = isIndefinite ? null : new Date(coupon.expiration_date);
        const isActive = isIndefinite || (expirationDate && expirationDate > new Date());

        result.push({
          title: coupon.title,
          description: coupon.description,
          code: coupon.code?.trim(),
          active: isActive,
          expiration: expirationDate,
          link: resolvedLink,
          advertiser: coupon.id_campaign,
          promotionId: coupon.creative_id,
          deeplink: coupon.shortened,
        });
      }

      logger.info(`✅ Found ${result.length} Afilio coupons`);
      return result;
    } catch (error: any) {
      logger.error(`❌ Error fetching Afilio coupons: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate deeplink for a product URL
   */
  async getDeeplink(destinationUrl: string): Promise<string | null> {
    if (!this.isConfigured() || !this.config.deeplink) {
      logger.warn('⚠️ Afilio not configured, cannot generate link');
      return null;
    }

    try {
      const baseUrl = this.formatUrl(this.config.deeplink);
      const url = baseUrl.replace('{url}', encodeURIComponent(destinationUrl));
      const response = await this.client.get(url);

      if (response.status === 200 && response.data?.deeplink) {
        const deeplink = response.data.deeplink;
        logger.debug(`✅ Generated Afilio deeplink: ${deeplink}`);
        return deeplink;
      }

      // Fallback: resolve shortened URL
      return await this.resolveShortenedUrl(destinationUrl, true);
    } catch (error: any) {
      logger.error(`❌ Error generating Afilio deeplink: ${error.message}`);
      return null;
    }
  }
}
