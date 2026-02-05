/**
 * Migration Script: Fix Trial Users
 * 
 * This script fixes users who have trial data in the legacy `plan` field
 * instead of the correct `access` field.
 * 
 * Run with: npx ts-node scripts/fix-trial-users.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
}

interface LegacyUser {
    _id: mongoose.Types.ObjectId;
    email: string;
    username: string;
    createdAt: Date;
    plan?: {
        tier?: string;
        status?: string;
        validUntil?: Date;
    };
    access?: {
        plan?: string;
        status?: string;
        trialEndsAt?: Date;
        validUntil?: Date;
    };
}

async function migrate() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db!;
    const usersCollection = db.collection('users');

    // Find users with legacy plan.validUntil set but access.trialEndsAt NOT set
    const usersToFix = await usersCollection.find<LegacyUser>({
        $or: [
            { 'plan.validUntil': { $exists: true }, 'access.trialEndsAt': { $exists: false } },
            { 'plan.status': 'trialing', 'access.plan': { $ne: 'TRIAL' } },
            { 'access.plan': { $exists: false } }
        ]
    }).toArray();

    console.log(`📋 Found ${usersToFix.length} users to fix\n`);

    let fixed = 0;
    let skipped = 0;

    for (const user of usersToFix) {
        console.log(`\n👤 Processing: ${user.email} (created: ${user.createdAt?.toISOString()})`);

        // Determine trial end date
        let trialEndDate: Date | undefined;

        // Priority 1: Use existing access.trialEndsAt if set
        if (user.access?.trialEndsAt) {
            trialEndDate = new Date(user.access.trialEndsAt);
            console.log(`   Using existing access.trialEndsAt: ${trialEndDate.toISOString()}`);
        }
        // Priority 2: Use legacy plan.validUntil if set
        else if (user.plan?.validUntil) {
            trialEndDate = new Date(user.plan.validUntil);
            console.log(`   Using legacy plan.validUntil: ${trialEndDate.toISOString()}`);
        }
        // Priority 3: Calculate from createdAt (7 days trial)
        else if (user.createdAt) {
            trialEndDate = new Date(user.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
            console.log(`   Calculating from createdAt + 7 days: ${trialEndDate.toISOString()}`);
        }

        if (!trialEndDate) {
            console.log(`   ⚠️ SKIPPED: Could not determine trial end date`);
            skipped++;
            continue;
        }

        // Check if trial is expired
        const now = new Date();
        const isTrialExpired = trialEndDate < now;

        // Determine new status
        const newPlan = isTrialExpired ? 'FREE' : 'TRIAL';
        const newStatus = isTrialExpired ? 'CANCELED' : 'ACTIVE';

        console.log(`   Trial expired: ${isTrialExpired ? 'YES' : 'NO'}`);
        console.log(`   New plan: ${newPlan}, status: ${newStatus}`);

        // Update user
        const updateResult = await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    'access.plan': newPlan,
                    'access.status': newStatus,
                    'access.trialEndsAt': trialEndDate,
                    'access.validUntil': trialEndDate,
                }
            }
        );

        if (updateResult.modifiedCount > 0) {
            console.log(`   ✅ FIXED`);
            fixed++;
        } else {
            console.log(`   ⚠️ No changes made`);
            skipped++;
        }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Migration complete!`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${usersToFix.length}`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
}

migrate().catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});
