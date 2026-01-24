/**
 * Offer Domain Types for VoxelPromo
 *
 * Type definitions for offer management, filtering, and multi-tenant context.
 * These types prepare OfferService for safe refactoring.
 */

import { Types } from 'mongoose';

// ============================================================
// Offer Context (Multi-Tenant)
// ============================================================

/**
 * Context for user-scoped operations
 */
export interface OfferContext {
  userId?: string;
  settings?: UserOfferSettings;
}

/**
 * User-specific offer settings
 */
export interface UserOfferSettings {
  filters?: OfferFilterConfig;
  channels?: ChannelConfig;
}

// ============================================================
// Filter Types
// ============================================================

/**
 * Content filter configuration (whitelist/blacklist)
 */
export interface OfferFilterConfig {
  whitelist?: string[];
  blacklist?: string[];
}

/**
 * Query filter options for offer search
 */
export interface OfferQueryFilter {
  isActive?: boolean;
  userId?: string;
  minDiscount?: number;
  maxPrice?: number;
  minPrice?: number;
  minRating?: number;
  categories?: string[];
  sources?: string[];
  excludePosted?: boolean;
  search?: string;
}

/**
 * Pagination and sorting options
 */
export interface OfferPaginationOptions {
  limit?: number;
  skip?: number;
  sortBy?: 'newest' | 'discount' | 'price_asc' | 'price_desc';
}

// ============================================================
// Channel Types
// ============================================================

export type MessagingChannel = 'telegram' | 'whatsapp' | 'x' | 'twitter' | 'instagram';

export interface ChannelConfig {
  enabled: MessagingChannel[];
  telegram?: {
    botToken?: string;
    channelId?: string;
  };
}

export interface PostResult {
  success: boolean;
  channel: MessagingChannel;
  error?: string;
}

// ============================================================
// Offer Document Types
// ============================================================

/**
 * MongoDB offer query type
 */
export interface OfferQuery {
  isActive?: boolean;
  userId?: string | Types.ObjectId;
  productUrl?: string | { $in?: string[]; $regex?: RegExp };
  discountPercentage?: { $gte?: number };
  currentPrice?: { $gte?: number; $lte?: number };
  rating?: { $gte?: number };
  category?: { $in?: string[] };
  source?: { $in?: string[] };
  title?: { $regex?: string; $options?: string };
  isPosted?: boolean;
  $or?: Array<{ productUrl?: { $in?: string[] } | { $regex?: RegExp } }>;
  _id?: string | Types.ObjectId;
}

/**
 * Lean offer document from MongoDB
 */
export interface OfferDocument {
  _id: Types.ObjectId | string;
  title: string;
  description?: string;
  productUrl: string;
  originalPrice: number;
  currentPrice: number;
  discount: number;
  discountPercentage: number;
  rating?: number;
  reviewsCount?: number;
  category?: string;
  source?: string;
  imageUrl?: string;
  isActive: boolean;
  isPosted?: boolean;
  postedChannels?: string[];
  aiGeneratedPost?: string;
  userId?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// AI Service Types
// ============================================================

export type AITone = 'casual' | 'professional' | 'viral' | 'urgent';

export interface AIPostRequest {
  offerId: string;
  tone?: AITone;
  userId?: string;
}

// ============================================================
// OfferService Responsibility Map
// ============================================================

/**
 * RESPONSIBILITY BOUNDARIES (for future refactoring)
 *
 * 1. SERVICE INITIALIZATION (lines 15-107)
 *    - Lazy loading of 6 services: AI, Telegram, WhatsApp, X, Instagram, Vectorizer
 *    - Multi-tenant Telegram cache
 *
 * 2. OFFER VALIDATION (lines 142-174)
 *    - validateOfferNumbers: Ensures no NaN values
 *    - sanitizeOffer: External middleware
 *
 * 3. OFFER PERSISTENCE (lines 176-383)
 *    - saveOffer: Single offer upsert
 *    - saveOffers: Batch save with dedup
 *    - convertToOffer: Document → DTO
 *
 * 4. OFFER QUERYING (lines 385-530)
 *    - filterOffers: Complex filter queries
 *    - getAllOffers: Paginated list
 *    - getOfferById: Single lookup
 *
 * 5. AI CONTENT GENERATION (lines 532-564)
 *    - generateAIPost: Create marketing text
 *
 * 6. CHANNEL DISPATCH (lines 566-818)
 *    - postOffer: Multi-channel posting with filters
 *    - Content filter application (whitelist/blacklist)
 *    - PostHistory tracking
 *
 * 7. BATCH OPERATIONS (lines 820-897)
 *    - postOffers: Batch posting
 *    - deleteOffer, deleteOffers, deleteAllOffers
 *
 * 8. SCHEDULING (lines 926-1003)
 *    - scheduleOffer: Set post date
 *    - processScheduledOffers: Cron job handler
 *
 * 9. MAINTENANCE (lines 1005-1036)
 *    - delay: Helper
 *    - cleanupOldOffers: Data retention
 */
