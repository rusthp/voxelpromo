import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { whatsappQueue } from '../jobs/queues/whatsappQueue';
import { authenticate, requireAdmin } from '../middleware/auth';
import chalk from 'chalk';
import { logger } from '../utils/logger';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(whatsappQueue)],
  serverAdapter,
});

const bullBoardRouter = Router();

// Adicionando um middleware de debug simples para ver se a rota está batendo
bullBoardRouter.use('/', 
  (req, _res, next) => {
    logger.debug(chalk.blue(`🔗 [Bull-Board] Request to ${req.method} ${req.url}`));
    next();
  },
  authenticate, 
  requireAdmin as any, 
  serverAdapter.getRouter()
);

export default bullBoardRouter;
