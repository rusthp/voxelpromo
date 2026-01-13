/**
 * Test SMTP Connection - Titan Email
 * 
 * Usage: npx ts-node scripts/test-smtp-connection.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { getEmailService } from '../src/services/EmailService';

async function testSMTPConnection() {
    console.log('\n🔧 Testing SMTP Connection...\n');
    console.log('━'.repeat(50));

    // Check env vars
    console.log('📋 Configuration:');
    console.log(`   HOST: ${process.env.EMAIL_HOST || '❌ NOT SET'}`);
    console.log(`   PORT: ${process.env.EMAIL_PORT || '587 (default)'}`);
    console.log(`   USER: ${process.env.EMAIL_USER || '❌ NOT SET'}`);
    console.log(`   PASS: ${process.env.EMAIL_PASS ? '✅ SET (hidden)' : '❌ NOT SET'}`);
    console.log(`   FROM: ${process.env.EMAIL_FROM || '❌ NOT SET'}`);
    console.log('━'.repeat(50));

    const emailService = getEmailService();

    console.log(`\n📧 Provider: ${emailService.getProvider().toUpperCase()}`);

    if (!emailService.isConfigured()) {
        console.error('\n❌ Email service not configured!');
        console.error('   Check your .env file');
        process.exit(1);
    }

    // Verify connection
    console.log('\n🔌 Verifying SMTP connection...');
    const isConnected = await emailService.verifyConnection();

    if (isConnected) {
        console.log('✅ SMTP connection successful!\n');

        // Ask if user wants to send test email
        const testEmail = process.argv[2];

        if (testEmail) {
            console.log(`📤 Sending test email to: ${testEmail}`);

            const sent = await emailService.sendPasswordResetEmail(
                testEmail,
                'https://voxelpromo.com/reset-password/TEST-TOKEN-123'
            );

            if (sent) {
                console.log('✅ Test email sent successfully!');
                console.log('   Check your inbox (and spam folder)');
            } else {
                console.error('❌ Failed to send test email');
            }
        } else {
            console.log('💡 To send a test email, run:');
            console.log('   npx ts-node scripts/test-smtp-connection.ts your@email.com\n');
        }
    } else {
        console.error('\n❌ SMTP connection failed!');
        console.error('   Check your credentials and try again');
        process.exit(1);
    }

    process.exit(0);
}

testSMTPConnection().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
