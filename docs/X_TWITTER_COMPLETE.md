# 🐦 Integração X (Twitter) - Guia Completo

Este guia consolida todas as informações sobre integração com X (Twitter).

## 📋 Índice

1. [Métodos de Autenticação](#métodos-de-autenticação)
2. [Configuração](#configuração)
3. [Como Postar](#como-postar)
4. [Troubleshooting](#troubleshooting)

## Métodos de Autenticação

O sistema suporta três métodos de autenticação:

### 1. OAuth 1.0a (Recomendado para Postar)

**Vantagens**:
- ✅ Permissões completas (Read and Write)
- ✅ Pode postar tweets
- ✅ Pode enviar imagens
- ✅ Mais simples de configurar

**Como obter**:
1. Acesse: https://developer.twitter.com/en/portal/dashboard
2. Crie um app
3. Configure permissões: "Read and Write"
4. Obtenha:
   - API Key
   - API Key Secret
   - Access Token
   - Access Token Secret

### 2. OAuth 2.0 Client ID/Secret

**Vantagens**:
- ✅ Mais seguro
- ✅ Tokens podem ser renovados automaticamente
- ✅ Melhor para produção

**Como configurar**:
1. Crie app no Twitter Developer Portal
2. Obtenha:
   - Client ID
   - Client Secret
3. Configure Redirect URI: `https://yourdomain.com/`
4. Use o botão "Conectar com X (Twitter)" na interface

### 3. Bearer Token (Limitado)

**Limitações**:
- ❌ Apenas leitura (não pode postar)
- ❌ Não pode enviar imagens

**Uso**: Apenas para testes ou leitura de dados

## Configuração

### Via Interface Web

1. **Acesse**: http://localhost:3001/settings
2. **Encontre a seção**: "🐦 X (Twitter)"
3. **Escolha um método** e preencha as credenciais
4. **Para OAuth 2.0**: Clique em "Conectar com X (Twitter)"
5. **Teste**: Clique em "Testar X (Twitter)"
6. **Salve**: Clique em "Salvar Configurações"

### Via config.json

```json
{
  "x": {
    "apiKey": "YOUR_X_API_KEY_HERE",
    "apiKeySecret": "YOUR_X_API_KEY_SECRET_HERE",
    "accessToken": "YOUR_X_ACCESS_TOKEN_HERE",
    "accessTokenSecret": "YOUR_X_ACCESS_TOKEN_SECRET_HERE",
    "oauth2ClientId": "YOUR_X_OAUTH2_CLIENT_ID_HERE",
    "oauth2ClientSecret": "YOUR_X_OAUTH2_CLIENT_SECRET_HERE",
    "oauth2RedirectUri": "https://yourdomain.com/",
    "bearerToken": "YOUR_X_BEARER_TOKEN_HERE"
  }
}
```

## Como Postar

### Postagem Automática

O sistema posta automaticamente:
- **Horário**: Todos os dias às 9h da manhã
- **Canais**: Telegram e X (Twitter)
- **Seleção**: Top 5 ofertas com desconto ≥ 20%

### Postagem Manual

1. Na lista de ofertas, clique em **"Publicar"**
2. A oferta será enviada para **Telegram e X** automaticamente
3. O sistema gera post de IA se ainda não existir

### Configurar Canais

Por padrão, o sistema envia para ambos os canais. Para mudar:

**Cron Job** (`src/jobs/scheduler.ts`):
```typescript
const postedCount = await offerService.postOffers(offerIds, ['telegram', 'x']);
```

**API Manual**:
```bash
POST /api/offers/:id/post
{
  "channels": ["telegram", "x"]  # ou ["x"] para apenas X
}
```

## Troubleshooting

### Erro: "Autenticação OK, mas sem permissão para postar"

**Causa**: OAuth 2.0 Client ID/Secret sozinho não permite postar

**Solução**: Configure OAuth 1.0a ou use OAuth 2.0 Access Token

### Erro: "Invalid callback url"

**Causa**: Redirect URI não corresponde ao configurado no Twitter

**Solução**:
1. Verifique o Redirect URI no Twitter Developer Portal
2. Use exatamente o mesmo URI no sistema
3. Padrão recomendado: `https://yourdomain.com/`

### Erro: "Callback URI rejected"

**Causa**: Twitter rejeita alguns padrões de URL

**Solução**: Use a raiz do domínio: `https://yourdomain.com/`

### Erro: "Rate limit exceeded"

**Causa**: Muitos tweets em pouco tempo

**Solução**: O sistema já tem delay de 5 segundos entre tweets

## 📚 Documentação Relacionada

- [Como Postar para Telegram e X](HOW_TO_POST_TO_TELEGRAM_AND_X.md)
- [Configuração Completa](CONFIGURATION_COMPLETE.md)




