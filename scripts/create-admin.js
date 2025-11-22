/**
 * Script to create the first admin user
 * Usage: node scripts/create-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    // Get user input
    const username = await question('Username: ');
    const email = await question('Email: ');
    const password = await question('Password: ');

    if (!username || !email || !password) {
      console.error('❌ All fields are required');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }

    // Check if user already exists
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      console.error('❌ User with this email or username already exists');
      process.exit(1);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await user.save();
    console.log('✅ Admin user created successfully!');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: admin`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
  }
}

createAdmin();

