import { AmazonService, AmazonProduct } from '../amazon/AmazonService';
import { AliExpressService } from '../aliexpress/AliExpressService';
import { MercadoLivreService } from '../mercadolivre/MercadoLivreService';
import { ShopeeService } from '../shopee/ShopeeService';
import { RSSService } from '../rss/RSSService';
import { AwinService } from '../awin/AwinService';
import { AwinFeedManager } from '../awin/AwinFeedManager';
import { OfferService } from '../offer/OfferService';
import { BlacklistService } from '../blacklist/BlacklistService';
import { logger } from '../../utils/logger';
import { retryWithBackoff } from '../../utils/retry';
import { Offer } from '../../types';
import { ScrapingBatchModel } from '../../models/ScrapingBatch';

/**
 * Dependency injection interface for CollectorService
 * Allows injecting mock services for testing
 */
export interface CollectorServiceDeps {
  amazonService?: AmazonService;
  aliExpressService?: AliExpressService;
  mercadoLivreService?: MercadoLivreService;
  shopeeService?: ShopeeService;
  rssService?: RSSService;
  offerService?: OfferService;
  blacklistService?: BlacklistService;
}

export class CollectorService {
  private amazonService: AmazonService;
  private aliExpressService: AliExpressService;
  private mercadoLivreService: MercadoLivreService;
  private shopeeService: ShopeeService;
  private rssService: RSSService;
  private offerService: OfferService;
  private blacklistService: BlacklistService;
  private userId?: string;

  constructor(deps: CollectorServiceDeps = {}, userId?: string) {
    this.amazonService = deps.amazonService ?? new AmazonService();
    this.aliExpressService = deps.aliExpressService ?? new AliExpressService();
    this.mercadoLivreService = deps.mercadoLivreService ?? new MercadoLivreService();
    this.shopeeService = deps.shopeeService ?? (userId ? ShopeeService.forUser(userId) : new ShopeeService());
    this.rssService = deps.rssService ?? new RSSService();
    this.offerService = deps.offerService ?? new OfferService();
    this.blacklistService = deps.blacklistService ?? new BlacklistService();
    this.userId = userId;
  }

  /**
   * Filter offers using blacklist
   */
  private filterBlacklisted(offers: (Offer | null)[]): Offer[] {
    const validOffers = offers.filter((o): o is Offer => o !== null);

    if (!this.blacklistService.getConfig().enabled) {
      return validOffers;
    }

    const filtered = validOffers.filter((offer) => {
      const isBlacklisted = this.blacklistService.isOfferBlacklisted({
        title: offer.title,
        description: offer.description,
        brand: offer.brand,
      });

      if (isBlacklisted) {
        logger.info(`🚫 Blacklisted offer: ${offer.title.substring(0, 50)}...`);
      }

      return !isBlacklisted;
    });

    const blacklistedCount = validOffers.length - filtered.length;
    if (blacklistedCount > 0) {
      logger.info(`🚫 Filtered out ${blacklistedCount} blacklisted offers`);
    }

    return filtered;
  }

  /**
   * Helper to get user niche keywords if available
   */
  private async getUserNicheKeywords(): Promise<string | null> {
    if (!this.userId) return null;
    try {
      // Lazy import to avoid circular dependencies if any
      const { UserModel } = await import('../../models/User');
      const user = await UserModel.findById(this.userId).select('preferences');
      return user?.preferences?.niche || null;
    } catch (error) {
      logger.warn(`Failed to fetch user niche: ${error}`);
      return null;
    }
  }

  /**
   * Collect offers from Amazon
   */
  async collectFromAmazon(
    keywords: string = 'electronics',
    category: string = 'electronics'
  ): Promise<number> {
    try {
      // 1. Resolve keywords (User Niche > Provided > Default)
      let searchKeywords = keywords;
      let searchCategory = category;

      // If using default 'electronics', try to use user niche instead
      if (keywords === 'electronics' && this.userId) {
        const userNiche = await this.getUserNicheKeywords();
        if (userNiche) {
          logger.info(`👤 Using user niche for Amazon: "${userNiche}"`);
          searchKeywords = userNiche;
          // Map niche to category roughly, or keep default
          searchCategory = userNiche;
        }
      }

      logger.info(
        `🔍 Starting Amazon collection - Keywords: "${searchKeywords}", Category: "${searchCategory}"`
      );
      const products = await this.amazonService.searchProducts(searchKeywords, 20);
      logger.info(`📦 Found ${products.length} products from Amazon`);

      const offers = products
        .map((product: AmazonProduct) => this.amazonService.convertToOffer(product, searchCategory))
        .filter((offer: Offer | null) => offer !== null);

      logger.info(`✅ Converted ${offers.length} products to offers (filtered by discount)`);

      // Apply blacklist filter
      const filteredOffers = this.filterBlacklisted(offers);

      const savedCount = await this.offerService.saveOffers(filteredOffers, this.userId);
      logger.info(`💾 Saved ${savedCount} offers from Amazon to database`);

      return savedCount;
    } catch (error: any) {
      logger.error(`❌ Error collecting from Amazon: ${error.message}`, error);
      return 0;
    }
  }

