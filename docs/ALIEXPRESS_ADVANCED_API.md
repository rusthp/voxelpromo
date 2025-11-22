# AliExpress Advanced API Integration

## Overview

This document describes the integration with AliExpress Advanced API, which provides enhanced features for product discovery, smart matching, and detailed product information.

## API Status

✅ **Advanced API Approved** - The following APIs are now available:

1. **aliexpress.affiliate.hotproduct.query** - Query hot/viral products
2. **aliexpress.affiliate.featuredpromo.products.get** - Get featured promotional products (already implemented)
3. **aliexpress.affiliate.productdetail.get** - Get detailed product information
4. **aliexpress.affiliate.product.smartmatch** - Smart product matching

## Available Methods

### 1. getHotProducts (Advanced API)

**API:** `aliexpress.affiliate.hotproduct.query`

**Description:** Retrieves hot/viral products with advanced filtering options.

**Parameters:**
- `categoryIds` (string | string[]): List of category IDs (comma-separated or array)
- `keywords` (string): Filter products by keywords
- `minSalePrice` (number): Minimum price in cents
- `maxSalePrice` (number): Maximum price in cents
- `pageNo` (number): Page number (default: 1)
- `pageSize` (number): Records per page (1-50, default: 20)
- `sort` ('SALE_PRICE_ASC' | 'SALE_PRICE_DESC' | 'LAST_VOLUME_ASC' | 'LAST_VOLUME_DESC'): Sort order
- `targetCurrency` (string): Target currency (USD, BRL, etc.)
- `targetLanguage` (string): Target language (EN, PT, etc.)
- `shipToCountry` (string): Ship to country (US, BR, etc.)
- `platformProductType` ('ALL' | 'PLAZA' | 'TMALL'): Product platform type
- `deliveryDays` ('3' | '5' | '7' | '10'): Estimated delivery days
- `promotionName` (string): Promotion name
- `fields` (string): Response fields (e.g., "commission_rate,sale_price")

**Example:**
```typescript
const hotProducts = await aliExpressService.getHotProducts({
  keywords: 'electronics',
  pageSize: 20,
  targetCurrency: 'BRL',
  targetLanguage: 'PT',
  shipToCountry: 'BR',
  sort: 'LAST_VOLUME_DESC',
  platformProductType: 'ALL'
});
```

### 2. getProductDetails (Advanced API)

**API:** `aliexpress.affiliate.productdetail.get`

**Description:** Retrieves detailed information for specific products.

**Parameters:**
- `productIds` (string | string[]): Product IDs (comma-separated or array)
- `options.fields` (string): Response fields (e.g., "commission_rate,sale_price")
- `options.targetCurrency` (string): Target currency (USD, BRL, etc.)
- `options.targetLanguage` (string): Target language (EN, PT, etc.)
- `options.country` (string): Ship to country
- `options.trackingId` (string): Your tracking ID

**Example:**
```typescript
const productDetails = await aliExpressService.getProductDetails(
  ['1005005847356161', '1005009220849685'],
  {
    targetCurrency: 'BRL',
    targetLanguage: 'PT',
    country: 'BR'
  }
);
```

### 3. smartMatchProducts (Advanced API)

**API:** `aliexpress.affiliate.product.smartmatch`

**Description:** Smart product matching based on keywords or reference product.

**Parameters:**
- `productId` (string): Reference product ID
- `keywords` (string): Search keywords
- `pageNo` (number): Page number (default: 1)
- `targetCurrency` (string): Target currency (USD, BRL, etc.)
- `targetLanguage` (string): Target language (EN, PT, etc.)
- `country` (string): Ship to country
- `site` (string): Site identifier
- `user` (string): User identifier
- `app` (string): App identifier
- `device` (string): Device type
- `deviceId` (string): Device ID
- `fields` (string): Response fields
- `trackingId` (string): Your tracking ID

**Example:**
```typescript
const matchedProducts = await aliExpressService.smartMatchProducts({
  keywords: 'electronics',
  pageNo: 1,
  targetCurrency: 'BRL',
  targetLanguage: 'PT',
  country: 'BR'
});
```

### 4. getFeaturedPromoProducts (Already Implemented)

**API:** `aliexpress.affiliate.featuredpromo.products.get`

**Description:** Get featured promotional products with pagination support.

**Status:** ✅ Already implemented and working

## Integration in CollectorService

The `CollectorService` now uses the Advanced APIs in the following order:

1. **Hot Products** (Advanced API) - `getHotProducts()` with optimized parameters
2. **Smart Match Products** (Advanced API) - `smartMatchProducts()` for intelligent matching
3. **Flash Deals** - `getFlashDeals()` (fallback)
4. **Featured Promo Products** - `getFeaturedPromoProducts()` with pagination

## Benefits of Advanced API

### 1. Better Product Discovery
- **Hot Products API**: Find trending/viral products
- **Smart Match API**: Intelligent product recommendations based on keywords or reference products

### 2. Enhanced Filtering
- Filter by category, price range, delivery days
- Sort by price, volume, discount, rating
- Filter by platform type (ALL, PLAZA, TMALL)

### 3. Detailed Product Information
- Get comprehensive product details for specific products
- Better price accuracy with direct product queries

### 4. Improved Performance
- More targeted queries reduce unnecessary data
- Better pagination support
- Optimized response structures

## Response Structures

The Advanced APIs may return data in different structures. The service handles multiple response formats:

1. `response.aliexpress_affiliate_*_response.resp_result.result.products`
2. `response.aliexpress_affiliate_*_response.aeop_ae_product_display_dto_list.aeop_ae_product_display_dto`
3. `response.aliexpress_affiliate_*_response.products`
4. Direct product arrays

## Error Handling

All Advanced API methods include:
- **Fallback mechanisms**: If Advanced API is not available, falls back to standard methods
- **Retry logic**: Automatic retries with exponential backoff
- **Error logging**: Detailed error messages for debugging
- **Expected error suppression**: Methods like `product.coupon.query` that are known to be unavailable log at debug level instead of warning level to reduce log noise

## Configuration

No additional configuration is required. The Advanced APIs use the same credentials as the standard API:
- `appKey` - From `config.json` or `ALIEXPRESS_APP_KEY`
- `appSecret` - From `config.json` or `ALIEXPRESS_APP_SECRET`
- `trackingId` - From `config.json` or `ALIEXPRESS_TRACKING_ID`

## Testing

To test the Advanced APIs:

1. **Hot Products:**
   ```typescript
   const products = await aliExpressService.getHotProducts({
     keywords: 'electronics',
     targetCurrency: 'BRL',
     targetLanguage: 'PT'
   });
   ```

2. **Product Details:**
   ```typescript
   const details = await aliExpressService.getProductDetails(['1005005847356161']);
   ```

3. **Smart Match:**
   ```typescript
   const matched = await aliExpressService.smartMatchProducts({
     keywords: 'smartphone',
     targetCurrency: 'BRL'
   });
   ```

## Notes

- All Advanced APIs support pagination
- Prices can be requested directly in BRL (no conversion needed)
- The APIs support multiple languages (PT, EN, etc.)
- Delivery days filtering helps find products with faster shipping
- Smart Match API is useful for finding similar or related products

## References

- [AliExpress Open Service API Documentation](https://openservice.aliexpress.com/doc/api.htm)
- [Advanced API Features](https://developers.aliexpress.com/en/doc.htm?docId=45801&docType=2)

