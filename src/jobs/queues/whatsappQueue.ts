import { Queue, QueueOptions } from 'bullmq';
import { logger } from '../../utils/logger';
import Redis from 'ioredis';

// Configuração centralizada do Redis
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required field by bullmq
};

export const redisConnection = new Redis(redisConfig);

const queueOptions: QueueOptions = {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

export const whatsappQueue = new Queue('whatsapp_offers', queueOptions);

// Limpeza elegante para encerramento
process.on('SIGINT', async () => {
  logger.info('Fechando conexões do Redis...');
  await whatsappQueue.close();
  redisConnection.disconnect();
});
