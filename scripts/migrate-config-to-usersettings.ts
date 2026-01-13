/**
 * Migration script: config.json → UserSettings (admin)
 * Run with: npx ts-node scripts/migrate-config-to-usersettings.ts
 */
import mongoose from 'mongoose';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not set');
        process.exit(1);
    }

    const configPath = join(process.cwd(), 'config.json');
    if (!existsSync(configPath)) {
        console.error('config.json not found');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
        console.error('Database not available');
        process.exit(1);
    }

    // Load config.json
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    console.log('Loaded config.json with sections:', Object.keys(config));

    // Find admin user
    const adminUser = await db.collection('users').findOne({ email: 'admin@voxelpromo.com' });

    if (!adminUser) {
        console.error('Admin user not found!');
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`Found admin user: ${adminUser.username} (${adminUser._id})`);

    // Prepare UserSettings document
    const userSettings = {
        userId: adminUser._id,

        // Afiliados
        amazon: {
            accessKey: config.amazon?.accessKey || '',
            secretKey: config.amazon?.secretKey || '',
            associateTag: config.amazon?.associateTag || '',
            region: config.amazon?.region || 'sa-east-1',
            isConfigured: !!(config.amazon?.accessKey && config.amazon?.secretKey),
        },
        aliexpress: {
            appKey: config.aliexpress?.appKey || '',
            appSecret: config.aliexpress?.appSecret || '',
            trackingId: config.aliexpress?.trackingId || '',
            isConfigured: !!(config.aliexpress?.appKey && config.aliexpress?.appSecret),
        },
        mercadolivre: {
            clientId: config.mercadolivre?.clientId || '',
            clientSecret: config.mercadolivre?.clientSecret || '',
            redirectUri: config.mercadolivre?.redirectUri || '',
            affiliateCode: config.mercadolivre?.affiliateCode || '',
            accessToken: config.mercadolivre?.accessToken || '',
            refreshToken: config.mercadolivre?.refreshToken || '',
            tokenExpiresAt: config.mercadolivre?.tokenExpiresAt || null,
            sessionCookies: config.mercadolivre?.sessionCookies || '',
            csrfToken: config.mercadolivre?.csrfToken || '',
            affiliateTag: config.mercadolivre?.affiliateTag || '',
            isConfigured: !!(config.mercadolivre?.accessToken || config.mercadolivre?.affiliateCode),
        },
        awin: {
            apiToken: config.awin?.apiToken || '',
            publisherId: config.awin?.publisherId || '',
            dataFeedApiKey: config.awin?.dataFeedApiKey || '',
            enabled: config.awin?.enabled || false,
            isConfigured: !!(config.awin?.apiToken && config.awin?.publisherId),
        },
        shopee: {
            feedUrls: config.shopee?.feedUrls || [],
            affiliateCode: config.shopee?.affiliateCode || '',
            minDiscount: config.shopee?.minDiscount,
            maxPrice: config.shopee?.maxPrice,
            minPrice: config.shopee?.minPrice,
            cacheEnabled: config.shopee?.cacheEnabled,
            isConfigured: !!(config.shopee?.feedUrls?.length || config.shopee?.affiliateCode),
        },

        // Mensageiros
        telegram: {
            botToken: config.telegram?.botToken || '',
            channelId: config.telegram?.chatId || '',
            isConfigured: !!(config.telegram?.botToken && config.telegram?.chatId),
        },
        instagram: {
            appId: config.instagram?.appId || '',
            appSecret: config.instagram?.appSecret || '',
            accessToken: config.instagram?.accessToken || '',
            pageAccessToken: config.instagram?.pageAccessToken || '',
            pageId: config.instagram?.pageId || '',
            igUserId: config.instagram?.igUserId || '',
            webhookVerifyToken: config.instagram?.webhookVerifyToken || '',
            isConfigured: !!(config.instagram?.accessToken && config.instagram?.igUserId),
        },
        whatsapp: {
            enabled: config.whatsapp?.enabled || false,
            targetNumber: config.whatsapp?.targetNumber || '',
            targetGroups: config.whatsapp?.targetGroups || [],
            library: config.whatsapp?.library || 'baileys',
            isConfigured: !!(config.whatsapp?.enabled && (config.whatsapp?.targetNumber || config.whatsapp?.targetGroups?.length)),
        },
        x: {
            bearerToken: config.x?.bearerToken || '',
            apiKey: config.x?.apiKey || '',
            apiKeySecret: config.x?.apiKeySecret || '',
            accessToken: config.x?.accessToken || '',
            accessTokenSecret: config.x?.accessTokenSecret || '',
            oauth2ClientId: config.x?.oauth2ClientId || '',
            oauth2ClientSecret: config.x?.oauth2ClientSecret || '',
            oauth2RedirectUri: config.x?.oauth2RedirectUri || 'http://localhost:3000/api/x/auth/callback',
            oauth2AccessToken: config.x?.oauth2AccessToken || '',
            oauth2RefreshToken: config.x?.oauth2RefreshToken || '',
            oauth2TokenExpiresAt: config.x?.oauth2TokenExpiresAt || null,
            oauth2Scope: config.x?.oauth2Scope || '',
            isConfigured: !!(config.x?.apiKey || config.x?.bearerToken || config.x?.oauth2AccessToken),
        },

        // IA
        ai: {
            provider: config.ai?.provider || 'groq',
            groqApiKey: config.ai?.groqApiKey || '',
            openaiApiKey: config.ai?.openaiApiKey || '',
            isConfigured: !!(config.ai?.groqApiKey || config.ai?.openaiApiKey),
        },

        // Coleta
        rss: config.rss || [],
        collectionSettings: {
            enabled: config.collection?.enabled ?? true,
            schedule: config.collection?.schedule || '0 */6 * * *',
            sources: config.collection?.sources || ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'],
        },

        // Metadados de migração
        migratedFrom: 'config.json',
        migratedAt: new Date(),
    };

    // Upsert into UserSettings
    const result = await db.collection('usersettings').updateOne(
        { userId: adminUser._id },
        { $set: userSettings },
        { upsert: true }
    );

    if (result.upsertedCount) {
        console.log('✅ Created new UserSettings for admin');
    } else if (result.modifiedCount) {
        console.log('✅ Updated existing UserSettings for admin');
    } else {
        console.log('ℹ️  UserSettings unchanged (already up to date)');
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log('-------------------');
    console.log(`Amazon: ${userSettings.amazon.isConfigured ? '✅' : '❌'}`);
    console.log(`AliExpress: ${userSettings.aliexpress.isConfigured ? '✅' : '❌'}`);
    console.log(`Mercado Livre: ${userSettings.mercadolivre.isConfigured ? '✅' : '❌'}`);
    console.log(`Awin: ${userSettings.awin.isConfigured ? '✅' : '❌'}`);
    console.log(`Shopee: ${userSettings.shopee.isConfigured ? '✅' : '❌'}`);
    console.log(`Telegram: ${userSettings.telegram.isConfigured ? '✅' : '❌'}`);
    console.log(`Instagram: ${userSettings.instagram.isConfigured ? '✅' : '❌'}`);
    console.log(`WhatsApp: ${userSettings.whatsapp.isConfigured ? '✅' : '❌'}`);
    console.log(`X (Twitter): ${userSettings.x.isConfigured ? '✅' : '❌'}`);
    console.log(`AI: ${userSettings.ai.isConfigured ? '✅' : '❌'}`);

    await mongoose.disconnect();
    console.log('\nDone!');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
