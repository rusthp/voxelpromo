# Collection System Improvements

## 📋 Overview

This document describes the improvements made to the product collection system for AliExpress and Mercado Livre to handle API failures and provide robust fallback mechanisms.

## 🔄 Retry System

### Implementation

A new retry utility (`src/utils/retry.ts`) has been created with the following features:

- **Exponential Backoff**: Delays increase exponentially between retries
- **Configurable Options**: Max retries, delays, and retryable errors
- **Smart Error Detection**: Only retries on specific error types
- **Logging**: Comprehensive logging of retry attempts

### Usage

```typescript
import { retryWithBackoff } from '../../utils/retry';

const result = await retryWithBackoff(
  () => service.getProducts(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }
);
```

### Retryable Errors

The system automatically retries on these error types:
- Network errors (`ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `ECONNREFUSED`)
- API errors (`InvalidApiPath`, `InsufficientPermission`)
- Timeout errors

## 🛡️ Fallback Mechanisms

### AliExpress Collection

#### Primary Methods (with retry)
1. **Hot Products API** (`getHotProducts`)
   - Retries: 2 attempts
   - Delay: 2 seconds initial

2. **Flash Deals API** (`getFlashDeals`)
   - Retries: 2 attempts
   - Delay: 2 seconds initial

#### Fallback Methods
1. **Search API** (`searchProducts`)
   - Triggered when primary methods fail
   - Uses keywords: "electronics discount"
   - Retries: 2 attempts

2. **RSS Feeds** (Final fallback)
   - Tries multiple RSS feed URLs:
     - `https://www.aliexpress.com/rss/feed.xml`
     - `https://www.aliexpress.com/rss/bestdeals.xml`
   - Returns immediately if any feed succeeds

### Mercado Livre Collection

#### Primary Methods (with retry)
1. **Hot Deals API** (`getHotDeals`)
   - Retries: 2 attempts
   - Delay: 2 seconds initial

2. **Search API** (`searchProducts`)
   - Retries: 2 attempts
   - Delay: 2 seconds initial
   - Default term: "eletrônicos"

#### Fallback Methods
1. **Alternative Search Terms**
   - Tries multiple search terms:
     - "promoção"
     - "desconto"
     - "ofertas"
     - "black friday"
   - Stops at first successful search
   - Retries: 1 attempt per term

2. **RSS Feeds** (Final fallback)
   - Tries multiple RSS feed URLs:
     - `https://www.mercadolivre.com.br/rss/ofertas`
     - `https://www.pelando.com.br/feed`
   - Returns immediately if any feed succeeds

3. **Product Details** (Multiget with retry)
   - Fetches detailed info for first 20 products
   - Uses multiget API for efficiency
   - Retries: 2 attempts
   - Falls back to basic data if multiget fails

## 📊 Collection Flow

### AliExpress Flow

```
1. Try getHotProducts() → Retry 2x
   ↓ (if fails)
2. Try getFlashDeals() → Retry 2x
   ↓ (if both fail)
3. Try searchProducts() → Retry 2x
   ↓ (if fails)
4. Try RSS feeds (multiple URLs)
   ↓ (if all fail)
5. Return 0 (no products collected)
```

### Mercado Livre Flow

```
1. Try getHotDeals() → Retry 2x
   ↓ (if fails)
2. Try searchProducts("eletrônicos") → Retry 2x
   ↓ (if fails)
3. Try alternative search terms → Retry 1x each
   ↓ (if all fail)
4. Try RSS feeds (multiple URLs)
   ↓ (if all fail)
5. Return 0 (no products collected)
```

## 🔍 Error Handling

### Logging Levels

- **Info**: Normal operations, successful retries
- **Warn**: Failed attempts, fallback activations
- **Error**: Final failures, non-retryable errors
- **Debug**: Detailed retry information, RSS feed failures

### Error Messages

All errors are logged with:
- Error message
- Source (AliExpress/Mercado Livre)
- Method attempted
- Retry count (if applicable)

## ⚙️ Configuration

### Retry Options

Default configuration:
```typescript
{
  maxRetries: 3,
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  backoffMultiplier: 2,    // Double delay each retry
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'Network Error',
    'timeout',
    'InvalidApiPath',
    'InsufficientPermission'
  ]
}
```

### Collection-Specific Settings

**AliExpress**:
- Hot Products: 2 retries, 2s delay
- Flash Deals: 2 retries, 2s delay
- Search Fallback: 2 retries, 2s delay

**Mercado Livre**:
- Hot Deals: 2 retries, 2s delay
- Search: 2 retries, 2s delay
- Alternative Terms: 1 retry, 2s delay
- Multiget: 2 retries, 2s delay

## 📈 Performance Impact

### Benefits

1. **Resilience**: System continues working even when APIs fail
2. **Reliability**: Multiple fallback methods ensure data collection
3. **Efficiency**: Retry only on transient errors
4. **Transparency**: Comprehensive logging for debugging

### Trade-offs

1. **Time**: Fallbacks add time to collection process
2. **API Calls**: More retries = more API calls
3. **Complexity**: More code paths to maintain

## 🧪 Testing

### Test Scenarios

1. **API Success**: Normal flow, no retries needed
2. **Transient Failure**: API fails then succeeds on retry
3. **Persistent Failure**: All retries fail, fallback activated
4. **Complete Failure**: All methods fail, returns 0

### Monitoring

Monitor these metrics:
- Retry success rate
- Fallback activation frequency
- Collection success rate
- Average collection time

## 🔮 Future Improvements

### Potential Enhancements

1. **Circuit Breaker**: Stop retrying if service is down
2. **Rate Limiting**: Respect API rate limits
3. **Caching**: Cache successful results to reduce API calls
4. **Health Checks**: Monitor API health before attempting collection
5. **Adaptive Retry**: Adjust retry strategy based on error patterns

## 📝 Summary

The improved collection system provides:

✅ **Robust Error Handling**: Retries on transient errors
✅ **Multiple Fallbacks**: RSS feeds and alternative methods
✅ **Comprehensive Logging**: Full visibility into collection process
✅ **Graceful Degradation**: Returns 0 instead of crashing
✅ **Configurable**: Easy to adjust retry and fallback settings

---

**Status**: ✅ Implemented and tested
**Last Updated**: 2025-11-16

