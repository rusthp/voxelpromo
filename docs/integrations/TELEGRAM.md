# 📱 Telegram - Integração Completa

Guia completo para configurar e utilizar a integração do VoxelPromo com o Telegram.

---

## 🚀 Quick Start

1. Crie um bot com [@BotFather](https://t.me/botfather)
2. Obtenha o token do bot
3. Obtenha o Chat ID do canal/grupo
4. Configure em Settings → Telegram

---

## 📋 Configuração

### 1. Criar Bot no Telegram

1. Abra o Telegram e procure por `@BotFather`
2. Envie `/newbot`
3. Escolha um nome para o bot
4. Escolha um username (deve terminar com `bot`)
5. Copie o **token** fornecido

**Formato do token**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2. Obter Chat ID

**Para canal**:
1. Crie um canal público ou private
2. Adicione o bot como administrador
3. Envie uma mensagem no canal
4. Acesse: `https://api.telegram.org/bot<TOKEN>/getUpdates`
5. Procure por `"chat":{"id":-100XXXXXXXXX}`

**Para grupo**:
- Mesmo processo, o ID será negativo

**Para chat pessoal**:
- Envie `/start` para seu bot
- Use o mesmo link de getUpdates
- O ID será positivo

### 3. Configurar no VoxelPromo

Vá em **Settings → Telegram**:
- **Bot Token**: Cole o token do BotFather
- **Chat ID**: Cole o ID obtido
- **Testar**: Clique em "Test Connection"

---

## 📤 Postagem Automática

### Como Funciona

O VoxelPromo gera posts otimizados usando IA e envia para o Telegram:

1. **Coleta de Ofertas** → Ofertas são coletadas das APIs
2. **Geração de Post** → IA cria texto otimizado
3. **Formatação** → HTML/Markdown do Telegram
4. **Envio** → Bot posta no canal/grupo

### Formato do Post

```
🔥 [Título da Oferta]

💰 Preço: R$ XX,XX
🏷️ Desconto: XX%
⭐ Categoria: [categoria]

[Descrição otimizada pela IA]

🛒 Link: [link de afiliado]

#categoria #promocao
```

### Customização

Configure em **Settings → Automation**:
- **Frequência**: Intervalo entre posts
- **Template**: Modelo de post customizado
- **Filtros**: Categorias, preço mínimo, etc.

---

## ⚙️ API do Telegram

O VoxelPromo usa a [Telegram Bot API](https://core.telegram.org/bots/api) oficial.

### Endpoints Utilizados

**POST /sendMessage**:
```typescript
await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: false
  })
})
```

**Formatos suportados**:
- `HTML` - Tags: `<b>`, `<i>`, `<a href="">`, `<code>`
- `Markdown` - Sintaxe Markdown padrão

---

## 🎨 Melhorias de Post

### IA para Geração de Conteúdo

O VoxelPromo usa **Groq** ou **OpenAI** para:
- Reescrever descrições de produtos
- Adicionar frases de impacto
- Otimizar para engajamento
- Gerar hashtags relevantes

**Prompt base**:
```
Crie um post promocional viral para:
Produto: [nome]
Preço: [preço]
Categoria: [categoria]

Regras:
- Máximo 280 caracteres
- Use emojis relevantes
- Destaque o desconto
- Call-to-action clara
```

### Frases de Impacto

Configuradas em `GROQ_IMPACT_PHRASES.md`:
- "🔥 OFERTA IMPERDÍVEL!"
- "⚡ ÚLTIMO DIA!"
- "💥 DESCONTO GIGANTE!"
- "🎁 PROMOÇÃO RELÂMPAGO!"

---

## 🚨 Limitações da API

### Rate Limits

- **Mensagens**: 30 msg/segundo por chat
- **Grupos**: 20 msg/minuto
- **Canais**: Sem limite oficial

**Recomendação**: Enviar no máximo 1 post a cada 5 minutos

### Tamanho de Mensagem

- **Texto**: 4096 caracteres
- **Caption**: 1024 caracteres
- **Título**: 255 caracteres

### Formatação

**HTML permitido**:
```html
<b>negrito</b>
<i>itálico</i>
<a href="url">link</a>
<code>código</code>
```

**Markdown v2** (mais complexo, evitar):
```markdown
*negrito*
_itálico_
[link](url)
```

---

## 🔧 Troubleshooting

### Bot não posta

**Causas comuns**:
1. Token inválido → Verificar em BotFather
2. Chat ID errado → Usar getUpdates
3. Bot não é admin → Adicionar como administrador
4. Canal privado sem acesso → Tornar público ou adicionar bot

**Testar**:
```bash
curl https://api.telegram.org/bot<TOKEN>/sendMessage \
  -d chat_id=<CHAT_ID> \
  -d text="Teste"
```

### Erro "Chat not found"

- Chat ID está incorreto
- Bot foi removido do canal/grupo
- Canal foi deletado

**Solução**: Verificar Chat ID com getUpdates

### Erro "Forbidden"

- Bot não tem permissão
- Adicione o bot como **administrador** no canal/grupo

### Formatação quebrada

- Caracteres especiais no HTML (`<`, `>`, `&`)
- Escape necessário: `&lt;`, `&gt;`, `&amp;`
- Ou use parse_mode: null

---

## 📊 Estatísticas

Para monitorar performance:

```typescript
const stats = await api.get('/posts/stats')
// {
//   total: 150,
//   telegram: 100,
//   whatsapp: 30,
//   x: 20
// }
```

---

## 🔗 Links Úteis

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [BotFather](https://t.me/botfather)
- [Formatting Guide](https://core.telegram.org/bots/api#formatting-options)
- [Rate Limits](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this)

---

## 📝 Código Relacionado

- `src/services/messaging/TelegramService.ts` - Implementação
- `frontend/app/settings/page.tsx` - Configuração UI
- `docs/HOW_TO_POST_TO_TELEGRAM_AND_X.md` - Guia adicional
- `docs/TELEGRAM_POST_IMPROVEMENTS.md` - Melhorias históricas

---

**Última Atualização**: 2025-12-03
