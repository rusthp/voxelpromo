# Mercado Livre MCP Server Setup

## Overview

The Mercado Livre MCP (Model Context Protocol) Server provides tools to search documentation and access detailed API information directly from Cursor.

## Available Tools

### 1. `search_documentation`
Searches for specific terms or key concepts in Mercado Livre's technical documentation.

**Parameters:**
- `query` (Required): Keywords to search in documentation
- `language` (Required): Documentation language (e.g., `en_us`, `es_ar`, `pt_br`)
- `siteId` (Optional): Country ID to filter results (e.g., `MLA`, `MLB`, `MLM`)
- `limit` (Optional): Maximum results to return
- `offset` (Optional): Number of results to skip

**Example:**
```json
{
  "query": "OAuth authentication",
  "language": "pt_br",
  "siteId": "MLB",
  "limit": 10
}
```

### 2. `get_documentation_page`
Gets the complete content of a specific documentation page.

**Parameters:**
- `path` (Required): Path of the page to retrieve
- `language` (Required): Documentation language (e.g., `en_us`, `es_ar`, `pt_br`)
- `siteId` (Optional): Country ID to filter results (e.g., `MLA`, `MLB`, `MLM`)

**Example:**
```json
{
  "path": "/developers/pt/docs/authentication/oauth",
  "language": "pt_br"
}
```

## Setup Instructions

### Prerequisites

1. **Access Token**: You need a valid Mercado Livre Access Token
   - See `MERCADOLIVRE_GUIDE.md` for instructions on obtaining tokens
   - Or use the OAuth flow in the project settings
   - Current token is in `config.json` → `mercadolivre.accessToken`

### Quick Token Access

If you already have a token configured in the project:

```bash
# View current token (from config.json)
cat config.json | grep -A 1 "mercadolivre" | grep "accessToken"
```

**Note:** Tokens expire after 6 hours. If expired, refresh via OAuth flow.

### Method 1: OAuth Flow (Recommended - Automatic)

The Mercado Livre MCP Server supports integrated OAuth flow through Cursor:

1. **Add MCP Server in Cursor**
   - Go to: **Cursor Settings > Tools & Integrations > New MCP Server**
   - Add the server configuration (see Method 2 below)

2. **OAuth Authorization**
   - When you first use the MCP server, Cursor will automatically open the OAuth flow
   - Authorize the connection in your browser
   - Cursor will handle the callback automatically via `cursor://anysphere.cursor-mcp/oauth/...`

3. **Automatic Token Management**
   - The MCP server handles token exchange and refresh automatically
   - No manual token configuration needed if using OAuth flow

**Note:** The callback URL format is: `cursor://anysphere.cursor-mcp/oauth/user-mercadolibre-mcp-server/callback?code=TG-XXXXX`

### Method 2: Manual Setup with Access Token

1. Open Cursor Settings
   - Go to: **Cursor Settings > Tools & Integrations > New MCP Server**

2. Add the MCP Server configuration

   Add the following JSON block to your Cursor MCP configuration:

   ```json
   {
     "mcpServers": {
       "mercadolibre-mcp-server": {
         "url": "https://mcp.mercadolibre.com/mcp",
         "headers": {
           "Authorization": "Bearer YOUR_ACCESS_TOKEN"
         }
       }
     }
   }
   ```

   **Important:** The `Authorization` header must include `Bearer ` prefix before the token.

3. Replace `YOUR_ACCESS_TOKEN` with your actual Access Token

   **Important:** 
   - Get your Access Token from the project's Mercado Livre integration
   - Or obtain it via OAuth flow (see `MERCADOLIVRE_GUIDE.md`)
   - The token expires after 6 hours (refresh automatically handled)

4. Save the configuration

5. Restart Cursor (if needed)

## Getting Your Access Token

### Option 1: From Project Config

Check `config.json`:
```json
{
  "mercadolivre": {
    "accessToken": "APP_USR-XXXXX-XXXXX"
  }
}
```

