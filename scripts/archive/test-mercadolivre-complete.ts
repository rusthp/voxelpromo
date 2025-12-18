#!/usr/bin/env ts-node
/**
 * Complete test script for Mercado Livre integration
 * Tests token validity, auto-refresh, and product search
 * 
 * Usage: npx ts-node scripts/test-mercadolivre-complete.ts
 */

import { MercadoLivreService } from '../src/services/mercadolivre/MercadoLivreService';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

class MercadoLivreTester {
  private service: MercadoLivreService;
  private configPath: string;
  private results: TestResult[] = [];

  constructor() {
    this.service = new MercadoLivreService();
    this.configPath = join(process.cwd(), 'config.json');
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };
    console.log(`${icons[type]} ${message}`);
  }

  private addResult(step: string, success: boolean, message: string, data?: any) {
    this.results.push({ step, success, message, data });
  }

  /**
   * Load config from config.json
   */
  private loadConfig(): any {
    try {
      if (!existsSync(this.configPath)) {
        throw new Error('config.json not found');
      }
      return JSON.parse(readFileSync(this.configPath, 'utf-8'));
    } catch (error: any) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  /**
   * Save config to config.json
   */
  private saveConfig(config: any): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  /**
   * Check token expiration status
   */
  private checkTokenExpiration(tokenExpiresAt?: number): {
    expired: boolean;
    expiresIn: number;
    expiresInHours: number;
    expiresInMinutes: number;
    expiresAt: string | null;
  } {
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

  /**
   * Test token validity by calling /users/me endpoint
   */
  private async testTokenValidity(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get('https://api.mercadolibre.com/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return response.status === 200 && response.data?.id;
    } catch (error: any) {
      if (error.response?.status === 401) {
        return false; // Token invalid or expired
      }
      throw error;
    }
  }

  /**
   * Step 1: Check configuration
   */
  async step1_CheckConfig(): Promise<boolean> {
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
        this.log('Client Secret não configurado', 'warning');
        this.addResult('config', false, 'Client Secret not configured');
        return false;
      }

      this.log(`Client ID: ${mlConfig.clientId}`, 'success');
      this.addResult('config', true, 'Configuration loaded', {
        clientId: mlConfig.clientId,
        hasClientSecret: !!mlConfig.clientSecret,
        hasAccessToken: !!mlConfig.accessToken,
        hasRefreshToken: !!mlConfig.refreshToken
      });
      return true;
    } catch (error: any) {
      this.log(`Erro ao carregar configuração: ${error.message}`, 'error');
      this.addResult('config', false, error.message);
      return false;
    }
  }

  /**
   * Step 2: Check token status
   */
  async step2_CheckTokenStatus(): Promise<{
    hasToken: boolean;
    hasRefreshToken: boolean;
    expiration: ReturnType<typeof this.checkTokenExpiration>;
  }> {
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

      return { hasToken, hasRefreshToken, expiration };
    } catch (error: any) {
      this.log(`Erro ao verificar token: ${error.message}`, 'error');
      this.addResult('token_status', false, error.message);
      return { hasToken: false, hasRefreshToken: false, expiration: this.checkTokenExpiration() };
    }
  }

  /**
   * Step 3: Test token validity
   */
  async step3_TestTokenValidity(accessToken: string): Promise<boolean> {
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
    } catch (error: any) {
      this.log(`Erro ao testar token: ${error.message}`, 'error');
      this.addResult('token_validity', false, error.message);
      return false;
    }
  }

  /**
   * Step 4: Refresh token if needed
   */
  async step4_RefreshTokenIfNeeded(
    hasToken: boolean,
    hasRefreshToken: boolean,
    expiration: ReturnType<typeof this.checkTokenExpiration>
  ): Promise<boolean> {
    this.log('Step 4: Verificando se precisa renovar token...', 'info');

    // Check if refresh is needed
    const needsRefresh = !hasToken || expiration.expired || expiration.expiresInHours < 1;

    if (!needsRefresh) {
      this.log('Token ainda válido - não precisa renovar', 'success');
      this.addResult('token_refresh', true, 'Token refresh not needed');
      return true;
    }

    if (!hasRefreshToken) {
      this.log('Não é possível renovar: refresh token não encontrado', 'error');
      this.log('Solução: Obtenha um novo token via OAuth flow', 'info');
      this.addResult('token_refresh', false, 'Refresh token not available');
      return false;
    }

    this.log('Tentando renovar token automaticamente...', 'info');

    try {
      const tokens = await this.service.refreshAccessToken();
      
      // Save new tokens
      const config = this.loadConfig();
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
      return true;
    } catch (error: any) {
      this.log(`Erro ao renovar token: ${error.message}`, 'error');
      this.addResult('token_refresh', false, error.message);
      return false;
    }
  }

  /**
   * Step 5: Test product search
   */
  async step5_TestProductSearch(): Promise<boolean> {
    this.log('Step 5: Testando busca de produtos...', 'info');

    try {
      // Test with a simple search
      const products = await this.service.searchProducts('eletrônicos', 5, {
        sort: 'price_asc',
        condition: 'new'
      });

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
    } catch (error: any) {
      this.log(`Erro ao buscar produtos: ${error.message}`, 'error');
      this.addResult('product_search', false, error.message);
      return false;
    }
  }

  /**
   * Step 6: Test hot deals
   */
  async step6_TestHotDeals(): Promise<boolean> {
    this.log('Step 6: Testando busca de ofertas quentes...', 'info');

    try {
      const deals = await this.service.getHotDeals(5);

      if (deals.length === 0) {
        this.log('Nenhuma oferta encontrada', 'warning');
        this.addResult('hot_deals', false, 'No hot deals found');
        return false;
      }

      this.log(`✅ Encontradas ${deals.length} ofertas quentes`, 'success');
      this.addResult('hot_deals', true, `Found ${deals.length} hot deals`, {
        count: deals.length
      });

      return true;
    } catch (error: any) {
      this.log(`Erro ao buscar ofertas: ${error.message}`, 'error');
      this.addResult('hot_deals', false, error.message);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n🧪 ============================================');
    console.log('🧪 Teste Completo - Mercado Livre Integration');
    console.log('🧪 ============================================\n');

    // Step 1: Check config
    const configOk = await this.step1_CheckConfig();
    if (!configOk) {
      console.log('\n❌ Teste interrompido: configuração inválida\n');
      this.printSummary();
      process.exit(1);
    }

    // Step 2: Check token status
    const tokenStatus = await this.step2_CheckTokenStatus();
    console.log('');

    // Step 3: Test token validity (if token exists)
    let tokenValid = false;
    if (tokenStatus.hasToken) {
      const config = this.loadConfig();
      tokenValid = await this.step3_TestTokenValidity(config.mercadolivre.accessToken);
      console.log('');
    }

    // Step 4: Refresh token if needed
    const refreshOk = await this.step4_RefreshTokenIfNeeded(
      tokenStatus.hasToken,
      tokenStatus.hasRefreshToken,
      tokenStatus.expiration
    );
    console.log('');

    // If token was refreshed, test it again
    if (refreshOk && !tokenValid) {
      const config = this.loadConfig();
      tokenValid = await this.step3_TestTokenValidity(config.mercadolivre.accessToken);
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

  /**
   * Print test summary
   */
  private printSummary(): void {
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

