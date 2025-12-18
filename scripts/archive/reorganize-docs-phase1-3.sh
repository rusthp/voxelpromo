#!/bin/bash

# Script para reorganizar documentação do VoxelPromo
# Fase 1 e 3: Remover duplicações e arquivar documentação temporal

echo "📁 Reorganizando documentação VoxelPromo..."
echo ""

# Navegar para o diretório do projeto
cd "$(dirname "$0")/.." || exit 1

# Fase 1: Remover docs/AGENTS.md (duplicado)
echo "Fase 1: Removendo duplicações..."
if [ -f "docs/AGENTS.md" ]; then
  rm "docs/AGENTS.md"
  echo "  ✅ Removido: docs/AGENTS.md (duplicado)"
else
  echo "  ⚠️  docs/AGENTS.md não encontrado"
fi

# Fase 3: Criar diretório de arquivo
echo ""
echo "Fase 3: Criando diretório de arquivo..."
mkdir -p "docs/archive/fixes"
echo "  ✅ Criado: docs/archive/fixes/"

# Fase 3: Mover arquivos temporários para arquivo
echo ""
echo "Movendo arquivo de correções para docs/archive/fixes/..."

TEMP_FILES=(
  "THREE_BUGS_FIXED.md"
  "SHOPEE_PERFORMANCE_OPTIMIZATION.md"
  "SHOPEE_ALIEXPRESS_ANALYSIS.md"
  "CONFIG_PERSISTENCE_FIX.md"
  "COLLECTION_SOURCES_FIX.md"
  "ALIEXPRESS_AFFILIATE_FIX.md"
  "ALIEXPRESS_TIMEOUT_FIX.md"
  "ALIEXPRESS_API_ERROR_ANALYSIS.md"
)

for file in "${TEMP_FILES[@]}"; do
  if [ -f "$file" ]; then
    mv "$file" "docs/archive/fixes/"
    echo "  ✅ $file → docs/archive/fixes/"
  else
    echo "  ⚠️  $file não encontrado"
  fi
done

echo ""
echo "✨ Fase 1 e 3 concluídas!"
echo ""
echo "Próximo passo: Fase 2 - Consolidar arquivos"
