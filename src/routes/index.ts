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
import redirectRoutes from './redirect.routes';
import {
  collectionLimiter,
  configLimiter,
  apiLimiter,
} from '../middleware/rate-limit';


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

  // Public route for redirect (must be accessible without auth)
  app.use('/s', redirectRoutes); // Short URL redirect: /s/:code
}

