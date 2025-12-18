#!/usr/bin/env node
/**
 * Teste de download e processamento de feed CSV da Shopee
 * 
 * Usage: node scripts/test-shopee-feed.js
 */

const axios = require('axios');

// Simple CSV parser
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const feedUrls = [
  'https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcPNcbnfdFhhQkoz1FtnUm6DtED25ejObtofpYLqHBC0h',
  'https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcFMjz35zY_7hscVJ_4QLIFiIR3DQ9hsrLcX6rgIVVFkb'
];

async function testFeed(feedUrl) {
  try {
    console.log(`\n📥 Testando feed: ${feedUrl.substring(0, 80)}...\n`);
    
    const startTime = Date.now();
    const response = await axios.get(feedUrl, {
      headers: {
        'Accept': 'text/csv, application/csv',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 60000,
      responseType: 'text',
      maxContentLength: 50 * 1024 * 1024 // 50MB
    });

    const downloadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Download concluído em ${downloadTime}s`);
    console.log(`📄 Tamanho: ${(response.data.length / 1024).toFixed(2)} KB\n`);

    console.log('📊 Parsing CSV...');
    const lines = response.data.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    const records = [];
    
    for (let i = 1; i < lines.length && i < 1000; i++) { // Limit to 1000 for testing
      const values = parseCSVLine(lines[i]);
      if (values.length >= headers.length) {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        records.push(record);
      }
    }

    console.log(`✅ ${records.length} produtos encontrados no CSV\n`);

    if (records.length > 0) {
      console.log('📦 Primeiros 5 produtos:\n');
      records.slice(0, 5).forEach((record, index) => {
        const price = parseFloat(record.price?.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
        const salePrice = record.sale_price 
          ? parseFloat(record.sale_price.replace(/[^\d.,]/g, '').replace(',', '.') || '0')
          : price;
        const discount = record.discount_percentage || 0;

        console.log(`${index + 1}. ${record.title?.substring(0, 60)}...`);
        console.log(`   ID: ${record.itemid}`);
        console.log(`   Preço: R$ ${salePrice.toFixed(2)}`);
        if (discount > 0) {
          console.log(`   Desconto: ${discount}%`);
        }
        console.log(`   Categoria: ${record.global_category1 || 'N/A'}`);
        console.log(`   Link: ${record.product_short_link || record.product_link}`);
        console.log('');
      });

      // Estatísticas
      const withDiscount = records.filter(r => r.discount_percentage && parseFloat(r.discount_percentage) > 0).length;
      const avgPrice = records.reduce((sum, r) => {
        const p = parseFloat(r.price?.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
        return sum + p;
      }, 0) / records.length;

      console.log('📈 Estatísticas:');
      console.log(`   - Total de produtos: ${records.length}`);
      console.log(`   - Produtos com desconto: ${withDiscount} (${((withDiscount/records.length)*100).toFixed(1)}%)`);
      console.log(`   - Preço médio: R$ ${avgPrice.toFixed(2)}`);
    }

    return { success: true, count: records.length };
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 ============================================');
  console.log('🧪 Teste de Feed CSV - Shopee');
  console.log('🧪 ============================================\n');

  const results = [];

  for (const feedUrl of feedUrls) {
    const result = await testFeed(feedUrl);
    results.push({ ...result, url: feedUrl.substring(0, 80) });
    
    // Delay entre feeds
    if (feedUrls.indexOf(feedUrl) < feedUrls.length - 1) {
      console.log('⏳ Aguardando 2 segundos antes do próximo feed...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n📊 ============================================');
  console.log('📊 Resumo dos Testes');
  console.log('📊 ============================================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Sucessos: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.count} produtos encontrados`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Falhas: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   - Erro: ${r.error}`);
    });
  }

  const totalProducts = results.reduce((sum, r) => sum + (r.count || 0), 0);
  console.log(`\n📦 Total de produtos: ${totalProducts}`);

  if (totalProducts > 0) {
    console.log('\n✅ Feeds da Shopee funcionando perfeitamente!');
    console.log('💡 Agora você pode usar esses feeds para coletar produtos.');
  } else {
    console.log('\n⚠️  Nenhum produto encontrado nos feeds.');
  }

  console.log('');
}

main().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

