# 🔧 Valores de Configuração

## ✅ Configurações Fornecidas

### Groq API Key
```
YOUR_GROQ_API_KEY_HERE
```

### Telegram Bot
- **Bot Token**: `YOUR_TELEGRAM_BOT_TOKEN_HERE`
- **Chat ID**: `-5038858254`
- **Chat Type**: Group
- **Chat Title**: VOXELPROMO

## 📝 Como Configurar

### Opção 1: Via Interface Web (Recomendado)

1. **Certifique-se de que o backend está rodando:**
   ```bash
   npm run dev
   ```
   
   Você deve ver:
   ```
   [BACKEND] ✅ MongoDB connected successfully
   [BACKEND] 🚀 Server running on port 3000
   ```

2. **Acesse a página de configurações:**
   - Abra: http://localhost:3001/settings
   - Faça login se necessário

3. **Preencha os campos:**

   **Serviço de IA:**
   - Provedor: Groq (Recomendado - Gratuito)
   - Groq API Key: `YOUR_GROQ_API_KEY_HERE`

   **Telegram Bot:**
   - Bot Token: `YOUR_TELEGRAM_BOT_TOKEN_HERE`
   - Chat ID: `-5038858254`

4. **Salve as configurações:**
   - Clique em "Salvar Configurações"
   - Aguarde a mensagem de sucesso

5. **Teste as conexões:**
   - Clique em "Testar Bot" para testar o Telegram
   - Clique em "Testar Serviço" para testar o Groq

### Opção 2: Via Arquivo config.json

Se preferir editar diretamente:

1. **Localize o arquivo `config.json`** (será criado após primeiro salvamento)

2. **Edite o arquivo:**
   ```json
   {
     "telegram": {
       "botToken": "YOUR_TELEGRAM_BOT_TOKEN_HERE",
       "chatId": "-5038858254"
     },
     "ai": {
       "provider": "groq",
       "groqApiKey": "YOUR_GROQ_API_KEY_HERE"
     }
   }
   ```

3. **Reinicie o backend** para carregar as novas configurações

## 🔍 Verificar se Está Funcionando

### Verificar Backend

```bash
# Testar health check
curl http://localhost:3000/health

# Deve retornar:
# {"status":"ok","timestamp":"..."}
```

### Verificar Configurações Salvas

```bash
# Verificar se config.json foi criado
cat config.json

# Deve mostrar as configurações salvas
```

### Testar Telegram

1. Na página de configurações, clique em "Testar Bot"
2. Você deve receber uma mensagem no grupo Telegram "VOXELPROMO"
3. A mensagem será: "🤖 Teste do VoxelPromo ✅ Bot configurado com sucesso!"

### Testar Groq

1. Na página de configurações, clique em "Testar Serviço"
2. Deve aparecer: "✅ IA: Conexão bem-sucedida"

## 🐛 Troubleshooting

### Erro: "Network Error"

**Causa**: Backend não está rodando

**Solução**:
```bash
# Verificar se backend está rodando
curl http://localhost:3000/health

# Se não responder, inicie o backend
npm run dev
```

### Erro: "MongoDB connection error"

**Causa**: MongoDB não está conectado

**Solução**: Verifique se o MongoDB Atlas está configurado no `.env`

### Configurações não salvam

**Verificar**:
1. Backend está rodando?
2. Você está autenticado? (fez login?)
3. Verifique os logs do backend para erros

### Teste do Telegram falha

**Verificar**:
1. Bot Token está correto?
2. Chat ID está correto?
3. O bot foi adicionado ao grupo?
4. O bot tem permissão para enviar mensagens?

## 📋 Checklist

Antes de usar o sistema:

- [ ] Backend está rodando (`npm run dev`)
- [ ] MongoDB conectado (veja logs: "✅ MongoDB connected successfully")
- [ ] Fez login no sistema
- [ ] Configurou Groq API Key
- [ ] Configurou Telegram Bot Token e Chat ID
- [ ] Testou Telegram (recebeu mensagem de teste)
- [ ] Testou Groq (teste passou)

## 🔐 Segurança

⚠️ **IMPORTANTE**: 
- Nunca compartilhe suas API keys
- O arquivo `config.json` está no `.gitignore` (não será commitado)
- Mantenha suas credenciais seguras

