#!/usr/bin/env node
/**
 * Teste melhorado de scraping - foca na página que encontrou elementos
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function testImprovedScraping() {
  try {
    console.log('🔍 Testando scraping melhorado na página de ofertas...\n');
    
    const url = 'https://www.mercadolivre.com.br/ofertas';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    // Encontrar elementos
    const items = $('div[class*="item"]');
    console.log(`✅ Encontrados ${items.length} elementos com div[class*="item"]\n`);

    const products = [];
    
    items.slice(0, 10).each((index, element) => {
      const $el = $(element);
      
      // Pegar todo o texto do elemento para análise
      const allText = $el.text();
      const html = $el.html() || '';
      
      console.log(`\n--- Elemento ${index + 1} ---`);
      console.log(`Texto (primeiros 100 chars): ${allText.substring(0, 100)}...`);
      
      // Título - tentar múltiplas formas
      let title = $el.find('h2, h3, [class*="title"]').first().text().trim();
      if (!title) {
        const link = $el.find('a').first();
        title = link.attr('title') || link.text().trim();
      }
      if (!title) {
        // Tentar extrair do texto
        const titleMatch = allText.match(/^([^\n]{10,80})/);
        title = titleMatch ? titleMatch[1].trim() : '';
      }
      console.log(`Título: ${title.substring(0, 60)}...`);
      
      // Preço - buscar no texto completo
      const priceMatch = allText.match(/R\$\s*([\d.,]+)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : null;
      console.log(`Preço encontrado: ${price ? 'R$ ' + price.toFixed(2) : 'NÃO ENCONTRADO'}`);
      
      // Link
      const link = $el.find('a[href*="mercadolivre"], a[href*="/MLB-"], a[href*="/produto/"]').first().attr('href');
      const productUrl = link ? (link.startsWith('http') ? link : `https://www.mercadolivre.com.br${link}`) : '';
      console.log(`URL: ${productUrl.substring(0, 80)}...`);
      
      // Imagem
      const img = $el.find('img').first();
      const imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy') || '';
      console.log(`Imagem: ${imageUrl.substring(0, 60)}...`);
      
      if (title && price && productUrl) {
        products.push({
          title: title.substring(0, 100),
          price: price,
          url: productUrl,
          image: imageUrl
        });
        console.log('✅ PRODUTO VÁLIDO!');
      } else {
        console.log('❌ Produto inválido (faltam dados)');
      }
    });

    console.log(`\n\n📊 ============================================`);
    console.log(`📊 Resumo: ${products.length} produtos válidos de ${items.length} elementos`);
    console.log(`📊 ============================================\n`);

    if (products.length > 0) {
      console.log('✅ Produtos encontrados:\n');
      products.forEach((p, i) => {
        console.log(`${i + 1}. ${p.title}`);
        console.log(`   Preço: R$ ${p.price.toFixed(2)}`);
        console.log(`   URL: ${p.url}\n`);
      });
    } else {
      console.log('⚠️  Nenhum produto válido extraído.');
      console.log('\n💡 Análise:');
      console.log('   - Elementos encontrados mas dados não extraídos');
      console.log('   - Pode ser que a página carregue conteúdo via JavaScript');
      console.log('   - Considere usar Playwright para renderizar JavaScript');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
  }
}

testImprovedScraping();

