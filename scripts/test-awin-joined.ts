/**
 * Test script to find joined Awin advertisers with recency filter
 */

import { AwinService } from '../src/services/awin/AwinService';

async function main() {
    console.log('🔍 Checking Awin configuration and joined advertisers...\n');

    const awinService = new AwinService();

    if (!awinService.isConfigured()) {
        console.error('❌ Awin not configured.');
        process.exit(1);
    }
    console.log('✅ Awin is configured\n');

    console.log('📡 Fetching product feed list...');
    const feedList = await awinService.fetchFeedList();
    console.log(`📋 Total feeds available: ${feedList.length}\n`);

    // Filter active
    const joinedFeeds = feedList.filter((f: any) => {
        const status = f['Membership Status'] || '';
        return status.toLowerCase() === 'active';
    });

    // Filter recent (7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFeeds = joinedFeeds.filter((f: any) => {
        const lastImported = f['Last Imported'] || '';
        if (!lastImported) return false;
        const importDate = new Date(lastImported);
        return importDate >= sevenDaysAgo;
    });

    console.log(`${'='.repeat(60)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total feeds: ${feedList.length}`);
    console.log(`Joined advertisers: ${joinedFeeds.length}`);
    console.log(`Updated in last 7 days: ${recentFeeds.length}`);
    console.log(`${'='.repeat(60)}\n`);

    if (joinedFeeds.length > 0) {
        console.log('📋 ALL JOINED FEEDS:');
        console.log('-'.repeat(60));

        for (const feed of joinedFeeds) {
            const name = feed['Advertiser Name'] || 'Unknown';
            const lastImported = feed['Last Imported'] || 'N/A';
            const products = feed['No of products'] || '0';
            const importDate = new Date(lastImported);
            const isRecent = importDate >= sevenDaysAgo;
            const status = isRecent ? '✅ RECENT' : '⚠️ STALE';

            console.log(`${status} ${name}`);
            console.log(`   Products: ${products} | Last Import: ${lastImported}`);
        }
    }

    if (recentFeeds.length > 0) {
        console.log('\n✅ FEEDS THAT WILL BE USED (updated recently):');
        console.log('-'.repeat(60));
        for (const feed of recentFeeds) {
            console.log(`  - ${feed['Advertiser Name']} (${feed['No of products']} products)`);
        }
    } else {
        console.log('\n⚠️ NO RECENT FEEDS AVAILABLE');
        console.log('All joined feeds are older than 7 days.');
        console.log('Consider joining more advertisers with updated feeds.');
    }

    console.log('\n✅ Test completed!');
}

main().catch(console.error);