  /**
   * Collect offers from AliExpress with retry and fallback
   * Applies blacklist filtering
   */
  async collectFromAliExpress(category: string = 'electronics'): Promise<number> {
    try {
      // 1. Resolve category (User Niche > Provided > Default)
      let searchCategory = category;

      // If using default 'electronics', try to use user niche instead
      if (category === 'electronics' && this.userId) {
        const userNiche = await this.getUserNicheKeywords();
        if (userNiche) {
          logger.info(`👤 Using user niche for AliExpress: "${userNiche}"`);
          searchCategory = userNiche;
        }
      }

      logger.info(`🔍 Starting AliExpress collection - Category: "${searchCategory}"`);

      // Try API methods with retry
      const allProducts: any[] = [];

      try {
        // Get hot products with Advanced API
        logger.info('📈 Fetching hot products from AliExpress (Advanced API)...');
        const hotProducts = await retryWithBackoff(
          () =>
            this.aliExpressService.getHotProducts({
              pageSize: 20,
              targetCurrency: 'BRL',
              targetLanguage: 'PT',
              shipToCountry: 'BR',
              sort: 'LAST_VOLUME_DESC', // Sort by volume descending (most popular)
              platformProductType: 'ALL',
            }),
          { maxRetries: 2, initialDelay: 2000 }
        );
        logger.info(`🔥 Found ${hotProducts.length} hot products`);
        allProducts.push(...hotProducts);
      } catch (error: any) {
        logger.warn(`⚠️ Failed to get hot products: ${error.message}`);
      }

      try {
        // Try smart match products (Advanced API)
        logger.info('🧠 Fetching smart match products from AliExpress (Advanced API)...');
        const smartMatchProducts = await retryWithBackoff(
          () =>
            this.aliExpressService.smartMatchProducts({
              keywords: category === 'electronics' ? 'electronics' : category,
              pageNo: 1,
              targetCurrency: 'BRL',
              targetLanguage: 'PT',
              country: 'BR',
            }),
          { maxRetries: 1, initialDelay: 2000 }
        );
        if (smartMatchProducts.length > 0) {
          logger.info(`🧠 Found ${smartMatchProducts.length} smart match products`);
          allProducts.push(...smartMatchProducts);
        }
      } catch (error: any) {
        logger.debug(`Smart match products not available or failed: ${error.message}`);
      }

      try {
        // Get flash deals with retry
        logger.info('⚡ Fetching flash deals from AliExpress...');
        const flashDeals = await retryWithBackoff(() => this.aliExpressService.getFlashDeals(20), {
          maxRetries: 2,
          initialDelay: 2000,
        });
        logger.info(`💥 Found ${flashDeals.length} flash deals`);
        allProducts.push(...flashDeals);
      } catch (error: any) {
        logger.warn(`⚠️ Failed to get flash deals: ${error.message}`);
      }

      try {
        // Get featured promo products with pagination (collect multiple pages)
        logger.info('🎯 [PAGINAÇÃO] Iniciando busca de produtos promocionais com paginação...');
        const featuredPromos = await retryWithBackoff(
          async () => {
            const allFeaturedProducts: any[] = [];
            let currentPage = 1;
            const maxPages = 5; // Limit to 5 pages to avoid too many requests
            const pageSize = 50;
            let hasMorePages = true;

            logger.info(`🎯 [PAGINAÇÃO] Configuração: maxPages=${maxPages}, pageSize=${pageSize}`);

            while (hasMorePages && currentPage <= maxPages) {
              logger.info(
                `📄 [PAGINAÇÃO] ====== BUSCANDO PÁGINA ${currentPage}/${maxPages} ======`
              );

              try {
                const result = await this.aliExpressService.getFeaturedPromoProducts({
                  promotionName: 'Hot Product', // Try "Hot Product", "New Arrival", "Best Seller", "weeklydeals"
                  pageNo: currentPage,
                  pageSize: pageSize,
                  targetCurrency: 'BRL', // Request prices in BRL directly
                  targetLanguage: 'PT', // Portuguese for better results
                  sort: 'discountDesc', // Sort by discount descending
                });

                logger.info(
                  `📊 [PAGINAÇÃO] Resposta da API - Página: ${result.pagination.currentPage}/${result.pagination.totalPages}, Total de registros: ${result.pagination.totalRecords}, Produtos nesta página: ${result.products.length}, Finalizado: ${result.pagination.isFinished}`
                );

                if (result.products.length > 0) {
                  allFeaturedProducts.push(...result.products);
                  logger.info(
                    `✅ [PAGINAÇÃO] Adicionados ${result.products.length} produtos da página ${currentPage}. Total acumulado: ${allFeaturedProducts.length}`
                  );
                } else {
                  logger.warn(`⚠️ [PAGINAÇÃO] Nenhum produto retornado da página ${currentPage}`);
                  // If no products and we're on page 1, might be an API issue - break to avoid infinite loop
                  if (currentPage === 1 && result.pagination.totalPages === 0) {
                    logger.warn(
                      '⚠️ [PAGINAÇÃO] API retornou sem produtos e sem informações de paginação. Parando paginação.'
                    );
                    break;
                  }
                }

                // Use the page number returned by API to be safe
                const apiCurrentPage = result.pagination.currentPage || currentPage;
                const apiTotalPages = result.pagination.totalPages || 1;

                logger.info(
                  `🔍 [PAGINAÇÃO] DEBUG - apiCurrentPage: ${apiCurrentPage}, apiTotalPages: ${apiTotalPages}, currentPage: ${currentPage}, maxPages: ${maxPages}`
                );

                // FORCE collection of multiple pages if API says there are more
                // If totalPages > 1, we MUST collect at least 2 pages
                let shouldContinue = false;

                if (apiTotalPages > 1) {
                  // If we have more than 1 page available, continue until we reach totalPages or maxPages
                  shouldContinue = currentPage < Math.min(apiTotalPages, maxPages);
                  logger.info(
                    `🔍 [PAGINAÇÃO] TotalPages > 1, continuando: ${shouldContinue} (currentPage: ${currentPage}, min: ${Math.min(apiTotalPages, maxPages)})`
                  );
                } else if (apiTotalPages === 1 && currentPage === 1) {
                  // If API says only 1 page, but we got products, try at least page 2 to verify
                  shouldContinue = result.products.length > 0 && currentPage < maxPages;
                  logger.info(
                    `🔍 [PAGINAÇÃO] API diz 1 página, mas tentando página 2 para verificar: ${shouldContinue}`
                  );
                } else {
                  shouldContinue = false;
                  logger.info(
                    `🔍 [PAGINAÇÃO] Não continuando: totalPages=${apiTotalPages}, currentPage=${currentPage}`
                  );
                }

                logger.info(
                  `🔍 [PAGINAÇÃO] Verificação FINAL - Página API: ${apiCurrentPage}, Total API: ${apiTotalPages}, Nossa Página: ${currentPage}, Máx Páginas: ${maxPages}, Finalizado: ${result.pagination.isFinished}, Deve Continuar: ${shouldContinue}`
                );

                // Move to next page
                currentPage++;
                hasMorePages = shouldContinue;

                // Small delay between pages to avoid rate limiting
                if (hasMorePages) {
                  logger.info(
                    `⏳ [PAGINAÇÃO] Aguardando 1 segundo antes de buscar página ${currentPage}...`
                  );
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                } else {
                  const reason = result.pagination.isFinished
                    ? 'API marcou como finalizado'
                    : apiCurrentPage >= apiTotalPages
                      ? `Chegou na última página (${apiCurrentPage}/${apiTotalPages})`
                      : currentPage > maxPages
                        ? `Chegou no limite de páginas (${maxPages})`
                        : 'Nenhum produto retornado';
                  logger.info(`🛑 [PAGINAÇÃO] Parando paginação. Motivo: ${reason}`);
                }
              } catch (pageError: any) {
                logger.error(
                  `❌ [PAGINAÇÃO] Erro ao buscar página ${currentPage}:`,
                  pageError.message
                );
                logger.error(`❌ [PAGINAÇÃO] Stack:`, pageError.stack?.substring(0, 200));
                // Continue to next page if not on first page, otherwise break
                if (currentPage === 1) {
                  throw pageError; // Re-throw on first page to trigger retry
                }
                currentPage++;
                hasMorePages = currentPage <= maxPages;
              }
            }

            logger.info(
              `🎯 [PAGINAÇÃO] Coleta finalizada: ${allFeaturedProducts.length} produtos de ${currentPage - 1} página(s)`
            );
            return allFeaturedProducts;
          },
          { maxRetries: 2, initialDelay: 2000 }
        );
        logger.info(
          `🎯 [PAGINAÇÃO] Total de produtos promocionais encontrados: ${featuredPromos.length}`
        );
        allProducts.push(...featuredPromos);
      } catch (error: any) {
        logger.error(`❌ [PAGINAÇÃO] Falha ao buscar produtos promocionais: ${error.message}`);
        logger.error(`❌ [PAGINAÇÃO] Stack:`, error.stack?.substring(0, 300));
      }

      // If API methods failed, try search as fallback
      if (allProducts.length === 0) {
        logger.info('🔄 API methods failed, trying search as fallback...');
        try {
          const searchProducts = await retryWithBackoff(
            () => this.aliExpressService.searchProducts('electronics discount', 30),
            { maxRetries: 2, initialDelay: 2000 }
          );
          logger.info(`🔍 Found ${searchProducts.length} products via search`);
          allProducts.push(...searchProducts);
        } catch (error: any) {
          logger.warn(`⚠️ Search fallback also failed: ${error.message}`);
        }
      }

      // Final fallback: Try RSS feeds for AliExpress deals
      if (allProducts.length === 0) {
        logger.info('🔄 Trying RSS feeds as final fallback for AliExpress...');
        try {
          // Common deal RSS feeds (not AliExpress-specific, but may contain AliExpress links)
          const rssFeeds = [
            'https://www.pelando.com.br/feed',
            'https://www.promobit.com.br/feed',
            'https://www.promobit.com.br/rss',
          ];

          for (const feedUrl of rssFeeds) {
            try {
              const rssOffers = await this.rssService.parseFeed(feedUrl, 'aliexpress');
              // Filter for AliExpress-related offers
              const aliExpressOffers = rssOffers.filter(
                (offer) =>
                  offer.productUrl?.includes('aliexpress.com') ||
                  offer.affiliateUrl?.includes('aliexpress.com') ||
                  offer.title?.toLowerCase().includes('aliexpress') ||
                  offer.description?.toLowerCase().includes('aliexpress')
              );

              if (aliExpressOffers.length > 0) {
                logger.info(
                  `📰 Found ${aliExpressOffers.length} AliExpress offers from RSS feed: ${feedUrl}`
                );
                const savedCount = await this.offerService.saveOffers(
                  aliExpressOffers,
                  this.userId
                );
                return savedCount;
              }
            } catch (rssError: any) {
              logger.debug(`RSS feed ${feedUrl} failed: ${rssError.message}`);
            }
          }
        } catch (error: any) {
          logger.warn(`⚠️ RSS fallback failed: ${error.message}`);
        }
      }

      logger.info(`📦 Total products from AliExpress: ${allProducts.length}`);

      if (allProducts.length === 0) {
        logger.warn('⚠️ No products collected from AliExpress (all methods failed)');
        return 0;
      }

      const offersPromises = allProducts.map((product) =>
        this.aliExpressService.convertToOffer(product, category)
      );
      const offersResults = await Promise.all(offersPromises);
      const offers = offersResults.filter((offer): offer is Offer => offer !== null);

      logger.info(`✅ Converted ${offers.length} products to offers (filtered by discount)`);
      const savedCount = await this.offerService.saveOffers(
        offers.filter((o): o is Offer => o !== null),
        this.userId
      );
      logger.info(`💾 Saved ${savedCount} offers from AliExpress to database`);

      return savedCount;
    } catch (error: any) {
      logger.error(`❌ Error collecting from AliExpress: ${error.message}`, error);
      return 0;
    }
  }

