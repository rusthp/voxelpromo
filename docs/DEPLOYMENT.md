# Deployment Guide

## Production Deployment

### Prerequisites

- Node.js 18+ installed on server
- MongoDB instance (local or cloud)
- Domain name (optional)
- SSL certificate (for HTTPS)

### Backend Deployment

#### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc)

1. **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install MongoDB (or use cloud)
# Follow MongoDB installation guide
```

2. **Deploy Code**
```bash
# Clone repository
git clone <your-repo-url>
cd voxelpromo

# Install dependencies
npm install

# Build
npm run build

# Configure environment
cp .env.example .env
# Edit .env with production values
```

3. **Run with PM2**
```bash
# Start application
pm2 start dist/server.js --name voxelpromo

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Option 2: Docker

1. **Create Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

2. **Create docker-compose.yml**
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/voxelpromo
    env_file:
      - .env
    depends_on:
      - mongo

  mongo:
    image: mongo:latest
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo-data:
```

3. **Deploy**
```bash
docker-compose up -d
```

#### Option 3: Cloud Platforms

##### Heroku
```bash
# Install Heroku CLI
heroku create voxelpromo

# Set environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set AMAZON_ACCESS_KEY=your_key
# ... set all other variables

# Deploy
git push heroku main
```

##### Vercel / Railway / Render
- Connect GitHub repository
- Set environment variables in dashboard
- Deploy automatically

### Frontend Deployment

#### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
cd frontend
vercel
```

3. **Configure Environment**
- Set `NEXT_PUBLIC_API_URL` in Vercel dashboard

#### Option 2: Traditional Server

1. **Build**
```bash
cd frontend
npm install
npm run build
```

2. **Run**
```bash
npm start
# Or use PM2
pm2 start npm --name voxelpromo-frontend -- start
```

#### Option 3: Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-mongodb-uri
# ... all other variables
```

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret
- [ ] Enable HTTPS
- [ ] Set up firewall rules
- [ ] Use environment variables (never commit secrets)
- [ ] Enable MongoDB authentication
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Set up logging and monitoring
- [ ] Regular backups

### Monitoring

#### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

#### Health Check Endpoint
```bash
curl http://your-domain:3000/health
```

### Backup Strategy

1. **Database Backup**
```bash
# MongoDB backup
mongodump --uri="mongodb://your-uri" --out=/backup/$(date +%Y%m%d)
```

2. **Automated Backups**
```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

### Scaling

#### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Multiple backend instances
- Shared MongoDB instance
- Redis for session storage (if needed)

#### Vertical Scaling
- Increase server resources
- Optimize database queries
- Add caching layer

### Troubleshooting

#### Application won't start
- Check logs: `pm2 logs` or `docker logs`
- Verify environment variables
- Check MongoDB connection
- Verify port availability

#### High memory usage
- Check for memory leaks
- Increase server RAM
- Optimize code
- Use PM2 cluster mode

#### Database connection issues
- Verify MongoDB is running
- Check connection string
- Verify network access
- Check firewall rules

