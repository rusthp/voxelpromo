import axios from 'axios';
import { logger } from '../../utils/logger';

/**
 * Result of link validation
 */
export interface LinkValidationResult {
    isValid: boolean;
    finalUrl: string;
    statusCode: number;
    redirectChain?: string[];
    error?: string;
}

/**
 * Options for link validation
 */
export interface LinkValidatorOptions {
    timeout?: number;        // Timeout in ms (default: 10000)
    followRedirects?: boolean; // Follow redirects (default: true)
    maxRedirects?: number;   // Max redirects to follow (default: 5)
}

/**
 * Service to validate affiliate and product links
 * Checks if links are accessible and resolves final URLs
 */
export class LinkValidator {
    private readonly defaultTimeout = 10000;
    private readonly defaultMaxRedirects = 5;

    /**
     * Validate a single link
     * Performs a HEAD request to check if the link is accessible
     */
    async validateLink(
        url: string,
        options: LinkValidatorOptions = {}
    ): Promise<LinkValidationResult> {
        const timeout = options.timeout ?? this.defaultTimeout;
        const maxRedirects = options.maxRedirects ?? this.defaultMaxRedirects;
        const followRedirects = options.followRedirects ?? true;

        if (!url || typeof url !== 'string') {
            return {
                isValid: false,
                finalUrl: url || '',
                statusCode: 0,
                error: 'Invalid URL provided',
            };
        }

        // Basic URL format validation
        try {
            new URL(url);
        } catch {
            return {
                isValid: false,
                finalUrl: url,
                statusCode: 0,
                error: 'Malformed URL',
            };
        }

        try {
            const redirectChain: string[] = [url];

            // Use HEAD request for efficiency
            const response = await axios.head(url, {
                timeout,
                maxRedirects: followRedirects ? maxRedirects : 0,
                validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });

            // Get final URL after redirects
            const finalUrl = response.request?.res?.responseUrl ||
                response.request?.responseURL ||
                url;

            // Track if we have a redirect
            if (finalUrl !== url) {
                redirectChain.push(finalUrl);
            }

            const isValid = response.status >= 200 && response.status < 400;

            logger.debug(`Link validation result for ${url.substring(0, 60)}:`, {
                status: response.status,
                isValid,
                finalUrl: finalUrl.substring(0, 60),
            });

            return {
                isValid,
                finalUrl,
                statusCode: response.status,
                redirectChain,
            };
        } catch (error: any) {
            // Handle specific error types
            let errorMessage = 'Unknown error';
            let statusCode = 0;

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                errorMessage = 'Request timeout';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'DNS lookup failed';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Connection refused';
            } else if (error.response) {
                statusCode = error.response.status;
                errorMessage = `HTTP ${statusCode}`;
            } else {
                errorMessage = error.message || 'Request failed';
            }

            logger.debug(`Link validation failed for ${url.substring(0, 60)}: ${errorMessage}`);

            return {
                isValid: false,
                finalUrl: url,
                statusCode,
                error: errorMessage,
            };
        }
    }

    /**
     * Validate multiple links in parallel
     */
    async validateLinks(
        urls: string[],
        options: LinkValidatorOptions = {}
    ): Promise<Map<string, LinkValidationResult>> {
        const results = new Map<string, LinkValidationResult>();

        // Validate in parallel with concurrency limit
        const batchSize = 5;
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(url => this.validateLink(url, options))
            );

            batch.forEach((url, index) => {
                results.set(url, batchResults[index]);
            });
        }

        return results;
    }

    /**
     * Check if a Shopee link is valid
     * Shopee-specific validation with known patterns
     */
    isValidShopeeLink(url: string): boolean {
        if (!url) return false;

        // Valid Shopee link patterns
        const validPatterns = [
            /shopee\.com\.br\/product\/\d+\/\d+/,           // Product page
            /shopee\.com\.br\/universal-link\/product/,     // Universal link
            /shope\.ee\/[a-zA-Z0-9]+/,                       // Short link
        ];

        // Invalid patterns (API endpoints, datafeed downloads)
        const invalidPatterns = [
            /affiliate\.shopee\.com\.br\/api/,
            /datafeed\/download/,
        ];

        // Check if matches any invalid pattern
        if (invalidPatterns.some(pattern => pattern.test(url))) {
            return false;
        }

        // Check if matches any valid pattern
        return validPatterns.some(pattern => pattern.test(url));
    }

    /**
     * Try to fix common Shopee link issues
     */
    fixShopeeLink(url: string, shopId?: string, itemId?: string, affiliateCode?: string): string | null {
        if (!url) return null;

        // If it's an API/datafeed link, we can't fix it without shopId/itemId
        if (url.includes('/api/') || url.includes('datafeed/download')) {
            if (shopId && itemId) {
                // Generate a proper Universal Link
                const params = affiliateCode
                    ? `?utm_source=${affiliateCode}&utm_medium=affiliate&utm_campaign=voxelpromo`
                    : '';
                return `https://shopee.com.br/universal-link/product/i/${shopId}/${itemId}${params}`;
            }
            return null; // Can't fix without product info
        }

        // If it's already a valid link, return as-is
        if (this.isValidShopeeLink(url)) {
            return url;
        }

        return null;
    }
}
