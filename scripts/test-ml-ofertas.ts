import { MercadoLivreScraper } from '../src/services/mercadolivre/MercadoLivreScraper';

async function verifyScraper() {
  console.log('--- Starting Mercado Livre Scraper Verification ---');
  const scraper = MercadoLivreScraper.getInstance();
  
  console.log('\n[1/2] Testing /ofertas extraction...');
  const ofertas = await scraper.scrapeOfertas(3);
  console.log(`Extracted ${ofertas.length} ofertas:`);
  console.log(JSON.stringify(ofertas, null, 2));

  console.log('\n[2/2] Testing /mais-vendidos extraction (Category: MLB1051 - Celulares)...');
  const trending = await scraper.scrapeMaisVendidos('https://www.mercadolivre.com.br/mais-vendidos/MLB1051', 3);
  console.log(`Extracted ${trending.length} trending items:`);
  console.log(JSON.stringify(trending, null, 2));

  if (ofertas.length > 0 || trending.length > 0) {
    console.log('\n✅ Verification successful: Fallback Scraper bypassed blocks.');
  } else {
    console.error('\n❌ Verification failed: No items found. Selectors might need updating.');
  }
}

verifyScraper().catch(console.error);
