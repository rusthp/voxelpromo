# 🐧 MongoDB no WSL (Windows Subsystem for Linux)

## ⚠️ Problema Específico do WSL

No WSL, o `systemctl` **não funciona** porque o WSL não usa systemd por padrão. Você verá o erro:

```
System has not been booted with systemd as init system (PID 1). Can't operate.
```

## ✅ Soluções para WSL

### Opção 1: MongoDB Atlas (Recomendado - Mais Fácil)

A forma mais fácil é usar **MongoDB Atlas** (cloud gratuito):

1. **Criar conta gratuita:**
   - Acesse: https://www.mongodb.com/cloud/atlas/register
   - Crie uma conta (gratuita)

2. **Criar cluster:**
   - Clique em "Build a Database"
   - Escolha "FREE" (M0)
   - Selecione uma região próxima (ex: São Paulo)
   - Clique em "Create"

3. **Configurar acesso:**
   - Vá em "Database Access" → "Add New Database User"
   - Crie um usuário e senha (anote eles!)
   - Vá em "Network Access" → "Add IP Address"
   - **IMPORTANTE:** Clique em "Allow Access from Anywhere" (0.0.0.0/0)
     - Isso permite conexão de qualquer IP (seguro para desenvolvimento)
     - Ou adicione seu IP específico se preferir mais segurança
   - **Aguarde 2-3 minutos** após adicionar o IP para as mudanças terem efeito

4. **Obter connection string:**
   - Vá em "Database" → "Connect"
   - Escolha "Connect your application"
   - Copie a connection string (algo como):
     ```
     mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

5. **Atualizar `.env`:**
   ```env
   MONGODB_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/voxelpromo?retryWrites=true&w=majority
   ```
   (Substitua `usuario`, `senha` e `cluster0.xxxxx` pelos seus valores)

6. **Pronto!** Agora execute:
   ```bash
   npm run dev
   ```

### Opção 2: Instalar MongoDB Manualmente no WSL

Se você prefere MongoDB local:

#### Passo 1: Instalar MongoDB

```bash
# 1. Importar chave pública
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# 2. Adicionar repositório (ajuste para sua versão do Ubuntu)
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 3. Atualizar pacotes
sudo apt-get update

# 4. Instalar MongoDB
sudo apt-get install -y mongodb-org
```

#### Passo 2: Criar Diretório de Dados

```bash
# Criar diretório
sudo mkdir -p /data/db

# Dar permissões
sudo chown -R $USER:$USER /data/db
```

#### Passo 3: Iniciar MongoDB Manualmente (sem systemd)

Como `systemctl` não funciona no WSL, você precisa iniciar MongoDB manualmente:

```bash
# Iniciar MongoDB em background
mongod --dbpath /data/db --fork --logpath /var/log/mongodb/mongod.log

# Verificar se está rodando
ps aux | grep mongod
```

#### Passo 4: Criar Script de Inicialização

Crie um script para facilitar:

```bash
# Criar script
cat > ~/start-mongodb.sh << 'EOF'
#!/bin/bash
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    mongod --dbpath /data/db --fork --logpath /var/log/mongodb/mongod.log
    echo "MongoDB started!"
else
    echo "MongoDB is already running"
fi
EOF

# Dar permissão de execução
chmod +x ~/start-mongodb.sh
```

Agora você pode iniciar MongoDB com:
```bash
~/start-mongodb.sh
```

#### Passo 5: Parar MongoDB

```bash
# Parar MongoDB
pkill mongod

# Ou forçar parada
sudo pkill -9 mongod
```

### Opção 3: Usar Docker (Alternativa)

Se você tem Docker instalado no WSL:

```bash
# 1. Iniciar MongoDB em container
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb-data:/data/db \
  mongo:latest

# 2. Verificar se está rodando
docker ps

# 3. Parar MongoDB
docker stop mongodb

# 4. Iniciar novamente
docker start mongodb
```

## 🔍 Verificar se MongoDB está Rodando

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

Se `mongosh` ou `mongo` conectarem, o MongoDB está funcionando!

## 🚀 Iniciar Sistema Completo

Após MongoDB estar rodando:

```bash
# 1. Iniciar MongoDB (se usando instalação manual)
~/start-mongodb.sh
# ou
mongod --dbpath /data/db --fork --logpath /var/log/mongodb/mongod.log

# 2. Verificar se está rodando
ps aux | grep mongod

# 3. Iniciar o sistema
npm run dev
```

Você deve ver:
```
[BACKEND] ✅ MongoDB connected successfully
[BACKEND] 🚀 Server running on port 3000
```

## 🐛 Troubleshooting

### Erro: "mongod: command not found"

**Causa**: MongoDB não está instalado

**Solução**: Siga o "Passo 1" acima ou use MongoDB Atlas

### Erro: "Permission denied" ao criar /data/db

**Solução**:
```bash
sudo mkdir -p /data/db
sudo chown -R $USER:$USER /data/db
```

### Erro: "Address already in use"

**Causa**: MongoDB já está rodando ou outra aplicação está usando a porta 27017

**Solução**:
```bash
# Verificar o que está usando a porta
sudo lsof -i :27017

# Parar MongoDB
pkill mongod
```

### MongoDB inicia mas não conecta

**Verificar logs**:
```bash
# Ver logs do MongoDB
tail -f /var/log/mongodb/mongod.log
```

### Erro: "Could not connect to any servers" (MongoDB Atlas)

**Causa**: Seu IP não está na whitelist do MongoDB Atlas

**Solução Rápida**:
1. Acesse: https://cloud.mongodb.com/
2. Vá em **Network Access** (no menu lateral)
3. Clique em **"Add IP Address"**
4. Clique em **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Isso permite conexão de qualquer IP
   - Seguro para desenvolvimento/testes
5. **Aguarde 2-3 minutos** para as mudanças terem efeito
6. Tente conectar novamente

**Solução Mais Segura** (produção):
1. Descubra seu IP atual:
   ```bash
   curl ifconfig.me
   ```
2. No MongoDB Atlas → Network Access → Add IP Address
3. Adicione seu IP específico (ex: 192.168.1.100)
4. Aguarde 2-3 minutos

**Nota**: Se você está usando WSL, o IP pode mudar. Use "Allow Access from Anywhere" para desenvolvimento.

## 💡 Recomendação

Para WSL, **recomendo usar MongoDB Atlas** (Opção 1) porque:
- ✅ Não precisa instalar nada
- ✅ Funciona imediatamente
- ✅ Gratuito até 512MB
- ✅ Sem problemas de configuração
- ✅ Acessível de qualquer lugar

## 📋 Checklist

- [ ] Escolhi uma opção (Atlas, Manual ou Docker)
- [ ] MongoDB está rodando (verificado com `ps aux | grep mongod`)
- [ ] Arquivo `.env` tem `MONGODB_URI` configurado
- [ ] Testei conexão com `mongosh` ou `mongo`
- [ ] Executei `npm run dev` e vi "MongoDB connected successfully"

## 🔗 Links Úteis

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [MongoDB Installation Guide](https://www.mongodb.com/docs/manual/installation/)
- [Docker Hub - MongoDB](https://hub.docker.com/_/mongo)

