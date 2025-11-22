# MCP Mercado Livre - Troubleshooting de Conexão

## Problema: MCP fica ativo mas perde conexão

### Sintomas
- ✅ MCP aparece como "ativo" no Cursor
- ❌ Depois de alguns minutos, perde conexão
- ❌ Mostra "Loading tools" ou erro de conexão
- ❌ Precisa reiniciar o Cursor para funcionar novamente

## Causas Comuns

### 1. Token Expirado ⚠️ (Mais Comum)

**Problema:** Tokens do Mercado Livre expiram após 6 horas.

**Como verificar:**
```bash
node -e "const config = require('./config.json'); const expiresAt = config.mercadolivre?.tokenExpiresAt; if (expiresAt) { const now = Date.now(); const isExpired = now >= expiresAt; console.log('Expired:', isExpired, 'Expires at:', new Date(expiresAt).toISOString()); }"
```

**Solução:**
1. Renovar o token:
   - Settings page → "Renovar Token"
   - Ou API: `POST /api/mercadolivre/auth/refresh`

2. Sincronizar com MCP:
   ```bash
   node scripts/sync-mcp-token.js
   ```

3. Reiniciar o Cursor

### 2. Timeout de Conexão

**Problema:** O servidor MCP externo pode ter timeout de inatividade.

**Solução:**
- O Cursor deve fazer keep-alive automaticamente
- Se não funcionar, tente usar OAuth flow ao invés de token manual

### 3. Problemas de Rede

**Problema:** Conexão instável ou firewall bloqueando.

**Como verificar:**
```bash
# Testar conexão com o servidor MCP
curl -v https://mcp.mercadolibre.com/mcp

# Testar token
curl -H "Authorization: Bearer SEU_TOKEN" https://api.mercadolivre.com/users/me
```

**Solução:**
- Verificar firewall/proxy
- Verificar conexão de internet
- Tentar de outra rede

### 4. Servidor MCP Externo Indisponível

**Problema:** O servidor `https://mcp.mercadolibre.com/mcp` pode estar temporariamente indisponível.

**Solução:**
- Aguardar alguns minutos
- Verificar status do Mercado Livre
- Tentar novamente mais tarde

## Diagnóstico Rápido

Execute o script de monitoramento:

```bash
node scripts/monitor-mcp-connection.js
```

Este script verifica:
- ✅ Expiração do token
- ✅ Validade do token
- ✅ Conectividade com servidor MCP
- ✅ Sincronização entre config.json e mcp.json

## Soluções Recomendadas

### Solução 1: Usar OAuth Flow (Recomendado para evitar quedas)

**Vantagens:**
- ✅ Renovação automática de token
- ✅ Gerenciamento automático de conexão
- ✅ Menos problemas de expiração

**Como configurar:**
1. Remover token manual do `mcp.json`:
   ```json
   {
     "mcpServers": {
       "mercadolibre-mcp-server": {
         "url": "https://mcp.mercadolibre.com/mcp"
         // Remover a linha "headers"
       }
     }
   }
   ```

2. Reiniciar o Cursor
3. O Cursor abrirá OAuth flow automaticamente
4. Autorizar e deixar o servidor gerenciar

### Solução 2: Monitoramento e Renovação Proativa

**Script de monitoramento já disponível:**

```bash
# Verificar status completo
node scripts/monitor-mcp-connection.js
```

**Renovação automática antes de expirar:**

Criar um script que renova o token quando faltam menos de 1 hora:

```bash
# scripts/auto-refresh-token.js
node -e "
const config = require('./config.json');
const expiresAt = config.mercadolivre?.tokenExpiresAt;
if (expiresAt) {
  const now = Date.now();
  const expiresIn = expiresAt - now;
  const oneHour = 60 * 60 * 1000;
  if (expiresIn < oneHour && expiresIn > 0) {
    console.log('Token expira em menos de 1 hora, execute:');
    console.log('curl -X POST http://localhost:3000/api/mercadolivre/auth/refresh');
    console.log('node scripts/sync-mcp-token.js');
  }
}
"
```

