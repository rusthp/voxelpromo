pnpm# Setup Guide

## Prerequisites

- Node.js 18+ and npm
- MongoDB (local or cloud)
- Accounts for:
  - Amazon Associates (for PA-API)
  - AliExpress Affiliate Program
  - Groq or OpenAI (for AI)
  - Telegram Bot (via BotFather)

## Installation Steps

### 1. Clone and Install Dependencies

**PowerShell (Windows):**
```powershell
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend; npm install; cd ..
```

**Bash/CMD:**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/voxelpromo

# Amazon PA-API
AMAZON_ACCESS_KEY=your_key
AMAZON_SECRET_KEY=your_secret
AMAZON_ASSOCIATE_TAG=your_tag
AMAZON_REGION=BR

# AliExpress
ALIEXPRESS_APP_KEY=your_key
ALIEXPRESS_APP_SECRET=your_secret
ALIEXPRESS_TRACKING_ID=your_id

# AI
GROQ_API_KEY=your_key
AI_PROVIDER=groq

# Telegram
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id

# WhatsApp (optional)
WHATSAPP_ENABLED=false
```

### 3. Set Up MongoDB

#### Local MongoDB
```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### 4. Set Up Amazon PA-API

1. Sign up for [Amazon Associates](https://affiliate-program.amazon.com/)
2. Apply for Product Advertising API access
3. Get your credentials:
   - Access Key
   - Secret Key
   - Associate Tag
4. Add to `.env`

### 5. Set Up AliExpress Affiliate API

1. Register at [AliExpress Affiliate Portal](https://portals.aliexpress.com/)
2. Create an application
3. Get App Key and App Secret
4. Get your Tracking ID
5. Add to `.env`

### 6. Set Up AI Service

#### Option A: Groq (Recommended - Free tier available)
1. Sign up at [Groq Console](https://console.groq.com/)
2. Get API key
3. Set `GROQ_API_KEY` and `AI_PROVIDER=groq` in `.env`

#### Option B: OpenAI
1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Get API key
3. Set `OPENAI_API_KEY` and `AI_PROVIDER=openai` in `.env`

### 7. Set Up Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow instructions
3. Get your bot token
4. Get your chat ID:
   - Send a message to your bot
   - Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   - Find `chat.id` in the response
5. Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

### 8. Set Up WhatsApp (Optional)

1. Set `WHATSAPP_ENABLED=true` in `.env`
2. Set `WHATSAPP_TARGET_NUMBER=5511999999999` (with country code)
3. Run the app and scan QR code with WhatsApp

### 9. Build and Run

#### Development Mode
```bash
# Run backend and frontend together
npm run dev

# Or separately:
npm run dev:backend  # Backend on port 3000
npm run dev:frontend # Frontend on port 3001
```

#### Production Mode
```bash
# Build
npm run build

# Start
npm start
```

### 10. Access the Application

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string format
- Verify network access if using cloud

### API Authentication Errors
- Verify all API keys are correct
- Check API quotas/limits
- Ensure credentials have proper permissions

### Telegram Bot Not Working
- Verify bot token is correct
- Check chat ID format
- Ensure bot is started (send `/start` to bot)

### WhatsApp QR Code Not Appearing
- Check console logs
- Ensure WhatsApp Web.js dependencies are installed
- Try deleting `.wwebjs_auth` folder and restarting

## Next Steps

1. Test collection: Use "Coletar Ofertas Agora" button in dashboard
2. Review collected offers in the dashboard
3. Test AI post generation
4. Test posting to Telegram
5. Configure cron jobs schedule if needed

