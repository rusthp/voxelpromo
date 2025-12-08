import axios from 'axios';
import { logger } from '../../utils/logger';
import { Offer } from '../../types';
import { CategoryService } from '../category/CategoryService';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ShopeeProduct {
  image_link: string;
  itemid: string;
  shopid?: string;
  price: number;
  sale_price?: number;
  discount_percentage?: number;
  title: string;
  description: string;
  product_link: string;
  product_short_link: string; // Link de afiliado
  global_category1: string;
  global_category2?: string;
  item_rating?: number;
  global_catid1?: string;
  global_catid2?: string;
}

interface ShopeeConfig {
  feedUrls?: string[];
  affiliateCode?: string;
  minDiscount?: number;      // Desconto mínimo (%)
  maxPrice?: number;          // Preço máximo (BRL)
  minPrice?: number;          // Preço mínimo (BRL)
  cacheEnabled?: boolean;     // Habilitar cache de feeds
}

export class ShopeeService {
  private categoryService: CategoryService;

  // Cache de feeds processados (feedUrl -> {products, timestamp})
  private feedCache = new Map<string, {
    products: ShopeeProduct[];
    timestamp: number;
    feedUrl: string;
  }>();

  // TTL do cache: 6 horas
  private readonly FEED_CACHE_TTL = 6 * 60 * 60 * 1000;

  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * Parse CSV line handling quoted fields with commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());
    return result;
  }

  /**
   * Get config from environment or config.json
   */
  private getConfig(): ShopeeConfig {
    try {
      const configPath = join(process.cwd(), 'config.json');

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.shopee) {
          return {
            feedUrls: config.shopee.feedUrls || [],
            affiliateCode: config.shopee.affiliateCode,
            minDiscount: config.shopee.minDiscount,
            maxPrice: config.shopee.maxPrice,
            minPrice: config.shopee.minPrice,
            cacheEnabled: config.shopee.cacheEnabled,
          };
        }
      }
    } catch (error) {
      // Fall back to environment variables
    }

    return {
      feedUrls: process.env.SHOPEE_FEED_URLS?.split(',') || [],
      affiliateCode: process.env.SHOPEE_AFFILIATE_CODE,
    };
  }

  /**
   * Download and parse CSV feed from Shopee
   *
   * @param feedUrl - URL of the CSV feed
   * @returns Array of products
   */
  async downloadFeed(feedUrl: string): Promise<ShopeeProduct[]> {
    try {
      const config = this.getConfig();

      // Check cache first if enabled
      if (config.cacheEnabled !== false) {
        const cached = this.feedCache.get(feedUrl);
        if (cached) {
          const age = Date.now() - cached.timestamp;
          if (age < this.FEED_CACHE_TTL) {
            logger.info(`💾 Cache HIT for feed (age: ${Math.round(age / 1000 / 60)}min)`, {
              products: cached.products.length,
              feedUrl: feedUrl.substring(0, 60) + '...'
            });
            return cached.products;
          } else {
            // Cache expired
            logger.debug('Cache expired, re-downloading feed');
            this.feedCache.delete(feedUrl);
          }
        }
      }

      logger.info(`📥 Downloading Shopee feed: ${feedUrl.substring(0, 80)}...`);
      const startTime = Date.now();

      const response = await axios.get(feedUrl, {
        headers: {
          Accept: 'text/csv, application/csv',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 120000, // 120 seconds for large CSV files
        responseType: 'text',
        maxContentLength: 200 * 1024 * 1024, // 200MB max (Shopee feeds can be large)
      });

      logger.info(`✅ Downloaded feed (${(response.data.length / 1024).toFixed(2)} KB)`);
      logger.info('📊 Parsing CSV...');

      // Parse CSV - handle multiline fields (descriptions can have newlines)
      // Split by newline but respect quoted fields
      const lines: string[] = [];
      let currentLine = '';
      let inQuotes = false;

      for (let i = 0; i < response.data.length; i++) {
        const char = response.data[i];
        const nextChar = response.data[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentLine += '""';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
            currentLine += char;
          }
        } else if (char === '\n' && !inQuotes) {
          // End of line (only if not in quotes)
          if (currentLine.trim()) {
            lines.push(currentLine);
          }
          currentLine = '';
        } else {
          currentLine += char;
        }
      }

      // Add last line
      if (currentLine.trim()) {
        lines.push(currentLine);
      }

      if (lines.length < 2) {
        logger.warn('CSV file has less than 2 lines');
        return [];
      }

      // Parse header
      const headers = this.parseCSVLine(lines[0]);
      logger.info(`CSV headers: ${headers.length} columns, ${lines.length - 1} records`);

      // Parse records (limit to reasonable number for performance)
      const maxRecords = Math.min(lines.length - 1, 10000); // Process up to 10k products per feed
      const records: any[] = [];

      for (let i = 1; i <= maxRecords; i++) {
        try {
          const values = this.parseCSVLine(lines[i]);
          if (values.length >= headers.length) {
            const record: any = {};
            headers.forEach((header, index) => {
              record[header] = values[index] || '';
            });
            records.push(record);
          }
        } catch (error: any) {
          logger.debug(`Error parsing line ${i}: ${error.message}`);
        }
      }

      if (lines.length - 1 > maxRecords) {
        logger.info(
          `Processed ${maxRecords} of ${lines.length - 1} records (limited for performance)`
        );
      }

      logger.info(`✅ Parsed ${records.length} products from CSV`);

      // Convert to ShopeeProduct format
      const products: ShopeeProduct[] = [];

      let filteredCount = 0;

      for (const record of records) {
        try {
          const price = parseFloat(record.price?.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
          const salePrice = record.sale_price
            ? parseFloat(record.sale_price.replace(/[^\d.,]/g, '').replace(',', '.') || '0')
            : price;
          const discount = record.discount_percentage
            ? parseFloat(
              record.discount_percentage
                .toString()
                .replace(/[^\d.,]/g, '')
                .replace(',', '.')
            )
            : 0;

          // Calculate discount percentage if not provided
          const discountPercentage = discount > 0 ? discount : (price > 0 ? ((price - salePrice) / price) * 100 : 0);

          // Early filters (before creating object)
          if (config.minDiscount && discountPercentage < config.minDiscount) {
            filteredCount++;
            continue;
          }
          if (config.maxPrice && salePrice > config.maxPrice) {
            filteredCount++;
            continue;
          }
          if (config.minPrice && salePrice < config.minPrice) {
            filteredCount++;
            continue;
          }

          products.push({
            image_link: record.image_link || record.image_link_3 || '',
            itemid: record.itemid || '',
            shopid: record.shopid || record.shop_id || undefined,
            price: price, // Keep original price
            sale_price: salePrice < price ? salePrice : undefined,
            discount_percentage: discountPercentage > 0 ? discountPercentage : undefined,
            title: record.title || '',
            description: record.description || record.title || '',
            product_link: record.product_link || '',
            product_short_link: record['product_short link'] || record.product_short_link || record.product_link || '',
            global_category1: record.global_category1 || 'electronics',
            global_category2: record.global_category2,
            item_rating: record.item_rating
              ? parseFloat(record.item_rating.toString())
              : undefined,
            global_catid1: record.global_catid1,
            global_catid2: record.global_catid2,
          });
        } catch (error: any) {
          logger.debug(`Error parsing product record: ${error.message}`);
        }
      }

      const elapsed = Date.now() - startTime;

      logger.info(`✅ Successfully processed ${products.length} products in ${elapsed}ms`);
      if (filteredCount > 0) {
        logger.info(`📊 Early filters: ${filteredCount} products discarded, ${products.length} kept`);
      }

      // Save to cache if enabled
      if (config.cacheEnabled !== false) {
        this.feedCache.set(feedUrl, {
          products,
          timestamp: Date.now(),
          feedUrl
        });
        logger.debug(`💾 Cached ${products.length} products for feed`);
      }

      return products;
    } catch (error: any) {
      logger.error('Error downloading Shopee feed:', {
        message: error.message,
        status: error.response?.status,
        url: feedUrl.substring(0, 80),
      });
      return [];
    }
  }

  /**
   * Download multiple feeds and combine products
   *
   * @param feedUrls - Array of feed URLs
   * @param limit - Maximum products to return
   * @returns Array of unique products
   */
  async downloadMultipleFeeds(feedUrls: string[], limit: number = 1000): Promise<ShopeeProduct[]> {
    try {
      logger.info(`📥 Downloading ${feedUrls.length} Shopee feeds...`);

      const allProducts: ShopeeProduct[] = [];
      const productMap = new Map<string, ShopeeProduct>(); // Use itemid as key to avoid duplicates

      for (const feedUrl of feedUrls) {
        try {
          const products = await this.downloadFeed(feedUrl);

          for (const product of products) {
            if (!productMap.has(product.itemid)) {
              productMap.set(product.itemid, product);
              allProducts.push(product);
            }
          }

          // Delay between feeds to avoid rate limiting
          if (feedUrls.indexOf(feedUrl) < feedUrls.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }

          // Stop if we have enough products
          if (allProducts.length >= limit) {
            break;
          }
        } catch (error: any) {
          logger.warn(`Failed to download feed ${feedUrl.substring(0, 50)}...: ${error.message}`);
        }
      }

      logger.info(`✅ Total unique products from all feeds: ${allProducts.length}`);
      return allProducts.slice(0, limit);
    } catch (error: any) {
      logger.error('Error downloading multiple feeds:', error);
      return [];
    }
  }

  /**
   * Convert Shopee product to Offer format
   *
   * @param product - Shopee product
   * @param category - Product category
   * @returns Offer object
   */
  /**
   * Analyze Shopee link to determine type and extract original link
   */
  private analyzeLink(url: string): { type: 'affiliate' | 'product' | 'unknown'; originalLink: string; affiliateLink: string } {
    const result = {
      type: 'unknown' as 'affiliate' | 'product' | 'unknown',
      originalLink: url,
      affiliateLink: ''
    };

    if (!url) return result;

    // Rule 1: Affiliate Link
    if (url.includes('shope.ee/an_redir') || url.includes('shope.ee/')) {
      result.type = 'affiliate';
      result.affiliateLink = url;

      // Extract origin_link if present
      const originMatch = url.match(/origin_link=([^&]+)/);
      if (originMatch) {
        try {
          result.originalLink = decodeURIComponent(originMatch[1]);
        } catch (e) {
          // Keep original url if decode fails
        }
      }
      return result;
    }

    // Rule 2: Normal Product Link
    if (url.includes('shopee.com.br/product/')) {
      result.type = 'product';
      result.originalLink = url;
      return result;
    }

    return result;
  }

  /**
   * Convert Shopee product to Offer format
   *
   * @param product - Shopee product
   * @param category - Product category
   * @returns Offer object
   */
  convertToOffer(product: ShopeeProduct, category: string = 'electronics'): Offer | null {
    try {
      const currentPrice = product.sale_price || product.price || 0;
      const originalPrice =
        product.discount_percentage && product.discount_percentage > 0
          ? currentPrice / (1 - product.discount_percentage / 100)
          : product.price || currentPrice;

      const discount = originalPrice - currentPrice;
      const discountPercentage = originalPrice > 0 ? (discount / originalPrice) * 100 : 0;

      // Filter by minimum discount (3% minimum)
      if (originalPrice > currentPrice && discountPercentage < 3) {
        logger.debug('Product filtered: discount too low', {
          itemid: product.itemid,
          discountPercentage: discountPercentage.toFixed(2),
        });
        return null;
      }

      // Analyze links to ensure correctness
      const rawAffiliateLink = product.product_short_link || product.product_link;
      const rawProductLink = product.product_link;

      const affiliateAnalysis = this.analyzeLink(rawAffiliateLink);
      const productAnalysis = this.analyzeLink(rawProductLink);

      // Determine final links
      let affiliateUrl = '';
      let productUrl = '';

      // 1. Try to get affiliate link
      if (affiliateAnalysis.type === 'affiliate') {
        affiliateUrl = affiliateAnalysis.affiliateLink;
      } else if (productAnalysis.type === 'affiliate') {
        affiliateUrl = productAnalysis.affiliateLink;
      }

      // 2. Try to get product link
      if (productAnalysis.type === 'product') {
        productUrl = productAnalysis.originalLink;
      } else if (affiliateAnalysis.originalLink && affiliateAnalysis.originalLink.includes('shopee.com.br/product/')) {
        productUrl = affiliateAnalysis.originalLink;
      } else {
        productUrl = rawProductLink; // Fallback
      }

      // Get config for affiliate settings
      const config = this.getConfig();

      // If we still don't have an affiliate link, use the raw one if it looks suspicious/short, otherwise empty
      if (!affiliateUrl && rawAffiliateLink && rawAffiliateLink !== productUrl) {
        // Check if it's an an_redir link - if so, it MIGHT be valid, but if user complains, we prefer Universal Link
        // If we have shopid and affiliateCode, generate Universal Link
        if (config.affiliateCode && product.shopid && product.itemid) {
          // Universal Link Format: https://shopee.com.br/universal-link/product/{shopid}/{itemid}?utm_source={affiliateCode}
          // Note: Standard Universal Link usually wraps the URL, but this is the deep link format
          // The format "https://shopee.com.br/universal-link/product/i/{shopid}/{itemid}" is often used.
          affiliateUrl = `https://shopee.com.br/universal-link/product/i/${product.shopid}/${product.itemid}?utm_source=${config.affiliateCode}&utm_medium=affiliate&utm_campaign=voxelpromo`;
          logger.debug(`Generated Universal Link for item ${product.itemid}`);
        } else {
          affiliateUrl = rawAffiliateLink;
        }
      }

      // If we STILL have an an_redir link effectively, and user provided affiliateCode, try to force Universal Link conversion if shopid is available
      if (affiliateUrl.includes('an_redir') && config.affiliateCode && product.shopid && product.itemid) {
        affiliateUrl = `https://shopee.com.br/universal-link/product/i/${product.shopid}/${product.itemid}?utm_source=${config.affiliateCode}&utm_medium=affiliate&utm_campaign=voxelpromo`;
      }

      // Build tags
      const tags: string[] = [];
      if (product.discount_percentage && product.discount_percentage >= 20) {
        tags.push('Super Desconto');
      } else if (product.discount_percentage && product.discount_percentage >= 10) {
        tags.push('Ótimo Desconto');
      }
      if (product.global_category1) {
        tags.push(product.global_category1);
      }

      // Use intelligent category detection
      const detectedCategory = this.categoryService.detectCategory(
        product.title,
        product.description,
        product.global_category1?.toLowerCase() || category
      );

      const now = new Date();
      return {
        title: product.title,
        description: product.description || product.title,
        originalPrice: Math.round(originalPrice * 100) / 100,
        currentPrice: Math.round(currentPrice * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        discountPercentage: Math.round(discountPercentage * 100) / 100,
        currency: 'BRL',
        imageUrl: product.image_link || '',
        productUrl,
        affiliateUrl,
        source: 'shopee',
        category: detectedCategory,
        rating: product.item_rating || 0,
        reviewsCount: 0, // Shopee CSV doesn't include review count
        brand: '',
        tags,
        isActive: true,
        isPosted: false,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      logger.error('Error converting Shopee product to offer:', error);
      return null;
    }
  }

  /**
   * Get products from configured feeds
   *
   * @param category - Product category filter
   * @param limit - Maximum products to return
   * @returns Array of products
   */
  async getProducts(
    category: string = 'electronics',
    limit: number = 100
  ): Promise<ShopeeProduct[]> {
    try {
      const config = this.getConfig();

      if (!config.feedUrls || config.feedUrls.length === 0) {
        logger.warn('No Shopee feed URLs configured');
        return [];
      }

      logger.info(`🔍 Fetching products from ${config.feedUrls.length} Shopee feed(s)...`);

      const products = await this.downloadMultipleFeeds(config.feedUrls, limit);

      // Filter by category if specified
      if (category && category !== 'electronics') {
        const filtered = products.filter(
          (p) =>
            p.global_category1?.toLowerCase().includes(category.toLowerCase()) ||
            p.global_category2?.toLowerCase().includes(category.toLowerCase())
        );
        logger.info(`📦 Filtered to ${filtered.length} products in category "${category}"`);
        return filtered.slice(0, limit);
      }

      return products;
    } catch (error: any) {
      logger.error('Error getting Shopee products:', error);
      return [];
    }
  }
}
