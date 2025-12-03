const axios = require('axios');

async function testApi() {
    const url = 'https://api.mercadolibre.com/sites/MLB/search';
    const params = { q: 'ipod', limit: 1 };
    const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    console.log('Testing URL:', url);
    console.log('Headers:', headers);

    try {
        const response = await axios.get(url, { params, headers });
        console.log('✅ Success!');
        console.log('Status:', response.status);
        console.log('Data sample:', JSON.stringify(response.data.results[0]?.title || 'No results'));
    } catch (error) {
        console.log('❌ Error!');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
            console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
        } else {
            console.log('Message:', error.message);
        }
    }
}

testApi();
