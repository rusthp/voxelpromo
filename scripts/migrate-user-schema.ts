
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/User';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');

async function migrateUsers() {
    console.log('🔄 Starting User Schema Migration...');
    if (DRY_RUN) console.log('⚠️  DRY RUN MODE: No changes will be saved to database.');

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const users = await UserModel.find({});
        console.log(`📊 Found ${users.length} users to check.`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                // Check idempotency - if access status is already set and valid, we might assume migrated
                // But strict check: if access.plan and access.status are set, we consider it "touched"
                // However, we might want to ensure ALL users have this, even if partially set.
                // Let's check if the specific migration is needed.

                // We'll define "migrated" as: access.plan is defined AND access.status is defined.
                // BUT we also want to ensure billing is populated if legacy subscription exists.

                // Using explicit check for "touched" might be safer.
                // Or simply: check if we need to move data.

                const needsMigration =
                    (!user.access || !user.access.plan || !user.access.status) ||
                    (user.subscription && (!user.billing || !user.billing.provider)); // Legacy subscription exists but billing not set

                if (!needsMigration) {
                    // console.log(`[SKIPPED] User ${user._id} (${user.email}) - Already migrated`);
                    skippedCount++;
                    continue;
                }

                console.log(`[PROCESSING] User ${user._id} (${user.email})...`);

                // Initialize objects if missing
                if (!user.access) {
                    user.access = {
                        plan: 'FREE',
                        status: 'ACTIVE',
                        limits: { postsPerDay: 10 }
                    } as any;
                }

                if (!user.billing) {
                    user.billing = {
                        type: 'individual'
                    } as any;
                }

                // --- MAPPING LOGIC ---

                const legacySub = user.subscription as any;
                const legacyPlan = user.plan as any;

                // 1. Map Plan
                // If legacy plan was 'pro' or subscription planId was 'pro'
                let planId = 'FREE';
                if (legacyPlan?.id === 'pro' || legacySub?.planId === 'pro') {
                    planId = 'PRO';
                } else if (legacySub?.planId === 'agency') {
                    planId = 'AGENCY';
                } else if (legacySub?.planId === 'trial') {
                    planId = 'TRIAL';
                }

                // 2. Map Status
                let status = 'ACTIVE';
                if (legacySub) {
                    if (legacySub.status === 'active' || legacySub.status === 'authorized') {
                        status = 'ACTIVE';
                    } else if (legacySub.status === 'past_due' || legacySub.status === 'unpaid') {
                        status = 'PAST_DUE';
                    } else if (legacySub.status === 'canceled' || legacySub.status === 'cancelled') {
                        status = 'CANCELED';
                    }
                }

                // Apply Mapped Values to Access
                // Only override if currently default/empty, OR if we are forcing migration from legacy
                user.access.plan = planId as any;
                user.access.status = status as any;

                // 3. Map Billing Data
                if (legacySub) {
                    if (legacySub.provider === 'stripe' || legacySub.stripeSubscriptionId) {
                        user.billing.provider = 'STRIPE';
                        user.billing.stripeSubscriptionId = legacySub.stripeSubscriptionId;
                        user.billing.stripeCustomerId = legacySub.customerId; // Assuming legacy stored it here or we rely on sub id
                    } else if (legacySub.provider === 'mercadopago' || legacySub.mpSubscriptionId) {
                        user.billing.provider = 'MERCADOPAGO';
                        user.billing.mpSubscriptionId = legacySub.mpSubscriptionId;
                    }
                }

                // Log actions
                const logMsg = `[MIGRATED] User ${user._id}: Plan=${user.access.plan}, Status=${user.access.status}, Provider=${user.billing.provider || 'N/A'}`;
                console.log(logMsg);

                if (!DRY_RUN) {
                    // @ts-ignore - Bypass mongoose strict checks if any
                    await user.save();
                    migratedCount++;
                } else {
                    migratedCount++; // Count as "would create"
                }

            } catch (err: any) {
                console.error(`❌ Error migrating user ${user._id}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n--- MIGRATION SUMMARY ---');
        console.log(`Checked: ${users.length}`);
        console.log(`Migrated: ${migratedCount}`);
        console.log(`Skipped: ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        if (DRY_RUN) console.log('⚠️  (DRY RUN - No changes saved)');

    } catch (error) {
        console.error('❌ Fatal connection error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected');
        process.exit(0);
    }
}

migrateUsers();
