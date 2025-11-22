# 🐦 Integração X (Twitter) - Guia Completo

## 📋 Resumo

Sistema de publicação automática de ofertas no X (Twitter) integrado ao VoxelPromo.

## ✅ Funcionalidades

- ✅ **Publicação de Ofertas:** Publica ofertas automaticamente no X
- ✅ **Suporte a Imagens:** Envia imagens dos produtos junto com o tweet
- ✅ **Formatação Otimizada:** Mensagens otimizadas para o limite de 280 caracteres
- ✅ **Hashtags Automáticas:** Gera hashtags relevantes automaticamente
- ✅ **Frases de Impacto:** Usa IA (Groq) para gerar frases de impacto dinâmicas
- ✅ **Rate Limiting:** Delay de 5 segundos entre tweets para evitar rate limits
- ✅ **OAuth 1.0a e 2.0:** Suporta ambos os métodos de autenticação

## ⚙️ Configuração

### Via Interface Web (Recomendado)

1. **Acesse as Configurações:**
   - Navegue para `/settings` na interface web
   - Faça login se necessário

2. **Configure o X (Twitter):**
   - Encontre a seção "🐦 X (Twitter)"
   - Escolha um dos métodos de autenticação abaixo
   - Clique em "Testar X (Twitter)" para verificar as credenciais
   - Clique em "Salvar Configurações" para salvar

3. **OAuth 1.0a (Recomendado - Full Access):**
   - **API Key:** Sua chave de API do Twitter
   - **API Key Secret:** Seu segredo da chave de API
   - **Access Token:** Seu token de acesso
   - **Access Token Secret:** Seu segredo do token de acesso
   - **Como obter:** Veja [X_TWITTER_OAUTH2_FIX.md](./X_TWITTER_OAUTH2_FIX.md)

4. **OAuth 2.0 (Client ID/Secret - Novo!):**
   - **Client ID:** Seu OAuth 2.0 Client ID do Twitter Developer Portal
   - **Client Secret:** Seu OAuth 2.0 Client Secret
   - **Redirect URI:** `http://localhost:3000/api/x/auth/callback` (ou sua URL)
   - **Passos:**
     1. Preencha Client ID e Client Secret
     2. Configure o mesmo Redirect URI no Twitter Developer Portal
     3. Clique em "🔗 Conectar com X (Twitter)"
     4. Autorize o app no navegador
     5. O token será salvo automaticamente
   - **Vantagens:** Mais seguro, tokens podem ser renovados automaticamente

5. **Bearer Token (Opcional - Limitado):**
   - **Bearer Token:** Seu Bearer Token (pode ter limitações para postar)

### Credenciais no config.json (Alternativa)

```json
{
  "x": {
    "bearerToken": "AAAAAAAAAAAAAAAAAAAAAGwg5gEAAAAAiTqqQhEW44PQ45ktVJ8TKG3AAA4%3DccGKPJO1ByyvxnrXNxxppT0LEHirYIoxjEeBbO6UHwUv4SSLKx",
    "apiKey": "eLrgtTlZwBlK7lhahEFDxBnGG",
    "apiKeySecret": "zqQc7Ng6QFDIzdfyOjSQDKQmS0M4ZwGW1dLir1h06GT4KH1tYM",
    "accessToken": "1989828200801996801-3W7sMw13B4HSovMJVf2w3yxSDpyUWl",
    "accessTokenSecret": "0AZ1kcjFVjNnTwhaV1DvDpaEKIyLCCSfdNvh3G1560OkK",
    "oauth2ClientId": "OHZKMHFCcGdxWEozNG51dXFFeDA6MTpjaQ",
    "oauth2ClientSecret": "2SAE9qb-S66eAIbSR63-excqxsbVc3TeQGlZa53EOZUl-blp-o",
    "oauth2RedirectUri": "http://localhost:3000/api/x/auth/callback",
    "oauth2AccessToken": "token_obtido_automaticamente",
    "oauth2RefreshToken": "refresh_token_obtido_automaticamente",
    "oauth2TokenExpiresAt": 1234567890000,
    "oauth2Scope": "tweet.read tweet.write users.read offline.access"
  }
}
```

### Métodos de Autenticação

**OAuth 1.0a (Recomendado - Full Access):**
- Permite postar tweets com imagens
- Requer: `apiKey`, `apiKeySecret`, `accessToken`, `accessTokenSecret`
- Prioridade: Usado primeiro se disponível
- **Como obter:** Veja [X_TWITTER_OAUTH2_FIX.md](./X_TWITTER_OAUTH2_FIX.md)

**OAuth 2.0 (Client ID/Secret - Novo!):**
- Permite postar tweets com imagens
- Requer: `oauth2ClientId`, `oauth2ClientSecret`
- Fluxo: Client ID/Secret → Autorização → Access Token (automático)
- Tokens podem ser renovados automaticamente
- Prioridade: Usado se OAuth 1.0a não estiver disponível
- **Vantagens:** Mais seguro, renovação automática de tokens

