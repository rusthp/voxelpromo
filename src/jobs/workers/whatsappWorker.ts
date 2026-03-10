import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues/whatsappQueue';
import { logger } from '../../utils/logger';
import { WhatsAppServiceBaileys } from '../../services/messaging/WhatsAppServiceBaileys';
import { Offer } from '../../types';

export const whatsappWorker = new Worker(
  'whatsapp_offers',
  async (job: Job) => {
    logger.info(`🔄 [WhatsApp Worker] Processando job ${job.id}`);
    
    try {
      const { offerData, userId }: { offerData: Offer; userId: string } = job.data;

      if (!userId) {
        throw new Error('UserId is missing from the job payload');
      }

      // Initialize WhatsApp Service strictly for this tenant
      const whatsAppService = await WhatsAppServiceBaileys.createForUser(userId);

      if (!whatsAppService.isReady()) {
        throw new Error(`WhatsApp service for user ${userId} is not connected. Sending deferred.`);
      }

      const sent = await whatsAppService.sendOffer(offerData);

      if (sent) {
        logger.info(`✅ [WhatsApp Worker] Mensagem enviada com sucesso para o usuário ${userId}`);
      } else {
        throw new Error('Failed to send offer. See WhatsApp logs for details.');
      }

    } catch (error: any) {
      logger.error(`❌ [WhatsApp Worker] Erro no job ${job.id}: ${error.message}`);
      throw error; // Rethrow to trigger BullMQ retry logic
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 1, // Only process 1 message at a time
    limiter: {
      max: 1, // Max jobs processed...
      duration: 10000, // ...per duration. E.g., 1 per 10 seconds to avoid ban
    },
  }
);

whatsappWorker.on('completed', (job: Job) => {
  logger.info(`[WhatsApp Worker] Job ${job.id} concluído com sucesso`);
});

whatsappWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`[WhatsApp Worker] Job ${job?.id} falhou: ${err.message}`);
});
