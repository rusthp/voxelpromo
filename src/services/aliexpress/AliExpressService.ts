import axios from 'axios';
import crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { CategoryService } from '../category/CategoryService';

interface AliExpressProduct {
  product_id: string;
  product_title: string;
  product_price: {
    currency: string;
    value: string;
  };
  original_price?: {
    currency: string;
    value: string;
  };
  product_image_url: string;
  product_detail_url: string;
  shop_info?: {
    shop_name: string;
  };
  evaluation?: {
    star_rate: string;
    valid_orders: number;
  };
}

interface AliExpressConfig {
  appKey: string;
  appSecret: string;
  trackingId: string;
}

export class AliExpressService {
  // Use the official AliExpress Open Service API endpoint
  private baseUrl = 'https://api-sg.aliexpress.com/sync';

  // Public methods: getHotProducts, getFlashDeals, getFeaturedPromoProducts, convertToOffer

  /**
   * Safely parse a number, returning 0 if parsing fails or result is NaN
   */
  private safeParseFloat(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private exchangeRateService: any = null;
  private categoryService: CategoryService;

  // Cache for affiliate links (productUrl -> { affiliateLink, timestamp })
  private affiliateLinkCache = new Map<string, { link: string; timestamp: number }>();
  private readonly AFFILIATE_LINK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * Get USD to BRL exchange rate
   * Uses real-time API if available, falls back to config, then default
   */
  private async getExchangeRate(): Promise<number> {
    try {
      // Lazy load ExchangeRateService to avoid circular dependencies
      if (!this.exchangeRateService) {
        const { ExchangeRateService } = await import('../exchangerate/ExchangeRateService');
        this.exchangeRateService = new ExchangeRateService();
      }

      // Try to get real-time rate
      const rate = await this.exchangeRateService.getUSDtoBRLRate();
      return rate;
    } catch (error: any) {
      logger.warn('Failed to get real-time exchange rate, using fallback:', error.message);

      // Fallback to config
      try {
        const configPath = join(process.cwd(), 'config.json');
        if (existsSync(configPath)) {
          const config = JSON.parse(readFileSync(configPath, 'utf-8'));
          if (config.aliexpress?.exchangeRate) {
            return this.safeParseFloat(config.aliexpress.exchangeRate, 5.0);
          }
        }
      } catch (configError) {
        // Fall through to default
      }

      // Final fallback to default
      const envRate = process.env.ALIEXPRESS_EXCHANGE_RATE;
      return this.safeParseFloat(envRate, 5.0);
    }
  }

  /**
   * Convert USD price to BRL
   * Uses real-time exchange rate if available
   */
  private async convertToBRL(usdPrice: number): Promise<number> {
    const exchangeRate = await this.getExchangeRate();
    return Math.round(usdPrice * exchangeRate * 100) / 100;
  }

  /**
   * Get current config from environment variables
   * This ensures we always use the latest credentials
   */
  private getConfig(): AliExpressConfig {
    // Try to load from config.json first (if available)
    try {
      const configPath = join(process.cwd(), 'config.json');

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.aliexpress?.appKey) {
          return {
            appKey: config.aliexpress.appKey,
            appSecret: config.aliexpress.appSecret || '',
            trackingId: config.aliexpress.trackingId || '',
          };
        }
      }
    } catch (error) {
      // Fall back to environment variables
    }

