#!/usr/bin/env node
/**
 * Complete test script for Mercado Livre integration
 * Tests token validity, auto-refresh, and product search
 * 
 * Usage: node scripts/test-mercadolivre-complete.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import the service (we'll need to use it via require or create a simpler version)
// For now, let's create a simplified version that uses axios directly

class MercadoLivreTester {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config.json');
    this.baseUrl = 'https://api.mercadolibre.com';
    this.authUrl = 'https://auth.mercadolivre.com.br';
    this.results = [];
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };
    console.log(`${icons[type]} ${message}`);
  }

  addResult(step, success, message, data = null) {
    this.results.push({ step, success, message, data });
  }

  loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error('config.json not found');
      }
      return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  saveConfig(config) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  checkTokenExpiration(tokenExpiresAt) {
    if (!tokenExpiresAt) {
      return {
        expired: true,
        expiresIn: 0,
        expiresInHours: 0,
        expiresInMinutes: 0,
        expiresAt: null
      };
    }

    const now = Date.now();
    const isExpired = now >= tokenExpiresAt;
    const expiresIn = Math.max(0, Math.floor((tokenExpiresAt - now) / 1000));

    return {
      expired: isExpired,
      expiresIn,
      expiresInHours: Math.floor(expiresIn / 3600),
      expiresInMinutes: Math.floor((expiresIn % 3600) / 60),
      expiresAt: new Date(tokenExpiresAt).toISOString()
    };
  }

  async testTokenValidity(accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return response.status === 200 && response.data?.id;
    } catch (error) {
      if (error.response?.status === 401) {
        return false; // Token invalid or expired
      }
      throw error;
    }
  }

  async refreshAccessToken(config) {
    if (!config.mercadolivre.refreshToken) {
      throw new Error('Refresh token not available');
    }

    if (!config.mercadolivre.clientId || !config.mercadolivre.clientSecret) {
      throw new Error('Client ID or Client Secret not configured');
    }

    const response = await axios.post(
      `${this.baseUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.mercadolivre.clientId,
        client_secret: config.mercadolivre.clientSecret,
        refresh_token: config.mercadolivre.refreshToken
      }),
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in
    };
  }

  async step1_CheckConfig() {
    this.log('Step 1: Verificando configuração...', 'info');
    
    try {
      const config = this.loadConfig();
      const mlConfig = config.mercadolivre;

      if (!mlConfig) {
        this.log('Configuração do Mercado Livre não encontrada', 'error');
        this.addResult('config', false, 'Mercado Livre config not found');
        return false;
      }

      if (!mlConfig.clientId) {
        this.log('Client ID não configurado', 'error');
        this.addResult('config', false, 'Client ID not configured');
        return false;
      }

      if (!mlConfig.clientSecret) {
        this.log('Client Secret não configurado (necessário apenas para renovar token)', 'warning');
        // Don't fail - product search works without it
      }

      this.log(`Client ID: ${mlConfig.clientId}`, 'success');
      this.addResult('config', true, 'Configuration loaded', {
        clientId: mlConfig.clientId,
        hasClientSecret: !!mlConfig.clientSecret,
        hasAccessToken: !!mlConfig.accessToken,
        hasRefreshToken: !!mlConfig.refreshToken
      });
      return true;
    } catch (error) {
      this.log(`Erro ao carregar configuração: ${error.message}`, 'error');
      this.addResult('config', false, error.message);
      return false;
    }
  }

  async step2_CheckTokenStatus() {
    this.log('Step 2: Verificando status do token...', 'info');

    try {
      const config = this.loadConfig();
      const mlConfig = config.mercadolivre;

      const hasToken = !!mlConfig.accessToken;
      const hasRefreshToken = !!mlConfig.refreshToken;
      const expiration = this.checkTokenExpiration(mlConfig.tokenExpiresAt);

      if (!hasToken) {
        this.log('Token de acesso não encontrado', 'error');
        this.addResult('token_status', false, 'Access token not found');
        return { hasToken: false, hasRefreshToken, expiration };
      }

      this.log(`Token encontrado: ${mlConfig.accessToken.substring(0, 20)}...`, 'success');
      
      if (expiration.expired) {
        this.log(`Token EXPIRADO em ${expiration.expiresAt}`, 'warning');
        this.addResult('token_status', false, 'Token expired', expiration);
      } else {
        this.log(`Token válido - Expira em ${expiration.expiresInHours}h ${expiration.expiresInMinutes}m`, 'success');
        this.log(`Expira em: ${expiration.expiresAt}`, 'info');
        this.addResult('token_status', true, 'Token valid', expiration);
      }

      if (!hasRefreshToken) {
        this.log('Refresh token não encontrado - não será possível renovar automaticamente', 'warning');
      } else {
        this.log('Refresh token encontrado', 'success');
      }

      return { hasToken, hasRefreshToken, expiration, config };
    } catch (error) {
      this.log(`Erro ao verificar token: ${error.message}`, 'error');
      this.addResult('token_status', false, error.message);
      return { hasToken: false, hasRefreshToken: false, expiration: this.checkTokenExpiration(), config: null };
    }
  }

  async step3_TestTokenValidity(accessToken) {
    this.log('Step 3: Testando validade do token na API...', 'info');

    try {
      const isValid = await this.testTokenValidity(accessToken);
      
      if (isValid) {
        this.log('Token válido na API do Mercado Livre', 'success');
        this.addResult('token_validity', true, 'Token is valid');
        return true;
      } else {
        this.log('Token inválido ou expirado na API', 'error');
        this.addResult('token_validity', false, 'Token is invalid or expired');
        return false;
      }
    } catch (error) {
      this.log(`Erro ao testar token: ${error.message}`, 'error');
      this.addResult('token_validity', false, error.message);
      return false;
    }
  }

  async step4_RefreshTokenIfNeeded(hasToken, hasRefreshToken, expiration, config) {
    this.log('Step 4: Verificando se precisa renovar token...', 'info');

    // Check if refresh is needed
    const needsRefresh = !hasToken || expiration.expired || expiration.expiresInHours < 1;

    if (!needsRefresh) {
      this.log('Token ainda válido - não precisa renovar', 'success');
      this.addResult('token_refresh', true, 'Token refresh not needed');
      return { success: true, config };
    }

    if (!hasRefreshToken) {
      this.log('Não é possível renovar: refresh token não encontrado', 'error');
      this.log('Solução: Obtenha um novo token via OAuth flow', 'info');
      this.addResult('token_refresh', false, 'Refresh token not available');
      return { success: false, config };
    }

    this.log('Tentando renovar token automaticamente...', 'info');

    try {
      const tokens = await this.refreshAccessToken(config);
      
      // Save new tokens
      config.mercadolivre.accessToken = tokens.access_token;
      config.mercadolivre.refreshToken = tokens.refresh_token;
      config.mercadolivre.tokenExpiresAt = Date.now() + (tokens.expires_in * 1000);
      this.saveConfig(config);

      this.log('✅ Token renovado com sucesso!', 'success');
      this.log(`Novo token expira em ${tokens.expires_in} segundos (${Math.floor(tokens.expires_in / 3600)} horas)`, 'info');
      this.addResult('token_refresh', true, 'Token refreshed successfully', {
        expiresIn: tokens.expires_in,
        expiresInHours: Math.floor(tokens.expires_in / 3600)
      });
      return { success: true, config };
    } catch (error) {
      this.log(`Erro ao renovar token: ${error.message}`, 'error');
      this.addResult('token_refresh', false, error.message);
      return { success: false, config };
    }
  }

  async step5_TestProductSearch() {
    this.log('Step 5: Testando busca de produtos...', 'info');

    try {
      // Test with a simple search (public endpoint - no auth required)
      const response = await axios.get(`${this.baseUrl}/sites/MLB/search`, {
        params: {
          q: 'eletrônicos',
          limit: 5,
          sort: 'price_asc',
          condition: 'new'
        },
        headers: {
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      const products = response.data.results || [];

      if (products.length === 0) {
        this.log('Nenhum produto encontrado', 'warning');
        this.addResult('product_search', false, 'No products found');
        return false;
      }

      this.log(`✅ Encontrados ${products.length} produtos`, 'success');
      this.log('', 'info');
      
      // Show first product details
      const firstProduct = products[0];
      this.log('📦 Primeiro produto encontrado:', 'info');
      this.log(`   ID: ${firstProduct.id}`, 'info');
      this.log(`   Título: ${firstProduct.title.substring(0, 60)}...`, 'info');
      this.log(`   Preço: R$ ${firstProduct.price}`, 'info');
      this.log(`   Moeda: ${firstProduct.currency_id}`, 'info');
      this.log(`   Condição: ${firstProduct.condition}`, 'info');
      if (firstProduct.shipping?.free_shipping) {
        this.log(`   🚚 Frete Grátis`, 'success');
      }
      if (firstProduct.original_price) {
        const discount = ((firstProduct.original_price - firstProduct.price) / firstProduct.original_price) * 100;
        this.log(`   💰 Desconto: ${discount.toFixed(1)}% (de R$ ${firstProduct.original_price} para R$ ${firstProduct.price})`, 'success');
      }
      this.log(`   Link: ${firstProduct.permalink}`, 'info');

      this.addResult('product_search', true, `Found ${products.length} products`, {
        count: products.length,
        firstProduct: {
          id: firstProduct.id,
          title: firstProduct.title.substring(0, 50),
          price: firstProduct.price,
          currency: firstProduct.currency_id
        }
      });

      return true;
    } catch (error) {
      this.log(`Erro ao buscar produtos: ${error.message}`, 'error');
      if (error.response) {
        this.log(`   Status: ${error.response.status}`, 'error');
        this.log(`   Data: ${JSON.stringify(error.response.data)}`, 'error');
        
        if (error.response.status === 403) {
          this.log('   💡 Possíveis causas:', 'info');
          this.log('      - Rate limiting (muitas requisições)', 'info');
          this.log('      - IP bloqueado temporariamente', 'info');
          this.log('      - Problemas temporários da API', 'info');
          this.log('   💡 Solução: Aguarde alguns minutos e tente novamente', 'info');
        }
      }
      this.addResult('product_search', false, error.message);
      return false;
    }
  }

  async step6_TestHotDeals() {
    this.log('Step 6: Testando busca de ofertas quentes...', 'info');

    try {
      // Try multiple search terms to find deals
      const searchTerms = ['ofertas', 'promoção', 'desconto'];
      const allDeals = [];

      for (const term of searchTerms) {
        try {
          const response = await axios.get(`${this.baseUrl}/sites/MLB/search`, {
            params: {
              q: term,
              limit: 5,
              sort: 'price_asc',
              condition: 'new'
            },
            headers: {
              'Accept': 'application/json'
            },
            timeout: 30000
          });

          const products = response.data.results || [];
          for (const product of products) {
            if (!allDeals.find(d => d.id === product.id)) {
              allDeals.push(product);
            }
          }

          if (allDeals.length >= 5) break;
        } catch (error) {
          // Continue with next term
        }
      }

      if (allDeals.length === 0) {
        this.log('Nenhuma oferta encontrada', 'warning');
        this.addResult('hot_deals', false, 'No hot deals found');
        return false;
      }

      this.log(`✅ Encontradas ${allDeals.length} ofertas quentes`, 'success');
      this.addResult('hot_deals', true, `Found ${allDeals.length} hot deals`, {
        count: allDeals.length
      });

      return true;
    } catch (error) {
      this.log(`Erro ao buscar ofertas: ${error.message}`, 'error');
      this.addResult('hot_deals', false, error.message);
      return false;
    }
  }

  printSummary() {
    console.log('\n📊 ============================================');
    console.log('📊 Resumo dos Testes');
    console.log('📊 ============================================\n');

    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;

    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.step}: ${result.message}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log(`Resultado: ${successCount}/${totalCount} testes passaram`);
    
    if (successCount === totalCount) {
      console.log('🎉 Todos os testes passaram! Sistema funcionando corretamente.');
    } else {
      console.log('⚠️  Alguns testes falharam. Verifique os erros acima.');
    }
    console.log('='.repeat(50) + '\n');
  }

  async runAllTests() {
    console.log('\n🧪 ============================================');
    console.log('🧪 Teste Completo - Mercado Livre Integration');
    console.log('🧪 ============================================\n');

    // Step 1: Check config
    const configOk = await this.step1_CheckConfig();
    if (!configOk) {
      console.log('\n⚠️  Algumas configurações estão faltando, mas continuando com testes básicos...\n');
    }

    // Step 2: Check token status
    const tokenStatus = await this.step2_CheckTokenStatus();
    console.log('');

    // Step 3: Test token validity (if token exists)
    let tokenValid = false;
    if (tokenStatus.hasToken) {
      tokenValid = await this.step3_TestTokenValidity(tokenStatus.config.mercadolivre.accessToken);
      console.log('');
    }

    // Step 4: Refresh token if needed
    const refreshResult = await this.step4_RefreshTokenIfNeeded(
      tokenStatus.hasToken,
      tokenStatus.hasRefreshToken,
      tokenStatus.expiration,
      tokenStatus.config
    );
    console.log('');

    // If token was refreshed, test it again
    if (refreshResult.success && !tokenValid) {
      tokenValid = await this.step3_TestTokenValidity(refreshResult.config.mercadolivre.accessToken);
      console.log('');
    }

    // Step 5: Test product search (works without auth, but better with valid token)
    await this.step5_TestProductSearch();
    console.log('');

    // Step 6: Test hot deals
    await this.step6_TestHotDeals();
    console.log('');

    // Print summary
    this.printSummary();
  }
}

// Run tests
async function main() {
  const tester = new MercadoLivreTester();
  await tester.runAllTests();
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

