# Price Extraction and Conversion Analysis

**Date:** 2025-01-17  
**Status:** 🔍 Under Investigation

## Problem Statement

User reports that prices extracted from AliExpress API differ from prices shown on the website. This document analyzes the price extraction and conversion logic to identify potential issues.

---

## Current Price Extraction Logic

### Priority Order (Current Implementation)

1. **`promotion_price`** (highest priority - flash sale/promotional)
2. **`flash_sale_price`** (flash sale)
3. **`target_sale_price`** (newest API format - already in target currency)
4. **`app_sale_price`** (app-specific price)
5. **`sale_price`** (standard price)
6. **`product_price.value`** (old format)

### Issues Identified

#### 1. ⚠️ Currency Detection Problem

**Current Logic:**
```typescript
currency = product.target_sale_price_currency || product.target_original_price_currency || product.target_currency || 'USD';
```

**Problem:**
- If `target_sale_price` is present but currency fields are missing, defaults to 'USD'
- May incorrectly assume USD when price is already in BRL
- No validation that currency matches the actual price format

**Example from logs:**
```
target_sale_price: "8.67"
target_sale_price_currency: "USD"
target_original_price: "17.33"
```

But the API might return prices already converted to BRL in some cases.

#### 2. ⚠️ Double Conversion Risk

**Current Logic:**
```typescript
if (currency === 'USD' || currency === 'usd') {
  currentPrice = this.convertToBRL(currentPrice);
  originalPrice = this.convertToBRL(originalPrice);
}
```

**Problem:**
- If `target_sale_price` is already in BRL but currency field says 'USD', will convert twice
- No check if price is already in target currency (BRL)
- API may return prices in target currency when `target_currency` parameter is set

#### 3. ⚠️ Fixed Exchange Rate

**Current Implementation:**
```typescript
private getExchangeRate(): number {
  return parseFloat(process.env.ALIEXPRESS_EXCHANGE_RATE || '5.0');
}
```

**Problem:**
- Uses fixed exchange rate (default 5.0)
- Real USD/BRL rate varies (currently ~4.8-5.2)
- No automatic update mechanism
- May cause price discrepancies

**Current Real Exchange Rate:** ~4.95-5.05 (as of 2025-01-17)

#### 4. ⚠️ Price Field Priority Issue

**Current Priority:**
1. `promotion_price` (checked first)
2. `flash_sale_price`
3. `target_sale_price` (should be checked first if available)

**Problem:**
- `target_sale_price` is the most accurate (already in target currency)
- But it's checked AFTER promotion/flash prices
- May use promotional price in wrong currency instead of accurate target price

#### 5. ⚠️ Discount Calculation After Conversion

**Current Logic:**
```typescript
// Convert first
if (currency === 'USD') {
  currentPrice = this.convertToBRL(currentPrice);
  originalPrice = this.convertToBRL(originalPrice);
}

// Then calculate discount
let discount = originalPrice - currentPrice;
let discountPercentage = (discount / originalPrice) * 100;

// But then may override with API discount
if (product.discount) {
  discountPercentage = discountValue;
  discount = (originalPrice * discountPercentage) / 100;
  // Recalculate currentPrice based on discount
  currentPrice = originalPrice - discount;
}
```

**Problem:**
- Discount from API may be calculated on USD prices
- Recalculating `currentPrice` from discount may not match actual sale price
- May cause price discrepancies

#### 6. ⚠️ Price Units (Cents vs Dollars)

**Potential Issue:**
- Some APIs return prices in cents (multiply by 100)
- AliExpress API may return in dollars or cents depending on field
- No normalization check

---

## Analysis of Log Data

From the terminal logs provided:

### Example 1:
```
target_sale_price: "8.67"
target_original_price: "17.33"
target_sale_price_currency: "USD"
target_original_price_currency: "USD"
```

**Current Processing:**
1. Extracts: `currentPrice = 8.67 USD`, `originalPrice = 17.33 USD`
2. Converts: `currentPrice = 8.67 * 5.0 = 43.35 BRL`
3. Converts: `originalPrice = 17.33 * 5.0 = 86.65 BRL`
4. Calculates discount: `discount = 86.65 - 43.35 = 43.30 BRL`
5. Discount %: `(43.30 / 86.65) * 100 = 50%`

