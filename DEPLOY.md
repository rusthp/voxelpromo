# 🚀 VoxelPromo - Production Deployment Guide

## Pre-Deployment Checklist

Before deploying to production, ensure **ALL** items are complete:

### 1. Security & Compliance
- [ ] `MP_WEBHOOK_SECRET` configured (Mercado Pago)
- [ ] `JWT_SECRET` is **strong** (32+ characters)
- [ ] HTTPS enforcement tested
- [ ] Sentry DSN configured
- [ ] MongoDB Atlas backups enabled
- [ ] LGPD consent checkbox working
- [ ] Account deletion endpoint tested

### 2. Environment Configuration
- [ ] All `.env` variables set in production
- [ ] No hardcoded secrets in code
- [ ] `NODE_ENV=production` set
- [ ] Database connection string (production)
- [ ] CORS origins configured

### 3. Testing
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] Payment flow tested (Mercado Pago sandbox)
- [ ] Webhooks verified (signature validation)
- [ ] User registration/login working

---

## Environment Variables (Production)

### Required Variables

```bash
# ========================================
# CORE
# ========================================
NODE_ENV=production
PORT=3000

# ========================================
# DATABASE
# ========================================
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/voxelpromo?retryWrites=true&w=majority

# ========================================
# SECURITY (CRITICAL)
# ========================================
JWT_SECRET=<GENERATE_STRONG_SECRET_32_CHARS_MIN>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ========================================
# MERCADO PAGO (REQUIRED FOR BILLING)
# ========================================
MP_ACCESS_TOKEN=APP_USR-production-access-token
MP_PUBLIC_KEY=APP_USR-production-public-key
MP_WEBHOOK_SECRET=<YOUR_WEBHOOK_SECRET>

# ========================================
# SENTRY (ERROR TRACKING - CRITICAL)
# ========================================
SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/123456
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# ========================================
# AI SERVICES (REQUIRED)
# ========================================
GROQ_API_KEY=gsk_your_groq_api_key
# OR
OPENAI_API_KEY=sk-your_openai_api_key

# ========================================
# OPTIONAL INTEGRATIONS
# ========================================
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
WHATSAPP_ENABLED=false

# Email (Resend)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=VoxelPromo <noreply@yourdomain.com>

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

### Generating Secrets

```bash
# Generate strong JWT_SECRET (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate MP_WEBHOOK_SECRET (any secret will work)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Deployment Options

### Option A: PM2 (Self-Hosted VPS)

**Best for**: VPS, Dedicated Server, EC2

#### 1. Install Dependencies

```bash
# On your server
cd /var/www/voxelpromo
npm install --production
npm run build
```

#### 2. Setup PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'voxelpromo-api',
    script: './dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    time: true,
    max_memory_restart: '500M'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Setup auto-restart on server reboot
pm2 startup
pm2 save
```

#### 3. Reverse Proxy (NGINX)

```nginx
# /etc/nginx/sites-available/voxelpromo
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (use Certbot)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for webhooks
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
```

```bash
# Enable site and restart NGINX
sudo ln -s /etc/nginx/sites-available/voxelpromo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

### Option B: Docker + Docker Compose

**Best for**: Containerized deployments, Kubernetes

#### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    container_name: voxelpromo-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    container_name: voxelpromo-db
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

  nginx:
    image: nginx:alpine
    container_name: voxelpromo-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api

volumes:
  mongo-data:
```

```bash
# Deploy
docker-compose up -d

# View logs
docker-compose logs -f api

# Restart
docker-compose restart api
```

### Option C: Serverless (Railway, Render, Fly.io)

**Best for**: Quick deployment, low maintenance

#### Railway

1. Connect GitHub repo
2. Set environment variables in dashboard
3. Deploy automatically on push

#### Render

```yaml
# render.yaml
services:
  - type: web
    name: voxelpromo-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Basic health
curl https://api.yourdomain.com/health
# Expected: {"status":"ok","timestamp":"2026-01-09T..."}

# Database health
curl https://api.yourdomain.com/api/health/database
# Expected: {"status":"ok","connected":true,...}

# Detailed health
curl https://api.yourdomain.com/api/health/detailed
# Check: database, uptime, memory
```

### 2. Test Critical Flows

```bash
# 1. User Registration
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test123!","accountType":"individual"}'

# 2. User Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# 3. Webhook (test signature)
# Use Mercado Pago sandbox to send test webhook
```

### 3. Monitor Logs

```bash
# PM2
pm2 logs voxelpromo-api --lines 100

