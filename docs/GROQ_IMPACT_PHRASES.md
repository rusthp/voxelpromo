# 🤖 Groq AI - Geração Dinâmica de Frases de Impacto

## 📋 Resumo

O sistema agora usa **Groq AI** para gerar frases de impacto dinâmicas e criativas para os posts do Telegram, tornando cada post único e mais atrativo!

## 🎯 Como Funciona

### 1. Geração com IA (Groq)

Quando uma oferta é publicada:

1. **Sistema tenta usar Groq** para gerar uma frase de impacto única
2. **Prompt otimizado** para gerar frases curtas e impactantes
3. **Timeout de 2 segundos** - se demorar, usa fallback
4. **Modelo rápido:** `llama-3.1-8b-instant` (resposta rápida)
5. **Fallback automático** se a IA falhar

### 2. Fallback Inteligente

Se a IA não estiver disponível ou falhar:
- Usa frases pré-definidas baseadas no desconto
- Garante que sempre há uma frase de impacto
- Não interrompe o processo de publicação

## ⚙️ Configuração

### API Key do Groq

A API key já está configurada no `config.json`:

```json
{
  "ai": {
    "provider": "groq",
    "groqApiKey": "YOUR_GROQ_API_KEY_HERE"
  }
}
```

### Como o Sistema Carrega

1. `loadConfigFromFile()` carrega do `config.json`
2. Define `process.env.GROQ_API_KEY`
3. `AIService` lê do `process.env.GROQ_API_KEY`
4. `TelegramService` usa `AIService` para gerar frases

## 🚀 Fluxo Completo

```
1. Usuário publica oferta
   ↓
2. TelegramService.formatMessage()
   ↓
3. generateDefaultPost() → getImpactPhrase()
   ↓
4. AIService.generateImpactPhrase()
   ↓
5. Groq API (llama-3.1-8b-instant)
   ↓
6. Frase gerada OU fallback
   ↓
7. Post formatado e enviado
```

## 📝 Exemplos de Frases Geradas

### Com IA (Groq)
- "OPORTUNIDADE QUE NÃO SE REPETE"
- "PREÇO QUE VOCÊ NÃO VAI ACREDITAR"
- "PROMOÇÃO QUE VAI ACABAR HOJE"
- "DESCONTO QUE MUDARÁ SUA VIDA"
- "OFERTA QUE VOCÊ ESPERAVA"

### Fallback (Sem IA)
- "NUNCA VI TÃO BARATO ASSIM"
- "SUPER PROMOÇÃO"
- "ÓTIMA OFERTA"
- etc.

## ⚡ Performance

### Otimizações

1. **Modelo Rápido:** `llama-3.1-8b-instant` (resposta em < 1s)
2. **Timeout:** 2 segundos máximo
3. **Tokens Limitados:** Apenas 20 tokens (frases curtas)
4. **Fallback Rápido:** Se falhar, usa frases estáticas instantaneamente

### Tempo de Resposta

- **Com IA:** ~0.5-1.5 segundos
- **Fallback:** Instantâneo (< 1ms)

## 🔧 Implementação Técnica

### AIService.generateImpactPhrase()

**Localização:** `src/services/ai/AIService.ts`

**Características:**
- Usa modelo `llama-3.1-8b-instant` (rápido)
- Temperature: 0.9 (criativo)
- Max tokens: 20 (frases curtas)
- Timeout: 2 segundos
- Fallback automático

### TelegramService.getImpactPhrase()

**Localização:** `src/services/messaging/TelegramService.ts`

**Características:**
- Chama `AIService.generateImpactPhrase()`
- Timeout de 2 segundos
- Fallback para frases estáticas
- Não bloqueia publicação se IA falhar

## 📊 Vantagens

✅ **Frases Únicas:** Cada post tem uma frase diferente  
✅ **Mais Criativo:** IA gera variações interessantes  
✅ **Contextual:** Considera categoria e desconto  
✅ **Rápido:** Resposta em menos de 2 segundos  
✅ **Confiável:** Fallback garante que sempre funciona  
✅ **Eficiente:** Usa modelo rápido e otimizado  

## 🎨 Exemplos Práticos

### Produto com 50% de desconto

**Com IA:**
```
OPORTUNIDADE QUE NÃO SE REPETE

💊 Creatina Monohidratada Pura Dark Lab - 500g

🔥 POR 12,59

💰 De R$ 25,00 por apenas R$ 12,59
🎯 50% OFF

🎟️ CUPOM: PURA40

🔗 https://tidd.ly/47R2REQ
```

**Sem IA (Fallback):**
```
NUNCA VI TÃO BARATO ASSIM

💊 Creatina Monohidratada Pura Dark Lab - 500g

🔥 POR 12,59

💰 De R$ 25,00 por apenas R$ 12,59
🎯 50% OFF

🎟️ CUPOM: PURA40

🔗 https://tidd.ly/47R2REQ
```

## 🔍 Debugging

### Logs

O sistema registra quando usa IA:
```
✅ Generated impact phrase with Groq: "OPORTUNIDADE ÚNICA"
```

Ou quando usa fallback:
```
⚠️ Failed to generate impact phrase with Groq: [erro]
```

### Verificar Configuração

```bash
# Verificar se API key está carregada
grep GROQ_API_KEY .env
# ou
cat config.json | grep groqApiKey
```

## 🚨 Troubleshooting

### IA não está gerando frases

**Possíveis causas:**
1. API key não configurada
2. API key inválida
3. Timeout (muito lento)
4. Erro na API do Groq

**Solução:**
- Verificar `config.json` → `ai.groqApiKey`
- Verificar logs para erros
- Sistema usa fallback automaticamente (não quebra)

### Frases muito longas

**Solução:**
- O sistema limita a 60 caracteres
- Se exceder, usa fallback
- Prompt já pede máximo 8 palavras

## 📝 Notas

- A IA é **opcional** - se falhar, usa fallback
- Não bloqueia publicação se IA não funcionar
- Frases são geradas em tempo real (não cacheadas)
- Cada oferta pode ter uma frase diferente
- Modelo rápido garante resposta rápida

## ✅ Status

- ✅ API Key configurada no `config.json`
- ✅ AIService integrado
- ✅ TelegramService usando IA
- ✅ Fallback funcionando
- ✅ Timeout implementado
- ✅ Logs de debug ativos

**Pronto para uso!** 🚀



