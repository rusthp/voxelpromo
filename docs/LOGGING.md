# Sistema de Logs e Debug

## 📋 Onde Ver os Logs

### 1. **Terminal/Console do Backend**

Quando você executa `npm run dev:backend`, todos os logs aparecem no terminal:

```bash
[0] 2024-01-15 10:30:45 [info]: ✅ Telegram bot initialized
[0] 2024-01-15 10:30:45 [info]: 📱 Chat ID configured: -5038858254
[0] 2024-01-15 10:31:20 [info]: 📤 Sending offer to Telegram - Title: Produto XYZ
[0] 2024-01-15 10:31:21 [info]: ✅ Offer sent successfully to Telegram
```

### 2. **Arquivos de Log**

Os logs são salvos automaticamente em:

- `logs/combined.log` - Todos os logs
- `logs/error.log` - Apenas erros

### 3. **Dashboard (Frontend)**

Algumas informações aparecem no dashboard:
- Estatísticas de ofertas
- Status de coleta
- Mensagens de sucesso/erro ao salvar configurações

## 🔍 Tipos de Logs

### Logs de Inicialização
```
✅ Telegram bot initialized
📱 Chat ID configured: -5038858254
✅ Database connected
✅ Cron jobs scheduled
```

### Logs de Coleta
```
🔍 Starting Amazon collection - Keywords: "electronics"
📦 Found 20 products from Amazon
✅ Converted 15 products to offers
💾 Saved 15 offers from Amazon to database
```

### Logs de Envio
```
📤 Sending offer to Telegram - Title: Produto XYZ
✅ Offer sent successfully to Telegram: Produto XYZ (ID: 123)
```

### Logs de Erro
```
❌ Error sending offer to Telegram: chat not found
   Offer details - ID: 123, Title: Produto XYZ
```

## 🧪 Teste do Telegram

### Como Funciona

Quando você clica em **"Testar Bot"** na página de Configurações:

1. ✅ Verifica se o Bot Token é válido
2. ✅ Obtém informações do bot (username)
3. ✅ **ENVIA UMA MENSAGEM DE TESTE REAL** para o Chat ID configurado
4. ✅ Você recebe a mensagem no Telegram/grupo

### Mensagem de Teste

A mensagem enviada é:

```
🤖 Teste do VoxelPromo

✅ Bot configurado com sucesso!

📅 Data/Hora: [data atual]
🔗 Sistema: VoxelPromo - Monitoramento de Ofertas

Se você recebeu esta mensagem, o bot está funcionando corretamente! 🎉
```

### Se a Mensagem Não Chegar

O sistema mostra mensagens específicas:

- **"Bot válido, mas não conseguiu enviar"** → Verifique:
  - Chat ID está correto?
  - Bot foi adicionado ao grupo/canal?
  - Bot tem permissão para enviar mensagens?

## 📊 Logs Detalhados por Operação

### Coleta de Ofertas

```
🚀 ========================================
🚀 Starting collection from ALL sources
🚀 ========================================
🔍 Starting Amazon collection - Keywords: "electronics"
📦 Found 20 products from Amazon
✅ Converted 15 products to offers
💾 Saved 15 offers from Amazon to database
🔍 Starting AliExpress collection
📈 Fetching hot products from AliExpress...
🔥 Found 20 hot products
⚡ Fetching flash deals from AliExpress...
💥 Found 15 flash deals
📦 Total products from AliExpress: 35
✅ Converted 25 products to offers
💾 Saved 25 offers from AliExpress to database
🚀 ========================================
✅ Collection completed in 12.45s
📊 Results:
   - Amazon: 15 offers
   - AliExpress: 25 offers
   - RSS: 10 offers
   - TOTAL: 50 offers
🚀 ========================================
```

### Publicação de Ofertas

```
📤 Posting offer 123 to channels: telegram
📤 Sending offer to Telegram - Title: Produto XYZ, Chat ID: -5038858254
📷 Sending offer with image: https://...
✅ Offer sent successfully to Telegram: Produto XYZ (ID: 123)
✅ Offer 123 marked as posted in channels: telegram
```

## 🐛 Debug de Problemas

### Telegram Não Envia

1. **Verifique os logs no terminal:**
   ```
   ❌ Error sending offer to Telegram: [mensagem de erro]
   ```

2. **Erros comuns:**
   - `chat not found` → Chat ID incorreto
   - `Forbidden` → Bot não tem permissão
   - `bot was blocked` → Bot foi bloqueado pelo usuário

3. **Teste manual:**
   - Use o botão "Testar Bot" nas configurações
   - Verifique se a mensagem de teste chega

### Coleta Não Funciona

1. **Verifique os logs:**
   ```
   ❌ Error collecting from Amazon: [erro]
   ```

2. **Verifique as credenciais:**
   - Amazon PA-API keys estão corretas?
   - AliExpress keys estão corretas?

3. **Teste individual:**
   - Use os botões de teste na página de Configurações

## 📝 Níveis de Log

- **INFO** (✅) - Operações normais e sucessos
- **WARN** (⚠️) - Avisos (configuração faltando, etc)
- **ERROR** (❌) - Erros que impedem operações
- **DEBUG** (🔍) - Informações detalhadas para debug

## 🔧 Habilitar Logs Mais Detalhados

Para ver mais detalhes, você pode modificar o nível de log em `src/utils/logger.ts`:

```typescript
level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
```

## 📱 Verificar Mensagens no Telegram

1. Abra o Telegram
2. Vá para o grupo/canal configurado
3. Verifique se as mensagens estão chegando
4. Se não chegar, verifique os logs no terminal

## ✅ Checklist de Verificação

- [ ] Backend está rodando (`npm run dev:backend`)
- [ ] Logs aparecem no terminal
- [ ] Bot Token configurado corretamente
- [ ] Chat ID configurado corretamente
- [ ] Bot foi adicionado ao grupo/canal
- [ ] Mensagem de teste foi recebida
- [ ] Logs mostram sucesso ao enviar

