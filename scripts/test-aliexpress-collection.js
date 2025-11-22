// Script para testar a captura de produtos do AliExpress
// Uso: ts-node scripts/test-aliexpress-collection.js

const path = require('path');

// Configurar o caminho do projeto
process.chdir(path.join(__dirname, '..'));

// Registrar ts-node para importar TypeScript diretamente
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true
  }
});

// Importar serviços
const { AliExpressService } = require('../src/services/aliexpress/AliExpressService');
const { CollectorService } = require('../src/services/collector/CollectorService');

async function testAliExpressCollection() {
  console.log('🧪 Testando captura de produtos do AliExpress...\n');

  try {
    // Teste 1: Verificar configuração
    console.log('📋 Teste 1: Verificando configuração...');
    const fs = require('fs');
    const configPath = path.join(__dirname, '..', 'config.json');
    
    if (!fs.existsSync(configPath)) {
      console.error('❌ Erro: config.json não encontrado!');
      return;
    }
    
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const aliexpressConfig = configData.aliexpress || {};
    
    if (!aliexpressConfig.appKey || !aliexpressConfig.appSecret) {
      console.error('❌ Erro: Credenciais do AliExpress não configuradas!');
      console.log('   Verifique config.json');
      return;
    }
    
    console.log('✅ Configuração encontrada:');
    console.log(`   App Key: ${aliexpressConfig.appKey.substring(0, 6)}...`);
    console.log(`   App Secret: ${aliexpressConfig.appSecret ? 'Configurado' : 'Não configurado'}`);
    console.log(`   Tracking ID: ${aliexpressConfig.trackingId || 'Não configurado'}\n`);
    
    const aliExpressService = new AliExpressService();

    // Teste 2: Buscar produtos quentes
    console.log('📈 Teste 2: Buscando produtos quentes (hot products)...');
    try {
      const hotProducts = await aliExpressService.getHotProducts(undefined, 5);
      console.log(`✅ Encontrados ${hotProducts.length} produtos quentes`);
      
      if (hotProducts.length > 0) {
        console.log('\n   Primeiro produto:');
        const firstProduct = hotProducts[0];
        console.log(`   - ID: ${firstProduct.product_id || firstProduct.productId || 'N/A'}`);
        console.log(`   - Título: ${(firstProduct.product_title || firstProduct.title || 'N/A').substring(0, 60)}...`);
        console.log(`   - Preço: ${firstProduct.product_price?.value || firstProduct.target_sale_price || 'N/A'}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar produtos quentes: ${error.message}`);
    }

    // Teste 3: Buscar flash deals
    console.log('\n⚡ Teste 3: Buscando flash deals...');
    try {
      const flashDeals = await aliExpressService.getFlashDeals(5);
      console.log(`✅ Encontrados ${flashDeals.length} flash deals`);
      
      if (flashDeals.length > 0) {
        console.log('\n   Primeiro flash deal:');
        const firstDeal = flashDeals[0];
        console.log(`   - ID: ${firstDeal.product_id || firstDeal.productId || 'N/A'}`);
        console.log(`   - Título: ${(firstDeal.product_title || firstDeal.title || 'N/A').substring(0, 60)}...`);
        console.log(`   - Preço: ${firstDeal.product_price?.value || firstDeal.target_sale_price || 'N/A'}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar flash deals: ${error.message}`);
    }

    // Teste 4: Converter produto para oferta
    console.log('\n🔄 Teste 4: Testando conversão de produto para oferta...');
    try {
      const hotProducts = await aliExpressService.getHotProducts(undefined, 3);
      
      if (hotProducts.length > 0) {
        let convertedCount = 0;
        let validOffers = 0;
        let invalidOffers = 0;

        for (const product of hotProducts) {
          const offer = aliExpressService.convertToOffer(product, 'electronics');
          
          if (offer) {
            validOffers++;
            console.log(`\n   ✅ Produto convertido com sucesso:`);
            console.log(`   - Título: ${offer.title.substring(0, 50)}...`);
            console.log(`   - Preço Original: ${offer.originalPrice} ${offer.currency}`);
            console.log(`   - Preço Atual: ${offer.currentPrice} ${offer.currency}`);
            console.log(`   - Desconto: ${offer.discount} ${offer.currency} (${offer.discountPercentage.toFixed(2)}%)`);
            console.log(`   - URL: ${offer.productUrl.substring(0, 60)}...`);
            
            // Validar que não há NaN
            const hasNaN = isNaN(offer.originalPrice) || isNaN(offer.currentPrice) || 
                          isNaN(offer.discount) || isNaN(offer.discountPercentage);
            
            if (hasNaN) {
              console.log(`   ⚠️  AVISO: Valores NaN detectados!`);
              invalidOffers++;
            } else {
              console.log(`   ✅ Valores numéricos válidos`);
            }
          } else {
            invalidOffers++;
            console.log(`   ⚠️  Produto não convertido (provavelmente sem desconto suficiente)`);
          }
          convertedCount++;
        }

        console.log(`\n   📊 Resumo da conversão:`);
        console.log(`   - Produtos testados: ${convertedCount}`);
        console.log(`   - Ofertas válidas: ${validOffers}`);
        console.log(`   - Ofertas inválidas/rejeitadas: ${invalidOffers}`);
      } else {
        console.log('   ⚠️  Nenhum produto disponível para teste de conversão');
      }
    } catch (error) {
      console.error(`❌ Erro ao testar conversão: ${error.message}`);
      console.error(error.stack);
    }

    // Teste 5: Testar coleta completa (sem salvar no banco)
    console.log('\n🎯 Teste 5: Testando coleta completa (simulação)...');
    try {
      const collectorService = new CollectorService();
      
      // Buscar produtos diretamente sem salvar
      const hotProducts = await aliExpressService.getHotProducts(undefined, 10);
      const flashDeals = await aliExpressService.getFlashDeals(10);
      
      const allProducts = [...hotProducts, ...flashDeals];
      console.log(`   📦 Total de produtos coletados: ${allProducts.length}`);
      
      const offers = allProducts
        .map((product) => aliExpressService.convertToOffer(product, 'electronics'))
        .filter((offer) => offer !== null);
      
      console.log(`   ✅ Ofertas válidas após conversão: ${offers.length}`);
      
      if (offers.length > 0) {
        console.log(`\n   📊 Estatísticas das ofertas:`);
        const discounts = offers.map(o => o.discountPercentage);
        const avgDiscount = discounts.reduce((a, b) => a + b, 0) / discounts.length;
        const maxDiscount = Math.max(...discounts);
        const minDiscount = Math.min(...discounts);
        
        console.log(`   - Desconto médio: ${avgDiscount.toFixed(2)}%`);
        console.log(`   - Maior desconto: ${maxDiscount.toFixed(2)}%`);
        console.log(`   - Menor desconto: ${minDiscount.toFixed(2)}%`);
        
        // Verificar NaN
        const hasAnyNaN = offers.some(o => 
          isNaN(o.originalPrice) || isNaN(o.currentPrice) || 
          isNaN(o.discount) || isNaN(o.discountPercentage)
        );
        
        if (hasAnyNaN) {
          console.log(`   ⚠️  AVISO: Algumas ofertas contêm valores NaN!`);
        } else {
          console.log(`   ✅ Todas as ofertas têm valores numéricos válidos`);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao testar coleta completa: ${error.message}`);
      console.error(error.stack);
    }

    console.log('\n✅ Testes concluídos!');
    
  } catch (error) {
    console.error('\n❌ Erro geral nos testes:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar testes
if (require.main === module) {
  testAliExpressCollection()
    .then(() => {
      console.log('\n✨ Teste finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { testAliExpressCollection };

