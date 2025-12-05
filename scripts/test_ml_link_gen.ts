import { config } from 'dotenv';
import { MercadoLivreScraper } from '../src/services/mercadolivre/MercadoLivreScraper';
import { logger } from '../src/utils/logger';

// Load env vars
config();

async function main() {
    logger.info('🧪 Testing Mercado Livre Affiliate Link Generation...');

    const scraper = new MercadoLivreScraper();
    const testUrl = 'https://www.mercadolivre.com.br/apple-iphone-13-128-gb-meia-noite/p/MLB19615335';

    try {
        logger.info(`🔗 Original URL: ${testUrl}`);

        // Check if env vars are set
        if (!process.env.MERCADOLIVRE_LINK_GENERATOR_ENDPOINT) {
            logger.warn('⚠️ MERCADOLIVRE_LINK_GENERATOR_ENDPOINT not set in .env');
        }
        if (!process.env.MERCADOLIVRE_AFFILIATE_COOKIES) {
            logger.warn('⚠️ MERCADOLIVRE_AFFILIATE_COOKIES not set in .env');
        }

        const affiliateLink = await scraper.generateAffiliateLink(testUrl);

        logger.info('✅ Result:');
        console.log(affiliateLink);

        if (affiliateLink === testUrl) {
            logger.warn('⚠️ The generated link is the same as the original (Fallback was used or generation failed).');
        } else {
            logger.info('🎉 Success! Link modified.');
        }

    } catch (error) {
        logger.error('❌ Test Failed:', error);
    } finally {
        await scraper.closeSession();
        process.exit(0);
    }
}

main();
