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

// Handle Redis connection errors gracefully to prevent log flooding
let redisErrorLogged = false;
redisConnection.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') {
    // Log only once, then suppress repeated ECONNREFUSED errors
    if (!redisErrorLogged) {
      logger.warn(`⚠️ Redis não disponível em ${redisConfig.host}:${redisConfig.port}. BullMQ tentará reconectar automaticamente.`);
      redisErrorLogged = true;
    }
  } else {
    logger.error('Redis connection error:', { code: err.code, message: err.message });
  }
});

redisConnection.on('connect', () => {
  redisErrorLogged = false;
  logger.info('✅ Redis conectado com sucesso');
});

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
