# ✅ Bug Corrigido - Configurações Não Persistiam

## 🐛 Problema Encontrado

Usuário reportou que após configurar APIs (X/Twitter, Telegram, Groq) e reiniciar o backend 2-3 vezes, as configurações voltavam ao padrão ou apareciam em branco.

### Sintomas

1. Configurar API keys na interface
2. Recarregar página → valores aparecem como `***` (mascarados por segurança)
3. Salvar outras configurações SEM alterar os campos masked
4. Reiniciar backend
5. **Resultado:** APIs voltam para branco ou desaparecem

![Telegram Config](file:///C:/Users/ally/.gemini/antigravity/brain/6fe59128-1fc5-4136-b2d4-9d21ae56ecac/uploaded_image_0_1764119962491.png)
![AliExpress Config](file:///C:/Users/ally/.gemini/antigravity/brain/6fe59128-1fc5-4136-b2d4-9d21ae56ecac/uploaded_image_1_1764119962491.png)

---

## 🔍 Causa Raiz

**Arquivo:** `src/routes/config.routes.ts:249-328`

### O Que Estava Acontecendo

1. **Backend carrega config.json** → `groqApiKey: "gsk_ABC123..."`
2. **Frontend GET /api/config** → Backend mascara: `groqApiKey: "***"`
3. **Usuário vê** `***` nos campos sensíveis (correto para segurança)
4. **Usuário salva** outras configs sem tocar nos campos `***`
5. **Frontend envia** `groqApiKey: "***"` de volta
6. **Backend recebe** e processa:

```typescript
// CÓDIGO ERRADO (linhas ~318-322):
groqApiKey:
  config.ai?.groqApiKey !== undefined
    ? config.ai.groqApiKey !== '***' && config.ai.groqApiKey.trim().length > 0
      ? config.ai.groqApiKey.trim()      // Usa novo valor se válido
      : ''  // ❌ APAGA se for '***' ou vazio!
    : existingConfig.ai?.groqApiKey || ''
```

**Problema:** A condição `!== '***'` retorna `false`, então cai no `: ''` e apaga o valor!

7. **Backend salva** `groqApiKey: ""` (string vazia) no `config.json`
8. **Próximo restart** → valor perdido!

### Código Telegram (CORRETO)

O código do Telegram (linha 229-236) estava CORRETO desde o início:

```typescript
// CÓDIGO CORRETO:
botToken:
  config.telegram?.botToken !== undefined
    ? config.telegram.botToken === '***'
      ? existingConfig.telegram?.botToken || ''  // ✅ PRESERVA se masked
      : config.telegram.botToken.trim()
    : existingConfig.telegram?.botToken || ''
```

**Funciona bem:** Se receber `***`, usa o valor que já existia em `config.json`.

---

## ✅ Correção Implementada

Aplicamos a **mesma lógica do Telegram** para TODOS os campos sensíveis:

###  1. Groq API Key (linha ~318-327)

```typescript
// ANTES (ERRADO):
groqApiKey: config.ai.groqApiKey !== '***' && ...
  ? config.ai.groqApiKey.trim()
  : '' // ❌ Apaga

// DEPOIS (CORRETO):
groqApiKey:
  config.ai?.groqApiKey !== undefined
    ? config.ai.groqApiKey === '***'
      ? existingConfig.ai?.groqApiKey || '' // ✅ Preserva
      : config.ai.groqApiKey.trim().length > 0
        ? config.ai.groqApiKey.trim()
        : ''
    : existingConfig.ai?.groqApiKey || ''
```

### 2. OpenAI API Key (linha ~324-332)

Mesma correção aplicada.

### 3. X/Twitter Credentials (linhas ~251-308)

Corrigidos TODOS os campos do X:
- `bearerToken`
- `apiKey`
- `apiKeySecret`
- `accessToken`
- `accessTokenSecret`
- `oauth2ClientId`
- `oauth2ClientSecret`

**Exemplo (bearerToken):**
```typescript
// ANTES:
bearerToken: config.x.bearerToken !== '***' && ...
  ? config.x.bearerToken.trim()
  : '' // ❌ Apaga

// DEPOIS:
bearerToken:
  config.x?.bearerToken !== undefined
    ? config.x.bearerToken === '***'
      ? existingConfig.x?.bearerToken || '' // ✅ Preserva
      : config.x.bearerToken.trim().length > 0
        ? config.x.bearerToken.trim()
        : ''
    : existingConfig.x?.bearerToken || ''
```

---

## 🧪 Como Testar

### Teste 1: Groq API Key

1. Abra `/settings`
2. Cole sua Groq API Key: `gsk_ABC123...`
3. Clique em "Salvar Configurações"
4. **Recarregue a página** (F5)
5. Verifique que aparece `***` (campo mascarado)
6. **Salve novamente** sem alterar nada
7. **Reinicie o backend** (`Ctrl+C`, `npm run dev`)
8. **Recarregue a página**

**Resultado Esperado:** ✅ Campo ainda mostra `***` (valor preservado)
**Antes (bug):** ❌ Campo fica em branco

### Teste 2: X/Twitter Credentials

1. Configure `API Key`, `API Key Secret`, etc.
2. Salve
3. Recarregue → devem aparecer como `***`
4. Configure OUTRA opção (ex: Telegram)
5. Salve
6. Reinicie backend
7. Recarregue

**Resultado Esperado:** ✅ X credentials ainda aparecem como `***`
**Antes (bug):** ❌ Campos ficavam em branco

### Teste 3: Verificar config.json

```bash
# Linux/WSL:
cat config.json | grep -A 3 '"ai"'

# Ou abra config.json e verifique:
```

```json
{
  "ai": {
    "provider": "groq",
    "groqApiKey": "gsk_ABC123..."  // ✅ Valor real preservado
  }
}
```

**Antes (bug):**
```json
{
  "ai": {
    "groqApiKey": ""  // ❌ String vazia
  }
}
```

---

## 📁 Arquivos Modificados

**[`config.routes.ts:249-332`](file:///b:/voxelpromo/src/routes/config.routes.ts#L249-L332)**

**Campos corrigidos:**
- ✅ `x.bearerToken` (linha 251-259)
- ✅ `x.apiKey` (linha 260-267)
- ✅ `x.apiKeySecret` (linha 268-275)
- ✅ `x.accessToken` (linha 276-283)
- ✅ `x.accessTokenSecret` (linha 284-291)
- ✅ `x.oauth2ClientId` (linha 293-300)
- ✅ `x.oauth2ClientSecret` (linha 301-308)
- ✅ `ai.groqApiKey` (linha 318-327)
- ✅ `ai.openaiApiKey` (linha 324-332)

---

## 🎯 Lógica de Mascaramento (Como Funciona)

### Fluxo Completo

```
┌─────────────────────────────────────────┐
│ 1. Backend lê config.json               │
│    groqApiKey: "gsk_ABC123..."          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 2. GET /api/config (backend)            │
│    Mascara valores sensíveis:           │
│    groqApiKey: "***"                    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 3. Frontend mostra input                │
│    value="***"                          │
│    (usuário NÃO vê chave real)          │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
USUÁRIO NÃO     USUÁRIO ALTERA
  ALTERA         CAMPO
    │                 │
    ▼                 ▼
┌─────────┐     ┌──────────────┐
│ Envia   │     │ Envia novo   │
│ "***"   │     │ valor        │
└────┬────┘     └──────┬───────┘
     │                 │
     ▼                 ▼
┌──────────────────────────────────┐
│ 4. POST /api/config (backend)    │
│                                  │
│ if (value === '***') {           │
│   // ✅ PRESERVA existente       │
│   use existingConfig.groqApiKey  │
│ } else if (value.length > 0) {   │
│   // Usa novo valor              │
│   use value.trim()               │
│ } else {                         │
│   // Limpa                       │
│   use ''                         │
│ }                                │
└──────────┬───────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ 5. Salva em config.json         │
│    groqApiKey: "gsk_ABC123..."  │
│    (valor original preservado)  │
└─────────────────────────────────┘
```

---

## ✅ Benefícios

| Antes (Bug) | Depois (Corrigido) |
|-------------|---------------------|
| ❌ Valores `***` eram apagados | ✅ Valores `***` preservam original |
| ❌ Após reload, campos vazios | ✅ Após reload, `***` continua |
| ❌ Perdia config ao salvar outras opções | ✅ Mantém TODAS as configs |
| ❌ Usuário precisava reconfigurar sempre | ✅ Configura UMA vez, persiste sempre |
| ❌ Terminal mostra: "not configured" | ✅ Terminal mostra: config carregada |

---

## 🎉 Resultado

Agora quando você:
1. ✅ Configura APIs (X, Groq, Telegram) pela 1ª vez
2. ✅ Salva → valores vão para `config.json`
3. ✅ Recarrega página → aparecem como `***` (segurança)
4. ✅ Salva outras configurações
5. ✅ Reinicia backend (`npm run dev`)
6. ✅ **Configurações permanecem!** (não voltam para branco)

**Problema resolvido!** 🎊
