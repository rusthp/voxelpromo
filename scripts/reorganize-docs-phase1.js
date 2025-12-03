const fs = require('fs');
const path = require('path');

console.log('📁 Reorganizando documentação...\n');

// Fase 1: Remover docs/AGENTS.md (duplicado)
const agentsDocPath = path.join(__dirname, '../docs/AGENTS.md');
if (fs.existsSync(agentsDocPath)) {
    fs.unlinkSync(agentsDocPath);
    console.log('✅ Removido: docs/AGENTS.md (duplicado)');
} else {
    console.log('⚠️  docs/AGENTS.md não encontrado');
}

// Fase 3: Criar diretório de arquivo
const archiveDir = path.join(__dirname, '../docs/archive/fixes');
if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
    console.log('✅ Criado: docs/archive/fixes/');
}

// Fase 3: Mover arquivos temporários para arquivo
const tempFiles = [
    'THREE_BUGS_FIXED.md',
    'SHOPEE_PERFORMANCE_OPTIMIZATION.md',
    'SHOPEE_ALIEXPRESS_ANALYSIS.md',
    'CONFIG_PERSISTENCE_FIX.md',
    'COLLECTION_SOURCES_FIX.md',
    'ALIEXPRESS_AFFILIATE_FIX.md',
    'ALIEXPRESS_TIMEOUT_FIX.md',
    'ALIEXPRESS_API_ERROR_ANALYSIS.md'
];

console.log('\n📦 Movendo arquivos temporários para archive/fixes/...');
tempFiles.forEach(file => {
    const srcPath = path.join(__dirname, '..', file);
    const destPath = path.join(archiveDir, file);

    if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath);
        console.log(`  ✅ ${file} → docs/archive/fixes/`);
    } else {
        console.log(`  ⚠️  ${file} não encontrado`);
    }
});

console.log('\n✨ Fase 1 e 3 concluídas!\n');
