#!/usr/bin/env node
/**
 * Teste direto de busca de produtos do Mercado Livre
 * Não precisa de banco de dados - apenas testa a busca
 * 
 * Usage: node scripts/test-mercadolivre-products.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const baseUrl = 'https://api.mercadolibre.com';

// Retry com backoff
async function retryRequest(requestFn, maxRetries = 5, attempt = 1) {
  try {
    return await requestFn();
  } catch (error) {
    const status = error.response?.status;
    const isRateLimit = status === 403 || status === 429;

    if (isRateLimit && attempt < maxRetries) {
      const waitTime = Math.min(500 * Math.pow(2, attempt - 1), 10000);
      console.log(`⚠️  Rate limit (${status}). Aguardando ${waitTime}ms... (tentativa ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return retryRequest(requestFn, maxRetries, attempt + 1);
    }
    throw error;
  }
}

async function searchProducts(keyword, limit = 20) {
  try {
    console.log(`\n🔍 Buscando produtos: "${keyword}" (limite: ${limit})...`);
    
    const response = await retryRequest(async () => {
      return await axios.get(`${baseUrl}/sites/MLB/search`, {
        params: {
          q: keyword,
          limit: limit,
          sort: 'price_asc',
          condition: 'new'
        },
        headers: {
          'Accept': 'application/json'
        },
        timeout: 30000
      });
    });

    if (response.data.results && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  } catch (error) {
    console.error(`❌ Erro ao buscar "${keyword}":`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

async function main() {
  console.log('🧪 ============================================');
  console.log('🧪 Teste de Busca de Produtos - Mercado Livre');
  console.log('🧪 ============================================\n');

  // Termos de busca
  const searchTerms = [
    'eletrônicos',
    'smartphone',
    'notebook',
    'fone de ouvido'
  ];

  const allProducts = [];
  const productMap = new Map(); // Para evitar duplicatas

  for (const term of searchTerms) {
    // Delay entre buscas
    if (allProducts.length > 0) {
      console.log('⏳ Aguardando 500ms antes da próxima busca...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const products = await searchProducts(term, 20);

    if (products.length > 0) {
      console.log(`✅ Encontrados ${products.length} produtos para "${term}"`);
      
      // Adicionar produtos únicos
      for (const product of products) {
        if (!productMap.has(product.id)) {
          productMap.set(product.id, product);
          allProducts.push(product);
        }
      }
    } else {
      console.log(`⚠️  Nenhum produto encontrado para "${term}"`);
    }

    // Parar se tiver muitos produtos
    if (allProducts.length >= 50) {
      console.log(`\n✅ Limite de 50 produtos atingido. Parando busca.`);
      break;
    }
  }

  console.log('\n📊 ============================================');
  console.log('📊 Resultados da Busca');
  console.log('📊 ============================================\n');

  if (allProducts.length === 0) {
    console.log('❌ Nenhum produto foi encontrado.');
    console.log('\n💡 Possíveis causas:');
    console.log('   - Rate limit ainda ativo (aguarde alguns minutos)');
    console.log('   - Problemas temporários da API');
    console.log('   - IP bloqueado');
    process.exit(1);
  }

  console.log(`✅ Total de produtos únicos encontrados: ${allProducts.length}\n`);

  // Mostrar primeiros 10 produtos
  console.log('📦 Primeiros 10 produtos encontrados:\n');
  allProducts.slice(0, 10).forEach((product, index) => {
    console.log(`${index + 1}. ${product.title.substring(0, 60)}...`);
    console.log(`   ID: ${product.id}`);
    console.log(`   Preço: R$ ${product.price}`);
    if (product.original_price) {
      const discount = ((product.original_price - product.price) / product.original_price) * 100;
      console.log(`   De: R$ ${product.original_price} por R$ ${product.price} (${discount.toFixed(1)}% OFF)`);
    }
    if (product.shipping?.free_shipping) {
      console.log(`   🚚 Frete Grátis`);
    }
    console.log(`   Link: ${product.permalink}`);
    console.log('');
  });

  // Estatísticas
  const withDiscount = allProducts.filter(p => p.original_price && p.original_price > p.price).length;
  const withFreeShipping = allProducts.filter(p => p.shipping?.free_shipping).length;
  const avgPrice = allProducts.reduce((sum, p) => sum + p.price, 0) / allProducts.length;

  console.log('📈 Estatísticas:');
  console.log(`   - Produtos com desconto: ${withDiscount} (${((withDiscount/allProducts.length)*100).toFixed(1)}%)`);
  console.log(`   - Produtos com frete grátis: ${withFreeShipping} (${((withFreeShipping/allProducts.length)*100).toFixed(1)}%)`);
  console.log(`   - Preço médio: R$ ${avgPrice.toFixed(2)}`);
  console.log(`   - Preço mínimo: R$ ${Math.min(...allProducts.map(p => p.price)).toFixed(2)}`);
  console.log(`   - Preço máximo: R$ ${Math.max(...allProducts.map(p => p.price)).toFixed(2)}`);

  console.log('\n✅ Teste concluído com sucesso!\n');
}

main().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