### Option 2: Via OAuth Flow

1. Navigate to Settings page in the frontend
2. Click "Connect Mercado Livre"
3. Authorize the application
4. Token will be saved automatically
5. Copy token from `config.json`

### Option 3: Via API

```bash
# Get authorization URL
curl http://localhost:3000/api/mercadolivre/auth/url

# Exchange code for token
curl -X POST http://localhost:3000/api/mercadolivre/auth/exchange \
  -H "Content-Type: application/json" \
  -d '{"code": "YOUR_CODE"}'
```

## Usage Examples

### Search Documentation

**Use Case:** Find information about OAuth authentication

```json
{
  "query": "OAuth 2.0 authentication flow",
  "language": "pt_br",
  "siteId": "MLB",
  "limit": 5
}
```

### Get Specific Page

**Use Case:** Get detailed OAuth documentation

```json
{
  "path": "/developers/pt/docs/authentication/oauth",
  "language": "pt_br"
}
```

## Benefits

1. **Quick Documentation Access**: Search and retrieve documentation without leaving Cursor
2. **Context-Aware**: Get relevant documentation based on your code context
3. **Multi-Language Support**: Access documentation in your preferred language
4. **Country-Specific**: Filter results by country (MLB for Brazil, etc.)

## Monitoramento de Conexão

### Script de Diagnóstico

Execute para verificar o status completo da conexão:

```bash
node scripts/monitor-mcp-connection.js
```

Este script verifica:
- ✅ Expiração do token
- ✅ Validade do token
- ✅ Conectividade com servidor MCP
- ✅ Sincronização entre config.json e mcp.json

### Se o MCP Perder Conexão

**Sintoma:** MCP fica ativo mas depois perde conexão

**Soluções:**
1. **Verificar token:**
   ```bash
   node scripts/monitor-mcp-connection.js
   ```

2. **Se token expirado:**
   - Renovar: Settings → "Renovar Token"
   - Sincronizar: `node scripts/sync-mcp-token.js`
   - Reiniciar Cursor

3. **Se token válido mas ainda cai:**
   - Usar OAuth flow (remove token manual do mcp.json)
   - Reiniciar Cursor periodicamente (a cada 4-5 horas)
   - Verificar logs do MCP no Cursor Settings

**Documentação completa:** `docs/MCP_CONNECTION_TROUBLESHOOTING.md`

## Troubleshooting

### OAuth Callback Received

**Symptom:** You see a callback URL like `cursor://anysphere.cursor-mcp/oauth/user-mercadolibre-mcp-server/callback?code=TG-XXXXX`

**What to do:**
- **If using OAuth flow (Method 1)**: Cursor handles this automatically. The callback should be processed automatically by the MCP server.
- **If callback doesn't work**: The MCP server should handle token exchange automatically. If issues persist, try:
  1. Restart Cursor
  2. Check MCP server status in Cursor settings
  3. Verify the server is enabled (toggle should be green)

### Token Expired

**Symptom:** MCP requests return authentication errors or Cursor keeps asking for authorization even after approving in browser

**Root Cause:** 
- Tokens expire after 6 hours
- The MCP server may not automatically refresh tokens
- Manual token in `mcp.json` may be out of sync with project's `config.json`

**Solution:**
1. **Check if token is expired:**
   ```bash
   # Check token expiration in config.json
   node -e "const config = require('./config.json'); const expiresAt = config.mercadolivre?.tokenExpiresAt; if (expiresAt) { const now = Date.now(); const isExpired = now >= expiresAt; console.log('Expires:', new Date(expiresAt).toISOString()); console.log('Is expired:', isExpired); }"
   ```

2. **If token is expired, refresh it:**
   - Go to Settings page in frontend
   - Click "Renovar Token" or "Connect Mercado Livre"
   - Or use API: `POST /api/mercadolivre/auth/refresh`

