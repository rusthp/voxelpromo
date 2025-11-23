# 🚀 Guia Completo de Início Rápido

Este guia consolida todas as informações sobre como começar a usar o VoxelPromo.

## 📋 Índice

1. [Instalação](#instalação)
2. [Configuração Inicial](#configuração-inicial)
3. [Iniciar Aplicação](#iniciar-aplicação)
4. [Primeiros Passos](#primeiros-passos)
5. [Troubleshooting](#troubleshooting)

## Instalação

### Pré-requisitos

- Node.js 18+ e npm
- MongoDB (local ou cloud - MongoDB Atlas)
- Contas para:
  - Amazon Associates (opcional)
  - AliExpress Affiliate Program (opcional)
  - Groq ou OpenAI (para IA)
  - Telegram Bot (via BotFather)
  - X (Twitter) Developer Portal (opcional)

### 1. Instalar Dependências

**PowerShell (Windows):**
```powershell
# Backend
npm install

# Frontend
cd frontend; npm install; cd ..
```

**Bash/CMD:**
```bash
# Backend
npm install

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configurar Ambiente

**Criar arquivo de configuração:**
```bash
# Copiar template
cp config.json.example config.json

# Editar com suas credenciais
# (Windows) notepad config.json
# (Linux/Mac) nano config.json
```

## Configuração Inicial

### 1. MongoDB

**Opção A: MongoDB Local**
```bash
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod

# Verificar
mongosh "mongodb://localhost:27017"
```

**Opção B: MongoDB Atlas (Recomendado)**
1. Crie conta: https://www.mongodb.com/cloud/atlas
2. Crie cluster gratuito
3. Obtenha connection string
4. Configure no `config.json` ou `.env`

### 2. Credenciais Mínimas

Para começar, você precisa de pelo menos:
- ✅ MongoDB URI
- ✅ Telegram Bot Token e Chat ID (para postar ofertas)
- ✅ Groq API Key (para gerar posts com IA)

Ver [CONFIGURATION_COMPLETE.md](CONFIGURATION_COMPLETE.md) para detalhes.

## Iniciar Aplicação

### Comando Único (Recomendado)

```bash
npm run dev
```

Este comando inicia **backend e frontend juntos**:
- ✅ **Backend**: http://localhost:3000 (azul no terminal)
- ✅ **Frontend**: http://localhost:3001 (verde no terminal)

### Comandos Separados

```bash
# Apenas backend
npm run dev:backend

# Apenas frontend (em outro terminal)
npm run dev:frontend
```

### Visual no Terminal

Você verá:
```
[BACKEND] [nodemon] starting `ts-node src/server.ts`
[BACKEND] ✅ MongoDB connected successfully
[BACKEND] 🚀 Server running on port 3000

[FRONTEND] ▲ Next.js 14.2.33
[FRONTEND] - Local: http://localhost:3001
[FRONTEND] ✓ Ready in 5.2s
```

## Primeiros Passos

### 1. Acessar o Sistema

1. Abra: http://localhost:3001
2. **Criar conta** ou fazer login
3. Se for primeira vez, use o script:
   ```bash
   npm run create-admin
   ```

### 2. Configurar Serviços

1. Acesse: http://localhost:3001/settings
2. Configure:
   - Telegram Bot (Token e Chat ID)
   - Serviço de IA (Groq recomendado)
   - Outras APIs conforme necessário
3. **Teste cada serviço** usando os botões de teste

### 3. Coletar Ofertas

1. Na página principal, clique em **"Coletar Ofertas Agora"**
2. Aguarde a coleta terminar
3. Visualize as ofertas coletadas

### 4. Postar Ofertas

1. Selecione uma oferta
2. Clique em **"Gerar Post IA"** (opcional)
3. Clique em **"Publicar"**
4. A oferta será enviada para Telegram e X (Twitter)

## Troubleshooting

### Backend Não Inicia

**Erro**: `MongoDB connection error`

**Solução**:
- Verifique se MongoDB está rodando
- Verifique a URI no `config.json` ou `.env`
- Teste conexão: `mongosh "mongodb://localhost:27017"`

### Frontend Não Carrega

**Erro**: `ERR_CONNECTION_REFUSED`

**Solução**:
- Aguarde o backend iniciar primeiro (2-5 segundos)
- Verifique se backend está na porta 3000
- Verifique logs do backend

### Porta Já em Uso

**Erro**: `Port 3000 is already in use`

**Solução**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Erro: "Cannot find module"

**Solução**:
```bash
# Reinstalar dependências
rm -rf node_modules
rm package-lock.json
npm install

# Frontend também
cd frontend
rm -rf node_modules
rm package-lock.json
npm install
cd ..
```

## Comandos Úteis

### Desenvolvimento
```bash
npm run dev              # Backend + Frontend
npm run dev:backend      # Apenas backend
npm run dev:frontend     # Apenas frontend
```

### Build
```bash
npm run build            # Build completo
npm run build:backend    # Build backend
npm run build:frontend   # Build frontend
```

### Qualidade
```bash
npm run type-check       # Verificar tipos TypeScript
npm run lint             # Verificar código
npm run test             # Executar testes
npm run test:coverage    # Testes com cobertura
npm run quality          # Todos os checks
```

### Utilitários
```bash
npm run create-admin     # Criar usuário admin
npm run verify-config    # Verificar configuração
```

## ✅ Checklist Rápido

Antes de executar `npm run dev`:

- [ ] Node.js 18+ instalado
- [ ] MongoDB rodando ou Atlas configurado
- [ ] Dependências instaladas (`npm install`)
- [ ] Dependências do frontend instaladas
- [ ] Arquivo `config.json` criado (ou `.env`)
- [ ] Credenciais mínimas configuradas

## 🎯 Próximos Passos

Depois que tudo estiver funcionando:

1. ✅ Configure todas as APIs necessárias
2. ✅ Teste a coleta de ofertas
3. ✅ Configure postagem automática (cron jobs)
4. ✅ Personalize mensagens e formatação
5. ✅ Configure filtros de ofertas

## 📚 Documentação Relacionada

- [Configuração Completa](CONFIGURATION_COMPLETE.md) - Detalhes de configuração
- [Setup Guide](SETUP.md) - Instalação detalhada
- [Troubleshooting](TROUBLESHOOTING.md) - Solução de problemas
- [Features](FEATURES.md) - Funcionalidades disponíveis




