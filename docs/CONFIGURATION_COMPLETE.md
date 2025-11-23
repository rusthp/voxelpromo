# 🔧 Guia Completo de Configuração

Este guia consolida todas as informações sobre configuração do VoxelPromo.

## 📋 Índice

1. [Métodos de Configuração](#métodos-de-configuração)
2. [Configuração de Serviços](#configuração-de-serviços)
3. [Problemas Comuns e Soluções](#problemas-comuns-e-soluções)
4. [Verificação e Testes](#verificação-e-testes)

## Métodos de Configuração

### Opção 1: Via Interface Web (Recomendado)

1. **Acesse**: http://localhost:3001/settings
2. **Faça login** se necessário
3. **Preencha os campos** necessários
4. **Clique em "Salvar Configurações"**
5. **Teste cada serviço** usando os botões de teste

### Opção 2: Via Arquivo config.json

1. **Copie o template**:
   ```bash
   cp config.json.example config.json
   ```

2. **Edite o arquivo** `config.json` com suas credenciais

3. **Reinicie o backend** para carregar as configurações

### Opção 3: Via Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/voxelpromo

# Telegram
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID_HERE

# IA (Groq ou OpenAI)
GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
AI_PROVIDER=groq

# X (Twitter) - OAuth 1.0a
X_API_KEY=YOUR_X_API_KEY_HERE
X_API_KEY_SECRET=YOUR_X_API_KEY_SECRET_HERE
X_ACCESS_TOKEN=YOUR_X_ACCESS_TOKEN_HERE
X_ACCESS_TOKEN_SECRET=YOUR_X_ACCESS_TOKEN_SECRET_HERE

# X (Twitter) - OAuth 2.0 (opcional)
X_OAUTH2_CLIENT_ID=YOUR_X_OAUTH2_CLIENT_ID_HERE
X_OAUTH2_CLIENT_SECRET=YOUR_X_OAUTH2_CLIENT_SECRET_HERE
X_OAUTH2_REDIRECT_URI=https://yourdomain.com/

# Amazon PA-API
AMAZON_ACCESS_KEY=YOUR_AMAZON_ACCESS_KEY_HERE
AMAZON_SECRET_KEY=YOUR_AMAZON_SECRET_KEY_HERE
AMAZON_ASSOCIATE_TAG=YOUR_ASSOCIATE_TAG_HERE
AMAZON_REGION=BR

# AliExpress Affiliate API
ALIEXPRESS_APP_KEY=YOUR_ALIEXPRESS_APP_KEY_HERE
ALIEXPRESS_APP_SECRET=YOUR_ALIEXPRESS_APP_SECRET_HERE
ALIEXPRESS_TRACKING_ID=YOUR_TRACKING_ID_HERE

# Mercado Livre
MERCADOLIVRE_CLIENT_ID=YOUR_MERCADOLIVRE_CLIENT_ID_HERE
MERCADOLIVRE_CLIENT_SECRET=YOUR_MERCADOLIVRE_CLIENT_SECRET_HERE
MERCADOLIVRE_REDIRECT_URI=https://yourdomain.com/

# WhatsApp (Opcional)
WHATSAPP_ENABLED=false
WHATSAPP_TARGET_NUMBER=
WHATSAPP_LIBRARY=whatsapp-web.js  # ou baileys, wppconnect

# JWT
JWT_SECRET=YOUR_JWT_SECRET_HERE
```

## Configuração de Serviços

### Telegram Bot

1. **Criar bot**:
   - Abra o Telegram
   - Procure por [@BotFather](https://t.me/botfather)
   - Envie `/newbot`
   - Siga as instruções
   - Copie o token fornecido

2. **Obter Chat ID**:
   - Para grupos: Use um bot como [@userinfobot](https://t.me/userinfobot)
   - Para canais: Encaminhe uma mensagem do canal para [@userinfobot](https://t.me/userinfobot)
   - O Chat ID será um número negativo para grupos/canais

3. **Configurar no sistema**:
   - Bot Token: `YOUR_TELEGRAM_BOT_TOKEN_HERE`
   - Chat ID: `YOUR_TELEGRAM_CHAT_ID_HERE`
   - Teste usando o botão "Testar Bot"

### Serviço de IA

#### Groq (Recomendado - Gratuito)

1. **Criar conta**: https://console.groq.com/
2. **Obter API Key** do dashboard
3. **Configurar**:
   - Provedor: Groq
   - API Key: `YOUR_GROQ_API_KEY_HERE`
   - Modelo: `llama-3.3-70b-versatile` (atual)

#### OpenAI

1. **Criar conta**: https://platform.openai.com/
2. **Adicionar créditos**
3. **Obter API Key**
4. **Configurar**:
   - Provedor: OpenAI
   - API Key: `YOUR_OPENAI_API_KEY_HERE`

### X (Twitter)

#### OAuth 1.0a (Recomendado para Postar)

1. **Criar app**: https://developer.twitter.com/en/portal/dashboard
2. **Obter credenciais**:
   - API Key
   - API Key Secret
   - Access Token
   - Access Token Secret
3. **Configurar permissões**: "Read and Write"
4. **Configurar no sistema** via interface web

#### OAuth 2.0 (Alternativa)

1. **Criar app** no Twitter Developer Portal
2. **Obter**:
   - Client ID
   - Client Secret
   - Configurar Redirect URI: `https://yourdomain.com/`
3. **Iniciar fluxo OAuth** via botão "Conectar com X (Twitter)"

### Amazon PA-API

1. **Criar conta**: https://affiliate-program.amazon.com/
2. **Aplicar para acesso** à Product Advertising API
3. **Obter credenciais**:
   - Access Key
   - Secret Key
   - Associate Tag

### AliExpress Affiliate API

1. **Registrar**: https://portals.aliexpress.com/
2. **Aplicar para programa** de afiliados
3. **Obter credenciais**:
   - App Key
   - App Secret
   - Tracking ID

### Mercado Livre

1. **Criar app**: https://developers.mercadolivre.com.br/
2. **Obter credenciais**:
   - Client ID
   - Client Secret
3. **Configurar Redirect URI** no app
4. **Iniciar fluxo OAuth** via interface

### WhatsApp

O sistema suporta múltiplas bibliotecas não oficiais do WhatsApp:

1. **Habilitar WhatsApp**:
   - Marque a opção "Habilitar WhatsApp" nas configurações
   - Digite o número de destino (com código do país)
   - Formato: `5511999999999` (código do país + DDD + número)
   - Escolha a biblioteca (padrão: `whatsapp-web.js`)

2. **Bibliotecas Disponíveis**:
   - **whatsapp-web.js** (padrão) - Estável, já implementado
   - **Baileys** (recomendado) - Mais leve e rápido, menos detectável
   - **WPPConnect** - Boa alternativa
   - **Venom-bot** - Menos mantido

3. **Primeira execução**:
   - Ao iniciar o sistema, um QR Code aparecerá no terminal
   - Escaneie com seu WhatsApp
   - A sessão será salva automaticamente

4. **Configuração via .env**:
   ```env
   WHATSAPP_ENABLED=true
   WHATSAPP_TARGET_NUMBER=5511999999999
   WHATSAPP_LIBRARY=baileys  # ou whatsapp-web.js, wppconnect
   ```

**⚠️ Importante**: 
- APIs não oficiais podem resultar em banimento se detectado uso anormal
- Use com cuidado e apenas para uso pessoal/pequeno negócio
- Mantenha delays entre mensagens (3-5 segundos)
- Não envie muitas mensagens idênticas

**📚 Mais informações**: Veja [WhatsApp - APIs Não Oficiais](WHATSAPP_UNOFFICIAL_APIS.md)

## Problemas Comuns e Soluções

### Configurações Não Salvam

**Sintomas**: Página mostra sucesso mas valores não persistem.

**Soluções**:
- Verifique se backend está rodando
- Verifique permissões do arquivo `config.json`
- Verifique logs do backend para erros
- Limpe os campos e digite novamente

### Configuração Zera Após Restart

**Sintomas**: Configurações são perdidas quando servidor reinicia.

**Solução**: ✅ **Já corrigido** - O sistema agora carrega `config.json` automaticamente no startup.

### Apenas 3 Letras São Salvas

**Sintomas**: Ao salvar, apenas os primeiros caracteres são salvos.

**Soluções**:
- Limpe o campo completamente
- Digite o valor completo novamente
- Verifique se não está usando campos mascarados (`***`)

### Modelo Groq Descontinuado

**Erro**: `The model 'llama-3.1-70b-versatile' has been decommissioned`

**Solução**: ✅ **Já corrigido** - Sistema usa `llama-3.3-70b-versatile`

### Nodemon Reinicia ao Salvar

**Sintomas**: Servidor reinicia toda vez que salva configurações.

**Solução**: ✅ **Já corrigido** - `config.json` está no `.nodemonignore`

## Verificação e Testes

### Verificar Backend

```bash
# Health check
curl http://localhost:3000/health

# Deve retornar:
# {"status":"ok","timestamp":"..."}
```

### Verificar Configurações Salvas

```bash
# Verificar config.json
cat config.json

# Verificar logs do backend
# Deve mostrar:
# [BACKEND] ✅ Telegram config loaded
# [BACKEND] ✅ Groq API key loaded
```

### Testar Serviços

Na página de configurações, use os botões de teste:
- **Testar Bot** (Telegram) - Deve enviar mensagem de teste
- **Testar Serviço** (IA) - Deve retornar sucesso
- **Conectar com X** (Twitter) - Inicia fluxo OAuth

## 🔐 Segurança

⚠️ **IMPORTANTE**:
- Nunca compartilhe suas API keys
- O arquivo `config.json` está no `.gitignore` (não será commitado)
- Use placeholders em documentação: `YOUR_API_KEY_HERE`
- Mantenha suas credenciais seguras

## 📋 Checklist de Configuração

Antes de usar o sistema:

- [ ] Backend está rodando (`npm run dev`)
- [ ] MongoDB conectado
- [ ] Fez login no sistema
- [ ] Configurou Telegram (Bot Token e Chat ID)
- [ ] Configurou IA (Groq ou OpenAI)
- [ ] Testou Telegram (recebeu mensagem de teste)
- [ ] Testou IA (teste passou)
- [ ] Configurou X (Twitter) se necessário
- [ ] Configurou outras APIs conforme necessário

## 📚 Documentação Relacionada

- [Setup Guide](SETUP.md) - Instalação inicial
- [Troubleshooting](TROUBLESHOOTING.md) - Solução de problemas
- [Performance Optimization](PERFORMANCE_OPTIMIZATION.md) - Otimizações

