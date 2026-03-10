import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { logger } from '../../utils/logger';
import { existsSync } from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Add stealth plugin
puppeteer.use(StealthPlugin());

export class MercadoLivreScraper {
  // Singleton instance
  private static instance: MercadoLivreScraper | null = null;

  // Mutex for browser launch
  private launchLock: Promise<void> = Promise.resolve();

  private browser: Browser | null = null;
  private userAgent: string = '';
  private lastActivity: number = 0;
  private SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Active contexts counter to prevent closing while in use
  private activeContexts: number = 0;

  private constructor() { } // Private constructor for singleton

  /**
   * Get the singleton instance of MercadoLivreScraper
   */
  static getInstance(): MercadoLivreScraper {
    if (!MercadoLivreScraper.instance) {
      MercadoLivreScraper.instance = new MercadoLivreScraper();
    }
    return MercadoLivreScraper.instance;
  }

  /**
   * Acquire exclusive lock for browser launch
   */
  private async acquireLaunchLock(): Promise<() => void> {
    let releaseFn: () => void;
    const waitForLock = this.launchLock;

    this.launchLock = new Promise<void>((resolve) => {
      releaseFn = resolve;
    });

    await waitForLock;
    return releaseFn!;
  }

  /**
   * Execute an operation with an isolated Incognito context
   */
  async withContext<T>(
    operation: (page: Page) => Promise<T>,
    cookiesToLoad?: any[]
  ): Promise<T> {
    await this.initBrowser();
    
    if (!this.browser) {
      throw new Error('Failed to initialize browser');
    }

    this.activeContexts++;
    const context = await this.browser.createIncognitoBrowserContext();
    const page = await context.newPage();

    try {
      // Use standard stealth UA if none resolved
      if (this.userAgent) {
        await page.setUserAgent(this.userAgent);
      }
      
      // Navigate once to ensure cookies can be set on the ML domain
      if (cookiesToLoad && cookiesToLoad.length > 0) {
        const urlToSet = 'https://www.mercadolivre.com.br';
        await page.goto(urlToSet, { waitUntil: 'domcontentloaded' });
        await page.setCookie(...cookiesToLoad);
      } else {
        await page.setViewport({ width: 1920, height: 1080 });
      }

      const result = await operation(page);
      this.lastActivity = Date.now();
      return result;
    } finally {
      await context.close().catch(e => logger.warn(`Error closing context: ${e.message}`));
      this.activeContexts--;
    }
  }

  /**
   * Initializes the browser process (runs once)
   */
  async initBrowser(): Promise<void> {
    if (this.browser && Date.now() - this.lastActivity < this.SESSION_TIMEOUT) {
      return; // Browser is active
    }

    const release = await this.acquireLaunchLock();
    try {
      // Check again after acquiring lock
      if (this.browser && Date.now() - this.lastActivity < this.SESSION_TIMEOUT) {
        return;
      }

      if (this.browser) {
        await this.closeSession();
      }

      logger.info('🚀 Launching Stealth Browser for Mercado Livre...');

      let executablePath: string | undefined = undefined;
      let chromeSource = 'bundled';

      // (Paths definition logic remains identical)
      const windowsChromePaths = [
        '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
        '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      ];
      const linuxChromePaths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
      const chromiumPaths = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'];

      for (const path of windowsChromePaths) {
        if (existsSync(path)) {
          executablePath = path;
          chromeSource = 'Windows Chrome via WSL';
          break;
        }
      }

      if (!executablePath) {
        for (const path of linuxChromePaths) {
          if (existsSync(path)) {
            executablePath = path;
            chromeSource = 'Google Chrome (Linux)';
            break;
          }
        }
      }

      if (!executablePath) {
        for (const path of chromiumPaths) {
          if (existsSync(path)) {
            executablePath = path;
            chromeSource = 'Chromium (Linux) - may have stealth issues';
            logger.warn('⚠️ Using Chromium instead of Chrome. Stealth features may not work properly.');
            break;
          }
        }
      }

      if (executablePath) {
        logger.info(`🖥️ Browser: ${chromeSource} | Path: ${executablePath}`);
      } else {
        logger.info('🖥️ Using Puppeteer bundled Chromium');
      }

      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ];

      const proxyUrl = process.env.PROXY_URL;
      if (proxyUrl && !proxyUrl.includes('user:pass') && !proxyUrl.includes('host:port')) {
        logger.info(`🌐 Using Proxy: ${proxyUrl.replace(/\/\/.*@/, '//***:***@')}`);
        args.push(`--proxy-server=${proxyUrl}`);
      }

      this.browser = await puppeteer.launch({
        headless: 'new',
        executablePath,
        args: args,
        ignoreHTTPSErrors: true,
      });

      // Quick test to get user agent
      const startupPage = await this.browser.newPage();
      this.userAgent = await startupPage.evaluate(() => navigator.userAgent);
      await startupPage.close();

      this.lastActivity = Date.now();
      logger.info(`✅ Browser process started.`);
    } catch (error: any) {
      logger.error(`❌ Failed to init browser: ${error.message}`);
      await this.closeSession();
      throw error;
    } finally {
      release();
    }
  }

