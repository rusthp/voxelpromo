/**
 * Script to reset admin password
 * Usage: node scripts/reset-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function resetAdmin() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        const email = 'admin@voxelpromo.com';
        const newPassword = 'admin123';

        const user = await User.findOne({ email });

        if (!user) {
            console.error('❌ Admin user not found via email (admin@voxelpromo.com)');
            // Try username
            const userByName = await User.findOne({ username: 'admin' });
            if (!userByName) {
                console.error('❌ Admin user not found via username (admin)');
                process.exit(1);
            }
            console.log('Found user by username: admin');
            // Update userByName
            const salt = await bcrypt.genSalt(10);
            userByName.password = await bcrypt.hash(newPassword, salt);
            userByName.role = 'admin'; // ensure admin role
            userByName.isActive = true; // ensure active
            await userByName.save();
            console.log('✅ Admin password reset successfully for user: admin');
            return;
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.role = 'admin';
        user.isActive = true;

        await user.save();
        console.log(`✅ Admin password reset successfully for ${email}`);
        console.log(`   New Password: ${newPassword}`);

    } catch (error) {
        console.error('❌ Error resetting admin:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

resetAdmin();
