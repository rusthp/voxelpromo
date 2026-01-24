import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { AwinService } from './AwinService';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Product filter options
 */
export interface ProductFilterOptions {
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  maxProducts?: number;
  categories?: string[];
  excludeOutOfStock?: boolean;
}

/**
 * Feed cache entry
 */
interface FeedCacheEntry {
  advertiserId: string;
  locale: string;
  lastUpdated: Date;
  expiresAt: Date;
  productCount: number;
  filePath: string;
}

/**
 * Awin Feed Manager
 * Handles product feed caching, filtering, and synchronization
 */
export class AwinFeedManager {
  private awinService: AwinService;
  private cacheDir: string;
  private cacheIndexPath: string;
  private cacheIndex: Map<string, FeedCacheEntry> = new Map();
  private cacheDurationMs: number = 6 * 60 * 60 * 1000; // 6 hours default

  constructor() {
    this.awinService = new AwinService();
    this.cacheDir = join(process.cwd(), '.cache', 'awin-feeds');
    this.cacheIndexPath = join(this.cacheDir, 'index.json');
    this.loadCacheIndex();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Load cache index from disk
   */
  private loadCacheIndex(): void {
    try {
      if (existsSync(this.cacheIndexPath)) {
        const data = JSON.parse(readFileSync(this.cacheIndexPath, 'utf-8'));
        this.cacheIndex = new Map(Object.entries(data));
      }
    } catch (error) {
      logger.warn('⚠️ Could not load feed cache index');
      this.cacheIndex = new Map();
    }
  }

  /**
   * Save cache index to disk
   */
  private saveCacheIndex(): void {
    try {
      this.ensureCacheDir();
      const data = Object.fromEntries(this.cacheIndex);
      writeFileSync(this.cacheIndexPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('❌ Could not save feed cache index');
    }
  }

  /**
   * Get cache key for a feed
   */
  private getCacheKey(advertiserId: string, locale: string): string {
    return `${advertiserId}-${locale}`;
  }

  /**
   * Check if cached feed is still valid
   */
  private isCacheValid(entry: FeedCacheEntry): boolean {
    const expiresAt = new Date(entry.expiresAt);
    return expiresAt > new Date() && existsSync(entry.filePath);
  }

  /**
   * Get products from feed, using cache if available
   */
  async getProducts(
    advertiserId: string,
    options?: ProductFilterOptions & { locale?: string; forceRefresh?: boolean }
  ): Promise<Offer[]> {
    const locale = options?.locale || 'pt_BR';
    const cacheKey = this.getCacheKey(advertiserId, locale);
    const cachedEntry = this.cacheIndex.get(cacheKey);

    // Check cache
    if (cachedEntry && this.isCacheValid(cachedEntry) && !options?.forceRefresh) {
      logger.info(`📦 Using cached feed for advertiser ${advertiserId}`);
      try {
        const cachedProducts = JSON.parse(readFileSync(cachedEntry.filePath, 'utf-8'));
        return this.filterProducts(cachedProducts, options);
      } catch {
        logger.warn('⚠️ Cache file corrupted, re-downloading...');
      }
    }

    // Download fresh feed
    logger.info(`📡 Downloading fresh feed for advertiser ${advertiserId}...`);
    const products = await this.awinService.getProductFeed(advertiserId, {
      locale,
      maxProducts: 0, // Get all for caching
    });

    // Cache the results
    if (products.length > 0) {
      this.cacheProducts(advertiserId, locale, products);
    }

    return this.filterProducts(products, options);
  }

  /**
   * Cache products to disk
   */
  private cacheProducts(advertiserId: string, locale: string, products: Offer[]): void {
    try {
      this.ensureCacheDir();
      const cacheKey = this.getCacheKey(advertiserId, locale);
      const filePath = join(this.cacheDir, `${cacheKey}.json`);

      writeFileSync(filePath, JSON.stringify(products));

      const entry: FeedCacheEntry = {
        advertiserId,
        locale,
        lastUpdated: new Date(),
        expiresAt: new Date(Date.now() + this.cacheDurationMs),
        productCount: products.length,
        filePath,
      };

      this.cacheIndex.set(cacheKey, entry);
      this.saveCacheIndex();

      logger.info(`💾 Cached ${products.length} products for advertiser ${advertiserId}`);
    } catch (error) {
      logger.error('❌ Failed to cache products');
    }
  }

  /**
   * Filter products based on criteria
   */
  filterProducts(products: Offer[], options?: ProductFilterOptions): Offer[] {
    if (!options) return products;

    let filtered = [...products];

    // Price filters
    if (options.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.currentPrice >= options.minPrice!);
    }
    if (options.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.currentPrice <= options.maxPrice!);
    }

    // Discount filter
    if (options.minDiscount !== undefined) {
      filtered = filtered.filter((p) => p.discountPercentage >= options.minDiscount!);
    }

    // Category filter
    if (options.categories && options.categories.length > 0) {
      const lowerCategories = options.categories.map((c) => c.toLowerCase());
      filtered = filtered.filter(
        (p) => p.category && lowerCategories.some((cat) => p.category!.toLowerCase().includes(cat))
      );
    }

    // Limit results
    if (options.maxProducts && options.maxProducts > 0) {
      filtered = filtered.slice(0, options.maxProducts);
    }

    logger.debug(`🔍 Filtered ${products.length} → ${filtered.length} products`);
    return filtered;
  }

  /**
   * Get all cached feeds info
   */
  getCachedFeeds(): FeedCacheEntry[] {
    return Array.from(this.cacheIndex.values()).filter((e) => this.isCacheValid(e));
  }

  /**
   * Clear all cached feeds
   */
  clearCache(): void {
    this.cacheIndex.clear();
    this.saveCacheIndex();
    logger.info('🗑️ Feed cache cleared');
  }

  /**
   * Clear cache for specific advertiser
   */
  clearAdvertiserCache(advertiserId: string): void {
    for (const [key, entry] of this.cacheIndex.entries()) {
      if (entry.advertiserId === advertiserId) {
        this.cacheIndex.delete(key);
      }
    }
    this.saveCacheIndex();
    logger.info(`🗑️ Cleared cache for advertiser ${advertiserId}`);
  }

  /**
   * Get feed statistics
   */
  getStats(): { totalCached: number; totalProducts: number; cacheSize: string } {
    const entries = this.getCachedFeeds();
    const totalProducts = entries.reduce((sum, e) => sum + e.productCount, 0);

    return {
      totalCached: entries.length,
      totalProducts,
      cacheSize: `${entries.length} feeds`,
    };
  }
}
