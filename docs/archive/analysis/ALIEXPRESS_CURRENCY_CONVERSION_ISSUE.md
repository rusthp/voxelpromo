# AliExpress Currency Conversion Issue Investigation

**Date:** 2025-01-17  
**Status:** 🔍 Under Investigation

## Problem

Despite requesting `target_currency: 'BRL'` in API calls, the API is still returning prices in USD:

```
target_sale_price: "8.67"
target_sale_price_currency: "USD"  ← Should be "BRL"
target_original_price: "17.33"
target_original_price_currency: "USD"  ← Should be "BRL"
```

## Observations from Logs

### Current Behavior

1. **Request Parameters:**
   - We're sending: `target_currency: 'BRL'`
   - We're sending: `target_language: 'PT'`
   - We're sending: `ship_to_country: 'BR'`

2. **API Response:**
   - Returns: `target_sale_price_currency: "USD"` (not BRL)
   - Returns: `target_original_price_currency: "USD"` (not BRL)
   - Prices are in USD format (e.g., 8.67, 17.33)

3. **Result:**
   - Code detects USD and converts manually
   - Uses exchange rate 5.0 from config
   - Final prices: USD * 5.0 = BRL

## Possible Causes

### 1. ⚠️ API Doesn't Support BRL Conversion

**Hypothesis:** The AliExpress Affiliate API may not support `target_currency: 'BRL'` for all methods, or may have limitations.

**Evidence:**
- All products returning USD despite requesting BRL
- No products showing BRL in response

**Investigation Needed:**
- Check AliExpress API documentation for supported currencies
- Verify if `target_currency` parameter works for BRL
- Test with other currencies (EUR, GBP) to see if conversion works

### 2. ⚠️ API Requires Additional Parameters

**Hypothesis:** The API might require additional parameters or configuration to enable currency conversion.

**Possible Requirements:**
- App configuration in AliExpress developer portal
- Specific API permissions
- Regional settings
- Account-level currency preferences

### 3. ⚠️ API Method Limitations

**Hypothesis:** Some API methods might not support currency conversion.

**Methods Being Used:**
- `aliexpress.affiliate.featuredpromo.products.get` - Main method
- `aliexpress.affiliate.hotproduct.query` - Advanced API
- `aliexpress.affiliate.product.query` - Fallback

**Investigation:**
- Check if all methods support `target_currency`
- Verify if Advanced API has better currency support

### 4. ⚠️ Response Format Issue

**Hypothesis:** The API might be converting but not updating the currency field, or using a different field structure.

**Check:**
- Look for other currency fields in response
- Check if prices are actually in BRL but currency field is wrong
- Verify response structure

### 5. ⚠️ Cache or Stale Data

**Hypothesis:** The API might be returning cached responses or the logs might be from before the changes.

**Evidence:**
- Logs show date: `2025-11-18` (future date - might be timezone issue)
- All products consistently returning USD

**Investigation:**
- Verify current date/time
- Check if API has caching
- Test with fresh API calls

## Investigation Steps

### Step 1: Verify Request Parameters ✅

**Action:** Added detailed logging to see what's being sent to API

**Code Added:**
```typescript
logger.info(`Making AliExpress API request: ${method}`, {
  // ... existing fields ...
  targetCurrency: params.target_currency || 'not specified',
  targetLanguage: params.target_language || 'not specified',
  shipToCountry: params.ship_to_country || 'not specified'
});
```

**Next:** Check logs to verify parameters are being sent correctly

### Step 2: Test API Documentation

**Action:** Review AliExpress API documentation for:
- Supported currencies for `target_currency` parameter
- Requirements for currency conversion
- Limitations or restrictions

### Step 3: Test Different Currencies

**Action:** Test with other currencies to see if conversion works:
- EUR (Euro)
- GBP (British Pound)
- CNY (Chinese Yuan)

**Purpose:** Determine if issue is BRL-specific or affects all currency conversions

### Step 4: Check API Response Structure

**Action:** Log full API response structure to see:
- All currency-related fields
- If prices are actually converted but currency field is wrong
- Alternative price fields that might be in BRL

### Step 5: Contact AliExpress Support

**Action:** If API documentation doesn't clarify:
- Contact AliExpress Developer Support
- Ask about `target_currency: 'BRL'` support
- Request clarification on currency conversion

## Current Workaround

**Status:** ✅ Working but not ideal

The code currently:
1. Requests BRL from API
2. Receives USD (API doesn't convert) - **CONFIRMED: API ignores `target_currency: 'BRL'`**
3. Detects USD in response
4. Converts manually using exchange rate (5.0)
5. Logs conversion for debugging

**Evidence from Logs:**
- ✅ We send: `targetCurrency: "BRL"`
- ❌ API returns: `target_sale_price_currency: "USD"`
- ✅ Code detects USD and converts manually

**Issues:**
- Uses fixed exchange rate (5.0) instead of real-time
- Manual conversion may have rounding errors
- Prices may not match website exactly
- Exchange rate may be outdated (real rate ~4.95-5.05)

## Recommendations

### Immediate Actions

1. **Verify Request Parameters:**
   - ✅ Added logging (done)
   - Check next API call logs to confirm parameters

2. **Check API Documentation:**
   - Review official AliExpress API docs
   - Look for currency conversion limitations

3. **Test Alternative Approach:**
   - Try requesting without `target_currency` and convert manually
   - Or use real-time exchange rate API

### Long-term Solutions

1. **Real-time Exchange Rate:**
   - Integrate exchange rate API (e.g., ExchangeRate-API, Fixer.io)
   - Update exchange rate automatically
   - More accurate conversions

2. **API Support Contact:**
   - Contact AliExpress about BRL support
   - Request feature if not available
   - Get clarification on limitations

3. **Alternative Price Sources:**
   - Consider scraping website prices as fallback
   - Use multiple price sources for validation
   - Compare API vs website prices

## Related Files

- `src/services/aliexpress/AliExpressService.ts` - Main implementation
- `src/services/collector/CollectorService.ts` - API calls
- `docs/ALIEXPRESS_NATIVE_CURRENCY_CONVERSION.md` - Native conversion docs
- `config.json` - Exchange rate configuration

## Next Steps

1. [x] Check next API call logs to verify parameters are sent ✅ **CONFIRMED: We send BRL**
2. [x] Review API response - **CONFIRMED: API returns USD despite requesting BRL**
3. [ ] Test with other currencies (EUR, GBP) to verify if conversion works for other currencies
4. [ ] Update exchange rate in config.json to current rate (~4.95-5.05)
5. [ ] **Implement real-time exchange rate API** (recommended solution)
6. [ ] Contact AliExpress support about BRL support

## Conclusion

**Status:** ✅ **CONFIRMED** - API does not convert to BRL natively

**Evidence:**
- Logs show we send `targetCurrency: "BRL"`
- API consistently returns `target_sale_price_currency: "USD"`
- All products show USD in response

**Solution:** Manual conversion is required. See `docs/ALIEXPRESS_CURRENCY_CONVERSION_CONCLUSION.md` for recommended solutions.

---

**Last Updated:** 2025-01-17

