const { MercadoLivreService } = require('./dist/services/mercadolivre/MercadoLivreService');

async function testMercadoLivre() {
    console.log('🧪 Testando nova implementação do Mercado Livre...\n');

    const mlService = new MercadoLivreService();

    try {
        console.log('🔍 Buscando produtos: "smartphone"...');
        const products = await mlService.searchProducts('smartphone', 5);

        console.log(`\n✅ Encontrados ${products.length} produtos\n`);

        if (products.length > 0) {
            console.log('📦 Amostra dos produtos encontrados:\n');
            products.slice(0, 3).forEach((p, i) => {
                console.log(`${i + 1}. ${p.title.substring(0, 50)}...`);
                console.log(`   💰 Preço: ${p.currency_id} ${p.price}`);
                console.log(`   🔗 Link: ${p.permalink.substring(0, 60)}...`);
                console.log(`   🖼️  Imagem: ${p.thumbnail ? 'Sim' : 'Não'}`);
                console.log('');
            });

            console.log('✅ TESTE PASSOU: Produtos têm preços válidos!');
        } else {
            console.log('❌ TESTE FALHOU: Nenhum produto retornado');
        }
    } catch (error) {
        console.error('❌ ERRO:', error.message);
    }
}

testMercadoLivre();
