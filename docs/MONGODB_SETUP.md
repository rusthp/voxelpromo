# 🍃 MongoDB - Guia de Instalação e Configuração

## ❌ Erro: `ECONNREFUSED 127.0.0.1:27017`

Este erro significa que o **MongoDB não está rodando** ou não está acessível na porta 27017.

## ✅ Solução Rápida

### Opção 1: Iniciar MongoDB (se já está instalado)

**Linux (WSL/Ubuntu):**
```bash
# Verificar se MongoDB está instalado
mongod --version

# Iniciar MongoDB
sudo systemctl start mongod

# Verificar status
sudo systemctl status mongod
```

**Windows:**
```bash
# Verificar se MongoDB está instalado
mongod --version

# Iniciar MongoDB (como serviço)
net start MongoDB

# Ou iniciar manualmente
mongod --dbpath "C:\data\db"
```

**macOS:**
```bash
# Iniciar MongoDB
brew services start mongodb-community

# Ou manualmente
mongod --config /usr/local/etc/mongod.conf
```

### Opção 2: Instalar MongoDB

#### Linux (WSL/Ubuntu)

```bash
# 1. Importar chave pública
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# 2. Adicionar repositório
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 3. Atualizar pacotes
sudo apt-get update

# 4. Instalar MongoDB
sudo apt-get install -y mongodb-org

# 5. Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# 6. Verificar status
sudo systemctl status mongod
```

#### Windows

1. **Baixar MongoDB:**
   - Acesse: https://www.mongodb.com/try/download/community
   - Selecione Windows e baixe o instalador MSI

2. **Instalar:**
   - Execute o instalador
   - Escolha "Complete" installation
   - Marque "Install MongoDB as a Service"
   - Deixe a porta padrão (27017)

3. **Verificar:**
   ```bash
   # Verificar se está rodando
   net start MongoDB
   ```

#### macOS

```bash
# Usando Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Opção 3: Usar MongoDB Atlas (Cloud - Gratuito)

Se você não quer instalar MongoDB localmente:

1. **Criar conta gratuita:**
   - Acesse: https://www.mongodb.com/cloud/atlas/register
   - Crie uma conta gratuita (M0 cluster)

2. **Criar cluster:**
   - Escolha região próxima
   - Cluster gratuito (M0)

3. **Obter string de conexão:**
   - Vá em "Connect" → "Connect your application"
   - Copie a connection string

4. **Atualizar `.env`:**
   ```env
   MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/voxelpromo?retryWrites=true&w=majority
   ```

## 🔍 Verificar se MongoDB está Rodando

### Linux/WSL
```bash
# Verificar processo
ps aux | grep mongod

# Verificar porta
netstat -tuln | grep 27017

# Testar conexão
mongosh
# ou
mongo
```

### Windows
```bash
# Verificar serviço
sc query MongoDB

# Testar conexão
mongosh
```

### macOS
```bash
# Verificar processo
ps aux | grep mongod

# Testar conexão
mongosh
```

## 🛠️ Configuração do Projeto

### Arquivo `.env`

Certifique-se de que o arquivo `.env` na raiz do projeto tem:

```env
MONGODB_URI=mongodb://localhost:27017/voxelpromo
```

Ou para MongoDB Atlas:
```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/voxelpromo?retryWrites=true&w=majority
```

### Criar Diretório de Dados (Linux/WSL)

Se o MongoDB não encontrar o diretório de dados:

```bash
# Criar diretório
sudo mkdir -p /data/db

# Dar permissões
sudo chown -R $USER:$USER /data/db

# Ou usar diretório customizado
mongod --dbpath ~/mongodb-data
```

## 🚀 Iniciar Sistema Completo

Após o MongoDB estar rodando:

```bash
# 1. Verificar se MongoDB está rodando
sudo systemctl status mongod  # Linux
# ou
net start MongoDB  # Windows

# 2. Iniciar o sistema
npm run dev
```

Você deve ver:
```
[BACKEND] Server running on port 3000
[BACKEND] MongoDB connected successfully
```

## 🐛 Troubleshooting

### Erro: "Permission denied" ao iniciar MongoDB

**Linux:**
```bash
# Dar permissões ao diretório de dados
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb
```

### Erro: "Port 27017 already in use"

**Verificar o que está usando a porta:**
```bash
# Linux
sudo lsof -i :27017

# Windows
netstat -ano | findstr :27017
```

**Solução:**
- Pare o processo que está usando a porta
- Ou mude a porta do MongoDB no `.env`

### Erro: "MongoDB não inicia"

**Verificar logs:**
```bash
# Linux
sudo journalctl -u mongod

# Windows
# Verificar Event Viewer → Applications
```

**Solução comum:**
- Verificar se há espaço em disco
- Verificar permissões do diretório de dados
- Verificar se a porta está livre

### MongoDB inicia mas não conecta

**Verificar firewall:**
```bash
# Linux
sudo ufw allow 27017

# Windows
# Verificar Windows Firewall
```

## 📋 Checklist

Antes de executar `npm run dev`:

- [ ] MongoDB está instalado
- [ ] MongoDB está rodando
- [ ] Porta 27017 está livre
- [ ] Arquivo `.env` existe com `MONGODB_URI`
- [ ] Diretório de dados tem permissões corretas (Linux)

## 🔗 Recursos

- [MongoDB Installation Guide](https://www.mongodb.com/docs/manual/installation/)
- [MongoDB Atlas (Cloud)](https://www.mongodb.com/cloud/atlas)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community)

## 💡 Dica

Se você está usando **WSL (Windows Subsystem for Linux)**, pode ser mais fácil usar **MongoDB Atlas** (cloud) do que instalar MongoDB no WSL.

