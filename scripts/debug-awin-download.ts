/**
 * Debug script to test feed download with proper gzip handling
 */

import axios from 'axios';

async function main() {
    const feedUrl = 'https://productdata.awin.com/datafeed/download/apikey/575bd7c39e0ab1a7c916ab0a66dcf02d/fid/92506/format/csv/language/pt/delimiter/%2C/compression/gzip/columns/data_feed_id%2Cmerchant_id%2Cmerchant_name%2Caw_product_id%2Caw_deep_link%2Caw_image_url%2Caw_thumb_url%2Ccategory_id%2Ccategory_name%2Cbrand_id%2Cbrand_name%2Cmerchant_product_id%2Cmerchant_category%2Cisbn%2Cproduct_name%2Cdescription%2Cspecifications%2Cpromotional_text%2Cmerchant_deep_link%2Cmerchant_image_url%2Csearch_price%2Cstore_price%2Cweb_offer%2Cpre_order%2Cin_stock%2Cwarranty%2Ccondition%2Cproduct_type%2Cparent_product_id%2Ccommission_group%2Ccolour%2Ccustom_1%2Ccustom_2%2Ccustom_3%2Ccustom_4%2Ccustom_5%2Cdelivery_weight%2Creviews%2Caverage_rating%2Calternate_image%2Cmerchant_product_third_category%2Cbase_price%2Cbase_price_amount%2Csize_stock_amount%2Calternate_image_two%2Calternate_image_three%2Ccustom_6%2Ccustom_7%2Ccustom_8%2Ccustom_9%2Cproduct_GTIN/';

    console.log('📡 Downloading feed as buffer...');

    try {
        const response = await axios.get(feedUrl, {
            timeout: 300000,
            responseType: 'arraybuffer',
        });

        console.log('Response status:', response.status);
        console.log('Response size:', response.data.length, 'bytes');
        console.log('Content-Type:', response.headers['content-type']);
        console.log('Content-Encoding:', response.headers['content-encoding']);

        // Check if data is gzipped (starts with 0x1f 0x8b)
        const buffer = Buffer.from(response.data);
        const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;
        console.log('Is gzipped:', isGzip);

        let csvData: string;

        if (isGzip) {
            console.log('Decompressing gzip...');
            const { promisify } = await import('util');
            const { gunzip } = await import('zlib');
            const gunzipAsync = promisify(gunzip);
            const decompressed = await gunzipAsync(buffer);
            csvData = decompressed.toString('utf-8');
        } else {
            csvData = buffer.toString('utf-8');
        }

        const lines = csvData.split('\n').filter((line: string) => line.trim());
        console.log('Total lines:', lines.length);

        if (lines.length > 0) {
            console.log('\n📋 HEADERS:');
            console.log(lines[0].substring(0, 200), '...');
        }

        if (lines.length > 1) {
            console.log('\n📦 FIRST ROW:');
            console.log(lines[1].substring(0, 300), '...');
        }

        if (lines.length > 2) {
            console.log('\n✅ Successfully parsed', lines.length - 1, 'products');
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

main().catch(console.error);
