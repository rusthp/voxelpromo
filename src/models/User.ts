import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserPreferences {
  theme: 'dark' | 'light';
  emailNotifications: boolean;
  pushNotifications: boolean;
  niche?: 'tech' | 'fashion' | 'health' | 'home' | 'sports' | 'games' | 'general' | null;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string; // Optional for Google OAuth users
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin?: Date;
  // OAuth fields
  googleId?: string; // Google user ID (sub claim)
  authProvider: 'local' | 'google'; // Authentication method
  // Profile fields
  displayName?: string;
  avatarUrl?: string;
  preferences: IUserPreferences;
  filters?: {
    whitelist: string[];
    blacklist: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;

  // =================================================================
  // ACCESS CONTROL (Business Logic)
  // Source of Truth for App Permissions
  // =================================================================
  access: {
    plan: 'FREE' | 'TRIAL' | 'PRO' | 'AGENCY';
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
    trialEndsAt?: Date;
    validUntil?: Date; // For fixed payments (Pix/Boleto)
    limits?: {
      postsPerDay: number;
    };
  };

  // =================================================================
  // BILLING DATA (Provider Details)
  // Source of Truth for Financials
  // =================================================================
  billing: {
    // Current active provider
    provider?: 'STRIPE' | 'MERCADOPAGO';

    // Stripe Details
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;

    // Mercado Pago Details
    mpSubscriptionId?: string; // For recurring
    mpPaymentId?: string; // For one-off checks

    // Legal / Invoice Data
    type: 'individual' | 'company';
    document: string; // CPF or CNPJ
    name: string;
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

  // Legacy fields to be migrated/removed
  plan?: any;
  subscription?: any;

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
      required: false, // Optional for Google OAuth users
      minlength: 6,
      select: false, // Don't return password by default
    },
    // OAuth fields
    googleId: {
      type: String,
      sparse: true, // Allow null but unique when set
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
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
      niche: {
        type: String,
        enum: ['tech', 'fashion', 'health', 'home', 'sports', 'games', 'general', null],
        default: null,
      },
    },
    // Content Filters
    filters: {
      whitelist: [{ type: String, trim: true }],
      blacklist: [{ type: String, trim: true }],
    },
    // Access Control
    access: {
      plan: {
        type: String,
        enum: ['FREE', 'TRIAL', 'PRO', 'AGENCY'],
        default: 'FREE',
      },
      status: {
        type: String,
        enum: ['ACTIVE', 'PAST_DUE', 'CANCELED'],
        default: 'ACTIVE', // Free is active by default
      },
      trialEndsAt: Date,
      validUntil: Date,
      limits: {
        postsPerDay: { type: Number, default: 10 },
      },
    },

    // Billing Data
    billing: {
      provider: {
        type: String,
        enum: ['STRIPE', 'MERCADOPAGO'],
      },
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      mpSubscriptionId: String,
      mpPaymentId: String,

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

    // Legacy support (to be deprecated)
    plan: { type: Schema.Types.Mixed }, // Weak type to allow migration
    subscription: { type: Schema.Types.Mixed },
    // Email Verification
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpire: {
      type: Date,
      select: false,
    },
    // Password Reset (token stored as SHA256 hash)
    resetPasswordToken: {
      type: String,
      select: false, // Never return by default
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    // Trial Tracking
    hasUsedTrial: {
      type: Boolean,
      default: false,
    },
    // Brute Force Protection
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only for local auth users)
UserSchema.pre('save', async function (next) {
  // Skip if password not modified or if Google OAuth user
  if (!this.isModified('password') || !this.password) {
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

// Validate that local users have password
UserSchema.pre('save', function (next) {
  if (this.authProvider === 'local' && !this.password && this.isNew) {
    return next(new Error('Password is required for local authentication'));
  }
  next();
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
