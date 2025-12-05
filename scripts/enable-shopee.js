const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!config.collection) {
        config.collection = { sources: [] };
    }

    if (!config.collection.sources.includes('shopee')) {
        config.collection.sources.push('shopee');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('✅ Added shopee to collection sources');
    } else {
        console.log('ℹ️ Shopee already enabled');
    }

} catch (error) {
    console.error('❌ Error updating config:', error);
    process.exit(1);
}
