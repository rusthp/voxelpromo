
import mongoose from 'mongoose';
import { OfferModel } from '../src/models/Offer';
import { OfferService } from '../src/services/offer/OfferService';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';

async function verifycleanup() {
    try {
        await mongoose.connect(MONGODB_URI);
        logger.info('Connected to MongoDB');

        const offerService = new OfferService();

        // 1. Create test data
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 5); // 5 days old

        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 1); // 1 day old

        await OfferModel.create({
            title: 'TEST OLD OFFER',
            description: 'Test Description',
            originalPrice: 100,
            currentPrice: 80,
            discount: 20,
            discountPercentage: 20,
            imageUrl: 'http://example.com/image.jpg',
            productUrl: 'http://example.com/old-offer',
            affiliateUrl: 'http://example.com/old-offer',
            source: 'manual',
            category: 'Test',
            createdAt: oldDate,
            isActive: true
        });

        await OfferModel.create({
            title: 'TEST RECENT OFFER',
            description: 'Test Description',
            originalPrice: 100,
            currentPrice: 80,
            discount: 20,
            discountPercentage: 20,
            imageUrl: 'http://example.com/image.jpg',
            productUrl: 'http://example.com/recent-offer',
            affiliateUrl: 'http://example.com/recent-offer',
            source: 'manual',
            category: 'Test',
            createdAt: recentDate,
            isActive: true
        });

        logger.info('Created test offers (1 old, 1 recent)');

        // 2. Run cleanup
        logger.info('Running cleanup (keeping 3 days)...');
        const count = await offerService.cleanupOldOffers(3);
        logger.info(`Cleanup returned: ${count}`);

        // 3. Verify
        const oldOffer = await OfferModel.findOne({ productUrl: 'http://example.com/old-offer' });
        const recentOffer = await OfferModel.findOne({ productUrl: 'http://example.com/recent-offer' });

        if (oldOffer?.isActive === false && recentOffer?.isActive === true) {
            logger.info('✅ VERIFICATION PASSED: Old offer deactivated, recent offer stays active.');
        } else {
            logger.error('❌ VERIFICATION FAILED');
            logger.error(`Old Offer Active: ${oldOffer?.isActive}`);
            logger.error(`Recent Offer Active: ${recentOffer?.isActive}`);
        }

        // Cleanup test data
        await OfferModel.deleteOne({ productUrl: 'http://example.com/old-offer' });
        await OfferModel.deleteOne({ productUrl: 'http://example.com/recent-offer' });

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifycleanup();
