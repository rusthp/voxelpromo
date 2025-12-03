import { MercadoLivreService } from '../src/services/mercadolivre/MercadoLivreService';
import { logger } from '../src/utils/logger';

async function testSocialLink() {
    logger.info('🔗 Testing Mercado Livre Social Link Integration...');

    const service = new MercadoLivreService();

    // Simulate the user's Social Link in the environment variable
    const socialLink = 'https://www.mercadolivre.com.br/social/ally_f?matt_word=voxelpromo&matt_tool=71361504&forceInApp=true&ref=BO00VBY9VXTDiLLcnicrb10w8ZsAlihQ6WaDXPJiGN4MOBZ5XbOXvY2KR9%2Bgbye%2B0LfalLuGEhON%2F%2BnfV3VFj9N8%2F9auSDPONh20tNSnj29uG3pXMch43kYOytV4g%2BDQueOzfKKgK7IFeb6jchpKWygU2l9s85dhdiLViKGuBRF9ecCDKSIEShUywKG3ctUukR6Ahl4%3D';

    // We don't need to set process.env here if the user already set it in .env
    // But for safety in this test script, we can force it to verify the logic itself
    // However, since we fixed the code to prefer process.env, let's rely on the loaded env or fallback to this string for the test logic verification

    // Actually, let's force it for the test to ensure we are testing the logic with the KNOWN link
    const originalEnv = process.env.MERCADOLIVRE_AFFILIATE_CODE;
    process.env.MERCADOLIVRE_AFFILIATE_CODE = socialLink;

    logger.info(`📝 Configured Affiliate Code: ${socialLink.substring(0, 60)}...`);

    const mockProduct: any = {
        id: 'MLB19592785', // Real product (Whey Protein)
        title: 'Suplemento Tasty Whey 3w Gourmet',
        price: 228,
        currency_id: 'BRL',
        permalink: 'https://www.mercadolivre.com.br/p/MLB19592785',
        available_quantity: 1,
        pictures: [{ url: 'http://example.com/img.jpg' }]
    };

    const offer = service.convertToOffer(mockProduct);
    const generatedUrl = offer?.affiliateUrl;

    logger.info(`📦 Input Product URL: ${mockProduct.permalink}`);
    logger.info(`🔗 Generated Affiliate URL: ${generatedUrl}`);

    // Verification
    let success = true;

    if (!generatedUrl?.includes('matt_word=voxelpromo')) {
        logger.error('❌ Missing matt_word parameter');
        success = false;
    }

    if (!generatedUrl?.includes('matt_tool=71361504')) {
        logger.error('❌ Missing matt_tool parameter');
        success = false;
    }

    if (!generatedUrl?.includes('forceInApp=true')) {
        logger.error('❌ Missing forceInApp parameter');
        success = false;
    }

    if (generatedUrl?.includes('ref=')) {
        logger.warn('⚠️ URL contains "ref" parameter (should be stripped as it is specific to the original link)');
    }

    if (success) {
        logger.info('✅ SUCCESS: All tracking parameters were correctly extracted and appended!');
        logger.info('ℹ️  Note: This strategy uses direct product links with attribution parameters.');
        logger.info('    It bypasses the /social/ redirect but should still track if cookies are set.');
        logger.info('👉 CLICK THIS LINK TO VERIFY: ' + generatedUrl);
    } else {
        logger.error('❌ FAILED: Some parameters were missing.');
    }

    // Restore env
    process.env.MERCADOLIVRE_AFFILIATE_CODE = originalEnv;
}

testSocialLink();
