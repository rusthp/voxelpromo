import mongoose, { Document, Schema } from 'mongoose';

export interface INewsItem extends Document {
    title: string;
    content: string; // HTML allowed
    type: 'feature' | 'fix' | 'announcement' | 'improvement';
    published: boolean;
    publishedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
}

const NewsItemSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        content: { type: String, required: true },
        type: {
            type: String,
            enum: ['feature', 'fix', 'announcement', 'improvement'],
            default: 'feature'
        },
        published: { type: Boolean, default: true },
        publishedAt: { type: Date, default: Date.now },
        tags: [{ type: String }],
    },
    { timestamps: true }
);

// Indexes for faster querying
NewsItemSchema.index({ published: 1, publishedAt: -1 });

export default mongoose.model<INewsItem>('NewsItem', NewsItemSchema);
