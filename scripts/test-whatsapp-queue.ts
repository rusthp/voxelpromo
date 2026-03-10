import { whatsappQueue } from '../src/jobs/queues/whatsappQueue';
import { Offer } from '../src/types';
import { logger } from '../src/utils/logger';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Script para testar a inserção de produtos na fila do WhatsApp
 * Executar com: npx ts-node scripts/test-whatsapp-queue.ts
 */
async function testQueue() {
  try {
    await connectDatabase();
    
    logger.info('🧪 Iniciando o teste da fila do WhatsApp (BullMQ)...');
    
    // Criando uma oferta fictícia (dummy) com > 30% de desconto
    const dummyOffer: Partial<Offer> = {
      _id: new mongoose.Types.ObjectId() as any,
      title: '📦 [TESTE AUTOMÁTICO] Produto Incrível com 50% OFF',
      currentPrice: 49.90,
      originalPrice: 99.90,
      currency: 'BRL',
      discountPercentage: 50,
      affiliateUrl: 'https://amzn.to/3EXAMPLE',
      imageUrl: 'https://via.placeholder.com/300', // Imagem de teste
      source: 'manual',
    };

    // ID de usuário para testes 
    const userId = "test-system"; 

    logger.info('📝 Adicionando oferta de teste à fila whatsapp_offers...');
    
    const job = await whatsappQueue.add('send_offer', {
      offerData: dummyOffer,
      userId: userId,
    });

    logger.info(`✅ Job adicionado com sucesso! ID da Tarefa: ${job.id}`);
    logger.info('⏳ O worker rodando em background (server.ts) deve processar isso na fila.');
    
    setTimeout(() => {
      logger.info('👋 Script de teste inseriu o job. Acesse os logs do servidor principal para ver o envio!');
      process.exit(0);
    }, 2000);

  } catch (error) {
    logger.error('❌ Erro durante o teste da fila:', error);
    process.exit(1);
  }
}

testQueue();