**OAuth 2.0 Bearer Token:**
- Pode ter limitações para postar
- Requer: `bearerToken`
- Fallback: Usado se outros métodos não estiverem disponíveis

## 🚀 Como Usar

### Publicação Manual

**Via API:**
```bash
curl -X POST http://localhost:3000/api/offers/:id/post \
  -H "Content-Type: application/json" \
  -d '{"channels": ["x"]}'
```

**Via Frontend:**
- Selecione uma oferta
- Clique em "Publicar"
- Selecione "X" nos canais

### Publicação Múltipla

```bash
curl -X POST http://localhost:3000/api/offers/batch/post \
  -H "Content-Type: application/json" \
  -d '{"offerIds": ["id1", "id2"], "channels": ["x"]}'
```

## 📝 Formato das Mensagens

### Estrutura do Tweet

```
[FRASE DE IMPACTO]!

[EMOJI] [TÍTULO DO PRODUTO]

💰 De R$ [ORIGINAL] por R$ [ATUAL]
🎯 [DESCONTO]% OFF

🎟️ CUPOM: [CÓDIGO] (se disponível)

🔗 [LINK]

#hashtags
```

### Limite de Caracteres

- **Limite do X:** 280 caracteres
- **Otimização:** Sistema ajusta automaticamente
- **Hashtags:** Adicionadas se houver espaço disponível
- **Título:** Truncado se muito longo (> 80 caracteres)

### Exemplo de Tweet

```
SUPER PROMOÇÃO!

🏠 Kit Acessórios Banheiro Porta Escova Liquido 3pçs Preto Drd

💰 De R$ 41,34 por R$ 39,27
🎯 5% OFF

🔗 https://shopee.com.br/product/1333507062/22298727121

#home #shopee #oferta #promocao #desconto
```

## 🖼️ Suporte a Imagens

### Como Funciona

1. **Download da Imagem:** Sistema baixa a imagem do produto
2. **Upload para X:** Faz upload usando API v1.1
3. **Cria Tweet:** Cria tweet com imagem anexada
4. **Fallback:** Se falhar, envia tweet com URL da imagem

### Requisitos

- **OAuth 1.0a:** Necessário para upload de imagens
- **Bearer Token:** Não suporta upload de imagens (fallback para URL)

## 🔧 Implementação Técnica

### XService

**Localização:** `src/services/messaging/XService.ts`

**Métodos Principais:**
- `sendOffer(offer)` - Envia oferta para X
- `formatMessage(offer)` - Formata mensagem para X
- `generateHashtags(offer)` - Gera hashtags
- `getImpactPhrase(offer)` - Gera frase de impacto (IA ou fallback)

### Integração no OfferService

**Localização:** `src/services/offer/OfferService.ts`

**Canais Suportados:**
- `'x'` - X (Twitter)
- `'twitter'` - Alias para 'x'

**Uso:**
```typescript
await offerService.postOffer(offerId, ['x']);
// ou
await offerService.postOffer(offerId, ['telegram', 'x']);
```

## 📊 Rate Limiting

### Proteções Implementadas

- **Delay entre Tweets:** 5 segundos entre cada tweet
- **Tratamento de Erros:** Retry automático em caso de rate limit
- **Logs Detalhados:** Registra todos os erros e sucessos

### Limites da API do X

- **Tweets por Dia:** Depende do plano da conta
- **Tweets por Minuto:** Geralmente 300
- **Upload de Mídia:** 5MB por imagem

## 🎨 Formatação

### Características

- **Compacto:** Otimizado para 280 caracteres
- **Hashtags:** Adicionadas automaticamente
- **Emojis:** Usados para destacar informações
- **Links:** Sempre incluídos

### Frases de Impacto

Geradas automaticamente usando:
1. **IA (Groq):** Tenta gerar frase única
2. **Fallback:** Usa frases pré-definidas baseadas no desconto

## 🔍 Troubleshooting

### Erro: "OAuth 1.0a required for media upload"

**Causa:** Tentando fazer upload de imagem com Bearer Token

**Solução:** Configure OAuth 1.0a no `config.json`

### Erro: "Rate limit exceeded"

**Causa:** Muitos tweets em pouco tempo

**Solução:** Sistema já tem delay de 5s entre tweets. Aguarde alguns minutos.

### Erro: "Invalid credentials"

**Causa:** Credenciais incorretas ou expiradas

**Solução:** Verifique as credenciais no `config.json`

## 📝 Notas

- O Bearer Token pode ter limitações para postar tweets
- OAuth 1.0a é recomendado para funcionalidade completa
- Imagens são opcionais - tweets funcionam sem elas
- Hashtags são adicionadas automaticamente se houver espaço
- Sistema ajusta mensagem para caber em 280 caracteres

## ✅ Status

- ✅ XService criado
- ✅ Integrado no OfferService
- ✅ Credenciais configuradas
- ✅ Suporte a imagens
- ✅ Formatação otimizada
- ✅ Hashtags automáticas
- ✅ Rate limiting

**Pronto para uso!** 🚀

