const fs = require('fs');
const path = require('path');

console.log('📁 Reorganizando documentação VoxelPromo...\n');

const projectRoot = path.join(__dirname, '..');

try {
    // Fase 1: Remover docs/AGENTS.md (duplicado)
    console.log('Fase 1: Removendo duplicações...');
    const agentsDocPath = path.join(projectRoot, 'docs', 'AGENTS.md');
    if (fs.existsSync(agentsDocPath)) {
        fs.unlinkSync(agentsDocPath);
        console.log('  ✅ Removido: docs/AGENTS.md (duplicado)\n');
    } else {
        console.log('  ⚠️  docs/AGENTS.md não encontrado\n');
    }

    // Fase 3: Criar diretório de arquivo
    console.log('Fase 3: Criando diretório de arquivo...');
    const archiveDir = path.join(projectRoot, 'docs', 'archive', 'fixes');
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
        console.log('  ✅ Criado: docs/archive/fixes/\n');
    } else {
        console.log('  ✅ Diretório docs/archive/fixes/ já existe\n');
    }

    // Fase 3: Mover arquivos temporários para arquivo
    console.log('Movendo arquivos de correções para docs/archive/fixes/...');
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

    let movedCount = 0;
    tempFiles.forEach(file => {
        const srcPath = path.join(projectRoot, file);
        const destPath = path.join(archiveDir, file);

        if (fs.existsSync(srcPath)) {
            fs.renameSync(srcPath, destPath);
            console.log(`  ✅ ${file} → docs/archive/fixes/`);
            movedCount++;
        } else {
            console.log(`  ⚠️  ${file} não encontrado`);
        }
    });

    console.log(`\n✨ Fase 1 e 3 concluídas!`);
    console.log(`   - ${movedCount} arquivos movidos para arquivo`);
    console.log(`   - docs/AGENTS.md duplicado removido\n`);
    console.log('Próximo passo: Fase 2 - Consolidar arquivos PERFORMANCE_OPTIMIZATION.md e SECURITY.md\n');

} catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
}
