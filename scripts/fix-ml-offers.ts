import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is required. Please set it in .env');
  process.exit(1);
}

// Minimal Offer Schema
const offerSchema = new mongoose.Schema({
  title: String,
  source: String,
  discountPercentage: Number,
  isActive: Boolean,
  isPosted: Boolean,
  currentPrice: Number,
  originalPrice: Number
}, { strict: false });

const OfferModel = mongoose.model('Offer', offerSchema);

async function run() {
  try {
    console.log(`🔌 Conectando ao MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado com sucesso');

    // Buscar ofertas do Mercado Livre que estão ativas, não postadas, e com 0% de desconto
    const query = {
      source: 'mercadolivre',
      isActive: true,
      isPosted: false,
      discountPercentage: 0
    };

    const offersToFix = await OfferModel.find(query);
    
    console.log(`\n🔍 Encontradas ${offersToFix.length} ofertas do Mercado Livre com 0% de desconto para corrigir.`);

    if (offersToFix.length === 0) {
      console.log('✨ Nenhuma oferta precisa de correção.');
      process.exit(0);
    }

    // Mostrar alguns exemplos
    console.log('\nExemplos de ofertas que serão inativadas (soft-delete):');
    offersToFix.slice(0, 3).forEach(o => {
      console.log(`- ${o.title} (R$ ${o.currentPrice})`);
    });

    console.log('\n🔄 Inativando ofertas para forçar recoleta com preços corretos...');
    
    // Atualizar em lote (Soft Delete)
    const result = await OfferModel.updateMany(query, { 
      $set: { isActive: false } 
    });

    console.log(`\n✅ Sucesso! ${result.modifiedCount} ofertas inativadas.`);
    console.log('💡 Na próxima vez que o Coletor (CollectorService) rodar, ele vai puxar essas ofertas novamente com o preço Pix/desconto correto usando o scraper atualizado.');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do banco de dados.');
    process.exit(0);
  }
}

run();
