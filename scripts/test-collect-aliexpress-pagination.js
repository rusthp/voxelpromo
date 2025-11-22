// Script para testar paginação e prevenção de duplicatas
// Uso: npm run test-pagination

console.log('🧪 Iniciando teste de paginação e prevenção de duplicatas...\n');

// Registrar ts-node para importar arquivos TypeScript
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

// Mudar para o diretório do projeto
process.chdir(path.join(__dirname, '..'));

const { AliExpressService } = require('../src/services/aliexpress/AliExpressService');
const { OfferService } = require('../src/services/offer/OfferService');
const { CollectorService } = require('../src/services/collector/CollectorService');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');

async function runTest() {

  try {
    console.log('📋 1. Verificando configuração...');
    const configPath = path.join(__dirname, '..', 'config.json');
    if (!fs.existsSync(configPath)) {
      console.error('❌ Erro: config.json não encontrado!');
      return;
    }
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const aliexpress = configData.aliexpress || {};

    if (!aliexpress.appKey || !aliexpress.appSecret) {
      console.error('❌ Erro: Credenciais do AliExpress não configuradas!');
      return;
    }

    console.log('✅ Configuração OK\n');

    console.log('📦 2. Conectando ao banco de dados...');
    try {
      await connectDatabase();
      console.log('✅ Conectado ao MongoDB\n');
    } catch (error) {
      console.error('❌ Erro ao conectar ao MongoDB:', error.message);
      process.exit(1);
    }

    console.log('🔍 3. Verificando ofertas existentes...');
    const { OfferModel } = require('../src/models/OfferModel');
    const existingCount = await OfferModel.countDocuments({ source: 'aliexpress' });
    console.log(`   📊 Ofertas existentes no banco: ${existingCount}\n`);

    console.log('🚀 4. Primeira coleta (coletando ofertas)...');
    const collectorService = new CollectorService();
    const firstCollection = await collectorService.collectFromAliExpress('electronics');
    console.log(`   ✅ Primeira coleta: ${firstCollection} ofertas salvas\n`);

    const afterFirstCount = await OfferModel.countDocuments({ source: 'aliexpress' });
    console.log(`   📊 Total após primeira coleta: ${afterFirstCount}\n`);

    console.log('⏳ Aguardando 3 segundos antes da segunda coleta...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🚀 5. Segunda coleta (deve evitar duplicatas)...');
    const secondCollection = await collectorService.collectFromAliExpress('electronics');
    console.log(`   ✅ Segunda coleta: ${secondCollection} ofertas salvas\n`);

    const afterSecondCount = await OfferModel.countDocuments({ source: 'aliexpress' });
    console.log(`   📊 Total após segunda coleta: ${afterSecondCount}\n`);

    const duplicatesPrevented = afterFirstCount - secondCollection;
    console.log(`   🛡️  Duplicatas evitadas: ${duplicatesPrevented > 0 ? duplicatesPrevented : 'Nenhuma (todas as ofertas eram novas)'}\n`);

    console.log('📊 6. Verificando paginação...');
    const aliExpressService = new AliExpressService();
    const paginationTest = await aliExpressService.getFeaturedPromoProducts({
      promotionName: 'Hot Product',
      pageNo: 1,
      pageSize: 10,
      targetCurrency: 'USD',
      targetLanguage: 'EN'
    });

    console.log(`   📄 Página: ${paginationTest.pagination.currentPage}/${paginationTest.pagination.totalPages}`);
    console.log(`   📦 Total de registros: ${paginationTest.pagination.totalRecords}`);
    console.log(`   📋 Produtos nesta página: ${paginationTest.pagination.currentRecordCount}`);
    console.log(`   ✅ Paginação funcionando: ${paginationTest.pagination.totalPages > 1 ? 'Sim' : 'Não'}\n`);

    console.log('✨ Teste concluído!');
    console.log('\n📝 Resumo:');
    console.log(`   - Ofertas antes: ${existingCount}`);
    console.log(`   - Ofertas após primeira coleta: ${afterFirstCount}`);
    console.log(`   - Ofertas após segunda coleta: ${afterSecondCount}`);
    console.log(`   - Novas ofertas na segunda coleta: ${secondCollection}`);
    console.log(`   - Duplicatas evitadas: ${duplicatesPrevented > 0 ? duplicatesPrevented : 'Nenhuma'}`);

    await disconnectDatabase();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
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

