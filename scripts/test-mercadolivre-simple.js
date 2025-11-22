// Script simplificado para testar a captura de produtos do Mercado Livre
// Uso: npm run test-mercadolivre

console.log('🧪 Iniciando teste de captura do Mercado Livre...\n');

// Registrar ts-node
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true
  }
});

const path = require('path');
const fs = require('fs');

// Mudar para o diretório do projeto
process.chdir(path.join(__dirname, '..'));

async function runTest() {
  try {
    console.log('📋 1. Verificando configuração...');
    const configPath = path.join(process.cwd(), 'config.json');
    
    if (!fs.existsSync(configPath)) {
      console.error('❌ config.json não encontrado!');
      process.exit(1);
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const mercadolivre = config.mercadolivre || {};
    
    if (!mercadolivre.clientId) {
      console.error('❌ Client ID do Mercado Livre não configurado!');
      process.exit(1);
    }
    
    console.log('✅ Configuração OK');
    console.log(`   Client ID: ${mercadolivre.clientId.substring(0, 10)}...`);
    console.log(`   Access Token: ${mercadolivre.accessToken ? 'Configurado' : 'Não configurado'}`);
    console.log(`   Token expira em: ${mercadolivre.tokenExpiresAt ? new Date(mercadolivre.tokenExpiresAt).toLocaleString('pt-BR') : 'N/A'}\n`);

    console.log('📦 2. Carregando serviços...');
    const { MercadoLivreService } = require('../src/services/mercadolivre/MercadoLivreService');
    const service = new MercadoLivreService();
    console.log('✅ Serviço carregado\n');

    console.log('🔍 3. Buscando produtos (5 produtos)...');
    try {
      const products = await service.searchProducts('eletrônicos', 5);
      console.log(`✅ Encontrados ${products.length} produtos\n`);
      
      if (products.length > 0) {
        console.log('📊 Primeiro produto:');
        const p = products[0];
        console.log(`   ID: ${p.id || 'N/A'}`);
        console.log(`   Título: ${(p.title || 'N/A').substring(0, 70)}`);
        console.log(`   Preço: R$ ${p.price || 'N/A'}`);
        console.log(`   Moeda: ${p.currency_id || 'N/A'}`);
        console.log(`   Condição: ${p.condition || 'N/A'}`);
        console.log(`   Frete grátis: ${p.shipping?.free_shipping ? 'Sim' : 'Não'}\n`);
      } else {
        console.log('   ⚠️  Nenhum produto encontrado (pode ser rate limit ou bloqueio de IP)\n');
      }
    } catch (error) {
      console.error(`❌ Erro: ${error.message}`);
      if (error.response?.status === 403) {
        console.error('   ⚠️  Erro 403: Acesso negado. Pode ser rate limit ou bloqueio de IP.\n');
      } else {
        console.error('\n');
      }
    }

    console.log('🔥 4. Buscando hot deals (5 produtos)...');
    try {
      const deals = await service.getHotDeals(5);
      console.log(`✅ Encontrados ${deals.length} hot deals\n`);
      
      if (deals.length > 0) {
        console.log('📊 Primeiro hot deal:');
        const d = deals[0];
        console.log(`   ID: ${d.id || 'N/A'}`);
        console.log(`   Título: ${(d.title || 'N/A').substring(0, 70)}`);
        console.log(`   Preço: R$ ${d.price || 'N/A'}`);
        console.log(`   Preço original: ${d.original_price ? `R$ ${d.original_price}` : 'N/A'}`);
        console.log(`   Desconto: ${d.discounts ? `${d.discounts.percent}% (R$ ${d.discounts.amount})` : 'N/A'}\n`);
      }
    } catch (error) {
      console.error(`❌ Erro: ${error.message}\n`);
    }

    console.log('🔄 5. Testando conversão para oferta...');
    try {
      const products = await service.searchProducts('promoção', 3);
      let validCount = 0;
      let invalidCount = 0;
      
      for (const product of products) {
        const offer = service.convertToOffer(product, 'electronics');
        if (offer) {
          validCount++;
          const hasNaN = isNaN(offer.originalPrice) || isNaN(offer.currentPrice) || 
                        isNaN(offer.discount) || isNaN(offer.discountPercentage);
          
          if (!hasNaN) {
            console.log(`   ✅ Oferta válida: ${offer.title.substring(0, 50)}...`);
            console.log(`      Preço: R$ ${offer.originalPrice} → R$ ${offer.currentPrice} (${offer.discountPercentage.toFixed(1)}% off)`);
            console.log(`      Moeda: ${offer.currency}`);
            console.log(`      URL: ${offer.productUrl.substring(0, 60)}...`);
          } else {
            console.log(`   ⚠️  Oferta com NaN detectado!`);
            invalidCount++;
          }
        } else {
          invalidCount++;
        }
      }
      
      console.log(`\n   📊 Resumo: ${validCount} válidas, ${invalidCount} rejeitadas/inválidas\n`);
    } catch (error) {
      console.error(`❌ Erro: ${error.message}\n`);
      if (error.stack) {
        console.error(error.stack);
      }
    }

    console.log('📦 6. Testando busca de múltiplos produtos por ID...');
    try {
      // Usar IDs conhecidos do Mercado Livre para teste
      const testProductIds = ['MLB1234567890', 'MLB9876543210', 'MLB1112223334'];
      console.log(`   Testando com IDs conhecidos: ${testProductIds.join(', ')}`);
      console.log('   (Nota: Estes são IDs de exemplo. Use IDs reais para testar)\n');
      
      // Tentar buscar produtos reais se a busca funcionar
      const products = await service.searchProducts('smartphone', 3);
      if (products.length > 0) {
        const productIds = products.slice(0, 3).map(p => p.id);
        console.log(`   Buscando detalhes de ${productIds.length} produtos: ${productIds.join(', ')}`);
        
        const detailedProducts = await service.getMultipleProducts(productIds);
        console.log(`   ✅ Encontrados ${detailedProducts.length} produtos detalhados\n`);
        
        if (detailedProducts.length > 0) {
          const first = detailedProducts[0];
          if (first.body) {
            console.log(`   📊 Primeiro produto detalhado:`);
            console.log(`      ID: ${first.body.id}`);
            console.log(`      Título: ${first.body.title?.substring(0, 60)}...`);
            console.log(`      Preço: R$ ${first.body.price}`);
            console.log(`      Vendedor: ${first.body.seller?.nickname || 'N/A'}`);
          } else if (first.code === 404) {
            console.log(`   ⚠️  Produto não encontrado (404)`);
          }
        }
      } else {
        console.log('   ⚠️  Não foi possível buscar produtos para teste de múltiplos IDs\n');
      }
    } catch (error) {
      console.error(`❌ Erro: ${error.message}\n`);
    }

    console.log('✨ Teste concluído!');
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

runTest();

