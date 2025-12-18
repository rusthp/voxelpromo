const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'config.json');

if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    console.log('📋 Current collection configuration:');
    console.log(JSON.stringify(config.collection, null, 2));

    console.log('\n📋 All enabled sources:');
    console.log(config.collection?.sources || 'NO SOURCES CONFIGURED');

    console.log('\n🔍 Checking each source:');
    const allSources = ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'];
    allSources.forEach(source => {
        const isEnabled = config.collection?.sources?.includes(source);
        console.log(`  ${isEnabled ? '✅' : '❌'} ${source}: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
    });

    console.log('\n' + '='.repeat(50));

    // Check if Shopee is missing
    if (!config.collection?.sources?.includes('shopee')) {
        console.log('\n❌ PROBLEMA ENCONTRADO: Shopee NÃO está habilitado!');
        console.log('\n🔧 Para corrigir, execute:');
        console.log('   node scripts/fix-collection-sources.js');
    } else {
        console.log('\n✅ Configuração OK - Shopee está habilitado');
    }
} else {
    console.log('❌ Arquivo config.json não encontrado!');
    console.log('Caminho esperado:', configPath);
}
