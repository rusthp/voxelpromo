require('dotenv').config();
const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    title: String,
    source: String,
    affiliateUrl: String,
    productUrl: String,
    createdAt: Date
});

const Offer = mongoose.model('Offer', OfferSchema);

async function checkLinks() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voxelpromo';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        const offer = await Offer.findOne({ source: 'shopee' }).sort({ createdAt: -1 });

        if (!offer) {
            console.log('❌ No Shopee offers found in database.');
        } else {
            console.log('\n🔍 Most recent Shopee offer:');
            console.log(`   Title: ${offer.title}`);
            console.log(`   Affiliate URL: ${offer.affiliateUrl}`);

            if (offer.affiliateUrl.includes('shopee.com.br') || offer.affiliateUrl.includes('shp.ee')) {
                console.log('✅ Link looks like a valid Shopee link.');
            } else {
                console.log('⚠️ Link format might be unusual.');
            }
        }

    } catch (error) {
        console.error('❌ Error checking links:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkLinks();
