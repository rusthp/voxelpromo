#!/usr/bin/env node
/**
 * Teste de scraping da página de afiliados do Mercado Livre
 * 
 * Usage: node scripts/test-mercadolivre-scraping.js
 */

const axios = require('axios');
const cheerio = require('cheerio');

const hubUrl = 'https://www.mercadolivre.com.br/afiliados/hub';

async function scrapeAffiliatesHub() {
  try {
    console.log('🔍 Fazendo scraping da página de afiliados...');
    console.log(`URL: ${hubUrl}\n`);

    const response = await axios.get(hubUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const products = [];

    console.log('📦 Procurando produtos na página...\n');

    // Múltiplos seletores para tentar encontrar produtos
    const selectors = [
      'article[data-testid="product-card"]',
      '.ui-search-result',
      '[data-testid="product"]',
      'a[href*="/produto/"]',
      'a[href*="/MLB-"]'
    ];

    let found = false;
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`✅ Encontrados ${elements.length} elementos com seletor: ${selector}\n`);
        found = true;
        
        elements.slice(0, 10).each((index, element) => {
          const $el = $(element);
          
          // Título
          const title = $el.find('h2, .ui-search-item__title, [data-testid="product-title"]').first().text().trim() ||
                       $el.find('a').first().attr('title') ||
                       $el.find('a').first().text().trim();
          
          // Preço
          const priceText = $el.find('.price-tag, .ui-search-price, [data-testid="price"]').first().text().trim();
          const priceMatch = priceText.match(/R\$\s*([\d.,]+)/);
          const price = priceMatch ? parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
          
          // Link
          const link = $el.find('a[href*="/produto/"], a[href*="/MLB-"]').first().attr('href');
          const productUrl = link ? (link.startsWith('http') ? link : `https://www.mercadolivre.com.br${link}`) : '';
          
          // Imagem
          const image = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';

          if (title && price) {
            products.push({
              index: index + 1,
              title: title.substring(0, 60),
              price: `R$ ${price.toFixed(2)}`,
              url: productUrl,
              image: image.substring(0, 50) + '...'
            });
          }
        });
        break;
      }
    }

    if (!found) {
      console.log('⚠️  Nenhum produto encontrado com os seletores padrão.');
      console.log('\n🔍 Analisando estrutura da página...\n');
      
      // Mostrar algumas informações sobre a página
      const title = $('title').text();
      const bodyText = $('body').text().substring(0, 500);
      
      console.log(`Título da página: ${title}`);
      console.log(`\nPrimeiros 500 caracteres do body:`);
      console.log(bodyText);
      console.log('\n💡 A estrutura da página pode ter mudado.');
      console.log('   Verifique manualmente a URL e os seletores CSS.');
    }

    if (products.length > 0) {
      console.log(`\n✅ Encontrados ${products.length} produtos:\n`);
      products.forEach(product => {
        console.log(`${product.index}. ${product.title}...`);
        console.log(`   Preço: ${product.price}`);
        console.log(`   URL: ${product.url}`);
        console.log('');
      });
    } else {
      console.log('\n❌ Nenhum produto foi extraído.');
      console.log('\n💡 Possíveis causas:');
      console.log('   - A página requer autenticação');
      console.log('   - A estrutura HTML mudou');
      console.log('   - A página carrega conteúdo via JavaScript (precisa de Playwright)');
    }

  } catch (error) {
    console.error('\n❌ Erro ao fazer scraping:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   URL: ${error.config?.url}`);
    }
  }
}

scrapeAffiliatesHub();