  /**
   * Collect offers from RSS feeds
   */
  async collectFromRSS(feedUrl: string, source: string = 'rss'): Promise<number> {
    try {
      logger.info(`Collecting offers from RSS: ${feedUrl}`);
      const offers = await this.rssService.parseFeed(feedUrl, source);

      const savedCount = await this.offerService.saveOffers(offers, this.userId);
      logger.info(`Saved ${savedCount} offers from RSS`);

      return savedCount;
    } catch (error) {
      logger.error('Error collecting from RSS:', error);
      return 0;
    }
  }

  /**
   * Collect daily deals from Mercado Livre with batch tracking
   */
  async collectDailyDealsFromMercadoLivre(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const source = 'mercadolivre-daily-deals';

    try {
      // Check if already collected
      const existingBatch = await ScrapingBatchModel.findOne({ source, date: today });

      if (existingBatch && existingBatch.status === 'completed') {
        logger.info(
          `📅 Daily deals for ${today.toISOString().split('T')[0]} already collected. Skipping.`
        );
        return existingBatch.itemsCount;
      }

      logger.info('🔥 Starting Daily Deals collection...');

      // Create or update batch to pending
      if (!existingBatch) {
        await ScrapingBatchModel.create({ source, date: today, status: 'pending' });
      }

      const products = await this.mercadoLivreService.getDailyDeals();

      if (products.length === 0) {
        logger.warn('⚠️ No daily deals found.');
        await ScrapingBatchModel.findOneAndUpdate(
          { source, date: today },
          { status: 'failed', errorMessage: 'No products found', updatedAt: new Date() }
        );
        return 0;
      }

      // Convert and save
      const offersPromises = products.map((p) =>
        this.mercadoLivreService.convertToOffer(p, 'daily-deals')
      );
      const offersResults = await Promise.all(offersPromises);
      const offers = offersResults.filter((o): o is Offer => o !== null);
      const savedCount = await this.offerService.saveOffers(offers, this.userId);

      // Update batch
      await ScrapingBatchModel.findOneAndUpdate(
        { source, date: today },
        { status: 'completed', itemsCount: savedCount, updatedAt: new Date() },
        { upsert: true }
      );

      logger.info(`✅ Daily Deals collection completed: ${savedCount} offers saved.`);
      return savedCount;
    } catch (error: any) {
      logger.error(`❌ Daily Deals collection failed: ${error.message}`);
      await ScrapingBatchModel.findOneAndUpdate(
        { source, date: today },
        { status: 'failed', errorMessage: error.message, updatedAt: new Date() },
        { upsert: true }
      );
      return 0;
    }
  }

