import { Offer } from '../../types';

/**
 * Network API Configuration
 * Contains the URL templates for different API operations
 */
export interface NetworkApiConfig {
  /** API endpoint for campaigns/advertisers list */
  campaigns?: string;
  /** API endpoint for coupons/promotions */
  coupons?: string;
  /** API endpoint for deeplink generation */
  deeplink?: string;
  /** API endpoint for product feeds */
  productFeed?: string;
  /** API endpoint for feed list */
  feedList?: string;
  /** API endpoint for offer search */
  offers?: string;
}

/**
 * Network metadata - credentials and settings
 */
export interface NetworkMetadata {
  /** API token for authentication */
  token?: string;
  /** Publisher/Affiliate ID */
  publisherId?: string;
  /** Data Feed API Key (for product feeds) */
  dataFeedApiKey?: string;
  /** Additional custom fields */
  [key: string]: string | undefined;
}

/**
 * Abstract base class for affiliate network APIs
 * Inspired by cmmv-blog pattern for extensibility
 */
export abstract class NetworkApiAbstract {
  protected config: NetworkApiConfig;
  protected metadata: NetworkMetadata;

  constructor(config: NetworkApiConfig, metadata: NetworkMetadata) {
    this.config = config;
    this.metadata = metadata;
  }

  /**
   * Format URL template with metadata values
   * Replaces {key} placeholders with actual values
   *
   * @example
   * formatUrl("https://api.example.com/{publisherId}/data", { publisherId: "123" })
   * // Returns: "https://api.example.com/123/data"
   */
  protected formatUrl(urlTemplate: string, extraParams?: Record<string, string>): string {
    let url = urlTemplate;
    const allParams = { ...this.metadata, ...extraParams };

    for (const [key, value] of Object.entries(allParams)) {
      if (value) {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
      }
    }

    return url;
  }

  /**
   * Get authorization headers for API requests
   * Override in subclass for network-specific auth
   */
  protected abstract getAuthHeaders(): Record<string, string>;

  /**
   * Get campaigns/advertisers from the network
   */
  abstract getCampaigns(): Promise<any[]>;

  /**
   * Get coupons/promotions from the network
   */
  abstract getCoupons(): Promise<any[]>;

  /**
   * Generate affiliate deeplink for a product URL
   * @param destinationUrl - The original product URL
   * @param advertiserId - The advertiser/merchant ID
   */
  abstract getDeeplink(destinationUrl: string, advertiserId: string): Promise<string | null>;

  /**
   * Fetch product feed (if supported by network)
   * @param advertiserId - The advertiser/merchant ID
   * @param options - Additional options (locale, format, etc)
   */
  abstract getProductFeed(advertiserId: string, options?: any): Promise<Offer[]>;

  /**
   * Check if the network is properly configured
   */
  abstract isConfigured(): boolean;

  /**
   * Test connection to the network API
   */
  abstract testConnection(): Promise<{ success: boolean; message: string; data?: any }>;

  /**
   * Resolve the shortened URL by following all redirects until reaching the final destination
   * Imported from @cmmv/affiliate pattern
   * @param shortenedUrl Initial URL to resolve
   * @param removeQueryParams Whether to remove query parameters from the final URL
   * @param maxRedirects Maximum number of redirects to follow (to prevent infinite loops)
   * @returns The final destination URL
   */
  public async resolveShortenedUrl(
    shortenedUrl: string,
    removeQueryParams: boolean = true,
    maxRedirects: number = 10
  ): Promise<string> {
    let currentUrl = shortenedUrl;

    try {
      let redirectCount = 0;
      let isRedirect = true;

      while (isRedirect && redirectCount < maxRedirects) {
        const response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
        });

        if (
          response.status === 301 ||
          response.status === 302 ||
          response.status === 303 ||
          response.status === 307
        ) {
          const redirectUrl = response.headers.get('location');

          if (!redirectUrl) {
            isRedirect = false;
          } else {
            let nextUrl = redirectUrl;

            if (redirectUrl.startsWith('/')) {
              const baseUrl = new URL(currentUrl);
              nextUrl = `${baseUrl.protocol}//${baseUrl.host}${redirectUrl}`;
            }

            currentUrl = nextUrl;
            redirectCount++;
          }
        } else if (response.status === 200) {
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
              const html = await response.text();

              // Check for meta refresh redirect
              const metaRefreshRegex =
                /<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?\d+;\s*url=([^"'>\s]+)["']/i;
              const metaMatch = html.match(metaRefreshRegex);

              if (metaMatch && metaMatch[1]) {
                let metaRedirectUrl = metaMatch[1];

                if (metaRedirectUrl.startsWith('/')) {
                  const baseUrl = new URL(currentUrl);
                  metaRedirectUrl = `${baseUrl.protocol}//${baseUrl.host}${metaRedirectUrl}`;
                } else if (!metaRedirectUrl.startsWith('http')) {
                  const baseUrl = new URL(currentUrl);
                  metaRedirectUrl = `${baseUrl.protocol}//${metaRedirectUrl}`;
                }

                currentUrl = metaRedirectUrl;
                redirectCount++;
                continue;
              }
            }

            isRedirect = false;
          } catch (error) {
            console.error('Error processing HTML content:', error);
            isRedirect = false;
          }
        } else {
          isRedirect = false;
        }
      }

      if (removeQueryParams) {
        const parsedUrl = new URL(currentUrl);
        const cleanUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
        return cleanUrl;
      }

      return currentUrl;
    } catch (error) {
      if (removeQueryParams) {
        const parsedUrl = new URL(currentUrl);
        const cleanUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
        return cleanUrl;
      }

      return currentUrl;
    }
  }
}
