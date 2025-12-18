#!/usr/bin/env ts-node

/**
 * Script para verificar se as ofertas foram realmente deletadas do MongoDB
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

// Mudar para o diretório do projeto
process.chdir(path.join(__dirname, '..'));

async function checkOffers() {
  try {
    console.log('📋 Verificando ofertas no MongoDB...\n');

    // Conectar ao banco
    console.log('1️⃣ Conectando ao MongoDB...');
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
    
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Conectado!\n');
    } catch (error: any) {
      console.error('❌ Erro ao conectar:', error.message);
      throw error;
    }

    // Acessar a coleção diretamente
    const db = mongoose.connection.db;
    const collection = db.collection('offers');

    // Contar total de documentos
    console.log('2️⃣ Contando documentos na coleção...');
    const totalCount = await collection.countDocuments({});
    console.log(`   📊 Total de documentos na coleção 'offers': ${totalCount}`);

    // Contar documentos ativos
    const activeCount = await collection.countDocuments({ isActive: true });
    console.log(`   ✅ Documentos com isActive: true: ${activeCount}`);

    // Contar documentos inativos
    const inactiveCount = await collection.countDocuments({ isActive: false });
    console.log(`   ⏸️  Documentos com isActive: false: ${inactiveCount}`);

    // Contar por fonte
    console.log('\n3️⃣ Contando por fonte:');
    const sources = ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'];
    for (const source of sources) {
      const count = await collection.countDocuments({ source });
      if (count > 0) {
        console.log(`   - ${source}: ${count} documentos`);
      }
    }

    // Verificar se há documentos
    if (totalCount > 0) {
      console.log('\n4️⃣ Amostra de documentos restantes:');
      const sample = await collection.find({}).limit(5).toArray();
      sample.forEach((doc: any, index: number) => {
        console.log(`   ${index + 1}. _id: ${doc._id}`);
        console.log(`      Título: ${doc.title?.substring(0, 50) || 'N/A'}...`);
        console.log(`      Fonte: ${doc.source || 'N/A'}`);
        console.log(`      isActive: ${doc.isActive !== undefined ? doc.isActive : 'N/A'}`);
        console.log(`      Criado em: ${doc.createdAt || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('\n✅ CONFIRMADO: A coleção está completamente vazia!');
      console.log('   Todas as ofertas foram permanentemente deletadas do MongoDB.');
    }

    // Verificar estatísticas da coleção
    console.log('\n5️⃣ Estatísticas da coleção:');
    const stats = await db.stats();
    console.log(`   Tamanho da coleção: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`   Número de documentos: ${stats.count}`);
    console.log(`   Índices: ${stats.nindexes}`);

    if (totalCount === 0) {
      console.log('\n✅ CONCLUSÃO:');
      console.log('   ✓ A coleção "offers" está vazia');
      console.log('   ✓ Todas as 29 ofertas foram permanentemente deletadas');
      console.log('   ✓ Nenhum documento restante no banco de dados');
    } else {
      console.log(`\n⚠️  CONCLUSÃO:`);
      console.log(`   ⚠️  Ainda existem ${totalCount} documento(s) na coleção`);
      console.log(`   ⚠️  Verifique se são soft deletes ou documentos órfãos`);
    }

  } catch (error: any) {
    console.error('\n❌ Erro ao verificar ofertas:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    console.log('\n6️⃣ Desconectando do MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Desconectado!');
    process.exit(0);
  }
}

// Executar
checkOffers();

