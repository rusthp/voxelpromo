import mongoose, { Schema, Document } from 'mongoose';

export interface PeakHour {
    start: number; // Hour (0-23)
    end: number; // Hour (0-23)
    priority: number; // 1-10
}

export interface AutomationConfigDocument extends Document {
    isActive: boolean;

    // Schedule settings
    startHour: number; // 0-23 (default: 8)
    endHour: number; // 0-23 (default: 1)
    intervalMinutes: number; // Minutes between posts (default: 30)
    peakHours: PeakHour[]; // Peak hours configuration

    // Filters
    enabledSources: string[]; // ['amazon', 'aliexpress', 'mercadolivre', 'shopee']
    enabledCategories: string[]; // Categories to include (empty = all)
    productTypes: string[]; // ['electronics', 'fashion', 'home', etc.]
    minDiscount: number; // Minimum discount % (default: 0)
    maxPrice: number; // Maximum price (default: 0 = no limit)
    postsPerHour: number; // 0 = use intervalMinutes, >0 = smart random distribution

    // Prioritization
    prioritizeBestSellersInPeak: boolean; // Prioritize best sellers during peak hours
    prioritizeBigDiscountsInPeak: boolean; // Prioritize big discounts during peak hours
    discountWeightVsSales: number; // 0-100, weight of discount vs sales in prioritization

    // Channels
    enabledChannels: string[]; // ['telegram', 'whatsapp', 'x']

    // Template
    messageTemplateId?: mongoose.Types.ObjectId; // Reference to MessageTemplate

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string; // User ID
}

const PeakHourSchema = new Schema({
    start: { type: Number, required: true, min: 0, max: 23 },
    end: { type: Number, required: true, min: 0, max: 23 },
    priority: { type: Number, required: true, min: 1, max: 10, default: 5 },
});

const AutomationConfigSchema = new Schema<AutomationConfigDocument>({
    isActive: { type: Boolean, default: false, index: true },

    // Schedule
    startHour: { type: Number, required: true, min: 0, max: 23, default: 8 },
    endHour: { type: Number, required: true, min: 0, max: 23, default: 1 },
    intervalMinutes: { type: Number, required: true, min: 5, max: 1440, default: 30 },
    peakHours: { type: [PeakHourSchema], default: [] },

    // Filters
    enabledSources: { type: [String], default: ['amazon', 'aliexpress', 'mercadolivre', 'shopee'] },
    enabledCategories: { type: [String], default: [] }, // Empty = all categories
    productTypes: { type: [String], default: [] }, // Empty = all types
    minDiscount: { type: Number, default: 0, min: 0, max: 100 },
    maxPrice: { type: Number, default: 0, min: 0 }, // 0 = no limit
    postsPerHour: { type: Number, default: 0, min: 0 }, // 0 = use intervalMinutes, >0 = smart random distribution

    // Prioritization
    prioritizeBestSellersInPeak: { type: Boolean, default: true },
    prioritizeBigDiscountsInPeak: { type: Boolean, default: true },
    discountWeightVsSales: { type: Number, default: 50, min: 0, max: 100 },

    // Channels
    enabledChannels: { type: [String], default: ['telegram'] },

    // Template
    messageTemplateId: { type: Schema.Types.ObjectId, ref: 'MessageTemplate' },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: String },
});

// Update updatedAt on save
AutomationConfigSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// 🚀 TURBO: Optimized indexes for faster queries
AutomationConfigSchema.index({ isActive: 1 }, { name: 'active_config_lookup' });
AutomationConfigSchema.index({ isActive: 1, updatedAt: -1 }, { name: 'active_recent_config' });

export const AutomationConfigModel = mongoose.model<AutomationConfigDocument>(
    'AutomationConfig',
    AutomationConfigSchema
);
