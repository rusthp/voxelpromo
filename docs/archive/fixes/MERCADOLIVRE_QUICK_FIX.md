# Mercado Livre - Quick Fix: Exchange Code for Token

## Problem

You have an OAuth code but can't exchange it for a token because `clientSecret` is missing.

## Solution

### Step 1: Get Your Client Secret

1. Go to [Mercado Livre Developers](https://developers.mercadolivre.com.br/)
2. Log in to your account
3. Open your application (App ID: `6477386821612832`)
4. Copy the **Secret Key** (this is your `clientSecret`)

### Step 2: Add Client Secret to config.json

Edit `config.json` and add the `clientSecret`:

```json
{
  "mercadolivre": {
    "clientId": "6477386821612832",
    "clientSecret": "YOUR_SECRET_KEY_HERE",
    "redirectUri": "https://proplaynews.com.br/",
    ...
  }
}
```

### Step 3: Exchange Code for Token

Run the exchange script with your code:

```bash
node scripts/exchange-ml-code.js TG-691be00f5e54800001de5864-322784015
```

**Note:** OAuth codes expire quickly (usually within 10 minutes). If the code has expired, you'll need to:
1. Get a new authorization URL
2. Authorize again
3. Get a new code
4. Exchange it immediately

### Step 4: Sync to Cursor MCP

After successful exchange, sync the token to Cursor:

```bash
node scripts/sync-mcp-token.js
```

### Step 5: Restart Cursor

Restart Cursor to apply the MCP configuration changes.

## Alternative: Get New Authorization URL

If your code expired, get a new one:

```bash
# Via API
curl http://localhost:3000/api/mercadolivre/auth/url

# Or via Settings page
# Navigate to /settings and click "Obter URL de Autorização"
```

Then:
1. Open the URL in browser
2. Authorize the application
3. Copy the code from the redirect URL
4. Run the exchange script immediately

## Troubleshooting

### Error: "Client Secret not found"
- Make sure you added `clientSecret` to `config.json`
- Check for typos in the JSON file

### Error: "Code already used or expired"
- OAuth codes are single-use and expire quickly
- Get a new authorization URL and try again

### Error: "Redirect URI mismatch"
- Make sure `redirectUri` in `config.json` matches exactly what's configured in Mercado Livre DevCenter
- Current redirect URI: `https://proplaynews.com.br/`

### Error: "Invalid Client Secret"
- Double-check the Secret Key from DevCenter
- Make sure there are no extra spaces or characters

## Quick Command Reference

```bash
# Exchange code for token
node scripts/exchange-ml-code.js TG-XXXXX-XXXXX

# Sync token to Cursor MCP
node scripts/sync-mcp-token.js

# Check token status
curl http://localhost:3000/api/mercadolivre/auth/status
```