  /**
   * Collect offers from Mercado Livre with retry and fallback
   */
  async collectFromMercadoLivre(category: string = 'electronics'): Promise<number> {
    try {
      // 1. Resolve category (User Niche > Provided > Default)
      let searchCategory = category;

      // If using default 'electronics', try to use user niche instead
      if (category === 'electronics' && this.userId) {
        const userNiche = await this.getUserNicheKeywords();
        if (userNiche) {
          logger.info(`👤 Using user niche for Mercado Livre: "${userNiche}"`);
          searchCategory = userNiche;
        }
      }

      logger.info(`🔍 Starting Mercado Livre collection - Category: "${searchCategory}"`);

      let totalSaved = 0;

      // 1. Collect Daily Deals (Once per day)
      try {
        const dailyDealsCount = await this.collectDailyDealsFromMercadoLivre();
        totalSaved += dailyDealsCount;
      } catch (e: any) {
        logger.warn(`⚠️ Daily Deals collection failed: ${e.message}`);
      }

      const allProducts: any[] = [];

      // Try hot deals with retry
      try {
        logger.info('🔥 Fetching hot deals from Mercado Livre...');
        const hotDeals = await retryWithBackoff(() => this.mercadoLivreService.getHotDeals(20), {
          maxRetries: 2,
          initialDelay: 2000,
        });
        logger.info(`🔥 Found ${hotDeals.length} hot deals`);
        allProducts.push(...hotDeals);
      } catch (error: any) {
        logger.warn(`⚠️ Failed to get hot deals: ${error.message}`);
      }

      // Try search with multiple terms
      try {
        logger.info('🔍 Searching products from Mercado Livre...');

        // Try multiple search terms to get more products
        const searchTerms = ['eletrônicos', 'smartphone', 'notebook', 'tablet', 'fone de ouvido'];

        for (const term of searchTerms) {
          try {
            const products = await retryWithBackoff(
              () =>
                this.mercadoLivreService.searchProducts(term, 20, {
                  sort: 'price_asc',
                  condition: 'new',
                }),
              { maxRetries: 1, initialDelay: 1000 }
            );

            if (products.length > 0) {
              logger.info(`🔍 Found ${products.length} products with term "${term}"`);

              // Add products that aren't already in the list
              for (const product of products) {
                if (!allProducts.find((p: any) => p.id === product.id)) {
                  allProducts.push(product);
                }
              }

              // Stop if we have enough products
              if (allProducts.length >= 50) {
                break;
              }
            }
          } catch (error: any) {
            logger.debug(`Search term "${term}" failed: ${error.message}`);
          }
        }

        logger.info(`📦 Found ${allProducts.length} total products from searches`);
      } catch (error: any) {
        logger.warn(`⚠️ Failed to search products: ${error.message}`);
      }

      // Fallback: Try promotional search terms if still no products
      if (allProducts.length === 0) {
        logger.info('🔄 Trying promotional search terms as fallback...');
        const promoTerms = ['promoção', 'desconto', 'ofertas', 'black friday', 'cyber monday'];

        for (const term of promoTerms) {
          try {
            const products = await retryWithBackoff(
              () =>
                this.mercadoLivreService.searchProducts(term, 20, {
                  sort: 'price_asc',
                  condition: 'new',
                }),
              { maxRetries: 1, initialDelay: 1000 }
            );
            if (products.length > 0) {
              logger.info(`🔍 Found ${products.length} products with promotional term "${term}"`);
              allProducts.push(...products);
              break; // Stop at first successful search
            }
          } catch (error: any) {
            logger.debug(`Promotional search term "${term}" failed: ${error.message}`);
          }
        }
      }

      // Scraping fallback removed as per refactoring plan (Strict API usage)
      if (allProducts.length === 0) {
        logger.warn('⚠️ No products collected from Mercado Livre (API returned 0 results)');
      }

      logger.info(`📦 Total products from Mercado Livre: ${allProducts.length}`);

      // Debug: Log first product structure if available
      if (allProducts.length > 0) {
        logger.debug('Sample product structure:', {
          id: allProducts[0].id,
          title: allProducts[0].title?.substring(0, 50),
          price: allProducts[0].price,
          original_price: allProducts[0].original_price,
          hasPermalink: !!allProducts[0].permalink,
        });
      }

      if (allProducts.length === 0) {
        return 0;
      }

      // Products from search already contain necessary details
      const allProductsProcessed = allProducts;

      logger.info(`🔄 Converting ${allProductsProcessed.length} products to offers...`);

      const offersPromises = allProductsProcessed.map(async (product, index) => {
        const offer = await this.mercadoLivreService.convertToOffer(product, category);
        if (!offer && index < 3) {
          // Log first 3 failed conversions for debugging
          logger.debug(`Product ${index + 1} conversion failed:`, {
            id: product.id,
            title: product.title?.substring(0, 50),
            price: product.price,
            original_price: product.original_price,
            discount:
              product.original_price && product.price
                ? (
                  ((product.original_price - product.price) / product.original_price) *
                  100
                ).toFixed(2) + '%'
                : 'N/A',
          });
        }
        return offer;
      });

      const offersResults = await Promise.all(offersPromises);
      const offers = offersResults.filter((offer) => offer !== null);

      logger.info(`✅ Converted ${offers.length} products to offers (filtered by discount)`);
      const savedCount = await this.offerService.saveOffers(
        offers.filter((o): o is Offer => o !== null),
        this.userId
      );
      logger.info(`💾 Saved ${savedCount} offers from Mercado Livre to database`);

      return totalSaved + savedCount;
    } catch (error: any) {
      logger.error(`❌ Error collecting from Mercado Livre: ${error.message}`, error);
      return 0;
    }
  }

