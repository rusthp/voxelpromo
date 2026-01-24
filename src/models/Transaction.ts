import mongoose, { Schema, Document } from 'mongoose';

/**
 * Transaction Model
 *
 * Stores all financial transactions for reporting and analytics.
 * Separate from AuditLog to provide structured financial data.
 */

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;

  type: 'subscription_created' | 'payment_approved' | 'payment_failed' | 'chargeback' | 'refund';

  provider: 'mercadopago'; // Prepared for future gateways

  mpPaymentId: string;
  mpSubscriptionId?: string;

  planId: string;
  planName?: string;

  amount: number; // In centavos (BRL cents)
  currency: 'BRL';

  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded';
  statusDetail?: string; // MP status_detail for debugging

  paymentMethod: 'card' | 'pix' | 'boleto';

  // Denormalized user info for reports (avoids joins)
  userEmail?: string;
  userName?: string;

  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['subscription_created', 'payment_approved', 'payment_failed', 'chargeback', 'refund'],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['mercadopago'],
      default: 'mercadopago',
      required: true,
    },
    mpPaymentId: {
      type: String,
      required: true,
      index: true,
    },
    mpSubscriptionId: {
      type: String,
      sparse: true,
    },
    planId: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ['BRL'],
      default: 'BRL',
      required: true,
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected', 'cancelled', 'refunded'],
      required: true,
      index: true,
    },
    statusDetail: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'pix', 'boleto'],
      required: true,
    },
    userEmail: {
      type: String,
    },
    userName: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Transactions are immutable
  }
);

// Indexes for financial reports
TransactionSchema.index({ createdAt: -1 }); // Recent transactions
TransactionSchema.index({ status: 1, createdAt: -1 }); // Status filtering
TransactionSchema.index({ type: 1, createdAt: -1 }); // Type filtering

// Compound index for monthly revenue calculation
TransactionSchema.index({
  status: 1,
  type: 1,
  createdAt: -1,
});

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);
