# Guia de Instalação em Produção (VM 24/7)

Este guia descreve os requisitos e passos para colocar o projeto VoxelPromo em produção em uma VPS/VM (Google Cloud, AWS, DigitalOcean, Hetzner, etc.) usando PM2.

## 1. Requisitos da VM

Com a otimização removendo o Puppeteer (Chrome Headless), o projeto fica bem mais leve.

### Recomendado
*   **CPU**: 2 vCPUs
*   **RAM**: 4 GB (Estabilidade total)
*   **Armazenamento**: 20GB SSD
*   **OS**: Ubuntu 22.04 LTS ou Debian 11/12

### Mínimo Absoluto
*   **CPU**: 1 vCPU
*   **RAM**: 2 GB (Com swap file configurado)
*   **Armazenamento**: 15GB SSD

> **Nota:** Sem o Chrome rodando (Puppeteer), o consumo de RAM cai drasticamente. O uso da biblioteca `baileys` para WhatsApp é muito eficiente.

---

## 2. Preparação do Ambiente

Acesse sua VM via SSH e instale as dependências básicas:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential

```

## 3. Configuração do Banco de Dados (MongoDB)

O banco de dados é **ESSENCIAL**. Sem ele, o sistema não inicia. Escolha sua versão do Ubuntu abaixo:

### A. Para Ubuntu 20.04 ou 22.04 (Padrão)

```bash
# 1. Importar chave GPG
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# 2. Adicionar repositório
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 3. Instalar e Iniciar
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl enable --now mongod
```

### B. Para Ubuntu 24.04 (Noble Numbat) ⚠️
O Ubuntu 24.04 ainda não tem pacotes oficiais. Use estes passos para forçar o repositório compatível (Jammy):

```bash
# 1. Instalar dependências
sudo apt install gnupg curl -y

# 2. Importar chave GPG
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# 3. Adicionar repositório (Forçando 'jammy')
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 4. Instalar MongoDB
sudo apt update
sudo apt install -y mongodb-org

# 5. Iniciar serviço
sudo systemctl enable --now mongod
systemctl status mongod
```

> **Alternativa:** Se preferir, você pode usar Docker (veja `docs/MONGODB_SETUP.md`).

> **Nota:** Se tiver erros, consulte o guia detalhado: [`docs/MONGODB_SETUP.md`](./MONGODB_SETUP.md)

## 4. Instalação e Build do Projeto

```bash
# Clone ou copie seu projeto para a VM (ex: /var/www/voxelpromo)
git clone <seu-repo> voxelpromo
cd voxelpromo

# Instalar dependências
npm install
npm install -g pm2 serve typescript ts-node

# Instalar dependências do Frontend
cd frontend
npm install

# CRIAR ARQUIVO .env PARA O FRONTEND (IMPORTANTE!)
# Crie um arquivo .env na pasta frontend com o IP da sua VPS
# Se não fizer isso, o site vai tentar conectar em localhost e falhará.
echo "VITE_API_URL=http://SEU_IP_DA_VPS:3000/api" > .env

cd ..

# Build do Backend (Para JavaScript)
npm run build:backend

# Build do Frontend (Para arquivos estáticos)
npm run build:frontend

# (OPCIONAL) Se você quer usar "Coletar de URL Personalizada" para Mercado Livre:
# O scraping precisa do Chrome (Puppeteer), que requer bibliotecas extras no Linux:
sudo apt-get install -y \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libgtk-3-0
```

## 5. Configuração do PM2

O PM2 vai gerenciar os processos, reiniciar em caso de erro e iniciar com o sistema.

Crie um arquivo `ecosystem.config.js` na raiz do projeto:

```javascript
module.exports = {
  apps: [
    {
      name: "voxel-api",
      script: "./dist/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        WHATSAPP_LIBRARY: "baileys",
        // IMPORTANTE: Adicione seu IP/Domínio para permitir conexão
        ALLOWED_ORIGINS: "http://SEU_IP_DA_VPS:3001,http://seu-dominio.com" 
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G" // Reinicia se usar muita RAM
    },
    {
      name: "voxel-web",
      script: "serve",
      env: {
        PM2_SERVE_PATH: "./frontend/dist",
        PM2_SERVE_PORT: 3001,
        PM2_SERVE_SPA: "true",
        PM2_SERVE_HOMEPAGE: "/index.html"
      }
    }
  ]
};
```

## 6. Iniciando a Aplicação

```bash
# Iniciar todos os processos
pm2 start ecosystem.config.js

# Salvar a lista para reiniciar com o sistema
pm2 save
pm2 startup
# (Rode o comando que o pm2 startup gerar)
```

## 7. Configuração de Nginx (Recomendado para HTTPS)

Para produção real, não exponha as portas 3000/3001 diretamente. Use Nginx como Proxy Reverso com Certificado SSL (Certbot).

Exemplo de config Nginx (`/etc/nginx/sites-available/voxelpromo`):
```nginx
server {
    server_name seu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## 8. Manutenção

*   **Logs**: `pm2 logs`
*   **Monitoramento**: `pm2 monit`
*   **Update**: `git pull && npm install && npm run build && pm2 restart all`
