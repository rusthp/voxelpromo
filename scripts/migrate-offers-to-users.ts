/**
 * Migration script to assign existing offers to admin user
 * Run with: npx ts-node scripts/migrate-offers-to-users.ts
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

    // Find admin user
    const adminUser = await db.collection('users').findOne({ email: 'admin@voxelpromo.com' });

    if (!adminUser) {
        console.error('Admin user not found! Please create admin user first.');
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`Found admin user: ${adminUser.username} (${adminUser._id})`);

    // Count offers without userId
    const orphanedCount = await db.collection('offers').countDocuments({
        userId: { $exists: false }
    });

    console.log(`Found ${orphanedCount} offers without userId`);

    if (orphanedCount === 0) {
        console.log('No migration needed - all offers already have userId');
        await mongoose.disconnect();
        return;
    }

    // Assign all orphaned offers to admin
    const result = await db.collection('offers').updateMany(
        { userId: { $exists: false } },
        { $set: { userId: adminUser._id } }
    );

    console.log(`✅ Migrated ${result.modifiedCount} offers to admin user`);

    // Verify
    const remainingOrphans = await db.collection('offers').countDocuments({
        userId: { $exists: false }
    });

    console.log(`Remaining orphaned offers: ${remainingOrphans}`);

    await mongoose.disconnect();
    console.log('Done!');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
