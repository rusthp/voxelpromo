import axios from 'axios';
import crypto from 'crypto';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';

export interface AmazonProduct {
  ASIN: string;
  ItemInfo?: {
    Title?: { DisplayValue: string };
    ByLineInfo?: { Brand?: { DisplayValue: string } };
  };
  Offers?: {
    Listings?: Array<{
      Price?: { Amount: number; Currency: string; DisplayAmount: string };
      SavingBasis?: { Amount: number; Currency: string; DisplayAmount: string };
    }>;
    Summaries?: Array<{
      LowestPrice?: { Amount: number; Currency: string; DisplayAmount: string };
    }>;
  };
  Images?: { Primary?: { Large?: { URL: string } } };
  DetailPageURL: string;
  CustomerReviews?: { StarRating?: { Value: number } };
  BrowseNodeInfo?: { BrowseNodes?: Array<{ DisplayName: string }> };
}

interface AmazonPAAPIResponse {
  SearchResult?: {
    Items?: AmazonProduct[];
    TotalResultCount?: number;
  };
  ItemsResult?: {
    Items?: AmazonProduct[];
  };
  Errors?: Array<{ Code: string; Message: string }>;
}

interface AmazonConfig {
  accessKey: string;
  secretKey: string;
  associateTag: string;
  region: string;
  marketplace: string;
}

export class AmazonService {

  private config: AmazonConfig;
  private host: string;
  private awsRegion: string;

  constructor() {
    const region = process.env.AMAZON_REGION || 'BR';
    const marketplace = process.env.AMAZON_MARKETPLACE || 'www.amazon.com.br';

    // Map country codes/regions to AWS Regions for signing
    // IMPORTANT: Brazil PA-API uses us-east-1 for signing, NOT sa-east-1!
    const regionMap: Record<string, string> = {
      'BR': 'us-east-1', // Brazil uses us-east-1 for PA-API signing
      'US': 'us-east-1',
      'UK': 'eu-west-1',
      'DE': 'eu-west-1',
      'FR': 'eu-west-1',
      'JP': 'us-west-2',
      'CA': 'us-east-1',
      'IN': 'eu-west-1',
      'IT': 'eu-west-1',
      'ES': 'eu-west-1',
      'MX': 'us-east-1',
      'AU': 'us-west-2',
      'SG': 'us-west-2',
      'sa-east-1': 'us-east-1', // Brazil uses us-east-1 for PA-API!
      'us-east-1': 'us-east-1',
    };

    // Map regions to PA-API Hosts
    const hosts: Record<string, string> = {
      'BR': 'webservices.amazon.com.br',
      'US': 'webservices.amazon.com',
      'UK': 'webservices.amazon.co.uk',
      'DE': 'webservices.amazon.de',
      'FR': 'webservices.amazon.fr',
      'JP': 'webservices.amazon.co.jp',
      'CA': 'webservices.amazon.ca',
      'IN': 'webservices.amazon.in',
      'IT': 'webservices.amazon.it',
      'ES': 'webservices.amazon.es',
      'MX': 'webservices.amazon.com.mx',
      'AU': 'webservices.amazon.com.au',
      'SG': 'webservices.amazon.sg',
      'us-east-1': 'webservices.amazon.com',
      'sa-east-1': 'webservices.amazon.com.br',
    };

    this.config = {
      accessKey: process.env.AMAZON_ACCESS_KEY || '',
      secretKey: process.env.AMAZON_SECRET_KEY || '',
      associateTag: process.env.AMAZON_ASSOCIATE_TAG || '',
      region,
      marketplace,
    };

    this.host = hosts[region] || 'webservices.amazon.com.br';
    this.awsRegion = regionMap[region] || 'us-east-1';
  }

  /**
   * Generate AWS Signature Version 4 for PA-API 5.0
   */
  private generateSignature(
    method: string,
    path: string,
    payload: string,
    amzDate: string,
    dateStamp: string,
    operation: string
  ): { signature: string; authHeader: string } {
    const service = 'ProductAdvertisingAPI';
    const algorithm = 'AWS4-HMAC-SHA256';
    const amzTarget = `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`;

    // Create canonical headers (must be in alphabetical order by header name)
    // Per Amazon docs: SignedHeaders=content-type;host;x-amz-date;x-amz-target
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${this.host}\nx-amz-date:${amzDate}\nx-amz-target:${amzTarget}\n`;
    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';

    // Create payload hash
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

    // Create canonical request
    const canonicalRequest = [
      method,
      path,
      '', // Query string (empty for POST)
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // Create string to sign
    const credentialScope = `${dateStamp}/${this.awsRegion}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Calculate signature
    const kDate = crypto
      .createHmac('sha256', 'AWS4' + this.config.secretKey)
      .update(dateStamp)
      .digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.awsRegion).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    // Create authorization header
    const authHeader = `${algorithm} Credential=${this.config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return { signature, authHeader };
  }

  /**
   * Make a signed request to PA-API 5.0
   */
  private async makeSignedRequest(
    operation: string,
    path: string,
    payload: any
  ): Promise<AmazonPAAPIResponse> {
    try {
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.substr(0, 8);
      const payloadString = JSON.stringify(payload);

      const { authHeader } = this.generateSignature('POST', path, payloadString, amzDate, dateStamp, operation);

      const url = `https://${this.host}${path}`;

      logger.debug(`Amazon PA-API Request: ${operation}`, {
        url,
        marketplace: this.config.marketplace,
        region: this.config.region,
      });

