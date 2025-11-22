# Architecture Documentation

## System Overview

VoxelPromo is a comprehensive offer monitoring and automation system built with Node.js/TypeScript for the backend and Next.js for the frontend.

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Task Scheduling**: node-cron
- **AI Services**: Groq SDK / OpenAI SDK
- **Messaging**: node-telegram-bot-api, whatsapp-web.js

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## Architecture Layers

### 1. API Layer (`src/routes/`)
- RESTful API endpoints
- Request validation
- Error handling

### 2. Service Layer (`src/services/`)
- **AmazonService**: Amazon PA-API integration
- **AliExpressService**: AliExpress Affiliate API integration
- **RSSService**: RSS feed parsing
- **ScraperService**: Light web scraping with Cheerio
- **AIService**: AI post generation (Groq/OpenAI)
- **TelegramService**: Telegram bot integration
- **WhatsAppService**: WhatsApp Web.js integration
- **OfferService**: Business logic for offers
- **CollectorService**: Orchestrates data collection

### 3. Data Layer (`src/models/`)
- MongoDB schemas
- Data validation
- Indexes for performance

### 4. Job Layer (`src/jobs/`)
- Cron job scheduling
- Automated tasks

### 5. Configuration (`src/config/`)
- Database connection
- Environment variables

## Data Flow

### Collection Flow
1. Cron job triggers collection
2. CollectorService orchestrates collection from multiple sources
3. Each service (Amazon, AliExpress, RSS) fetches data
4. Data is converted to Offer format
5. Offers are saved to database via OfferService

### Posting Flow
1. OfferService filters unposted offers
2. AIService generates engaging post content
3. TelegramService/WhatsAppService sends to channels
4. Offer status is updated in database

## API Endpoints

### Offers
- `GET /api/offers` - List offers with filters
- `GET /api/offers/:id` - Get offer by ID
- `POST /api/offers` - Create offer
- `POST /api/offers/:id/generate-post` - Generate AI post
- `POST /api/offers/:id/post` - Post to channels
- `DELETE /api/offers/:id` - Delete offer

### Collector
- `POST /api/collector/amazon` - Collect from Amazon
- `POST /api/collector/aliexpress` - Collect from AliExpress
- `POST /api/collector/rss` - Collect from RSS
- `POST /api/collector/run-all` - Run all collectors

### Statistics
- `GET /api/stats` - Get system statistics

## Scheduled Jobs

1. **Collection Job** (Every 6 hours)
   - Collects offers from all sources
   - Saves to database

2. **Posting Job** (Daily at 9 AM)
   - Finds top 5 unposted offers with >20% discount
   - Posts to Telegram

3. **AI Generation Job** (Every 12 hours)
   - Generates AI posts for unposted offers
   - Prepares content for posting

## Environment Variables

See `.env.example` for all required environment variables.

## Security Considerations

- API keys stored in environment variables
- Rate limiting on external API calls
- Input validation on all endpoints
- Error handling prevents information leakage

## Performance Optimizations

- Database indexes on frequently queried fields
- Caching of AI responses (optional)
- Batch processing for multiple offers
- Delays between API calls to avoid rate limiting

## Scalability

- Stateless API design
- Horizontal scaling ready
- Database connection pooling
- Async/await for non-blocking operations

