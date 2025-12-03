import axios from 'axios';

async function testHtmlAccess() {
    console.log('🌐 Testing HTML Access to Mercado Livre...\n');

    const term = 'smartphone';
    const url = `https://lista.mercadolivre.com.br/${term}`;

    console.log(`🔗 Fetching: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'max-age=0',
                'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            },
            timeout: 10000
        });

        console.log(`✅ Status: ${response.status}`);
        console.log(`📄 Content Type: ${response.headers['content-type']}`);
        console.log(`📏 Length: ${response.data.length} chars`);

        if (response.data.includes('ui-search-layout__item')) {
            console.log('✅ Found product items in HTML!');
        } else {
            console.log('⚠️ Product items NOT found in HTML (structure might have changed).');
        }

    } catch (error: any) {
        console.error('❌ Access failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
        }
    }
}

testHtmlAccess().catch(console.error);
