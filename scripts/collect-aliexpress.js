// Script para executar coleta completa do AliExpress e salvar no banco
// Uso: node scripts/collect-aliexpress.js

console.log('🚀 Iniciando coleta completa do AliExpress...\n');

// Registrar ts-node
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true
  }
});

const path = require('path');

// Mudar para o diretório do projeto
process.chdir(path.join(__dirname, '..'));

async function runCollection() {
  try {
    console.log('📋 1. Verificando configuração...');
    const fs = require('fs');
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
    console.log(`   Taxa de câmbio: ${aliexpress.exchangeRate || 5.0} (USD → BRL)\n`);

    console.log('📦 2. Conectando ao banco de dados...');
    const dotenv = require('dotenv');
    dotenv.config();
    
    // Usar a função de conexão do projeto
    const { connectDatabase } = require('../src/config/database');
    
    try {
      await connectDatabase();
      console.log('✅ Conectado ao MongoDB\n');
    } catch (error) {
      console.error('❌ Erro ao conectar ao MongoDB:', error.message);
      console.error('   Verifique se o MongoDB está rodando e se MONGODB_URI está configurado no .env');
      process.exit(1);
    }

    console.log('🔍 3. Iniciando coleta do AliExpress...');
    const { CollectorService } = require('../src/services/collector/CollectorService');
    const collectorService = new CollectorService();
    
    const startTime = Date.now();
    const count = await collectorService.collectFromAliExpress('electronics');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Coleta concluída em ${duration}s`);
    console.log(`📊 Ofertas coletadas e salvas: ${count}\n`);

    if (count > 0) {
      console.log('🔍 4. Verificando ofertas salvas...');
      const { OfferModel } = require('../src/models/Offer');
      
      const recentOffers = await OfferModel.find({
        source: 'aliexpress',
        createdAt: { $gte: new Date(Date.now() - 60000) } // Último minuto
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
      
      if (recentOffers.length > 0) {
        console.log(`\n📦 Últimas ${recentOffers.length} ofertas salvas:\n`);
        recentOffers.forEach((offer, index) => {
          console.log(`${index + 1}. ${offer.title.substring(0, 60)}...`);
          console.log(`   Preço Original: R$ ${offer.originalPrice.toFixed(2)}`);
          console.log(`   Preço Atual: R$ ${offer.currentPrice.toFixed(2)}`);
          console.log(`   Desconto: ${offer.discountPercentage.toFixed(1)}% (R$ ${offer.discount.toFixed(2)})`);
          console.log(`   Moeda: ${offer.currency}`);
          console.log(`   URL: ${offer.productUrl.substring(0, 70)}...`);
          console.log('');
        });
      }
    }

    console.log('✨ Coleta finalizada com sucesso!');
    
    const { disconnectDatabase } = require('../src/config/database');
    await disconnectDatabase();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Erro durante a coleta:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

runCollection();

