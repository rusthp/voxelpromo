// Script simplificado para testar a captura de produtos do AliExpress
// Uso: npm run test-aliexpress

console.log('🧪 Iniciando teste de captura do AliExpress...\n');

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
    const aliexpress = config.aliexpress || {};
    
    if (!aliexpress.appKey || !aliexpress.appSecret) {
      console.error('❌ Credenciais do AliExpress não configuradas!');
      process.exit(1);
    }
    
    console.log('✅ Configuração OK');
    console.log(`   App Key: ${aliexpress.appKey.substring(0, 6)}...`);
    console.log(`   Tracking ID: ${aliexpress.trackingId || 'N/A'}\n`);

    console.log('📦 2. Carregando serviços...');
    const { AliExpressService } = require('../src/services/aliexpress/AliExpressService');
    const service = new AliExpressService();
    console.log('✅ Serviço carregado\n');

    console.log('📈 3. Buscando produtos quentes (5 produtos)...');
    try {
      const products = await service.getHotProducts(undefined, 5);
      console.log(`✅ Encontrados ${products.length} produtos\n`);
      
      if (products.length > 0) {
        console.log('📊 Primeiro produto:');
        const p = products[0];
        console.log(`   ID: ${p.product_id || p.productId || 'N/A'}`);
        console.log(`   Título: ${(p.product_title || p.title || 'N/A').substring(0, 70)}`);
        console.log(`   Preço: ${p.product_price?.value || p.target_sale_price || 'N/A'}\n`);
      }
    } catch (error) {
      console.error(`❌ Erro: ${error.message}\n`);
    }

    console.log('🔄 4. Testando conversão para oferta...');
    try {
      const products = await service.getHotProducts(undefined, 3);
      let validCount = 0;
      let invalidCount = 0;
      
        for (const product of products) {
          const offer = await service.convertToOffer(product, 'electronics');
          if (offer) {
          validCount++;
          const hasNaN = isNaN(offer.originalPrice) || isNaN(offer.currentPrice) || 
                        isNaN(offer.discount) || isNaN(offer.discountPercentage);
          
          if (!hasNaN) {
            console.log(`   ✅ Oferta válida: ${offer.title.substring(0, 50)}...`);
            console.log(`      Preço: R$ ${offer.originalPrice} → R$ ${offer.currentPrice} (${offer.discountPercentage.toFixed(1)}% off)`);
            if (offer.coupons && offer.coupons.length > 0) {
              console.log(`      🎟️  Cupons: ${offer.coupons.join(', ')}`);
            }
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

