// Script simplificado para testar prevenção de duplicatas
// Uso: npm run test-duplicates

console.log('🧪 Testando prevenção de duplicatas...\n');

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
const dotenv = require('dotenv');
dotenv.config();

process.chdir(path.join(__dirname, '..'));

const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const { OfferService } = require('../src/services/offer/OfferService');

async function runTest() {
  try {
    console.log('📦 1. Conectando ao banco de dados...');
    await connectDatabase();
    console.log('✅ Conectado\n');

    console.log('🔍 2. Verificando ofertas existentes...');
    const { OfferModel } = require('../src/models/OfferModel');
    const existingCount = await OfferModel.countDocuments({ source: 'aliexpress' });
    console.log(`   📊 Ofertas existentes: ${existingCount}\n`);

    console.log('🧪 3. Testando prevenção de duplicatas...');
    const offerService = new OfferService();
    
    // Criar uma oferta de teste
    const testOffer = {
      title: 'Test Product - Duplicate Prevention',
      description: 'Test description',
      originalPrice: 100,
      currentPrice: 80,
      discount: 20,
      discountPercentage: 20,
      currency: 'BRL',
      imageUrl: 'https://example.com/image.jpg',
      productUrl: 'https://www.aliexpress.com/item/999999999.html',
      affiliateUrl: 'https://www.aliexpress.com/item/999999999.html?tracking=voxelpromo',
      source: 'aliexpress',
      category: 'electronics',
      tags: ['test'],
      isActive: true,
      isPosted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('   📝 Salvando primeira oferta...');
    const firstSave = await offerService.saveOffers([testOffer]);
    console.log(`   ✅ Primeira oferta: ${firstSave} salva\n`);

    const afterFirst = await OfferModel.countDocuments({ source: 'aliexpress' });
    console.log(`   📊 Total após primeira: ${afterFirst}\n`);

    console.log('   📝 Tentando salvar a mesma oferta novamente (deve ser ignorada)...');
    const secondSave = await offerService.saveOffers([testOffer]);
    console.log(`   ✅ Segunda tentativa: ${secondSave} salva (deve ser 0)\n`);

    const afterSecond = await OfferModel.countDocuments({ source: 'aliexpress' });
    console.log(`   📊 Total após segunda: ${afterSecond}\n`);

    // Limpar oferta de teste
    await OfferModel.deleteOne({ productUrl: testOffer.productUrl });
    console.log('   🧹 Oferta de teste removida\n');

    console.log('✨ Teste concluído!');
    console.log('\n📝 Resultado:');
    if (secondSave === 0 && afterFirst === afterSecond) {
      console.log('   ✅ SUCESSO: Duplicatas foram prevenidas corretamente!');
    } else {
      console.log('   ⚠️  ATENÇÃO: Duplicatas podem não estar sendo prevenidas corretamente');
    }

    await disconnectDatabase();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await disconnectDatabase();
    process.exit(1);
  }
}

if (require.main === module) {
  runTest();
}

