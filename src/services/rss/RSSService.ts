import Parser from 'rss-parser';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';

interface RSSFeed {
  url: string;
  source: 'pelando' | 'promobit' | 'hardmob' | 'custom';
  category: string;
}

export class RSSService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['price', 'originalPrice', 'discount', 'image']
      }
    });
  }

  /**
   * Parse RSS feed and extract offers
   */
  async parseFeed(feedUrl: string, source: string = 'rss'): Promise<Offer[]> {
    try {
      logger.info(`📰 Parsing RSS feed: ${feedUrl}`);
      const feed = await this.parser.parseURL(feedUrl);
      const offers: Offer[] = [];

      if (!feed.items || feed.items.length === 0) {
        logger.warn(`⚠️ RSS feed has no items: ${feedUrl}`);
        return [];
      }

      for (const item of feed.items) {
        try {
          const offer = this.parseItem(item, source);
          if (offer) {
            offers.push(offer);
          }
        } catch (itemError: any) {
          logger.debug(`Error parsing RSS item: ${itemError.message}`);
          // Continue with next item
        }
      }

      logger.info(`✅ Parsed ${offers.length} offers from RSS feed: ${feedUrl}`);
      return offers;
    } catch (error: any) {
      // Don't log as error if it's a network/timeout issue - just warn
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        logger.warn(`⚠️ Could not connect to RSS feed ${feedUrl}: ${error.message}`);
      } else {
        logger.error(`❌ Error parsing RSS feed ${feedUrl}:`, error.message);
      }
      return [];
    }
  }

  /**
   * Parse individual RSS item to Offer
   */
  private parseItem(item: any, source: string): Offer | null {
    try {
      // Try to extract price information from title or content
      const priceMatch = item.contentSnippet?.match(/R\$\s*([\d,]+\.?\d*)/i) ||
                        item.title?.match(/R\$\s*([\d,]+\.?\d*)/i);
      
      const originalPriceMatch = item.contentSnippet?.match(/de\s*R\$\s*([\d,]+\.?\d*)/i) ||
                                 item.title?.match(/de\s*R\$\s*([\d,]+\.?\d*)/i);

      if (!priceMatch) {
        return null; // Skip items without price
      }

      const currentPrice = parseFloat(priceMatch[1].replace(',', '.'));
      const originalPrice = originalPriceMatch
        ? parseFloat(originalPriceMatch[1].replace(',', '.'))
        : currentPrice;

      const discount = originalPrice - currentPrice;
      const discountPercentage = originalPrice > 0 ? (discount / originalPrice) * 100 : 0;

      if (discountPercentage < 5) {
        return null;
      }

      // Extract category from tags or content
      const category = this.extractCategory(item);

      const now = new Date();
      return {
        title: item.title || 'Oferta sem título',
        description: item.contentSnippet || item.title || '',
        originalPrice,
        currentPrice,
        discount,
        discountPercentage: Math.round(discountPercentage * 100) / 100,
        currency: 'BRL',
        imageUrl: item.enclosure?.url || item.image || '',
        productUrl: item.link || '',
        affiliateUrl: item.link || '',
        source: source as any,
        category,
        tags: item.categories || [],
        isActive: true,
        isPosted: false,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      logger.error('Error parsing RSS item:', error);
      return null;
    }
  }

  /**
   * Extract category from RSS item
   */
  private extractCategory(item: any): string {
    // Try to extract from categories
    if (item.categories && item.categories.length > 0) {
      return item.categories[0].toLowerCase();
    }

    // Try to extract from content
    const content = (item.contentSnippet || item.title || '').toLowerCase();
    
    const categoryKeywords: Record<string, string[]> = {
      electronics: ['celular', 'smartphone', 'notebook', 'tablet', 'fone', 'headphone'],
      fashion: ['roupa', 'calçado', 'sapato', 'camiseta', 'vestido'],
      home: ['casa', 'decoração', 'móvel', 'eletrodoméstico'],
      beauty: ['perfume', 'cosmético', 'maquiagem', 'skincare']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Parse multiple feeds
   */
  async parseMultipleFeeds(feeds: RSSFeed[]): Promise<Offer[]> {
    const allOffers: Offer[] = [];

    for (const feed of feeds) {
      try {
        const offers = await this.parseFeed(feed.url, feed.source);
        allOffers.push(...offers);
      } catch (error) {
        logger.error(`Error parsing feed ${feed.url}:`, error);
      }
    }

    return allOffers;
  }
}

