import mongoose, { Schema, Document } from 'mongoose';

export interface HourlyStats {
  hour: number; // 0-23
  views: number;
  clicks: number;
  conversions: number;
}

export interface ProductStatsDocument extends Document {
  productUrl: string;
  productId?: string;
  source: string;

  // Aggregate stats
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
  totalPosts: number;

  // Hourly breakdown
  hourlyStats: HourlyStats[];

  // Calculated scores (0-100)
  salesScore: number;
  popularityScore: number;
  peakHourScore: number;

  // Metadata
  lastPostedAt?: Date;
  lastUpdatedAt: Date;
  createdAt: Date;

  // Methods
  incrementPost(): void;
  calculateScores(): void;
}

const HourlyStatsSchema = new Schema({
  hour: { type: Number, required: true, min: 0, max: 23 },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
});

const ProductStatsSchema = new Schema<ProductStatsDocument>({
  productUrl: { type: String, required: true, unique: true, index: true },
  productId: { type: String, index: true },
  source: { type: String, required: true, index: true },

  // Overall stats
  totalViews: { type: Number, default: 0 },
  totalClicks: { type: Number, default: 0 },
  totalConversions: { type: Number, default: 0 },
  totalPosts: { type: Number, default: 0 },

  // Hourly breakdown
  hourlyStats: { type: [HourlyStatsSchema], default: [] },

  // Scores
  salesScore: { type: Number, default: 0, min: 0, max: 100 },
  popularityScore: { type: Number, default: 0, min: 0, max: 100 },
  peakHourScore: { type: Number, default: 0, min: 0, max: 100 },

  // Timestamps
  lastPostedAt: { type: Date },
  lastUpdatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for efficient queries
ProductStatsSchema.index({ salesScore: -1 });
ProductStatsSchema.index({ popularityScore: -1 });
ProductStatsSchema.index({ peakHourScore: -1 });
ProductStatsSchema.index({ source: 1, salesScore: -1 });
ProductStatsSchema.index({ lastPostedAt: -1 });

// 🚀 TURBO: Additional compound indexes for fastest lookups
ProductStatsSchema.index({ productUrl: 1, lastUpdatedAt: -1 }, { name: 'product_recent_stats' });
ProductStatsSchema.index(
  { source: 1, salesScore: -1, peakHourScore: -1 },
  { name: 'source_best_products' }
);
ProductStatsSchema.index({ totalPosts: -1, salesScore: -1 }, { name: 'popular_high_converting' });

// Method to update stats
ProductStatsSchema.methods.incrementPost = function () {
  this.totalPosts += 1;
  this.lastPostedAt = new Date();
  this.lastUpdatedAt = new Date();
};

ProductStatsSchema.methods.recordView = function (hour: number) {
  this.totalViews += 1;
  this.lastUpdatedAt = new Date();

  // Update hourly stats
  const hourlyEntry = this.hourlyStats.find((h: HourlyStats) => h.hour === hour);
  if (hourlyEntry) {
    hourlyEntry.views += 1;
  } else {
    this.hourlyStats.push({ hour, views: 1, clicks: 0, conversions: 0 });
  }
};

ProductStatsSchema.methods.recordClick = function (hour: number) {
  this.totalClicks += 1;
  this.lastUpdatedAt = new Date();

  const hourlyEntry = this.hourlyStats.find((h: HourlyStats) => h.hour === hour);
  if (hourlyEntry) {
    hourlyEntry.clicks += 1;
  } else {
    this.hourlyStats.push({ hour, views: 0, clicks: 1, conversions: 0 });
  }
};

ProductStatsSchema.methods.recordConversion = function (hour: number) {
  this.totalConversions += 1;
  this.lastUpdatedAt = new Date();

  const hourlyEntry = this.hourlyStats.find((h: HourlyStats) => h.hour === hour);
  if (hourlyEntry) {
    hourlyEntry.conversions += 1;
  } else {
    this.hourlyStats.push({ hour, views: 0, clicks: 0, conversions: 1 });
  }
};

// Calculate scores (call this periodically or on demand)
ProductStatsSchema.methods.calculateScores = function () {
  // Sales score: based on conversions per post
  const conversionRate = this.totalPosts > 0 ? this.totalConversions / this.totalPosts : 0;
  this.salesScore = Math.min(100, conversionRate * 100);

  // Popularity score: based on click rate
  const clickRate = this.totalViews > 0 ? this.totalClicks / this.totalViews : 0;
  this.popularityScore = Math.min(100, clickRate * 100);

  // Peak hour score: performance in typical peak hours (12-14, 19-22)
  const peakHours = [12, 13, 14, 19, 20, 21, 22];
  const peakStats = this.hourlyStats.filter((h: HourlyStats) => peakHours.includes(h.hour));
  const peakConversions = peakStats.reduce((sum: number, h: HourlyStats) => sum + h.conversions, 0);
  const peakTotal = peakStats.reduce((sum: number, h: HourlyStats) => sum + h.views, 0);
  const peakRate = peakTotal > 0 ? peakConversions / peakTotal : 0;
  this.peakHourScore = Math.min(100, peakRate * 100);

  this.lastUpdatedAt = new Date();
};

export const ProductStatsModel = mongoose.model<ProductStatsDocument>(
  'ProductStats',
  ProductStatsSchema
);
