import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const configPath = join(process.cwd(), 'config.json');

async function fixCollectionSources() {
    if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));

        console.log('📋 Current collection sources:', config.collection?.sources);

        // Enable all sources (the default behavior)
        const allSources = ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'];

        config.collection = {
            ...config.collection,
            enabled: true,
            sources: allSources,
        };

        // Save updated config
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        console.log('✅ Updated collection sources:', config.collection.sources);
        console.log('\n🎉 Todas as fontes foram habilitadas!');
        console.log('\nFontes ativas:');
        allSources.forEach(source => {
            console.log(`  ✅ ${source}`);
        });

        console.log('\n⚠️  IMPORTANTE: As alterações foram aplicadas!');
        console.log('   O backend deve reiniciar automaticamente com nodemon.');
    } else {
        console.log('❌ Arquivo config.json não encontrado!');
        console.log('Caminho esperado:', configPath);
        process.exit(1);
    }
}

fixCollectionSources().catch(console.error);