      const response = await axios.post<AmazonPAAPIResponse>(url, payloadString, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Amz-Date': amzDate,
          'X-Amz-Target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`,
          'Content-Encoding': 'amz-1.0',
          'Authorization': authHeader,
          'Host': this.host,
        },
      });

      if (response.data.Errors && response.data.Errors.length > 0) {
        logger.error('Amazon PA-API Errors:', response.data.Errors);
        throw new Error(`Amazon API Error: ${response.data.Errors[0].Message}`);
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        logger.error('Amazon API error response:', {
          status: error.response.status,
          data: error.response.data,
        });
        throw new Error(
          `Amazon API error: ${error.response.data?.Errors?.[0]?.Message || error.response.statusText || error.message}`
        );
      }
      logger.error('Amazon API request error:', error.message);
      throw new Error(`Amazon API error: ${error.message}`);
    }
  }

  /**
   * Search products by keywords using PA-API 5.0
   */
  async searchProducts(keywords: string, itemCount: number = 10): Promise<AmazonProduct[]> {
    try {
      if (!this.config.accessKey || !this.config.secretKey || !this.config.associateTag) {
        throw new Error('Amazon PA-API credentials not configured');
      }

      const payload = {
        PartnerTag: this.config.associateTag,
        PartnerType: 'Associates',
        Keywords: keywords,
        SearchIndex: 'All',
        ItemCount: Math.min(itemCount, 10), // Max 10 items per request
        Marketplace: this.config.marketplace,
        Resources: [
          'Images.Primary.Large',
          'ItemInfo.Title',
          'ItemInfo.ByLineInfo',
          'Offers.Listings.Price',
          'Offers.Listings.SavingBasis',
          'Offers.Summaries.LowestPrice',
          'BrowseNodeInfo.BrowseNodes',
        ],
      };

      const response = await this.makeSignedRequest('SearchItems', '/paapi5/searchitems', payload);

      if (response.SearchResult?.Items) {
        logger.info(`Found ${response.SearchResult.Items.length} products from Amazon`);
        return response.SearchResult.Items;
      }

      logger.warn('No products found in Amazon response');
      return [];
    } catch (error: any) {
      logger.error('Amazon searchProducts error:', error.message);
      throw error;
    }
  }

  /**
   * Get product details by ASIN using PA-API 5.0
   */
  async getProductByASIN(asin: string): Promise<AmazonProduct | null> {
    try {
      if (!this.config.accessKey || !this.config.secretKey || !this.config.associateTag) {
        throw new Error('Amazon PA-API credentials not configured');
      }

      const payload = {
        PartnerTag: this.config.associateTag,
        PartnerType: 'Associates',
        ItemIds: [asin],
        Marketplace: this.config.marketplace,
        Resources: [
          'Images.Primary.Large',
          'ItemInfo.Title',
          'ItemInfo.ByLineInfo',
          'Offers.Listings.Price',
          'Offers.Listings.SavingBasis',
          'Offers.Summaries.LowestPrice',
        ],
      };

      const response = await this.makeSignedRequest('GetItems', '/paapi5/getitems', payload);

      if (response.ItemsResult?.Items?.[0]) {
        return response.ItemsResult.Items[0];
      }

      return null;
    } catch (error: any) {
      logger.error('Amazon getProductByASIN error:', error.message);
      return null;
    }
  }

  /**
   * Convert Amazon product to Offer format
   */
  convertToOffer(product: AmazonProduct, category: string = 'electronics'): Offer | null {
    try {
      // Get prices
      const listingPrice = product.Offers?.Listings?.[0]?.Price?.Amount;
      const savingBasis = product.Offers?.Listings?.[0]?.SavingBasis?.Amount;
      const lowestPrice = product.Offers?.Summaries?.[0]?.LowestPrice?.Amount;

      const currentPrice = listingPrice || lowestPrice || 0;
      const originalPrice = savingBasis || currentPrice;

      if (currentPrice === 0) {
        logger.warn(`Product ${product.ASIN} has no price, skipping`);
        return null;
      }

      const discount = originalPrice - currentPrice;
      const discountPercentage = originalPrice > 0 ? (discount / originalPrice) * 100 : 0;

      if (discountPercentage < 5) {
        // Skip products with less than 5% discount
        return null;
      }

      const title = product.ItemInfo?.Title?.DisplayValue || 'Unknown Product';
      const brand = product.ItemInfo?.ByLineInfo?.Brand?.DisplayValue;
      const imageUrl = product.Images?.Primary?.Large?.URL || '';
      const rating = product.CustomerReviews?.StarRating?.Value || 0;

      const affiliateUrl = product.DetailPageURL.includes('?')
        ? `${product.DetailPageURL}&tag=${this.config.associateTag}`
        : `${product.DetailPageURL}?tag=${this.config.associateTag}`;

      const now = new Date();
      return {
        title,
        description: title,
        originalPrice,
        currentPrice,
        discount,
        discountPercentage: Math.round(discountPercentage * 100) / 100,
        currency: product.Offers?.Listings?.[0]?.Price?.Currency || 'BRL',
        imageUrl,
        productUrl: product.DetailPageURL,
        affiliateUrl,
        source: 'amazon',
        category,
        rating,
        reviewsCount: 0,
        brand,
        tags: [],
        isActive: true,
        isPosted: false,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      logger.error('Error converting Amazon product to offer:', error);
      return null;
    }
  }

  /**
   * Test Amazon PA-API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config.accessKey || !this.config.secretKey || !this.config.associateTag) {
        return {
          success: false,
          message: 'Credenciais não configuradas. Configure Access Key, Secret Key e Associate Tag.',
        };
      }

      // Try a simple search to test credentials
      const products = await this.searchProducts('test', 1);

      return {
        success: true,
        message: `Conexão bem-sucedida! Encontrados ${products.length} produtos de teste. Marketplace: ${this.config.marketplace}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro na conexão: ${error.message}`,
      };
    }
  }
}