  /**
   * Helper to load affiliate cookies correctly from environment or json
   */
  private loadAffiliateCookiesFromSrc(cookieSource?: string): any[] {
    if (!cookieSource) return [];
    try {
      if (cookieSource.endsWith('.json') && existsSync(cookieSource)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        return JSON.parse(fs.readFileSync(cookieSource, 'utf-8'));
      }
      return JSON.parse(cookieSource);
    } catch (error: any) {
      logger.warn(`⚠️ Failed to parse affiliate cookies: ${error.message}`);
      return [];
    }
  }

  /**
   * Generates an affiliate link using the authenticated session
   * Route A: Simulates the "Link Generator" request
   * Modified to accept cookies to ensure Multi-Tenancy
   */
  async generateAffiliateLink(productUrl: string, cookieSource?: string): Promise<string> {
    const generatorEndpoint = process.env.MERCADOLIVRE_LINK_GENERATOR_ENDPOINT;
    if (!generatorEndpoint) {
      logger.warn('⚠️ MERCADOLIVRE_LINK_GENERATOR_ENDPOINT not configured. Returning original URL.');
      return productUrl;
    }

    const cookies = this.loadAffiliateCookiesFromSrc(
      cookieSource || process.env.MERCADOLIVRE_AFFILIATE_COOKIES
    );

    return this.withContext(async (page) => {
      try {
        logger.info(`🔗 Generating affiliate link for: ${productUrl}`);

        if (page.url() === 'about:blank') {
          await page.goto('https://www.mercadolivre.com.br', { waitUntil: 'domcontentloaded' });
        }

        const result = await page.evaluate(
          async (endpoint, url) => {
            try {
              const payload = { url: url };

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              const data = await response.json();
              return data.link || data.url || data.short_url || null;
            } catch (e: any) {
              return { error: e.message };
            }
          },
          generatorEndpoint,
          productUrl
        );

        if (result && typeof result === 'string') {
          logger.info('✅ Affiliate link generated successfully');
          await new Promise((r) => setTimeout(r, 300));
          return result;
        } else if (result && result.error) {
          if (result.error.includes('429') || result.error.includes('Too Many')) {
            logger.warn('⚠️ Rate limited by ML. Waiting 2 seconds before continuing...');
            await new Promise((r) => setTimeout(r, 2000));
          }
          logger.warn(`⚠️ Link generation error: ${result.error}`);
        } else {
          logger.warn('⚠️ Link generation returned unknown format');
        }

        return productUrl;
      } catch (error: any) {
        logger.error(`❌ Link Generation Failed: ${error.message}`);
        return productUrl;
      }
    }, cookies);
  }

  /**
   * Returns generic headers since global cookies have been isolated per-context
   */
  async getHeaders(): Promise<Record<string, string>> {
    return {
      'User-Agent': this.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
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
    };
  }

