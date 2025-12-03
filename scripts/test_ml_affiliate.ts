import { MercadoLivreService } from '../src/services/mercadolivre/MercadoLivreService';
import { logger } from '../src/utils/logger';

// Mock config for testing
const mockConfig = {
    affiliateCode: 'TEST_CODE_123'
};

const mockSocialConfig = {
    affiliateCode: 'https://www.mercadolivre.com.br/social/my-store?ref=123456'
};

async function testAffiliateLinks() {
    logger.info('🔗 Testing Mercado Livre Affiliate Link Generation...');

    const service = new MercadoLivreService();

    // Test 1: Legacy Code (appending ?a=CODE)
    logger.info('Test 1: Legacy Code (MERCADOLIVRE_AFFILIATE_CODE=TEST_CODE_123)');
    // @ts-ignore - Accessing private method for testing via public wrapper or mocking config
    // Since we can't easily mock the private config without DI, we'll verify the logic by temporarily setting env var

    const originalEnv = process.env.MERCADOLIVRE_AFFILIATE_CODE;
    process.env.MERCADOLIVRE_AFFILIATE_CODE = 'TEST_CODE_123';

    const productUrl = 'https://www.mercadolivre.com.br/p/MLB123456';
    // We need to access the private method or use convertToOffer which calls it
    // Let's use convertToOffer with a mock product

    const mockProduct: any = {
        id: 'MLB123456',
        title: 'Test Product',
        price: 100,
        currency_id: 'BRL',
        permalink: productUrl,
        available_quantity: 1,
        pictures: [{ url: 'http://example.com/img.jpg' }]
    };

    const offer1 = service.convertToOffer(mockProduct);
    logger.info(`Input URL: ${productUrl}`);
    logger.info(`Output URL: ${offer1?.affiliateUrl}`);

    if (offer1?.affiliateUrl?.includes('a=TEST_CODE_123')) {
        logger.info('✅ Legacy code appended correctly');
    } else {
        logger.error('❌ Legacy code NOT appended');
    }

    // Test 2: Social Link (URL)
    logger.info('\nTest 2: Social Link (MERCADOLIVRE_AFFILIATE_CODE=https://www.mercadolivre.com.br/social/my-store?ref=123456)');
    process.env.MERCADOLIVRE_AFFILIATE_CODE = 'https://www.mercadolivre.com.br/social/my-store?ref=123456';

    const offer2 = service.convertToOffer(mockProduct);
    logger.info(`Input URL: ${productUrl}`);
    logger.info(`Output URL: ${offer2?.affiliateUrl}`);

    if (offer2?.affiliateUrl?.includes('ref=123456')) {
        logger.info('✅ Social link params copied correctly');
    } else {
        logger.error('❌ Social link params NOT copied');
    }

    // Restore env
    process.env.MERCADOLIVRE_AFFILIATE_CODE = originalEnv;
}

testAffiliateLinks();
