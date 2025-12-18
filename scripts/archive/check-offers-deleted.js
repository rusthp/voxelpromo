#!/usr/bin/env node

/**
 * Script para verificar se as ofertas foram realmente deletadas do MongoDB
 */

const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Mudar para o diretório do projeto
process.chdir(path.join(__dirname, '..'));

const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const { OfferService } = require('../src/services/offer/OfferService');

async function checkOffers() {
  try {
    console.log('📋 Verificando ofertas no MongoDB...\n');

    // Conectar ao banco
    console.log('1️⃣ Conectando ao MongoDB...');
    await connectDatabase();
    console.log('✅ Conectado!\n');

    const offerService = new OfferService();

    // Contar total de ofertas
    console.log('2️⃣ Contando ofertas...');
    const allOffers = await offerService.getAllOffers();
    const totalCount = allOffers.length;
    console.log(`   📊 Total de ofertas ativas no banco: ${totalCount}`);

    // Contar por fonte
    console.log('\n3️⃣ Contando por fonte:');
    const sources = ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'];
    for (const source of sources) {
      const offers = await offerService.filterOffers({ source });
      if (offers.length > 0) {
        console.log(`   - ${source}: ${offers.length} ofertas`);
      }
    }

    // Verificar se há ofertas
    if (totalCount > 0) {
      console.log('\n4️⃣ Amostra de ofertas restantes:');
      const sample = allOffers.slice(0, 5);
      sample.forEach((offer, index) => {
        console.log(`   ${index + 1}. ID: ${offer._id || 'N/A'}`);
        console.log(`      Título: ${offer.title?.substring(0, 50) || 'N/A'}...`);
        console.log(`      Fonte: ${offer.source || 'N/A'}`);
        console.log(`      Preço: R$ ${offer.currentPrice || 'N/A'}`);
        console.log(`      Criado em: ${offer.createdAt || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('\n✅ Nenhuma oferta encontrada no banco de dados!');
      console.log('   As ofertas foram realmente deletadas.');
    }

    // Verificar diretamente no MongoDB usando mongoose
    console.log('\n5️⃣ Verificando diretamente no MongoDB...');
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('offers');
      const rawCount = await collection.countDocuments({});
      console.log(`   Total de documentos na coleção 'offers': ${rawCount}`);

      if (rawCount === 0) {
        console.log('\n✅ CONFIRMADO: A coleção está completamente vazia!');
        console.log('   Todas as ofertas foram permanentemente deletadas do MongoDB.');
      } else {
        console.log(`\n⚠️  Ainda existem ${rawCount} documento(s) na coleção.`);
        console.log('   Verificando detalhes...');
        
        const sampleDocs = await collection.find({}).limit(3).toArray();
        sampleDocs.forEach((doc, index) => {
          console.log(`   ${index + 1}. _id: ${doc._id}`);
          console.log(`      isActive: ${doc.isActive !== undefined ? doc.isActive : 'N/A'}`);
          console.log(`      source: ${doc.source || 'N/A'}`);
          console.log(`      title: ${doc.title?.substring(0, 40) || 'N/A'}...`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Não foi possível verificar diretamente: ${error.message}`);
    }

  } catch (error) {
    console.error('\n❌ Erro ao verificar ofertas:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    console.log('\n7️⃣ Desconectando do MongoDB...');
    await disconnectDatabase();
    console.log('✅ Desconectado!');
    process.exit(0);
  }
}

// Executar
checkOffers();

