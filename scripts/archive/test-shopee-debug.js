#!/usr/bin/env node
/**
 * Teste de debug do CSV da Shopee
 */

const axios = require('axios');

const feedUrl = 'https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcFMjz35zY_7hscVJ_4QLIFiIR3DQ9hsrLcX6rgIVVFkb';

async function test() {
  try {
    console.log('📥 Baixando feed...\n');
    
    const response = await axios.get(feedUrl, {
      headers: {
        'Accept': 'text/csv',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 30000,
      responseType: 'text',
      maxContentLength: 100 * 1024 * 1024 // 100MB
    });

    console.log(`✅ Download: ${(response.data.length / 1024).toFixed(2)} KB\n`);

    // Parse CSV handling multiline fields
    const lines = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < response.data.length; i++) {
      const char = response.data[i];
      const nextChar = response.data[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentLine += '""';
          i++;
        } else {
          inQuotes = !inQuotes;
          currentLine += char;
        }
      } else if (char === '\n' && !inQuotes) {
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    console.log(`📊 Total de linhas (com parser multiline): ${lines.length}\n`);

    if (lines.length < 2) {
      console.log('⚠️  CSV muito pequeno');
      return;
    }

    // Mostrar primeira linha (header)
    console.log('📋 Header (primeiros 200 chars):');
    console.log(lines[0].substring(0, 200));
    console.log('');

    // Mostrar segunda linha (primeiro produto)
    console.log('📦 Primeira linha de produto (primeiros 300 chars):');
    console.log(lines[1].substring(0, 300));
    console.log('');

    // Tentar parsing simples
    const headerParts = lines[0].split(',');
    console.log(`📋 Colunas no header (split simples): ${headerParts.length}`);
    console.log(`   Primeiras 5: ${headerParts.slice(0, 5).join(' | ')}\n`);

    // Tentar parsing manual melhorado
    function parseLine(line) {
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

    const headers = parseLine(lines[0]);
    console.log(`📋 Colunas (parser melhorado): ${headers.length}`);
    console.log(`   Primeiras 5: ${headers.slice(0, 5).join(' | ')}\n`);

    // Processar primeiros 5 produtos
    const products = [];
    for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
      try {
        const values = parseLine(lines[i]);
        if (values.length >= headers.length) {
          const product = {};
          headers.forEach((header, index) => {
            product[header] = values[index] || '';
          });
          products.push(product);
        }
      } catch (e) {
        console.log(`Erro na linha ${i}: ${e.message}`);
      }
    }

    console.log(`✅ ${products.length} produtos processados\n`);

    if (products.length > 0) {
      console.log('📦 Primeiro produto completo:\n');
      const p = products[0];
      console.log(`Título: ${p.title?.substring(0, 80)}`);
      console.log(`ID: ${p.itemid}`);
      console.log(`Preço: ${p.price}`);
      console.log(`Sale Price: ${p.sale_price || 'N/A'}`);
      console.log(`Desconto: ${p.discount_percentage || '0'}%`);
      console.log(`Categoria: ${p.global_category1}`);
      console.log(`Link: ${p.product_short_link || p.product_link}`);
    }

  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
  }
}

test();

