import axios from 'axios';
import { logger } from '../../utils/logger';

export class LinkVerifier {
    /**
     * Checks if a URL is valid and reachable (returns 200 OK)
     * @param url The URL to check
     * @param timeout Timeout in milliseconds (default 5000)
     */
    static async verify(url: string, timeout: number = 8000): Promise<boolean> {
        if (!url || !url.startsWith('http')) {
            logger.warn(`LinkVerifier: Invalid URL format: ${url}`);
            return false;
        }

        try {
            // Check for obvious placeholders
            if (url.includes('your-affiliate-code') || url.includes('your-tracking-id')) {
                logger.warn(`LinkVerifier: URL contains placeholder text: ${url}`);
                return false;
            }

            // Mimic a real browser to avoid 403 on valid links
            const response = await axios.get(url, {
                timeout,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': 'https://www.google.com/'
                },
                validateStatus: (status) => status >= 200 && status < 400 // Accept 2xx and 3xx (though axios follows 3xx)
            });

            // Specific check for Mercado Livre pages that might return 200 but are "not found" or "paused"
            // Note: This requires reading the body, which might be heavy. 
            // We can check if final URL is different or if title indicates error if needed.
            if (url.includes('mercadolivre.com')) {
                if (response.data && typeof response.data === 'string') {
                    if (response.data.includes('O anúncio que você procura está pausado') ||
                        response.data.includes('Parece que esta página não existe')) {
                        logger.warn(`LinkVerifier: Mercado Livre product not active: ${url}`);
                        return false;
                    }
                }
            }

            return true;
        } catch (error: any) {
            logger.warn(`LinkVerifier: Validation failed for ${url}: ${error.message}`);

            // If it's a 403, it might just be bot protection but the link works for humans
            // But we should be careful. For now, assume failure if we can't access it.
            // If it's a timeout, it might be slow but valid.

            return false;
        }
    }
}
