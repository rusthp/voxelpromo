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
 * Default Rakuten API URL templates
 */
const DEFAULT_RAKUTEN_API_CONFIG: NetworkApiConfig = {
  campaigns: 'https://api.linksynergy.com/v1/advertisers',
  coupons: 'https://api.linksynergy.com/coupon/1.0/json/promotionTypes/promoCode,sale',
  deeplink: 'https://api.linksynergy.com/v1/deeplink',
};

/**
 * Rakuten Affiliate Network Service (LinkShare)
 * International affiliate network
 *
 * Required credentials:
 * - Client ID: Your Rakuten application client ID
 * - Client Secret: Your Rakuten application client secret
 * - SID: Your Rakuten site ID
 */
export class RakutenService extends NetworkApiAbstract {
  private client: AxiosInstance;
  private enabled: boolean = false;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    const { config, metadata, enabled } = RakutenService.loadConfiguration();
    super(config, metadata);
    this.enabled = enabled;

    this.client = axios.create({
      baseURL: 'https://api.linksynergy.com',
      timeout: 30000,
    });
  }

  /**
   * Load Rakuten configuration from config.json or environment variables
   */
  private static loadConfiguration(): {
    config: NetworkApiConfig;
    metadata: NetworkMetadata;
    enabled: boolean;
  } {
    let metadata: NetworkMetadata = {};
    let config: NetworkApiConfig = { ...DEFAULT_RAKUTEN_API_CONFIG };
    let enabled = false;

    // Try environment variables first
    const envClientId = process.env.RAKUTEN_CLIENT_ID;
    const envClientSecret = process.env.RAKUTEN_CLIENT_SECRET;
    const envSid = process.env.RAKUTEN_SID;
    const envEnabled = process.env.RAKUTEN_ENABLED === 'true';

    if (envClientId && envClientSecret) {
      metadata = {
        clientId: envClientId,
        clientSecret: envClientSecret,
        sid: envSid || '',
      };
      enabled = envEnabled;
    }

    // Override with config.json if exists
    try {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (fileConfig.rakuten) {
          metadata = {
            clientId: fileConfig.rakuten.clientId || envClientId || '',
            clientSecret: fileConfig.rakuten.clientSecret || envClientSecret || '',
            sid: fileConfig.rakuten.sid || envSid || '',
          };
          enabled = fileConfig.rakuten.enabled ?? envEnabled;

          if (fileConfig.rakuten.apiLinks) {
            config = { ...config, ...fileConfig.rakuten.apiLinks };
          }

          logger.debug('✅ Rakuten config loaded from config.json');
        }
      }
    } catch (error) {
      logger.warn('⚠️ Could not load Rakuten config from config.json');
    }

    if (!metadata.clientId || !metadata.clientSecret) {
      logger.warn('⚠️ Rakuten not configured - set RAKUTEN_CLIENT_ID and RAKUTEN_CLIENT_SECRET');
    }

    return { config, metadata, enabled };
  }

  /**
   * Generate OAuth access token
   */
  private async generateToken(): Promise<string | null> {
    if (!this.metadata.clientId || !this.metadata.clientSecret) {
      logger.error('❌ Rakuten credentials not configured');
      return null;
    }

    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${this.metadata.clientId}:${this.metadata.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        'https://api.linksynergy.com/token',
        new URLSearchParams({ scope: this.metadata.sid || '' }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${credentials}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Token typically expires in 1 hour
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

      logger.debug('✅ Rakuten token generated');
      return this.accessToken;
    } catch (error: any) {
      logger.error(`❌ Error generating Rakuten token: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if Rakuten is configured and enabled
   */
  isConfigured(): boolean {
    return !!(this.metadata.clientId && this.metadata.clientSecret && this.enabled);
  }

  /**
   * Get authorization headers for API requests
   */
  protected getAuthHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  /**
   * Get product feed - Not supported by Rakuten in this implementation
   */
  async getProductFeed(): Promise<Offer[]> {
    logger.warn('⚠️ Rakuten product feeds not implemented in this version.');
    return [];
  }

  /**
   * Test connection to Rakuten API
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    if (!this.metadata.clientId || !this.metadata.clientSecret) {
      return { success: false, message: 'Rakuten Client ID ou Client Secret não configurados' };
    }

    try {
      const token = await this.generateToken();
      if (!token) {
        return { success: false, message: 'Falha ao gerar token de acesso' };
      }

      const response = await this.client.get('/v1/advertisers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        const advertisers = response.data?.advertisers || [];
        return {
          success: true,
          message: `Conectado à Rakuten! ${advertisers.length} anunciantes disponíveis`,
          data: response.data,
        };
      }

      return { success: false, message: `Resposta inesperada: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `Erro: ${error.message}` };
    }
  }

  /**
   * Get campaigns/advertisers from Rakuten
   */
  async getCampaigns(): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      logger.info('📡 Fetching Rakuten advertisers...');
      const token = await this.generateToken();
      if (!token) return [];

      const response = await this.client.get('/v1/advertisers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const advertisers = response.data?.advertisers || [];
      const result = [];

      for (const advertiser of advertisers) {
        try {
          const domain = new URL(advertiser.url || 'https://example.com').hostname?.replace(
            'www.',
            ''
          );
          result.push({
            id: advertiser.id,
            name: advertiser.name,
            description: advertiser.description || '',
            url: advertiser.url,
            image: advertiser.profiles?.logoURL || '',
            active: true,
            domain: domain,
          });
        } catch {
          continue;
        }
      }

      logger.info(`✅ Found ${result.length} Rakuten advertisers`);
      return result;
    } catch (error: any) {
      logger.error(`❌ Error fetching Rakuten advertisers: ${error.message}`);
      return [];
    }
  }

  /**
   * Get coupons from Rakuten
   */
  async getCoupons(): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      logger.info('📡 Fetching Rakuten coupons...');
      const token = await this.generateToken();
      if (!token) return [];

      // Rakuten returns XML for coupons, simplified JSON version here
      const response = await this.client.get('/coupon/1.0/json/promotionTypes/promoCode,sale', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const coupons = response.data?.promos || response.data?.couponfeed?.link || [];
      const result = [];

      for (const coupon of coupons) {
        try {
          result.push({
            title: coupon.offerdescription || coupon.title || '',
            description: coupon.offerdescription || coupon.description || '',
            code: coupon.couponcode || coupon.code || '',
            active: true,
            expiration: coupon.offerenddate ? new Date(coupon.offerenddate) : null,
            link: coupon.clickurl || coupon.link || '',
            advertiser: coupon.advertiserid || coupon.advertiserId,
            deeplink: coupon.clickurl || coupon.deeplink || '',
          });
        } catch {
          continue;
        }
      }

      logger.info(`✅ Found ${result.length} Rakuten coupons`);
      return result;
    } catch (error: any) {
      logger.error(`❌ Error fetching Rakuten coupons: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate deeplink for a product URL
   */
  async getDeeplink(destinationUrl: string, advertiserId?: string): Promise<string | null> {
    if (!this.isConfigured()) {
      logger.warn('⚠️ Rakuten not configured, cannot generate link');
      return null;
    }

    try {
      const token = await this.generateToken();
      if (!token) return null;

      const response = await this.client.post(
        '/v1/deeplink',
        {
          url: destinationUrl,
          advertiser_id: advertiserId ? Number(advertiserId) : undefined,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const deeplink = response.data?.advertiser?.deep_link?.deep_link_url;
      if (deeplink) {
        logger.debug(`✅ Generated Rakuten deeplink: ${deeplink}`);
        return deeplink;
      }

      return null;
    } catch (error: any) {
      logger.error(`❌ Error generating Rakuten deeplink: ${error.message}`);
      return null;
    }
  }
}