3. **Update token in Cursor MCP configuration:**
   
   **Option A: Use sync script (Recommended)**
   ```bash
   node scripts/sync-mcp-token.js
   ```
   This script automatically:
   - Checks if token is expired
   - Syncs token from `config.json` to `mcp.json`
   - Provides clear instructions if refresh is needed
   
   **Option B: Manual update**
   - Copy the new token from `config.json` → `mercadolivre.accessToken`
   - Update `mcp.json` → `mercadolibre-mcp-server.headers.Authorization` with `Bearer NEW_TOKEN`
   - Save and restart Cursor

4. **Alternative: Use OAuth Flow (Recommended)**
   - Remove the manual token from `mcp.json`
   - Let the MCP server handle OAuth automatically
   - The server will manage token refresh automatically

### Cursor Keeps Asking for Authorization

**Symptom:** You approve authorization in browser, but Cursor asks again immediately

**Root Cause:**
- Token in `mcp.json` is expired or invalid
- MCP server's OAuth flow is not synced with manual token
- Token refresh is not working automatically

**Solution:**
1. **Check token expiration** (see "Token Expired" section above)
2. **If using manual token setup:**
   - Refresh token first (Settings page or API)
   - Run sync script: `node scripts/sync-mcp-token.js`
   - Or manually update `mcp.json` with new token
   - Format: `"Authorization": "Bearer APP_USR-XXXXX-XXXXX"`
   - Restart Cursor
3. **If using OAuth flow:**
   - The callback URL should be handled automatically
   - If it keeps asking, try:
     - Remove manual token from `mcp.json` (let OAuth handle it)
     - Restart Cursor completely
     - Check MCP server logs in Cursor settings
4. **Verify token is valid:**
   ```bash
   # Test token validity
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.mercadolibre.com/users/me
   ```

### Connection Failed

**Symptom:** Cannot connect to MCP server or shows "Loading tools"

**Solutions:**
1. Verify the URL is correct: `https://mcp.mercadolibre.com/mcp`
2. Check your internet connection
3. Verify the token is valid (if using manual setup)
4. **Check Authorization header format**: Must be `Bearer TOKEN` (not just `TOKEN`)
5. If using OAuth flow, ensure the OAuth callback completed successfully
6. Check Cursor MCP server logs
7. Try toggling the server off and on in Cursor settings
8. **If token expired**: See "Token Expired" section above

### No Results Found

**Symptom:** Search returns no results

**Solutions:**
1. Try different keywords
2. Check language parameter (use `pt_br` for Portuguese)
3. Verify `siteId` is correct (use `MLB` for Brazil)
4. Try broader search terms

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit tokens to Git**: Access tokens should never be in version control
2. **Use environment variables**: Consider using env vars for tokens
3. **Token expiration**: Tokens expire after 6 hours - refresh regularly
4. **Rotate tokens**: Regularly rotate access tokens for security

## Configuration File Example

A template configuration file is available at:
- `docs/CURSOR_MCP_CONFIG.json.example`

Copy this file and replace `YOUR_ACCESS_TOKEN_HERE` with your actual token.

## Related Documentation

- `MERCADOLIVRE_GUIDE.md` - Complete Mercado Livre integration guide
- `AUTHENTICATION.md` - General authentication documentation
- `CURSOR_MCP_CONFIG.json.example` - Example configuration file

## Next Steps

1. ✅ Configure MCP server in Cursor
2. ✅ Test with a simple search query
3. ✅ Use `get_documentation_page` for detailed API specs
4. ✅ Integrate documentation search into development workflow

## Example Workflow

1. **While coding**: Use `search_documentation` to find API endpoints
2. **Get details**: Use `get_documentation_page` for full specifications
3. **Implement**: Use the documentation to implement features correctly
4. **Verify**: Test against Mercado Livre API

This MCP integration makes it easier to work with Mercado Livre's API by providing instant access to documentation directly in your development environment.

