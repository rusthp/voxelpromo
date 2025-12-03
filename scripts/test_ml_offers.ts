import { MercadoLivreService } from '../src/services/mercadolivre/MercadoLivreService';
import { logger } from '../src/utils/logger';

async function testDailyDeals() {
    logger.info('🔍 Testing Mercado Livre Daily Deals Scraping...');

    const service = new MercadoLivreService();

    try {
        logger.info('🔥 Fetching daily deals (Page 1 only)...');
        const products = await service.getDailyDeals();

        if (products.length > 0) {
            logger.info(`✅ Successfully found ${products.length} daily deals!`);

            // Log first 5 products
            logger.info('📦 Top 5 Deals:');
            products.slice(0, 5).forEach((p, index) => {
                logger.info(`${index + 1}. ${p.title}`);
                logger.info(`   💰 Price: R$ ${p.price}`);
                logger.info(`   🔗 Link: ${p.permalink}`);
                logger.info(`   🖼️ Image: ${p.thumbnail}`);
                logger.info('---');
            });
        } else {
            logger.warn('⚠️ No daily deals found. Check debug screenshot.');
        }

    } catch (error: any) {
        logger.error(`❌ Test failed: ${error.message}`);
    }
}

testDailyDeals();
