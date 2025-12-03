import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { CollectorService } from '../src/services/collector/CollectorService';
import { OfferModel } from '../src/models/Offer';
import { logger } from '../src/utils/logger';

dotenv.config();

interface SourceTestResult {
    name: string;
    success: boolean;
    offersCollected: number;
    offersSaved: number;
    errors: string[];
    sampleOffer?: any;
}

async function testSource(
    collectorService: CollectorService,
    sourceName: string
): Promise<SourceTestResult> {
    const result: SourceTestResult = {
        name: sourceName,
        success: false,
        offersCollected: 0,
        offersSaved: 0,
        errors: [],
    };

    try {
        console.log(`\n🔍 Testing source: ${sourceName}`);
        console.log('='.repeat(50));

        // Count offers before collection
        const beforeCount = await OfferModel.countDocuments({ source: sourceName });
        console.log(`📊 Offers in DB before: ${beforeCount}`);

        // Collect from source
        let offers: any[] = [];

        switch (sourceName) {
            case 'aliexpress':
                console.log('🛒 Collecting from AliExpress...');
                offers = await collectorService.collectFromAliExpress();
                break;
            case 'shopee':
                console.log('🛍️  Collecting from Shopee...');
                offers = await collectorService.collectFromShopee();
                break;
            case 'amazon':
                console.log('📦 Collecting from Amazon...');
                offers = await collectorService.collectFromAmazon();
                break;
            case 'rss':
                console.log('📡 Collecting from RSS feeds...');
                offers = await collectorService.collectFromRSS();
                break;
            case 'mercadolivre':
                console.log('🇧🇷 Collecting from Mercado Livre...');
                offers = await collectorService.collectFromMercadoLivre();
                break;
            default:
                result.errors.push(`Unknown source: ${sourceName}`);
                return result;
        }

        result.offersCollected = offers.length;
        console.log(`✅ Collected ${offers.length} offers`);

        if (offers.length === 0) {
            result.errors.push('No offers collected');
            return result;
        }

        // Validate data quality
        console.log('\n🔍 Validating data quality...');
        for (const offer of offers) {
            const issues: string[] = [];

            if (!offer.title || offer.title.trim() === '') {
                issues.push('Missing title');
            }
            if (!offer.currentPrice || offer.currentPrice <= 0) {
                issues.push('Invalid currentPrice');
            }
            if (!offer.originalPrice || offer.originalPrice <= 0) {
                issues.push('Invalid originalPrice');
            }
            if (!offer.discountPercentage || offer.discountPercentage <= 0) {
                issues.push('Invalid discountPercentage');
            }
            if (!offer.productUrl) {
                issues.push('Missing productUrl');
            }
            if (!offer.source) {
                issues.push('Missing source');
            }

            if (issues.length > 0) {
                result.errors.push(`Offer validation failed: ${issues.join(', ')}`);
            }
        }

        // Sample one offer for inspection
        if (offers.length > 0) {
            result.sampleOffer = {
                title: offers[0].title?.substring(0, 50) + '...',
                currentPrice: offers[0].currentPrice,
                originalPrice: offers[0].originalPrice,
                discountPercentage: offers[0].discountPercentage,
                source: offers[0].source,
                category: offers[0].category,
            };
            console.log('\n📋 Sample offer:');
            console.log(JSON.stringify(result.sampleOffer, null, 2));
        }

        // Count offers after collection
        const afterCount = await OfferModel.countDocuments({ source: sourceName });
        result.offersSaved = afterCount - beforeCount;
        console.log(`\n📊 Offers in DB after: ${afterCount}`);
        console.log(`💾 New offers saved: ${result.offersSaved}`);

        // Verify persistence
        if (result.offersSaved === 0) {
            result.errors.push('No offers were saved to database (possible duplicates)');
        }

        result.success = result.offersCollected > 0 && result.errors.length === 0;

        console.log(`\n${result.success ? '✅' : '❌'} Test ${result.success ? 'PASSED' : 'FAILED'}`);

    } catch (error: any) {
        console.error(`❌ Error testing ${sourceName}:`, error.message);
        result.errors.push(error.message);
    }

    return result;
}

async function main() {
    console.log('🚀 VoxelPromo Collection Sources Test');
    console.log('='.repeat(50));
    console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);

    try {
        // Connect to database
        console.log('📡 Connecting to database...');
        await connectDatabase();
        console.log('✅ Database connected\n');

        const collectorService = new CollectorService();
        const config = collectorService.getConfig();

        // Get enabled sources
        const enabledSources = config.sources
            .filter((s: any) => s.enabled)
            .map((s: any) => s.name);

        console.log(`📋 Testing ${enabledSources.length} enabled sources:`);
        console.log(enabledSources.join(', '));

        const results: SourceTestResult[] = [];

        // Test each enabled source
        for (const sourceName of enabledSources) {
            const result = await testSource(collectorService, sourceName);
            results.push(result);
        }

        // Print summary
        console.log('\n\n📊 TEST SUMMARY');
        console.log('='.repeat(50));

        const passed = results.filter((r) => r.success).length;
        const total = results.length;

        console.log(`\n✅ Passed: ${passed}/${total}`);
        console.log(`❌ Failed: ${total - passed}/${total}\n`);

        results.forEach((result) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.name.padEnd(15)} - Collected: ${result.offersCollected}, Saved: ${result.offersSaved}`);

            if (result.errors.length > 0) {
                result.errors.forEach((error) => {
                    console.log(`   ⚠️  ${error}`);
                });
            }
        });

        console.log(`\n⏰ Finished at: ${new Date().toLocaleString()}`);

        // Exit with proper code
        process.exit(passed === total ? 0 : 1);

    } catch (error: any) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await disconnectDatabase();
    }
}

main();
