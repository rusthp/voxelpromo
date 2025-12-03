import { MercadoLivreService } from '../src/services/mercadolivre/MercadoLivreService';

async function testAuthenticatedSearch() {
    console.log('🔍 Testing Mercado Livre Authenticated Search...\n');

    const mlService = new MercadoLivreService();

    // Test 1: Check if tokens are configured
    const config = mlService.getConfig();
    console.log('📋 Configuration:');
    console.log(`  - Client ID: ${config.clientId ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - Access Token: ${config.accessToken ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - Token Expires: ${config.tokenExpiresAt ? new Date(config.tokenExpiresAt).toLocaleString() : 'N/A'}`);
    console.log();

    if (!config.accessToken) {
        console.error('❌ No access token found! Please authenticate first.');
        console.log('Run: npm run ml-auth');
        return;
    }

    // Test 2: Search for products
    try {
        console.log('🔍 Searching for "smartphone"...');
        const products = await mlService.searchProducts('smartphone', 5);

        if (products.length === 0) {
            console.log('⚠️  No products found (but no 403 error!)');
        } else {
            console.log(`\n✅ Found ${products.length} products:\n`);
            products.forEach((product, index) => {
                console.log(`${index + 1}. ${product.title}`);
                console.log(`   Price: R$ ${product.price}`);
                console.log(`   ID: ${product.id}`);
                console.log();
            });
        }
    } catch (error: any) {
        console.error('❌ Search failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }

    // Test 3: Try trending products
    try {
        console.log('\n🔥 Getting trending products...');
        const trending = await mlService.getTrendingProducts(3);

        if (trending.length === 0) {
            console.log('⚠️  No trending products found');
        } else {
            console.log(`\n✅ Found ${trending.length} trending products:\n`);
            trending.forEach((product, index) => {
                console.log(`${index + 1}. ${product.title}`);
                console.log(`   Price: R$ ${product.price}`);
                console.log();
            });
        }
    } catch (error: any) {
        console.error('❌ Trending fetch failed:', error.message);
    }
}

testAuthenticatedSearch().catch(console.error);
