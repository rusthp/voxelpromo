/**
 * Debug AliExpress SSR page structure
 * Run with: npx ts-node scripts/debug-aliexpress-ssr.ts
 */

import axios from 'axios';

const headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Cookie': 'aep_usuc_f=site=bra&c_tp=BRL&isb=y&region=BR',
};

async function debug() {
    console.log('🔍 Fetching SSR Bestsellers page...\n');

    const url = 'https://www.aliexpress.com/ssr/300001995/N3KsYt2f3a?disableNav=YES&pha_manifest=ssr&_immersiveMode=true&gatewayAdapt=glo2bra';

    const response = await axios.get(url, { headers, timeout: 30000 });
    const html = response.data;

    console.log(`📄 HTML length: ${html.length} bytes\n`);

    // Try to find data patterns
    const patterns = [
        { name: '__INIT_DATA__', regex: /window\.__INIT_DATA__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|window\.)/ },
        { name: '_dida_config_', regex: /window\._dida_config_\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|window\.)/ },
        { name: 'runParams', regex: /runParams\s*[=:]\s*(\{[\s\S]*?\})\s*[,;}\s]/ },
        { name: 'window.g_config', regex: /window\.g_config\s*=\s*(\{[\s\S]*?\});/ },
        { name: '__page_data__', regex: /window\.__page_data__\s*=\s*(\{[\s\S]*?\});/ },
    ];

    for (const p of patterns) {
        const match = html.match(p.regex);
        if (match) {
            console.log(`✅ Found pattern: ${p.name}`);
            try {
                const data = JSON.parse(match[1]);
                console.log('\n📊 Top-level keys:', Object.keys(data).slice(0, 15));

                // Look for arrays (potential product lists)
                function findArrays(obj: any, path: string = '', depth: number = 0): void {
                    if (depth > 4) return;
                    if (!obj || typeof obj !== 'object') return;

                    for (const key of Object.keys(obj)) {
                        const newPath = path ? `${path}.${key}` : key;
                        const value = obj[key];

                        if (Array.isArray(value) && value.length > 0) {
                            const firstItem = value[0];
                            const hasPrice = firstItem && (
                                firstItem.price ||
                                firstItem.salePrice ||
                                firstItem.productId ||
                                firstItem.itemId
                            );
                            if (hasPrice) {
                                console.log(`\n🎯 Potential product array at: ${newPath} (${value.length} items)`);
                                console.log('   First item keys:', Object.keys(firstItem).slice(0, 10));
                                console.log('   Sample:', JSON.stringify(firstItem).substring(0, 300) + '...');
                            }
                        } else if (typeof value === 'object' && value !== null) {
                            findArrays(value, newPath, depth + 1);
                        }
                    }
                }

                findArrays(data);

            } catch (e: any) {
                console.log(`   ❌ Failed to parse: ${e.message}`);
            }
            console.log('\n---\n');
        }
    }

    // Also check for script tags with data
    const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
    console.log(`📜 Found ${scriptMatches?.length || 0} script tags`);

    // Look for any JSON-like product data
    const productPatterns = [
        { name: 'productId pattern', regex: /"productId"\s*:\s*"?(\d+)"?/ },
        { name: 'itemId pattern', regex: /"itemId"\s*:\s*"?(\d+)"?/ },
        { name: 'BRL price pattern', regex: /R\$\s*([\d.,]+)/ },
    ];

    console.log('\n🔎 Checking for product-related patterns:');
    for (const p of productPatterns) {
        const matches = html.match(new RegExp(p.regex, 'g'));
        console.log(`   ${p.name}: ${matches?.length || 0} occurrences`);
    }
}

debug().catch(console.error);
