# 🔧 Guia PowerShell - Windows

## Comandos Corrigidos para PowerShell

No PowerShell do Windows, o operador `&&` não funciona. Use `;` ou execute comandos separados.

### ✅ Comandos Corretos

#### Instalar Dependências
```powershell
# Backend
npm install

# Frontend (use ponto-e-vírgula)
cd frontend; npm install; cd ..

# Ou em comandos separados:
cd frontend
npm install
cd ..
```

#### Executar Aplicação
```powershell
# Desenvolvimento (já configurado no package.json)
npm run dev

# Ou separadamente:
npm run dev:backend
npm run dev:frontend
```

#### Copiar Arquivo .env
```powershell
# PowerShell
Copy-Item .env.example .env

# Ou
cp .env.example .env
```

### ❌ Comandos que NÃO Funcionam no PowerShell

```powershell
# ❌ ERRADO - && não funciona
cd frontend && npm install && cd ..

# ✅ CORRETO - use ;
cd frontend; npm install; cd ..
```

### 📝 Scripts no package.json

Os scripts já foram corrigidos para funcionar no PowerShell:

```json
{
  "dev:frontend": "cd frontend; npm run dev"
}
```

### 🚀 Próximos Passos

1. **Configure o .env:**
```powershell
Copy-Item .env.example .env
notepad .env
```

2. **Inicie o MongoDB** (se local):
```powershell
# Verificar se está rodando
Get-Service MongoDB

# Ou iniciar
Start-Service MongoDB
```

3. **Execute a aplicação:**
```powershell
npm run dev
```

4. **Acesse:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000

### 💡 Dicas

- Use `;` para separar comandos no PowerShell
- Use `Get-Help` para ajuda: `Get-Help npm`
- Use `Ctrl+C` para parar processos
- Verifique logs no terminal onde o processo está rodando

### 🐛 Troubleshooting

**Erro: "token '&&' não é válido"**
- Use `;` ao invés de `&&`
- Ou execute comandos separados

**Porta já em uso:**
```powershell
# Ver processos na porta
netstat -ano | findstr :3000

# Matar processo (substitua PID)
taskkill /PID <PID> /F
```

**MongoDB não conecta:**
```powershell
# Verificar se está rodando
Get-Service MongoDB

# Testar conexão
mongosh "mongodb://localhost:27017"
```

