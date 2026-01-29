import mongoose, { Schema, Document } from 'mongoose';

export type TemplateTone = 'casual' | 'professional' | 'urgent' | 'viral' | 'storytelling';

export interface MessageTemplateDocument extends Document {
  name: string;
  tone: TemplateTone;
  content: string; // Template with variables: {title}, {price}, {originalPrice}, {discount}, {discountPercent}, {url}, {source}, {category}
  isActive: boolean;
  isDefault: boolean; // Only one template can be default

  // Usage stats
  timesUsed: number;
  lastUsedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // User ID
}

const MessageTemplateSchema = new Schema<MessageTemplateDocument>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  tone: {
    type: String,
    enum: ['casual', 'professional', 'urgent', 'viral', 'storytelling'],
    required: true,
    default: 'casual',
  },
  content: { type: String, required: true, maxlength: 2000 },
  isActive: { type: Boolean, default: true, index: true },
  isDefault: { type: Boolean, default: false },

  // Stats
  timesUsed: { type: Number, default: 0 },
  lastUsedAt: { type: Date },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: String },
});

// Update updatedAt on save
MessageTemplateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Ensure only one default template
MessageTemplateSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Unset all other default templates
    await mongoose
      .model('MessageTemplate')
      .updateMany({ _id: { $ne: this._id } }, { isDefault: false });
  }
  next();
});

// Indexes
MessageTemplateSchema.index({ isActive: 1, isDefault: 1 });
MessageTemplateSchema.index({ createdAt: -1 });

export const MessageTemplateModel = mongoose.model<MessageTemplateDocument>(
  'MessageTemplate',
  MessageTemplateSchema
);
