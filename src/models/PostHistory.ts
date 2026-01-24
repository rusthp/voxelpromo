import mongoose, { Schema, Document } from 'mongoose';

export interface PostHistoryDocument extends Document {
  offerId: mongoose.Types.ObjectId;
  platform: 'telegram' | 'x' | 'whatsapp' | 'instagram';
  postedAt: Date;
  postContent: string;
  status: 'success' | 'failed';
  error?: string;
  metadata?: {
    messageId?: string;
    chatId?: string;
    tweetId?: string;
    likes?: number;
    retweets?: number;
    views?: number;
    // Instagram specific
    mediaId?: string;
    mediaType?: 'story' | 'reel' | 'post' | 'dm';
    mediaUrl?: string;
    affiliateUrl?: string; // Link de afiliado para conversão
    caption?: string; // Legenda usada
    expiresAt?: Date;
    insights?: {
      impressions?: number;
      reach?: number;
      likes?: number;
      comments?: number;
      shares?: number;
      saved?: number;
    };
  };
}

const PostHistorySchema = new Schema<PostHistoryDocument>({
  offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
  platform: {
    type: String,
    enum: ['telegram', 'x', 'whatsapp', 'instagram'],
    required: true,
  },
  postedAt: { type: Date, default: Date.now, index: true },
  postContent: { type: String, required: true },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success',
  },
  error: { type: String },
  metadata: {
    messageId: { type: String },
    chatId: { type: String },
    tweetId: { type: String },
    likes: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    // Instagram specific
    mediaId: { type: String },
    mediaType: { type: String, enum: ['story', 'reel', 'post', 'dm'] },
    mediaUrl: { type: String },
    affiliateUrl: { type: String },
    caption: { type: String },
    expiresAt: { type: Date },
    insights: {
      impressions: { type: Number },
      reach: { type: Number },
      likes: { type: Number },
      comments: { type: Number },
      shares: { type: Number },
      saved: { type: Number },
    },
  },
});

// Indexes for efficient queries
PostHistorySchema.index({ offerId: 1, postedAt: -1 });
PostHistorySchema.index({ platform: 1, postedAt: -1 });
PostHistorySchema.index({ status: 1, postedAt: -1 });
PostHistorySchema.index({ 'metadata.mediaId': 1 });

export const PostHistoryModel = mongoose.model<PostHistoryDocument>(
  'PostHistory',
  PostHistorySchema
);
