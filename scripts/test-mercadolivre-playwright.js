#!/usr/bin/env node
/**
 * Teste de scraping com Playwright (renderiza JavaScript)
 * 
 * Usage: node scripts/test-mercadolivre-playwright.js
 */

const { chromium } = require('playwright');

async function testWithPlaywright() {
  let browser;
  try {
    console.log('🚀 Iniciando Playwright...\n');
    
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('📄 Carregando página de ofertas...');
    await page.goto('https://www.mercadolivre.com.br/ofertas', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('⏳ Aguardando produtos carregarem...');
    // Aguardar produtos aparecerem
    await page.waitForSelector('li.ui-search-layout__item, article[data-testid="product-card"]', {
      timeout: 10000
    }).catch(() => {
      console.log('⚠️  Seletores padrão não encontrados, tentando outros...');
    });
    
    // Aguardar um pouco mais para garantir que tudo carregou
    await page.waitForTimeout(2000);
    
    console.log('🔍 Extraindo produtos...\n');
    
    // Extrair produtos usando JavaScript no contexto da página
    const products = await page.evaluate(() => {
      const items = [];
      
      // Múltiplos seletores
      const selectors = [
        'li.ui-search-layout__item',
        'article[data-testid="product-card"]',
        '.ui-search-result',
        '[data-testid="product"]'
      ];
      
      let elements = [];
      for (const selector of selectors) {
        elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) break;
      }
      
      if (elements.length === 0) {
        // Fallback: buscar qualquer link de produto
        elements = Array.from(document.querySelectorAll('a[href*="/MLB-"], a[href*="/produto/"]'));
        elements = elements.map(el => el.closest('li, article, div[class*="item"]')).filter(Boolean);
      }
      
      elements.slice(0, 20).forEach((element) => {
        try {
          // Título
          const titleEl = element.querySelector('h2, .ui-search-item__title, [data-testid="product-title"]');
          let title = titleEl ? titleEl.textContent.trim() : '';
          
          if (!title) {
            const linkEl = element.querySelector('a[href*="/MLB-"], a[href*="/produto/"]');
            title = linkEl ? (linkEl.getAttribute('title') || linkEl.textContent.trim()) : '';
          }
          
          // Preço
          const priceEl = element.querySelector('.price-tag, .ui-search-price, [data-testid="price"], .andes-money-amount');
          let priceText = priceEl ? priceEl.textContent.trim() : '';
          
          if (!priceText) {
            // Buscar no texto completo
            const allText = element.textContent;
            const match = allText.match(/R\$\s*([\d.,]+)/);
            priceText = match ? `R$ ${match[1]}` : '';
          }
          
          const priceMatch = priceText.match(/R\$\s*([\d.,]+)/) || priceText.match(/([\d.,]+)/);
          const price = priceMatch ? parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
          
          // URL
          const linkEl = element.querySelector('a[href*="/MLB-"], a[href*="/produto/"], a[href*="item.mercadolivre"]');
          const href = linkEl ? linkEl.getAttribute('href') : '';
          const productUrl = href ? (href.startsWith('http') ? href : `https://www.mercadolivre.com.br${href}`) : '';
          
          // Imagem
          const imgEl = element.querySelector('img');
          const imageUrl = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';
          
          // ID do produto
          const idMatch = productUrl.match(/MLB-(\d+)/) || productUrl.match(/\/produto\/([^\/\?]+)/);
          const productId = idMatch ? idMatch[1] : null;
          
          if (title && price && productUrl && productId) {
            items.push({
              id: productId,
              title: title.substring(0, 100),
              price: price,
              url: productUrl,
              image: imageUrl.substring(0, 100)
            });
          }
        } catch (e) {
          // Ignorar erros em elementos individuais
        }
      });
      
      return items;
    });
    
    console.log(`✅ Encontrados ${products.length} produtos!\n`);
    
    if (products.length > 0) {
      console.log('📦 Produtos encontrados:\n');
      products.forEach((p, i) => {
        console.log(`${i + 1}. ${p.title}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Preço: R$ ${p.price.toFixed(2)}`);
        console.log(`   URL: ${p.url}`);
        console.log('');
      });
      
      console.log(`\n✅ Sucesso! ${products.length} produtos extraídos com Playwright!`);
    } else {
      console.log('⚠️  Nenhum produto encontrado.');
      console.log('\n💡 Tentando buscar elementos na página...');
      
      // Debug: ver quantos elementos existem
      const elementCount = await page.evaluate(() => {
        return {
          items: document.querySelectorAll('li.ui-search-layout__item').length,
          articles: document.querySelectorAll('article[data-testid="product-card"]').length,
          links: document.querySelectorAll('a[href*="/MLB-"]').length,
          allLinks: document.querySelectorAll('a[href*="mercadolivre"]').length
        };
      });
      
      console.log('Elementos na página:', elementCount);
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

testWithPlaywright();

