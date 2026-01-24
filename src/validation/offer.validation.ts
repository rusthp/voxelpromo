import Joi from 'joi';

/**
 * Validation schemas for Offer endpoints
 */

export const createOfferSchema = Joi.object({
  title: Joi.string().min(3).max(500).required(),
  description: Joi.string().min(10).max(5000).required(),
  originalPrice: Joi.number().positive().required(),
  currentPrice: Joi.number().positive().required(),
  discount: Joi.number().min(0).required(),
  discountPercentage: Joi.number().min(0).max(100).required(),
  currency: Joi.string().length(3).default('BRL'),
  imageUrl: Joi.string().uri().required(),
  productUrl: Joi.string().uri().required(),
  affiliateUrl: Joi.string().uri().required(),
  source: Joi.string().valid('amazon', 'aliexpress', 'shopee', 'rss', 'manual').required(),
  category: Joi.string().min(2).max(100).required(),
  subcategory: Joi.string().min(2).max(100).optional(),
  rating: Joi.number().min(0).max(5).optional(),
  reviewsCount: Joi.number().min(0).optional(),
  availability: Joi.string().max(100).optional(),
  brand: Joi.string().max(200).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  coupons: Joi.array().items(Joi.string().max(100)).optional(),
});

export const updateOfferSchema = Joi.object({
  title: Joi.string().min(3).max(500).optional(),
  description: Joi.string().min(10).max(5000).optional(),
  originalPrice: Joi.number().positive().optional(),
  currentPrice: Joi.number().positive().optional(),
  discount: Joi.number().min(0).optional(),
  discountPercentage: Joi.number().min(0).max(100).optional(),
  currency: Joi.string().length(3).optional(),
  imageUrl: Joi.string().uri().optional(),
  productUrl: Joi.string().uri().optional(),
  affiliateUrl: Joi.string().uri().optional(),
  source: Joi.string().valid('amazon', 'aliexpress', 'shopee', 'rss', 'manual').optional(),
  category: Joi.string().min(2).max(100).optional(),
  subcategory: Joi.string().min(2).max(100).optional(),
  rating: Joi.number().min(0).max(5).optional(),
  reviewsCount: Joi.number().min(0).optional(),
  availability: Joi.string().max(100).optional(),
  brand: Joi.string().max(200).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  coupons: Joi.array().items(Joi.string().max(100)).optional(),
  isActive: Joi.boolean().optional(),
}).min(1); // At least one field must be provided

export const filterOffersSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  skip: Joi.number().integer().min(0).default(0),
  source: Joi.string().valid('amazon', 'aliexpress', 'shopee', 'rss', 'manual').optional(),
  category: Joi.string().max(100).optional(),
  minDiscount: Joi.number().min(0).max(100).optional(),
  excludePosted: Joi.boolean().optional(),
  sort: Joi.string()
    .valid('createdAt', '-createdAt', 'discountPercentage', '-discountPercentage')
    .default('-createdAt'),
});

export const scheduleOfferSchema = Joi.object({
  offerIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required(),
  scheduledFor: Joi.date().iso().greater('now').required(),
  platforms: Joi.array()
    .items(Joi.string().valid('telegram', 'x', 'whatsapp'))
    .min(1)
    .required(),
});

export const postOffersSchema = Joi.object({
  offerIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(10)
    .required(),
  platforms: Joi.array()
    .items(Joi.string().valid('telegram', 'x', 'whatsapp'))
    .min(1)
    .required(),
});
