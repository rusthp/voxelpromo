#!/usr/bin/env node
/**
 * Teste de scraping de páginas públicas do Mercado Livre
 * Testa páginas que não requerem autenticação
 * 
 * Usage: node scripts/test-mercadolivre-scraping-public.js
 */

const axios = require('axios');
const cheerio = require('cheerio');

const testUrls = [
  'https://www.mercadolivre.com.br/ofertas',
  'https://www.mercadolivre.com.br/ofertas/eletronicos',
  'https://www.mercadolivre.com.br/ofertas/celulares',
  'https://www.mercadolivre.com.br/c/eletronicos-audio-video',
];

async function testUrl(url) {
  try {
    console.log(`\n🔍 Testando: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.mercadolivre.com.br/'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Tamanho da página: ${(response.data.length / 1024).toFixed(2)} KB`);

    const $ = cheerio.load(response.data);
    const products = [];

    // Múltiplos seletores
    const selectors = [
      'li.ui-search-layout__item',
      '.ui-search-result',
      'article[data-testid="product-card"]',
      'div[class*="item"]',
      'li[class*="item"]',
      'a[href*="/MLB-"]'
    ];

    console.log('\n🔍 Testando seletores...');
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`  ✅ ${selector}: ${elements.length} elementos encontrados`);
        
        // Extrair alguns produtos
        elements.slice(0, 5).each((index, element) => {
          const $el = $(element);
          
          // Título
          const title = $el.find('h2, .ui-search-item__title, [data-testid="product-title"]').first().text().trim() ||
                       $el.find('a').first().attr('title') ||
                       $el.find('a').first().text().trim();
          
          // Preço
          const priceText = $el.find('.price-tag, .ui-search-price, [data-testid="price"], .andes-money-amount').first().text().trim();
          const priceMatch = priceText.match(/R\$\s*([\d.,]+)/) || priceText.match(/([\d.,]+)/);
          const price = priceMatch ? parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
          
          // Link
          const link = $el.find('a[href*="/produto/"], a[href*="/MLB-"], a[href*="item.mercadolivre"]').first().attr('href');
          const productUrl = link ? (link.startsWith('http') ? link : `https://www.mercadolivre.com.br${link}`) : '';

          if (title && price && productUrl) {
            products.push({
              title: title.substring(0, 60),
              price: `R$ ${price.toFixed(2)}`,
              url: productUrl
            });
          }
        });
        break; // Usar o primeiro seletor que funcionar
      } else {
        console.log(`  ❌ ${selector}: nenhum elemento`);
      }
    }

    if (products.length > 0) {
      console.log(`\n✅ Encontrados ${products.length} produtos:`);
      products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.title}... - ${p.price}`);
      });
      return { success: true, products: products.length, url };
    } else {
      console.log('\n⚠️  Nenhum produto extraído');
      
      // Mostrar estrutura da página para debug
      const title = $('title').text();
      console.log(`\n📄 Título da página: ${title}`);
      
      // Contar links de produtos
      const productLinks = $('a[href*="/MLB-"], a[href*="/produto/"]').length;
      console.log(`🔗 Links de produtos encontrados: ${productLinks}`);
      
      return { success: false, products: 0, url };
    }

  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
    return { success: false, error: error.message, url };
  }
}

async function main() {
  console.log('🧪 ============================================');
  console.log('🧪 Teste de Scraping - Páginas Públicas ML');
  console.log('🧪 ============================================\n');

  const results = [];

  for (const url of testUrls) {
    const result = await testUrl(url);
    results.push(result);
    
    // Delay entre requisições
    if (testUrls.indexOf(url) < testUrls.length - 1) {
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
    console.log(`   - ${r.url}: ${r.products} produtos`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Falhas: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.url}: ${r.error || 'Nenhum produto encontrado'}`);
    });
  }

  const totalProducts = results.reduce((sum, r) => sum + (r.products || 0), 0);
  console.log(`\n📦 Total de produtos encontrados: ${totalProducts}`);

  if (totalProducts > 0) {
    console.log('\n✅ Scraping funcionando! Produtos encontrados.');
  } else {
    console.log('\n⚠️  Nenhum produto encontrado. Possíveis causas:');
    console.log('   - Páginas requerem JavaScript (precisa Playwright)');
    console.log('   - Estrutura HTML mudou');
    console.log('   - Rate limiting na página web');
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

