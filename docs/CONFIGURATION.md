# Guia de Configuração

## Como Configurar o Sistema

Existem duas formas de configurar o VOXELPROMO:

### 1. Via Interface Web (Recomendado)

1. Acesse o dashboard: http://localhost:3001
2. Clique no botão **"Configurações"** no canto superior direito
3. Preencha os campos necessários
4. Clique em **"Salvar Configurações"**

### 2. Via Arquivo .env

Edite o arquivo `.env` na raiz do projeto:

```env
# Amazon PA-API
AMAZON_ACCESS_KEY=sua_access_key
AMAZON_SECRET_KEY=sua_secret_key
AMAZON_ASSOCIATE_TAG=seu-tag-20
AMAZON_REGION=BR

# AliExpress Affiliate API
ALIEXPRESS_APP_KEY=sua_app_key
ALIEXPRESS_APP_SECRET=sua_app_secret
ALIEXPRESS_TRACKING_ID=seu_tracking_id

# Telegram Bot
TELEGRAM_BOT_TOKEN=seu_bot_token
TELEGRAM_CHAT_ID=seu_chat_id

# WhatsApp (Opcional)
WHATSAPP_ENABLED=false
WHATSAPP_TARGET_NUMBER=5511999999999

# IA (Groq ou OpenAI)
GROQ_API_KEY=sua_groq_key
OPENAI_API_KEY=sua_openai_key
AI_PROVIDER=groq
```

## Configurações Detalhadas

### Amazon PA-API

1. **Criar conta no Amazon Associates**
   - Acesse: https://affiliate-program.amazon.com/
   - Crie uma conta
   - Aplique para acesso à Product Advertising API

2. **Obter credenciais**
   - Access Key
   - Secret Key
   - Associate Tag (ex: seu-tag-20)

3. **Configurar no sistema**
   - Preencha os campos na página de Configurações
   - Ou adicione no `.env`

### AliExpress Affiliate API

1. **Registrar no AliExpress Affiliate**
   - Acesse: https://portals.aliexpress.com/
   - Crie uma conta
   - Aplique para o programa de afiliados

2. **Obter credenciais**
   - App Key
   - App Secret
   - Tracking ID

3. **Configurar no sistema**
   - Preencha os campos na página de Configurações

### Telegram Bot

1. **Criar bot**
   - Abra o Telegram
   - Procure por [@BotFather](https://t.me/botfather)
   - Envie `/newbot`
   - Siga as instruções
   - Copie o token fornecido

2. **Obter Chat ID**
   - Envie uma mensagem para seu bot
   - Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
   - Procure por `"chat":{"id":123456789}`
   - Copie o número do ID

3. **Configurar no sistema**
   - Cole o Bot Token
   - Cole o Chat ID
   - Teste a conexão

### WhatsApp

1. **Habilitar WhatsApp**
   - Marque a opção "Habilitar WhatsApp"
   - Digite o número de destino (com código do país)
   - Formato: 5511999999999 (código do país + DDD + número)

2. **Primeira execução**
   - Ao iniciar o sistema, um QR Code aparecerá no terminal
   - Escaneie com seu WhatsApp
   - A sessão será salva automaticamente

### Serviço de IA

#### Groq (Recomendado - Gratuito)

1. **Criar conta**
   - Acesse: https://console.groq.com/
   - Crie uma conta gratuita
   - Obtenha sua API Key

2. **Configurar**
   - Selecione "Groq" como provedor
   - Cole sua API Key
   - Teste a conexão

#### OpenAI

1. **Criar conta**
   - Acesse: https://platform.openai.com/
   - Crie uma conta
   - Adicione créditos
   - Obtenha sua API Key

2. **Configurar**
   - Selecione "OpenAI" como provedor
   - Cole sua API Key
   - Teste a conexão

### Feeds RSS

1. **Adicionar feed**
   - Clique em "+ Adicionar Feed RSS"
   - Cole a URL do feed
   - Selecione a fonte (RSS, Pelando, Promobit)
   - Salve

2. **Feeds populares**
   - Pelando: https://www.pelando.com.br/feed
   - Promobit: https://www.promobit.com.br/feed

### Configurações de Coleta

1. **Habilitar coleta automática**
   - Marque a opção para habilitar
   - Selecione as fontes desejadas:
     - Amazon
     - AliExpress
     - RSS

2. **Agendamento**
   - A coleta automática roda a cada 6 horas
   - Pode ser alterada editando `src/jobs/scheduler.ts`

## Testando as Configurações

Na página de Configurações, você pode testar cada serviço:

1. **Testar Amazon**: Verifica conexão com a API
2. **Testar Telegram**: Verifica se o bot está configurado
3. **Testar IA**: Verifica se o serviço de IA está funcionando

## Solução de Problemas

### Erro: "Amazon API error"
- Verifique se as credenciais estão corretas
- Verifique se o Associate Tag está ativo
- Verifique se a região está correta

### Erro: "Telegram bot not working"
- Verifique se o token está correto
- Verifique se o Chat ID está correto
- Certifique-se de que o bot foi iniciado (envie `/start`)

### Erro: "AI service error"
- Verifique se a API Key está correta
- Verifique se há créditos disponíveis (OpenAI)
- Verifique a conexão com a internet

### Erro: "WhatsApp QR Code não aparece"
- Verifique se o WhatsApp está habilitado
- Verifique os logs do servidor
- Tente deletar a pasta `.wwebjs_auth` e reiniciar

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca compartilhe suas API Keys
- Não commite o arquivo `.env` no Git
- Use variáveis de ambiente em produção
- As configurações são salvas em `config.json` (não commitar)

## Próximos Passos

Após configurar:
1. Teste cada serviço individualmente
2. Execute uma coleta manual
3. Verifique se as ofertas estão sendo coletadas
4. Teste o envio para Telegram/WhatsApp
5. Configure os cron jobs conforme necessário

## 📚 Documentação Relacionada

Para informações mais detalhadas, consulte:
- [Guia Completo de Configuração](CONFIGURATION_COMPLETE.md) - Guia consolidado com todos os detalhes
- [Troubleshooting](TROUBLESHOOTING.md) - Solução de problemas
- [Setup Guide](SETUP.md) - Instalação inicial

