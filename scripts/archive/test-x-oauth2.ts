import { XService } from '../src/services/messaging/XService';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const configPath = join(process.cwd(), 'config.json');

// Load or create config
let config: any = {};
if (existsSync(configPath)) {
  config = JSON.parse(readFileSync(configPath, 'utf-8'));
}

if (!config.x) {
  config.x = {};
}

// Set OAuth 2.0 credentials
config.x.oauth2ClientId = 'OHZKMHFCcGdxWEozNG51dXFFeDA6MTpjaQ';
config.x.oauth2ClientSecret = '2SAE9qb-S66eAIbSR63-excqxsbVc3TeQGlZa53EOZUl-blp-o';
config.x.oauth2RedirectUri = 'http://localhost:3000/api/x/auth/callback';

// Also set OAuth 1.0a credentials for testing
config.x.apiKey = 'O9hHQlH0IIF4LcVjW6dj8emhWG';
config.x.apiKeySecret = 'TZtSnJ1fQDAN73ZA6Y2a9l2L4icmJo6AvQplhWxHNkxO9AjAw8';
config.x.accessToken = '1989828200801996801-3W7sMw13B4HSovMJVf2w3yxSDpyUWl';
config.x.accessTokenSecret = '0AZ1kcjFVjNnTwhaV1DvDpaEKIyLCCSfdNvh3G1560OkK';

// Set Bearer Token
config.x.bearerToken = 'AAAAAAAAAAAAAAAAAAAAAGwg5gEAAAAAiTqqQhEW44PQ45ktVJ8TKG3AAA4%3DccGKPJO1ByyvxnrXNxxppT0LEHirYIoxjEeBbO6UHwUv4SSLKx';

// Save config
writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
console.log('✅ Credenciais salvas no config.json');

// Test XService
const xService = new XService();

try {
  // Test OAuth 2.0 URL generation
  console.log('\n🧪 Testando geração de URL OAuth 2.0...');
  const authUrl = xService.getAuthorizationUrl();
  console.log('✅ URL de autorização gerada:');
  console.log(authUrl);
  console.log('\n📋 Próximos passos:');
  console.log('1. Abra a URL acima no navegador');
  console.log('2. Autorize o app');
  console.log('3. Você será redirecionado para o callback');
} catch (error: any) {
  console.error('❌ Erro ao gerar URL:', error.message);
}


