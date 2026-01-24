import { Router } from 'express';
import { AmazonScraper } from '../services/amazon/AmazonScraper';
import { OfferService } from '../services/offer/OfferService';
import { logger } from '../utils/logger';

const router = Router();
const amazonScraper = new AmazonScraper();
const offerService = new OfferService();

/**
 * @swagger
 * tags:
 *   - name: Amazon
 *     description: Amazon product scraping and affiliate links (no PA-API required)
 */

/**
 * POST /api/amazon/analyze-link
 * Analyze an Amazon link (product vs affiliate)
 */
router.post('/analyze-link', (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = amazonScraper.analyzeLink(url);
    return res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('Error analyzing Amazon link:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/amazon/extract-asin
 * Extract ASIN from any Amazon URL
 */
router.post('/extract-asin', (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const asin = amazonScraper.extractASIN(url);

    if (!asin) {
      return res.status(404).json({
        success: false,
        error: 'ASIN not found in URL',
      });
    }

    return res.json({
      success: true,
      asin,
      affiliateLink: amazonScraper.generateAffiliateLink(asin),
    });
  } catch (error: any) {
    logger.error('Error extracting ASIN:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/amazon/generate-affiliate
 * Generate affiliate link from ASIN or URL
 */
router.post('/generate-affiliate', (req, res) => {
  try {
    const { asin, url, customTag } = req.body;

    let targetAsin = asin;

    if (!targetAsin && url) {
      targetAsin = amazonScraper.extractASIN(url);
    }

    if (!targetAsin) {
      return res.status(400).json({
        error: 'ASIN or valid Amazon URL is required',
      });
    }

    const affiliateLink = amazonScraper.generateAffiliateLink(targetAsin, customTag);

    return res.json({
      success: true,
      asin: targetAsin,
      affiliateLink,
    });
  } catch (error: any) {
    logger.error('Error generating affiliate link:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/amazon/scrape-product
 * Scrape product data from Amazon page (works without PA-API!)
 */
router.post('/scrape-product', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('amazon.com')) {
      return res.status(400).json({ error: 'URL must be from Amazon' });
    }

    const result = await amazonScraper.scrapeProduct(url);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to scrape product',
      });
    }

    return res.json({
      success: true,
      asin: result.asin,
      title: result.title,
      price: result.price,
      originalPrice: result.originalPrice,
      discountPercent: result.discountPercent,
      image: result.image,
      rating: result.rating,
      reviewCount: result.reviewCount,
      availability: result.availability,
      brand: result.brand,
      affiliateLink: result.asin ? amazonScraper.generateAffiliateLink(result.asin) : null,
    });
  } catch (error: any) {
    logger.error('Error scraping Amazon product:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/amazon/scrape-url
 * Scrape product and save to database
 */
router.post('/scrape-url', async (req, res) => {
  try {
    const { url, saveToDatabase = true } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('amazon.com')) {
      return res.status(400).json({ error: 'URL must be from Amazon' });
    }

    logger.info(`🕷️ [Amazon] Scraping product: ${url}`);

    const scraped = await amazonScraper.scrapeProduct(url);

    if (!scraped.success) {
      return res.status(500).json({
        success: false,
        error: scraped.error || 'Failed to scrape product',
      });
    }

    const offer = amazonScraper.convertToOffer(scraped, url);

    if (!offer) {
      return res.status(500).json({
        success: false,
        error: 'Failed to convert scraped data to offer',
      });
    }

    let saved = 0;
    if (saveToDatabase) {
      saved = await offerService.saveOffers([offer]);
    }

    return res.json({
      success: true,
      totalFound: 1,
      saved,
      product: {
        title: scraped.title,
        price: scraped.price,
        originalPrice: scraped.originalPrice,
        discountPercent: scraped.discountPercent,
        image: scraped.image,
        asin: scraped.asin,
        affiliateLink: scraped.asin ? amazonScraper.generateAffiliateLink(scraped.asin) : null,
      },
    });
  } catch (error: any) {
    logger.error('Error scraping Amazon URL:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/amazon/search
 * Search Amazon for products
 */
router.post('/search', async (req, res) => {
  try {
    const { keyword, maxResults = 10, saveToDatabase = false } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    logger.info(`🔍 [Amazon] Searching: ${keyword}`);

    const result = await amazonScraper.scrapeSearch(keyword, maxResults);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Search failed',
      });
    }

    // Add affiliate links to results
    const productsWithAffiliate = result.products.map((p) => ({
      ...p,
      affiliateUrl: amazonScraper.generateAffiliateLink(p.asin),
    }));

    let saved = 0;
    if (saveToDatabase && productsWithAffiliate.length > 0) {
      // Scrape each product for full details and save
      const offers: any[] = [];
      for (const product of productsWithAffiliate.slice(0, 5)) {
        // Limit to 5 to avoid rate limiting
        try {
          const scraped = await amazonScraper.scrapeProduct(product.url);
          if (scraped.success) {
            const offer = amazonScraper.convertToOffer(scraped, product.url);
            if (offer) offers.push(offer);
          }
          // Add delay to avoid rate limiting
          await new Promise((r) => setTimeout(r, 1000));
        } catch (e) {
          logger.warn(`Failed to scrape product ${product.asin}`);
        }
      }
      if (offers.length > 0) {
        saved = await offerService.saveOffers(offers);
      }
    }

    return res.json({
      success: true,
      totalFound: result.products.length,
      saved,
      products: productsWithAffiliate,
    });
  } catch (error: any) {
    logger.error('Error searching Amazon:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/amazon/process
 * Full pipeline: analyze, scrape, and optionally save
 */
router.post('/process', async (req, res) => {
  try {
    const { url, saveToDatabase = false } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await amazonScraper.processProduct(url);

    if ('error' in result) {
      return res.status(400).json({ success: false, ...result });
    }

    let saved = 0;
    if (saveToDatabase && result.product.success) {
      const offer = amazonScraper.convertToOffer(result.product, url);
      if (offer) {
        saved = await offerService.saveOffers([offer]);
      }
    }

    return res.json({
      success: true,
      saved,
      ...result,
    });
  } catch (error: any) {
    logger.error('Error processing Amazon URL:', error);
    return res.status(500).json({ error: error.message });
  }
});

export { router as amazonRoutes };
