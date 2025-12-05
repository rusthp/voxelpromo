const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function inspectFeed() {
    try {
        const configPath = path.join(__dirname, '../config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        const feedUrl = config.shopee?.feedUrls?.[0];

        if (!feedUrl) {
            console.error('❌ No Shopee feed URL found in config');
            return;
        }

        console.log(`📥 Downloading header from: ${feedUrl.substring(0, 50)}...`);

        const response = await axios.get(feedUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        let data = '';
        let lines = [];

        response.data.on('data', (chunk) => {
            data += chunk.toString();
            if (data.includes('\n')) {
                const newLines = data.split('\n');
                lines = lines.concat(newLines);

                // Stop after we have at least 2 lines (header + 1 record)
                if (lines.length >= 2) {
                    response.data.destroy(); // Stop download
                }
            }
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function parseCSVLine(line) {
    if (!line) return [];
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

inspectFeed();