  /**
   * Scrape search results directly from the DOM (More robust than Regex)
   */
  async scrapeSearchResults(url: string): Promise<any[]> {
    return this.withContext(async (page) => {
      logger.info(`🕷️ Stealth Scraping DOM: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Debug: Take screenshot and log title
      const pageTitle = await page.title();
      logger.info(`📄 Page Title: ${pageTitle}`);

      if (pageTitle.includes('CAPTCHA') || pageTitle.includes('Security Check')) {
        logger.warn('⚠️ CAPTCHA detected! Context might be blocked.');
      }

      // Wait for results to load (try multiple selectors)
      try {
        await page.waitForFunction(
          () =>
            document.querySelectorAll('.ui-search-layout__item, .poly-card, .andes-card').length >
            0,
          { timeout: 10000 }
        );
      } catch (e) {
        logger.warn('⚠️ No search results selector found (might be empty or captcha)');
      }

      // Scroll to trigger lazy loading of images
      logger.info('📜 Scrolling to load lazy images...');
      await page.evaluate(async () => {
        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        const scrollStep = 400;
        const maxScrolls = 10;

        for (let i = 0; i < maxScrolls; i++) {
          window.scrollBy(0, scrollStep);
          await delay(200);
        }

        // Scroll back to top
        window.scrollTo(0, 0);
        await delay(500);
      });

      // Extract data using DOM APIs with Multi-Selector Strategy
      const products = await page.evaluate(() => {
        const results: any[] = [];

        // Strategy: Try all known item selectors
        const selectors = [
          '.ui-search-layout__item', // Standard Grid/List
          '.poly-card', // New "Poly" Design
          '.andes-card', // Generic Andes Card
          'li.ui-search-layout__item', // Specific List Item
        ];

        let items: NodeListOf<Element> | never[] = [];
        for (const selector of selectors) {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            items = found;
            break;
          }
        }

        // Helper to get real image URL (handles lazy loading)
        const getImageUrl = (imgEl: Element | null): string => {
          if (!imgEl) return '';

          // Priority order for image sources
          const sources = [
            imgEl.getAttribute('data-src'),
            imgEl.getAttribute('data-zoom'),
            imgEl.getAttribute('srcset')?.split(' ')[0],
            imgEl.getAttribute('src'),
          ];

          for (const src of sources) {
            if (src && !src.startsWith('data:image/gif') && !src.includes('base64')) {
              // Clean up the URL if needed
              return src.replace(/-[A-Z]\./, '-O.'); // Get larger image variant
            }
          }

          return '';
        };

        // Helper to extract original price for discount calculation
        const getOriginalPrice = (item: Element): number => {
          const originalPriceEl =
            item.querySelector('.andes-money-amount--previous .andes-money-amount__fraction') ||
            item.querySelector('.poly-price__previous .andes-money-amount__fraction') ||
            item.querySelector('[class*="original"] .andes-money-amount__fraction') ||
            item.querySelector('.ui-search-price__original-value .andes-money-amount__fraction') ||
            item.querySelector('s .andes-money-amount__fraction') || // <s> tag means strikethrough
            item.querySelector('del .andes-money-amount__fraction'); // <del> tag also strikethrough

          if (originalPriceEl) {
            const priceText =
              originalPriceEl.textContent?.replace(/\./g, '').replace(/,/g, '.') || '0';
            return parseFloat(priceText);
          }
          return 0;
        };

        // Helper to get the CURRENT (promotional) price - the green/large one
        const getCurrentPrice = (item: Element): number => {
          const priceSelectors = [
            '.poly-price__current .andes-money-amount__fraction',
            '.ui-search-price__second-line .andes-money-amount__fraction', // This is usually the promotional price
            '.ui-search-price__part--medium .andes-money-amount__fraction',
          ];

          for (const selector of priceSelectors) {
            const el = item.querySelector(selector);
            if (el) {
              const priceText = el.textContent?.replace(/\./g, '').replace(/,/g, '.') || '0';
              const price = parseFloat(priceText);
              if (price > 0) return price;
            }
          }

          const allPriceEls = item.querySelectorAll('.andes-money-amount__fraction');
          let lowestPrice = Infinity;

          allPriceEls.forEach((el) => {
            const priceText = el.textContent?.replace(/\./g, '').replace(/,/g, '.') || '0';
            const price = parseFloat(priceText);
            if (price > 0 && price < lowestPrice) {
              lowestPrice = price;
            }
          });

          return lowestPrice === Infinity ? 0 : lowestPrice;
        };

        const getDiscountPercentage = (item: Element): number | undefined => {
          const discountEl =
            item.querySelector('.poly-component__discount') ||
            item.querySelector('[class*="discount"]') ||
            item.querySelector('.andes-badge__content');

          if (discountEl) {
            const text = discountEl.textContent || '';
            const match = text.match(/(\d+)%/);
            if (match) {
              return parseInt(match[1]);
            }
          }
          return undefined;
        };

        items.forEach((item: Element) => {
          try {
            const titleEl =
              item.querySelector('.ui-search-item__title') ||
              item.querySelector('.poly-component__title') ||
              item.querySelector('h2');
            const title = titleEl?.textContent?.trim() || '';

            const linkEl =
              item.querySelector('a.ui-search-link') ||
              item.querySelector('a.poly-component__title') ||
              item.querySelector('a');
            const permalink = linkEl?.getAttribute('href') || '';

            const currentPrice = getCurrentPrice(item);
            const originalPrice = getOriginalPrice(item);
            const discountFromBadge = getDiscountPercentage(item);

            const imgEl =
              item.querySelector('img.ui-search-result-image__element') ||
              item.querySelector('img.poly-component__picture') ||
              item.querySelector('img[data-src]') ||
              item.querySelector('img');
            const thumbnail = getImageUrl(imgEl);

            let id = '';
            if (permalink) {
              const idMatch = permalink.match(/(MLB-?\d+)/i) || permalink.match(/\/p\/(MLB\d+)/);
              id = idMatch ? idMatch[1].replace('-', '') : '';
            }

            if (title && currentPrice > 0 && permalink) {
              results.push({
                id: id || `MLB${Date.now()}${Math.random().toString().slice(2, 5)}`,
                title,
                price: currentPrice, // The sale/promotional price
                original_price: originalPrice > currentPrice ? originalPrice : undefined,
                discount_percentage: discountFromBadge,
                currency_id: 'BRL',
                available_quantity: 1,
                condition: 'new',
                permalink,
                thumbnail,
                pictures: thumbnail ? [{ url: thumbnail }] : [],
              });
            }
          } catch {
            // Skip item on error - intentionally ignored
          }
        });

        return results;
      });

      return products;
    });
  }

  /**
   * Scrape "Ofertas do Dia" page (Page 1 only to avoid bans)
   */
  async scrapeDailyDeals(): Promise<any[]> {
    const url = 'https://www.mercadolivre.com.br/ofertas#nav-header';

    return this.withContext(async (page) => {
      logger.info(`🕷️ Stealth Scraping Deals: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Anti-ban: Random delay to simulate human reading
      const delay = Math.floor(Math.random() * 2000) + 1000;
      await new Promise((r) => setTimeout(r, delay));

      // Wait for results
      try {
        await page.waitForSelector('.promotion-item, .poly-card', { timeout: 10000 });
      } catch (e) {
        logger.warn('⚠️ No deals selector found (might be empty or captcha)');
      }

      // Extract data
      const products = await page.evaluate(() => {
        const results: any[] = [];

        // Selectors for offers page
        const items = document.querySelectorAll('.promotion-item, .poly-card');

        items.forEach((item: Element) => {
          try {
            // Title
            const titleEl =
              item.querySelector('.promotion-item__title') ||
              item.querySelector('.poly-component__title') ||
              item.querySelector('p');
            const title = titleEl?.textContent?.trim() || '';

            // Link
            const linkEl =
              item.querySelector('a.promotion-item__link-container') ||
              item.querySelector('a.poly-component__title') ||
              item.querySelector('a');
            const permalink = linkEl?.getAttribute('href') || '';

            // Price
            const priceEl = item.querySelector('.andes-money-amount__fraction');
            const priceText = priceEl?.textContent?.replace(/\./g, '') || '0';
            const price = parseFloat(priceText);

            // Image
            const imgEl =
              item.querySelector('img.promotion-item__img') ||
              item.querySelector('img.poly-component__picture') ||
              item.querySelector('img');
            const thumbnail = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';

            // ID extraction
            let id = '';
            if (permalink) {
              const idMatch = permalink.match(/(MLB-?\d+)/i) || permalink.match(/\/p\/(MLB\d+)/);
              id = idMatch ? idMatch[1].replace('-', '') : '';
            }

            if (title && price > 0 && permalink) {
              results.push({
                id: id || `MLB${Date.now()}${Math.random().toString().slice(2, 5)}`,
                title,
                price,
                currency_id: 'BRL',
                available_quantity: 1,
                condition: 'new',
                permalink,
                thumbnail,
                pictures: [{ url: thumbnail }],
              });
            }
          } catch {
            // Skip item - intentionally ignored
          }
        });

        return results;
      });

      logger.info(`✅ Found ${products.length} daily deals`);
      return products;
    });
  }

  /**
   * Scrapes the Mercado Livre "/ofertas" page.
   */
  public async scrapeOfertas(limit: number = 20): Promise<any[]> {
    try {
      const url = 'https://www.mercadolivre.com.br/ofertas';
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const offers: any[] = [];

      // Selectors adjusted for Mercado Livre's promo items (often change, using multiple fallbacks)
      $('.promotion-item, .poly-card').each((i, element) => {
        if (i >= limit) return false;

        const title = $(element).find('.promotion-item__title, .poly-component__title').text().trim();
        const priceText = $(element).find('.andes-money-amount__fraction').first().text().trim();
        const link = $(element).find('a').attr('href');
        const imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');

        if (title && link) {
          offers.push({
            title,
            price: priceText ? parseFloat(priceText.replace(/\./g, '').replace(',', '.')) : 0,
            url: link,
            imageUrl,
            platform: 'MERCADO_LIVRE',
            source: 'OFERTAS',
            extractedAt: new Date()
          });
        }
        return true;
      });

      return offers;
    } catch (error) {
      logger.error('❌ [MercadoLivreScraper] Error scraping /ofertas:', error);
      return [];
    }
  }

  /**
   * Scrapes the Mercado Livre "/mais-vendidos" categories.
   */
  public async scrapeMaisVendidos(categoryUrl: string, limit: number = 20): Promise<any[]> {
    try {
      const { data } = await axios.get(categoryUrl);
      const $ = cheerio.load(data);
      const trending: any[] = [];

      $('.ui-search-result__wrapper, .poly-card').each((i, element) => {
        if (i >= limit) return false;

        const title = $(element).find('.ui-search-item__title, .poly-component__title').text().trim();
        const priceText = $(element).find('.andes-money-amount__fraction').first().text().trim();
        const link = $(element).find('a').attr('href');
        const imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');

        if (title && link) {
          trending.push({
            title,
            price: priceText ? parseFloat(priceText.replace(/\./g, '').replace(',', '.')) : 0,
            url: link,
            imageUrl,
            platform: 'MERCADO_LIVRE',
            source: 'MAIS_VENDIDOS',
            extractedAt: new Date()
          });
        }
        return true;
      });

      return trending;
    } catch (error) {
      logger.error('❌ [MercadoLivreScraper] Error scraping /mais-vendidos:', error);
      return [];
    }
  }

  /**
   * Close the browser session safely
   * Checks if active contexts exist before closing
   */
  async closeSession(): Promise<void> {
    if (this.activeContexts > 0) {
      logger.info(`⏳ Deferring browser close - ${this.activeContexts} active contexts`);
      return; // Do not close if there are active contexts
    }

    if (this.browser) {
      logger.info('🔒 Closing global browser session...');
      try {
        await this.browser.close();
      } catch (error: any) {
        logger.warn(`⚠️ Error closing browser: ${error.message}`);
      }
    }
    this.browser = null;
  }

  /**
   * Force reset the singleton instance (for testing/recovery)
   */
  static resetInstance(): void {
    if (MercadoLivreScraper.instance) {
      MercadoLivreScraper.instance.closeSession().catch(() => { /* Ignore close errors */ });
      MercadoLivreScraper.instance = null;
    }
  }
}
