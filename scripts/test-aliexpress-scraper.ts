/**
 * Test AliExpress Scraper
 * Run with: npx ts-node scripts/test-aliexpress-scraper.ts
 */

import { AliExpressScraper } from '../src/services/aliexpress';

async function testScraper() {
    console.log('🧪 ========================================');
    console.log('🧪 TESTE DO SCRAPER ALIEXPRESS');
    console.log('🧪 ========================================\n');

    const scraper = new AliExpressScraper();

    // Test 1: Scrape SSR Bestsellers page (user suggested)
    console.log('\n🔥 TESTE 1: Scrape página SSR Bestsellers');
    console.log('================================================');
    const ssrDeals = await scraper.scrapeBestsellersSSR(10);

    console.log(`📊 Encontrados ${ssrDeals.totalFound} produtos`);

    if (ssrDeals.products.length > 0) {
        console.log('✅ Produtos:');
        for (const p of ssrDeals.products.slice(0, 5)) {
            console.log(`   - ID: ${p.productId} | R$ ${p.currentPrice.toFixed(2)} | ${p.title?.substring(0, 40) || '(sem título)'}...`);
        }
    } else {
        console.log('⚠️ Nenhum produto encontrado');
    }

    // Test 2: Scrape product by ID
    console.log('\n📦 TESTE 2: Scrape produto por ID');
    console.log('================================================');
    const productId = '1005009221251420'; // The flashlight product
    const product = await scraper.scrapeProductById(productId);

    if (product) {
        console.log('✅ Sucesso!');
        console.log('📊 Resultado:');
        console.log(`   ID: ${product.productId}`);
        console.log(`   Título: ${product.title?.substring(0, 50)}...`);
        console.log(`   Preço Atual: R$ ${product.currentPrice.toFixed(2)}`);
        console.log(`   Preço Original: R$ ${product.originalPrice.toFixed(2)}`);
        console.log(`   Desconto: ${product.discountPercentage}%`);
    } else {
        console.log('❌ Falhou ao obter dados do produto individual');
    }

    console.log('\n🧪 ========================================');
    console.log('🧪 TESTE FINALIZADO');
    console.log('🧪 ========================================');
}

testScraper().catch(console.error);
