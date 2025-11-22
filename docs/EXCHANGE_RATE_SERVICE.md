# Exchange Rate Service

**Date:** 2025-01-17  
**Status:** ✅ Implemented

## Overview

The Exchange Rate Service provides real-time USD to BRL exchange rate fetching from free APIs. It automatically caches rates for 1 hour to minimize API calls and has multiple fallback mechanisms to ensure reliability.

## Features

### ✅ Real-Time Exchange Rate

- Fetches current USD/BRL exchange rate from free APIs
- Tries multiple APIs as fallback (ExchangeRate-API, Fixer.io, CurrencyAPI)
- Automatic rate updates

### ✅ Smart Caching

- Caches exchange rate for 1 hour
- Reduces API calls significantly
- Cache stored in `scripts/.exchange-rate-cache.json`

### ✅ Multiple Fallbacks

1. **Real-time API** (primary)
2. **Cached rate** (if recent, < 1 hour old)
3. **Config.json** (`aliexpress.exchangeRate`)
4. **Environment variable** (`ALIEXPRESS_EXCHANGE_RATE`)
5. **Default** (5.0)

## Implementation

### Service Location

```
src/services/exchangerate/
├── ExchangeRateService.ts
└── index.ts
```

### Usage

```typescript
import { ExchangeRateService } from './services/exchangerate';

const exchangeRateService = new ExchangeRateService();

// Get current rate (with all fallbacks)
const rate = await exchangeRateService.getUSDtoBRLRate();

// Force refresh (bypass cache)
const freshRate = await exchangeRateService.refreshRate();
```

### Integration with AliExpressService

The `AliExpressService` automatically uses the `ExchangeRateService` when converting USD to BRL:

```typescript
// In AliExpressService.convertToOffer()
if (currency === 'USD') {
  const exchangeRate = await this.getExchangeRate(); // Uses ExchangeRateService
  currentPrice = await this.convertToBRL(currentPrice);
  originalPrice = await this.convertToBRL(originalPrice);
}
```

## API Sources

### 1. ExchangeRate-API (Primary)

**URL:** `https://api.exchangerate-api.com/v4/latest/USD`

**Features:**
- ✅ Free, no API key required
- ✅ Real-time rates
- ✅ Reliable

**Rate Limit:** Generous free tier

### 2. Fixer.io (Fallback)

**URL:** `https://api.fixer.io/latest?base=USD&symbols=BRL`

**Features:**
- ✅ Free tier available
- ✅ Real-time rates

**Note:** May require API key for production use

### 3. CurrencyAPI (Fallback)

**URL:** `https://api.currencyapi.com/v3/latest?apikey=free&currencies=BRL&base_currency=USD`

**Features:**
- ✅ Free tier
- ✅ Real-time rates

## Caching Strategy

### Cache File

**Location:** `scripts/.exchange-rate-cache.json`

**Format:**
```json
{
  "rate": 4.95,
  "timestamp": 1705516800000,
  "source": "api"
}
```

### Cache Duration

- **Valid for:** 1 hour (3,600,000 milliseconds)
- **After expiry:** Fetches new rate from API
- **If API fails:** Uses cached rate (even if old)

### Cache Invalidation

Cache is automatically invalidated after 1 hour. To force refresh:

```typescript
await exchangeRateService.refreshRate();
```

## Configuration

### Config.json

```json
{
  "aliexpress": {
    "exchangeRate": 4.95
  }
}
```

**Used as:** Fallback if API fails and cache is unavailable

### Environment Variable

```bash
ALIEXPRESS_EXCHANGE_RATE=4.95
```

**Used as:** Fallback if API fails, cache unavailable, and config.json missing

## Error Handling

### Validation

The service validates exchange rates to ensure they're reasonable:

- **Minimum:** 3.0 (USD/BRL is typically 4.5-5.5)
- **Maximum:** 7.0 (safety limit)

If rate is outside this range, falls back to config/default.

### Fallback Chain

1. Try real-time API
2. If fails, use cached rate (if < 1 hour old)
3. If no cache, use config.json
4. If no config, use environment variable
5. If none, use default (5.0)

## Logging

### Log Levels

- **Info:** Successful rate fetch
- **Debug:** Using cached rate
- **Warn:** Using fallback (cached/config/default)
- **Error:** All APIs failed

### Example Logs

```
✅ Fetched real-time exchange rate { rate: 4.95, source: 'real-time API' }
Using cached exchange rate { rate: 4.95, source: 'api', cachedAt: '2025-01-17T10:00:00.000Z' }
⚠️ Using cached exchange rate (real-time API unavailable) { rate: 4.95, source: 'api' }
Using exchange rate from config { rate: 4.95, source: 'config.json' }
⚠️ Using default exchange rate (5.0) - consider updating config.json
```

## Testing

### Manual Testing

```typescript
import { ExchangeRateService } from './services/exchangerate';

const service = new ExchangeRateService();

// Test real-time fetch
const rate = await service.getUSDtoBRLRate();
console.log('Current rate:', rate);

// Test cache
const cachedRate = await service.getUSDtoBRLRate(); // Should use cache
console.log('Cached rate:', cachedRate);

// Force refresh
const freshRate = await service.refreshRate();
console.log('Fresh rate:', freshRate);
```

### Unit Tests

Tests are in `src/services/exchangerate/__tests__/` (to be created)

## Benefits

### ✅ Accuracy

- Real-time exchange rates
- More accurate than fixed rate (5.0)
- Matches market rates

### ✅ Reliability

- Multiple API fallbacks
- Cache prevents excessive API calls
- Config fallback ensures it always works

### ✅ Performance

- 1-hour cache reduces API calls
- Fast fallback chain
- No blocking if API is slow

### ✅ Maintenance

- Automatic updates
- No manual rate updates needed
- Self-healing (falls back if API fails)

## Troubleshooting

### Issue: Always using default rate (5.0)

**Possible causes:**
1. All APIs are failing
2. Network issues
3. Cache file permissions

**Solution:**
- Check network connectivity
- Verify API endpoints are accessible
- Check `scripts/.exchange-rate-cache.json` permissions

### Issue: Rate seems incorrect

**Possible causes:**
1. API returning wrong rate
2. Cache is stale
3. Validation rejecting valid rate

**Solution:**
- Force refresh: `await service.refreshRate()`
- Check API response manually
- Verify rate is within 3.0-7.0 range

### Issue: Too many API calls

**Possible causes:**
1. Cache not working
2. Cache file not being written
3. Cache duration too short

**Solution:**
- Check cache file exists
- Verify cache file permissions
- Check cache duration (should be 1 hour)

## Future Improvements

### Potential Enhancements

1. **Rate History:**
   - Store historical rates
   - Track rate changes
   - Analytics

2. **More APIs:**
   - Add additional free APIs
   - Better redundancy
   - Regional APIs

3. **Rate Alerts:**
   - Notify on significant rate changes
   - Threshold-based alerts
   - Email/Telegram notifications

4. **Rate Prediction:**
   - Simple trend analysis
   - Moving averages
   - Basic forecasting

## Related Files

- `src/services/exchangerate/ExchangeRateService.ts` - Main service
- `src/services/aliexpress/AliExpressService.ts` - Integration
- `docs/ALIEXPRESS_CURRENCY_CONVERSION_CONCLUSION.md` - Problem context
- `config.json` - Fallback configuration

---

**Last Updated:** 2025-01-17

