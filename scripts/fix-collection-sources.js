const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'config.json');

if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    console.log('📋 Current collection sources:', config.collection?.sources);

    // Enable all sources (the default behavior)
    const allSources = ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'];

    config.collection = {
        ...config.collection,
        enabled: true,
        sources: allSources,
    };

    // Save updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log('✅ Updated collection sources:', config.collection.sources);
    console.log('\n🎉 Todas as fontes foram habilitadas!');
    console.log('\nFontes ativas:');
    allSources.forEach(source => {
        console.log(`  ✅ ${source}`);
    });

    console.log('\n⚠️  IMPORTANTE: Reinicie o backend para aplicar as alterações:');
    console.log('   - Pressione Ctrl+C no terminal do backend');
    console.log('   - Execute: npm run dev');
    console.log('   - Ou deixe o nodemon reiniciar automaticamente');
} else {
    console.log('❌ Arquivo config.json não encontrado!');
    console.log('Caminho esperado:', configPath);
    process.exit(1);
}
