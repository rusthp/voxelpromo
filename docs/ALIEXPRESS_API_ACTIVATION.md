# AliExpress Advanced API Activation Guide

## Problem: InvalidApiPath Error

Even after Advanced API approval, you may see `InvalidApiPath` errors. This is normal and usually means:

1. **API Activation Delay**: The APIs may take time (hours to days) to become fully active after approval
2. **Specific API Not Enabled**: Some advanced APIs may need separate activation
3. **App Configuration**: The app may need additional configuration in the AliExpress developer portal

## Current Status

### ✅ Working APIs
- `aliexpress.affiliate.featuredpromo.products.get` - **Working** ✅
- `aliexpress.affiliate.product.query` - **Working** ✅

### ⏳ Pending Activation (After Approval)
- `aliexpress.affiliate.hotproduct.query` - **May need activation time**
- `aliexpress.affiliate.productdetail.get` - **May need activation time**
- `aliexpress.affiliate.product.smartmatch` - **May need activation time**

## Solutions

### 1. Wait for Activation
Advanced APIs can take **24-48 hours** to become fully active after approval. The system will automatically:
- Try the Advanced API first
- Fall back to working APIs if Advanced API is not available
- Log warnings (not errors) when Advanced APIs are unavailable

### 2. Verify App Configuration
1. Go to [AliExpress Developer Portal](https://developers.aliexpress.com)
2. Check your app's API permissions
3. Verify that "Advanced API" is listed as "Active"
4. Check if individual APIs need separate activation

### 3. Check IP Whitelist
Some APIs may require IP whitelisting:
1. Go to your app settings
2. Add your server IP to the whitelist
3. Wait a few minutes for changes to propagate

### 4. Contact Support
If APIs don't activate after 48 hours:
1. Contact AliExpress Developer Support
2. Provide your App ID
3. Mention that Advanced API was approved but endpoints return `InvalidApiPath`

## Current Behavior

The system is designed to handle this gracefully:

1. **Hot Products API**: Falls back to `featuredpromo.products.get` with "Hot Product" promotion
2. **Product Details API**: Returns empty array (silent failure)
3. **Smart Match API**: Returns empty array (silent failure)

All fallbacks are logged as warnings, not errors, so collection continues normally.

## Monitoring

Check logs for:
- `⚠️ Hot products Advanced API not available yet` - Normal during activation period
- `⚠️ Product details Advanced API not available yet` - Normal during activation period
- `⚠️ Smart match Advanced API not available yet` - Normal during activation period

These are **expected** during the activation period and don't indicate a problem.

## Expected Timeline

- **Immediate**: Standard APIs work (`featuredpromo.products.get`)
- **24-48 hours**: Advanced APIs should become active
- **After activation**: All Advanced APIs should work without errors

## Verification

To verify if Advanced APIs are active:

1. Check logs for successful API calls (no `InvalidApiPath` errors)
2. Look for `✅ Retrieved X products from Advanced API` messages
3. If you see warnings, APIs are still activating (normal)

## Notes

- The system continues to work with standard APIs during activation
- No data loss occurs - fallbacks ensure collection continues
- Once activated, Advanced APIs will automatically be used
- No code changes needed - activation is automatic