**Potential Issues:**
- Exchange rate 5.0 may be outdated (real rate ~4.95-5.05)
- If API already returned BRL prices, would double-convert
- Website may show different price due to:
  - Different exchange rate
  - Additional fees/taxes
  - Shipping costs included
  - Regional pricing differences

### Example 2:
```
target_sale_price: "10.77"
target_original_price: "29.34"
discount: "63%"
```

**Current Processing:**
1. Extracts prices
2. Converts to BRL
3. But then may recalculate based on discount % from API

**Problem:**
- If discount % is from USD prices, recalculating on BRL prices may be incorrect
- `currentPrice` may be adjusted incorrectly

---

## Recommendations

### 1. ✅ Improve Currency Detection

**Add validation:**
```typescript
// Check if target_currency parameter was used in API call
// If target_currency was 'BRL', prices are likely already in BRL
const apiTargetCurrency = product.target_currency || 
                         product.target_sale_price_currency ||
                         product.target_original_price_currency;

// If API was called with target_currency='BRL', don't convert
if (apiTargetCurrency === 'BRL' || apiTargetCurrency === 'brl') {
  currency = 'BRL';
  // Don't convert
} else if (currency === 'USD') {
  // Convert
}
```

### 2. ✅ Update Exchange Rate

**Options:**
- Use real-time exchange rate API
- Update exchange rate in config.json regularly
- Add exchange rate validation/update mechanism

### 3. ✅ Fix Price Priority

**Reorder priority:**
1. `target_sale_price` (if available - most accurate)
2. `promotion_price` / `flash_sale_price`
3. Other fields

### 4. ✅ Add Price Validation

**Add checks:**
- Verify price values are reasonable
- Check if price seems too high/low
- Validate currency matches price format
- Log warnings for suspicious values

### 5. ✅ Improve Discount Calculation

**Fix logic:**
- Use API discount % only if it matches calculated discount
- Don't recalculate currentPrice from discount if it differs significantly
- Log when discount recalculation happens

### 6. ✅ Add Price Comparison Logging

**Add detailed logging:**
- Log all price fields received
- Log conversion steps
- Log final calculated prices
- Compare with API discount % if available

---

## Testing Recommendations

### Test Cases to Verify:

1. **Product with target_sale_price in USD:**
   - Verify correct conversion
   - Verify exchange rate used

2. **Product with target_sale_price in BRL:**
   - Verify NO conversion
   - Verify prices match API

3. **Product with promotion_price:**
   - Verify currency detection
   - Verify correct price used

4. **Product with discount % from API:**
   - Verify discount calculation
   - Verify currentPrice matches or is close to API price

5. **Compare with website:**
   - Manually check 5-10 products
   - Compare API prices vs website prices
   - Identify patterns in discrepancies

---

## Improvements Implemented (2025-01-17)

### ✅ 1. Improved Currency Detection

**Before:**
- Simple currency field check
- Could default to USD incorrectly

**After:**
- Better priority: `target_sale_price_currency` > `target_original_price_currency` > `target_currency`
- Explicit detection and logging of detected currency
- Better handling when API returns prices in target currency

### ✅ 2. Enhanced Conversion Logic

**Before:**
- Could convert prices that were already in BRL
- No validation of exchange rate

**After:**
- Explicit check: only convert if currency is USD AND not BRL
- Exchange rate validation (must be between 3.0 and 7.0)
- Logs when prices are already in BRL (no conversion needed)

### ✅ 3. Improved Discount Calculation

**Before:**
- Always used API discount if available
- Could recalculate prices incorrectly

**After:**
- Validates API discount against calculated discount
- Only uses API discount if difference is ≤ 5%
- Only recalculates currentPrice if difference > 10 cents
- Logs warnings when discounts don't match

### ✅ 4. Better Logging

**Added:**
- Detailed currency detection logging
- Exchange rate validation warnings
- Discount validation warnings
- Price adjustment logging with differences

## Next Steps

1. [x] Add detailed price extraction logging ✅
2. [x] Improve currency detection logic ✅
3. [ ] Update exchange rate mechanism (consider real-time API)
4. [x] Fix price priority order ✅
5. [x] Add price validation ✅
6. [ ] Test with real products and compare with website
7. [x] Document findings and create fix plan ✅

---

## Related Files

- `src/services/aliexpress/AliExpressService.ts` - Main implementation
- `docs/ALIEXPRESS_DEVELOPMENT_NOTES.md` - Development notes
- `config.json` - Exchange rate configuration

---

**Last Updated:** 2025-01-17

