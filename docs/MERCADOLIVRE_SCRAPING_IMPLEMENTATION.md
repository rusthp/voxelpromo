# Mercado Livre - Scraping Implementation

**Date:** 2025-01-17  
**Status:** ✅ Implemented

## Overview

Implemented web scraping as a fallback method for collecting products from Mercado Livre when the API is rate-limited or unavailable. This uses the Affiliates Hub page as an alternative data source.

## Problem

The Mercado Livre API was returning **403 Forbidden** errors due to rate limiting. The user identified that the Affiliates Hub page (`https://www.mercadolivre.com.br/afiliados/hub`) contains product listings that can be scraped as an alternative.

## Solution

### 1. ✅ Scraping Method in MercadoLivreService

**Location:** `src/services/mercadolivre/MercadoLivreService.ts`

**New Methods:**

#### `scrapeAffiliatesHub()`
- Scrapes products from the Mercado Livre Affiliates Hub page
- Uses multiple CSS selectors to find products (handles page structure changes)
- Extracts: title, price, original price, URL, image, condition, shipping
- Includes retry logic and throttling

#### `collectViaScraping()`
- High-level method to collect products via scraping
- Tries multiple URLs (hub, offers pages, category pages)
- Handles delays between requests
- Returns products in the same format as API methods

### 2. ✅ Integration with CollectorService

**Location:** `src/services/collector/CollectorService.ts`

**Changes:**
- Added scraping as fallback when API methods fail
- Executes after API attempts but before RSS fallback
- Seamlessly integrates with existing collection flow

### 3. ✅ Test Script

**Location:** `scripts/test-mercadolivre-scraping.js`

**Features:**
- Tests scraping of Affiliates Hub page
- Shows found products
- Analyzes page structure if no products found
- Helps debug selector issues

## Implementation Details

### Scraping Strategy

1. **Multiple Selectors:** Tries various CSS selectors to find products:
   - `article[data-testid="product-card"]`
   - `.ui-search-result`
   - `[data-testid="product"]`
   - `a[href*="/produto/"]`
   - `a[href*="/MLB-"]`

2. **Data Extraction:**
   - Title: From `h2`, `.ui-search-item__title`, or link title
   - Price: From `.price-tag`, `.ui-search-price`, or price-related classes
   - Original Price: From `.price-tag-original` or similar
   - URL: From product links
   - Image: From `img` tags (src, data-src, data-lazy)
   - Condition: From condition text or classes
   - Free Shipping: From shipping-related classes or text

3. **Error Handling:**
   - Retry with exponential backoff
   - Throttling between requests
   - Graceful degradation if selectors fail

### Integration Flow

```
1. Try API methods (searchProducts, getHotDeals)
   ↓ (if fails)
2. Try Scraping (scrapeAffiliatesHub, collectViaScraping)
   ↓ (if fails)
3. Try RSS feeds
   ↓ (if fails)
4. Return empty array
```

## Usage

### Automatic (Recommended)

The scraping is automatically used as fallback:

```typescript
const collector = new CollectorService();
const count = await collector.collectFromMercadoLivre('electronics');
// Will try API first, then scraping, then RSS
```

### Manual Testing

```bash
# Test scraping directly
node scripts/test-mercadolivre-scraping.js
```

### Direct Usage

```typescript
const service = new MercadoLivreService();

// Scrape Affiliates Hub
const products = await service.scrapeAffiliatesHub(
  'https://www.mercadolivre.com.br/afiliados/hub',
  50
);

// Or use high-level method
const allProducts = await service.collectViaScraping('electronics', 50);
```

## Advantages

✅ **Works when API is blocked** - Scraping bypasses API rate limits  
✅ **No authentication needed** - Public pages don't require tokens  
✅ **Multiple fallback URLs** - Tries hub, offers, and category pages  
✅ **Same data format** - Products converted to same format as API  
✅ **Automatic integration** - Works seamlessly with existing collection  

## Limitations

⚠️ **Page structure changes** - Selectors may break if Mercado Livre changes HTML  
⚠️ **JavaScript content** - Some content may load via JS (would need Playwright)  
⚠️ **Rate limiting** - Still subject to web scraping rate limits  
⚠️ **Less reliable** - Scraping is less stable than API  

## Future Improvements

- [ ] Use Playwright for JavaScript-rendered content
- [ ] Add more URL sources (category pages, search results)
- [ ] Implement selector auto-discovery
- [ ] Add caching for scraped pages
- [ ] Monitor selector effectiveness

## Testing

### Test Scraping

```bash
node scripts/test-mercadolivre-scraping.js
```

### Test Full Collection (with scraping fallback)

```bash
node scripts/collect-mercadolivre.js
```

## Related Documentation

- `docs/MERCADOLIVRE_RATE_LIMIT_FIX.md` - API rate limit protection
- `docs/MERCADOLIVRE_COLLECTION_GUIDE.md` - Collection guide
- `docs/MERCADOLIVRE_AUTONOMOUS_SYSTEM.md` - System status

## Summary

✅ **Scraping implemented** - Alternative method when API fails  
✅ **Automatic fallback** - Integrated with collection flow  
✅ **Multiple sources** - Tries hub, offers, and category pages  
✅ **Test script** - Easy debugging and testing  

The system now has **three methods** to collect products:
1. **API** (primary) - Fast, reliable, but rate-limited
2. **Scraping** (fallback) - Works when API is blocked
3. **RSS** (final fallback) - Last resort

This ensures maximum reliability and product collection! 🚀

