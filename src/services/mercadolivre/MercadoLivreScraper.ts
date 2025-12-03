import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { logger } from '../../utils/logger';
import { existsSync } from 'fs';

// Add stealth plugin
puppeteer.use(StealthPlugin());

export class MercadoLivreScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private cookies: any[] = [];
    private userAgent: string = '';
    private lastActivity: number = 0;
    private SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    constructor() { }

    /**
     * Initializes the browser session to bypass Cloudflare and get valid cookies
     */
    async initSession(): Promise<void> {
        if (this.browser && (Date.now() - this.lastActivity < this.SESSION_TIMEOUT)) {
            return; // Session still valid
        }

        if (this.browser) {
            await this.closeSession();
        }

        logger.info('🚀 Launching Stealth Browser for Mercado Livre...');

        let executablePath: string | undefined = undefined;

        // Check for Windows Chrome in WSL (Common workaround for missing Linux libs)
        const possiblePaths = [
            '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
            '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
        ];

        for (const path of possiblePaths) {
            if (existsSync(path)) {
                executablePath = path;
                logger.info(`🖥️ Using Windows Chrome from WSL: ${executablePath}`);
                break;
            }
        }

        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                executablePath, // Use Windows Chrome if found, otherwise default to bundled
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars',
                    '--window-position=0,0',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                ],
                ignoreHTTPSErrors: true,
            });

            this.page = await this.browser.newPage();

            // Set a realistic viewport
            await this.page.setViewport({ width: 1920, height: 1080 });

            // Navigate to home page to generate cookies
            logger.info('🌍 Navigating to Mercado Livre Home to generate cookies...');
            await this.page.goto('https://www.mercadolivre.com.br', {
                waitUntil: 'networkidle2',
                timeout: 60000,
            });

            // Wait a bit for any JS challenges or cookie setting
            await new Promise(r => setTimeout(r, 3000));

            // Extract cookies and UA
            this.cookies = await this.page.cookies();
            this.userAgent = await this.page.evaluate(() => navigator.userAgent);
            this.lastActivity = Date.now();

            logger.info(`✅ Session Initialized! Got ${this.cookies.length} cookies.`);

            // Log important cookies for debugging
            const meliLab = this.cookies.find(c => c.name === 'meli_lab');
            if (meliLab) logger.debug(`   🍪 meli_lab: ${meliLab.value}`);

        } catch (error: any) {
            logger.error(`❌ Failed to init scraper session: ${error.message}`);
            await this.closeSession();
            throw error;
        }
    }

    /**
     * Returns headers (Cookie + UA) for use in Axios
     */
    async getHeaders(): Promise<Record<string, string>> {
        await this.initSession();

        const cookieString = this.cookies
            .map(c => `${c.name}=${c.value}`)
            .join('; ');

        return {
            'User-Agent': this.userAgent,
            'Cookie': cookieString,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
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
        await this.initSession();

        if (!this.page) throw new Error('Page not initialized');

        try {
            logger.info(`🕷️ Stealth Scraping DOM: ${url}`);
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Debug: Take screenshot and log title
            const pageTitle = await this.page.title();
            logger.info(`📄 Page Title: ${pageTitle}`);

            try {
                await this.page.screenshot({ path: 'scripts/debug_scraper.png' });
                logger.info('📸 Debug screenshot saved to scripts/debug_scraper.png');
            } catch (e) {
                logger.warn('⚠️ Failed to save debug screenshot');
            }

            if (pageTitle.includes('CAPTCHA') || pageTitle.includes('Security Check')) {
                logger.warn('⚠️ CAPTCHA detected! Session might be blocked.');
            }

            // Wait for results to load (try multiple selectors)
            try {
                await this.page.waitForFunction(
                    () => document.querySelectorAll('.ui-search-layout__item, .poly-card, .andes-card').length > 0,
                    { timeout: 10000 }
                );
            } catch (e) {
                logger.warn('⚠️ No search results selector found (might be empty or captcha)');
            }

            // Extract data using DOM APIs with Multi-Selector Strategy
            const products = await this.page.evaluate(() => {
                const results: any[] = [];

                // Strategy: Try all known item selectors
                const selectors = [
                    '.ui-search-layout__item', // Standard Grid/List
                    '.poly-card',              // New "Poly" Design
                    '.andes-card',             // Generic Andes Card
                    'li.ui-search-layout__item' // Specific List Item
                ];

                let items: NodeListOf<Element> | never[] = [];
                for (const selector of selectors) {
                    const found = document.querySelectorAll(selector);
                    if (found.length > 0) {
                        items = found;
                        break;
                    }
                }

                items.forEach((item: Element) => {
                    try {
                        // Title Selectors
                        const titleEl = item.querySelector('.ui-search-item__title') ||
                            item.querySelector('.poly-component__title') ||
                            item.querySelector('h2');
                        const title = titleEl?.textContent?.trim() || '';

                        // Link Selectors
                        const linkEl = item.querySelector('a.ui-search-link') ||
                            item.querySelector('a.poly-component__title') ||
                            item.querySelector('a');
                        const permalink = linkEl?.getAttribute('href') || '';

                        // Price Selectors
                        const priceEl = item.querySelector('.andes-money-amount__fraction') ||
                            item.querySelector('.poly-price__current .andes-money-amount__fraction');
                        const priceText = priceEl?.textContent?.replace(/\./g, '') || '0';
                        const price = parseFloat(priceText);

                        // Image Selectors
                        const imgEl = item.querySelector('img.ui-search-result-image__element') ||
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
                                pictures: [{ url: thumbnail }]
                            });
                        }
                    } catch (err) {
                        // Skip item on error
                    }
                });

                return results;
            });

            this.lastActivity = Date.now();
            return products;

        } catch (error: any) {
            logger.error(`❌ DOM Scraping Failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Scrape "Ofertas do Dia" page (Page 1 only to avoid bans)
     */
    async scrapeDailyDeals(): Promise<any[]> {
        await this.initSession();

        if (!this.page) throw new Error('Page not initialized');

        const url = 'https://www.mercadolivre.com.br/ofertas#nav-header';

        try {
            logger.info(`🕷️ Stealth Scraping Deals: ${url}`);
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Anti-ban: Random delay to simulate human reading
            const delay = Math.floor(Math.random() * 2000) + 1000;
            await new Promise(r => setTimeout(r, delay));

            // Wait for results
            try {
                await this.page.waitForSelector('.promotion-item, .poly-card', { timeout: 10000 });
            } catch (e) {
                logger.warn('⚠️ No deals selector found (might be empty or captcha)');
            }

            // Extract data
            const products = await this.page.evaluate(() => {
                const results: any[] = [];

                // Selectors for offers page
                const items = document.querySelectorAll('.promotion-item, .poly-card');

                items.forEach((item: Element) => {
                    try {
                        // Title
                        const titleEl = item.querySelector('.promotion-item__title') ||
                            item.querySelector('.poly-component__title') ||
                            item.querySelector('p');
                        const title = titleEl?.textContent?.trim() || '';

                        // Link
                        const linkEl = item.querySelector('a.promotion-item__link-container') ||
                            item.querySelector('a.poly-component__title') ||
                            item.querySelector('a');
                        const permalink = linkEl?.getAttribute('href') || '';

                        // Price
                        const priceEl = item.querySelector('.andes-money-amount__fraction');
                        const priceText = priceEl?.textContent?.replace(/\./g, '') || '0';
                        const price = parseFloat(priceText);

                        // Image
                        const imgEl = item.querySelector('img.promotion-item__img') ||
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
                                pictures: [{ url: thumbnail }]
                            });
                        }
                    } catch (err) {
                        // Skip item
                    }
                });

                return results;
            });

            logger.info(`✅ Found ${products.length} daily deals`);
            this.lastActivity = Date.now();
            return products;

        } catch (error: any) {
            logger.error(`❌ Deals Scraping Failed: ${error.message}`);
            throw error;
        }
    }

    async closeSession() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}
