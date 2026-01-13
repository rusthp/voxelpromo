# Guia de Configuração .env - Multi-Tenant

## 🔒 NUNCA MEXER (Sistema Compartilhado)

Essas variáveis são **ÚNICAS PARA O SERVIDOR** e afetam todos os usuários:

```bash
# ❌ NÃO ALTERAR
PORT=3000                    # Porta do servidor
MONGODB_URI=...              # Banco de dados compartilhado
JWT_SECRET=...               # Segurança compartilhada
FRONTEND_URL=...             # URL do frontend
ALLOWED_ORIGINS=...          # CORS
NODE_ENV=production          # Ambiente
BASE_URL=...                 # URL base do sistema
SHORT_URL_BASE=...           # Base para links curtos
```

**Motivo:** Se alguém mudar, quebra para TODOS os usuários.

---

## ✅ CADA USUÁRIO CONFIGURA SEU PRÓPRIO

Essas são **credenciais individuais** por usuário (via `config.json` no banco):

### 1. **IA (Obrigatório - Escolher 1+)**
```bash
# Cada usuário usa sua própria API key
GROQ_API_KEY=gsk_abc123...              # Recomendado (gratuito)
OPENAI_API_KEY=sk-proj-xyz...           # Alternativa
DEEPSEEK_API_KEY=dsk_...                # Alternativa
AI_PROVIDER=groq                        # Qual usar
```

### 2. **Canais de Publicação (Opcional)**
```bash
# Telegram - Cada usuário tem seu bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=-1001234567890

# WhatsApp - Cada usuário conecta seu próprio
WHATSAPP_ENABLED=true
WHATSAPP_TARGET_NUMBER=5511999999999

# X (Twitter) - Credenciais individuais
X_API_KEY=...
X_API_KEY_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...

# Instagram - Credenciais individuais
INSTAGRAM_APP_ID=...
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_PAGE_ID=...
```

### 3. **Affiliates (Opcional)**
```bash
# Amazon - Cada usuário tem sua tag
AMAZON_ACCESS_KEY=...
AMAZON_SECRET_KEY=...
AMAZON_ASSOCIATE_TAG=seunick-20        # TAG INDIVIDUAL

# AliExpress - Cada usuário tem tracking
ALIEXPRESS_APP_KEY=...
ALIEXPRESS_TRACKING_ID=SEU_ID          # ID INDIVIDUAL

# Mercado Livre - Cada usuário tem código
MERCADOLIVRE_CLIENT_ID=...
MERCADOLIVRE_AFFILIATE_CODE=SEU_CODE   # CÓDIGO INDIVIDUAL
```

---

## ⚠️ COMPARTILHADO MAS CONFIGURÁVEL

Essas variáveis são **compartilhadas** mas podem ser ajustadas:

### Pagamentos (Mercado Pago)
```bash
# 🟡 COMPARTILHADO - Conta da empresa
MP_ACCESS_TOKEN=...          # Define o admin
MP_PUBLIC_KEY=...            # Frontend
MP_WEBHOOK_SECRET=...        # Segurança
```

**Nota:** Todos os pagamentos vão para a mesma conta MP.

### Email (SMTP)
```bash
# 🟡 COMPARTILHADO - Email oficial
EMAIL_HOST=smtp.titan.email
EMAIL_USER=contato@voxelpromo.com
EMAIL_PASS=...
EMAIL_FROM=VoxelPromo <contato@voxelpromo.com>
```

**Nota:** Todos os emails vêm do mesmo remetente.

### Observabilidade
```bash
# 🟡 COMPARTILHADO - Logs centralizados
SENTRY_DSN=...               # Todos os erros vão para mesmo Sentry
VECTORIZER_URL=...           # RAG compartilhado
```

---

## 📋 Checklist por Tipo de Usuário

### **Usuário Básico** (Mínimo para funcionar)
- [ ] `GROQ_API_KEY` ou `OPENAI_API_KEY`
- [ ] `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` OU
- [ ] `X_API_KEY` + secrets OU
- [ ] `WHATSAPP_ENABLED=true`

### **Usuário Afiliado**
Básico +
- [ ] `AMAZON_ASSOCIATE_TAG` (se usar Amazon)
- [ ] `ALIEXPRESS_TRACKING_ID` (se usar AliExpress)
- [ ] `MERCADOLIVRE_AFFILIATE_CODE` (se usar ML)

### **Usuário Completo**
Afiliado +
- [ ] Todas as redes sociais configuradas
- [ ] Múltiplos marketplaces
- [ ] Observabilidade individual (se disponível)

---

## 🛠️ Como Funciona na Prática

### Variáveis .env (Servidor - Admin configura)
```bash
# Infraestrutura compartilhada
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
PORT=3000
FRONTEND_URL=https://app.voxelpromo.com
```

### config.json (Por usuário - Via dashboard)
```json
{
  "userId": "user123",
  "ai": {
    "provider": "groq",
    "groqApiKey": "gsk_usuario1_..."
  },
  "telegram": {
    "botToken": "123:ABC_usuario1",
    "chatId": "-100123"
  },
  "amazon": {
    "associateTag": "usuario1-20"
  }
}
```

**Fluxo:**
1. Admin configura `.env` com infra base
2. Usuário faz login
3. Usuário configura suas credenciais em `/settings`
4. Sistema salva no `config.json` do banco (por userId)
5. Cada execução usa as credenciais do usuário logado

---

## 🚨 Erros Comuns

### ❌ **ERRO: Mudar JWT_SECRET**
```bash
# Um usuário mudou no .env
JWT_SECRET=nova_chave_usuario1

# Resultado: TODOS os logins quebram
```

### ❌ **ERRO: Mudar MONGODB_URI**
```bash
# Um usuário mudou para seu banco local
MONGODB_URI=mongodb://localhost:27017/meu_banco

# Resultado: Perde acesso aos dados de TODOS
```

### ✅ **CORRETO: Configurar credenciais próprias**
```bash
# Via dashboard /settings ou config.json no banco
{
  "telegram": {
    "botToken": "MEU_BOT_TOKEN"
  }
}
```

---

## 🎯 Resumo Rápido

| Variável | Quem Mexe | Onde | Impacto |
|----------|-----------|------|---------|
| `PORT`, `MONGODB_URI`, `JWT_SECRET` | **Admin** | `.env` servidor | **Todos** |
| `MP_ACCESS_TOKEN`, `EMAIL_*` | **Admin** | `.env` servidor | **Todos** |
| `GROQ_API_KEY`, `TELEGRAM_*` | **Usuário** | Dashboard/DB | **Só ele** |
| `AMAZON_ASSOCIATE_TAG` | **Usuário** | Dashboard/DB | **Só ele** |

---

## 💡 Dica Final

**Para multi-tenant seguro:**

1. `.env` no servidor → **APENAS infraestrutura** (admin configura 1x)
2. `config.json` no banco → **Credenciais por usuário** (cada um configura)
3. Dashboard `/settings` → **Interface para usuário configurar**

Assim ninguém quebra nada de ninguém! 🎉
