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
            '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium'
        ];

        for (const path of possiblePaths) {
            if (existsSync(path)) {
                executablePath = path;
                logger.info(`🖥️ Using Windows Chrome from WSL: ${executablePath}`);
                break;
            }
        }

        try {
            const args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
            ];

            const proxyUrl = process.env.PROXY_URL;
            // Only use proxy if it's a valid URL (not a placeholder like 'user:pass@host:port')
            if (proxyUrl && !proxyUrl.includes('user:pass') && !proxyUrl.includes('host:port')) {
                logger.info(`🌐 Using Proxy: ${proxyUrl.replace(/\/\/.*@/, '//***:***@')}`); // Mask credentials
                args.push(`--proxy-server=${proxyUrl}`);
            } else if (proxyUrl) {
                logger.warn('⚠️ PROXY_URL appears to be a placeholder - ignoring. Set a real proxy or remove the variable.');
            }

            this.browser = await puppeteer.launch({
                headless: 'new',
                executablePath, // Use Windows/Linux Chrome if found, otherwise default to bundled
                args: args,
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
     * Loads affiliate cookies from environment variable or file
     */
    private async loadAffiliateCookies(): Promise<void> {
        if (!this.page) return;

        const cookieSource = process.env.MERCADOLIVRE_AFFILIATE_COOKIES;
        if (!cookieSource) return;

        try {
            let cookies: any[] = [];

            // Check if it's a file path
            if (cookieSource.endsWith('.json') && existsSync(cookieSource)) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const fs = require('fs');
                const content = fs.readFileSync(cookieSource, 'utf-8');
                cookies = JSON.parse(content);
            } else {
                // Assume it's a JSON string
                cookies = JSON.parse(cookieSource);
            }

            if (Array.isArray(cookies) && cookies.length > 0) {
                await this.page.setCookie(...cookies);
                logger.info(`🍪 Loaded ${cookies.length} affiliate cookies`);

                // Update local cookies array
                this.cookies = await this.page.cookies();
            }
        } catch (error: any) {
            logger.warn(`⚠️ Failed to load affiliate cookies: ${error.message}`);
        }
    }

    /**
     * Generates an affiliate link using the authenticated session
     * Route A: Simulates the "Link Generator" request
     */
    async generateAffiliateLink(productUrl: string): Promise<string> {
        await this.initSession();
        await this.loadAffiliateCookies();

        if (!this.page) throw new Error('Page not initialized');

        const generatorEndpoint = process.env.MERCADOLIVRE_LINK_GENERATOR_ENDPOINT;

        if (!generatorEndpoint) {
            logger.warn('⚠️ MERCADOLIVRE_LINK_GENERATOR_ENDPOINT not configured. Returning original URL.');
            return productUrl;
        }

        try {
            logger.info(`🔗 Generating affiliate link for: ${productUrl}`);

            // Navigate to a safe page (e.g., home or affiliate panel) to ensure cookies are active
            // We don't necessarily need to be on the generator page if we are just doing a fetch,
            // but being on the domain is required for cookies to be sent.
            if (this.page.url() === 'about:blank') {
                await this.page.goto('https://www.mercadolivre.com.br', { waitUntil: 'domcontentloaded' });
            }

            // Execute the request in the browser context to use the session cookies
            const result = await this.page.evaluate(async (endpoint, url) => {
                try {
                    // This payload structure is a guess/example. 
                    // The user needs to verify the actual payload required by the endpoint.
                    const payload = {
                        url: url,
                        // Add other required fields if known, e.g., campaign_id
                    };

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            // 'X-CSRF-Token': '...' // Might be needed
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    // Adjust based on actual response structure
                    return data.link || data.url || data.short_url || null;
                } catch (e: any) {
                    return { error: e.message };
                }
            }, generatorEndpoint, productUrl);

            if (result && typeof result === 'string') {
                logger.info('✅ Affiliate link generated successfully');
                // Rate limit protection: Wait 300ms between link generations
                await new Promise(r => setTimeout(r, 300));
                return result;
            } else if (result && result.error) {
                // Check for rate limit error
                if (result.error.includes('429') || result.error.includes('Too Many')) {
                    logger.warn('⚠️ Rate limited by ML. Waiting 2 seconds before continuing...');
                    await new Promise(r => setTimeout(r, 2000));
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

            // Scroll to trigger lazy loading of images
            logger.info('📜 Scrolling to load lazy images...');
            await this.page.evaluate(async () => {
                const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
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
                    // Try to find the crossed-out/previous price
                    const originalPriceEl = item.querySelector('.andes-money-amount--previous .andes-money-amount__fraction') ||
                        item.querySelector('.poly-price__previous .andes-money-amount__fraction') ||
                        item.querySelector('[class*="original"] .andes-money-amount__fraction') ||
                        item.querySelector('.ui-search-price__original-value .andes-money-amount__fraction') ||
                        item.querySelector('s .andes-money-amount__fraction') || // <s> tag means strikethrough
                        item.querySelector('del .andes-money-amount__fraction'); // <del> tag also strikethrough

                    if (originalPriceEl) {
                        const priceText = originalPriceEl.textContent?.replace(/\./g, '').replace(/,/g, '.') || '0';
                        return parseFloat(priceText);
                    }
                    return 0;
                };

                // Helper to get the CURRENT (promotional) price - the green/large one
                const getCurrentPrice = (item: Element): number => {
                    // First try to find specifically the current/promotional price
                    const priceSelectors = [
                        '.poly-price__current .andes-money-amount__fraction',
                        '.ui-search-price__second-line .andes-money-amount__fraction', // This is usually the promotional price
                        '.ui-search-price__part--medium .andes-money-amount__fraction'
                    ];

                    for (const selector of priceSelectors) {
                        const el = item.querySelector(selector);
                        if (el) {
                            const priceText = el.textContent?.replace(/\./g, '').replace(/,/g, '.') || '0';
                            const price = parseFloat(priceText);
                            if (price > 0) return price;
                        }
                    }

                    // Fallback: Get all price fractions and pick the LOWEST (assuming it's the sale price)
                    const allPriceEls = item.querySelectorAll('.andes-money-amount__fraction');
                    let lowestPrice = Infinity;

                    allPriceEls.forEach(el => {
                        const priceText = el.textContent?.replace(/\./g, '').replace(/,/g, '.') || '0';
                        const price = parseFloat(priceText);
                        if (price > 0 && price < lowestPrice) {
                            lowestPrice = price;
                        }
                    });

                    return lowestPrice === Infinity ? 0 : lowestPrice;
                };

                // Helper to extract discount percentage from badge
                const getDiscountPercentage = (item: Element): number | undefined => {
                    const discountEl = item.querySelector('.poly-component__discount') ||
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

                        // Get prices correctly
                        const currentPrice = getCurrentPrice(item);
                        const originalPrice = getOriginalPrice(item);
                        const discountFromBadge = getDiscountPercentage(item);

                        // Image Selectors - Try multiple approaches
                        const imgEl = item.querySelector('img.ui-search-result-image__element') ||
                            item.querySelector('img.poly-component__picture') ||
                            item.querySelector('img[data-src]') ||
                            item.querySelector('img');
                        const thumbnail = getImageUrl(imgEl);

                        // ID extraction
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
                                pictures: thumbnail ? [{ url: thumbnail }] : []
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
