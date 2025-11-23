import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  try {
    // Read MONGODB_URI after dotenv.config() has been called
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';

    logger.info(`Attempting to connect to MongoDB at ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ MongoDB connected successfully');
  } catch (error: any) {
    // Extract error message from various error formats
    let errorMessage = '';
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.reason) {
      errorMessage = error.reason;
    } else if (error?.error) {
      errorMessage =
        typeof error.error === 'string' ? error.error : error.error?.message || String(error.error);
    } else {
      // Try to extract from error object
      const errorStr = String(error);
      if (errorStr !== '[object Object]') {
        errorMessage = errorStr;
      } else {
        // If it's an object, try to get meaningful info
        errorMessage = JSON.stringify(error, null, 2);
      }
    }

    logger.error('❌ MongoDB connection error:');
    logger.error(errorMessage);

    // Check for specific error types
    const errorLower = errorMessage.toLowerCase();

    if (errorLower.includes('econnrefused') || errorLower.includes('connection refused')) {
      logger.error('');
      logger.error('⚠️  MongoDB is not running!');
      logger.error('   Please start MongoDB before running the server.');
      logger.error('   See docs/MONGODB_SETUP.md for instructions.');
      logger.error('');
    } else if (
      errorLower.includes('whitelist') ||
      (errorLower.includes('ip') && errorLower.includes('not allowed'))
    ) {
      logger.error('');
      logger.error('⚠️  MongoDB Atlas IP Whitelist Error!');
      logger.error('   Your current IP address is not whitelisted in MongoDB Atlas.');
      logger.error('   To fix this:');
      logger.error('   1. Go to MongoDB Atlas → Network Access');
      logger.error('   2. Click "Add IP Address"');
      logger.error('   3. Click "Allow Access from Anywhere" (0.0.0.0/0)');
      logger.error('      OR add your current IP address');
      logger.error('   4. Wait a few minutes for changes to take effect');
      logger.error('   See: https://www.mongodb.com/docs/atlas/security-whitelist/');
      logger.error('');
    } else if (errorLower.includes('authentication') || errorLower.includes('unauthorized')) {
      logger.error('');
      logger.error('⚠️  MongoDB Authentication Error!');
      logger.error('   Check your username and password in MONGODB_URI');
      logger.error('   Make sure your database user has proper permissions.');
      logger.error('');
    } else if (errorLower.includes('atlas') || errorLower.includes('cluster')) {
      logger.error('');
      logger.error('💡 MongoDB Atlas Connection Issue');
      logger.error('   Common solutions:');
      logger.error('   - Check IP whitelist in Network Access');
      logger.error('   - Verify connection string in .env file');
      logger.error('   - Check database user credentials');
      logger.error('   See docs/MONGODB_WSL.md for Atlas setup');
      logger.error('');
    }

    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
    throw error;
  }
}
