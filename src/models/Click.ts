import mongoose, { Schema, Document } from 'mongoose';

export interface ClickDocument extends Document {
    offerId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    shortCode: string;
    channel: 'telegram' | 'whatsapp' | 'x' | 'instagram' | 'direct' | 'unknown';
    userAgent: string;
    ip: string;
    referer?: string;
    clickedAt: Date;
}

const ClickSchema = new Schema<ClickDocument>({
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    shortCode: { type: String, required: true, index: true },
    channel: {
        type: String,
        enum: ['telegram', 'whatsapp', 'x', 'instagram', 'direct', 'unknown'],
        default: 'unknown'
    },
    userAgent: { type: String },
    ip: { type: String },
    referer: { type: String },
    clickedAt: { type: Date, default: Date.now, index: true }
});

// Índices para queries rápidas
ClickSchema.index({ offerId: 1, clickedAt: -1 });
ClickSchema.index({ userId: 1, clickedAt: -1 });
ClickSchema.index({ shortCode: 1 });
ClickSchema.index({ clickedAt: -1 });

export const ClickModel = mongoose.model<ClickDocument>('Click', ClickSchema);
