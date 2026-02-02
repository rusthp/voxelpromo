import mongoose, { Schema, Document } from 'mongoose';
import { Offer } from '../types';

export interface OfferDocument extends Omit<Offer, '_id' | 'userId'>, Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}

const OfferSchema = new Schema<OfferDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, index: true },
    description: { type: String, required: true },
    originalPrice: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    discount: { type: Number, required: true },
    discountPercentage: { type: Number, required: true },
    currency: { type: String, default: 'BRL' },
    imageUrl: { type: String, required: true },
    productUrl: { type: String, required: true, unique: true },
    affiliateUrl: { type: String, required: true },
    source: {
      type: String,
      enum: ['amazon', 'aliexpress', 'shopee', 'mercadolivre', 'rss', 'manual', 'awin'],
      required: true,
      index: true,
    },
    category: { type: String, required: true, index: true },
    subcategory: { type: String },
    rating: { type: Number, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    availability: { type: String },
    brand: { type: String },
    tags: [{ type: String }],
    coupons: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
    isPosted: { type: Boolean, default: false, index: true },
    postedAt: { type: Date },
    postedChannels: [{ type: String }],
    aiGeneratedPost: { type: String },
    scheduledAt: { type: Date, index: true },
    shortCode: { type: String, unique: true, sparse: true },
    clicks: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
OfferSchema.index({ createdAt: -1 });
OfferSchema.index({ discountPercentage: -1 });
OfferSchema.index({ isActive: 1, isPosted: 1 });
OfferSchema.index({ source: 1, category: 1 });

// Compound index for common queries: active offers sorted by date and discount
OfferSchema.index({ isActive: 1, createdAt: -1, discountPercentage: -1 });

// Scheduled posts index (for cron job efficiency)
OfferSchema.index({ isPosted: 1, scheduledAt: 1 });

// Source and date index (analytics queries)
OfferSchema.index({ source: 1, createdAt: -1 });

// Category and discount index (finding best deals per category)
OfferSchema.index({ category: 1, discountPercentage: -1 });

// Multi-tenant indexes (critical for SaaS)
OfferSchema.index({ userId: 1, createdAt: -1 });
OfferSchema.index({ userId: 1, isActive: 1, createdAt: -1 });
OfferSchema.index({ userId: 1, isPosted: 1, scheduledAt: 1 });

// Generate unique shortCode on creation (with collision prevention)
OfferSchema.pre('save', async function (next) {
  if (this.isNew && !this.shortCode) {
    let code;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (exists && attempts < maxAttempts) {
      code = Math.random().toString(36).substring(2, 8);
      const doc = await mongoose.models.Offer.exists({ shortCode: code });
      exists = doc !== null;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique shortCode after 10 attempts');
    }

    this.shortCode = code;
  }
  next();
});

export const OfferModel = mongoose.model<OfferDocument>('Offer', OfferSchema);
