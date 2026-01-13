/**
 * Script to mark existing users as email verified
 * Run with: npx ts-node scripts/verify-existing-users.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not set');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
        console.error('Database not available');
        process.exit(1);
    }

    // Update all users without emailVerified field to be verified
    const result = await db.collection('users').updateMany(
        { emailVerified: { $exists: false } },
        { $set: { emailVerified: true } }
    );

    console.log(`Updated ${result.modifiedCount} existing users to emailVerified: true`);

    // Also update admin explicitly
    const adminResult = await db.collection('users').updateOne(
        { email: 'admin@voxelpromo.com' },
        { $set: { emailVerified: true } }
    );

    console.log(`Admin user updated: ${adminResult.modifiedCount > 0 ? 'Yes' : 'Already verified or not found'}`);

    await mongoose.disconnect();
    console.log('Done!');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