  /**
   * Collect offers from Shopee
   */
  async collectFromShopee(category: string = 'electronics'): Promise<number> {
    try {
      // 1. Resolve category (User Niche > Provided > Default)
      let searchCategory = category;

      // If using default 'electronics', try to use user niche instead
      if (category === 'electronics' && this.userId) {
        const userNiche = await this.getUserNicheKeywords();
        if (userNiche) {
          logger.info(`👤 Using user niche for Shopee: "${userNiche}"`);
          searchCategory = userNiche;
        }
      }

      logger.info(`🛒 Starting Shopee collection - Category: "${searchCategory}"`);

      const products = await this.shopeeService.getProducts(category, 200);

      if (products.length === 0) {
        logger.warn('⚠️ No products found from Shopee feeds');
        return 0;
      }

      logger.info(`📦 Found ${products.length} products from Shopee`);

      // Convert to offers
      const offers = products
        .map((product) => this.shopeeService.convertToOffer(product, category))
        .filter((offer): offer is Offer => offer !== null);

      logger.info(`✅ Converted ${offers.length} products to offers`);
      const savedCount = await this.offerService.saveOffers(offers, this.userId);
      logger.info(`💾 Saved ${savedCount} offers from Shopee to database`);

      return savedCount;
    } catch (error: any) {
      logger.error(`❌ Error collecting from Shopee: ${error.message}`, error);
      return 0;
    }
  }

