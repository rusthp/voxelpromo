# AliExpress Integration - Development Notes

This document consolidates all AliExpress-related development notes, fixes, and improvements.

## Overview

The AliExpress integration uses the official AliExpress Affiliate API to fetch products, convert prices to BRL, extract coupons, and handle pagination.

## Current Status

### ✅ Working Features
- Authentication with App Key and App Secret
- Product fetching via `aliexpress.affiliate.featuredpromo.products.get`
- USD to BRL conversion with configurable exchange rate
- Coupon extraction from API responses
- Pagination support
- Duplicate prevention
- Price validation and NaN handling

### ⚠️ Known Issues
- Some products may show price discrepancies (API vs website)
- Coupon API sometimes returns `InvalidApiPath` (handled gracefully)
- Pagination requires careful handling to avoid duplicates

## API Integration

### Authentication
- Uses App Key and App Secret from config.json or environment variables
- Signature generation using HMAC-SHA256
- API endpoint: `https://api-sg.aliexpress.com/sync`

### Methods Used
1. `aliexpress.affiliate.featuredpromo.products.get` - Featured promo products
2. `aliexpress.affiliate.product.query` - Product search (fallback)
3. `aliexpress.affiliate.coupon.query` - Coupon extraction (may fail)

## Price Conversion

### USD to BRL
- Exchange rate from `config.json` or `ALIEXPRESS_EXCHANGE_RATE` env var
- Default: 5.0
- Conversion: `priceBRL = priceUSD * exchangeRate`
- Rounded to 2 decimal places

### Price Fields Priority
1. `target_sale_price` / `target_original_price` (if in target currency)
2. `promotion_price` / `original_price`
3. `flash_sale_price` / `flash_sale_original_price`
4. `sale_price` / `original_price`

## Coupon Extraction

### Methods (in order of priority)
1. Direct API call to coupon endpoint
2. Extract from `promotion_link` URL parameters
3. Extract from product fields (`coupon_info`, `promotion_info`)

### Handling Errors
- `InvalidApiPath` errors are silently handled
- Falls back to alternative extraction methods
- Logs warnings for debugging

## Pagination

### Implementation
- Uses `page_no` parameter (starts at 1)
- Default page size: 20 products
- Continues until `total_results` is reached or no more products

### Duplicate Prevention
- Checks `productUrl` and `product_id` before saving
- Reactivates inactive offers if re-collected
- Prevents same product from being saved multiple times

## Testing

### Test Coverage
- 15 tests in `src/services/aliexpress/__tests__/AliExpressService.test.ts`
- Tests for: `safeParseFloat`, `getExchangeRate`, `convertToBRL`, `getConfig`

### Test Commands
```bash
npm test -- AliExpressService
npm run test:coverage
```

## Configuration

### config.json
```json
{
  "aliexpress": {
    "appKey": "your-app-key",
    "appSecret": "your-app-secret",
    "trackingId": "your-tracking-id",
    "exchangeRate": "5.0"
  }
}
```

### Environment Variables
- `ALIEXPRESS_APP_KEY`
- `ALIEXPRESS_APP_SECRET`
- `ALIEXPRESS_TRACKING_ID`
- `ALIEXPRESS_EXCHANGE_RATE`

## Troubleshooting

### Products Not Appearing
- Check API authentication (App Key/Secret)
- Verify exchange rate is set
- Check logs for API errors
- Verify pagination is working

### Price Discrepancies
- API prices may differ from website (different regions, promotions)
- Check if product has flash sale or promotion
- Verify exchange rate is current

### Coupon Extraction Failing
- Normal behavior - API endpoint may be unavailable
- System falls back to URL parameter extraction
- Check `promotion_link` field for coupon codes

## Future Improvements

- [ ] Better error handling for API rate limits
- [ ] Cache exchange rate updates
- [ ] Improve coupon extraction accuracy
- [ ] Add support for more product fields
- [ ] Implement retry logic for failed requests

## Related Files

- `src/services/aliexpress/AliExpressService.ts` - Main service
- `src/services/collector/CollectorService.ts` - Collection orchestration
- `src/services/offer/OfferService.ts` - Offer persistence
- `scripts/collect-aliexpress.js` - Collection script
- `scripts/test-aliexpress-simple.js` - Test script

