import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { connectDatabase } from './config/database';
import { setupRoutes } from './routes';
import { setupCronJobs } from './jobs/scheduler';
import { setupSwagger } from './config/swagger';
import { logger } from './utils/logger';
import { loadConfigFromFile } from './utils/loadConfig';
import { validateAndLogEnv } from './utils/validateEnv';
import { forceHttpsMiddleware, securityHeadersMiddleware } from './middleware/https.middleware';
import { initializeSentry, Sentry } from './utils/sentry';
import { globalDDoSLimiter, sustainedRateLimiter } from './middleware/ddos-protection';
import { ipMonitorMiddleware } from './middleware/ip-blacklist';
import { sanitizeRequest } from './middleware/sanitization';

// Validate critical environment variables
validateAndLogEnv();

// Initialize Sentry FIRST (before any other code)
initializeSentry();

// Verify MongoDB URI is loaded
if (process.env.MONGODB_URI) {
  logger.info(`📋 MongoDB URI loaded from .env`);
} else {
  logger.warn('⚠️  MONGODB_URI not found in .env, using default');
}

const app = express();
// Enable trust proxy to correctly identify client IPs behind Nginx/Docker
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// PRODUCTION SECURITY: Force HTTPS and add security headers
app.use(forceHttpsMiddleware);
app.use(securityHeadersMiddleware);

// Security: Helmet.js for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:3000', 'http://localhost:3001'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded from different origins
  })
);

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit to 1000 requests per windowMs to allow for dashboard polling
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Security: CORS with better configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

// Always allow localhost:3001 (frontend), localhost:3000 (self), and localhost:8080 (alternative frontend port)
if (!allowedOrigins.includes('http://localhost:3001')) allowedOrigins.push('http://localhost:3001');
if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');
if (!allowedOrigins.includes('http://localhost:3002')) allowedOrigins.push('http://localhost:3002');
if (!allowedOrigins.includes('http://localhost:3003')) allowedOrigins.push('http://localhost:3003');
if (!allowedOrigins.includes('http://localhost:3004')) allowedOrigins.push('http://localhost:3004');
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

// STRIPE WEBHOOK: Preserve raw body for signature verification
// This middleware runs BEFORE express.json() and saves the raw body
app.use('/api/payments/stripe/webhook', (req, _res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
});

// SECURITY: Request body size limits (DDoS protection)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// SECURITY: Global DDoS Protection (100 req/s burst, 300 req/min sustained)
app.use(globalDDoSLimiter);
app.use(sustainedRateLimiter);

// SECURITY: IP Monitoring (logs suspicious activity)
app.use(ipMonitorMiddleware);

// SECURITY: Global XSS Sanitization
app.use(sanitizeRequest);

logger.info('🛡️ Security middlewares loaded: DDoS, IP Monitor, XSS Sanitization');

// Serve static files from uploads directory (avatars, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
logger.info(`📁 Serving static files from: ${path.join(process.cwd(), 'uploads')}`);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger API Documentation
setupSwagger(app);

// Routes
setupRoutes(app);

// Sentry error handler (MUST be after routes, before other error handlers)
// Sentry v10+ uses setupExpressErrorHandler
Sentry.setupExpressErrorHandler(app);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);

  // In production, don't  expose error details
  const errorMessage =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  res.status(500).json({ error: errorMessage });
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  logger.error(error.stack || 'No stack trace available');

  // Capture in Sentry
  Sentry.captureException(error);

  // Don't exit - try to keep running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Promise Rejection at:', promise);
  logger.error('Reason:', reason);

  // Capture in Sentry
  if (reason instanceof Error) {
    Sentry.captureException(reason);
  } else {
    Sentry.captureMessage(`Unhandled rejection: ${String(reason)}`, 'error');
  }

  // Don't exit - try to keep running
});

// Memory monitoring - log warning if memory usage is high
const MEMORY_CHECK_INTERVAL = 60000; // 1 minute
const MEMORY_WARNING_THRESHOLD = 500 * 1024 * 1024; // 500MB

setInterval(() => {
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > MEMORY_WARNING_THRESHOLD) {
    logger.warn(`⚠️ High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    logger.warn('   Consider restarting the server or reducing background tasks');
  }
}, MEMORY_CHECK_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
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
