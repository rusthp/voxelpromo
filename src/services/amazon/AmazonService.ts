import axios from 'axios';
import crypto from 'crypto';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';

interface AmazonProduct {
  ASIN: string;
  Title: string;
  ListPrice?: { Amount: number; CurrencyCode: string };
  OfferSummary?: { LowestNewPrice?: { Amount: number; CurrencyCode: string } };
  Images?: { Primary?: { Large?: { URL: string } } };
  DetailPageURL: string;
  CustomerReviews?: { StarRating?: { Value: number } };
  ItemInfo?: {
    ByLineInfo?: { Brand?: { DisplayValue: string } };
    ProductInfo?: { TotalReviews?: { TotalReviewCount: number } };
  };
}

interface AmazonConfig {
  accessKey: string;
  secretKey: string;
  associateTag: string;
  region: string;
}

export class AmazonService {
  private config: AmazonConfig;
  private endpoint: string;

  constructor() {
    this.config = {
      accessKey: process.env.AMAZON_ACCESS_KEY || '',
      secretKey: process.env.AMAZON_SECRET_KEY || '',
      associateTag: process.env.AMAZON_ASSOCIATE_TAG || '',
      region: process.env.AMAZON_REGION || 'BR',
    };

    const endpoints: Record<string, string> = {
      BR: 'webservices.amazon.com.br',
      US: 'webservices.amazon.com',
      UK: 'webservices.amazon.co.uk',
    };

    this.endpoint = endpoints[this.config.region] || endpoints.BR;
  }

  /**
   * Generate Amazon PA-API 5.0 signature
   */
  private generateSignature(
    method: string,
    uri: string,
    queryString: string,
    payload: string
  ): string {
    const algorithm = 'AWS4-HMAC-SHA256';
    // eslint-disable-next-line no-useless-escape
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = timestamp.substr(0, 8);

    const kDate = crypto
      .createHmac('sha256', 'AWS4' + this.config.secretKey)
      .update(date)
      .digest();

    const kRegion = crypto.createHmac('sha256', kDate).update(this.config.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('ProductAdvertisingAPI').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();

    const canonicalRequest = [
      method,
      uri,
      queryString,
      `host:${this.endpoint}`,
      `x-amz-date:${timestamp}`,
      '',
      'host;x-amz-date',
      crypto.createHash('sha256').update(payload).digest('hex'),
    ].join('\n');

    const stringToSign = [
      algorithm,
      timestamp,
      `${date}/${this.config.region}/ProductAdvertisingAPI/aws4_request`,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    return signature;
  }

  /**
   * Search products by keywords
   */
  async searchProducts(keywords: string, itemCount: number = 10): Promise<AmazonProduct[]> {
    try {
      const operation = 'SearchItems';
      const payload = JSON.stringify({
        Keywords: keywords,
        ItemCount: itemCount,
        Resources: [
          'Images.Primary.Large',
          'ItemInfo.ByLineInfo',
          'ItemInfo.ProductInfo',
          'ItemInfo.Title',
          'Offers.Listings.Price',
          'CustomerReviews.StarRating',
          'ItemInfo.ExternalIds',
        ],
      });

      const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const queryString = `AWSAccessKeyId=${encodeURIComponent(this.config.accessKey)}&AssociateTag=${encodeURIComponent(this.config.associateTag)}&Operation=${operation}&Service=AWSECommerceService&Timestamp=${encodeURIComponent(timestamp)}&Version=2013-08-01`;

      const signature = this.generateSignature('POST', '/paapi5/searchitems', queryString, payload);

      const url = `https://${this.endpoint}/paapi5/searchitems?${queryString}&Signature=${encodeURIComponent(signature)}`;

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Amz-Date': timestamp,
        },
      });

      if (response.data.SearchResult?.Items) {
        return response.data.SearchResult.Items;
      }

      return [];
    } catch (error: any) {
      logger.error('Amazon API error:', error.response?.data || error.message);
      throw new Error(`Amazon API error: ${error.message}`);
    }
  }

  /**
   * Get product details by ASIN
   */
  async getProductByASIN(asin: string): Promise<AmazonProduct | null> {
    try {
      const operation = 'GetItems';
      const payload = JSON.stringify({
        ItemIds: [asin],
        Resources: [
          'Images.Primary.Large',
          'ItemInfo.ByLineInfo',
          'ItemInfo.ProductInfo',
          'ItemInfo.Title',
          'Offers.Listings.Price',
          'CustomerReviews.StarRating',
        ],
      });

      const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const queryString = `AWSAccessKeyId=${encodeURIComponent(this.config.accessKey)}&AssociateTag=${encodeURIComponent(this.config.associateTag)}&Operation=${operation}&Service=AWSECommerceService&Timestamp=${encodeURIComponent(timestamp)}&Version=2013-08-01`;

      const signature = this.generateSignature('POST', '/paapi5/getitems', queryString, payload);

      const url = `https://${this.endpoint}/paapi5/getitems?${queryString}&Signature=${encodeURIComponent(signature)}`;

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Amz-Date': timestamp,
        },
      });

      if (response.data.ItemsResult?.Items?.[0]) {
        return response.data.ItemsResult.Items[0];
      }

      return null;
    } catch (error: any) {
      logger.error('Amazon API error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Convert Amazon product to Offer format
   */
  convertToOffer(product: AmazonProduct, category: string = 'electronics'): Offer | null {
    try {
      const listPrice = product.ListPrice?.Amount || 0;
      const currentPrice = product.OfferSummary?.LowestNewPrice?.Amount || listPrice;
      const discount = listPrice - currentPrice;
      const discountPercentage = listPrice > 0 ? (discount / listPrice) * 100 : 0;

      if (discountPercentage < 5) {
        // Skip products with less than 5% discount
        return null;
      }

      const rating = product.CustomerReviews?.StarRating?.Value || 0;
      const reviewsCount = product.ItemInfo?.ProductInfo?.TotalReviews?.TotalReviewCount || 0;

      const affiliateUrl = `${product.DetailPageURL}?tag=${this.config.associateTag}`;

      const now = new Date();
      return {
        title: product.Title,
        description: product.Title,
        originalPrice: listPrice / 100, // Convert from cents
        currentPrice: currentPrice / 100,
        discount: discount / 100,
        discountPercentage: Math.round(discountPercentage * 100) / 100,
        currency: product.ListPrice?.CurrencyCode || 'BRL',
        imageUrl: product.Images?.Primary?.Large?.URL || '',
        productUrl: product.DetailPageURL,
        affiliateUrl,
        source: 'amazon',
        category,
        rating,
        reviewsCount,
        brand: product.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
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
}
