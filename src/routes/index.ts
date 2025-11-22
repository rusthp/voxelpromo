import { Express } from 'express';
import { offerRoutes } from './offer.routes';
import { collectorRoutes } from './collector.routes';
import { statsRoutes } from './stats.routes';
import { configRoutes } from './config.routes';
import { authRoutes } from './auth.routes';
import { mercadoLivreRoutes } from './mercadolivre.routes';
import { xRoutes } from './x.routes';
import { authenticate } from '../middleware/auth';

export function setupRoutes(app: Express): void {
  // Root callback route for X OAuth (Twitter accepts root domain as callback)
  // This matches the pattern used by ActivePiece and other integrations
  // Must be registered BEFORE other routes to catch OAuth callbacks
  app.get('/', async (req, res) => {
    // Check if this is an OAuth callback (has 'code' or 'error' parameter)
    if (req.query.code || req.query.error) {
      // Redirect to the actual OAuth callback handler, preserving all query parameters
      const queryParams = new URLSearchParams();
      Object.keys(req.query).forEach(key => {
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

  // Public routes
  app.use('/api/auth', authRoutes);
  app.use('/api/mercadolivre', mercadoLivreRoutes); // OAuth callback needs to be public
  app.use('/api/x', xRoutes); // OAuth callback needs to be public

  // Protected routes (require authentication)
  app.use('/api/offers', authenticate, offerRoutes);
  app.use('/api/collector', authenticate, collectorRoutes);
  app.use('/api/stats', authenticate, statsRoutes);
  app.use('/api/config', authenticate, configRoutes);
}

