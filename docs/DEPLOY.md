# 🚀 Deploy do VoxelPromo

Guia de deploy para ambiente de produção.

## Requisitos

- Node.js 18+ (recomendado: 20 LTS)
- MongoDB 6+ (Atlas ou self-hosted)
- Servidor Linux (Ubuntu 20.04+ recomendado)
- PM2 (gerenciador de processos)
- Nginx (proxy reverso)

## Deploy Rápido (VPS)

### 1. Preparar o Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx
sudo apt install -y nginx
```

### 2. Clonar e Configurar

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/voxelpromo.git
cd voxelpromo

# Instalar dependências
npm install
cd frontend && npm install && npm run build
cd ..

# Criar arquivo .env
cp .env.example .env
nano .env
```

### 3. Variáveis de Ambiente Obrigatórias

```env
# Banco de Dados (OBRIGATÓRIO)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/voxelpromo

# JWT (OBRIGATÓRIO - gere uma chave única)
JWT_SECRET=sua-chave-secreta-muito-segura-32-chars

# Servidor
PORT=3000
NODE_ENV=production

# CORS - URLs do frontend
ALLOWED_ORIGINS=https://seudominio.com,https://admin.seudominio.com
```

### 4. Variáveis Opcionais (por funcionalidade)

```env
# IA - pelo menos uma
GROQ_API_KEY=gsk_xxx
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=sk-xxx

# Telegram (para publicações)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=-100xxx

# WhatsApp
WHATSAPP_ENABLED=true
WHATSAPP_LIBRARY=baileys

# Amazon Affiliate
AMAZON_ASSOCIATE_TAG=seu-tag-20
AMAZON_ACCESS_KEY=AKIAXXXXXXXX
AMAZON_SECRET_KEY=xxxxx

# Twitter/X
X_API_KEY=xxx
X_API_KEY_SECRET=xxx
X_ACCESS_TOKEN=xxx
X_ACCESS_TOKEN_SECRET=xxx
```

### 5. Iniciar com PM2

```bash
# Build do backend (se usar TypeScript)
npm run build

# Iniciar com PM2
pm2 start dist/server.js --name voxelpromo

# Salvar para restart automático
pm2 save
pm2 startup
```

### 6. Configurar Nginx

```nginx
# /etc/nginx/sites-available/voxelpromo
server {
    listen 80;
    server_name seudominio.com;

    # Frontend (React)
    location / {
        root /var/www/voxelpromo/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/voxelpromo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL com Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com
```

## Health Checks

O sistema expõe endpoints para monitoramento:

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/health` | Status geral do sistema |
| `GET /api/health/ready` | Kubernetes readiness probe |
| `GET /api/health/live` | Kubernetes liveness probe |
| `GET /api/health/detailed` | Métricas detalhadas (memória, uptime) |
| `GET /api/health/database` | Status do MongoDB |
| `GET /api/health/sources` | Status das fontes de coleta |

Use para configurar alertas do UptimeRobot, Healthchecks.io, etc.

## Docker (Alternativo)

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

```bash
# Build e run
docker build -t voxelpromo .
docker run -d -p 3000:3000 --env-file .env voxelpromo
```

## Troubleshooting

### Erro de Porta em Uso
```bash
# Encontrar processo na porta 3000
lsof -i :3000 | grep LISTEN
# ou
netstat -tulpn | grep 3000

# Matar processo
kill -9 <PID>
```

### Logs PM2
```bash
pm2 logs voxelpromo
pm2 logs voxelpromo --lines 100
```

### Reiniciar Aplicação
```bash
pm2 restart voxelpromo
# ou reload sem downtime
pm2 reload voxelpromo
```

### Verificar Memória
```bash
# Ver uso de memória do PM2
pm2 monit

# Ou via health check
curl http://localhost:3000/api/health/detailed | jq
```
