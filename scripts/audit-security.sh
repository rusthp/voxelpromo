#!/bin/bash

# ============================================
# 🔍 VoxelPromo - Auditoria de Segurança
# ============================================

echo "🔍 Iniciando auditoria de segurança..."
echo ""

# 1. Verificar se config.json está no Git
echo "📋 1. Verificando se config.json está versionado no Git:"
if git ls-files --error-unmatch config.json 2>/dev/null; then
    echo "   ⚠️  ALERTA: config.json ESTÁ NO GIT (RISCO DE SEGURANÇA!)"
    echo "   💡 Solução: git rm --cached config.json && git commit -m 'Remove config.json'"
else
    echo "   ✅ OK: config.json NÃO está no Git"
fi
echo ""

# 2. Verificar .gitignore
echo "📋 2. Verificando .gitignore:"
if grep -q "^config.json$" .gitignore 2>/dev/null; then
    echo "   ✅ config.json está no .gitignore"
else
    echo "   ⚠️  config.json NÃO está no .gitignore"
    echo "   💡 Adicione: echo 'config.json' >> .gitignore"
fi

if grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo "   ✅ .env está no .gitignore"
else
    echo "   ⚠️  .env NÃO está no .gitignore"
    echo "   💡 Adicione: echo '.env' >> .gitignore"
fi
echo ""

# 3. Verificar credenciais em config.json
echo "📋 3. Analisando credenciais em config.json:"
CREDS_COUNT=0

if grep -q '"accessToken":\s*"[^"]\+' config.json 2>/dev/null; then
    echo "   ⚠️  Tokens de acesso encontrados"
    ((CREDS_COUNT++))
fi

if grep -q '"apiKey":\s*"[^"]\+' config.json 2>/dev/null; then
    echo "   ⚠️  API Keys encontradas"
    ((CREDS_COUNT++))
fi

if grep -q '"secret":\s*"[^"]\+' config.json 2>/dev/null; then
    echo "   ⚠️  Secrets encontrados"
    ((CREDS_COUNT++))
fi

if grep -q '"botToken":\s*"[^"]\+' config.json 2>/dev/null; then
    echo "   ⚠️  Bot tokens encontrados"
    ((CREDS_COUNT++))
fi

if [ $CREDS_COUNT -eq 0 ]; then
    echo "   ✅ Nenhuma credencial aparente em config.json"
else
    echo ""
    echo "   🚨 TOTAL: $CREDS_COUNT tipos de credenciais em config.json"
    echo "   💡 Execute o script de migração para mover para .env"
fi
echo ""

# 4. Verificar se .env existe e tem credenciais
echo "📋 4. Verificando .env:"
if [ -f .env ]; then
    echo "   ✅ Arquivo .env existe"
    
    # Contar variáveis de ambiente
    ENV_VARS=$(grep -c "^[A-Z_]*=" .env 2>/dev/null || echo "0")
    echo "   📊 Total de variáveis: $ENV_VARS"
    
    # Verificar Instagram
    if grep -q "^INSTAGRAM_WEBHOOK_VERIFY_TOKEN=" .env; then
        TOKEN=$(grep "^INSTAGRAM_WEBHOOK_VERIFY_TOKEN=" .env | cut -d'=' -f2)
        if [ -z "$TOKEN" ]; then
            echo "   ⚠️  INSTAGRAM_WEBHOOK_VERIFY_TOKEN está VAZIO"
        else
            echo "   ✅ INSTAGRAM_WEBHOOK_VERIFY_TOKEN configurado"
        fi
    else
        echo "   ⚠️  INSTAGRAM_WEBHOOK_VERIFY_TOKEN não encontrado"
    fi
else
    echo "   ❌ Arquivo .env NÃO existe!"
fi
echo ""

# 5. Verificar permissões de arquivos sensíveis
echo "📋 5. Verificando permissões de arquivos:"
for file in .env config.json; do
    if [ -f "$file" ]; then
        PERMS=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null)
        if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
            echo "   ✅ $file: $PERMS (seguro)"
        else
            echo "   ⚠️  $file: $PERMS (RECOMENDADO: 600)"
            echo "      💡 Execute: chmod 600 $file"
        fi
    fi
done
echo ""

# 6. Verificar se aplicação está lendo .env
echo "📋 6. Testando se aplicação lê .env corretamente:"
if pm2 list | grep -q "voxelpromo"; then
    echo "   ✅ VoxelPromo está rodando no PM2"
    
    # Verificar variáveis de ambiente do processo
    PM2_ID=$(pm2 list | grep "voxelpromo" | awk '{print $2}')
    echo "   📊 PM2 ID: $PM2_ID"
else
    echo "   ⚠️  VoxelPromo NÃO está rodando no PM2"
fi
echo ""

# 7. Testar webhook do Instagram
echo "📋 7. Testando webhook do Instagram:"
WEBHOOK_RESPONSE=$(curl -s "https://voxelpromo.com/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=voxelpromo_codextoken_2026&hub.challenge=teste123" 2>/dev/null)

if [ "$WEBHOOK_RESPONSE" = "teste123" ]; then
    echo "   ✅ Webhook respondendo corretamente!"
else
    echo "   ❌ Webhook NÃO está funcionando"
    echo "   📝 Resposta: $WEBHOOK_RESPONSE"
    echo "   💡 Verifique se INSTAGRAM_WEBHOOK_VERIFY_TOKEN está no .env"
fi
echo ""

# Resumo final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO DA AUDITORIA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $CREDS_COUNT -gt 0 ]; then
    echo "🚨 AÇÃO NECESSÁRIA:"
    echo "   1. Execute: ./scripts/migrate-to-env.sh"
    echo "   2. Reinicie: pm2 restart voxelpromo"
    echo "   3. Teste webhook novamente"
else
    echo "✅ Configuração de segurança OK"
fi

echo ""
echo "📁 Backups disponíveis:"
ls -lh *.backup.* 2>/dev/null | tail -5 || echo "   (nenhum backup)"
echo ""
