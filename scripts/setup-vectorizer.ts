/**
 * Setup Vectorizer Collections
 * 
 * Checks for required collections and creates them if missing.
 * Usage: npx ts-node scripts/setup-vectorizer.ts
 */

import 'dotenv/config';

const VECTORIZER_URL = process.env.VECTORIZER_URL || 'http://127.0.0.1:15002';
const API_KEY = process.env.VECTORIZER_API_KEY || '';

const REQUIRED_COLLECTIONS = [
    { name: 'voxelpromo-offers', description: 'Collection for product offers' },
    { name: 'voxelpromo-backend', description: 'Backend documentation and code' },
    { name: 'voxelpromo-services', description: 'Service layer vectors' },
    { name: 'voxelpromo-docs', description: 'Project documentation' }
];

async function main() {
    console.log(`🚀 Connecting to Vectorizer at ${VECTORIZER_URL}...`);

    try {
        // 1. Check Health
        const healthRes = await fetch(`${VECTORIZER_URL}/health`, {
            headers: { 'X-API-Key': API_KEY }
        });

        if (!healthRes.ok) {
            throw new Error(`Vectorizer unavailable: ${healthRes.statusText}`);
        }
        console.log('✅ Vectorizer is ONLINE');

        // 2. List Collections
        const listRes = await fetch(`${VECTORIZER_URL}/collections`, {
            headers: { 'X-API-Key': API_KEY }
        });

        if (!listRes.ok) {
            throw new Error(`Failed to list collections: ${listRes.statusText}`);
        }

        const listData = await listRes.json();
        const existingCollections = new Set((listData.collections || []).map((c: any) => c.name));

        console.log(`📊 Found ${existingCollections.size} collections:`, Array.from(existingCollections));

        // 3. Create Missing Collections
        for (const col of REQUIRED_COLLECTIONS) {
            if (existingCollections.has(col.name)) {
                console.log(`✨ Collection '${col.name}' already exists.`);
                continue;
            }

            console.log(`🛠️ Creating collection '${col.name}'...`);
            const createRes = await fetch(`${VECTORIZER_URL}/collections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    name: col.name,
                    description: col.description,
                    dimension: 384, // Default for all-MiniLM-L6-v2
                    metric: 'cosine'
                })
            });

            if (createRes.ok) {
                console.log(`✅ Created '${col.name}'`);
            } else {
                const err = await createRes.text();
                console.error(`❌ Failed to create '${col.name}': ${err}`);
            }
        }

        console.log('\n🎉 Setup complete!');

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.log('💡 Ensure the Vectorizer service is running locally on port 15002.');
        process.exit(1);
    }
}

main();
