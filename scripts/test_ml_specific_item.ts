import { MercadoLivreService } from '../src/services/mercadolivre/MercadoLivreService';
import axios from 'axios';
import * as cheerio from 'cheerio'; // We might need to install this if not present, but let's try regex first if cheerio is missing

async function testSpecificItem() {
    const itemId = 'MLB46393388';
    const itemUrl = 'https://www.mercadolivre.com.br/jogo-de-chaves-de-fenda-philips-isolada-1000v/p/MLB46393388';

    console.log(`🎯 Testing retrieval for item: ${itemId}`);
    console.log(`🔗 URL: ${itemUrl}\n`);

    const mlService = new MercadoLivreService();

    // 1. Test Authenticated API
    try {
        console.log('1️⃣  Testing Authenticated API (/items)...');
        const item = await mlService.getProductDetails(itemId);
        if (item) {
            console.log(`✅ Success (Auth API)! Title: ${item.title}`);
            return;
        } else {
            console.log('❌ Auth API returned null (or 403/404 handled internally)');
        }
    } catch (error: any) {
        console.log(`❌ Auth API Failed: ${error.message}`);
    }

    // 2. Test Public API with Headers
    try {
        console.log('\n2️⃣  Testing Public API with Headers...');
        const response = await axios.get(`https://api.mercadolibre.com/items/${itemId}`, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            }
        });
        console.log(`✅ Success (Public API)! Title: ${response.data.title}`);
        return;
    } catch (error: any) {
        console.log(`❌ Public API Failed: ${error.message} (Status: ${error.response?.status})`);
    }

    // 3. Test HTML Scraping
    try {
        console.log('\n3️⃣  Testing HTML Scraping...');
        const response = await axios.get(itemUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            }
        });

        if (response.status === 200) {
            const html = response.data;
            // Simple regex to find title
            const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
            const title = titleMatch ? titleMatch[1] : 'Unknown Title';

            // Regex for price
            const priceMatch = html.match(/"price":(\d+(\.\d+)?)/);
            const price = priceMatch ? priceMatch[1] : 'Unknown Price';

            console.log(`✅ Success (HTML)!`);
            console.log(`   Title: ${title.trim()}`);
            console.log(`   Price: ${price}`);
        } else {
            console.log(`❌ HTML Request Failed: Status ${response.status}`);
        }
    } catch (error: any) {
        console.log(`❌ HTML Scraping Failed: ${error.message}`);
    }
}

testSpecificItem().catch(console.error);
