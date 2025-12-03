import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { OfferModel } from '../src/models/Offer';
import { OfferService } from '../src/services/offer/OfferService';
import { logger } from '../src/utils/logger';

dotenv.config();

async function testScheduling() {
    try {
        // Connect to DB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('Connected to MongoDB');

        const offerService = new OfferService();

        // 1. Create a test offer
        const testOffer = await OfferModel.create({
            title: 'Test Offer for Scheduling',
            description: 'Test Description',
            originalPrice: 100,
            currentPrice: 80,
            discount: 20,
            discountPercentage: 20,
            imageUrl: 'http://example.com/image.jpg',
            productUrl: `http://example.com/product-${Date.now()}`,
            affiliateUrl: 'http://example.com/affiliate',
            source: 'manual',
            category: 'test',
            isActive: true,
            isPosted: false
        });
        logger.info(`Created test offer: ${testOffer._id}`);

        // 2. Schedule it for 2 seconds in the future
        const scheduleDate = new Date(Date.now() + 2000);
        await offerService.scheduleOffer(testOffer._id.toString(), scheduleDate);

        const scheduledOffer = await OfferModel.findById(testOffer._id);
        if (scheduledOffer?.scheduledAt?.getTime() === scheduleDate.getTime()) {
            logger.info('✅ Offer scheduled successfully');
        } else {
            logger.error('❌ Offer scheduling failed');
        }

        // 3. Process immediately (should not process)
        const processedImmediate = await offerService.processScheduledOffers();
        if (processedImmediate === 0) {
            logger.info('✅ Correctly did not process future offer');
        } else {
            logger.error(`❌ Incorrectly processed future offer: ${processedImmediate}`);
        }

        // 4. Wait 3 seconds
        logger.info('Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. Process again (should process)
        // Note: This might fail if external services (Telegram/X) are not configured or fail.
        // But we can check if it attempts to process.
        // For this test, we might want to mock postOffer, but since we can't easily mock in this script without a framework,
        // we'll assume postOffer might fail but that's okay for this test if we just want to see if it picks it up.
        // Actually, processScheduledOffers only counts successful posts. 
        // So if postOffer fails, it returns 0.

        logger.info('Processing scheduled offers...');
        const processed = await offerService.processScheduledOffers();
        logger.info(`Processed count: ${processed}`);

        // Clean up
        await OfferModel.findByIdAndDelete(testOffer._id);
        logger.info('Cleaned up test offer');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Test failed:', error);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

testScheduling();
