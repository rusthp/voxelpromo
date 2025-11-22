# 🔧 Correções de Configuração

## ✅ Problemas Corrigidos

### 1. Modelo Groq Descontinuado

**Problema**: O modelo `llama-3.1-70b-versatile` foi descontinuado pela Groq.

**Erro**:
```json
{
  "error": {
    "message": "The model 'llama-3.1-70b-versatile' has been decommissioned",
    "code": "model_decommissioned"
  }
}
```

**Solução**: Atualizado para `llama-3.3-70b-versatile` (modelo atual recomendado).

**Arquivos alterados**:
- `src/services/ai/AIService.ts` - Modelo usado para gerar posts
- `src/routes/config.routes.ts` - Modelo usado no teste de conexão

### 2. Problema de Salvamento (Só salva 3 letras)

**Problema**: Ao salvar configurações, apenas 3 letras eram salvas.

**Causa**: 
- Campos mascarados (`***`) estavam sendo tratados como valores válidos
- Validação muito restritiva estava rejeitando valores válidos

**Solução**:
1. **Frontend**: Campos agora limpam `***` automaticamente quando carregados
2. **Backend**: Validação melhorada:
   - Bot Token: mínimo 10 caracteres (tokens reais têm 45+)
   - Groq API Key: mínimo 20 caracteres (chaves reais têm 50+)
3. **Logs**: Adicionados logs para debug (tamanho dos valores salvos)

## 📝 Como Usar Agora

### Configurar Telegram

1. **Acesse**: http://localhost:3001/settings
2. **Preencha**:
   - Bot Token: `YOUR_TELEGRAM_BOT_TOKEN_HERE`
   - Chat ID: `-5038858254`
3. **Clique em "Salvar Configurações"**
4. **Verifique os logs do backend**:
   ```
   [BACKEND] Telegram botToken length: 46
   ```
5. **Teste**: Clique em "Testar Bot"

### Configurar Groq

1. **Preencha**:
   - Provedor: Groq (Recomendado - Gratuito)
   - Groq API Key: `YOUR_GROQ_API_KEY_HERE`
2. **Clique em "Salvar Configurações"**
3. **Verifique os logs do backend**:
   ```
   [BACKEND] Groq API key length: 51
   ```
4. **Teste**: Clique em "Testar Serviço"

## 🔍 Debug

### Verificar o que está sendo salvo

**No Console do Navegador (F12)**:
```javascript
// Ao carregar a página, você verá:
Config loaded: {
  telegram: { hasToken: true, tokenLength: 3, chatId: "-5038858254" },
  ai: { hasGroqKey: true, groqKeyLength: 3 }
}

// Ao salvar, você verá:
Saving config: {
  telegram: { botToken: "8035114690...", botTokenLength: 46, chatId: "-5038858254" },
  ai: { groqApiKey: "gsk_sybXFKn...", groqApiKeyLength: 51 }
}
```

**Nos Logs do Backend**:
```
[BACKEND] Configuration saved to config.json
[BACKEND] Telegram botToken length: 46
[BACKEND] Groq API key length: 51
[BACKEND] Saved config sections: amazon, aliexpress, telegram, whatsapp, ai, rss, collection
```

### Verificar config.json

```bash
# Ver o arquivo de configuração salvo
cat config.json

# Deve mostrar:
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

## 🐛 Troubleshooting

### Ainda salva apenas 3 letras

**Verificar**:
1. Abra o Console do navegador (F12)
2. Ao digitar, veja os logs: `BotToken onChange: X chars`
3. Se mostrar menos de 10 caracteres, o problema está no input
4. Se mostrar o valor completo, o problema está no backend

**Solução**:
- Limpe o campo completamente
- Digite o valor completo novamente
- Clique em "Salvar Configurações"

### Modelo Groq ainda dá erro

**Verificar**:
- O modelo foi atualizado para `llama-3.3-70b-versatile`
- Reinicie o backend após a atualização

**Solução**:
```bash
# Pare o backend (Ctrl+C)
# Inicie novamente
npm run dev
```

### Teste do Groq falha

**Verificar**:
1. API Key está correta?
2. API Key tem pelo menos 20 caracteres?
3. Backend está usando o modelo correto?

**Solução**:
- Verifique os logs do backend ao testar
- Verifique se a API Key foi salva corretamente no `config.json`

## 📋 Checklist

Antes de reportar problemas:

- [ ] Backend está rodando
- [ ] MongoDB está conectado
- [ ] Limpei os campos antes de digitar
- [ ] Digitei o valor completo
- [ ] Verifiquei os logs do console (F12)
- [ ] Verifiquei os logs do backend
- [ ] Verifiquei o arquivo `config.json`

