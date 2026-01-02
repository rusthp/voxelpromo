/**
 * Test script for Mercado Livre affiliate link generation
 * Run with: npx ts-node scripts/test-ml-affiliate-link.ts
 */

import crypto from 'crypto';

// User's Social Link
const SOCIAL_LINK = 'https://www.mercadolivre.com.br/social/ally_f?matt_word=voxelpromo&matt_tool=71361504&forceInApp=true&ref=BGzv86S9XjvC1HGboAAxgbSV3iCIlOCtdvbHqDtGJ7019S8t1bzV7JaWNf5RGrnxTJpQQbjjWWe3DzKC12z1hg5o7%2BQK156%2FQTydKmghSU%2BBosMs1%2BHzLMKRrfZl6eYRZExNxIIUCT%2B5W5Xn%2F9FQV4WVF0Evbs%2FOD90Q2RjDn8CNH3jddCM4qDJodHxH7I4f1yaGGDw%3D';

// Product URL to test
const PRODUCT_URL = 'https://produto.mercadolivre.com.br/MLB-3836291195-blusa-feminino-muscle-tee-viscolycra-classica-casual-chic-_JM?searchVariation=184626250151#polycard_client=recommendations_home_second-best-navigation-trend-recommendations&reco_backend=machinalis-homes-univb&reco_client=home_second-best-navigation-trend-recommendations&reco_item_pos=1&reco_backend_type=function&reco_id=ca30f19c-a26a-4f9c-a0a2-337d1df47216&c_id=/home/second-best-navigation-trend-recommendations/element&c_uid=4f84c30a-1e08-4a29-95d6-e1f055f78923';

/**
 * Simulates the updated buildAffiliateLink function
 */
function buildAffiliateLink(productUrl: string, affiliateCode: string): string {
    if (!affiliateCode || affiliateCode.trim() === '') {
        return productUrl;
    }

    try {
        // If affiliateCode is a Social Link URL (contains matt_tool or matt_word)
        if (affiliateCode.startsWith('http://') || affiliateCode.startsWith('https://')) {
            const affiliateUrlObj = new URL(affiliateCode);
            const productUrlObj = new URL(productUrl);

            // Check for ML Social Link format (matt_tool, matt_word)
            const mattTool = affiliateUrlObj.searchParams.get('matt_tool');
            const mattWord = affiliateUrlObj.searchParams.get('matt_word');

            if (mattTool || mattWord) {
                // ML Social Link format - apply matt_* params
                if (mattTool) productUrlObj.searchParams.set('matt_tool', mattTool);
                if (mattWord) productUrlObj.searchParams.set('matt_word', mattWord);

                // Add tracking params for better attribution
                productUrlObj.searchParams.set('forceInApp', 'true');

                // Generate unique tracking_id for each link (UUID v4 format)
                const trackingId = crypto.randomUUID();
                productUrlObj.searchParams.set('tracking_id', trackingId);

                console.log(`✅ ML Affiliate Link built with matt_tool=${mattTool}, matt_word=${mattWord}`);
                return productUrlObj.toString();
            }

            // Generic URL format - copy all params except ref (session-specific)
            console.log(`🔗 Parsing Affiliate URL: ${affiliateCode.substring(0, 80)}...`);

            affiliateUrlObj.searchParams.forEach((value, key) => {
                if (key !== 'ref') {
                    productUrlObj.searchParams.set(key, value);
                }
            });

            return productUrlObj.toString();
        }

        // Simple code format
        const url = new URL(productUrl);
        if (/^\d+$/.test(affiliateCode.trim())) {
            url.searchParams.set('matt_tool', affiliateCode.trim());
            url.searchParams.set('tracking_id', crypto.randomUUID());
            return url.toString();
        }

        url.searchParams.set('a', affiliateCode);
        return url.toString();
    } catch (error) {
        console.error('Error building affiliate link:', error);
        const separator = productUrl.includes('?') ? '&' : '?';
        return `${productUrl}${separator}matt_tool=${encodeURIComponent(affiliateCode)}`;
    }
}

// Run test
console.log('='.repeat(80));
console.log('🧪 TESTE DE GERAÇÃO DE LINK AFILIADO MERCADO LIVRE');
console.log('='.repeat(80));
console.log();

console.log('📥 INPUT:');
console.log('─'.repeat(40));
console.log('Social Link:', SOCIAL_LINK.substring(0, 80) + '...');
console.log();
console.log('Product URL:', PRODUCT_URL.substring(0, 80) + '...');
console.log();

const affiliateLink = buildAffiliateLink(PRODUCT_URL, SOCIAL_LINK);

console.log('📤 OUTPUT:');
console.log('─'.repeat(40));
console.log('Affiliate Link:');
console.log(affiliateLink);
console.log();

// Parse and show params
const outputUrl = new URL(affiliateLink);
console.log('🔍 PARÂMETROS DO LINK GERADO:');
console.log('─'.repeat(40));
outputUrl.searchParams.forEach((value, key) => {
    if (key === 'tracking_id') {
        console.log(`  ${key}: ${value} (UUID único)`);
    } else if (key === 'matt_tool') {
        console.log(`  ${key}: ${value} ← ID de afiliado`);
    } else if (key === 'matt_word') {
        console.log(`  ${key}: ${value} ← Tag de campanha`);
    } else if (key === 'forceInApp') {
        console.log(`  ${key}: ${value} ← Força abrir no app`);
    } else {
        console.log(`  ${key}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`);
    }
});

console.log();
console.log('='.repeat(80));
console.log('✅ TESTE CONCLUÍDO');
console.log('='.repeat(80));
console.log();
console.log('⚠️  PRÓXIMO PASSO: Clique no link gerado e verifique no painel ML se a visita foi registrada.');
