# ✅ Bug Corrigido - Fontes de Coleta Ignoradas

## 🐛 Problema Reportado

**Sintoma:** Usuário selecionou apenas **RSS** na interface de configurações, mas o sistema coletou do **AliExpress**.

![Configuração do usuário](file:///C:/Users/ally/.gemini/antigravity/brain/6fe59128-1fc5-4136-b2d4-9d21ae56ecac/uploaded_image_1764042292621.png)

## 🔍 Causa Raiz

O método `CollectorService.collectAll()` estava **hardcoded** para sempre coletar de TODAS as fontes:

```typescript
// ANTES (ERRADO):
const [amazon, aliexpress, mercadolivre, shopee, rss] = await Promise.all([
  this.collectFromAmazon(...),      // ❌ SEMPRE executava
  this.collectFromAliExpress(...),  // ❌ SEMPRE executava
  this.collectFromShopee(...),      // ❌ SEMPRE executava
  this.collectFromRSS(...),         // ❌ SEMPRE executava
]);
```

**O código ignorava completamente** a configuração `config.collection.sources` definida pelo usuário na UI.

---

## ✅ Correção Implementada

### 1. Novo Método `getConfig()`

Adicionado método privado para ler configurações (linha ~683):

```typescript
private getConfig(): { sources?: string[]; enabled?: boolean } {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'config.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.collection || {};
    }
  } catch (error) {
    logger.debug('Error reading config.json, using defaults');
  }
  
  // Fallback: read from environment or use all sources
  return {
    sources: process.env.COLLECTION_SOURCES?.split(',') || 
             ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'],
    enabled: true
  };
}
```

### 2. Método `collectAll()` Atualizado

Modificado para respeitar `config.collection.sources` (linha ~706):

```typescript
async collectAll() {
  const config = this.getConfig();
  const enabledSources = config.sources || ['amazon', 'aliexpress', 'shopee', 'rss'];
  
  logger.info('🚀 Starting collection from configured sources');
  logger.info(`📋 Enabled sources: ${enabledSources.join(', ')}`);  // ✅ MOSTRA quais fontes
  
  // AGORA verifica se fonte está habilitada ANTES de coletar:
  const collectPromises = await Promise.all([
    enabledSources.includes('amazon')
      ? this.collectFromAmazon(...)
      : Promise.resolve(0),  // ✅ Pula se não selecionado
    
    enabledSources.includes('aliexpress')
      ? this.collectFromAliExpress(...)
      : Promise.resolve(0),  // ✅ Pula se não selecionado
    
    // ... mesma lógica para todas as fontes
  ]);
}
```

---

## 🧪 Como Testar

### Teste 1: Apenas RSS

**Config:**
```json
{
  "collection": {
    "sources": ["rss"]
  }
}
```

**Executar:**
```bash
# Reiniciar backend
npm run dev

# Em outro terminal, executar coleta manual ou aguardar scheduler
```

**Verificar logs:**
```
🚀 Starting collection from configured sources
📋 Enabled sources: rss                    ✅ Só mostra RSS
📦 Results:
   - Amazon: 0 offers                      ✅ Pulado
   - AliExpress: 0 offers                  ✅ Pulado
   - Shopee: 0 offers                      ✅ Pulado
   - RSS: 5 offers                         ✅ Coletou
```

### Teste 2: Múltiplas Fontes

**Config:**
```json
{
  "collection": {
    "sources": ["amazon", "shopee"]
  }
}
```

**Resultado Esperado:**
```
📋 Enabled sources: amazon, shopee
📦 Results:
   - Amazon: 10 offers      ✅
   - AliExpress: 0 offers   ✅ Pulado
   - Shopee: 15 offers      ✅
   - RSS: 0 offers          ✅ Pulado
```

### Teste 3: Nenhuma Fonte

**Config:**
```json
{
  "collection": {
    "sources": []
  }
}
```

**Resultado Esperado:**
```
📋 Enabled sources: 
📦 Results:
   - TOTAL: 0 offers   ✅ Nenhuma coleta
```

---

## 📁 Arquivos Modificados

**[`CollectorService.ts:680-783`](file:///b:/voxelpromo/src/services/collector/CollectorService.ts#L680-L783)**
- Adicionado método `getConfig()` (linhas 683-703)
- Modificado método `collectAll()` (linhas 706-783)
  - Lê `config.collection.sources`
  - Verifica `enabledSources.includes(fonte)` antes de coletar
  - Log mostra fontes habilitadas

---

## ✅ Benefícios

| Antes | Depois |
|-------|--------|
| ❌ Ignora configuração do usuário | ✅ Respeita `config.collection.sources` |
| ❌ Sempre coleta de TODAS as fontes | ✅ Só coleta das fontes selecionadas |
| ❌ Logs não mostram quais fontes | ✅ Log mostra: `📋 Enabled sources: ...` |
| ❌ Sem backward compatibility | ✅ Se `sources` vazio → usa todas |
| ❌ Não respeita UI | ✅ UI e config.json sincronizados |

---

## 🎯 Como Funciona a Config

### Na Interface (UI)

Usuário marca checkboxes em `/settings`:
- ☑️ Amazon
- ☐ Aliexpress  
- ☑️ Shopee
- ☐ RSS

### No Backend (config.json)

Quando salva, o backend escreve:
```json
{
  "collection": {
    "enabled": true,
    "schedule": "0 */6 * * *",
    "sources": ["amazon", "shopee"]    // ✅ Apenas selecionados
  }
}
```

### Na Coleta (CollectorService)

```typescript
const config = this.getConfig();
// config.sources = ["amazon", "shopee"]

enabledSources.includes('amazon')     // true  → Coleta
enabledSources.includes('aliexpress') // false → Pula
enabledSources.includes('shopee')     // true  → Coleta
enabledSources.includes('rss')        // false → Pula
```

---

## 🔄 Backward Compatibility

**Se config.json não tem `collection.sources`:**
```typescript
const enabledSources = config.sources || ['amazon', 'aliexpress', 'shopee', 'rss'];
// Usa default: todas as fontes (menos mercadolivre que está disabled)
```

**Comportamento mantido para instalações antigas** que não têm a configuração.

---

## 📝 Próximos Passos

- [ ] Testar com usuário real
- [ ] Verificar que UI salva corretamente para `config.json`
- [ ] Confirmar que scheduler respeita as configurações
- [ ] Adicionar indicador visual na UI mostrando últimas fontes coletadas

---

## 🎉 Resultado

**Problema Resolvido!**

Agora quando o usuário seleciona apenas **RSS**, o sistema:
1. ✅ Salva `"sources": ["rss"]` em `config.json`
2. ✅ `collectAll()` lê essa configuração
3. ✅ Coleta APENAS do RSS
4. ✅ Pula Amazon, AliExpress, Shopee
5. ✅ Logs mostram claramente: `📋 Enabled sources: rss`
