const fs = require('fs');
const path = require('path');

console.log('📁 Fase 2: Removendo arquivos consolidados da raiz...\n');

const projectRoot = path.join(__dirname, '..');

try {
    // Remover PERFORMANCE_OPTIMIZATION.md da raiz (já consolidado em docs/)
    const perfPath = path.join(projectRoot, 'PERFORMANCE_OPTIMIZATION.md');
    if (fs.existsSync(perfPath)) {
        fs.unlinkSync(perfPath);
        console.log('  ✅ Removido: PERFORMANCE_OPTIMIZATION.md (consolidado em docs/)');
    } else {
        console.log('  ⚠️  PERFORMANCE_OPTIMIZATION.md já foi removido');
    }

    // Remover SECURITY.md da raiz (será consolidado em docs/)
    const secPath = path.join(projectRoot, 'SECURITY.md');
    if (fs.existsSync(secPath)) {
        fs.unlinkSync(secPath);
        console.log('  ✅ Removido: SECURITY.md (consolidado em docs/)');
    } else {
        console.log('  ⚠️  SECURITY.md já foi removido');
    }

    console.log('\n✨ Fase 2 concluída!\n');

} catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
}
