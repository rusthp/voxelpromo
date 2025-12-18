/**
 * Debug script to check exact column names and values from Awin feed list
 */

import { AwinService } from '../src/services/awin/AwinService';

async function main() {
    console.log('🔍 Debugging Awin feed list columns...\n');

    const awinService = new AwinService();
    const feedList = await awinService.fetchFeedList();

    if (feedList.length === 0) {
        console.log('No feeds found');
        return;
    }

    // Show all column names
    console.log('📋 ALL COLUMN NAMES:');
    console.log(Object.keys(feedList[0]).join('\n'));
    console.log('\n');

    // Find your advertiser IDs
    const yourIds = ['17884', '78382', '47165', '17659', '17729'];

    console.log('🔍 LOOKING FOR YOUR ADVERTISERS:');
    console.log('='.repeat(60));

    for (const feed of feedList) {
        const advertiserId = feed['Advertiser ID'] || feed['advertiser_id'] || '';

        if (yourIds.includes(String(advertiserId))) {
            console.log(`\n✅ FOUND: Advertiser ID ${advertiserId}`);
            console.log('-'.repeat(40));

            // Show ALL fields for this advertiser
            for (const [key, value] of Object.entries(feed)) {
                console.log(`  ${key}: "${value}"`);
            }
        }
    }

    // Also show unique values of Membership Status column
    console.log('\n\n📊 UNIQUE "Membership Status" VALUES:');
    const statusCol = feedList[0]['Membership Status'] !== undefined ? 'Membership Status' :
        feedList[0]['membership_status'] !== undefined ? 'membership_status' : null;

    if (statusCol) {
        const uniqueStatuses = [...new Set(feedList.map((f: any) => f[statusCol]))];
        console.log(`Column name: "${statusCol}"`);
        console.log(`Unique values: ${uniqueStatuses.join(', ')}`);
    } else {
        console.log('Column not found! Here are all columns:');
        console.log(Object.keys(feedList[0]));
    }
}

main().catch(console.error);
