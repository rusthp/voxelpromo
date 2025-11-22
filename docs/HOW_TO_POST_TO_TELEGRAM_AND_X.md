# 📤 Como Postar para Telegram e X (Twitter)

## Status Atual

### ⚠️ Por Padrão: Só Envia para Telegram

Atualmente, o sistema está configurado para enviar ofertas **apenas para Telegram** por padrão:

1. **Processo Automático (Cron Job)**: Envia apenas para Telegram às 9h da manhã
2. **Processo Manual (API)**: Por padrão, também envia apenas para Telegram

## Como Funciona

### 1. Processo Automático (Cron Job)

O sistema tem um cron job que posta ofertas automaticamente **todos os dias às 9h da manhã**:

```typescript
// src/jobs/scheduler.ts - linha 45
const postedCount = await offerService.postOffers(offerIds, ['telegram']);
```

**Atualmente**: Só envia para `['telegram']`

### 2. Processo Manual (API)

Quando você posta manualmente via API:

```bash
POST /api/offers/:id/post
Body: { channels: ['telegram'] }  # Padrão
```

**Atualmente**: Se não especificar `channels`, usa `['telegram']` como padrão

## Como Enviar para Ambos (Telegram + X)

### Opção 1: Modificar o Cron Job (Automático)

Para que o sistema envie automaticamente para **Telegram E X** às 9h da manhã:

**Arquivo**: `src/jobs/scheduler.ts`

**Mudança necessária** (linha 45):
```typescript
// ANTES:
const postedCount = await offerService.postOffers(offerIds, ['telegram']);

// DEPOIS:
const postedCount = await offerService.postOffers(offerIds, ['telegram', 'x']);
```

### Opção 2: Postar Manualmente via API

Para postar manualmente para ambos os canais:

```bash
POST /api/offers/:id/post
Content-Type: application/json

{
  "channels": ["telegram", "x"]
}
```

Ou usando `curl`:
```bash
curl -X POST http://localhost:3000/api/offers/OFFER_ID/post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"channels": ["telegram", "x"]}'
```

### Opção 3: Postar Apenas para X

Para postar apenas para X (Twitter):

```bash
POST /api/offers/:id/post
{
  "channels": ["x"]
}
```

## Canais Disponíveis

O sistema suporta os seguintes canais:

- `"telegram"` - Telegram
- `"x"` ou `"twitter"` - X (Twitter)
- `"whatsapp"` - WhatsApp (se configurado)

## Exemplo Completo

### Postar para Telegram e X:

```typescript
// Via API
POST /api/offers/507f1f77bcf86cd799439011/post
{
  "channels": ["telegram", "x"]
}
```

### Postar para Todos os Canais:

```typescript
POST /api/offers/507f1f77bcf86cd799439011/post
{
  "channels": ["telegram", "x", "whatsapp"]
}
```

## Verificação

Após postar, o sistema atualiza o campo `postedChannels` na oferta:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Produto em Oferta",
  "isPosted": true,
  "postedChannels": ["telegram", "x"],
  "postedAt": "2025-01-17T12:00:00.000Z"
}
```

## Requisitos

Para que o envio funcione, você precisa ter configurado:

### Telegram:
- ✅ `TELEGRAM_BOT_TOKEN` no `config.json` ou `.env`
- ✅ `TELEGRAM_CHAT_ID` no `config.json` ou `.env`

### X (Twitter):
- ✅ Credenciais OAuth 1.0a OU OAuth 2.0 configuradas
- ✅ Ver `docs/X_OAUTH2_IMPLEMENTATION.md` para detalhes

## Recomendação

Para enviar automaticamente para ambos os canais:

1. **Modifique o cron job** em `src/jobs/scheduler.ts`:
   ```typescript
   const postedCount = await offerService.postOffers(offerIds, ['telegram', 'x']);
   ```

2. **Reinicie o servidor** para aplicar as mudanças

3. **Verifique os logs** na próxima execução do cron job (9h da manhã)

## Troubleshooting

### Se não enviar para X:
1. Verifique se as credenciais do X estão configuradas
2. Verifique os logs do backend para erros
3. Teste manualmente via API primeiro

### Se não enviar para Telegram:
1. Verifique se o bot token está configurado
2. Verifique se o chat ID está correto
3. Teste manualmente via API primeiro

## Próximos Passos

1. ✅ Configurar credenciais do X (se ainda não configurado)
2. ⚠️ Modificar cron job para incluir 'x' nos canais
3. ✅ Testar manualmente via API
4. ✅ Verificar logs na próxima execução automática

