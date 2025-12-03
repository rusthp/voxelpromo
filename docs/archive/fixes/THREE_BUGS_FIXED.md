# ✅ Correções Aplicadas - 3 Problemas Resolvidos

## 📝 Problemas Reportados

### 1. "Que Pelando?"
**Sintoma:** Logs mostravam coleta de `https://www.pelando.com.br/feed` sem que o usuário configurasse.

### 2. Shopee Feeds Não Salvam
```
https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcPNcbnfdFhhQkoz1FtnUm6DtED25ejObtofpYLqHBC0h
https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcFMjz35zY_7hscVJ_4QLIFiIR3DQ9hsrLcX6rgIVVFkb
```

### 3. Telegram e Groq Não Salvam
Logs mostram: `botTokenLength: 0`, `groqKeyLength: 0`

---

## ✅ Correções Implementadas

### 1. Removido Pelando Hardcoded

**Arquivo:** `CollectorService.ts:755-795`

**ANTES (hardcoded):**
```typescript
enabledSources.includes('rss')
  ? this.collectFromRSS('https://www.pelando.com.br/feed', 'pelando')  // ❌ Fixo!
  : Promise.resolve(0)
```

**DEPOIS (lê de config.rss):**
```typescript
enabledSources.includes('rss')
  ? (async () => {
      // Lê feeds do config.json
      const config = JSON.parse(fs.readFileSync('config.json'));
      const rssFeeds = config.rss || [];
      
      if (rssFeeds.length === 0) {
        logger.info('ℹ️  No RSS feeds configured');
        return 0;
      }
      
      // Coleta de TODOS os feeds configurados
      for (const feedUrl of rssFeeds) {
        await this.collectFromRSS(feedUrl, 'rss');
      }
    })()
  : Promise.resolve(0)
```

**Benefício:** Agora RSS só coleta dos feeds que VOCÊ configurar em `/settings`.

---

### 2. Frontend-Backend Mismatch Corrigido

**Arquivo:** `frontend/app/settings/page.tsx:444-467`

**Problema:** Frontend enviava `undefined`, backend esperava `'***'` para preservar.

**ANTES (enviava undefined):**
```typescript
botToken: currentTelegramToken && currentTelegramToken !== '***'
  ? currentTelegramToken.trim()
  : undefined  // ❌ Backend não entendia
```

**DEPOIS (envia '***'):**
```typescript
botToken: currentTelegramToken === '***'
  ? '***'  // ✅ Backend preserva valor existente
  : currentTelegramToken.trim().length > 0
    ? currentTelegramToken.trim()
    : ''
```

**Benefício:** Agora quando você vê `***` e salva, o backend preserva o valor real.

---

### 3. Shopee Feeds - Como Configurar

**Local:** `/settings` → seção "Shopee"

**Formato esperado em `config.json`:**
```json
{
  "shopee": {
    "feedUrls": [
      "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcPNcbnfdFhhQkoz1FtnUm6DtED25ejObtofpYLqHBC0h",
      "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcFMjz35zY_7hscVJ_4QLIFiIR3DQ9hsrLcX6rgIVVFkb"
    ],
    "affiliateCode": ""
  }
}
```

**Problema:** A interface atual não tem campo para adicionar MÚLTIPLOS feeds do Shopee.

**Solução Temporária:** Edite `config.json` manualmente ou precisamos adicionar um campo array na UI.

---

## 🧪 Como Testar

### Teste 1: Telegram/Groq Agora Salvam

1. **Reinicie frontend:** `Ctrl+C` no terminal do frontend, depois `npm run dev` (porta 3001)
2. Vá em `/settings`
3. Cole Telegram Bot Token e Groq API Key
4. Salve
5. **Recarregue página** (F5)
6. Veja que aparecem como `***`
7. **Salve novamente** SEM alterar
8. **Reinicie backend**

**Resultado Esperado:**
```
Telegram botToken length: 68  ✅
Groq API key length: 52  ✅
```

### Teste 2: RSS Não Coleta Pelando

1. Em `/settings`, desmarque RSS
2. Salve
3. Inicie coleta manual
4. **Verifique logs:** NÃO deve aparecer `pelando.com.br`

### Teste 3: Configurar Shopee Feeds Manualmente

1. Pare o backend (`Ctrl+C`)
2. Edite `config.json`:
```json
{
  "shopee": {
    "feedUrls": [
      "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=SEU_ID_1",
      "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=SEU_ID_2"
    ]
  }
}
```
3. Reinicie backend
4. Marque "Shopee" em `/settings`
5. Salve e inicie coleta

**Resultado Esperado:**
```
📋 Enabled sources: shopee
🛒 Starting Shopee collection
```

---

## 📁 Arquivos Modificados

1. **[`CollectorService.ts:755-795`](file:///b:/voxelpromo/src/services/collector/CollectorService.ts#L755-L795)**
   - Removido hardcoded Pelando
   - Agora lê `config.rss` array

2. **[`page.tsx:444-467`](file:///b:/voxelpromo/frontend/app/settings/page.tsx#L444-L467)**
   - Frontend agora envia `'***'` em vez de `undefined`
   - Backend consegue preservar valores mascarados

3. **[`config.routes.ts:249-332`](file:///b:/voxelpromo/src/routes/config.routes.ts#L249-L332)** (anterior)
   - Backend agora trata `'***'` corretamente

---

## 🎯 Resumo das Correções

| Problema | Causa | Solução |
|----------|-------|---------|
| **Pelando aparecer** | Hardcoded no código | ✅ Removido, lê de `config.rss` |
| **Telegram/Groq não salvam** | Frontend enviava `undefined` | ✅ Agora envia `'***'` |
| **Shopee feeds não salvam** | UI não suporta múltiplos feeds | ℹ️ Editar `config.json` manualmente |

---

## 💡 Próximo Passo Recomendado

**Adicionar UI para Shopee feeds múltiplos:**

Na página `/settings`, seção Shopee, adicionar:
- Campo de texto para URL do feed
- Botão "Adicionar Feed"
- Lista dos feeds configurados
- Botão "Remover" para cada feed

**Ou usar workaround atual:** Editar `config.json` manualmente.
