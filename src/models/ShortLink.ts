import mongoose, { Schema, Document } from 'mongoose';

export interface ShortLinkDocument extends Document {
    code: string;
    originalUrl: string;
    shortUrl: string;
    clicks: number;
    source: string;
    offerId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    isActive: boolean;
}

const ShortLinkSchema = new Schema<ShortLinkDocument>(
    {
        code: { type: String, required: true, unique: true, index: true },
        originalUrl: { type: String, required: true },
        shortUrl: { type: String, required: true },
        clicks: { type: Number, default: 0 },
        source: { type: String, default: 'mercadolivre' },
        offerId: { type: Schema.Types.ObjectId, ref: 'Offer' },
        expiresAt: { type: Date },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

// Indexes
ShortLinkSchema.index({ originalUrl: 1 });
ShortLinkSchema.index({ createdAt: -1 });
ShortLinkSchema.index({ clicks: -1 });

export const ShortLinkModel = mongoose.model<ShortLinkDocument>('ShortLink', ShortLinkSchema);
