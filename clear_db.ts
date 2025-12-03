import mongoose from 'mongoose';
import { OfferModel } from './src/models/Offer';
import { ProductStatsModel } from './src/models/ProductStats';
import dotenv from 'dotenv';

dotenv.config();

async function clearDb() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';
        console.log(`Connecting to ${uri}...`);
        await mongoose.connect(uri);
        console.log('✅ Connected to DB');

        const offerCount = await OfferModel.countDocuments();
        console.log(`Found ${offerCount} offers to delete.`);

        if (offerCount > 0) {
            await OfferModel.deleteMany({});
            console.log('🗑️  All offers deleted.');
        }

        const statsCount = await ProductStatsModel.countDocuments();
        console.log(`Found ${statsCount} product stats to delete.`);

        if (statsCount > 0) {
            await ProductStatsModel.deleteMany({});
            console.log('🗑️  All product stats deleted.');
        }

        console.log('✨ Database cleared successfully.');

    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB');
    }
}

clearDb();