  /**
   * Collect offers from Awin Product Feeds
   */
  async collectFromAwin(): Promise<number> {
    try {
      logger.info('🔗 Starting Awin collection from Product Feeds...');

      const awinService = new AwinService();

      if (!awinService.isConfigured()) {
        logger.warn('⚠️ Awin not configured, skipping collection');
        return 0;
      }

      const feedManager = new AwinFeedManager();

      // Get cached feeds stats
      const stats = feedManager.getStats();

      if (stats.totalCached === 0) {
        logger.info('📦 No cached feeds yet, trying to fetch from active feeds...');

        // Try to get feed list and download top advertisers
        const feedList = await awinService.fetchFeedList();

        if (feedList.length === 0) {
          logger.warn('⚠️ No product feeds available from Awin');
          return 0;
        }

        // Log first feed structure to debug column names
        if (feedList.length > 0) {
          logger.debug('📋 Feed list columns:', Object.keys(feedList[0]));
        }

        // Filter for ACTIVE advertisers only - can't download feeds without membership
        // Awin uses "active" for joined advertisers, "Not Joined" for others
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const joinedFeeds = feedList.filter((f: any) => {
          const status = f['Membership Status'] || f.membership_status || '';
          return status.toLowerCase() === 'active';
        });

        logger.info(
          `📋 Found ${joinedFeeds.length} joined advertisers (out of ${feedList.length} total)`
        );

        if (joinedFeeds.length === 0) {
          logger.warn(
            '⚠️ No joined advertisers found. You need to join advertisers in Awin dashboard first.'
          );
          logger.warn(
            '⚠️ Go to Awin > Advertisers > Join Programs to get access to their product feeds.'
          );
          return 0;
        }

        // Filter for recently updated feeds (last 7 days) to avoid stale pricing
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recentFeeds = joinedFeeds.filter((f: any) => {
          const lastImported = f['Last Imported'] || f['last_imported'] || '';
          if (!lastImported) return false;

          const importDate = new Date(lastImported);
          return importDate >= sevenDaysAgo;
        });

        logger.info(
          `📅 Found ${recentFeeds.length} feeds updated in the last 7 days (out of ${joinedFeeds.length} joined)`
        );

        if (recentFeeds.length === 0) {
          logger.warn('⚠️ No recently updated feeds found. All feeds are older than 7 days.');
          logger.info('📋 Skipping Awin collection to avoid stale pricing data.');
          return 0;
        }

        // Just collect the first few feeds to start
        const topFeeds = recentFeeds.slice(0, 5);
        let totalProducts = 0;

        for (const feed of topFeeds) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const f = feed as any;
            const advertiserId = f['Advertiser ID'] || f['advertiser_id'] || f.merchant_id;
            const feedUrl = f['URL'] || f.url || f.feed_url;
            const advertiserName = f['Advertiser Name'] || f['advertiser_name'] || 'Unknown';

            if (!advertiserId) {
              logger.debug('⚠️ No advertiserId found in feed');
              continue;
            }

            if (!feedUrl) {
              logger.debug(`⚠️ No feed URL for advertiser ${advertiserId}`);
              continue;
            }

            logger.info(`📡 Downloading feed for ${advertiserName} (ID: ${advertiserId})...`);

            // Download directly from the feed URL
            const offers = await awinService.downloadFeed(feedUrl, 100);

            if (offers.length > 0) {
              // Save all offers - Awin feeds often don't have original price so no discount filter
              const savedCount = await this.offerService.saveOffers(offers, this.userId);
              totalProducts += savedCount;
              logger.info(`✅ Collected ${savedCount} products from ${advertiserName}`);
            } else {
              logger.info(`📦 ${advertiserName}: No products found in feed`);
            }
          } catch (error: any) {
            logger.warn(`⚠️ Error collecting from feed: ${error.message}`);
          }
        }

        logger.info(`💾 Saved ${totalProducts} offers from Awin`);
        return totalProducts;
      }

