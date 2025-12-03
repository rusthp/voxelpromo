import { MercadoLivreService } from '../src/services/mercadolivre/MercadoLivreService';

async function testCollection() {
    console.log('🔍 Testing Mercado Livre Product Collection (Authenticated + Public Fallback)...\n');

    const mlService = new MercadoLivreService();

    // Test 1: Search for a common term
    try {
        const term = 'smartphone';
        console.log(`📡 Searching for "${term}"...`);
        const products = await mlService.searchProducts(term, 5);

        if (products.length > 0) {
            console.log(`✅ Success! Found ${products.length} products.`);
            console.log('\nSample Product:');
            const p = products[0];
            console.log(`   Title: ${p.title}`);
            console.log(`   Price: R$ ${p.price}`);
            console.log(`   Link: ${p.permalink}`);
        } else {
            console.log('⚠️ No products found (but no error).');
        }
    } catch (error: any) {
        console.error('❌ Search failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data));
        }
    }

    // Test 2: Trending
    try {
        console.log('\n🔥 Testing Trending Products...');
        const trending = await mlService.getTrendingProducts(5);
        if (trending.length > 0) {
            console.log(`✅ Success! Found ${trending.length} trending products.`);
        } else {
            console.log('⚠️ No trending products found.');
        }
    } catch (error: any) {
        console.error('❌ Trending failed:', error.message);
    }

    // Test 3: Get Specific Item (to check if /items endpoint works even if search fails)
    try {
        // Using a likely valid ID format or a known one. 
        // If we get 404, it means Auth worked (no 403). If we get 403, Auth is broken for everything.
        const testId = 'MLB1000000000';
        console.log(`\n📦 Testing Get Item (${testId})...`);
        const item = await mlService.getProductDetails(testId);
        if (item) {
            console.log('✅ Success! Item found:', item.title);
        } else {
            console.log('⚠️ Item not found (404), but access was allowed (no 403).');
        }
    } catch (error: any) {
        console.error('❌ Get Item failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            if (error.response.status === 403) {
                console.error('   ⚠️ Access Denied (403). Auth is still blocked.');
            }
        }
    }
}

testCollection().catch(console.error);
