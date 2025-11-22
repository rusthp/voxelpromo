import { AmazonService } from '../amazon/AmazonService';
import { AliExpressService } from '../aliexpress/AliExpressService';
import { MercadoLivreService } from '../mercadolivre/MercadoLivreService';
import { ShopeeService } from '../shopee/ShopeeService';
import { RSSService } from '../rss/RSSService';
import { OfferService } from '../offer/OfferService';
import { logger } from '../../utils/logger';
import { retryWithBackoff } from '../../utils/retry';
import { Offer } from '../../types';

export class CollectorService {
  private amazonService: AmazonService;
  private aliExpressService: AliExpressService;
  private mercadoLivreService: MercadoLivreService;
  private shopeeService: ShopeeService;
  private rssService: RSSService;
  private offerService: OfferService;

  constructor() {
    this.amazonService = new AmazonService();
    this.aliExpressService = new AliExpressService();
    this.mercadoLivreService = new MercadoLivreService();
    this.shopeeService = new ShopeeService();
    this.rssService = new RSSService();
    this.offerService = new OfferService();
  }

  /**
   * Collect offers from Amazon
   */
  async collectFromAmazon(keywords: string = 'electronics', category: string = 'electronics'): Promise<number> {
    try {
      logger.info(`🔍 Starting Amazon collection - Keywords: "${keywords}", Category: "${category}"`);
      const products = await this.amazonService.searchProducts(keywords, 20);
      logger.info(`📦 Found ${products.length} products from Amazon`);

      const offers = products
        .map((product) => this.amazonService.convertToOffer(product, category))
        .filter((offer) => offer !== null);

      logger.info(`✅ Converted ${offers.length} products to offers (filtered by discount)`);
      const savedCount = await this.offerService.saveOffers(offers.filter((o): o is Offer => o !== null));
      logger.info(`💾 Saved ${savedCount} offers from Amazon to database`);

      return savedCount;
    } catch (error: any) {
      logger.error(`❌ Error collecting from Amazon: ${error.message}`, error);
      return 0;
    }
  }

