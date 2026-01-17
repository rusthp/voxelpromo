import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserPreferences {
  theme: 'dark' | 'light';
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin?: Date;
  // Profile fields
  displayName?: string;
  avatarUrl?: string;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  // Billing & Plan
  billing?: {
    type: 'individual' | 'company';
    document: string; // CPF or CNPJ
    name: string; // Legal Name
    phone?: string;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  plan?: {
    tier: 'free' | 'pro' | 'agency';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    validUntil?: Date;
    limits?: {
      postsPerDay: number;
    };
  };
  subscription?: {
    planId: string; // 'trial', 'basic-monthly', 'pro', 'agency', 'premium-annual'
    status: 'active' | 'authorized' | 'pending' | 'paused' | 'cancelled';
    accessType: 'recurring' | 'fixed'; // recurring = card, fixed = pix/boleto
    startDate: Date;
    nextBillingDate?: Date;
    endDate?: Date; // Only for annual plans
    mpSubscriptionId?: string; // MP subscription ID (for recurring)
    mpPaymentId?: string; // Last payment ID
    paymentMethod?: 'card' | 'pix' | 'boleto';
    lastPaymentDate?: Date;
    failedAttempts?: number; // Failed billing attempts
  };
  // Email Verification
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpire?: Date;
  // Password Reset
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  // Trial Tracking
  hasUsedTrial: boolean;
  // Brute Force Protection
  failedLoginAttempts: number;
  lockUntil?: Date;
  isLocked(): boolean;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    // Profile fields
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    preferences: {
      theme: {
        type: String,
        enum: ['dark', 'light'],
        default: 'dark',
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
    },
    // Billing & Plan
    billing: {
      type: {
        type: String,
        enum: ['individual', 'company'],
        default: 'individual',
      },
      document: { type: String, trim: true },
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: {
        street: String,
        number: String,
        complement: String,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
      },
    },
    plan: {
      tier: {
        type: String,
        enum: ['free', 'pro', 'agency'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'trialing', 'past_due', 'canceled'],
        default: 'active',
      },
      validUntil: Date,
      limits: {
        postsPerDay: { type: Number, default: 10 },
      },
    },
    subscription: {
      planId: String,
      status: {
        type: String,
        enum: ['active', 'authorized', 'pending', 'paused', 'cancelled'],
        default: 'pending'
      },
      accessType: {
        type: String,
        enum: ['recurring', 'fixed'],
        default: 'recurring'
      },
      startDate: Date,
      nextBillingDate: Date,
      endDate: Date,
      mpSubscriptionId: String,
      mpPaymentId: String,
      paymentMethod: {
        type: String,
        enum: ['card', 'pix', 'boleto']
      },
      lastPaymentDate: Date,
      failedAttempts: { type: Number, default: 0 }
    },
    // Email Verification
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      select: false
    },
    emailVerificationExpire: {
      type: Date,
      select: false
    },
    // Password Reset (token stored as SHA256 hash)
    resetPasswordToken: {
      type: String,
      select: false // Never return by default
    },
    resetPasswordExpire: {
      type: Date,
      select: false
    },
    // Trial Tracking
    hasUsedTrial: {
      type: Boolean,
      default: false
    },
    // Brute Force Protection
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
UserSchema.methods.isLocked = function (): boolean {
  if (!this.lockUntil) return false;
  return this.lockUntil > new Date();
};

export const UserModel = mongoose.model<IUser>('User', UserSchema);