# Docker
docker-compose logs -f api --tail=100

# Check for errors
grep ERROR logs/combined.log | tail -20
```

### 4. Verify Sentry

1. Go to Sentry dashboard
2. Check for initialization event
3. Trigger test error (create endpoint)
4. Verify error appears in Sentry

### 5. Verify MongoDB Backups

1. Login to MongoDB Atlas
2. Go to **Backup** tab
3. Verify latest snapshot timestamp
4. Check next scheduled backup

---

## Monitoring & Maintenance

### Daily Checks

- [ ] Sentry: No critical errors
- [ ] Logs: No unusual patterns
- [ ] Health endpoint: All services OK
- [ ] Payment webhooks: Processing successfully

### Weekly Checks

- [ ] MongoDB backup: Latest snapshot exists
- [ ] Disk space: <80% usage
- [ ] Memory usage: Normal range
- [ ] API response times: <500ms avg

### Monthly Checks

- [ ] Security updates: `npm audit`
- [ ] Dependency updates: `npm outdated`
- [ ] SSL certificate: Valid for 30+ days
- [ ] Test backup restore procedure

---

## Rollback Procedure

### Quick Rollback (PM2)

```bash
# View deployment history
pm2 list

# Revert to previous version
cd /var/www/voxelpromo
git checkout <previous-commit-hash>
npm install
npm run build
pm2 restart voxelpromo-api
```

### Database Rollback

```bash
# Restore from Atlas backup
# Atlas Dashboard → Backup → Snapshots → Restore

# Or restore from manual backup
mongorestore --uri="$MONGODB_URI" ./backup/voxelpromo
```

### Emergency Shutdown

```bash
# Stop application
pm2 stop voxelpromo-api

# Or Docker
docker-compose down

# Display maintenance page (NGINX)
# Create /var/www/html/maintenance.html
sudo systemctl reload nginx
```

---

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs voxelpromo-api --err --lines 50

# Common issues:
# 1. Missing environment variables
# 2. Database connection failed
# 3. Port already in use

# Verify environment
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI ? 'OK' : 'MISSING')"
```

### Database connection errors

```bash
# Test MongoDB connection
mongo "$MONGODB_URI" --eval "db.serverStatus()"

# Check IP whitelist (Atlas)
# Dashboard → Network Access → Add current IP
```

### Webhook signature validation failing

```bash
# Verify MP_WEBHOOK_SECRET is set
echo $MP_WEBHOOK_SECRET

# Check Mercado Pago webhook secret matches
# MP Dashboard → Webhooks → Secret
```

### High memory usage

```bash
# Check process memory
pm2 monit

# Restart if >500MB
pm2 restart voxelpromo-api

# Or configure auto-restart
# ecosystem.config.js: max_memory_restart: '500M'
```

---

## Security Best Practices

### 1. Secrets Management

- ✅ Use environment variables (never commit)
- ✅ Rotate JWT_SECRET every 6 months
- ✅ Use different secrets for dev/staging/prod
- ✅ Store backups of secrets securely (password manager)

### 2. Database Security

- ✅ Use MongoDB Atlas (managed security)
- ✅ Enable IP whitelist
- ✅ Use strong database password (32+ chars)
- ✅ Enable encryption at rest

### 3. API Security

- ✅ HTTPS only (no HTTP)
- ✅ Rate limiting enabled
- ✅ CORS restricted to your domain
- ✅ Helmet.js security headers

### 4. Monitoring

- ✅ Sentry for error tracking
- ✅ Application logs (Winston)
- ✅ Server metrics (CPU, memory, disk)
- ✅ Uptime monitoring (UptimeRobot, Pingdom)

---

## Support & Resources

### Documentation

- [VoxelPromo README](./README.md)
- [MongoDB Backup Guide](./MONGODB_BACKUP.md)
- [API Verification](./docs/API_VERIFICATION_AND_ROADMAP.md)

### External Resources

- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)
- [Mercado Pago Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- [Sentry Node.js](https://docs.sentry.io/platforms/node/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)

---

## 🎉 You're Ready to Launch!

Once all checklist items are complete:

1. **Final smoke test** on staging
2. **Deploy to production** using chosen method
3. **Monitor for 24 hours** (Sentry + logs)
4. **Test critical flows** (registration, payment)
5. **Announce launch** 🚀

**Good luck with your launch!** 🎊