**Executar periodicamente:**
- Via cron (Linux/Mac): `0 */5 * * * cd /path/to/project && node scripts/monitor-mcp-connection.js`
- Via Task Scheduler (Windows): Criar tarefa que executa a cada 5 horas

### Solução 3: Reiniciar Cursor Periodicamente

Se o MCP continuar caindo mesmo com token válido:

**Solução temporária:**
- Reiniciar o Cursor a cada 4-5 horas
- Isso força uma nova conexão com o servidor MCP

**Solução permanente:**
- Usar OAuth flow (Solução 1) - o Cursor gerencia a conexão automaticamente
- O servidor MCP externo pode ter timeout de inatividade que o OAuth flow contorna melhor

### Solução 4: Verificar Logs do Cursor

**Como verificar:**
1. Cursor Settings → Tools & Integrations
2. Clique no servidor `mercadolibre-mcp-server`
3. Verifique os logs para erros específicos
4. Procure por:
   - Timeout errors
   - Connection reset
   - Authentication errors
   - Network errors

## Checklist de Diagnóstico

Quando o MCP perder conexão, verifique:

- [ ] Token está expirado?
  ```bash
  node scripts/sync-mcp-token.js
  ```

- [ ] Token está válido?
  ```bash
  curl -H "Authorization: Bearer SEU_TOKEN" https://api.mercadolivre.com/users/me
  ```

- [ ] Servidor MCP está acessível?
  ```bash
  curl -v https://mcp.mercadolibre.com/mcp
  ```

- [ ] Configuração do MCP está correta?
  - Verificar `~/.cursor/mcp.json` ou `C:\Users\USER\.cursor\mcp.json`
  - Verificar formato do Authorization header: `Bearer TOKEN`

- [ ] Cursor precisa ser reiniciado?
  - Fechar completamente o Cursor
  - Abrir novamente
  - Verificar status do MCP

## Prevenção

### 1. Monitoramento Automático

Criar um script que verifica o token periodicamente:

```javascript
// scripts/monitor-mcp-token.js
const fs = require('fs');
const path = require('path');

setInterval(() => {
  const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
  const expiresAt = config.mercadolivre?.tokenExpiresAt;
  
  if (expiresAt) {
    const now = Date.now();
    const expiresIn = expiresAt - now;
    const oneHour = 60 * 60 * 1000;
    
    if (expiresIn < oneHour && expiresIn > 0) {
      console.log('⚠️ Token expira em menos de 1 hora!');
      console.log('Execute: node scripts/sync-mcp-token.js');
    }
  }
}, 30 * 60 * 1000); // Verificar a cada 30 minutos
```

### 2. Notificação de Expiração

Adicionar alerta no frontend quando token está próximo de expirar.

### 3. Renovação Automática

Implementar renovação automática no backend antes da expiração.

## Logs Úteis

### Verificar Logs do Cursor MCP

1. Abrir Cursor Settings
2. Tools & Integrations
3. Ver logs do servidor MCP
4. Procurar por erros de conexão ou autenticação

### Verificar Logs do Projeto

```bash
# Ver logs de erro
tail -f logs/error.log

# Ver todos os logs
tail -f logs/combined.log
```

## Contato e Suporte

Se o problema persistir:

1. Verificar documentação oficial do Mercado Livre MCP
2. Verificar status do servidor MCP
3. Verificar se há atualizações do Cursor
4. Reportar problema ao suporte do Mercado Livre (se aplicável)

## Referências

- `MERCADOLIVRE_MCP_SETUP.md` - Guia de configuração
- `MERCADOLIVRE_QUICK_FIX.md` - Soluções rápidas
- `MERCADOLIVRE_GUIDE.md` - Guia completo

