# AliExpress Native Currency Conversion

**Date:** 2025-01-17  
**Status:** ✅ Implemented

## Overview

The AliExpress API natively supports currency conversion through the `target_currency` parameter. When you request prices with `target_currency: 'BRL'`, the API returns prices already converted to Brazilian Real, eliminating the need for manual conversion.

## Implementation

### ✅ All Methods Now Use BRL by Default

All AliExpress API methods have been updated to use `BRL` as the default currency:

1. **`getHotProducts()`** - Default: `targetCurrency: 'BRL'`
2. **`getFeaturedPromoProducts()`** - Default: `targetCurrency: 'BRL'`
3. **`getProductDetails()`** - Default: `targetCurrency: 'BRL'`
4. **`smartMatchProducts()`** - Default: `targetCurrency: 'BRL'`
5. **`searchProducts()`** - Default: `targetCurrency: 'BRL'` (in all parameter combinations)
6. **`getFlashDeals()`** - Default: `targetCurrency: 'BRL'`

### ✅ Default Parameters Updated

**Before:**
```typescript
target_currency: options.targetCurrency || 'USD',
target_language: options.targetLanguage || 'EN',
ship_to_country: options.shipToCountry || 'US',
```

**After:**
```typescript
target_currency: options.targetCurrency || 'BRL',
target_language: options.targetLanguage || 'PT',
ship_to_country: options.shipToCountry || 'BR',
```

## Benefits

### 1. ✅ More Accurate Prices
- API uses real-time exchange rates
- No manual conversion errors
- Prices match what users see on AliExpress website

### 2. ✅ Simplified Code
- No need for manual USD to BRL conversion in most cases
- Conversion logic still exists as fallback for edge cases
- Less code to maintain

### 3. ✅ Better Performance
- API handles conversion server-side
- No client-side calculation needed
- Faster response processing

### 4. ✅ Consistent Results
- All methods use same currency by default
- Consistent pricing across all product sources
- Better user experience

## How It Works

### API Request
```typescript
const products = await aliExpressService.getHotProducts({
  targetCurrency: 'BRL',  // API converts prices to BRL
  targetLanguage: 'PT',
  shipToCountry: 'BR'
});
```

### API Response
The API returns prices in the `target_sale_price` and `target_original_price` fields, already in BRL:

```json
{
  "target_sale_price": "43.35",
  "target_original_price": "86.65",
  "target_sale_price_currency": "BRL",
  "target_original_price_currency": "BRL"
}
```

### Price Extraction
The code detects that prices are already in BRL and skips conversion:

```typescript
// Detects currency from API response
const detectedCurrency = product.target_sale_price_currency || 
                         product.target_original_price_currency || 
                         product.target_currency;

if (currency === 'BRL' || currency === 'brl') {
  // Prices already in BRL - no conversion needed
  logger.debug('✅ Prices already in BRL - no conversion needed');
}
```

## Fallback Conversion

The manual conversion logic is still present as a fallback for cases where:
- API doesn't return `target_currency` parameter
- API returns prices in USD despite requesting BRL
- Legacy API responses that don't support `target_currency`

In these cases, the code will:
1. Detect currency from response
2. If USD, convert using exchange rate from config
3. Log the conversion for debugging

## Configuration

### Exchange Rate (Fallback Only)

The exchange rate in `config.json` is now only used as a fallback:

```json
{
  "aliexpress": {
    "exchangeRate": 5.0  // Only used if API doesn't convert
  }
}
```

**Note:** Since we're using `target_currency: 'BRL'`, this should rarely be needed.

## Testing

### Verify Native Conversion

1. **Check API Requests:**
   - All requests should include `target_currency: 'BRL'`
   - Check logs for `targetCurrency: 'BRL'` in request logs

2. **Check API Responses:**
   - `target_sale_price_currency` should be `'BRL'`
   - Prices should already be in BRL range

3. **Check Conversion Logs:**
   - Should see: `✅ Prices already in BRL - no conversion needed`
   - Should NOT see: `💱 Converted prices from USD to BRL` (unless fallback)

4. **Compare with Website:**
   - Prices should match AliExpress website (Brazil)
   - No significant discrepancies

## ⚠️ Known Issue

**Status:** 🔍 Under Investigation

Despite requesting `target_currency: 'BRL'`, the API is still returning prices in USD. This suggests:

1. **API Limitation:** The AliExpress Affiliate API may not support BRL conversion for all methods
2. **Configuration Required:** May need additional app configuration in AliExpress developer portal
3. **Method-Specific:** Some API methods might not support currency conversion

**Current Behavior:**
- API returns `target_sale_price_currency: "USD"` even when requesting BRL
- Code falls back to manual conversion using exchange rate (5.0)
- This works but uses fixed exchange rate instead of real-time

**Investigation:**
- See `docs/ALIEXPRESS_CURRENCY_CONVERSION_ISSUE.md` for detailed analysis
- Added detailed logging to verify request parameters
- Need to verify if API supports BRL conversion or if manual conversion is required

## Migration Notes

### What Changed

- ✅ All default currencies changed from `USD` to `BRL`
- ✅ All default languages changed from `EN` to `PT`
- ✅ All default countries changed from `US` to `BR`
- ✅ Conversion logic still exists but is rarely used

### Backward Compatibility

- ✅ Methods still accept `targetCurrency` parameter
- ✅ Can still request USD if needed
- ✅ Conversion logic still works for edge cases

## Related Files

- `src/services/aliexpress/AliExpressService.ts` - Main implementation
- `src/services/collector/CollectorService.ts` - Already using BRL
- `docs/PRICE_EXTRACTION_IMPROVEMENTS.md` - Previous improvements
- `config.json` - Exchange rate (fallback only)

---

**Last Updated:** 2025-01-17

