#!/usr/bin/env node
/**
 * Teste rápido de feed CSV da Shopee (amostra apenas)
 * 
 * Usage: node scripts/test-shopee-quick.js
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

const feedUrl = 'https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcFMjz35zY_7hscVJ_4QLIFiIR3DQ9hsrLcX6rgIVVFkb';

async function testQuick() {
  try {
    console.log('🧪 Teste Rápido - Feed CSV Shopee\n');
    console.log(`📥 Baixando amostra do feed...\n`);
    
    // Baixar apenas primeiras linhas usando range request
    const response = await axios.get(feedUrl, {
      headers: {
        'Accept': 'text/csv',
        'User-Agent': 'Mozilla/5.0',
        'Range': 'bytes=0-50000' // Primeiros 50KB apenas
      },
      timeout: 30000,
      responseType: 'text',
      validateStatus: (status) => status === 200 || status === 206 // Accept partial content
    });

    console.log(`✅ Download concluído`);
    console.log(`📄 Tamanho da amostra: ${(response.data.length / 1024).toFixed(2)} KB\n`);

    const lines = response.data.split('\n').filter(line => line.trim());
    console.log(`📊 Total de linhas na amostra: ${lines.length}\n`);

    if (lines.length < 2) {
      console.log('⚠️  Amostra muito pequena');
      return;
    }

    const headers = parseCSVLine(lines[0]);
    console.log(`📋 Colunas encontradas: ${headers.length}`);
    console.log(`   ${headers.slice(0, 10).join(', ')}...\n`);

    const records = [];
    const maxRecords = Math.min(20, lines.length - 1); // Máximo 20 produtos para teste rápido

    for (let i = 1; i <= maxRecords; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        if (values.length >= headers.length) {
          const record = {};
          headers.forEach((header, index) => {
            record[header] = values[index] || '';
          });
          records.push(record);
        }
      } catch (e) {
        // Ignorar linhas com erro
      }
    }

    console.log(`✅ ${records.length} produtos processados (amostra)\n`);

    if (records.length > 0) {
      console.log('📦 Primeiros 5 produtos:\n');
      records.slice(0, 5).forEach((record, index) => {
        const price = parseFloat(record.price?.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
        const salePrice = record.sale_price 
          ? parseFloat(record.sale_price.replace(/[^\d.,]/g, '').replace(',', '.') || '0')
          : price;
        const discount = record.discount_percentage ? parseFloat(record.discount_percentage) : 0;

        console.log(`${index + 1}. ${record.title?.substring(0, 60)}...`);
        console.log(`   ID: ${record.itemid}`);
        console.log(`   Preço: R$ ${salePrice.toFixed(2)}`);
        if (discount > 0) {
          console.log(`   Desconto: ${discount}%`);
        }
        console.log(`   Categoria: ${record.global_category1 || 'N/A'}`);
        console.log('');
      });

      const withDiscount = records.filter(r => r.discount_percentage && parseFloat(r.discount_percentage) > 0).length;
      console.log(`\n📈 Estatísticas da amostra:`);
      console.log(`   - Produtos com desconto: ${withDiscount}/${records.length} (${((withDiscount/records.length)*100).toFixed(1)}%)`);
    }

    console.log('\n✅ Teste concluído!');
    console.log('💡 O feed CSV da Shopee está funcionando corretamente.');
    console.log('💡 Use o serviço completo para processar todos os produtos.\n');

  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
  }
}

testQuick();




