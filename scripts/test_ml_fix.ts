import { MercadoLivreService } from '../src/services/mercadolivre/MercadoLivreService';

async function testMercadoLivre() {
    console.log('🧪 Testando coleta do Mercado Livre...\n');

    const mlService = new MercadoLivreService();

    try {
        // Teste 1: Trending Products (que já funciona)
        console.log('🔥 Testando getTrendingProducts()...');
        const trendingProducts = await mlService.getTrendingProducts(10);

        console.log(`\n✅ Trending: Encontrados ${trendingProducts.length} produtos\n`);

        if (trendingProducts.length > 0) {
            console.log('📦 Top 3 produtos em alta:\n');
            trendingProducts.slice(0, 3).forEach((p, i) => {
                console.log(`${i + 1}. ${p.title.substring(0, 60)}...`);
                console.log(`   💰 Preço: ${p.currency_id} ${p.price.toFixed(2)}`);
                console.log(`   🔗 Link: ${p.permalink?.substring(0, 70) || 'N/A'}...`);
                console.log('');
            });
        }

        // Aguardar um pouco para evitar rate limit
        console.log('⏳ Aguardando 2 segundos...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Teste 2: Search Products
        console.log('🔍 Testando searchProducts()...');
        const searchProducts = await mlService.searchProducts('notebook', 5);

        console.log(`✅ Busca: Encontrados ${searchProducts.length} produtos\n`);

        if (searchProducts.length > 0) {
            console.log('📦 Produtos encontrados na busca:\n');
            searchProducts.slice(0, 2).forEach((p, i) => {
                console.log(`${i + 1}. ${p.title.substring(0, 60)}...`);
                console.log(`   💰 Preço: ${p.currency_id} ${p.price.toFixed(2)}`);
                console.log('');
            });
        }

        // Resumo
        console.log('\n═══════════════════════════════════════');
        console.log('📊 RESUMO DOS TESTES');
        console.log('═══════════════════════════════════════');
        console.log(`✅ Trending Products: ${trendingProducts.length} produtos`);
        console.log(`✅ Search Products: ${searchProducts.length} produtos`);
        console.log(`✅ Total: ${trendingProducts.length + searchProducts.length} produtos com preço`);
        console.log('═══════════════════════════════════════\n');

        if (trendingProducts.length > 0 || searchProducts.length > 0) {
            console.log('🎉 SUCESSO: API do Mercado Livre está funcionando!');
        } else {
            console.log('⚠️  AVISO: Nenhum produto retornado, verifique rate limiting');
        }

    } catch (error: any) {
        console.error('\n❌ ERRO:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testMercadoLivre();