  /**
   * Collect offers from AliExpress with retry and fallback
   */
  async collectFromAliExpress(category: string = 'electronics'): Promise<number> {
    try {
      logger.info(`🔍 Starting AliExpress collection - Category: "${category}"`);
      
      // Try API methods with retry
      const allProducts: any[] = [];
      
      try {
        // Get hot products with Advanced API
        logger.info('📈 Fetching hot products from AliExpress (Advanced API)...');
        const hotProducts = await retryWithBackoff(
          () => this.aliExpressService.getHotProducts({
            pageSize: 20,
            targetCurrency: 'BRL',
            targetLanguage: 'PT',
            shipToCountry: 'BR',
            sort: 'LAST_VOLUME_DESC', // Sort by volume descending (most popular)
            platformProductType: 'ALL'
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
          () => this.aliExpressService.smartMatchProducts({
            keywords: category === 'electronics' ? 'electronics' : category,
            pageNo: 1,
            targetCurrency: 'BRL',
            targetLanguage: 'PT',
            country: 'BR'
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
        const flashDeals = await retryWithBackoff(
          () => this.aliExpressService.getFlashDeals(20),
          { maxRetries: 2, initialDelay: 2000 }
        );
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
              logger.info(`📄 [PAGINAÇÃO] ====== BUSCANDO PÁGINA ${currentPage}/${maxPages} ======`);
              
              try {
                const result = await this.aliExpressService.getFeaturedPromoProducts({
                  promotionName: 'Hot Product', // Try "Hot Product", "New Arrival", "Best Seller", "weeklydeals"
                  pageNo: currentPage,
                  pageSize: pageSize,
                  targetCurrency: 'BRL', // Request prices in BRL directly
                  targetLanguage: 'PT', // Portuguese for better results
                  sort: 'discountDesc' // Sort by discount descending
                });

                logger.info(`📊 [PAGINAÇÃO] Resposta da API - Página: ${result.pagination.currentPage}/${result.pagination.totalPages}, Total de registros: ${result.pagination.totalRecords}, Produtos nesta página: ${result.products.length}, Finalizado: ${result.pagination.isFinished}`);

                if (result.products.length > 0) {
                  allFeaturedProducts.push(...result.products);
                  logger.info(`✅ [PAGINAÇÃO] Adicionados ${result.products.length} produtos da página ${currentPage}. Total acumulado: ${allFeaturedProducts.length}`);
                } else {
                  logger.warn(`⚠️ [PAGINAÇÃO] Nenhum produto retornado da página ${currentPage}`);
                  // If no products and we're on page 1, might be an API issue - break to avoid infinite loop
                  if (currentPage === 1 && result.pagination.totalPages === 0) {
                    logger.warn('⚠️ [PAGINAÇÃO] API retornou sem produtos e sem informações de paginação. Parando paginação.');
                    break;
                  }
                }

                // Use the page number returned by API to be safe
                const apiCurrentPage = result.pagination.currentPage || currentPage;
                const apiTotalPages = result.pagination.totalPages || 1;
                
                logger.info(`🔍 [PAGINAÇÃO] DEBUG - apiCurrentPage: ${apiCurrentPage}, apiTotalPages: ${apiTotalPages}, currentPage: ${currentPage}, maxPages: ${maxPages}`);
                
                // FORCE collection of multiple pages if API says there are more
                // If totalPages > 1, we MUST collect at least 2 pages
                let shouldContinue = false;
                
                if (apiTotalPages > 1) {
                  // If we have more than 1 page available, continue until we reach totalPages or maxPages
                  shouldContinue = currentPage < Math.min(apiTotalPages, maxPages);
                  logger.info(`🔍 [PAGINAÇÃO] TotalPages > 1, continuando: ${shouldContinue} (currentPage: ${currentPage}, min: ${Math.min(apiTotalPages, maxPages)})`);
                } else if (apiTotalPages === 1 && currentPage === 1) {
                  // If API says only 1 page, but we got products, try at least page 2 to verify
                  shouldContinue = result.products.length > 0 && currentPage < maxPages;
                  logger.info(`🔍 [PAGINAÇÃO] API diz 1 página, mas tentando página 2 para verificar: ${shouldContinue}`);
                } else {
                  shouldContinue = false;
                  logger.info(`🔍 [PAGINAÇÃO] Não continuando: totalPages=${apiTotalPages}, currentPage=${currentPage}`);
                }
                
                logger.info(`🔍 [PAGINAÇÃO] Verificação FINAL - Página API: ${apiCurrentPage}, Total API: ${apiTotalPages}, Nossa Página: ${currentPage}, Máx Páginas: ${maxPages}, Finalizado: ${result.pagination.isFinished}, Deve Continuar: ${shouldContinue}`);

                // Move to next page
                currentPage++;
                hasMorePages = shouldContinue;

                // Small delay between pages to avoid rate limiting
                if (hasMorePages) {
                  logger.info(`⏳ [PAGINAÇÃO] Aguardando 1 segundo antes de buscar página ${currentPage}...`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
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
                logger.error(`❌ [PAGINAÇÃO] Erro ao buscar página ${currentPage}:`, pageError.message);
                logger.error(`❌ [PAGINAÇÃO] Stack:`, pageError.stack?.substring(0, 200));
                // Continue to next page if not on first page, otherwise break
                if (currentPage === 1) {
                  throw pageError; // Re-throw on first page to trigger retry
                }
                currentPage++;
                hasMorePages = currentPage <= maxPages;
              }
            }

            logger.info(`🎯 [PAGINAÇÃO] Coleta finalizada: ${allFeaturedProducts.length} produtos de ${currentPage - 1} página(s)`);
            return allFeaturedProducts;
          },
          { maxRetries: 2, initialDelay: 2000 }
        );
        logger.info(`🎯 [PAGINAÇÃO] Total de produtos promocionais encontrados: ${featuredPromos.length}`);
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
            'https://www.promobit.com.br/rss'
          ];
          
          for (const feedUrl of rssFeeds) {
            try {
              const rssOffers = await this.rssService.parseFeed(feedUrl, 'aliexpress');
              // Filter for AliExpress-related offers
              const aliExpressOffers = rssOffers.filter(offer => 
                offer.productUrl?.includes('aliexpress.com') || 
                offer.affiliateUrl?.includes('aliexpress.com') ||
                offer.title?.toLowerCase().includes('aliexpress') ||
                offer.description?.toLowerCase().includes('aliexpress')
              );
              
              if (aliExpressOffers.length > 0) {
                logger.info(`📰 Found ${aliExpressOffers.length} AliExpress offers from RSS feed: ${feedUrl}`);
                const savedCount = await this.offerService.saveOffers(aliExpressOffers);
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
      const savedCount = await this.offerService.saveOffers(offers.filter((o): o is Offer => o !== null));
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

      const savedCount = await this.offerService.saveOffers(offers);
      logger.info(`Saved ${savedCount} offers from RSS`);

      return savedCount;
    } catch (error) {
      logger.error('Error collecting from RSS:', error);
      return 0;
    }
  }

  /**
   * Collect offers from Mercado Livre with retry and fallback
   */
  async collectFromMercadoLivre(category: string = 'electronics'): Promise<number> {
    try {
      logger.info(`🔍 Starting Mercado Livre collection - Category: "${category}"`);
      
      const allProducts: any[] = [];
      
      // Try hot deals with retry
      try {
        logger.info('🔥 Fetching hot deals from Mercado Livre...');
        const hotDeals = await retryWithBackoff(
          () => this.mercadoLivreService.getHotDeals(20),
          { maxRetries: 2, initialDelay: 2000 }
        );
        logger.info(`🔥 Found ${hotDeals.length} hot deals`);
        allProducts.push(...hotDeals);
      } catch (error: any) {
        logger.warn(`⚠️ Failed to get hot deals: ${error.message}`);
      }
      
      // Try search with multiple terms
      try {
        logger.info('🔍 Searching products from Mercado Livre...');
        
        // Try multiple search terms to get more products
        const searchTerms = [
          'eletrônicos',
          'smartphone',
          'notebook',
          'tablet',
          'fone de ouvido'
        ];
        
        for (const term of searchTerms) {
          try {
            const products = await retryWithBackoff(
              () => this.mercadoLivreService.searchProducts(term, 20, {
                sort: 'price_asc',
                condition: 'new'
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
              () => this.mercadoLivreService.searchProducts(term, 20, {
                sort: 'price_asc',
                condition: 'new'
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

      // Fallback: Scraping when API fails
      if (allProducts.length === 0) {
        logger.info('🕷️ Trying scraping method as fallback for Mercado Livre...');
        try {
          const scrapedProducts = await this.mercadoLivreService.collectViaScraping(category, 50);
          if (scrapedProducts.length > 0) {
            logger.info(`🕷️ Found ${scrapedProducts.length} products via scraping`);
            allProducts.push(...scrapedProducts);
          }
        } catch (error: any) {
          logger.warn(`⚠️ Scraping fallback failed: ${error.message}`);
        }
      }

      // Final fallback: RSS feeds
      if (allProducts.length === 0) {
        logger.info('🔄 Trying RSS feeds as final fallback for Mercado Livre...');
        try {
          const rssFeeds = [
            'https://www.mercadolivre.com.br/rss/ofertas',
            'https://www.pelando.com.br/feed'
          ];
          
          for (const feedUrl of rssFeeds) {
            try {
              const rssOffers = await this.rssService.parseFeed(feedUrl, 'mercadolivre');
              if (rssOffers.length > 0) {
                logger.info(`📰 Found ${rssOffers.length} offers from RSS feed`);
                const savedCount = await this.offerService.saveOffers(rssOffers);
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

      logger.info(`📦 Total products from Mercado Livre: ${allProducts.length}`);
      
      // If we have products but they might be missing original_price, fetch details
      if (allProducts.length > 0 && allProducts.length < 50) {
        logger.info('🔍 Fetching product details to get complete pricing information...');
        
        try {
          // Get product IDs
          const productIds = allProducts.map(p => p.id).slice(0, 20); // Limit to 20 per multiget
          
          // Fetch detailed product information
          const detailedProducts = await retryWithBackoff(
            () => this.mercadoLivreService.getMultipleProducts(productIds),
            { maxRetries: 2, initialDelay: 1000 }
          );
          
          // Replace products with detailed versions
          const detailedMap = new Map();
          detailedProducts.forEach((item: any) => {
            if (item.code === 200 && item.body) {
              detailedMap.set(item.body.id, item.body);
            }
          });
          
          // Update products with detailed information
          allProducts.forEach((product, index) => {
            if (detailedMap.has(product.id)) {
              allProducts[index] = detailedMap.get(product.id);
              logger.debug(`✅ Updated product ${product.id} with detailed information`);
            }
          });
          
          logger.info(`✅ Updated ${detailedMap.size} products with detailed information`);
        } catch (error: any) {
          logger.warn(`⚠️ Failed to fetch product details: ${error.message}`);
          // Continue with original products
        }
      }
      
      // Debug: Log first product structure if available
      if (allProducts.length > 0) {
        logger.debug('Sample product structure:', {
          id: allProducts[0].id,
          title: allProducts[0].title?.substring(0, 50),
          price: allProducts[0].price,
          original_price: allProducts[0].original_price,
          hasPermalink: !!allProducts[0].permalink
        });
      }

      if (allProducts.length === 0) {
        logger.warn('⚠️ No products collected from Mercado Livre (all methods failed)');
        return 0;
      }

      // Optionally fetch detailed product information for better data quality
      // Use multiget for efficiency (up to 20 products at once)
      let productsWithDetails: any[] = [];
      const productsToDetail = allProducts.slice(0, 20); // Get details for first 20
      
      if (productsToDetail.length > 0) {
        try {
          // Use multiget to fetch multiple products efficiently with retry
          const itemIds = productsToDetail.map(p => p.id);
          const multigetResults = await retryWithBackoff(
            () => this.mercadoLivreService.getMultipleProducts(
              itemIds,
              ['id', 'title', 'price', 'original_price', 'base_price', 'sale_price', 
               'permalink', 'thumbnail', 'pictures', 'seller', 'attributes', 
               'shipping', 'currency_id', 'category_id']
            ),
            { maxRetries: 2, initialDelay: 2000 }
          );

          // Process multiget results
          // Mercado Livre API returns array directly, each item can be:
          // - An object with {code: 200, body: {...}} for successful requests
          // - An object with {code: 404, error: ...} for failed requests
          // - Or directly the product object if successful
          const detailedProducts = new Map<string, any>();
          multigetResults.forEach((result: any) => {
            // Handle different response formats
            if (result.code === 200 && result.body) {
              // Format: {code: 200, body: {...}}
              detailedProducts.set(result.body.id, result.body);
            } else if (result.id && !result.code) {
              // Format: Direct product object
              detailedProducts.set(result.id, result);
            } else if (result.body && result.body.id) {
              // Format: {body: {...}} without code
              detailedProducts.set(result.body.id, result.body);
            }
          });

          // Merge detailed products with original products
          productsWithDetails = productsToDetail.map(product => {
            const detailed = detailedProducts.get(product.id);
            return detailed || product; // Use detailed if available, otherwise use original
          });
          
          logger.info(`✅ Merged ${productsWithDetails.length} products with details`);
        } catch (error) {
          logger.warn('Error fetching product details via multiget, using basic data');
          productsWithDetails = productsToDetail;
        }
      }

      // For remaining products, use basic data
      const remainingProducts = allProducts.slice(20);
      const allProductsProcessed = [...productsWithDetails, ...remainingProducts];

      logger.info(`🔄 Converting ${allProductsProcessed.length} products to offers...`);
      
      const offers = allProductsProcessed
        .map((product, index) => {
          const offer = this.mercadoLivreService.convertToOffer(product, category);
          if (!offer && index < 3) {
            // Log first 3 failed conversions for debugging
            logger.debug(`Product ${index + 1} conversion failed:`, {
              id: product.id,
              title: product.title?.substring(0, 50),
              price: product.price,
              original_price: product.original_price,
              discount: product.original_price && product.price ? 
                ((product.original_price - product.price) / product.original_price * 100).toFixed(2) + '%' : 'N/A'
            });
          }
          return offer;
        })
        .filter((offer) => offer !== null);

      logger.info(`✅ Converted ${offers.length} products to offers (filtered by discount)`);
      const savedCount = await this.offerService.saveOffers(offers.filter((o): o is Offer => o !== null));
      logger.info(`💾 Saved ${savedCount} offers from Mercado Livre to database`);

      return savedCount;
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
      logger.info(`🛒 Starting Shopee collection - Category: "${category}"`);
      
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
      const savedCount = await this.offerService.saveOffers(offers);
      logger.info(`💾 Saved ${savedCount} offers from Shopee to database`);

      return savedCount;
    } catch (error: any) {
      logger.error(`❌ Error collecting from Shopee: ${error.message}`, error);
      return 0;
    }
  }

  /**
   * Collect from all sources
   */
  async collectAll(): Promise<{ amazon: number; aliexpress: number; mercadolivre: number; shopee: number; rss: number; total: number }> {
    logger.info('🚀 ========================================');
    logger.info('🚀 Starting collection from ALL sources');
    logger.info('🚀 ========================================');

    const startTime = Date.now();

    const [amazon, aliexpress, mercadolivre, shopee, rss] = await Promise.all([
      this.collectFromAmazon('electronics', 'electronics').catch((error) => {
        logger.error('Amazon collection failed:', error);
        return 0;
      }),
      this.collectFromAliExpress('electronics').catch((error) => {
        logger.error('AliExpress collection failed:', error);
        return 0;
      }),
      // Mercado Livre temporarily disabled
      Promise.resolve(0).then(() => {
        logger.info('⏸️  Mercado Livre collection is disabled');
        return 0;
      }),
      // this.collectFromMercadoLivre('electronics').catch((error) => {
      //   logger.error('Mercado Livre collection failed:', error);
      //   return 0;
      // }),
      this.collectFromShopee('electronics').catch((error) => {
        logger.error('Shopee collection failed:', error);
        return 0;
      }),
      // Add default RSS feeds here (with better error handling)
      this.collectFromRSS('https://www.pelando.com.br/feed', 'pelando').catch((error: any) => {
        // Don't log as error if it's a connection issue - RSS feeds can be temporarily unavailable
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
          logger.debug(`RSS feed temporarily unavailable: ${error.message}`);
        } else {
          logger.warn(`RSS collection failed: ${error.message}`);
        }
        return 0;
      })
    ]);

    const total = amazon + aliexpress + mercadolivre + shopee + rss;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('🚀 ========================================');
    logger.info(`✅ Collection completed in ${duration}s`);
    logger.info(`📊 Results:`);
    logger.info(`   - Amazon: ${amazon} offers`);
    logger.info(`   - AliExpress: ${aliexpress} offers`);
    logger.info(`   - Mercado Livre: ${mercadolivre} offers (disabled)`);
    logger.info(`   - Shopee: ${shopee} offers`);
    logger.info(`   - RSS: ${rss} offers`);
    logger.info(`   - TOTAL: ${total} offers`);
    logger.info('🚀 ========================================');

    return {
      amazon,
      aliexpress,
      mercadolivre,
      shopee,
      rss,
      total
    };
  }
}

