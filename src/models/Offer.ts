import mongoose, { Schema, Document } from 'mongoose';
import { Offer } from '../types';

export interface OfferDocument extends Omit<Offer, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const OfferSchema = new Schema<OfferDocument>(
  {
    title: { type: String, required: true, index: true },
    description: { type: String, required: true },
    originalPrice: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    discount: { type: Number, required: true },
    discountPercentage: { type: Number, required: true },
    currency: { type: String, default: 'BRL' },
    imageUrl: { type: String, required: true },
    productUrl: { type: String, required: true },
    affiliateUrl: { type: String, required: true },
    source: {
      type: String,
      enum: ['amazon', 'aliexpress', 'shopee', 'rss', 'manual'],
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
    coupons: [{ type: String }], // Códigos de cupom disponíveis
    isActive: { type: Boolean, default: true, index: true },
    isPosted: { type: Boolean, default: false, index: true },
    postedAt: { type: Date },
    postedChannels: [{ type: String }],
    aiGeneratedPost: { type: String },
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

export const OfferModel = mongoose.model<OfferDocument>('Offer', OfferSchema);