      // Use cached feeds
      logger.info(
        `📦 Using ${stats.totalCached} cached feeds with ${stats.totalProducts} products`
      );

      let totalSaved = 0;
      const cachedFeeds = feedManager.getCachedFeeds();

      for (const entry of cachedFeeds) {
        try {
          // getProducts already returns Offer[] - just save directly
          const offers = await feedManager.getProducts(entry.advertiserId, {
            maxProducts: 100,
            minDiscount: 10,
          });

          if (offers.length > 0) {
            const savedCount = await this.offerService.saveOffers(offers, this.userId);
            totalSaved += savedCount;
          }
        } catch (error: any) {
          logger.warn(`⚠️ Error processing cached feed ${entry.advertiserId}: ${error.message}`);
        }
      }

      logger.info(`💾 Saved ${totalSaved} offers from Awin cached feeds`);
      return totalSaved;
    } catch (error: any) {
      logger.error(`❌ Error collecting from Awin: ${error.message}`, error);
      return 0;
    }
  }

  /**
   * Get config from UserSettings (database) with fallback to config.json
   */
  private async getCollectionConfig(): Promise<{
    sources: string[];
    enabled: boolean;
    rssFeeds: string[];
    niches: string[];
  }> {
    // 1. Try to get from Database (if userId is present)
    if (this.userId) {
      try {
        // Dynamic import to avoid circular dependencies if any
        const { UserSettingsModel } = await import('../../models/UserSettings');
        const settings = await UserSettingsModel.findOne({ userId: this.userId });

        if (settings) {
          return {
            sources: settings.collectionSettings?.sources || [
              'amazon',
              'aliexpress',
              'mercadolivre',
              'shopee',
              'rss',
            ],
            enabled: settings.collectionSettings?.enabled ?? true,
            rssFeeds: settings.rss || [],
            niches: settings.collectionSettings?.niches || ['diversified'],
          };
        }
      } catch (error) {
        logger.warn(
          `⚠️ Failed to load UserSettings for user ${this.userId}, falling back to defaults`,
          error
        );
      }
    }

    // 2. Fallback: config.json (Legacy)
    const legacyConfig = this.getConfig();
    let rssFeeds: string[] = [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const configPath = path.join(process.cwd(), 'config.json');

      if (fs.existsSync(configPath)) {
        const fileContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        rssFeeds = fileContent.rss || [];
      }
    } catch (error) {
      // Ignore error, use empty array
    }

    return {
      sources: legacyConfig.sources || [
        'amazon',
        'aliexpress',
        'mercadolivre',
        'shopee',
        'awin',
        'rss',
      ],
      enabled: legacyConfig.enabled ?? true,
      rssFeeds,
      niches: ['diversified'],
    };
  }

  /**
   * Get config from config.json or environment (Legacy Helper)
   */
  private getConfig(): { sources?: string[]; enabled?: boolean } {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const configPath = path.join(process.cwd(), 'config.json');

      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return config.collection || {};
      }
    } catch (error) {
      logger.debug('Error reading config.json, using defaults');
    }

    // Fallback: read from environment or use all sources
    return {
      sources: process.env.COLLECTION_SOURCES?.split(',') || [
        'amazon',
        'aliexpress',
        'mercadolivre',
        'shopee',
        'awin',
        'rss',
      ],
      enabled: true,
    };
  }

  /**
   * Collect from all CONFIGURED sources (respects UserSettings or config.collection.sources)
   */
  async collectAll(): Promise<{
    amazon: number;
    aliexpress: number;
    mercadolivre: number;
    shopee: number;
    awin: number;
    rss: number;
    total: number;
  }> {
    const config = await this.getCollectionConfig();

    // Check if collection is disabled
    if (config.enabled === false) {
      logger.info('⚠️ Collection is disabled in config. Skipping all sources.');
      return {
        amazon: 0,
        aliexpress: 0,
        mercadolivre: 0,
        shopee: 0,
        awin: 0,
        rss: 0,
        total: 0,
      };
    }

    const enabledSources = config.sources;
    const niches = config.niches && config.niches.length > 0 ? config.niches : ['diversified'];

    logger.info('🚀 ========================================');
    logger.info('🚀 Starting collection from configured sources');
    logger.info(`📋 Enabled sources: ${enabledSources.join(', ')}`);
    logger.info(`🎯 Selected Niches: ${niches.join(', ')}`);
    if (this.userId) logger.info(`👤 User Context: ${this.userId}`);
    logger.info('🚀 ========================================');

    const startTime = Date.now();

    const collectPromises: Promise<number>[] = [];
    let amazonTotal = 0;
    let aliexpressTotal = 0;
    let mercadolivreTotal = 0;
    let shopeeTotal = 0;
    let awinTotal = 0;
    let rssTotal = 0;

    // --- Amazon ---
    if (enabledSources.includes('amazon')) {
      const amazonPromises = niches.map(async (niche) => {
        const { NicheService } = await import('./NicheService');
        const nicheConfig = NicheService.getConfig(niche, 'amazon');
        logger.info(`🔍 Collecting Amazon for niche: ${niche} (${nicheConfig.keywords})`);
        try {
          const count = await this.collectFromAmazon(nicheConfig.keywords, nicheConfig.category);
          amazonTotal += count;
          return count;
        } catch (error) {
          logger.error(`Amazon collection failed for niche ${niche}:`, error);
          return 0;
        }
      });
      collectPromises.push(...amazonPromises);
    }

    // --- AliExpress ---
    if (enabledSources.includes('aliexpress')) {
      const aliexpressPromises = niches.map(async (niche) => {
        const { NicheService } = await import('./NicheService');
        const nicheConfig = NicheService.getConfig(niche, 'aliexpress');
        logger.info(`🔍 Collecting AliExpress for niche: ${niche} (${nicheConfig.keywords})`);
        try {
          const count = await this.collectFromAliExpress(nicheConfig.keywords);
          aliexpressTotal += count;
          return count;
        } catch (error) {
          logger.error(`AliExpress collection failed for niche ${niche}:`, error);
          return 0;
        }
      });
      collectPromises.push(...aliexpressPromises);
    }

    // --- Mercado Livre ---
    if (enabledSources.includes('mercadolivre')) {
      const mlPromises = niches.map(async (niche) => {
        const { NicheService } = await import('./NicheService');
        const nicheConfig = NicheService.getConfig(niche, 'mercadolivre');
        logger.info(`🔍 Collecting MercadoLivre for niche: ${niche} (${nicheConfig.keywords})`);
        try {
          const count = await this.collectFromMercadoLivre(nicheConfig.keywords);
          mercadolivreTotal += count;
          return count;
        } catch (error) {
          logger.error(`Mercado Livre collection failed for niche ${niche}:`, error);
          return 0;
        }
      });
      collectPromises.push(...mlPromises);
    }

    // --- Shopee ---
    if (enabledSources.includes('shopee')) {
      const shopeePromises = niches.map(async (niche) => {
        const { NicheService } = await import('./NicheService');
        const nicheConfig = NicheService.getConfig(niche, 'shopee');
        logger.info(`🔍 Collecting Shopee for niche: ${niche} (${nicheConfig.keywords})`);
        try {
          const count = await this.collectFromShopee(nicheConfig.keywords);
          shopeeTotal += count;
          return count;
        } catch (error) {
          logger.error(`Shopee collection failed for niche ${niche}:`, error);
          return 0;
        }
      });
      collectPromises.push(...shopeePromises);
    }

    // --- Awin (Niche agnostic for now) ---
    if (enabledSources.includes('awin')) {
      collectPromises.push(
        this.collectFromAwin()
          .then((count) => {
            awinTotal += count;
            return count;
          })
          .catch((error) => {
            logger.error('Awin collection failed:', error);
            return 0;
          })
      );
    }

    // --- RSS (Niche agnostic) ---
    if (enabledSources.includes('rss')) {
      collectPromises.push(
        (async () => {
          // Collect from all configured RSS feeds
          const rssFeeds = config.rssFeeds;

          if (rssFeeds.length === 0) {
            logger.info('ℹ️  No RSS feeds configured, skipping RSS collection');
            return 0;
          }

          let totalCollected = 0;
          for (const feedUrl of rssFeeds) {
            try {
              const count = await this.collectFromRSS(feedUrl, 'rss');
              totalCollected += count;
            } catch (error: any) {
              if (
                error.code === 'ECONNREFUSED' ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'ENOTFOUND'
              ) {
                logger.debug(`RSS feed temporarily unavailable: ${error.message}`);
              } else {
                logger.warn(`RSS collection failed for ${feedUrl}: ${error.message}`);
              }
            }
          }
          rssTotal += totalCollected;
          return totalCollected;
        })()
      );
    }

    // Wait for all collections
    await Promise.all(collectPromises);

    const total = amazonTotal + aliexpressTotal + mercadolivreTotal + shopeeTotal + awinTotal + rssTotal;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('🚀 ========================================');
    logger.info(`✅ Collection completed in ${duration}s`);
    logger.info(`📊 Results:`);
    logger.info(`   - Amazon: ${amazonTotal} offers`);
    logger.info(`   - AliExpress: ${aliexpressTotal} offers`);
    logger.info(`   - Mercado Livre: ${mercadolivreTotal} offers`);
    logger.info(`   - Shopee: ${shopeeTotal} offers`);
    logger.info(`   - Awin: ${awinTotal} offers`);
    logger.info(`   - RSS: ${rssTotal} offers`);
    logger.info(`   - TOTAL: ${total} offers`);
    logger.info('🚀 ========================================');

    return {
      amazon: amazonTotal,
      aliexpress: aliexpressTotal,
      mercadolivre: mercadolivreTotal,
      shopee: shopeeTotal,
      awin: awinTotal,
      rss: rssTotal,
      total,
    };
  }
}
