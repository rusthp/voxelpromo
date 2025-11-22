import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { setupRoutes } from './routes';
import { setupCronJobs } from './jobs/scheduler';
import { logger } from './utils/logger';
import { loadConfigFromFile } from './utils/loadConfig';

// Load environment variables
dotenv.config();

// Verify MongoDB URI is loaded
if (process.env.MONGODB_URI) {
  logger.info(`📋 MongoDB URI loaded from .env`);
} else {
  logger.warn('⚠️  MONGODB_URI not found in .env, using default');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
setupRoutes(app);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    // Load configuration from config.json (if exists)
    loadConfigFromFile();
    
    await connectDatabase();
    logger.info('Database connected');

    setupCronJobs();
    logger.info('Cron jobs scheduled');

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 API available at http://localhost:${PORT}/api`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
    });
  } catch (error: any) {
    // Extract error message from various error formats
    let errorMessage = '';
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }
    
    logger.error('❌ Failed to start server:');
    logger.error(errorMessage);
    
    const errorLower = errorMessage.toLowerCase();
    if (errorLower.includes('mongodb') || errorLower.includes('database')) {
      logger.error('');
      logger.error('💡 MongoDB Connection Tips:');
      logger.error('   - Linux/WSL: See docs/MONGODB_SETUP.md for WSL-specific instructions');
      logger.error('   - Windows: net start MongoDB');
      logger.error('   - MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
      logger.error('   - IP Whitelist: Check Network Access in Atlas dashboard');
      logger.error('   - See docs/MONGODB_SETUP.md for more help.');
      logger.error('');
    }
    
    process.exit(1);
  }
}

startServer();

