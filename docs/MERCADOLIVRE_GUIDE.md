# Mercado Livre Integration - Complete Guide

This document consolidates all Mercado Livre integration documentation, setup, and troubleshooting.

## Overview

The Mercado Livre integration uses OAuth 2.0 to authenticate and fetch products, hot deals, and convert them to offers.

## Current Status

### ✅ Working Features
- OAuth 2.0 authentication flow
- Access token management (6-hour expiration)
- Automatic token refresh
- Product search (public endpoint)
- Hot deals fetching
- Product to Offer conversion
- Settings UI for configuration

### ⚠️ Known Issues
- API may return 403 Forbidden (rate limit, IP block, or authentication)
- Some endpoints require OAuth (public search works without auth)

## Setup

### 1. Create Mercado Livre Application

1. Go to [Mercado Livre Developers](https://developers.mercadolivre.com.br/)
2. Create a new application
3. Get your `APP_ID` and `SECRET_KEY`
4. Set redirect URI: `http://localhost:3000/api/mercadolivre/auth/callback`

### 2. Configure in Project

#### Option A: config.json
```json
{
  "mercadolivre": {
    "appId": "your-app-id",
    "secretKey": "your-secret-key",
    "redirectUri": "http://localhost:3000/api/mercadolivre/auth/callback"
  }
}
```

#### Option B: Environment Variables
```bash
MERCADOLIVRE_APP_ID=your-app-id
MERCADOLIVRE_SECRET_KEY=your-secret-key
MERCADOLIVRE_REDIRECT_URI=http://localhost:3000/api/mercadolivre/auth/callback
```

### 3. Get Authorization URL

```bash
# Via API
curl http://localhost:3000/api/mercadolivre/auth/url

# Or via Settings UI
# Navigate to Settings page and click "Connect Mercado Livre"
```

### 4. Exchange Code for Token

After authorization, exchange the code:

```bash
# Via API
curl -X POST http://localhost:3000/api/mercadolivre/auth/exchange \
  -H "Content-Type: application/json" \
  -d '{"code": "your-code"}'

# Or via Settings UI
# The exchange happens automatically after authorization
```

## API Routes

### Authentication
- `GET /api/mercadolivre/auth/url` - Get authorization URL
- `POST /api/mercadolivre/auth/exchange` - Exchange code for token
- `GET /api/mercadolivre/auth/refresh` - Refresh access token

### Products
- `GET /api/mercadolivre/products/search?q=query` - Search products
- `GET /api/mercadolivre/products/hot-deals` - Get hot deals

## OAuth Flow

1. **Get Authorization URL**
   - User clicks "Connect Mercado Livre" in Settings
   - System generates authorization URL
   - User redirected to Mercado Livre

2. **Authorization**
   - User authorizes application
   - Mercado Livre redirects with `code` parameter

3. **Exchange Code**
   - System exchanges `code` for `access_token` and `refresh_token`
   - Tokens saved to config.json

4. **Token Refresh**
   - Access token expires after 6 hours
   - System automatically refreshes using `refresh_token`

## Service Methods

### MercadoLivreService

#### `getAuthUrl()`
Returns authorization URL for OAuth flow.

#### `exchangeCodeForToken(code: string)`
Exchanges authorization code for access and refresh tokens.

#### `refreshAccessToken()`
Refreshes expired access token using refresh token.

#### `searchProducts(query: string, limit?: number)`
Searches products using public API endpoint.

#### `getHotDeals(limit?: number)`
Fetches hot deals from Mercado Livre.

#### `convertToOffer(product: any)`
Converts Mercado Livre product to Offer format.

## Settings UI

The Settings page includes:
- Mercado Livre connection status
- "Connect Mercado Livre" button
- Token expiration display
- Automatic token refresh indicator

## Troubleshooting

### 403 Forbidden Error
**Causes:**
- Rate limit exceeded
- IP address blocked
- Invalid authentication
- OAuth token expired

**Solutions:**
- Wait and retry (rate limit)
- Check IP restrictions
- Re-authenticate (get new token)
- Verify App ID and Secret Key

### Token Expired
**Solution:**
- System automatically refreshes tokens
- If refresh fails, re-authenticate via Settings UI

### Products Not Found
**Causes:**
- Invalid search query
- API rate limit
- Authentication issues

**Solutions:**
- Try different search terms
- Wait and retry
- Check authentication status

## Testing

### Manual Testing
```bash
# Test public search (no auth required)
curl "http://localhost:3000/api/mercadolivre/products/search?q=notebook"

# Test hot deals (requires auth)
curl "http://localhost:3000/api/mercadolivre/products/hot-deals"
```

### Test Scripts
- `scripts/test-mercadolivre-simple.js` - Simple test script
- `scripts/exchange-ml-token-direct.js` - Direct token exchange

## Configuration Files

### config.json Structure
```json
{
  "mercadolivre": {
    "appId": "string",
    "secretKey": "string",
    "redirectUri": "string",
    "accessToken": "string",
    "refreshToken": "string",
    "tokenExpiresAt": "ISO date string"
  }
}
```

## Best Practices

1. **Token Management**
   - Always check token expiration before API calls
   - Automatically refresh expired tokens
   - Store tokens securely (not in git)

2. **Error Handling**
   - Handle 403 errors gracefully
   - Retry on rate limit errors
   - Log authentication failures

3. **Rate Limiting**
   - Respect API rate limits
   - Implement exponential backoff
   - Cache responses when possible

## MCP Integration

For enhanced development experience, you can configure the Mercado Livre MCP Server in Cursor to access documentation directly. See `MERCADOLIVRE_MCP_SETUP.md` for setup instructions.

## Related Files

- `src/services/mercadolivre/MercadoLivreService.ts` - Main service
- `src/routes/mercadolivre.routes.ts` - API routes
- `frontend/app/settings/page.tsx` - Settings UI
- `scripts/test-mercadolivre-simple.js` - Test script
- `docs/MERCADOLIVRE_MCP_SETUP.md` - MCP Server setup guide

## Future Improvements

- [ ] Add unit tests for MercadoLivreService
- [ ] Implement request caching
- [ ] Add retry logic with exponential backoff
- [ ] Improve error messages
- [ ] Add support for more product fields

