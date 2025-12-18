import mongoose from 'mongoose';
import { OfferModel } from './src/models/Offer';
import dotenv from 'dotenv';

dotenv.config();

async function checkDb() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo');
        console.log('Connected to DB');

        const total = await OfferModel.countDocuments();
        const posted = await OfferModel.countDocuments({ isPosted: true });
        const notPosted = await OfferModel.countDocuments({ isPosted: false });

        console.log('--- DB STATS ---');
        console.log(`Total: ${total}`);
        console.log(`Posted: ${posted}`);
        console.log(`Not Posted: ${notPosted}`);

        const sample = await OfferModel.findOne().sort({ createdAt: -1 });
        if (sample) {
            console.log('--- SAMPLE OFFER ---');
            console.log(JSON.stringify(sample.toJSON(), null, 2));
        } else {
            console.log('No offers found');
        }

        const avg = await OfferModel.aggregate([
            {
                $group: {
                    _id: null,
                    avgDiscount: { $avg: '$discountPercentage' }
                }
            }
        ]);
        console.log('--- AVG DISCOUNT ---');
        console.log(JSON.stringify(avg, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkDb();
