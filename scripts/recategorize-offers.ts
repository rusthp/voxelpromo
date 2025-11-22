#!/usr/bin/env ts-node

/**
 * Script para recategorizar ofertas existentes no banco de dados
 * Usa o CategoryService para detectar categorias corretas baseado no título/descrição
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { CategoryService } from '../src/services/category/CategoryService';

// Carregar variáveis de ambiente
dotenv.config();

// Mudar para o diretório do projeto
process.chdir(path.join(__dirname, '..'));

async function recategorizeOffers() {
  try {
    console.log('📋 Recategorizando ofertas no MongoDB...\n');

    // Conectar ao banco
    console.log('1️⃣ Conectando ao MongoDB...');
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado!\n');

    // Importar modelo
    const { OfferModel } = require('../src/models/Offer');
    const categoryService = new CategoryService();

    // Buscar todas as ofertas
    console.log('2️⃣ Buscando ofertas...');
    const offers = await OfferModel.find({ isActive: true });
    console.log(`   📊 Encontradas ${offers.length} ofertas\n`);

    if (offers.length === 0) {
      console.log('✅ Nenhuma oferta para recategorizar!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Recategorizar
    console.log('3️⃣ Recategorizando ofertas...');
    let updated = 0;
    let unchanged = 0;
    const categoryChanges: Record<string, number> = {};

    for (const offer of offers) {
      const oldCategory = offer.category;
      const newCategory = categoryService.detectCategory(
        offer.title,
        offer.description || offer.title,
        oldCategory
      );

      if (oldCategory !== newCategory) {
        offer.category = newCategory;
        await offer.save();
        updated++;
        
        if (!categoryChanges[`${oldCategory} → ${newCategory}`]) {
          categoryChanges[`${oldCategory} → ${newCategory}`] = 0;
        }
        categoryChanges[`${oldCategory} → ${newCategory}`]++;
        
        if (updated % 10 === 0) {
          console.log(`   ✅ Recategorizadas ${updated} ofertas...`);
        }
      } else {
        unchanged++;
      }
    }

    console.log('\n4️⃣ Resultados:');
    console.log(`   ✅ Atualizadas: ${updated} ofertas`);
    console.log(`   ⏸️  Sem mudança: ${unchanged} ofertas`);
    
    if (Object.keys(categoryChanges).length > 0) {
      console.log('\n5️⃣ Mudanças de categoria:');
      for (const [change, count] of Object.entries(categoryChanges)) {
        console.log(`   - ${change}: ${count} ofertas`);
      }
    }

    // Estatísticas por categoria
    console.log('\n6️⃣ Estatísticas finais por categoria:');
    const finalStats = await OfferModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    for (const stat of finalStats) {
      console.log(`   - ${stat._id}: ${stat.count} ofertas`);
    }

    console.log('\n✅ Recategorização concluída!');

  } catch (error: any) {
    console.error('\n❌ Erro ao recategorizar ofertas:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    console.log('\n7️⃣ Desconectando do MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Desconectado!');
    process.exit(0);
  }
}

// Executar
recategorizeOffers();



