import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actor: {
    userId?: mongoose.Types.ObjectId;
    actorType: 'USER' | 'SYSTEM';
    username: string;
    email: string;
    role: string;
    ip?: string;
    userAgent?: string;
  };
  action: string;
  category: 'AUTH' | 'OFFER' | 'USER' | 'SYSTEM' | 'BILLING';
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  details?: Record<string, any>;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
      actorType: {
        type: String,
        enum: ['USER', 'SYSTEM'],
        required: true,
        default: 'SYSTEM',
      },
      username: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true },
      ip: String,
      userAgent: String,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['AUTH', 'OFFER', 'USER', 'SYSTEM', 'BILLING'],
      required: true,
      index: true,
    },
    resource: {
      type: { type: String },
      id: { type: String },
      name: { type: String },
    },
    details: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
    },
    errorMessage: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Logs are immutable, no update
    expireAfterSeconds: 60 * 60 * 24 * 90, // Auto-delete after 90 days
  }
);

// Indexes for fast filtering
AuditLogSchema.index({ 'actor.userId': 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
