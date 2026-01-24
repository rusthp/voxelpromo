import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

/**
 * Sanitization middleware to prevent XSS attacks
 * Cleans HTML/script tags from user input
 */

// Custom XSS options
const xssOptions = {
  whiteList: {}, // Don't allow any HTML tags
  stripIgnoreTag: true, // Remove all tags
  stripIgnoreTagBody: ['script'], // Remove script tags and their content
};

/**
 * Sanitize a string value
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  return xss(value, xssOptions);
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Express middleware to sanitize request data
 * Sanitizes body, query, and params
 */
export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Helper function to sanitize offer data specifically
 * Can be used in services before saving to database
 */
export function sanitizeOffer(offer: any): any {
  return {
    ...offer,
    title: offer.title ? sanitizeString(offer.title) : offer.title,
    description: offer.description ? sanitizeString(offer.description) : offer.description,
    // Keep URLs as-is (they should be validated separately)
    // Sanitize other text fields
    category: offer.category ? sanitizeString(offer.category) : offer.category,
    source: offer.source ? sanitizeString(offer.source) : offer.source,
    tags: offer.tags ? offer.tags.map((tag: string) => sanitizeString(tag)) : offer.tags,
  };
}
