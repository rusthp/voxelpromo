# 🚀 Quick Start Guide

## Windows PowerShell

### 1. Instalar Dependências

```powershell
# Backend
npm install

# Frontend
cd frontend; npm install; cd ..
```

### 2. Configurar Ambiente

```powershell
# Copiar arquivo de exemplo
Copy-Item .env.example .env

# Editar .env com suas credenciais
notepad .env
```

### 3. Iniciar Aplicação

```powershell
# Desenvolvimento (backend + frontend juntos)
npm run dev

# Ou separadamente:
npm run dev:backend   # Porta 3000
npm run dev:frontend   # Porta 3001
```

### 4. Acessar

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Linux/Mac (Bash)

### 1. Instalar Dependências

```bash
# Backend
npm install

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configurar Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env
nano .env
```

### 3. Iniciar Aplicação

```bash
npm run dev
```

## Comandos Úteis

```powershell
# Verificar se MongoDB está rodando
# (Windows)
Get-Service MongoDB

# (Linux/Mac)
sudo systemctl status mongod

# Ver logs
# Backend logs aparecem no terminal
# Frontend logs aparecem no terminal

# Parar aplicação
# Ctrl+C no terminal
```

## Troubleshooting

### Erro: "Cannot find module"
```powershell
# Reinstalar dependências
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Erro: "MongoDB connection failed"
- Verifique se MongoDB está rodando
- Verifique a URI no `.env`
- Teste conexão: `mongosh "mongodb://localhost:27017"`

### Erro: "Port already in use"
```powershell
# Verificar processos na porta
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Matar processo (substitua PID)
taskkill /PID <PID> /F
```

