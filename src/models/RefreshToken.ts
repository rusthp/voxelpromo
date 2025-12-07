import mongoose, { Schema, Document } from 'mongoose';

export interface RefreshTokenDocument extends Document {
    token: string;
    userId: mongoose.Types.ObjectId;
    expiresAt: Date;
    createdAt: Date;
    isRevoked: boolean;
    ipAddress?: string;
    userAgent?: string;
}

const RefreshTokenSchema = new Schema<RefreshTokenDocument>({
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// Index for efficient queries
RefreshTokenSchema.index({ token: 1 });
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

export const RefreshTokenModel = mongoose.model<RefreshTokenDocument>('RefreshToken', RefreshTokenSchema);
