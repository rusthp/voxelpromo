import mongoose from 'mongoose';
import { CollectorService } from '../src/services/collector/CollectorService';
import { ScrapingBatchModel } from '../src/models/ScrapingBatch';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';

dotenv.config();

async function testDailyStorage() {
    try {
        // Connect to DB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo');
        logger.info('✅ Connected to DB');

        // Clear existing batch for today to test fresh run
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await ScrapingBatchModel.deleteOne({ source: 'mercadolivre-daily-deals', date: today });
        logger.info('🧹 Cleared existing batch for today');

        const collector = new CollectorService();

        // 1. First Run
        logger.info('🏃 Running 1st Collection (Should scrape)...');
        const count1 = await collector.collectDailyDealsFromMercadoLivre();
        logger.info(`✅ 1st Run Result: ${count1} offers`);

        // Verify batch created
        const batch = await ScrapingBatchModel.findOne({ source: 'mercadolivre-daily-deals', date: today });
        if (batch && batch.status === 'completed') {
            logger.info('✅ Batch record found and completed');
        } else {
            logger.error('❌ Batch record missing or not completed');
        }

        // 2. Second Run
        logger.info('🏃 Running 2nd Collection (Should skip)...');
        const count2 = await collector.collectDailyDealsFromMercadoLivre();
        logger.info(`✅ 2nd Run Result: ${count2} offers`);

        if (count2 === batch?.itemsCount) {
            logger.info('✅ 2nd run returned cached count (Success)');
        } else {
            logger.warn(`⚠️ 2nd run returned ${count2}, expected ${batch?.itemsCount}`);
        }

    } catch (error: any) {
        logger.error(`❌ Test failed: ${error.message}`);
    } finally {
        await mongoose.disconnect();
    }
}

testDailyStorage();
