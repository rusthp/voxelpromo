/**
 * Fix user subscription.status from 'active' to 'authorized'
 * Run with: npx ts-node scripts/fix-subscription-status.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixSubscriptionStatus() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected!');

        // Update all users with status 'active' to 'authorized'
        const result = await mongoose.connection.db!.collection('users').updateMany(
            { 'subscription.status': 'active' },
            { $set: { 'subscription.status': 'authorized' } }
        );

        console.log(`Updated ${result.modifiedCount} users`);

        // Also check for any 'plan.status' that might have the same issue
        const planResult = await mongoose.connection.db!.collection('users').updateMany(
            { 'plan.status': 'active' },
            { $set: { 'plan.status': 'active' } } // This one is valid, just logging
        );

        console.log(`Found ${planResult.matchedCount} users with plan.status: active (this is valid)`);

        await mongoose.disconnect();
        console.log('Done!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixSubscriptionStatus();
