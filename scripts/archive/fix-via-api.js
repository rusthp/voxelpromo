#!/usr/bin/env node

/**
 * Script to fix collection sources configuration
 * This script enables all collection sources (Amazon, AliExpress, Mercado Livre, Shopee, RSS)
 */

const http = require('http');

const updateConfig = {
    collection: {
        enabled: true,
        schedule: '0 */6 * * *',
        sources: ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss']
    }
};

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/config',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Using test token from authenticate middleware
    }
};

const requestBody = JSON.stringify(updateConfig);

console.log('📋 Sending configuration update to enable all collection sources...\n');
console.log('🔧 New collection sources:', updateConfig.collection.sources);
console.log('');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response:', data);

        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('\n✅ Configuration updated successfully!');
            console.log('\n🎉 All collection sources are now enabled:');
            updateConfig.collection.sources.forEach(source => {
                console.log(`  ✅ ${source}`);
            });
            console.log('\n⚠️  The backend should restart automatically with nodemon.');
            console.log('   If not, restart manually to apply changes.');
        } else {
            console.error('\n❌ Failed to update configuration');
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure the backend is running on http://localhost:3000');
});

req.write(requestBody);
req.end();
