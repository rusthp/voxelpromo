/**
 * AliExpress Scraper Service
 * Extracts real BRL prices from AliExpress product pages
 * Fallback when API returns USD prices that don't match website prices
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';

export interface ScrapedProduct {
  productId: string;
  title: string;
  currentPrice: number;
  originalPrice: number;
  discountPercentage: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  available: boolean;
}

export interface ScrapedDealsPage {
  products: ScrapedProduct[];
  totalFound: number;
}

export class AliExpressScraper {
  private client: AxiosInstance;
  private lastRequestTime = 0;
  private minRequestDelay = 500; // 500ms between requests

  // Headers that mimic a Brazilian browser
  private readonly defaultHeaders = {
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: this.defaultHeaders,
    });
  }

  /**
   * Rate limiting - wait before making request
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestDelay) {
      const waitTime = this.minRequestDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Parse price string to number (handles R$, etc.)
   */
  private parsePrice(priceStr: string): number {
    if (!priceStr) return 0;
    // Remove currency symbols and convert Brazilian format
    const cleaned = priceStr
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '') // Remove thousand separators
      .replace(',', '.'); // Convert decimal separator
    return parseFloat(cleaned) || 0;
  }

  /**
   * Extract product data from window.runParams JSON in product page
   */
  private extractRunParamsData(html: string): any | null {
    try {
      // Pattern 1: window.runParams = {...}
      const runParamsMatch = html.match(
        /window\.runParams\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>)/
      );
      if (runParamsMatch) {
        // Clean up the JSON - sometimes it has trailing content
        let jsonStr = runParamsMatch[1];
        // Remove any trailing semicolons or other issues
        jsonStr = jsonStr.replace(/;\s*$/, '');

        try {
          return JSON.parse(jsonStr);
        } catch (parseError) {
          logger.debug('Failed to parse runParams JSON, trying alternative extraction...');
        }
      }

      // Pattern 2: data attribute on script tag
      const dataMatch = html.match(/data-live-house-id="[\d]+"[^>]*data="([^"]+)"/);
      if (dataMatch) {
        const decoded = decodeURIComponent(dataMatch[1]);
        return JSON.parse(decoded);
      }

      // Pattern 3: __PRELOADED_STATE__
      const preloadedMatch = html.match(
        /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/
      );
      if (preloadedMatch) {
        return JSON.parse(preloadedMatch[1]);
      }

      return null;
    } catch (error) {
      logger.debug('Error extracting runParams data:', error);
      return null;
    }
  }

  /**
   * Extract prices from runParams data structure
   */
  private extractPricesFromRunParams(
    data: any
  ): { currentPrice: number; originalPrice: number; currency: string } | null {
    try {
      // Try different possible paths for price data
      const priceModule = data?.priceModule || data?.data?.priceModule;
      const skuModule = data?.skuModule || data?.data?.skuModule;

      let currentPrice = 0;
      let originalPrice = 0;
      const currency = 'BRL';

      // From priceModule
      if (priceModule) {
        if (priceModule.formatedPrice) {
          currentPrice = this.parsePrice(priceModule.formatedPrice);
        }
        if (priceModule.formatedActivityPrice) {
          currentPrice = this.parsePrice(priceModule.formatedActivityPrice);
        }
        if (priceModule.minPrice) {
          currentPrice = this.parsePrice(
            String(priceModule.minPrice.value || priceModule.minPrice)
          );
        }
        if (priceModule.maxPrice) {
          originalPrice = this.parsePrice(
            String(priceModule.maxPrice.value || priceModule.maxPrice)
          );
        }

        // Check discount list
        if (priceModule.discountList && priceModule.discountList.length > 0) {
          const discount = priceModule.discountList[0];
          if (discount.formatedPrice) {
            currentPrice = this.parsePrice(discount.formatedPrice);
          }
        }
      }

      // From skuModule
      if (skuModule?.skuPriceList && skuModule.skuPriceList.length > 0) {
        const firstSku = skuModule.skuPriceList[0];
        if (firstSku.skuVal?.skuActivityAmount?.value) {
          currentPrice = parseFloat(firstSku.skuVal.skuActivityAmount.value);
        }
        if (firstSku.skuVal?.skuAmount?.value) {
          originalPrice = parseFloat(firstSku.skuVal.skuAmount.value);
        }
      }

      if (currentPrice > 0) {
        return { currentPrice, originalPrice: originalPrice || currentPrice, currency };
      }

      return null;
    } catch (error) {
      logger.debug('Error extracting prices from runParams:', error);
      return null;
    }
  }

  /**
   * Scrape a single product page for real BRL prices
   */
  async scrapeProductPage(productUrl: string): Promise<ScrapedProduct | null> {
    try {
      await this.throttle();

      // Ensure URL is for Brazilian site
      let url = productUrl;
      if (url.includes('aliexpress.com') && !url.includes('pt.aliexpress.com')) {
        url = url.replace(/([a-z]{2}\.)?aliexpress\.com/, 'pt.aliexpress.com');
      }

      // Add gatewayAdapt for Brazilian prices
      if (!url.includes('gatewayAdapt')) {
        url += (url.includes('?') ? '&' : '?') + 'gatewayAdapt=glo2bra';
      }

      logger.debug(`🕷️ Scraping AliExpress product: ${url.substring(0, 60)}...`);

      const response = await this.client.get(url, {
        headers: {
          ...this.defaultHeaders,
          Referer: 'https://pt.aliexpress.com/',
          Cookie: 'aep_usuc_f=site=bra&c_tp=BRL&isb=y&region=BR',
        },
      });

      const html = response.data;

      // Extract product ID
      const productIdMatch = url.match(/item\/(\d+)/);
      const productId = productIdMatch ? productIdMatch[1] : 'unknown';

      // Try to extract JSON data from page
      const runParams = this.extractRunParamsData(html);

      if (runParams) {
        const prices = this.extractPricesFromRunParams(runParams);

        if (prices) {
          // Extract title
          const titleModule = runParams.titleModule || runParams.data?.titleModule;
          const title = titleModule?.subject || '';

          // Extract image
          const imageModule = runParams.imageModule || runParams.data?.imageModule;
          const imageUrl = imageModule?.imagePathList?.[0] || '';

          const discountPercentage =
            prices.originalPrice > prices.currentPrice
              ? Math.round(
                  ((prices.originalPrice - prices.currentPrice) / prices.originalPrice) * 100
                )
              : 0;

          logger.info(
            `✅ Scraped product ${productId}: R$${prices.currentPrice} (was R$${prices.originalPrice})`
          );

          return {
            productId,
            title,
            currentPrice: prices.currentPrice,
            originalPrice: prices.originalPrice,
            discountPercentage,
            currency: prices.currency,
            imageUrl,
            productUrl: url,
            available: true,
          };
        }
      }

      // Fallback: Parse HTML directly
      logger.debug('Falling back to HTML parsing...');
      return this.parseProductFromHtml(html, productId, url);
    } catch (error: any) {
      logger.warn(`⚠️ Failed to scrape product page: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse product data from HTML when JSON extraction fails
   */
  private parseProductFromHtml(
    html: string,
    productId: string,
    url: string
  ): ScrapedProduct | null {
    try {
      // Extract title
      const titleMatch =
        html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
        html.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? titleMatch[1].trim().replace(/ - AliExpress.*$/, '') : '';

      // Extract prices from HTML
      // Pattern: R$ followed by price
      const priceMatches = html.match(/R\$\s*([\d.,]+)/g);
      let currentPrice = 0;
      let originalPrice = 0;

      if (priceMatches && priceMatches.length > 0) {
        const prices = priceMatches
          .map((p: string) => this.parsePrice(p))
          .filter((p: number) => p > 0)
          .sort((a: number, b: number) => a - b);
        if (prices.length >= 2) {
          currentPrice = prices[0];
          originalPrice = prices[prices.length - 1];
        } else if (prices.length === 1) {
          currentPrice = prices[0];
          originalPrice = prices[0];
        }
      }

      // Extract discount percentage
      let discountPercentage = 0;
      const discountMatch = html.match(/(\d+)%\s*(?:de desconto|OFF)/i);
      if (discountMatch) {
        discountPercentage = parseInt(discountMatch[1], 10);
      } else if (originalPrice > currentPrice) {
        discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      }

      // Extract image
      const imageMatch =
        html.match(/<img[^>]*class="[^"]*magnifier[^"]*"[^>]*src="([^"]+)"/i) ||
        html.match(/<img[^>]*data-role="thumb"[^>]*src="([^"]+)"/i);
      const imageUrl = imageMatch ? imageMatch[1] : '';

      if (currentPrice > 0) {
        logger.info(`✅ Parsed from HTML - Product ${productId}: R$${currentPrice}`);
        return {
          productId,
          title,
          currentPrice,
          originalPrice,
          discountPercentage,
          currency: 'BRL',
          imageUrl,
          productUrl: url,
          available: true,
        };
      }

      return null;
    } catch (error) {
      logger.debug('Error parsing product from HTML:', error);
      return null;
    }
  }

  /**
   * Scrape product by ID (builds URL and calls scrapeProductPage)
   */
  async scrapeProductById(productId: string): Promise<ScrapedProduct | null> {
    const url = `https://pt.aliexpress.com/item/${productId}.html?gatewayAdapt=glo2bra`;
    return this.scrapeProductPage(url);
  }

  /**
   * Scrape the "Best Deals" page for products with real BRL prices
   */
  async scrapeBestDeals(limit: number = 20): Promise<ScrapedDealsPage> {
    try {
      await this.throttle();

      const url = 'https://best.aliexpress.com/?gatewayAdapt=glo2bra&browser_redirect=true';

      logger.info(`🕷️ Scraping AliExpress Best Deals page...`);

      const response = await this.client.get(url, {
        headers: {
          ...this.defaultHeaders,
          Referer: 'https://pt.aliexpress.com/',
          Cookie: 'aep_usuc_f=site=bra&c_tp=BRL&isb=y&region=BR',
        },
      });

      const html = response.data;
      const products: ScrapedProduct[] = [];

      // Try to extract products from embedded JSON
      const jsonDataMatch = html.match(
        /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/
      );

      if (jsonDataMatch) {
        try {
          const data = JSON.parse(jsonDataMatch[1]);
          // Extract products from the state (structure varies)
          const productList = data?.products || data?.pageData?.products || [];

          for (const item of productList.slice(0, limit)) {
            products.push({
              productId: item.productId || item.id || '',
              title: item.title || item.productTitle || '',
              currentPrice: this.parsePrice(item.price || item.salePrice || '0'),
              originalPrice: this.parsePrice(item.originalPrice || item.price || '0'),
              discountPercentage: parseInt(item.discount || '0', 10),
              currency: 'BRL',
              imageUrl: item.imageUrl || item.image || '',
              productUrl: item.productUrl || item.url || '',
              available: true,
            });
          }
        } catch (parseError) {
          logger.debug('Failed to parse deals page JSON:', parseError);
        }
      }

      // Fallback: Parse HTML product cards
      if (products.length === 0) {
        // Look for product cards in HTML
        const cardMatches = html.matchAll(
          /<div[^>]*class="[^"]*product-card[^"]*"[^>]*>([\s\S]*?)<\/div>(?=\s*<div[^>]*class="[^"]*product-card)/gi
        );

        for (const match of cardMatches) {
          const cardHtml = match[1];

          // Extract product link and ID
          const linkMatch = cardHtml.match(/href="([^"]*item\/(\d+)[^"]*)"/);
          if (!linkMatch) continue;

          const productUrl = linkMatch[1];
          const productId = linkMatch[2];

          // Extract title
          const titleMatch = cardHtml.match(/title="([^"]+)"/);
          const title = titleMatch ? titleMatch[1] : '';

          // Extract prices
          const priceMatches = cardHtml.match(/R\$\s*([\d.,]+)/g);
          let currentPrice = 0;
          let originalPrice = 0;

          if (priceMatches && priceMatches.length > 0) {
            const prices = priceMatches
              .map((p: string) => this.parsePrice(p))
              .filter((p: number) => p > 0);
            if (prices.length >= 1) {
              currentPrice = Math.min(...prices);
              originalPrice = Math.max(...prices);
            }
          }

          // Extract image
          const imageMatch = cardHtml.match(/src="([^"]+\.(?:jpg|png|webp)[^"]*)"/i);
          const imageUrl = imageMatch ? imageMatch[1] : '';

          if (currentPrice > 0 && productId) {
            products.push({
              productId,
              title,
              currentPrice,
              originalPrice: originalPrice || currentPrice,
              discountPercentage:
                originalPrice > currentPrice
                  ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                  : 0,
              currency: 'BRL',
              imageUrl,
              productUrl: productUrl.startsWith('http')
                ? productUrl
                : `https://pt.aliexpress.com${productUrl}`,
              available: true,
            });
          }

          if (products.length >= limit) break;
        }
      }

      logger.info(`✅ Scraped ${products.length} products from Best Deals page`);

      return {
        products: products.slice(0, limit),
        totalFound: products.length,
      };
    } catch (error: any) {
      logger.error(`❌ Failed to scrape Best Deals page: ${error.message}`);
      return { products: [], totalFound: 0 };
    }
  }

  /**
   * Scrape the SSR Bestsellers page for products
   * This page uses server-side rendering which should be easier to scrape
   * URL: https://www.aliexpress.com/ssr/300001995/...
   */
  async scrapeBestsellersSSR(limit: number = 20): Promise<ScrapedDealsPage> {
    try {
      await this.throttle();

      // SSR Bestsellers page with Brazilian gateway
      const url =
        'https://www.aliexpress.com/ssr/300001995/N3KsYt2f3a?disableNav=YES&pha_manifest=ssr&_immersiveMode=true&gatewayAdapt=glo2bra';

      logger.info(`🕷️ Scraping AliExpress SSR Bestsellers page...`);

      const response = await this.client.get(url, {
        headers: {
          ...this.defaultHeaders,
          Referer: 'https://best.aliexpress.com/',
          Cookie: 'aep_usuc_f=site=bra&c_tp=BRL&isb=y&region=BR',
        },
      });

      const html = response.data;
      const products: ScrapedProduct[] = [];

      // Log HTML length for debugging
      logger.debug(`📄 SSR page HTML length: ${html.length} bytes`);

      // Try to extract __INIT_DATA__ or similar SSR data
      const initDataPatterns = [
        /window\.__INIT_DATA__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|window\.)/,
        /window\._dida_config_\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|window\.)/,
        /"data"\s*:\s*(\{[\s\S]*?"products"[\s\S]*?\})\s*[,}]/,
        /runParams\s*:\s*(\{[\s\S]*?\})\s*,?\s*(?:window\.|<\/script>)/,
      ];

      for (const pattern of initDataPatterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            logger.info(`✅ Found SSR data with pattern`);

            // Look for products in various possible locations
            const productLists = [
              data.products,
              data.data?.products,
              data.items,
              data.data?.items,
              data.pageData?.products,
              data.preFetch?.products,
            ].filter(Boolean);

            for (const list of productLists) {
              if (Array.isArray(list) && list.length > 0) {
                for (const item of list.slice(0, limit)) {
                  const product = this.parseSSRProduct(item);
                  if (product) {
                    products.push(product);
                  }
                }
                break;
              }
            }

            if (products.length > 0) break;
          } catch (parseError) {
            logger.debug('Failed to parse SSR data:', parseError);
          }
        }
      }

      // Fallback: Try to find product data in HTML directly
      if (products.length === 0) {
        logger.debug('Trying HTML-based extraction...');

        // Look for product items in HTML
        // Pattern for SSR rendered product cards
        const productRegex =
          /"productId"\s*:\s*"?(\d+)"?\s*,[\s\S]*?"title"\s*:\s*"([^"]+)"[\s\S]*?"(?:price|salePrice)"\s*:\s*"?([0-9.]+)"?/g;

        let match;
        while ((match = productRegex.exec(html)) !== null && products.length < limit) {
          const [, productId, title, price] = match;
          const currentPrice = parseFloat(price) || 0;

          if (currentPrice > 0) {
            products.push({
              productId,
              title: title.replace(/\\u[\dA-Fa-f]{4}/g, (m) =>
                String.fromCharCode(parseInt(m.substring(2), 16))
              ),
              currentPrice,
              originalPrice: currentPrice,
              discountPercentage: 0,
              currency: 'BRL',
              imageUrl: '',
              productUrl: `https://pt.aliexpress.com/item/${productId}.html`,
              available: true,
            });
          }
        }
      }

      // Secondary fallback: Look for R$ prices in HTML
      if (products.length === 0) {
        logger.debug('Trying R$ price extraction...');

        // Look for price patterns with product IDs nearby
        const priceBlocks = html.matchAll(/item\/(\d+)[^"]*"[\s\S]{0,500}?R\$\s*([\d.,]+)/g);

        for (const block of priceBlocks) {
          const [, productId, priceStr] = block;
          const currentPrice = this.parsePrice(priceStr);

          if (currentPrice > 0 && !products.some((p) => p.productId === productId)) {
            products.push({
              productId,
              title: '',
              currentPrice,
              originalPrice: currentPrice,
              discountPercentage: 0,
              currency: 'BRL',
              imageUrl: '',
              productUrl: `https://pt.aliexpress.com/item/${productId}.html`,
              available: true,
            });

            if (products.length >= limit) break;
          }
        }
      }

      logger.info(`✅ Scraped ${products.length} products from SSR Bestsellers page`);

      return {
        products: products.slice(0, limit),
        totalFound: products.length,
      };
    } catch (error: any) {
      logger.error(`❌ Failed to scrape SSR Bestsellers page: ${error.message}`);
      return { products: [], totalFound: 0 };
    }
  }

  /**
   * Parse a product from SSR JSON data
   */
  private parseSSRProduct(item: any): ScrapedProduct | null {
    try {
      const productId = String(item.productId || item.id || item.itemId || '');
      if (!productId) return null;

      const title = item.title || item.productTitle || item.name || '';
      const currentPrice = this.parsePrice(
        String(item.price || item.salePrice || item.currentPrice || '0')
      );
      const originalPrice = this.parsePrice(
        String(item.originalPrice || item.marketPrice || currentPrice)
      );

      if (currentPrice <= 0) return null;

      let discountPercentage = 0;
      if (item.discount) {
        discountPercentage = parseInt(String(item.discount).replace('%', ''), 10) || 0;
      } else if (originalPrice > currentPrice) {
        discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      }

      return {
        productId,
        title,
        currentPrice,
        originalPrice: originalPrice || currentPrice,
        discountPercentage,
        currency: 'BRL',
        imageUrl: item.imageUrl || item.image || item.imgUrl || '',
        productUrl:
          item.productUrl || item.url || `https://pt.aliexpress.com/item/${productId}.html`,
        available: true,
      };
    } catch {
      return null;
    }
  }
}
