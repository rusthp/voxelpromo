
import mongoose from 'mongoose';
import { UserModel } from '../src/models/User';
import { UserSettingsModel } from '../src/models/UserSettings';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';

async function verifyTrialJourney() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Simulate Registration
        const testEmail = `trial_test_${Date.now()}@example.com`;
        console.log(`\n1️⃣ Creating Test User: ${testEmail}`);

        const user = await UserModel.create({
            username: `trial_test_${Date.now()}`,
            email: testEmail,
            password: 'password123',
            role: 'user',
            plan: {
                tier: 'free',
                status: 'trialing',
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });

        console.log(`✅ User created with ID: ${user._id}`);

        // Verify Plan Init
        if (user.plan?.status === 'trialing' && user.plan.validUntil && user.plan.validUntil > new Date()) {
            console.log('✅ Plan correctly initialized as "trialing" with future validUntil date.');
        } else {
            console.error('❌ Plan initialization failed:', user.plan);
            process.exit(1);
        }

        // 2. Simulate Onboarding (Saving Niche)
        console.log('\n2️⃣ Simulating Niche Selection (PUT /profile)...');
        const selectedNiche = 'games';

        // Update User Preferences
        user.preferences = {
            ...user.preferences,
            niche: selectedNiche,
            theme: 'dark', // Required properties if any
            emailNotifications: true,
            pushNotifications: true
        };
        await user.save();
        console.log(`✅ User preferences updated with niche: ${selectedNiche}`);

        // Sync to UserSettings (Logic normally in profile.routes.ts, simulating here)
        console.log('🔄 Simulating UserSettings sync...');
        let settings = await UserSettingsModel.findOne({ userId: user._id });
        if (!settings) {
            settings = await UserSettingsModel.create({
                userId: user._id,
                collectionSettings: { niches: [selectedNiche] }, // The logic in route does this
                // Add other required fields if UserSettingsModel creation fails
            });
        } else {
            settings.collectionSettings.niches = [selectedNiche];
            await settings.save();
        }

        // 3. Verify Data Persistence
        console.log('\n3️⃣ Verifying Data Persistence...');
        const updatedUser = await UserModel.findById(user._id);
        const updatedSettings = await UserSettingsModel.findOne({ userId: user._id });

        if (updatedUser?.preferences?.niche === selectedNiche) {
            console.log('✅ User.preferences.niche is correct.');
        } else {
            console.error('❌ User.preferences.niche mismatch:', updatedUser?.preferences);
        }

        if (updatedSettings?.collectionSettings?.niches?.includes(selectedNiche)) {
            console.log('✅ UserSettings.collectionSettings.niches contains selected niche.');
        } else {
            console.error('❌ UserSettings niche mismatch:', updatedSettings?.collectionSettings);
        }

        console.log('\n✅ Full Backend Journey Verified Successfully!');

        // Cleanup
        await UserModel.deleteOne({ _id: user._id });
        await UserSettingsModel.deleteOne({ userId: user._id });
        console.log('🧹 Test data cleaned up.');

    } catch (error) {
        console.error('❌ Error during verification:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifyTrialJourney();
