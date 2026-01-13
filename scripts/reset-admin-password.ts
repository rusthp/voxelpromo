/**
 * Reset admin password
 * Run with: npx ts-node scripts/reset-admin-password.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function resetPassword() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected!');

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('Seg73378', salt);

        const result = await mongoose.connection.db!.collection('users').updateOne(
            { email: 'admin@voxelpromo.com' },
            { $set: { password: hash } }
        );

        console.log('Password reset:', result.modifiedCount > 0 ? 'SUCCESS' : 'NO CHANGE');

        await mongoose.disconnect();
        console.log('Done!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetPassword();
