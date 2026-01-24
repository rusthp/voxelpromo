import axios from 'axios';
import { logger } from '../../utils/logger';
import { OfferModel } from '../../models/Offer';

/**
 * Result of a link health check
 */
export interface LinkHealthReport {
  url: string;
  isValid: boolean;
  statusCode: number;
  responseTime: number;
  lastChecked: Date;
  error?: string;
  marketplace?: string;
}

/**
 * Summary of health check results
 */
export interface HealthCheckSummary {
  total: number;
  healthy: number;
  broken: number;
  percentage: number;
  details: LinkHealthReport[];
  checkedAt: Date;
}

/**
 * Cache entry for link validation
 */
interface CacheEntry {
  result: LinkHealthReport;
  expiresAt: Date;
}

/**
 * Service for validating affiliate links in batch
 * Includes caching, retry logic, and marketplace-specific checks
 */
export class AffiliateHealthCheckService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTTLMs = 5 * 60 * 1000; // 5 minutes
  private readonly defaultTimeout = 10000;
  private readonly maxRetries = 2;
  private readonly retryDelayMs = 1000;

  /**
   * User agent to mimic real browser
   */
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Detect marketplace from URL
   */
  private detectMarketplace(url: string): string {
    if (url.includes('amazon.com') || url.includes('amzn.to')) return 'amazon';
    if (url.includes('mercadolivre.com') || url.includes('mercadolibre.com')) return 'mercadolivre';
    if (url.includes('aliexpress.com') || url.includes('s.click.aliexpress.com'))
      return 'aliexpress';
    if (url.includes('shopee.com')) return 'shopee';
    if (url.includes('magazineluiza.com') || url.includes('magalu.com')) return 'magalu';
    if (url.includes('americanas.com')) return 'americanas';
    if (url.includes('casasbahia.com')) return 'casasbahia';
    if (url.includes('pontofrio.com')) return 'pontofrio';
    if (url.includes('kabum.com')) return 'kabum';
    if (url.includes('terabyte')) return 'terabyte';
    return 'other';
  }

  /**
   * Check if response indicates a broken/unavailable product
   */
  private isProductUnavailable(html: string, marketplace: string): boolean {
    const lowerHtml = html.toLowerCase();

    switch (marketplace) {
      case 'mercadolivre':
        return (
          lowerHtml.includes('o anúncio que você procura está pausado') ||
          lowerHtml.includes('parece que esta página não existe') ||
          lowerHtml.includes('este anúncio finalizou')
        );

      case 'amazon':
        return (
          lowerHtml.includes('currently unavailable') ||
          lowerHtml.includes("we couldn't find that page") ||
          lowerHtml.includes('não conseguimos encontrar') ||
          lowerHtml.includes('produto indisponível')
        );

      case 'aliexpress':
        return (
          lowerHtml.includes('sorry, this item is no longer available') ||
          lowerHtml.includes('this product is no longer available') ||
          lowerHtml.includes('item não encontrado')
        );

      case 'shopee':
        return (
          lowerHtml.includes('product is not available') ||
          lowerHtml.includes('este produto não está disponível')
        );

      case 'magalu':
      case 'americanas':
      case 'casasbahia':
        return (
          lowerHtml.includes('produto indisponível') ||
          lowerHtml.includes('ops! não encontramos') ||
          lowerHtml.includes('página não encontrada')
        );

      case 'kabum':
        return lowerHtml.includes('produto não encontrado') || lowerHtml.includes('esgotado');

      default:
        return (
          lowerHtml.includes('404') ||
          lowerHtml.includes('not found') ||
          lowerHtml.includes('não encontrado')
        );
    }
  }

  /**
   * Verify a single link with retry logic
   */
  async verifyLink(url: string, useCache: boolean = true): Promise<LinkHealthReport> {
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(url);
      if (cached && cached.expiresAt > new Date()) {
        logger.debug(`[AffiliateHealthCheck] Cache hit for ${url.substring(0, 50)}`);
        return cached.result;
      }
    }

    const marketplace = this.detectMarketplace(url);
    const startTime = Date.now();

    // Validate URL format
    if (!url || !url.startsWith('http')) {
      const result: LinkHealthReport = {
        url,
        isValid: false,
        statusCode: 0,
        responseTime: 0,
        lastChecked: new Date(),
        error: 'URL inválida',
        marketplace,
      };
      this.cacheResult(url, result);
      return result;
    }

    // Check for placeholder URLs
    if (
      url.includes('your-affiliate-code') ||
      url.includes('your-tracking-id') ||
      url.includes('YOUR_')
    ) {
      const result: LinkHealthReport = {
        url,
        isValid: false,
        statusCode: 0,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: 'URL contém placeholder',
        marketplace,
      };
      this.cacheResult(url, result);
      return result;
    }

    // Try with retries
    let lastError = '';
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: this.defaultTimeout,
          maxRedirects: 5,
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            Referer: 'https://www.google.com/',
          },
          validateStatus: (status) => status >= 200 && status < 500,
        });

        const responseTime = Date.now() - startTime;

        // Check status code
        if (response.status >= 400) {
          const result: LinkHealthReport = {
            url,
            isValid: false,
            statusCode: response.status,
            responseTime,
            lastChecked: new Date(),
            error: `HTTP ${response.status}`,
            marketplace,
          };
          this.cacheResult(url, result);
          return result;
        }

        // Check content for marketplace-specific unavailability
        if (response.data && typeof response.data === 'string') {
          if (this.isProductUnavailable(response.data, marketplace)) {
            const result: LinkHealthReport = {
              url,
              isValid: false,
              statusCode: response.status,
              responseTime,
              lastChecked: new Date(),
              error: 'Produto indisponível ou página não encontrada',
              marketplace,
            };
            this.cacheResult(url, result);
            return result;
          }
        }

        // Link is valid
        const result: LinkHealthReport = {
          url,
          isValid: true,
          statusCode: response.status,
          responseTime,
          lastChecked: new Date(),
          marketplace,
        };
        this.cacheResult(url, result);
        return result;
      } catch (error: any) {
        lastError = error.message || 'Erro desconhecido';

        if (attempt < this.maxRetries) {
          // Wait before retry with exponential backoff
          await this.delay(this.retryDelayMs * Math.pow(2, attempt));
          logger.debug(
            `[AffiliateHealthCheck] Retry ${attempt + 1}/${this.maxRetries} for ${url.substring(0, 50)}`
          );
        }
      }
    }

    // All retries failed
    const result: LinkHealthReport = {
      url,
      isValid: false,
      statusCode: 0,
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      error: lastError,
      marketplace,
    };
    this.cacheResult(url, result);
    return result;
  }

  /**
   * Verify multiple links in parallel with concurrency control
   */
  async verifyBatch(urls: string[], concurrency: number = 5): Promise<LinkHealthReport[]> {
    const results: LinkHealthReport[] = [];

    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((url) => this.verifyLink(url)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Pre-send verification with shorter timeout
   * Returns true if link appears valid
   */
  async verifyBeforeSend(url: string): Promise<boolean> {
    const result = await this.verifyLink(url, true);
    return result.isValid;
  }

  /**
   * Generate health report for all active offers
   */
  async generateHealthReport(limit: number = 100): Promise<HealthCheckSummary> {
    try {
      // Get active offers with affiliate URLs
      const offers = await OfferModel.find({
        isActive: true,
        affiliateUrl: { $exists: true, $ne: '' },
      })
        .limit(limit)
        .select('affiliateUrl')
        .lean();

      const urls = offers.map((o) => o.affiliateUrl).filter((url): url is string => !!url);

      logger.info(`[AffiliateHealthCheck] Checking ${urls.length} affiliate links...`);

      const results = await this.verifyBatch(urls, 5);

      const healthy = results.filter((r) => r.isValid).length;
      const broken = results.filter((r) => !r.isValid).length;

      const summary: HealthCheckSummary = {
        total: results.length,
        healthy,
        broken,
        percentage: results.length > 0 ? Math.round((healthy / results.length) * 100) : 100,
        details: results,
        checkedAt: new Date(),
      };

      logger.info(
        `[AffiliateHealthCheck] Report: ${healthy}/${results.length} links healthy (${summary.percentage}%)`
      );

      return summary;
    } catch (error: any) {
      logger.error(`[AffiliateHealthCheck] Error generating report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get only broken links from health report
   */
  async getBrokenLinks(limit: number = 100): Promise<LinkHealthReport[]> {
    const report = await this.generateHealthReport(limit);
    return report.details.filter((r) => !r.isValid);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('[AffiliateHealthCheck] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; validEntries: number } {
    const now = new Date();
    let validEntries = 0;

    this.cache.forEach((entry) => {
      if (entry.expiresAt > now) validEntries++;
    });

    return {
      size: this.cache.size,
      validEntries,
    };
  }

  /**
   * Cache a result
   */
  private cacheResult(url: string, result: LinkHealthReport): void {
    this.cache.set(url, {
      result,
      expiresAt: new Date(Date.now() + this.cacheTTLMs),
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