    // Fall back to environment variables
    return {
      appKey: process.env.ALIEXPRESS_APP_KEY || '',
      appSecret: process.env.ALIEXPRESS_APP_SECRET || '',
      trackingId: process.env.ALIEXPRESS_TRACKING_ID || '',
    };
  }

  /**
   * Generate affiliate link for a product URL
   * This ensures commission tracking for AliExpress products
   * 
   * @param productUrl - Original product URL
   * @returns Affiliate link with tracking, or original URL if generation fails
   */
  async generateAffiliateLink(productUrl: string): Promise<string> {
    try {
      // Check cache first
      const cached = this.affiliateLinkCache.get(productUrl);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < this.AFFILIATE_LINK_CACHE_TTL) {
          logger.debug('Using cached affiliate link', {
            productUrl: productUrl.substring(0, 50) + '...',
            cacheAge: `${Math.round(age / 1000 / 60)}min`
          });
          return cached.link;
        } else {
          // Cache expired, remove it
          this.affiliateLinkCache.delete(productUrl);
        }
      }

      const config = this.getConfig();

      if (!config.trackingId) {
        logger.warn('⚠️ No tracking ID configured - affiliate links will not track commissions!');
        logger.warn('💡 Configure tracking_id in config.json to enable commission tracking');
        return productUrl;
      }

      logger.info('🔗 Generating affiliate link via API', {
        method: 'aliexpress.affiliate.link.generate',
        trackingId: config.trackingId,
        urlPreview: productUrl.substring(0, 60) + '...'
      });

      const params = {
        promotion_link_type: '0', // 0 = Normal promotion link
        source_values: productUrl,
        tracking_id: config.trackingId,
      };

      const response = await this.makeRequest(
        'aliexpress.affiliate.link.generate',
        params,
        true // Suppress expected errors
      );

      // Extract affiliate link from response
      // Try multiple possible response structures
      let affiliateLink: string | null = null;

      // Structure 1: aliexpress_affiliate_link_generate_response.resp_result.result.promotion_links
      if (response.aliexpress_affiliate_link_generate_response?.resp_result?.result) {
        const result = response.aliexpress_affiliate_link_generate_response.resp_result.result;

        if (result.promotion_links && Array.isArray(result.promotion_links)) {
          const firstLink = result.promotion_links[0];
          affiliateLink = firstLink?.promotion_link || firstLink?.promotionLink;
        } else if (result.promotion_links?.promotion_link) {
          affiliateLink = result.promotion_links.promotion_link;
        }
      }
      // Structure 2: Direct promotion_links array
      else if (response.promotion_links && Array.isArray(response.promotion_links)) {
        affiliateLink = response.promotion_links[0]?.promotion_link;
      }

      if (affiliateLink && typeof affiliateLink === 'string' && affiliateLink.trim().length > 0) {
        logger.info('✅ Successfully generated affiliate link', {
          original: productUrl.substring(0, 30) + '...',


          affiliate: affiliateLink.substring(0, 30) + '...',
          hasTracking: affiliateLink.includes(config.trackingId)
        });

        // Cache the generated link
        this.affiliateLinkCache.set(productUrl, {
          link: affiliateLink,
          timestamp: Date.now()
        });

        return affiliateLink;
      } else {
        logger.warn('⚠️ Affiliate link generation returned empty result, using original URL');
        return productUrl;
      }
    } catch (error: any) {
      const config = this.getConfig(); // Get config for fallback

      // Expected errors (API not available yet)
      if (error.message?.includes('InvalidApiPath') || error.message?.includes('InvalidApi')) {
        logger.warn('⚠️ Affiliate link API not available - using parametrized fallback');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        logger.warn('⚠️ API timeout - using parametrized fallback', {
          timeout: '60s',
          suggestion: 'API may be slow or unavailable'
        });
      } else {
        logger.warn('⚠️ Error generating affiliate link via API:', error.message);
      }

      // Fallback to parametrized URL (still trackable!)
      return this.generateParametrizedAffiliateLink(productUrl, config.trackingId);
    }
  }

  /**
   * Generate parametrized affiliate link (fallback method)
   * Adds tracking parameters directly to URL
   * @param productUrl - Original product URL
   * @param trackingId - Tracking ID
   * @returns URL with tracking parameters
   */
  private generateParametrizedAffiliateLink(productUrl: string, trackingId: string): string {
    try {
      const url = new URL(productUrl);

      // Add AliExpress affiliate tracking parameters
      url.searchParams.set('aff_platform', 'portals-tool');
      url.searchParams.set('aff_trace_key', trackingId);
      url.searchParams.set('terminal_id', 'voxelpromo');

      const parametrizedUrl = url.toString();

      logger.info('✅ Generated parametrized affiliate link (fallback)', {
        original: productUrl.substring(0, 40) + '...',
        parametrized: parametrizedUrl.substring(0, 50) + '...',
        hasTracking: true
      });

      return parametrizedUrl;
    } catch (error) {
      logger.error('Failed to parse URL for parametrization, using original:', error);
      return productUrl;
    }
  }

  /**
   * Generate signature for AliExpress API
   * Based on AliExpress Open Service API documentation
   * Format: MD5(app_secret + sorted_params + app_secret).toUpperCase()
   */
  private generateSignature(params: Record<string, any>, appSecret: string): string {
    // Sort parameters by key
    const sortedKeys = Object.keys(params).sort();

    // Build sign string: key1value1key2value2...
    const signString = sortedKeys.map((key) => `${key}${params[key]}`).join('');

    // Final signature: app_secret + sorted_params + app_secret
    const fullSignString = appSecret + signString + appSecret;

    // Generate MD5 hash and convert to uppercase
    const signature = crypto
      .createHash('md5')
      .update(fullSignString, 'utf8')
      .digest('hex')
      .toUpperCase();

    return signature;
  }

  /**
   * Make API request to AliExpress
   * Based on AliExpress Open Service API documentation
   * Reference: https://openservice.aliexpress.com/doc/api.htm
   * @param suppressExpectedErrors - If true, InvalidApiPath errors will be logged at debug level instead of warning
   */
  private async makeRequest(
    method: string,
    params: Record<string, any>,
    suppressExpectedErrors: boolean = false
  ): Promise<any> {
    try {
      // Get fresh config on each request
      const config = this.getConfig();

      if (!config.appKey || !config.appSecret) {
        throw new Error('AliExpress App Key or App Secret not configured');
      }

      // Generate timestamp in milliseconds
      const timestamp = Date.now().toString();

      // Build request parameters according to AliExpress API format
      const requestParams: Record<string, any> = {
        method, // API method name (e.g., 'aliexpress.affiliate.hotproduct.query')
        app_key: config.appKey, // Application Key
        sign_method: 'md5', // Signature method
        timestamp, // Timestamp
        v: '2.0', // API version
        format: 'json', // Response format
        ...params, // Additional method-specific parameters
      };

      // Generate signature (must be done before adding sign parameter)
      const signature = this.generateSignature(requestParams, config.appSecret);
      requestParams.sign = signature;

      logger.info(`Making AliExpress API request: ${method}`, {
        appKey: config.appKey.substring(0, 6) + '...',
        hasAppSecret: !!config.appSecret,
        paramsCount: Object.keys(params).length,
        timestamp,
        signaturePreview: signature.substring(0, 10) + '...',
        targetCurrency: params.target_currency || 'not specified',
        targetLanguage: params.target_language || 'not specified',
        shipToCountry: params.ship_to_country || 'not specified',
      });

      // AliExpress API typically uses GET requests with query parameters
      // Reference: https://openservice.aliexpress.com/doc/api.htm
      const response = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 60000, // 60 second timeout (increased from 30s to handle affiliate link generation)
      });

      // Only log debug if it's not an expected InvalidApiPath error
      const errorCode = response.data.error_response?.code;
      if (errorCode !== 'InvalidApiPath' && errorCode !== 'InvalidApi') {
        logger.debug('AliExpress API response:', {
          status: response.status,
          hasError: !!response.data.error_response,
          hasResponse:
            !!response.data.aliexpress_affiliate_hotproduct_query_response ||
            !!response.data.aliexpress_affiliate_flashdeal_query_response ||
            !!response.data.aliexpress_affiliate_featuredpromo_products_get_response,
        });
      }

      if (response.data.error_response) {
        const errorMsg =
          response.data.error_response.msg ||
          response.data.error_response.message ||
          'Unknown error';
        const errorCode = response.data.error_response.code || 'UNKNOWN';

        // InvalidApiPath is expected during Advanced API activation period
        // For some methods (like coupon.query), this is always expected - use debug level
        if (errorCode === 'InvalidApiPath' || errorCode === 'InvalidApi') {
          if (suppressExpectedErrors) {
            logger.debug('AliExpress API not available (expected for this method):', {
              code: errorCode,
              method: method,
            });
          } else {
            logger.warn('⚠️ AliExpress Advanced API not available yet (activation in progress):', {
              code: errorCode,
              message: errorMsg,
              method: method,
            });
          }
        } else {
          logger.error('AliExpress API error response:', {
            code: errorCode,
            message: errorMsg,
            fullResponse: response.data.error_response,
          });
        }
        throw new Error(`AliExpress API error [${errorCode}]: ${errorMsg}`);
      }

      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        // Check if it's an InvalidApiPath error (expected during activation)
        const errorCode = error.response.data.error_response?.code;
        if (errorCode === 'InvalidApiPath' || errorCode === 'InvalidApi') {
          if (suppressExpectedErrors) {
            logger.debug('AliExpress API not available (expected for this method):', {
              status: error.response.status,
              code: errorCode,
              method: method,
            });
          } else {
            logger.warn('⚠️ AliExpress Advanced API not available yet (activation in progress):', {
              status: error.response.status,
              code: errorCode,
              method: method,
            });
          }
        } else {
          logger.error('AliExpress API error response:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
          });
        }

        // Try to extract error message from response
        if (error.response.data.error_response) {
          const errorMsg =
            error.response.data.error_response.msg || error.response.data.error_response.message;
          throw new Error(`AliExpress API error [${errorCode || 'UNKNOWN'}]: ${errorMsg}`);
        }
      }

      // Only log as error if it's not an InvalidApiPath (which is expected)
      if (!error.message?.includes('InvalidApiPath') && !error.message?.includes('InvalidApi')) {
        logger.error('AliExpress API error:', error.message);
      }
      throw new Error(`AliExpress API error: ${error.message}`);
    }
  }

  /**
   * Search products by keyword using aliexpress.affiliate.product.query
   * Reference: https://openservice.aliexpress.com/doc/api.htm#/api?cid=21407&path=aliexpress.affiliate.product.query
   */
  async searchProducts(
    keyword: string = 'electronics',
    pageSize: number = 20
  ): Promise<AliExpressProduct[]> {
    try {
      logger.info(`Searching AliExpress products with keyword: "${keyword}"`);

      // Get config for tracking_id
      const config = this.getConfig();

      // Try multiple parameter combinations for better compatibility
      // Based on official AliExpress API documentation examples
      const paramCombinations = [
        // Combination 1: Minimal parameters with tracking_id
        {
          keywords: keyword,
          page_size: pageSize.toString(),
          page_no: '1',
          tracking_id: config.trackingId || 'default',
        },
        // Combination 2: With currency, language, and shipping country (BRL for Brazil)
        {
          keywords: keyword,
          page_size: pageSize.toString(),
          page_no: '1',
          target_currency: 'BRL',
          target_language: 'PT',
          ship_to_country: 'BR',
          tracking_id: config.trackingId || 'default',
        },
        // Combination 3: With sorting and all standard params (BRL for Brazil)
        {
          keywords: keyword,
          page_size: pageSize.toString(),
          page_no: '1',
          target_currency: 'BRL',
          target_language: 'PT',
          ship_to_country: 'BR',
          sort: 'SALE_PRICE_ASC',
          tracking_id: config.trackingId || 'default',
          platform_product_type: 'ALL',
        },
        // Combination 4: With locale and all params (BRL for Brazil)
        {
          keywords: keyword,
          page_size: pageSize.toString(),
          page_no: '1',
          target_currency: 'BRL',
          target_language: 'PT',
          ship_to_country: 'BR',
          tracking_id: config.trackingId || 'default',
          platform_product_type: 'ALL',
        },
      ];

      // Try each parameter combination
      for (let i = 0; i < paramCombinations.length; i++) {
        const params = paramCombinations[i];

        logger.info(`Trying parameter combination ${i + 1}/${paramCombinations.length}:`, {
          keywords: params.keywords,
          page_size: params.page_size,
          hasCurrency: !!params.target_currency,
          hasLanguage: !!params.target_language,
          hasSort: !!params.sort,
        });

        try {
          // Try the official product.query method
          const response = await this.makeRequest('aliexpress.affiliate.product.query', params);

          logger.debug('Product query response structure:', {
            hasResponse: !!response.aliexpress_affiliate_product_query_response,
            responseKeys: Object.keys(response),
          });

          // Handle different response structures
          const responseData = response.aliexpress_affiliate_product_query_response;

          if (responseData) {
            // Check resp_result first for error codes and empty responses
            if (responseData.resp_result) {
              const respCode = responseData.resp_result.resp_code;
              const respMsg = responseData.resp_result.resp_msg;
              const hasResult = !!responseData.resp_result.result;

              logger.debug('resp_result check:', {
                respCode,
                respMsg,
                hasResult,
                respResultKeys: Object.keys(responseData.resp_result),
              });

              // Check if response indicates an error
              if (respCode !== undefined && respCode !== 200 && respCode !== '200') {
                logger.warn(`AliExpress API returned error code: ${respCode}, message: ${respMsg}`);
                // Continue to next parameter combination
                continue;
              }

              // If resp_result exists but has no result field, it's likely an empty response
              if (!hasResult) {
                logger.warn(
                  `Response has resp_result but no result field. Code: ${respCode}, Msg: ${respMsg}. This likely means no products found for this parameter combination.`
                );
                // Continue to next parameter combination - this one returned empty
                continue;
              }
            }

            // Log full response structure for debugging (avoid logging huge objects)
            const responseKeys = Object.keys(responseData);
            logger.info('Full response data structure:', {
              keys: responseKeys,
              hasProducts: !!responseData.products,
              hasProductList: !!responseData.product_list,
              hasResult: !!responseData.result,
              hasRespResult: !!responseData.resp_result,
              respCode: responseData.resp_result?.resp_code,
              respMsg: responseData.resp_result?.resp_msg,
              totalKeys: responseKeys.length,
            });

            // Log a sample of the first few keys to understand structure
            if (responseKeys.length > 0) {
              const sampleKey = responseKeys[0];
              const sampleValue = responseData[sampleKey];
              if (sampleValue && typeof sampleValue === 'object') {
                logger.debug(`Sample key "${sampleKey}" structure:`, {
                  type: Array.isArray(sampleValue) ? 'array' : 'object',
                  length: Array.isArray(sampleValue)
                    ? sampleValue.length
                    : Object.keys(sampleValue).length,
                  firstKeys: Array.isArray(sampleValue)
                    ? sampleValue[0]
                      ? Object.keys(sampleValue[0]).slice(0, 10)
                      : []
                    : Object.keys(sampleValue).slice(0, 10),
                });
              }
            }

            // Try multiple possible response structures
            let products: any[] = [];

            // Structure 1: response.products.product
            if (responseData.products?.product) {
              products = Array.isArray(responseData.products.product)
                ? responseData.products.product
                : [responseData.products.product];
              logger.info(
                `Found products in structure 1: products.product (${products.length} items)`
              );
            }
            // Structure 2: response.product_list.product
            else if (responseData.product_list?.product) {
              products = Array.isArray(responseData.product_list.product)
                ? responseData.product_list.product
                : [responseData.product_list.product];
              logger.info(
                `Found products in structure 2: product_list.product (${products.length} items)`
              );
            }
            // Structure 3: response.aeop_ae_product_display_dto_list.aeop_ae_product_display_dto
            else if (responseData.aeop_ae_product_display_dto_list?.aeop_ae_product_display_dto) {
              products = Array.isArray(
                responseData.aeop_ae_product_display_dto_list.aeop_ae_product_display_dto
              )
                ? responseData.aeop_ae_product_display_dto_list.aeop_ae_product_display_dto
                : [responseData.aeop_ae_product_display_dto_list.aeop_ae_product_display_dto];
              logger.info(
                `Found products in structure 3: aeop_ae_product_display_dto_list (${products.length} items)`
              );
            }
            // Structure 4: response.result.products
            else if (responseData.result?.products) {
              const resultProducts = responseData.result.products;
              products = Array.isArray(resultProducts)
                ? resultProducts
                : resultProducts.product
                  ? Array.isArray(resultProducts.product)
                    ? resultProducts.product
                    : [resultProducts.product]
                  : [];
              logger.info(
                `Found products in structure 4: result.products (${products.length} items)`
              );
            }
            // Structure 5: response.resp_result.result (products in result field)
            // Check if resp_result exists and has result field
            else if (responseData.resp_result) {
              const respCode = responseData.resp_result.resp_code;
              const respMsg = responseData.resp_result.resp_msg;

              // Log resp_result structure for debugging
              logger.debug('resp_result structure:', {
                hasResult: !!responseData.resp_result.result,
                respCode,
                respMsg,
                respResultKeys: Object.keys(responseData.resp_result),
              });

              // If resp_code indicates error, skip this structure
              if (respCode !== undefined && respCode !== 200 && respCode !== '200') {
                logger.debug(
                  `Skipping resp_result structure due to error code: ${respCode}, message: ${respMsg}`
                );
                // Continue to next structure check - don't process this one
              } else if (!responseData.resp_result.result) {
                // resp_result exists but no result field - likely empty response
                logger.debug(
                  `resp_result exists but no result field. Code: ${respCode}, Msg: ${respMsg}. This likely means no products found.`
                );
                // Continue to next structure check
              } else if (responseData.resp_result.result) {
                const resultData = responseData.resp_result.result;

                logger.debug('Checking resp_result.result:', {
                  respCode,
                  respMsg,
                  resultType: Array.isArray(resultData) ? 'array' : typeof resultData,
                  resultLength: Array.isArray(resultData)
                    ? resultData.length
                    : resultData
                      ? Object.keys(resultData).length
                      : 0,
                  resultKeys:
                    resultData && typeof resultData === 'object' && !Array.isArray(resultData)
                      ? Object.keys(resultData).slice(0, 10)
                      : [],
                });

                // Check if result is an array of products
                if (Array.isArray(resultData) && resultData.length > 0) {
                  // Check if first item looks like a product
                  if (
                    resultData[0]?.product_id ||
                    resultData[0]?.productId ||
                    resultData[0]?.target_sale_price ||
                    resultData[0]?.targetSalePrice ||
                    resultData[0]?.product_main_image_url ||
                    resultData[0]?.productMainImageUrl
                  ) {
                    products = resultData;
                    logger.info(
                      `Found products in structure 5: resp_result.result (array, ${products.length} items)`
                    );
                  } else {
                    logger.debug(
                      "resp_result.result is array but items don't look like products:",
                      {
                        firstItemKeys: Object.keys(resultData[0] || {}).slice(0, 10),
                      }
                    );
                  }
                }
                // Check if result is an object with products array
                else if (
                  resultData &&
                  typeof resultData === 'object' &&
                  !Array.isArray(resultData)
                ) {
                  const resultKeys = Object.keys(resultData);
                  logger.debug('resp_result.result is object with keys:', resultKeys);

                  // Try result.products (PRIORITY - this is the most common structure)
                  if (resultData.products !== undefined) {
                    logger.debug('Found products key in result, checking type:', {
                      isArray: Array.isArray(resultData.products),
                      type: typeof resultData.products,
                      length: Array.isArray(resultData.products)
                        ? resultData.products.length
                        : 'N/A',
                    });

                    // Handle array of products
                    if (Array.isArray(resultData.products)) {
                      if (resultData.products.length > 0) {
                        // Check if items look like products (more lenient check)
                        const firstItem = resultData.products[0];
                        const hasProductFields =
                          firstItem?.product_id ||
                          firstItem?.productId ||
                          firstItem?.target_sale_price ||
                          firstItem?.targetSalePrice ||
                          firstItem?.product_main_image_url ||
                          firstItem?.productMainImageUrl ||
                          firstItem?.product_title ||
                          firstItem?.productTitle ||
                          firstItem?.product_url ||
                          firstItem?.productUrl ||
                          firstItem?.shop_url ||
                          firstItem?.shopUrl;

                        if (hasProductFields) {
                          products = resultData.products;
                          logger.info(
                            `✅ Found products in structure 5: resp_result.result.products (${products.length} items)`
                          );
                        } else {
                          logger.debug(
                            "products array exists but items don't look like products:",
                            {
                              firstItemKeys: Object.keys(firstItem || {}).slice(0, 10),
                              firstItemSample: JSON.stringify(firstItem || {}).substring(0, 200),
                            }
                          );
                        }
                      } else {
                        logger.debug('products array exists but is empty');
                      }
                    }
                    // Handle object with nested product array
                    else if (resultData.products && typeof resultData.products === 'object') {
                      // Try products.product
                      if (Array.isArray(resultData.products.product)) {
                        products = resultData.products.product;
                        logger.info(
                          `✅ Found products in structure 5: resp_result.result.products.product (${products.length} items)`
                        );
                      }
                      // Try products.aeop_ae_product_display_dto
                      else if (Array.isArray(resultData.products.aeop_ae_product_display_dto)) {
                        products = resultData.products.aeop_ae_product_display_dto;
                        logger.info(
                          `✅ Found products in structure 5: resp_result.result.products.aeop_ae_product_display_dto (${products.length} items)`
                        );
                      }
                    }
                  }

                  // Try result.product (if products didn't work)
                  if (products.length === 0 && resultData.product) {
                    const productData = Array.isArray(resultData.product)
                      ? resultData.product
                      : [resultData.product];
                    if (
                      productData.length > 0 &&
                      (productData[0]?.product_id || productData[0]?.target_sale_price)
                    ) {
                      products = productData;
                      logger.info(
                        `Found products in structure 5: resp_result.result.product (${products.length} items)`
                      );
                    }
                  }

                  // Try result.product_list (if products didn't work)
                  if (
                    products.length === 0 &&
                    resultData.product_list &&
                    Array.isArray(resultData.product_list)
                  ) {
                    if (
                      resultData.product_list.length > 0 &&
                      (resultData.product_list[0]?.product_id ||
                        resultData.product_list[0]?.target_sale_price)
                    ) {
                      products = resultData.product_list;
                      logger.info(
                        `Found products in structure 5: resp_result.result.product_list (${products.length} items)`
                      );
                    }
                  }

                  // Try any array in result object (if products didn't work)
                  if (products.length === 0) {
                    for (const key of resultKeys) {
                      if (
                        key !== 'current_record_count' &&
                        key !== 'current_page_no' &&
                        key !== 'total_record_count'
                      ) {
                        if (Array.isArray(resultData[key]) && resultData[key].length > 0) {
                          const firstItem = resultData[key][0];
                          if (
                            firstItem?.product_id ||
                            firstItem?.productId ||
                            firstItem?.target_sale_price ||
                            firstItem?.targetSalePrice ||
                            firstItem?.product_main_image_url
                          ) {
                            products = resultData[key];
                            logger.info(
                              `Found products in structure 5: resp_result.result.${key} (${products.length} items)`
                            );
                            break;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            // Structure 5b: response.resp_result.products (fallback)
            else if (responseData.resp_result?.products) {
              const respProducts = responseData.resp_result.products;
              products = Array.isArray(respProducts)
                ? respProducts
                : respProducts.product
                  ? Array.isArray(respProducts.product)
                    ? respProducts.product
                    : [respProducts.product]
                  : [];
              logger.info(
                `Found products in structure 5b: resp_result.products (${products.length} items)`
              );
            }
            // Structure 6: Direct product array
            else if (Array.isArray(responseData.products)) {
              products = responseData.products;
              logger.info(
                `Found products in structure 6: direct products array (${products.length} items)`
              );
            }
            // Structure 7: Check for any array in response (deep search)
            else {
              const allKeys = Object.keys(responseData);
              logger.debug(`Searching for products in keys: ${allKeys.join(', ')}`);

              for (const key of allKeys) {
                const value = responseData[key];

                // Check if it's an array
                if (Array.isArray(value) && value.length > 0) {
                  // Check if array items look like products (check multiple possible field names)
                  const firstItem = value[0];
                  if (
                    firstItem?.product_id ||
                    firstItem?.productId ||
                    firstItem?.product_title ||
                    firstItem?.productTitle ||
                    firstItem?.target_sale_price ||
                    firstItem?.targetSalePrice ||
                    firstItem?.product_main_image_url ||
                    firstItem?.productMainImageUrl ||
                    firstItem?.shop_url ||
                    firstItem?.shopUrl
                  ) {
                    products = value;
                    logger.info(`Found products in key: ${key} (${products.length} items)`);
                    break;
                  }
                }
                // Check if it's an object with product array
                else if (value && typeof value === 'object') {
                  // Check for nested product arrays
                  if (value.product && Array.isArray(value.product)) {
                    products = value.product;
                    logger.info(`Found products in key: ${key}.product (${products.length} items)`);
                    break;
                  }
                  if (value.products && Array.isArray(value.products)) {
                    products = value.products;
                    logger.info(
                      `Found products in key: ${key}.products (${products.length} items)`
                    );
                    break;
                  }
                  if (value.product_list && Array.isArray(value.product_list)) {
                    products = value.product_list;
                    logger.info(
                      `Found products in key: ${key}.product_list (${products.length} items)`
                    );
                    break;
                  }
                  // Deep search in nested objects
                  const nestedKeys = Object.keys(value);
                  for (const nestedKey of nestedKeys) {
                    if (Array.isArray(value[nestedKey]) && value[nestedKey].length > 0) {
                      const firstItem = value[nestedKey][0];
                      // Check multiple possible product field names
                      if (
                        firstItem?.product_id ||
                        firstItem?.productId ||
                        firstItem?.target_sale_price ||
                        firstItem?.targetSalePrice ||
                        firstItem?.product_main_image_url ||
                        firstItem?.productMainImageUrl ||
                        firstItem?.shop_url ||
                        firstItem?.shopUrl ||
                        firstItem?.discount ||
                        firstItem?.discount_percentage
                      ) {
                        products = value[nestedKey];
                        logger.info(
                          `Found products in key: ${key}.${nestedKey} (${products.length} items)`
                        );
                        break;
                      }
                    }
                  }
                  if (products.length > 0) break;
                }
              }
            }

            if (products.length > 0) {
              logger.info(
                `✅ Successfully retrieved ${products.length} products using product.query`
              );
              // Log first product structure for verification
              if (products[0]) {
                logger.debug('First product structure:', {
                  keys: Object.keys(products[0]),
                  hasProductId: !!products[0].product_id,
                  hasProductTitle: !!products[0].product_title,
                  sample: JSON.stringify(products[0], null, 2).substring(0, 500),
                });
              }
              return products;
            } else {
              // Log response structure more carefully to avoid character-by-character logging
              const responseKeys = Object.keys(responseData);
              logger.warn(`Parameter combination ${i + 1} returned empty results`);
              logger.warn('Response data keys:', responseKeys);

              // Try to find products by searching all keys for product-like data
              for (const key of responseKeys) {
                const value = responseData[key];
                if (value && typeof value === 'object') {
                  // Check if this key contains product data
                  const valueKeys = Object.keys(value);
                  if (
                    valueKeys.some(
                      (k) => k.includes('product') || k.includes('result') || k.includes('list')
                    )
                  ) {
                    logger.info(`Found potential product container in key: ${key}`, {
                      subKeys: valueKeys.slice(0, 10), // First 10 keys
                    });

                    // Try to extract products from this container
                    if (Array.isArray(value)) {
                      if (value.length > 0 && (value[0]?.product_id || value[0]?.productId)) {
                        products = value;
                        logger.info(`✅ Found ${products.length} products in array at key: ${key}`);
                        break;
                      }
                    } else {
                      // Check nested arrays and objects
                      for (const subKey of valueKeys) {
                        const subValue = value[subKey];

                        // Check if it's an array
                        if (Array.isArray(subValue) && subValue.length > 0) {
                          const firstItem = subValue[0];
                          if (
                            firstItem?.product_id ||
                            firstItem?.productId ||
                            firstItem?.target_sale_price ||
                            firstItem?.targetSalePrice ||
                            firstItem?.product_main_image_url ||
                            firstItem?.productMainImageUrl
                          ) {
                            products = subValue;
                            logger.info(`✅ Found ${products.length} products in ${key}.${subKey}`);
                            break;
                          }
                        }
                        // Check if it's an object that might contain products
                        else if (
                          subValue &&
                          typeof subValue === 'object' &&
                          !Array.isArray(subValue)
                        ) {
                          // Check for nested product arrays
                          if (
                            subValue.products &&
                            Array.isArray(subValue.products) &&
                            subValue.products.length > 0
                          ) {
                            if (
                              subValue.products[0]?.product_id ||
                              subValue.products[0]?.target_sale_price
                            ) {
                              products = subValue.products;
                              logger.info(
                                `✅ Found ${products.length} products in ${key}.${subKey}.products`
                              );
                              break;
                            }
                          }
                          if (
                            subValue.product &&
                            Array.isArray(subValue.product) &&
                            subValue.product.length > 0
                          ) {
                            if (
                              subValue.product[0]?.product_id ||
                              subValue.product[0]?.target_sale_price
                            ) {
                              products = subValue.product;
                              logger.info(
                                `✅ Found ${products.length} products in ${key}.${subKey}.product`
                              );
                              break;
                            }
                          }
                        }
                      }
                      if (products.length > 0) break;
                    }
                  }
                }
              }

              if (products.length > 0) {
                logger.info(
                  `✅ Successfully retrieved ${products.length} products using product.query (found in deep search)`
                );
                if (products[0]) {
                  logger.debug('First product structure:', {
                    keys: Object.keys(products[0]).slice(0, 20), // First 20 keys
                    hasProductId: !!products[0].product_id,
                    hasTargetSalePrice: !!products[0].target_sale_price,
                  });
                }
                return products;
              }

              // If still no products, try next parameter combination
              logger.warn('No products found in any structure, trying next combination...');
              continue;
            }
          } else {
            logger.warn(`Parameter combination ${i + 1}: No response data found`);
            continue; // Try next combination
          }
        } catch (error: any) {
          // If this combination fails, try next one
          logger.warn(`Parameter combination ${i + 1} failed: ${error.message}`);
          if (i < paramCombinations.length - 1) {
            logger.info('Trying next parameter combination...');
            continue;
          }
          // Last combination failed, will try alternative methods below
        }
      }

      // If all parameter combinations failed, try alternative methods
      logger.warn(`All parameter combinations failed, trying alternative methods...`);

      // Use the first parameter combination for alternative methods
      const fallbackParams = paramCombinations[0];

      // Fallback methods
      const alternativeMethods = [
        'aliexpress.affiliate.productsearch.query',
        'aliexpress.affiliate.product.get',
      ];

      for (const method of alternativeMethods) {
        try {
          logger.info(`Trying alternative method: ${method}`);
          const response = await this.makeRequest(method, fallbackParams);

          // Try to extract products from response
          const responseKeys = Object.keys(response);
          for (const key of responseKeys) {
            if (key.includes('response') && response[key]) {
              const responseData = response[key];

              // Try different product locations
              const products =
                responseData?.products?.product ||
                responseData?.product_list?.product ||
                responseData?.aeop_ae_product_display_dto_list?.aeop_ae_product_display_dto ||
                (Array.isArray(responseData?.products) ? responseData.products : null);

              if (products) {
                const productList = Array.isArray(products) ? products : [products];
                logger.info(
                  `✅ Successfully retrieved ${productList.length} products using ${method}`
                );
                return productList;
              }
            }
          }
        } catch (altError: any) {
          logger.debug(`Alternative method ${method} failed: ${altError.message}`);
          continue;
        }
      }

      logger.warn('All search methods failed, returning empty array');
      return [];
    } catch (error) {
      logger.error('Error searching products:', error);
      return [];
    }
  }

  /**
   * Get hot products (viral products) - Advanced API
   * API: aliexpress.affiliate.hotproduct.query
   *
   * @param options - Query options
   * @returns Array of hot products
   */
  async getHotProducts(
    options: {
      categoryIds?: string | string[]; // List of category IDs (comma-separated string or array)
      keywords?: string; // Filter products by keywords
      minSalePrice?: number; // Minimum price in cents
      maxSalePrice?: number; // Maximum price in cents
      pageNo?: number;
      pageSize?: number; // 1-50
      sort?: 'SALE_PRICE_ASC' | 'SALE_PRICE_DESC' | 'LAST_VOLUME_ASC' | 'LAST_VOLUME_DESC';
      targetCurrency?: string; // USD, BRL, etc.
      targetLanguage?: string; // EN, PT, etc.
      shipToCountry?: string; // US, BR, etc.
      platformProductType?: 'ALL' | 'PLAZA' | 'TMALL';
      deliveryDays?: '3' | '5' | '7' | '10'; // Estimated delivery days
      promotionName?: string; // Promotion name
      fields?: string; // e.g., "commission_rate,sale_price"
    } = {}
  ): Promise<AliExpressProduct[]> {
    try {
      const config = this.getConfig();

      const params: Record<string, any> = {
        page_no: (options.pageNo || 1).toString(),
        page_size: Math.min(Math.max(options.pageSize || 20, 1), 50).toString(),
        tracking_id: config.trackingId || 'default',
        target_currency: options.targetCurrency || 'BRL',
        target_language: options.targetLanguage || 'PT',
        ship_to_country: options.shipToCountry || 'BR',
        platform_product_type: options.platformProductType || 'ALL',
      };

      // Add optional parameters
      if (options.categoryIds) {
        params.category_ids = Array.isArray(options.categoryIds)
          ? options.categoryIds.join(',')
          : options.categoryIds;
      }
      if (options.keywords) {
        params.keywords = options.keywords;
      }
      if (options.minSalePrice !== undefined) {
        params.min_sale_price = options.minSalePrice.toString();
      }
      if (options.maxSalePrice !== undefined) {
        params.max_sale_price = options.maxSalePrice.toString();
      }
      if (options.sort) {
        params.sort = options.sort;
      }
      if (options.deliveryDays) {
        params.delivery_days = options.deliveryDays;
      }
      if (options.promotionName) {
        params.promotion_name = options.promotionName;
      }
      if (options.fields) {
        params.fields = options.fields;
      }

      logger.info('Fetching hot products with Advanced API', {
        categoryIds: params.category_ids,
        keywords: params.keywords,
        pageNo: params.page_no,
        pageSize: params.page_size,
        sort: params.sort,
        targetCurrency: params.target_currency,
      });

      const response = await this.makeRequest('aliexpress.affiliate.hotproduct.query', params);

      // Try multiple response structures
      let products: any[] = [];

      // Structure 1: aliexpress_affiliate_hotproduct_query_response.resp_result.result.products
      if (response.aliexpress_affiliate_hotproduct_query_response?.resp_result?.result?.products) {
        const resultProducts =
          response.aliexpress_affiliate_hotproduct_query_response.resp_result.result.products;
        products = Array.isArray(resultProducts)
          ? resultProducts
          : resultProducts.product
            ? Array.isArray(resultProducts.product)
              ? resultProducts.product
              : [resultProducts.product]
            : [];
      }
      // Structure 2: aliexpress_affiliate_hotproduct_query_response.aeop_ae_product_display_dto_list
      else if (
        response.aliexpress_affiliate_hotproduct_query_response?.aeop_ae_product_display_dto_list
          ?.aeop_ae_product_display_dto
      ) {
        products = Array.isArray(
          response.aliexpress_affiliate_hotproduct_query_response.aeop_ae_product_display_dto_list
            .aeop_ae_product_display_dto
        )
          ? response.aliexpress_affiliate_hotproduct_query_response.aeop_ae_product_display_dto_list
            .aeop_ae_product_display_dto
          : [
            response.aliexpress_affiliate_hotproduct_query_response
              .aeop_ae_product_display_dto_list.aeop_ae_product_display_dto,
          ];
      }
      // Structure 3: Direct products array
      else if (response.aliexpress_affiliate_hotproduct_query_response?.products) {
        const responseProducts = response.aliexpress_affiliate_hotproduct_query_response.products;
        products = Array.isArray(responseProducts)
          ? responseProducts
          : responseProducts.product
            ? Array.isArray(responseProducts.product)
              ? responseProducts.product
              : [responseProducts.product]
            : [];
      }

      logger.info(`✅ Retrieved ${products.length} hot products from Advanced API`);
      return products;
    } catch (error: any) {
      // If permission denied or method not available, try alternative search
      if (
        error.message?.includes('InsufficientPermission') ||
        error.message?.includes('InvalidApiPath') ||
        error.message?.includes('InvalidApi')
      ) {
        logger.warn(
          '⚠️ Hot products Advanced API not available yet (may need time to activate), falling back to featured promo products'
        );
        // Try featured promo products instead
        try {
          const featuredResult = await this.getFeaturedPromoProducts({
            promotionName: 'Hot Product',
            pageNo: 1,
            pageSize: options.pageSize || 20,
            targetCurrency: options.targetCurrency || 'BRL',
            targetLanguage: options.targetLanguage || 'PT',
            country: options.shipToCountry || 'BR',
            sort: 'volumeDesc',
          });
          return featuredResult.products;
        } catch (fallbackError) {
          logger.warn('Featured promo also failed, using basic product search');
          const keywords = options.keywords || (options.categoryIds ? 'electronics' : 'hot deals');
          return await this.searchProducts(keywords, options.pageSize || 20);
        }
      }

      logger.error('Error fetching hot products:', error);
      return [];
    }
  }

  /**
   * Get flash deals (lightning deals)
   * Falls back to searchProducts if flashdeal.query is not available
   */
  async getFlashDeals(pageSize: number = 20): Promise<AliExpressProduct[]> {
    try {
      const config = this.getConfig();

      const params: Record<string, any> = {
        page_size: pageSize.toString(),
        page_no: '1',
        tracking_id: config.trackingId || 'default',
        target_currency: 'BRL',
        target_language: 'EN',
        ship_to_country: 'US',
        platform_product_type: 'ALL',
      };

      // Try flashdeal.query first
      try {
        const response = await this.makeRequest('aliexpress.affiliate.flashdeal.query', params);

        if (
          response.aliexpress_affiliate_flashdeal_query_response?.aeop_ae_product_display_dto_list
            ?.aeop_ae_product_display_dto
        ) {
          return response.aliexpress_affiliate_flashdeal_query_response
            .aeop_ae_product_display_dto_list.aeop_ae_product_display_dto;
        }
      } catch (error: any) {
        // If method doesn't exist, try alternative methods
        if (error.message?.includes('InvalidApiPath')) {
          logger.warn('Flash deal method not available, trying alternative methods');

          // Try alternative method names
          const alternativeMethods = [
            'aliexpress.affiliate.flashdeal.get',
            'aliexpress.affiliate.deal.query',
            'aliexpress.affiliate.promotion.query',
          ];

          for (const method of alternativeMethods) {
            try {
              logger.info(`Trying alternative flash deal method: ${method}`);
              const response = await this.makeRequest(method, params);

              // Try to extract products from response
              const responseKeys = Object.keys(response);
              for (const key of responseKeys) {
                if (key.includes('response') && response[key]) {
                  const products =
                    response[key]?.products ||
                    response[key]?.product_list ||
                    response[key]?.aeop_ae_product_display_dto_list;
                  if (products) {
                    const productList =
                      products.product || products.aeop_ae_product_display_dto || products;
                    return Array.isArray(productList) ? productList : [productList];
                  }
                }
              }
            } catch (altError) {
              logger.debug(`Alternative method ${method} failed`);
              continue;
            }
          }

          // Final fallback: use product search with "flash deal" keywords
          logger.warn('All flash deal methods failed, falling back to product search');
          return await this.searchProducts('flash deal discount', pageSize);
        }

        throw error; // Re-throw if it's a different error
      }

      return [];
    } catch (error) {
      logger.error('Error fetching flash deals:', error);
      // Final fallback
      return await this.searchProducts('flash deal', pageSize);
    }
  }

  /**
   * Get featured promo products with pagination
   * API: aliexpress.affiliate.featuredpromo.products.get
   *
   * @param options - Query options
   * @returns Object with products array and pagination info
   */
  async getFeaturedPromoProducts(
    options: {
      promotionName?: string; // e.g., "Hot Product", "New Arrival", "Best Seller", "weeklydeals"
      categoryId?: string;
      pageNo?: number;
      pageSize?: number; // 1-50
      sort?: string; // commissionAsc, commissionDesc, priceAsc, priceDesc, volumeAsc, volumeDesc, discountAsc, discountDesc, ratingAsc, ratingDesc, promotionTimeAsc, promotionTimeDesc
      targetCurrency?: string; // USD, BRL, etc.
      targetLanguage?: string; // EN, PT, etc.
      country?: string; // Ship to country
      promotionStartTime?: string; // PST time format: "2020-02-17 00:00:00"
      promotionEndTime?: string; // PST time format: "2020-02-12 00:00:00"
      fields?: string; // e.g., "commission_rate,sale_price"
    } = {}
  ): Promise<{
    products: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalRecords: number;
      currentRecordCount: number;
      isFinished: boolean;
    };
  }> {
    try {
      const config = this.getConfig();

      const params: Record<string, any> = {
        page_no: (options.pageNo || 1).toString(),
        page_size: Math.min(Math.max(options.pageSize || 50, 1), 50).toString(), // Limit 1-50
        target_currency: options.targetCurrency || 'BRL',
        target_language: options.targetLanguage || 'PT',
        tracking_id: config.trackingId || '',
      };

      // Add optional parameters
      if (options.promotionName) {
        params.promotion_name = options.promotionName;
      }
      if (options.categoryId) {
        params.category_id = options.categoryId;
      }
      if (options.sort) {
        params.sort = options.sort;
      }
      if (options.country) {
        params.country = options.country;
      }
      if (options.promotionStartTime) {
        params.promotion_start_time = options.promotionStartTime;
      }
      if (options.promotionEndTime) {
        params.promotion_end_time = options.promotionEndTime;
      }
      if (options.fields) {
        params.fields = options.fields;
      }

      logger.debug(`Making request to featuredpromo API with params:`, {
        pageNo: params.page_no,
        pageSize: params.page_size,
        promotionName: params.promotion_name,
        targetCurrency: params.target_currency,
      });

      const response = await this.makeRequest(
        'aliexpress.affiliate.featuredpromo.products.get',
        params
      );

      logger.debug('Raw API response keys:', Object.keys(response).slice(0, 10));

      // Parse response structure - try multiple possible response keys
      const responseKey =
        Object.keys(response).find(
          (key) => key.includes('featuredpromo') && key.includes('response')
        ) || Object.keys(response).find((key) => key.includes('response'));

      logger.debug('Found response key:', responseKey);

      let result: any = null;

      // Try different response structures
      if (responseKey) {
        // Structure 1: aliexpress_affiliate_featuredpromo_products_get_response.resp_result.result
        if (response[responseKey]?.resp_result?.result) {
          result = response[responseKey].resp_result.result;
        }
        // Structure 2: Direct resp_result at root level
        else if (response.resp_result?.result) {
          result = response.resp_result.result;
        }
        // Structure 3: Direct result
        else if (response[responseKey]?.result) {
          result = response[responseKey].result;
        }
      } else if (response.resp_result?.result) {
        result = response.resp_result.result;
      } else if (response.result) {
        result = response.result;
      }

      if (result) {
        const products = result.products || [];
        // Handle both array and object with product property
        let productList: any[] = [];
        if (Array.isArray(products)) {
          productList = products;
        } else if (products.product) {
          productList = Array.isArray(products.product) ? products.product : [products.product];
        }

        // Parse pagination info - handle both string and number formats
        const currentPage = parseInt(
          String(result.current_page_no || result.currentPage || options.pageNo || '1'),
          10
        );
        const totalPages = parseInt(String(result.total_page_no || result.totalPages || '1'), 10);
        const totalRecords = parseInt(
          String(result.total_record_count || result.totalRecords || '0'),
          10
        );
        const currentRecordCount = parseInt(
          String(
            result.current_record_count ||
            result.currentRecordCount ||
            String(productList.length) ||
            '0'
          ),
          10
        );
        const isFinished =
          result.is_finished === 'true' ||
          result.is_finished === true ||
          result.isFinished === true ||
          currentPage >= totalPages;

        logger.info('📄 Parsed pagination info:', {
          currentPage,
          totalPages,
          totalRecords,
          currentRecordCount,
          isFinished,
          productsCount: productList.length,
          rawCurrentPage: result.current_page_no || result.currentPage,
          rawTotalPages: result.total_page_no || result.totalPages,
          rawIsFinished: result.is_finished,
        });

        return {
          products: productList,
          pagination: {
            currentPage,
            totalPages,
            totalRecords,
            currentRecordCount,
            isFinished,
          },
        };
      }

      logger.warn('Unexpected response structure from featuredpromo.products.get');
      logger.debug('Response keys:', Object.keys(response).slice(0, 10));
      logger.debug('Full response structure:', JSON.stringify(response, null, 2).substring(0, 500));
      return {
        products: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          currentRecordCount: 0,
          isFinished: true,
        },
      };
    } catch (error: any) {
      logger.error('Error fetching featured promo products:', error);
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack?.substring(0, 200),
      });
      return {
        products: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          currentRecordCount: 0,
          isFinished: true,
        },
      };
    }
  }

  /**
   * Get product details - Advanced API
   * API: aliexpress.affiliate.productdetail.get
   *
   * @param productIds - Product IDs (comma-separated string or array)
   * @param options - Query options
   * @returns Array of product details
   */
  async getProductDetails(
    productIds: string | string[],
    options: {
      fields?: string; // e.g., "commission_rate,sale_price"
      targetCurrency?: string; // USD, BRL, etc.
      targetLanguage?: string; // EN, PT, etc.
      country?: string; // Ship to country
      trackingId?: string; // Your tracking ID
    } = {}
  ): Promise<any[]> {
    try {
      const config = this.getConfig();

      const productIdsStr = Array.isArray(productIds) ? productIds.join(',') : productIds;

      const params: Record<string, any> = {
        product_ids: productIdsStr,
        target_currency: options.targetCurrency || 'BRL',
        target_language: options.targetLanguage || 'PT',
        tracking_id: options.trackingId || config.trackingId || 'default',
      };

      if (options.fields) {
        params.fields = options.fields;
      }
      if (options.country) {
        params.country = options.country;
      }

      logger.info('Fetching product details with Advanced API', {
        productIds: productIdsStr,
        targetCurrency: params.target_currency,
        targetLanguage: params.target_language,
      });

      const response = await this.makeRequest('aliexpress.affiliate.productdetail.get', params);

      // Try multiple response structures
      let products: any[] = [];

      // Structure 1: aliexpress_affiliate_productdetail_get_response.resp_result.result.products
      if (response.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products) {
        const resultProducts =
          response.aliexpress_affiliate_productdetail_get_response.resp_result.result.products;
        products = Array.isArray(resultProducts)
          ? resultProducts
          : resultProducts.product
            ? Array.isArray(resultProducts.product)
              ? resultProducts.product
              : [resultProducts.product]
            : [];
      }
      // Structure 2: Direct products array
      else if (response.aliexpress_affiliate_productdetail_get_response?.products) {
        const responseProducts = response.aliexpress_affiliate_productdetail_get_response.products;
        products = Array.isArray(responseProducts)
          ? responseProducts
          : responseProducts.product
            ? Array.isArray(responseProducts.product)
              ? responseProducts.product
              : [responseProducts.product]
            : [];
      }
      // Structure 3: Direct result
      else if (response.aliexpress_affiliate_productdetail_get_response?.result?.products) {
        const resultProducts =
          response.aliexpress_affiliate_productdetail_get_response.result.products;
        products = Array.isArray(resultProducts)
          ? resultProducts
          : resultProducts.product
            ? Array.isArray(resultProducts.product)
              ? resultProducts.product
              : [resultProducts.product]
            : [];
      }

      logger.info(`✅ Retrieved details for ${products.length} products from Advanced API`);
      return products;
    } catch (error: any) {
      // If API not available, log warning but don't fail completely
      if (
        error.message?.includes('InvalidApiPath') ||
        error.message?.includes('InvalidApi') ||
        error.message?.includes('InsufficientPermission')
      ) {
        logger.warn(
          '⚠️ Product details Advanced API not available yet (may need time to activate after approval)'
        );
        logger.warn('💡 This API may take some time to become active after Advanced API approval');
        return [];
      }
      logger.error('Error fetching product details:', error);
      return [];
    }
  }

  /**
   * Smart match products - Advanced API
   * API: aliexpress.affiliate.product.smartmatch
   *
   * @param options - Query options
   * @returns Array of matched products
   */
  async smartMatchProducts(
    options: {
      productId?: string; // Reference product ID
      keywords?: string; // Search keywords
      pageNo?: number;
      targetCurrency?: string; // USD, BRL, etc.
      targetLanguage?: string; // EN, PT, etc.
      country?: string; // Ship to country
      site?: string; // Site identifier
      user?: string; // User identifier
      app?: string; // App identifier
      device?: string; // Device type
      deviceId?: string; // Device ID
      fields?: string; // e.g., "app_sale_price,shop_id"
      trackingId?: string; // Your tracking ID
    } = {}
  ): Promise<AliExpressProduct[]> {
    try {
      const config = this.getConfig();

      const params: Record<string, any> = {
        page_no: (options.pageNo || 1).toString(),
        target_currency: options.targetCurrency || 'BRL',
        target_language: options.targetLanguage || 'PT',
        tracking_id: options.trackingId || config.trackingId || 'default',
      };

      // Add optional parameters
      if (options.productId) {
        params.product_id = options.productId;
      }
      if (options.keywords) {
        params.keywords = options.keywords;
      }
      if (options.country) {
        params.country = options.country;
      }
      if (options.site) {
        params.site = options.site;
      }
      if (options.user) {
        params.user = options.user;
      }
      if (options.app) {
        params.app = options.app;
      }
      if (options.device) {
        params.device = options.device;
      }
      if (options.deviceId) {
        params.device_id = options.deviceId;
      }
      if (options.fields) {
        params.fields = options.fields;
      }

      logger.info('Fetching smart match products with Advanced API', {
        productId: params.product_id,
        keywords: params.keywords,
        pageNo: params.page_no,
        targetCurrency: params.target_currency,
      });

      const response = await this.makeRequest('aliexpress.affiliate.product.smartmatch', params);

      // Try multiple response structures
      let products: any[] = [];

      // Structure 1: aliexpress_affiliate_product_smartmatch_response.resp_result.result.products
      if (
        response.aliexpress_affiliate_product_smartmatch_response?.resp_result?.result?.products
      ) {
        const resultProducts =
          response.aliexpress_affiliate_product_smartmatch_response.resp_result.result.products;
        products = Array.isArray(resultProducts)
          ? resultProducts
          : resultProducts.product
            ? Array.isArray(resultProducts.product)
              ? resultProducts.product
              : [resultProducts.product]
            : [];
      }
      // Structure 2: Direct products array
      else if (response.aliexpress_affiliate_product_smartmatch_response?.products) {
        const responseProducts = response.aliexpress_affiliate_product_smartmatch_response.products;
        products = Array.isArray(responseProducts)
          ? responseProducts
          : responseProducts.product
            ? Array.isArray(responseProducts.product)
              ? responseProducts.product
              : [responseProducts.product]
            : [];
      }

      logger.info(`✅ Retrieved ${products.length} smart match products from Advanced API`);
      return products;
    } catch (error: any) {
      // If API not available, log warning but don't fail completely
      if (
        error.message?.includes('InvalidApiPath') ||
        error.message?.includes('InvalidApi') ||
        error.message?.includes('InsufficientPermission')
      ) {
        logger.warn(
          '⚠️ Smart match Advanced API not available yet (may need time to activate after approval)'
        );
        logger.warn('💡 This API may take some time to become active after Advanced API approval');
        return [];
      }
      logger.error('Error fetching smart match products:', error);
      return [];
    }
  }

  /**
   * Get product coupons
   */
  async getProductCoupons(productId: string): Promise<any[]> {
    try {
      const params = {
        product_id: productId,
        target_currency: 'BRL',
        target_language: 'PT',
      };

      // Suppress warnings for this method - InvalidApiPath is expected as this API is not available for most apps
      const response = await this.makeRequest(
        'aliexpress.affiliate.product.coupon.query',
        params,
        true
      );

      if (response.aliexpress_affiliate_product_coupon_query_response?.coupon_list?.coupon) {
        return response.aliexpress_affiliate_product_coupon_query_response.coupon_list.coupon;
      }

      return [];
    } catch (error: any) {
      // This API endpoint is not available for this app - this is expected
      // Silently return empty array, we'll use alternative methods (promo_code_info)
      if (error.message?.includes('InvalidApiPath')) {
        // Expected error - API not available, don't log
        return [];
      }
      // Other errors - log at debug level only
      logger.debug('Error fetching coupons (expected if API not available):', error.message);
      return [];
    }
  }

  /**
   * Convert AliExpress product to Offer format
   * Handles multiple response formats from AliExpress API
   * Fetches coupons if available
   */
  async convertToOffer(product: any, category: string = 'electronics'): Promise<Offer | null> {
    try {
      // Log ALL price-related fields for debugging
      const priceFields: any = {};
      const priceFieldNames = [
        'target_sale_price',
        'target_original_price',
        'target_sale_price_currency',
        'target_original_price_currency',
        'target_currency',
        'app_sale_price',
        'target_app_sale_price',
        'app_sale_price_currency',
        'target_app_sale_price_currency',
        'sale_price',
        'original_price',
        'sale_price_currency',
        'currency',
        'product_price',
        'product_price_currency',
        'promotion_price',
        'flash_sale_price',
        'flash_original_price',
        'min_price',
        'max_price',
        'min_original_price',
        'max_original_price',
        'discount',
        'discount_percentage',
        'promotion_price_currency',
      ];

      priceFieldNames.forEach((field) => {
        if (product[field] !== undefined && product[field] !== null) {
          priceFields[field] = product[field];
        }
      });

      logger.info('🔍 ALL PRICE FIELDS from API:', {
        productId: product.product_id || product.productId,
        productTitle: (product.product_title || product.title || '').substring(0, 50),
        priceFields,
      });

      // Extract price - try multiple possible field names
      // Priority: target_sale_price (newest API format) > app_sale_price > sale_price > product_price
      let currentPrice = 0;
      let originalPrice = 0;
      let currency = 'USD';

      // Check for promotional/flash sale prices FIRST (these are usually the best deals)
      // Format 0: Promotion/Flash Sale prices (highest priority for best deals)
      if (product.promotion_price && this.safeParseFloat(product.promotion_price) > 0) {
        currentPrice = this.safeParseFloat(product.promotion_price);
        originalPrice = product.promotion_original_price
          ? this.safeParseFloat(product.promotion_original_price, currentPrice)
          : product.target_original_price
            ? this.safeParseFloat(product.target_original_price, currentPrice)
            : currentPrice;
        currency = product.promotion_price_currency || product.target_currency || 'USD';
        logger.info('🎯 Using PROMOTION_PRICE (flash sale/promotional price)', {
          productId: product.product_id || product.productId,
          promotion_price: product.promotion_price,
          promotion_original_price: product.promotion_original_price,
          currentPrice,
          originalPrice,
          currency,
        });
      }
      // Format 0.5: Flash sale prices
      else if (product.flash_sale_price && this.safeParseFloat(product.flash_sale_price) > 0) {
        currentPrice = this.safeParseFloat(product.flash_sale_price);
        originalPrice = product.flash_original_price
          ? this.safeParseFloat(product.flash_original_price, currentPrice)
          : product.target_original_price
            ? this.safeParseFloat(product.target_original_price, currentPrice)
            : currentPrice;
        currency = product.flash_sale_price_currency || product.target_currency || 'USD';
        logger.info('⚡ Using FLASH_SALE_PRICE', {
          productId: product.product_id || product.productId,
          flash_sale_price: product.flash_sale_price,
          flash_original_price: product.flash_original_price,
          currentPrice,
          originalPrice,
          currency,
        });
      }
      // Format 1: target_sale_price (newest format from API - already in target currency)
      // This should be checked FIRST as it's the most accurate
      else if (product.target_sale_price) {
        currentPrice = this.safeParseFloat(product.target_sale_price);
        // Try target_original_price first (already in target currency) - this is the correct field
        if (product.target_original_price) {
          originalPrice = this.safeParseFloat(product.target_original_price, currentPrice);
        }
        // Fallback to original_price (may be in USD)
        else if (product.original_price) {
          originalPrice = this.safeParseFloat(product.original_price, currentPrice);
        } else {
          originalPrice = currentPrice;
        }

        // IMPORTANT: Check currency - if target_currency was used in API call, prices are already in that currency
        // Priority: target_sale_price_currency > target_original_price_currency > target_currency
        const detectedCurrency =
          product.target_sale_price_currency ||
          product.target_original_price_currency ||
          product.target_currency ||
          'USD';

        currency = detectedCurrency;

        // Log price extraction for debugging
        logger.info('💰 Extracted prices from target_sale_price format', {
          productId: product.product_id || product.productId,
          target_sale_price: product.target_sale_price,
          target_original_price: product.target_original_price,
          original_price: product.original_price,
          target_sale_price_currency: product.target_sale_price_currency,
          target_original_price_currency: product.target_original_price_currency,
          target_currency: product.target_currency,
          detectedCurrency,
          currentPrice,
          originalPrice,
          currency,
          discount: product.discount,
        });

        // If currency is already BRL, don't convert again
        if (currency === 'BRL' || currency === 'brl') {
          // Prices are already in BRL, no conversion needed
          logger.info('✅ Prices already in BRL from API - no conversion needed', {
            currentPrice,
            originalPrice,
            target_sale_price: product.target_sale_price,
            target_original_price: product.target_original_price,
            detectedCurrency,
          });
        }
      }
      // Format 2: app_sale_price (app-specific price)
      else if (product.app_sale_price) {
        currentPrice = this.safeParseFloat(product.app_sale_price);
        // Try target_app_sale_price for original price
        if (product.target_app_sale_price) {
          originalPrice = this.safeParseFloat(product.target_app_sale_price, currentPrice);
        } else if (product.original_price) {
          originalPrice = this.safeParseFloat(product.original_price, currentPrice);
        } else {
          originalPrice = currentPrice;
        }
        currency =
          product.target_app_sale_price_currency || product.app_sale_price_currency || 'USD';
      }
      // Format 3: sale_price (standard price)
      else if (product.sale_price) {
        currentPrice = this.safeParseFloat(product.sale_price);
        originalPrice = product.original_price
          ? this.safeParseFloat(product.original_price, currentPrice)
          : currentPrice;
        currency = product.sale_price_currency || product.currency || 'USD';
      }
      // Format 4: product_price.value (old format)
      else if (product.product_price?.value) {
        currentPrice = this.safeParseFloat(product.product_price.value);
        originalPrice = product.original_price?.value
          ? this.safeParseFloat(product.original_price.value, currentPrice)
          : currentPrice;
        currency = product.product_price.currency || product.target_currency || 'USD';
      } else {
        logger.warn('Could not extract price from product:', {
          productId: product.product_id || product.productId,
          availableKeys: Object.keys(product).slice(0, 20),
        });
        return null;
      }

      // Validate prices are valid numbers
      if (isNaN(currentPrice) || isNaN(originalPrice) || currentPrice <= 0 || originalPrice <= 0) {
        logger.warn('Invalid price values in product:', {
          productId: product.product_id || product.productId,
          currentPrice,
          originalPrice,
        });
        return null;
      }

      // Ensure originalPrice >= currentPrice
      if (originalPrice < currentPrice) {
        originalPrice = currentPrice;
      }

      // Convert USD to BRL if currency is USD (only if not already converted)
      // IMPORTANT: Only convert if currency is explicitly USD
      if (currency === 'USD' || currency === 'usd') {
        const exchangeRate = await this.getExchangeRate();
        const originalPriceUSD = originalPrice;
        const currentPriceUSD = currentPrice;

        // Validate exchange rate is reasonable (between 3.0 and 7.0)
        if (exchangeRate < 3.0 || exchangeRate > 7.0) {
          logger.warn('⚠️ Exchange rate seems incorrect, using default 5.0', {
            exchangeRate,
            productId: product.product_id || product.productId,
          });
          // Use default rate
          const defaultRate = 5.0;
          currentPrice = Math.round(currentPrice * defaultRate * 100) / 100;
          originalPrice = Math.round(originalPrice * defaultRate * 100) / 100;
        } else {
          currentPrice = await this.convertToBRL(currentPrice);
          originalPrice = await this.convertToBRL(originalPrice);
        }

        currency = 'BRL';

        logger.info('💱 Converted prices from USD to BRL', {
          exchangeRate,
          originalPriceUSD,
          currentPriceUSD,
          originalPriceBRL: originalPrice,
          currentPriceBRL: currentPrice,
          productId: product.product_id || product.productId,
        });
      } else if (currency === 'BRL' || currency === 'brl') {
        // Prices already in BRL - log for verification
        logger.debug('✅ Prices already in BRL - no conversion needed', {
          currentPrice,
          originalPrice,
          currency,
          productId: product.product_id || product.productId,
        });
      }

      // Calculate discount
      let discount = originalPrice - currentPrice;
      let discountPercentage = originalPrice > 0 ? (discount / originalPrice) * 100 : 0;

      // If discount percentage is already provided in the API response, validate it
      // The API may provide discount as "30%" or "30"
      if (product.discount) {
        const discountStr = String(product.discount).replace('%', '').trim();
        const discountValue = this.safeParseFloat(discountStr);
        if (discountValue > 0 && discountValue <= 100) {
          const calculatedDiscountPercentage = discountPercentage;
          const apiDiscountPercentage = discountValue;

          // Only use API discount if it's close to calculated discount (within 5%)
          // This prevents incorrect price adjustments
          const discountDifference = Math.abs(calculatedDiscountPercentage - apiDiscountPercentage);

          if (discountDifference <= 5) {
            // API discount matches calculated discount - use it
            discountPercentage = apiDiscountPercentage;
            discount = (originalPrice * discountPercentage) / 100;

            // Only recalculate currentPrice if there's a significant difference
            const calculatedCurrentPrice = originalPrice - discount;
            const priceDifference = Math.abs(calculatedCurrentPrice - currentPrice);

            if (priceDifference > 0.1) {
              // More than 10 cents difference
              logger.debug('Adjusting current price based on discount percentage', {
                originalPrice,
                currentPrice,
                calculatedCurrentPrice,
                discountPercentage,
                priceDifference,
                productId: product.product_id || product.productId,
              });
              currentPrice = calculatedCurrentPrice;
            }
          } else {
            // API discount doesn't match - log warning and use calculated discount
            logger.warn('⚠️ API discount percentage differs from calculated discount', {
              calculatedDiscount: calculatedDiscountPercentage,
              apiDiscount: apiDiscountPercentage,
              difference: discountDifference,
              productId: product.product_id || product.productId,
              usingCalculated: true,
            });
            // Keep calculated discount
          }
        }
      } else if (product.discount_percentage) {
        const apiDiscountPercentage = this.safeParseFloat(product.discount_percentage);
        const calculatedDiscountPercentage = discountPercentage;
        const discountDifference = Math.abs(calculatedDiscountPercentage - apiDiscountPercentage);

        if (discountDifference <= 5) {
          discountPercentage = apiDiscountPercentage;
          discount = (originalPrice * discountPercentage) / 100;
        } else {
          logger.warn('⚠️ API discount_percentage differs from calculated', {
            calculatedDiscount: calculatedDiscountPercentage,
            apiDiscount: apiDiscountPercentage,
            productId: product.product_id || product.productId,
          });
        }
      }

      // Validate discount values
      if (isNaN(discount) || isNaN(discountPercentage)) {
        logger.warn('Invalid discount values in product:', {
          productId: product.product_id || product.productId,
          discount,
          discountPercentage,
        });
        return null;
      }

      // Filter by minimum discount
      if (discountPercentage < 5) {
        return null;
      }

      // Extract rating and reviews
      const rating = product.evaluation?.star_rate
        ? this.safeParseFloat(product.evaluation.star_rate)
        : product.rating
          ? this.safeParseFloat(product.rating)
          : 0;
      const reviewsCount =
        product.evaluation?.valid_orders || product.reviews_count || product.valid_orders || 0;

      // Extract URLs - try multiple field names
      const productUrl =
        product.product_detail_url ||
        product.product_url ||
        product.url ||
        `https://www.aliexpress.com/item/${product.product_id || product.productId || ''}.html`;

      const imageUrl =
        product.product_image_url ||
        product.product_main_image_url ||
        product.main_image_url ||
        product.image_url ||
        '';

      // Generate affiliate link
      const affiliateUrl = await this.generateAffiliateLink(productUrl);

      // Extract title
      const title =
        product.product_title || product.title || product.product_name || 'Untitled Product';

      // Extract brand/shop name
      const brand = product.shop_info?.shop_name || product.shop_name || product.brand || '';

      // Try to extract coupons from multiple sources
      let coupons: string[] = [];

      // Method 1: Try API endpoint (may not be available - silently fail)
      try {
        const productId = product.product_id || product.productId;
        if (productId) {
          const couponData = await this.getProductCoupons(productId);
          if (Array.isArray(couponData) && couponData.length > 0) {
            // Extract coupon codes from the response
            const apiCoupons = couponData
              .map((coupon: any) => {
                return (
                  coupon.coupon_code ||
                  coupon.code ||
                  coupon.couponCode ||
                  coupon.promotion_code ||
                  coupon.promo_code ||
                  coupon.coupon
                );
              })
              .filter((code: any) => code && typeof code === 'string' && code.trim().length > 0);
            coupons.push(...apiCoupons);
          }
        }
      } catch (error: any) {
        // API method not available - this is expected, silently continue to alternative methods
        // The API endpoint 'aliexpress.affiliate.product.coupon.query' is not available for this app
      }

      // Method 2: Extract from promotion_link URL if available
      if (product.promotion_link) {
        try {
          const promoUrl = product.promotion_link;
          // Try to extract coupon codes from URL parameters
          const url = new URL(promoUrl);
          const couponParam =
            url.searchParams.get('coupon') ||
            url.searchParams.get('couponCode') ||
            url.searchParams.get('promoCode');
          if (couponParam) {
            coupons.push(couponParam);
          }
        } catch (error) {
          // Invalid URL, skip
        }
      }

      // Method 3: Extract from promo_code_info (from featuredpromo API)
      if (product.promo_code_info) {
        const promoCode = product.promo_code_info.promo_code;
        if (promoCode && typeof promoCode === 'string' && promoCode.trim().length > 0) {
          coupons.push(promoCode);
          logger.debug(`Found promo_code from promo_code_info: ${promoCode}`);
        }
      }

      // Method 4: Check if product has coupon fields directly
      if (product.coupon_code || product.couponCode || product.promo_code) {
        const directCoupon = product.coupon_code || product.couponCode || product.promo_code;
        if (typeof directCoupon === 'string' && directCoupon.trim().length > 0) {
          coupons.push(directCoupon);
        }
      }

      // Remove duplicates and limit
      coupons = [...new Set(coupons)].slice(0, 5);

      if (coupons.length > 0) {
        logger.info(
          `🎟️  Found ${coupons.length} coupons for product ${product.product_id || product.productId}: ${coupons.join(', ')}`
        );
      }

      // Final validation - ensure all numeric values are valid
      const finalOriginalPrice = Math.round(originalPrice * 100) / 100;
      const finalCurrentPrice = Math.round(currentPrice * 100) / 100;
      const finalDiscount = Math.round(discount * 100) / 100;
      const finalDiscountPercentage = Math.round(discountPercentage * 100) / 100;

      if (
        isNaN(finalOriginalPrice) ||
        isNaN(finalCurrentPrice) ||
        isNaN(finalDiscount) ||
        isNaN(finalDiscountPercentage)
      ) {
        logger.warn('NaN detected in final offer values:', {
          productId: product.product_id || product.productId,
          finalOriginalPrice,
          finalCurrentPrice,
          finalDiscount,
          finalDiscountPercentage,
        });
        return null;
      }

      // Ensure currency is always BRL after conversion
      // If prices were converted from USD, currency should be BRL
      const finalCurrency = currency === 'USD' || currency === 'usd' ? 'BRL' : currency;

      // Final check: if currency is not BRL but prices seem to be in BRL range, force BRL
      // (prices above 10 in BRL range are likely BRL, not USD)
      if (finalCurrency !== 'BRL' && finalCurrentPrice > 10 && finalCurrentPrice < 10000) {
        logger.warn('⚠️ Currency mismatch detected - forcing BRL', {
          productId: product.product_id || product.productId,
          detectedCurrency: finalCurrency,
          currentPrice: finalCurrentPrice,
          originalPrice: finalOriginalPrice,
          forcingBRL: true,
        });
      }

      // Use intelligent category detection
      const detectedCategory = this.categoryService.detectCategory(
        title,
        title, // Use title as description if no description available
        category
      );

      const now = new Date();
      return {
        title,
        description: title,
        originalPrice: finalOriginalPrice,
        currentPrice: finalCurrentPrice,
        discount: finalDiscount,
        discountPercentage: finalDiscountPercentage,
        currency: 'BRL', // Always use BRL for AliExpress products (prices are converted)
        imageUrl,
        productUrl,
        affiliateUrl,
        source: 'aliexpress',
        category: detectedCategory,
        rating: isNaN(rating) ? 0 : rating,
        reviewsCount: isNaN(reviewsCount) ? 0 : reviewsCount,
        brand,
        tags: [],
        coupons: coupons.length > 0 ? coupons : undefined,
        isActive: true,
        isPosted: false,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      logger.error('Error converting AliExpress product to offer:', error);
      logger.error('Product data:', {
        productId: product?.product_id || product?.productId,
        availableKeys: product ? Object.keys(product).slice(0, 20) : [],
      });
      return null;
    }
  }
}
