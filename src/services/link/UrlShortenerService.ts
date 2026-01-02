import { ShortLinkModel, ShortLinkDocument } from '../../models/ShortLink';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

interface ShortenerConfig {
    baseUrl: string;
    codeLength: number;
}

export class UrlShortenerService {
    private config: ShortenerConfig;

    constructor() {
        // Default to path-based shortening (no subdomain needed)
        this.config = {
            baseUrl: process.env.SHORT_URL_BASE || process.env.BASE_URL || 'https://voxelpromo.com',
            codeLength: 6,
        };
    }

    /**
     * Generate a unique short code
     */
    private generateCode(length: number = 6): string {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        const randomBytes = crypto.randomBytes(length);
        for (let i = 0; i < length; i++) {
            code += chars[randomBytes[i] % chars.length];
        }
        return code;
    }

    /**
     * Create a short link for a URL
     */
    async createShortLink(
        originalUrl: string,
        options?: { source?: string; offerId?: string; expiresAt?: Date }
    ): Promise<ShortLinkDocument> {
        // Check if link already exists for this URL
        const existing = await ShortLinkModel.findOne({ originalUrl, isActive: true });
        if (existing) {
            logger.debug(`🔗 Reusing existing short link: ${existing.shortUrl}`);
            return existing;
        }

        // Generate unique code
        let code: string;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            code = this.generateCode(this.config.codeLength);
            const exists = await ShortLinkModel.findOne({ code });
            if (!exists) break;
            attempts++;
        } while (attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            // Fallback: use longer code
            code = this.generateCode(10);
        }

        const shortUrl = `${this.config.baseUrl}/s/${code}`;

        const shortLink = new ShortLinkModel({
            code,
            originalUrl,
            shortUrl,
            source: options?.source || 'unknown',
            offerId: options?.offerId,
            expiresAt: options?.expiresAt,
            clicks: 0,
            isActive: true,
        });

        await shortLink.save();
        logger.info(`✅ Short link created: ${shortUrl} → ${originalUrl.substring(0, 60)}...`);

        return shortLink;
    }

    /**
     * Resolve a short code to the original URL
     */
    async resolveCode(code: string): Promise<string | null> {
        const shortLink = await ShortLinkModel.findOne({ code, isActive: true });

        if (!shortLink) {
            logger.warn(`⚠️ Short link not found: ${code}`);
            return null;
        }

        // Check expiration
        if (shortLink.expiresAt && shortLink.expiresAt < new Date()) {
            logger.warn(`⚠️ Short link expired: ${code}`);
            return null;
        }

        // Increment click counter (non-blocking)
        ShortLinkModel.updateOne({ _id: shortLink._id }, { $inc: { clicks: 1 } }).exec();

        return shortLink.originalUrl;
    }

    /**
     * Get stats for a short link
     */
    async getStats(code: string): Promise<ShortLinkDocument | null> {
        return ShortLinkModel.findOne({ code });
    }

    /**
     * Get all short links with pagination
     */
    async getAll(page: number = 1, limit: number = 50): Promise<{
        links: ShortLinkDocument[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const [links, total] = await Promise.all([
            ShortLinkModel.find({ isActive: true })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ShortLinkModel.countDocuments({ isActive: true }),
        ]);

        return {
            links,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Deactivate a short link
     */
    async deactivate(code: string): Promise<boolean> {
        const result = await ShortLinkModel.updateOne({ code }, { isActive: false });
        return result.modifiedCount > 0;
    }

    /**
     * Get top performing links
     */
    async getTopLinks(limit: number = 10): Promise<ShortLinkDocument[]> {
        return ShortLinkModel.find({ isActive: true })
            .sort({ clicks: -1 })
            .limit(limit);
    }
}
