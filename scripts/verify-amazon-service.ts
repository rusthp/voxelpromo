import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

import { AmazonService } from '../src/services/amazon/AmazonService';

async function verify() {
    console.log('🔍 Verifying AmazonService...');

    try {
        const service = new AmazonService();
        console.log('✅ Service instantiated');

        console.log('📡 Testing connection...');
        const result = await service.testConnection();

        console.log('📊 Result:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('🎉 SUCCESS: Amazon PA-API connection working!');
            process.exit(0);
        } else {
            console.error('❌ FAILED: Connection test failed');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    }
}

verify();
