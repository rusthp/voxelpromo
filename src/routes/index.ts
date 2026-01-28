import { Express } from 'express';
import express from 'express';
import path from 'path';
import { offerRoutes } from './offer.routes';
import { collectorRoutes } from './collector.routes';
import { statsRoutes } from './stats.routes';
import { configRoutes } from './config.routes';
import { authRoutes } from './auth.routes';
import { profileRoutes } from './profile.routes';
import { mercadoLivreRoutes } from './mercadolivre.routes';
import { amazonRoutes } from './amazon.routes';
import { xRoutes } from './x.routes';
import whatsappRoutes from './whatsapp.routes';
import telegramRoutes from './telegram.routes';
import { authenticate } from '../middleware/auth';
import { adminRoutes } from './admin.routes';
import fixRoutes from './fix.routes';
import { postsRoutes } from './posts.routes';
import { healthRoutes } from './health.routes';
import { automationRoutes } from './automation.routes';
import { templatesRoutes } from './templates.routes';
import { aiRoutes } from './ai.routes';
import awinRoutes from './awin.routes';
import lomadeeRoutes from './lomadee.routes';
import afilioRoutes from './afilio.routes';
import rakutenRoutes from './rakuten.routes';
import instagramRoutes from './instagram.routes';
import linksRoutes from './links.routes';
import { shorturlRoutes } from './shorturl.routes';
import { documentsRoutes } from './documents.routes';
import { paymentRoutes } from './payment.routes';
import newsRoutes from './news.routes';
import { usersRoutes } from './users.routes';
import { contactRoutes } from './contact.routes';
import { collectionLimiter, configLimiter, apiLimiter } from '../middleware/rate-limit';

export function setupRoutes(app: Express): void {
  // Serve static files for uploads (avatars, etc.)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Root callback route for X OAuth (Twitter accepts root domain as callback)
  // This matches the pattern used by ActivePiece and other integrations
  // Must be registered BEFORE other routes to catch OAuth callbacks
  app.get('/', async (req, res) => {
    // Check if this is an OAuth callback (has 'code' or 'error' parameter)
    if (req.query.code || req.query.error) {
      // Redirect to the actual OAuth callback handler, preserving all query parameters
      const queryParams = new URLSearchParams();
      Object.keys(req.query).forEach((key) => {
        const value = req.query[key];
        if (value) {
          // Convert to string: handle arrays, objects (ParsedQs), and strings
          let stringValue: string;
          if (Array.isArray(value)) {
            // Get first element and convert to string
            stringValue = typeof value[0] === 'string' ? value[0] : String(value[0]);
          } else if (typeof value === 'string') {
            stringValue = value;
          } else {
            // Handle ParsedQs objects
            stringValue = String(value);
          }
          queryParams.append(key, stringValue);
        }
      });
      const queryString = queryParams.toString();
      return res.redirect(`/api/x/auth/callback${queryString ? '?' + queryString : ''}`);
    }
    // If not an OAuth callback, return a simple response or redirect to frontend
    return res.redirect(process.env.FRONTEND_URL || 'http://localhost:3001');
  });

  // Public routes with specific rate limiting
  app.use('/api/auth', authRoutes); // Auth routes have internal rate limiting
  app.use('/api/mercadolivre', mercadoLivreRoutes); // OAuth callback needs to be public
  app.use('/api/amazon', amazonRoutes); // Amazon scraping (no API needed)
  app.use('/api/x', xRoutes); // OAuth callback needs to be public
  app.use('/api/health', healthRoutes); // Health check endpoints
  app.use('/api/ai', aiRoutes); // AI provider testing (public for initial setup)
  app.use('/api/payments', paymentRoutes); // Mercado Pago webhooks need to be public
  app.use('/api/news', apiLimiter, newsRoutes); // Public news list, Admin management protected internally
  app.use('/api/contact', apiLimiter, contactRoutes); // Public contact form

  // Protected routes (require authentication) with rate limiting
  app.use('/api/offers', authenticate, apiLimiter, offerRoutes);
  app.use('/api/collector', authenticate, collectionLimiter, collectorRoutes);
  app.use('/api/stats', authenticate, apiLimiter, statsRoutes);
  app.use('/api/config', authenticate, configLimiter, configRoutes); // PROTECTED: sensitive credentials
  app.use('/api/whatsapp', authenticate, apiLimiter, whatsappRoutes); // PROTECTED: WhatsApp access
  app.use('/api/telegram', authenticate, apiLimiter, telegramRoutes); // PROTECTED: Telegram access
  app.use('/api/instagram', instagramRoutes); // Instagram (webhook needs to be public for Meta verification)
  app.use('/api/admin', authenticate, apiLimiter, adminRoutes);
  app.use('/api/posts', authenticate, apiLimiter, postsRoutes); // Post history
  app.use('/api/automation', authenticate, apiLimiter, automationRoutes); // Automation system
  app.use('/api/templates', authenticate, apiLimiter, templatesRoutes); // Message templates
  app.use('/api/awin', authenticate, apiLimiter, awinRoutes); // Awin affiliate network
  app.use('/api/lomadee', authenticate, apiLimiter, lomadeeRoutes); // Lomadee affiliate network
  app.use('/api/afilio', authenticate, apiLimiter, afilioRoutes); // Afilio affiliate network
  app.use('/api/rakuten', authenticate, apiLimiter, rakutenRoutes); // Rakuten affiliate network
  app.use('/api/profile', authenticate, apiLimiter, profileRoutes); // User profile
  app.use('/api/fix', authenticate, fixRoutes); // Temporary fix endpoints
  app.use('/api/links', authenticate, apiLimiter, linksRoutes); // URL Shortener API
  app.use('/api/documents', apiLimiter, documentsRoutes); // CPF/CNPJ validation (public for registration)
  app.use('/api/users', authenticate, apiLimiter, usersRoutes); // LGPD: account deletion and data export

  // Public route for redirect with click tracking (must be accessible without auth)
  app.use('/s', shorturlRoutes); // Short URL redirect with click tracking: /s/:code?ch=telegram

  // ==========================================
  // PRODUCTION: Serve frontend static files
  // ==========================================
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendDistPath = path.join(process.cwd(), 'frontend', 'dist');

  if (isProduction) {
    // Serve static files from frontend/dist
    app.use(
      express.static(frontendDistPath, {
        maxAge: '1d', // Cache static assets for 1 day
        etag: true,
      })
    );

    // SPA catch-all: Any route not handled by API should return index.html
    // This allows React Router to handle client-side routing
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (
        req.path.startsWith('/api/') ||
        req.path.startsWith('/s/') ||
        req.path.startsWith('/uploads/')
      ) {
        return next();
      }

      // Serve index.html for all other routes (SPA routing)
      const indexPath = path.join(frontendDistPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          // If index.html doesn't exist, 404
          res.status(404).json({ error: 'Frontend not built. Run: npm run build:frontend' });
        }
      });
    });
  }
}
