import axios from 'axios';
import * as cheerio from 'cheerio';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Amazon Scraper Service
 * Works WITHOUT PA-API (no 3 sales required!)
 * Uses web scraping to extract product data
 */
export class AmazonScraper {
    private associateTag: string;
    private userAgents: string[] = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    ];

    constructor() {
        this.associateTag = process.env.AMAZON_ASSOCIATE_TAG || '';
        if (!this.associateTag) {
            logger.warn('⚠️ AMAZON_ASSOCIATE_TAG not set. Affiliate links will not work.');
        }
    }

    /**
     * Get random User-Agent for requests
     */
    private getRandomUserAgent(): string {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    /**
     * Analyze Amazon link - detect if it's product or affiliate
     */
    analyzeLink(url: string): {
        type: 'product' | 'affiliate' | 'unknown';
        asin: string | null;
        originalUrl: string;
        affiliateUrl: string;
    } {
        const result = {
            type: 'unknown' as 'product' | 'affiliate' | 'unknown',
            asin: null as string | null,
            originalUrl: url,
            affiliateUrl: '',
        };

        // Extract ASIN (10 alphanumeric characters)
        const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        if (asinMatch) {
            result.asin = asinMatch[1].toUpperCase();
        }

        // Check if it's an affiliate link
        if (url.includes('tag=') || url.includes('ascsubtag=') || url.includes('ref_=as_li_')) {
            result.type = 'affiliate';
            result.affiliateUrl = url;
            result.originalUrl = url.split('?')[0];
            return result;
        }

        // Check if it's a product link
        if (asinMatch) {
            result.type = 'product';
            result.originalUrl = url;
            return result;
        }

        return result;
    }

    /**
     * Extract ASIN from any Amazon URL
     */
    extractASIN(url: string): string | null {
        // Standard product URLs
        const standardMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        if (standardMatch) return standardMatch[1].toUpperCase();

        // Shortened amzn.to links (would need redirect following)
        // For now, return null for those
        if (url.includes('amzn.to')) {
            logger.warn('⚠️ Short links (amzn.to) not supported yet. Use full URL.');
            return null;
        }

        // Try to find ASIN in query params
        const urlObj = new URL(url);
        const asinParam = urlObj.searchParams.get('asin') || urlObj.searchParams.get('ASIN');
        if (asinParam && /^[A-Z0-9]{10}$/i.test(asinParam)) {
            return asinParam.toUpperCase();
        }

        return null;
    }

    /**
     * Generate affiliate link from ASIN
     */
    generateAffiliateLink(asin: string, customTag?: string): string {
        const tag = customTag || this.associateTag;
        if (!tag) {
            logger.warn('⚠️ No affiliate tag configured. Returning plain product link.');
            return `https://www.amazon.com.br/dp/${asin}`;
        }
        return `https://www.amazon.com.br/dp/${asin}?tag=${tag}`;
    }

    /**
     * Scrape product data from Amazon page
     * Works without PA-API!
     */
    async scrapeProduct(url: string): Promise<{
        success: boolean;
        asin: string | null;
        title: string | null;
        price: number | null;
        originalPrice: number | null;
        discountPercent: number | null;
        image: string | null;
        rating: number | null;
        reviewCount: number | null;
        availability: string | null;
        brand: string | null;
        error?: string;
    }> {
        const result = {
            success: false,
            asin: this.extractASIN(url),
            title: null as string | null,
            price: null as number | null,
            originalPrice: null as number | null,
            discountPercent: null as number | null,
            image: null as string | null,
            rating: null as number | null,
            reviewCount: null as number | null,
            availability: null as string | null,
            brand: null as string | null,
        };

        try {
            logger.info(`🕷️ Scraping Amazon: ${url}`);

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                },
                timeout: 15000,
            });

            const $ = cheerio.load(response.data);

            // Title
            result.title = $('#productTitle').text().trim() ||
                $('h1.a-size-large').first().text().trim() ||
                null;

            // Price (current/sale price)
            const priceText = $('#corePriceDisplay_desktop_feature_div .a-offscreen').first().text().trim() ||
                $('.priceToPay .a-offscreen').first().text().trim() ||
                $('#priceblock_ourprice').text().trim() ||
                $('#priceblock_dealprice').text().trim() ||
                $('.a-price .a-offscreen').first().text().trim();

            if (priceText) {
                result.price = this.parsePrice(priceText);
            }

            // Original price (before discount)
            const originalPriceText = $('.basisPrice .a-offscreen').first().text().trim() ||
                $('#priceblock_saleprice').text().trim() ||
                $('.a-text-strike .a-offscreen').first().text().trim();

            if (originalPriceText) {
                result.originalPrice = this.parsePrice(originalPriceText);
            }

            // Discount percentage
            const discountText = $('.savingsPercentage').first().text().trim() ||
                $('.a-color-price .a-size-base').text().trim();

            if (discountText) {
                const discountMatch = discountText.match(/(\d+)%/);
                if (discountMatch) {
                    result.discountPercent = parseInt(discountMatch[1]);
                }
            }

            // If no discount found but we have both prices, calculate it
            if (!result.discountPercent && result.originalPrice && result.price && result.originalPrice > result.price) {
                result.discountPercent = Math.round(((result.originalPrice - result.price) / result.originalPrice) * 100);
            }

            // Main image
            result.image = $('#landingImage').attr('src') ||
                $('#imgBlkFront').attr('src') ||
                $('#main-image').attr('src') ||
                $('img.a-dynamic-image').first().attr('src') ||
                null;

            // Rating
            const ratingText = $('span.a-icon-alt').first().text().trim() ||
                $('#acrPopover').attr('title');
            if (ratingText) {
                const ratingMatch = ratingText.match(/([\d,.]+)/);
                if (ratingMatch) {
                    result.rating = parseFloat(ratingMatch[1].replace(',', '.'));
                }
            }

            // Review count
            const reviewText = $('#acrCustomerReviewText').text().trim() ||
                $('[data-hook="total-review-count"]').text().trim();
            if (reviewText) {
                const reviewMatch = reviewText.match(/([\d.]+)/);
                if (reviewMatch) {
                    result.reviewCount = parseInt(reviewMatch[1].replace(/\./g, ''));
                }
            }

            // Availability
            result.availability = $('#availability span').text().trim() ||
                $('#outOfStock span').text().trim() ||
                'unknown';

            // Brand
            result.brand = $('#bylineInfo').text().trim().replace(/^(Visite a loja |Marca: |Visit the )/, '') ||
                $('a#bylineInfo').text().trim() ||
                null;

            result.success = !!result.title && (result.price !== null || result.originalPrice !== null);

            if (result.success) {
                logger.info(`✅ Scraped: ${result.title?.substring(0, 50)}... - R$ ${result.price}`);
            } else {
                logger.warn(`⚠️ Could not extract product data from Amazon page`);
            }

            return result;

        } catch (error: any) {
            logger.error(`❌ Amazon scraping failed: ${error.message}`);
            return { ...result, error: error.message };
        }
    }

    /**
     * Parse Brazilian price string to number
     */
    private parsePrice(priceText: string): number | null {
        if (!priceText) return null;

        // Remove "R$" and whitespace, convert Brazilian format (1.234,56) to number
        const cleaned = priceText
            .replace(/R\$\s*/gi, '')
            .replace(/\s/g, '')
            .replace(/\./g, '')  // Remove thousand separators
            .replace(',', '.');   // Convert decimal separator

        const price = parseFloat(cleaned);
        return isNaN(price) ? null : price;
    }

    /**
     * Process Amazon URL - full pipeline
     * Analyzes link, scrapes data, generates affiliate link
     */
    async processProduct(url: string): Promise<{
        analyzed: {
            type: 'product' | 'affiliate' | 'unknown';
            asin: string | null;
            originalUrl: string;
            affiliateUrl: string;
        };
        affiliateLink: string;
        product: {
            success: boolean;
            asin: string | null;
            title: string | null;
            price: number | null;
            originalPrice: number | null;
            discountPercent: number | null;
            image: string | null;
            rating: number | null;
            reviewCount: number | null;
            availability: string | null;
            brand: string | null;
            error?: string;
        };
    } | { error: string }> {
        const analyzed = this.analyzeLink(url);

        if (!analyzed.asin) {
            return { error: 'ASIN not found in URL' };
        }

        const affiliateLink = this.generateAffiliateLink(analyzed.asin);
        const product = await this.scrapeProduct(analyzed.originalUrl);

        return {
            analyzed,
            affiliateLink,
            product,
        };
    }

    /**
     * Convert scraped data to Offer format
     */
    convertToOffer(
        scraped: {
            success: boolean;
            asin: string | null;
            title: string | null;
            price: number | null;
            originalPrice: number | null;
            discountPercent: number | null;
            image: string | null;
            rating: number | null;
            reviewCount: number | null;
            availability: string | null;
            brand: string | null;
            error?: string;
        },
        url: string
    ): Offer | null {
        if (!scraped.success || !scraped.title) {
            return null;
        }

        const currentPrice = scraped.price || scraped.originalPrice || 0;
        const originalPrice = scraped.originalPrice || scraped.price || currentPrice;
        const discountPercent = scraped.discountPercent ||
            (originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0);

        const affiliateUrl = scraped.asin ? this.generateAffiliateLink(scraped.asin) : url;

        return {
            title: scraped.title,
            description: scraped.brand ? `${scraped.brand} - ${scraped.title}` : scraped.title,
            originalPrice: originalPrice,
            currentPrice: currentPrice,
            discount: originalPrice - currentPrice,
            discountPercentage: discountPercent,
            currency: 'BRL',
            imageUrl: scraped.image || '',
            productUrl: url,
            affiliateUrl: affiliateUrl,
            source: 'amazon',
            category: 'electronics',
            tags: ['amazon', scraped.brand || 'general'].filter(Boolean) as string[],
            isActive: true,
            isPosted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            rating: scraped.rating || undefined,
            reviewsCount: scraped.reviewCount || undefined,
            availability: scraped.availability?.includes('Em estoque') ? 'in_stock' : 'out_of_stock',
        };
    }

    /**
     * Scrape search results from Amazon (basic implementation)
     * Note: This is more likely to be blocked, use sparingly
     */
    async scrapeSearch(keyword: string, maxResults: number = 10): Promise<{
        success: boolean;
        products: Array<{
            asin: string;
            title: string;
            price: number | null;
            image: string | null;
            rating: number | null;
            url: string;
        }>;
        error?: string;
    }> {
        try {
            const searchUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(keyword)}`;
            logger.info(`🔍 Searching Amazon: ${keyword}`);

            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9',
                },
                timeout: 20000,
            });

            const $ = cheerio.load(response.data);
            const products: Array<{
                asin: string;
                title: string;
                price: number | null;
                image: string | null;
                rating: number | null;
                url: string;
            }> = [];

            // Parse search results
            $('[data-asin]').each((_, element): void => {
                if (products.length >= maxResults) return;

                const $el = $(element);
                const asin = $el.attr('data-asin');
                if (!asin || asin.length !== 10) return; // Skip invalid ASINs

                const title = $el.find('h2 a span').text().trim() ||
                    $el.find('.a-text-normal').first().text().trim();

                if (!title) return; // Skip if no title

                const priceText = $el.find('.a-price .a-offscreen').first().text().trim();
                const price = this.parsePrice(priceText);

                const image = $el.find('img.s-image').attr('src') || null;

                const ratingText = $el.find('.a-icon-alt').first().text().trim();
                let rating: number | null = null;
                if (ratingText) {
                    const ratingMatch = ratingText.match(/([\d,.]+)/);
                    if (ratingMatch) {
                        rating = parseFloat(ratingMatch[1].replace(',', '.'));
                    }
                }

                products.push({
                    asin,
                    title,
                    price,
                    image,
                    rating,
                    url: `https://www.amazon.com.br/dp/${asin}`,
                });
            });

            logger.info(`✅ Found ${products.length} products for "${keyword}"`);

            return {
                success: true,
                products,
            };

        } catch (error: any) {
            logger.error(`❌ Amazon search failed: ${error.message}`);
            return {
                success: false,
                products: [],
                error: error.message,
            };
        }
    }
}

// Export singleton instance
export const amazonScraper = new AmazonScraper();
