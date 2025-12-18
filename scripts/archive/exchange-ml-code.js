#!/usr/bin/env node

/**
 * Script to exchange Mercado Livre OAuth code for access token
 * 
 * Usage:
 *   node scripts/exchange-ml-code.js TG-XXXXX-XXXXX
 * 
 * Or set the code as environment variable:
 *   CODE=TG-XXXXX-XXXXX node scripts/exchange-ml-code.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const configPath = path.join(process.cwd(), 'config.json');
const code = process.argv[2] || process.env.CODE;

if (!code) {
  console.error('❌ Error: OAuth code is required');
  console.log('\nUsage:');
  console.log('  node scripts/exchange-ml-code.js TG-XXXXX-XXXXX');
  console.log('  or');
  console.log('  CODE=TG-XXXXX-XXXXX node scripts/exchange-ml-code.js');
  console.log('\nExample:');
  console.log('  node scripts/exchange-ml-code.js TG-691be00f5e54800001de5864-322784015');
  process.exit(1);
}

// Read config.json
let config;
try {
  if (!fs.existsSync(configPath)) {
    console.error('❌ Error: config.json not found');
    process.exit(1);
  }
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (error) {
  console.error('❌ Error reading config.json:', error.message);
  process.exit(1);
}

const mlConfig = config.mercadolivre || {};
const clientId = mlConfig.clientId;
const clientSecret = mlConfig.clientSecret;
const redirectUri = mlConfig.redirectUri || 'https://proplaynews.com.br/';

if (!clientId) {
  console.error('❌ Error: Client ID not found in config.json');
  console.log('\n💡 Solution: Add clientId to config.json:');
  console.log('  {');
  console.log('    "mercadolivre": {');
  console.log('      "clientId": "YOUR_CLIENT_ID"');
  console.log('    }');
  console.log('  }');
  process.exit(1);
}

if (!clientSecret) {
  console.error('❌ Error: Client Secret not found in config.json');
  console.log('\n💡 Solution: Add clientSecret to config.json:');
  console.log('  {');
  console.log('    "mercadolivre": {');
  console.log('      "clientId": "' + clientId + '",');
  console.log('      "clientSecret": "YOUR_CLIENT_SECRET"');
  console.log('    }');
  console.log('  }');
  console.log('\n📝 How to get Client Secret:');
  console.log('  1. Go to https://developers.mercadolivre.com.br/');
  console.log('  2. Open your application');
  console.log('  3. Copy the "Secret Key" (Client Secret)');
  console.log('  4. Add it to config.json');
  process.exit(1);
}

console.log('🔄 Exchanging OAuth code for access token...\n');
console.log('📋 Configuration:');
console.log(`   Client ID: ${clientId}`);
console.log(`   Redirect URI: ${redirectUri}`);
console.log(`   Code: ${code.substring(0, 20)}...\n`);

// Exchange code for token
axios.post('https://api.mercadolibre.com/oauth/token', 
  new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri
  }),
  {
    headers: {
      'accept': 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    }
  }
)
.then(response => {
  const tokens = response.data;
  
  console.log('✅ Successfully exchanged code for token!\n');
  console.log('📊 Token Information:');
  console.log(`   Access Token: ${tokens.access_token.substring(0, 30)}...`);
  console.log(`   Refresh Token: ${tokens.refresh_token.substring(0, 30)}...`);
  console.log(`   Expires In: ${tokens.expires_in} seconds (${Math.floor(tokens.expires_in / 3600)} hours)`);
  console.log(`   User ID: ${tokens.user_id}`);
  console.log(`   Scope: ${tokens.scope || 'N/A'}\n`);

  // Update config.json
  if (!config.mercadolivre) {
    config.mercadolivre = {};
  }

  config.mercadolivre.accessToken = tokens.access_token;
  config.mercadolivre.refreshToken = tokens.refresh_token;
  config.mercadolivre.tokenExpiresAt = Date.now() + (tokens.expires_in * 1000);
  config.mercadolivre.clientId = clientId;
  config.mercadolivre.clientSecret = clientSecret;
  config.mercadolivre.redirectUri = redirectUri;

  // Save config.json
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✅ Tokens saved to config.json!\n');
    console.log('📝 Next steps:');
    console.log('   1. Sync token to Cursor MCP: node scripts/sync-mcp-token.js');
    console.log('   2. Restart Cursor to apply MCP changes');
    console.log('   3. The Mercado Livre integration should now work!');
  } catch (error) {
    console.error('❌ Error saving config.json:', error.message);
    console.log('\n💡 Manual save:');
    console.log('   Add these to config.json:');
    console.log(`   "accessToken": "${tokens.access_token}"`);
    console.log(`   "refreshToken": "${tokens.refresh_token}"`);
    console.log(`   "tokenExpiresAt": ${Date.now() + (tokens.expires_in * 1000)}`);
    process.exit(1);
  }
})
.catch(error => {
  console.error('❌ Error exchanging code for token:\n');
  
  if (error.response) {
    console.error(`   Status: ${error.response.status}`);
    console.error(`   Error: ${error.response.data?.error || 'Unknown error'}`);
    console.error(`   Description: ${error.response.data?.error_description || 'No description'}`);
    
    if (error.response.status === 400) {
      console.log('\n💡 Common causes:');
      console.log('   - Code already used or expired');
      console.log('   - Redirect URI mismatch');
      console.log('   - Invalid Client ID or Secret');
    } else if (error.response.status === 401) {
      console.log('\n💡 Common causes:');
      console.log('   - Invalid Client Secret');
      console.log('   - Client ID and Secret mismatch');
    }
  } else {
    console.error(`   ${error.message}`);
  }
  
  process.exit(1);
});

