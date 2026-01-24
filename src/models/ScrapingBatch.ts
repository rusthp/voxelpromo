import mongoose, { Schema, Document } from 'mongoose';

export interface IScrapingBatch extends Document {
  source: string;
  date: Date; // Normalized to start of day (YYYY-MM-DD)
  status: 'pending' | 'completed' | 'failed';
  itemsCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScrapingBatchSchema = new Schema<IScrapingBatch>(
  {
    source: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    itemsCount: { type: Number, default: 0 },
    errorMessage: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique batch per source per day
ScrapingBatchSchema.index({ source: 1, date: 1 }, { unique: true });

export const ScrapingBatchModel = mongoose.model<IScrapingBatch>(
  'ScrapingBatch',
  ScrapingBatchSchema
);
