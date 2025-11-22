# Features Documentation

## Core Features

### 1. Multi-Source Offer Collection

The system collects offers from multiple sources:

#### Amazon PA-API
- Official Amazon Product Advertising API integration
- Search products by keywords
- Get product details by ASIN
- Automatic affiliate link generation
- Price tracking and discount calculation

#### AliExpress Affiliate API
- Official AliExpress Affiliate Program integration
- Hot products collection
- Flash deals (lightning deals)
- Coupon extraction
- Automatic affiliate link generation

#### RSS Feeds
- Parse RSS feeds from deal sites
- Support for multiple feed sources
- Automatic price extraction from content
- Category detection

#### Web Scraping (Light)
- Lightweight scraping with Cheerio
- Configurable selectors
- Rate limiting to avoid blocking
- Support for custom sources

### 2. Intelligent Filtering

- Filter by discount percentage
- Filter by price range
- Filter by rating
- Filter by category
- Filter by source
- Exclude already posted offers
- Sort by discount, price, or date

### 3. AI-Powered Post Generation

- Generate engaging social media posts
- Multiple tone options:
  - **Casual**: Friendly and relaxed
  - **Professional**: Formal and informative
  - **Viral**: Optimized for engagement
  - **Urgent**: Creates sense of urgency
- Automatic emoji insertion
- Hashtag generation
- Customizable length

### 4. Multi-Channel Posting

#### Telegram
- Bot integration
- Image support
- HTML formatting
- Automatic posting

#### WhatsApp
- WhatsApp Web.js integration
- QR code authentication
- Image support
- Automatic posting

### 5. Automated Scheduling

Cron jobs for:
- **Collection**: Every 6 hours
- **Posting**: Daily at 9 AM
- **AI Generation**: Every 12 hours

### 6. Dashboard

- Real-time statistics
- Offer management
- Manual collection trigger
- Post generation and publishing
- Filter and search
- Responsive design

### 7. Data Management

- MongoDB storage
- Duplicate detection
- Status tracking (posted/not posted)
- Timestamps and history
- Soft delete (deactivation)

## Advanced Features

### Affiliate Link Management
- Automatic affiliate link generation
- Source-specific link formatting
- Tracking parameter injection

### Category System
- Automatic category detection
- Manual category assignment
- Category-based filtering

### Rating System
- Product rating tracking
- Review count tracking
- Rating-based filtering

### Image Handling
- Image URL storage
- Image display in dashboard
- Image support in posts

## Future Enhancements

- [ ] Price history tracking
- [ ] Price drop alerts
- [ ] Email notifications
- [ ] Instagram integration
- [ ] Facebook integration
- [ ] Advanced analytics
- [ ] User authentication
- [ ] Multi-user support
- [ ] Custom post templates
- [ ] A/B testing for posts
- [ ] Performance metrics

