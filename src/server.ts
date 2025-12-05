import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database';
import { setupRoutes } from './routes';
import { setupCronJobs } from './jobs/scheduler';
import { setupSwagger } from './config/swagger';
import { logger } from './utils/logger';
import { loadConfigFromFile } from './utils/loadConfig';
import { validateAndLogEnv } from './utils/validateEnv';

// Validate critical environment variables
validateAndLogEnv();

// Verify MongoDB URI is loaded
if (process.env.MONGODB_URI) {
  logger.info(`📋 MongoDB URI loaded from .env`);
} else {
  logger.warn('⚠️  MONGODB_URI not found in .env, using default');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Helmet.js for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Security: CORS with better configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];

// Always allow localhost:3001 (frontend), localhost:3000 (self), and localhost:8080 (alternative frontend port)
if (!allowedOrigins.includes('http://localhost:3001')) allowedOrigins.push('http://localhost:3001');
if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');
if (!allowedOrigins.includes('http://localhost:8080')) allowedOrigins.push('http://localhost:8080');

logger.info(`🌐 Allowed CORS Origins: ${allowedOrigins.join(', ')}`);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn(`🛑 CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger API Documentation
setupSwagger(app);

// Routes
setupRoutes(app);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  const startTime = Date.now();
  try {
    // Load configuration from config.json (if exists)
    const configStart = Date.now();
    loadConfigFromFile();
    logger.info(`⚙️  Config loaded in ${Date.now() - configStart}ms`);

    // Connect to database (this can be slow)
    const dbStart = Date.now();
    await connectDatabase();
    logger.info(`💾 Database connected in ${Date.now() - dbStart}ms`);

    // Setup cron jobs
    const cronStart = Date.now();
    setupCronJobs();
    logger.info(`⏰ Cron jobs scheduled in ${Date.now() - cronStart}ms`);

    app.listen(PORT, () => {
      const totalTime = Date.now() - startTime;
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 API available at http://localhost:${PORT}/api`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
      logger.info(`⏱️  Total startup time: ${totalTime}ms`);
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
// Trigger restart
