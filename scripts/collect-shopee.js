#!/usr/bin/env node
/**
 * Script para coletar produtos da Shopee via feeds CSV
 * 
 * Usage: node scripts/collect-shopee.js
 */

const path = require('path');
process.chdir(path.join(__dirname, '..'));

const dotenv = require('dotenv');
dotenv.config();

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
    const shopee = config.shopee || {};
    
    if (!shopee.feedUrls || shopee.feedUrls.length === 0) {
      console.error('❌ Feed URLs da Shopee não configuradas!');
      console.error('   Adicione feedUrls no config.json → shopee');
      process.exit(1);
    }
    
    console.log('✅ Configuração OK');
    console.log(`   Feeds configurados: ${shopee.feedUrls.length}\n`);

    console.log('📦 2. Conectando ao banco de dados...');
    const { connectDatabase } = require('../src/config/database');
    
    try {
      await connectDatabase();
      console.log('✅ Conectado ao MongoDB\n');
    } catch (error) {
      console.error('❌ Erro ao conectar ao MongoDB:', error.message);
      console.error('   Verifique se o MongoDB está rodando e se MONGODB_URI está configurado no .env');
      process.exit(1);
    }

    console.log('🛒 3. Iniciando coleta da Shopee...');
    const { CollectorService } = require('../src/services/collector/CollectorService');
    const collectorService = new CollectorService();
    
    const startTime = Date.now();
    const count = await collectorService.collectFromShopee('electronics');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Coleta concluída em ${duration}s`);
    console.log(`📊 Ofertas coletadas e salvas: ${count}\n`);

    if (count > 0) {
      console.log('🔍 4. Verificando ofertas salvas...');
      const { OfferService } = require('../src/services/offer/OfferService');
      const offerService = new OfferService();
      
      const offers = await offerService.getOffers({ 
        source: 'shopee',
        limit: 5 
      });
      
      console.log(`\n📦 Últimas ${offers.length} ofertas coletadas:`);
      offers.forEach((offer, index) => {
        console.log(`\n${index + 1}. ${offer.title.substring(0, 60)}...`);
        console.log(`   Preço: R$ ${offer.currentPrice} (Desconto: ${offer.discountPercentage.toFixed(1)}%)`);
        if (offer.originalPrice > offer.currentPrice) {
          console.log(`   De: R$ ${offer.originalPrice} por R$ ${offer.currentPrice}`);
        }
        console.log(`   Link: ${offer.affiliateUrl || offer.productUrl}`);
      });
    } else {
      console.log('⚠️  Nenhuma oferta foi coletada.');
      console.log('   Possíveis causas:');
      console.log('   - Feeds vazios ou inválidos');
      console.log('   - Filtros muito restritivos (desconto mínimo)');
      console.log('   - Erro no processamento do CSV');
    }

    console.log('\n✅ Processo concluído!\n');
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




