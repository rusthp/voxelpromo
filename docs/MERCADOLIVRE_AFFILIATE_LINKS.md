# Mercado Livre Affiliate Links - Implementation Guide

## 📋 Overview

This document explains how affiliate links are generated for Mercado Livre products in the VoxelPromo system.

## 🔗 Supported Link Formats

### Format 1: Simple Affiliate Code (Most Common)
**Format**: `https://produto.mercadolivre.com.br/MLB-123456?a=SEU_CODIGO`

**Usage**: When you have a simple affiliate code (e.g., from ZIQ, EnvíoPago, or direct program)

**Example**:
- Product URL: `https://produto.mercadolivre.com.br/MLB-123456789`
- Affiliate Code: `ABC123`
- Result: `https://produto.mercadolivre.com.br/MLB-123456789?a=ABC123`

### Format 2: Hub de Afiliados URL
**Format**: `https://www.mercadolivre.com.br/afiliados/hub?u=PRODUCT_URL`

**Usage**: When you have a full hub de afiliados URL with tracking parameters

**Example**:
- Product URL: `https://produto.mercadolivre.com.br/MLB-123456789`
- Hub URL: `https://www.mercadolivre.com.br/afiliados/hub#c_tracking_id=...`
- Result: `https://www.mercadolivre.com.br/afiliados/hub?u=https://produto.mercadolivre.com.br/MLB-123456789#c_tracking_id=...`

### Format 3: Direct Product URL (No Affiliate)
**Format**: `PRODUCT_PERMALINK`

**Usage**: When no affiliate code is configured

**Example**:
- Product URL: `https://produto.mercadolivre.com.br/MLB-123456789`
- Result: `https://produto.mercadolivre.com.br/MLB-123456789` (unchanged)

## ⚙️ Configuration

### Setting Affiliate Code

1. **Simple Code**: Enter just the code
   ```
   ABC123
   ```

2. **Hub URL**: Enter the full hub URL
   ```
   https://www.mercadolivre.com.br/afiliados/hub#c_tracking_id=...
   ```

### Configuration File

```json
{
  "mercadolivre": {
    "affiliateCode": "ABC123" // or full hub URL
  }
}
```

### Settings Page

Configure in the Mercado Livre section:
- **Código de Afiliado ou Link do Hub**: Enter your affiliate code or hub URL

## 🔧 Implementation Details

### `buildAffiliateLink()` Method

The method automatically detects the format:

1. **No Code**: Returns original product URL
2. **Full URL (Hub)**: Uses hub format with product URL as parameter
3. **Simple Code**: Adds `?a=CODE` parameter to product URL

### Code Location

```typescript
// src/services/mercadolivre/MercadoLivreService.ts
buildAffiliateLink(productUrl: string, itemId: string): string
```

## 📊 How It Works

### Flow

1. Product is found via search API
2. Product permalink is extracted
3. `buildAffiliateLink()` is called
4. Affiliate code is applied based on format
5. Final affiliate link is stored in `affiliateUrl` field

### Example Flow

```typescript
// 1. Product from API
const product = {
  id: "MLB123456789",
  permalink: "https://produto.mercadolivre.com.br/MLB-123456789"
};

// 2. Build affiliate link
const affiliateLink = service.buildAffiliateLink(
  product.permalink,
  product.id
);
// Result: "https://produto.mercadolivre.com.br/MLB-123456789?a=ABC123"

// 3. Convert to Offer
const offer = service.convertToOffer(product);
// offer.affiliateUrl contains the affiliate link
```

## 🎯 Best Practices

### For Affiliate Programs

1. **Use Simple Codes**: If you have a direct affiliate code, use it (simpler)
2. **Use Hub URLs**: If you need advanced tracking, use hub URLs
3. **Test Links**: Always test affiliate links to ensure they work
4. **Monitor Performance**: Track which link formats perform better

### For Development

1. **Leave Empty**: During development, leave `affiliateCode` empty to use direct links
2. **Test Both Formats**: Test with both simple codes and hub URLs
3. **Validate URLs**: Ensure product URLs are valid before generating affiliate links

## ⚠️ Important Notes

### Link Validation

- The system validates URLs before adding affiliate codes
- Invalid URLs fall back to simple concatenation
- Hub URLs are preserved with all tracking parameters

### Commission Tracking

- **Simple Code**: Commission tracked via `?a=CODE` parameter
- **Hub URL**: Commission tracked via hub tracking parameters
- **No Code**: No commission tracking (direct product link)

### URL Format

- Product URLs from API: `https://produto.mercadolivre.com.br/MLB-123456789`
- Affiliate links: Same format with added parameters
- Hub links: Redirect through hub with tracking

## 🔍 Troubleshooting

### Links Not Working

1. **Check Code Format**: Ensure code is correct (no extra spaces)
2. **Verify Hub URL**: If using hub, ensure URL is complete
3. **Test Direct**: Test product URL directly first
4. **Check Logs**: Check backend logs for link generation errors

### No Commission Tracking

1. **Verify Code**: Ensure affiliate code is saved in config
2. **Check Format**: Verify link format matches your program
3. **Test Link**: Click link and verify tracking parameters are present
4. **Contact Support**: If issues persist, contact your affiliate program

## 📝 Examples

### Example 1: Simple Code
```json
{
  "affiliateCode": "MYCODE123"
}
```
**Result**: `https://produto.mercadolivre.com.br/MLB-123456?a=MYCODE123`

### Example 2: Hub URL
```json
{
  "affiliateCode": "https://www.mercadolivre.com.br/afiliados/hub#c_tracking_id=abc123"
}
```
**Result**: `https://www.mercadolivre.com.br/afiliados/hub?u=https://produto.mercadolivre.com.br/MLB-123456#c_tracking_id=abc123`

### Example 3: No Code
```json
{
  "affiliateCode": ""
}
```
**Result**: `https://produto.mercadolivre.com.br/MLB-123456` (unchanged)

## ✅ Status

**Implementation**: ✅ Complete
**Testing**: Ready for testing
**Documentation**: Complete

---

For more information about Mercado Livre's affiliate program, visit:
https://www.mercadolivre.com.br/l/afiliados-home

