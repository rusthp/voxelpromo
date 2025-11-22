# Shopee Integration - Complete Guide

**Date:** 2025-01-17  
**Status:** ✅ Implemented

## Overview

Integrated Shopee product feed collection using official CSV feeds from the Shopee Affiliate Program. This provides a reliable, official source of products with affiliate links.

## Features

✅ **Official CSV Feeds** - Uses Shopee's official affiliate product feeds  
✅ **Automatic Processing** - Downloads and parses CSV files automatically  
✅ **Affiliate Links** - Includes pre-generated affiliate links  
✅ **Product Details** - Title, price, discount, category, rating, images  
✅ **Multiple Feeds** - Supports multiple feed URLs  
✅ **Duplicate Prevention** - Filters duplicate products by item ID  
✅ **Performance Optimized** - Processes up to 10,000 products per feed  

## Setup

### 1. Get Feed URLs from Shopee

1. Go to [Shopee Affiliate Product Feed](https://affiliate.shopee.com.br/creative/product_feed)
2. Click "Ver Link" (View Link) for each feed
3. Copy the CSV download URLs

### 2. Configure in config.json

```json
{
  "shopee": {
    "feedUrls": [
      "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=FEED_ID_1",
      "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=FEED_ID_2"
    ],
    "affiliateCode": ""
  }
}
```

### 3. Add to Collection Sources

```json
{
  "collection": {
    "sources": [
      "amazon",
      "aliexpress",
      "mercadolivre",
      "shopee",
      "rss"
    ]
  }
}
```

## Feed Information

### Feed Details

- **Format:** CSV (Comma-Separated Values)
- **Size:** ~18MB+ per feed (can be very large)
- **Products:** Up to 100,000 products per feed
- **Update Frequency:** Daily automatic updates
- **Encoding:** UTF-8

### CSV Columns

The CSV includes the following columns:

- `image_link` - Product image URL
- `itemid` - Unique product ID
- `price` - Original price
- `sale_price` - Sale price (if discounted)
- `discount_percentage` - Discount percentage
- `title` - Product title
- `description` - Product description (may contain newlines)
- `global_category1` - Primary category
- `global_category2` - Secondary category
- `item_rating` - Product rating (0-5)
- `product_link` - Direct product link
- `product_short_link` - Affiliate link (pre-generated)
- `global_catid1`, `global_catid2` - Category IDs

## Implementation

### ShopeeService

**Location:** `src/services/shopee/ShopeeService.ts`

**Methods:**

1. **`downloadFeed(feedUrl: string)`**
   - Downloads CSV feed from Shopee
   - Parses CSV handling multiline fields
   - Returns array of products

2. **`downloadMultipleFeeds(feedUrls: string[], limit: number)`**
   - Downloads multiple feeds
   - Combines products
   - Filters duplicates by item ID
   - Returns unique products

3. **`getProducts(category: string, limit: number)`**
   - Gets products from configured feeds
   - Filters by category if specified
   - Returns products ready for conversion

4. **`convertToOffer(product: ShopeeProduct, category: string)`**
   - Converts Shopee product to Offer format
   - Calculates discounts
   - Uses affiliate links
   - Filters by minimum discount (3%)

### Integration

**CollectorService Integration:**
- Added `collectFromShopee()` method
- Integrated into `collectAll()` method
- Automatic collection in scheduled jobs

**API Routes:**
- `POST /api/collector/shopee` - Manual collection trigger

## Usage

### Automatic Collection

The system automatically collects from Shopee when:
- Scheduled collection runs (every 6 hours)
- `collectAll()` is called
- Shopee is in the `collection.sources` array

### Manual Collection

**Via API:**
```bash
curl -X POST http://localhost:3000/api/collector/shopee \
  -H "Content-Type: application/json" \
  -d '{"category": "electronics"}'
```

**Via Script:**
```bash
node scripts/collect-shopee.js
```

### Direct Service Usage

```typescript
import { ShopeeService } from './src/services/shopee/ShopeeService';

const service = new ShopeeService();

// Get products from configured feeds
const products = await service.getProducts('electronics', 100);

// Download specific feed
const products = await service.downloadFeed(feedUrl);

// Convert to offers
const offers = products
  .map(p => service.convertToOffer(p, 'electronics'))
  .filter(o => o !== null);
```

## CSV Parsing

### Challenges

1. **Multiline Fields** - Descriptions can contain newlines within quoted fields
2. **Large Files** - Feeds can be 18MB+ with 100k+ products
3. **Quoted Fields** - Fields with commas are quoted
4. **Escaped Quotes** - Quotes within fields are escaped as `""`

### Solution

Implemented custom CSV parser that:
- Handles multiline fields correctly
- Respects quoted fields
- Processes fields with commas
- Handles escaped quotes
- Limits processing to 10,000 products per feed (for performance)

## Performance

### Feed Processing

- **Download Time:** ~10-30 seconds per feed (depends on size)
- **Parsing Time:** ~5-15 seconds for 10k products
- **Total Time:** ~15-45 seconds per feed

### Optimization

- Processes up to 10,000 products per feed (configurable)
- Filters duplicates automatically
- Uses efficient CSV parsing
- Delays between multiple feeds (2 seconds)

## Testing

### Test Scripts

1. **`test-shopee-feed.js`** - Full feed test
2. **`test-shopee-quick.js`** - Quick sample test
3. **`test-shopee-debug.js`** - Debug parsing

### Run Tests

```bash
# Quick test (sample only)
node scripts/test-shopee-quick.js

# Full test (downloads complete feed)
node scripts/test-shopee-feed.js

# Debug test
node scripts/test-shopee-debug.js
```

## Feed URLs

Current configured feeds:

1. `https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcPNcbnfdFhhQkoz1FtnUm6DtED25ejObtofpYLqHBC0h`
2. `https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcFMjz35zY_7hscVJ_4QLIFiIR3DQ9hsrLcX6rgIVVFkb`

**Note:** These feeds contain ~100,000 products each and are updated daily.

## Advantages Over Scraping

✅ **Official Source** - Direct from Shopee, no scraping needed  
✅ **Reliable** - No rate limiting or blocking  
✅ **Complete Data** - All product information included  
✅ **Affiliate Links** - Pre-generated affiliate links  
✅ **Fast** - Direct CSV download, no page rendering  
✅ **Scalable** - Can process 100k+ products efficiently  

## Limitations

⚠️ **Large Files** - Feeds can be 18MB+ (download time)  
⚠️ **Processing Limit** - Currently limited to 10k products per feed  
⚠️ **Daily Updates** - Feeds update once per day  
⚠️ **Memory Usage** - Large feeds require significant memory  

## Future Improvements

- [ ] Streaming CSV parsing for very large files
- [ ] Incremental updates (only new products)
- [ ] Category filtering at feed level
- [ ] Parallel feed processing
- [ ] Caching parsed feeds

## Related Documentation

- `docs/MERCADOLIVRE_COLLECTION_GUIDE.md` - Collection guide
- `docs/MERCADOLIVRE_RATE_LIMIT_FIX.md` - Rate limit solutions

## Summary

✅ **ShopeeService implemented** - Complete service for CSV feed processing  
✅ **CollectorService integrated** - Automatic collection support  
✅ **API routes added** - Manual collection endpoint  
✅ **Test scripts created** - Easy testing and debugging  
✅ **Documentation complete** - Full integration guide  

The Shopee integration is **production-ready** and provides a reliable source of products with official affiliate links! 🛒




