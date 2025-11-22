// Script para testar a API do Mercado Livre
// Uso: node scripts/test-mercadolivre-api.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Carregar config
const configPath = path.join(process.cwd(), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const accessToken = config.mercadolivre?.accessToken;

if (!accessToken) {
  console.error('❌ Access token não encontrado no config.json');
  console.error('   Execute primeiro: node scripts/exchange-ml-token-direct.js');
  process.exit(1);
}

console.log('🧪 Testando API do Mercado Livre...');
console.log(`Access Token: ${accessToken.substring(0, 20)}...`);
console.log('');

// Teste 1: Verificar usuário
console.log('1️⃣ Testando endpoint /users/me...');
axios.get('https://api.mercadolibre.com/users/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json'
  }
})
.then(response => {
  console.log('✅ Usuário autenticado:');
  console.log(`   ID: ${response.data.id}`);
  console.log(`   Nickname: ${response.data.nickname}`);
  console.log('');
  
  // Teste 2: Buscar produtos (endpoint público - não precisa de autenticação)
  console.log('2️⃣ Testando busca de produtos (endpoint público)...');
  return axios.get('https://api.mercadolibre.com/sites/MLB/search', {
    params: {
      q: 'eletrônicos',
      limit: 5,
      sort: 'price_asc',
      condition: 'new'
    },
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
})
.then(response => {
  if (response.data.results && response.data.results.length > 0) {
    console.log(`✅ Encontrados ${response.data.results.length} produtos`);
    console.log('');
    console.log('📦 Primeiro produto:');
    const product = response.data.results[0];
    console.log(`   ID: ${product.id}`);
    console.log(`   Título: ${product.title.substring(0, 50)}...`);
    console.log(`   Preço: R$ ${product.price}`);
    console.log(`   Moeda: ${product.currency_id}`);
    console.log(`   Link: ${product.permalink}`);
    console.log('');
    console.log('✅ API do Mercado Livre está funcionando corretamente!');
    console.log('');
    console.log('📋 Resumo:');
    console.log('   ✅ Autenticação: OK');
    console.log('   ✅ Busca de produtos: OK');
    console.log('   ✅ Sistema pronto para coletar ofertas');
  } else {
    console.log('⚠️  Nenhum produto encontrado na busca');
  }
})
.catch(error => {
  console.error('❌ Erro ao testar API:');
  if (error.response) {
    console.error(`   Status: ${error.response.status}`);
    console.error(`   Erro: ${JSON.stringify(error.response.data, null, 2)}`);
    
    if (error.response.status === 401) {
      console.error('');
      console.error('⚠️  Token expirado ou inválido.');
      console.error('   Execute: node scripts/exchange-ml-token-direct.js');
    }
  } else {
    console.error(`   Erro: ${error.message}`);
  }
  process.exit(1);
});

