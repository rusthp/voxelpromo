/**
 * Script to reset user password
 * Usage: node scripts/reset-password.js <email> <new_password>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
// const User = require('../src/models/User').UserModel; // Removed to avoid TS issues

// If UserModel is not exported directly or if it's a TS file, we might need to define schema here 
// or use ts-node. Let's define schema locally to be safe and avoid TS compilation issues in this script.

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Check if model exists to avoid OverwriteModelError
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

async function resetPassword() {
    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
        console.error('❌ Usage: node scripts/reset-password.js <email> <new_password>');
        process.exit(1);
    }

    try {
        // Connect to database
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        // Find user
        const user = await UserModel.findOne({ email });
        if (!user) {
            console.error(`❌ User with email ${email} not found`);
            process.exit(1);
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        user.password = hashedPassword;
        await user.save();

        console.log(`✅ Password for ${email} updated successfully!`);

    } catch (error) {
        console.error('❌ Error updating password:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

resetPassword();
