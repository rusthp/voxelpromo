# 🚀 Início Rápido - Desenvolvimento

## ✅ Comando Único para Tudo

Sim! Você pode iniciar **backend e frontend juntos** com apenas um comando:

```bash
npm run dev
```

Este comando inicia:
- ✅ **Backend** na porta **3000** (azul no terminal)
- ✅ **Frontend** na porta **3001** (verde no terminal)

## 📋 O que acontece?

Quando você executa `npm run dev`:

1. **Backend inicia primeiro**
   - Compila TypeScript
   - Conecta ao MongoDB
   - Inicia servidor em `http://localhost:3000`
   - Configura cron jobs

2. **Frontend inicia depois**
   - Compila Next.js
   - Inicia servidor em `http://localhost:3001`
   - Aguarda backend estar pronto

## 🎨 Visual no Terminal

Você verá algo assim:

```
[BACKEND] [nodemon] starting `ts-node src/server.ts`
[BACKEND] Server running on port 3000
[BACKEND] MongoDB connected successfully

[FRONTEND] ▲ Next.js 14.2.33
[FRONTEND] - Local: http://localhost:3001
[FRONTEND] ✓ Ready in 5.2s
```

- **BACKEND** aparece em **azul**
- **FRONTEND** aparece em **verde**

## 🔧 Comandos Disponíveis

### Desenvolvimento

```bash
# Iniciar tudo (backend + frontend)
npm run dev

# Apenas backend
npm run dev:backend

# Apenas frontend
npm run dev:frontend
```

### Build

```bash
# Build de tudo
npm run build

# Build apenas backend
npm run build:backend

# Build apenas frontend
npm run build:frontend
```

## ⚠️ Pré-requisitos

Antes de executar `npm run dev`, certifique-se de:

1. **MongoDB está rodando**
   ```bash
   # Verificar se MongoDB está ativo
   # Windows: Services → MongoDB
   # Linux: sudo systemctl status mongod
   ```

2. **Arquivo `.env` existe** (na raiz do projeto)
   ```env
   MONGODB_URI=mongodb://localhost:27017/voxelpromo
   JWT_SECRET=your-secret-key-here
   ```

3. **Dependências instaladas**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

## 🛑 Parar o Servidor

Para parar ambos os servidores:
- Pressione `Ctrl+C` no terminal

## 🔄 Reiniciar

Se precisar reiniciar:

1. Pare com `Ctrl+C`
2. Execute novamente: `npm run dev`

## 🐛 Problemas Comuns

### Backend não inicia

**Erro**: `MongoDB connection error`

**Solução**: Verifique se o MongoDB está rodando

### Frontend não carrega

**Erro**: `ERR_CONNECTION_REFUSED`

**Solução**: Aguarde o backend iniciar primeiro (pode levar 2-5 segundos)

### Porta já em uso

**Erro**: `Port 3000 is already in use`

**Solução**: 
```bash
# Encontrar processo usando a porta
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Matar o processo ou mudar a porta no .env
```

## 📝 Logs

Os logs aparecem no terminal com prefixos coloridos:

- `[BACKEND]` - Logs do servidor Node.js
- `[FRONTEND]` - Logs do Next.js

## ✅ Checklist Rápido

Antes de executar `npm run dev`:

- [ ] MongoDB está rodando
- [ ] Arquivo `.env` existe na raiz
- [ ] Dependências instaladas (`npm install`)
- [ ] Dependências do frontend instaladas (`cd frontend && npm install`)

## 🎯 Próximos Passos

Depois que `npm run dev` iniciar com sucesso:

1. Acesse: http://localhost:3001
2. Crie sua conta ou faça login
3. Configure as APIs nas Configurações
4. Comece a usar o sistema!

---

**Dica**: Mantenha o terminal aberto enquanto desenvolve. O nodemon reinicia automaticamente o backend quando você salva arquivos `.ts`, e o Next.js faz hot-reload do frontend.

