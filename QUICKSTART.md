# 🚀 VoxelPromo - Guia Rápido de Instalação

Rode o VoxelPromo em **menos de 5 minutos** seguindo estes passos.

---

## 📋 Pré-requisitos

Certifique-se de ter instalado:

- **Node.js 20+** ([Download](https://nodejs.org))
- **MongoDB 6+** (Local ou [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **npm** (já vem com Node.js)

---

## ⚡ Instalação Rápida

### 1. Clone e Instale

```bash
git clone https://github.com/rusthp/voxelpromo.git
cd voxelpromo
npm install
```

### 2. Configure Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure as **variáveis obrigatórias**:

```env
# OBRIGATÓRIO
PORT=3000
MONGODB_URI=mongodb://localhost:27017/voxelpromo
JWT_SECRET=sua-chave-secreta-minimo-32-caracteres-mude-isso-em-producao
FRONTEND_URL=http://localhost:3001

# RECOMENDADO (escolha pelo menos um provedor de IA)
GROQ_API_KEY=seu-groq-api-key               # Rápido e gratuito
# ou
OPENAI_API_KEY=seu-openai-api-key           # Melhor qualidade
```

> ⚠️ **Importante**: Sem uma API key de IA, o sistema não conseguirá gerar descrições automáticas para os produtos.

### 3. Instale o Frontend

```bash
cd frontend
npm install
cd ..
```

### 4. Inicie o Projeto

```bash
npm run dev
```

Isso iniciará:
- **Backend API**: `http://localhost:3000`
- **Dashboard Admin**: `http://localhost:3001`

---

## ✅ Como Validar que Está Funcionando

### 1. Teste o Backend

Abra no navegador ou use curl:

```bash
curl http://localhost:3000/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "uptime": 123,
  "memory": {...}
}
```

### 2. Acesse o Dashboard

1. Abra: `http://localhost:3001`
2. **Crie sua conta admin** (primeira vez):
   ```bash
   npm run create-admin
   ```
3. Faça login com as credenciais criadas

### 3. Logs Esperados

No terminal, você deve ver:

```
✅ Connected to MongoDB
🚀 Server running on port 3000
📊 Scheduler initialized
```

---

## 🔧 Configuração Avançada (Opcional)

Depois de validar que tudo funciona, você pode configurar:

### Canais de Distribuição

- **Telegram**: Configure `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`
- **WhatsApp**: Configure `WHATSAPP_ENABLED=true` e escaneie o QR Code
- **X (Twitter)**: Configure as credenciais da API do Twitter

### Programas de Afiliados

- **Amazon**: Credenciais da PA-API
- **AliExpress**: App Key e Secret
- **Mercado Livre**: Client ID e Secret

> 💡 **Dica**: Use o **Dashboard** (`Configurações`) para configurar visualmente ao invés de editar `.env`.

---

## 🐛 Problemas Comuns

### MongoDB não conecta

```
Error: MongoServerError: connect ECONNREFUSED
```

**Solução**: Certifique-se de que o MongoDB está rodando:
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Porta já em uso

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solução**: Mude a porta no `.env`:
```env
PORT=3001
```

### Variável de ambiente faltando

```
❌ Missing required env var: JWT_SECRET
```

**Solução**: Copie o `.env.example` e preencha todas as variáveis obrigatórias.

---

## 📚 Próximos Passos

- Leia o [README completo](./README.md) para entender todas as funcionalidades
- Veja o [Guia de Deploy](./docs/DEPLOY.md) para produção
- Confira o [Guia de Contribuição](./CONTRIBUTING.md)

---

## 🆘 Precisa de Ajuda?

- Abra uma [Issue no GitHub](https://github.com/rusthp/voxelpromo/issues)
- Consulte a [documentação completa](./README.md)

---

**Pronto!** Você agora tem o VoxelPromo rodando localmente. 🎉
