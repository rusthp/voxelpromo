import * as cheerio from 'cheerio';
import axios from 'axios';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';

interface ScrapeConfig {
  url: string;
  selectors: {
    title: string;
    price: string;
    originalPrice?: string;
    image?: string;
    description?: string;
  };
  source: string;
  category: string;
}

export class ScraperService {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  /**
   * Scrape a single page
   */
  async scrapePage(config: ScrapeConfig): Promise<Offer | null> {
    try {
      const response = await axios.get(config.url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      const title = $(config.selectors.title).first().text().trim();
      const priceText = $(config.selectors.price).first().text().trim();
      const originalPriceText = config.selectors.originalPrice
        ? $(config.selectors.originalPrice).first().text().trim()
        : null;
      const imageUrl = config.selectors.image
        ? $(config.selectors.image).first().attr('src') || $(config.selectors.image).first().attr('data-src') || ''
        : '';
      const description = config.selectors.description
        ? $(config.selectors.description).first().text().trim()
        : title;

      if (!title || !priceText) {
        return null;
      }

      const currentPrice = this.extractPrice(priceText);
      const originalPrice = originalPriceText
        ? this.extractPrice(originalPriceText)
        : currentPrice;

      const discount = originalPrice - currentPrice;
      const discountPercentage = originalPrice > 0 ? (discount / originalPrice) * 100 : 0;

      if (discountPercentage < 5) {
        return null;
      }

      const now = new Date();
      return {
        title,
        description,
        originalPrice,
        currentPrice,
        discount,
        discountPercentage: Math.round(discountPercentage * 100) / 100,
        currency: 'BRL',
        imageUrl: imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, config.url).toString(),
        productUrl: config.url,
        affiliateUrl: config.url,
        source: config.source as any,
        category: config.category,
        tags: [],
        isActive: true,
        isPosted: false,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      logger.error(`Error scraping ${config.url}:`, error);
      return null;
    }
  }

  /**
   * Extract price from text
   */
  private extractPrice(text: string): number {
    // Remove currency symbols and extract number
    const cleaned = text.replace(/[^\d,.-]/g, '').replace(',', '.');
    const match = cleaned.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Scrape multiple pages
   */
  async scrapeMultiplePages(configs: ScrapeConfig[]): Promise<Offer[]> {
    const offers: Offer[] = [];

    for (const config of configs) {
      try {
        const offer = await this.scrapePage(config);
        if (offer) {
          offers.push(offer);
        }
        // Add delay to avoid rate limiting
        await this.delay(1000);
      } catch (error) {
        logger.error(`Error scraping ${config.url}:`, error);
      }
    }

    return offers;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

