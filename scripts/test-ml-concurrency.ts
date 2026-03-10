import { MercadoLivreScraper } from '../src/services/mercadolivre/MercadoLivreScraper';
import { logger } from '../src/utils/logger';

async function runConcurrencyTest() {
  logger.info('Starting Multi-Tenancy Concurrency Test...');

  // We use the default/empty config since this is just to test concurrency
  // Obtain the scraper instance
  const scraper = MercadoLivreScraper.getInstance();

  logger.info('Launching concurrent scraping jobs...');
  
  const startTime = Date.now();

  try {
    const results = await Promise.all([
      scraper.scrapeSearchResults('https://lista.mercadolivre.com.br/iphone'),
      scraper.scrapeSearchResults('https://lista.mercadolivre.com.br/samsung')
    ]);

    const duration = Date.now() - startTime;
    logger.info(`✅ Concurrent scraping completed in ${duration}ms!`);
    logger.info(`User A collected ${results[0].length} items.`);
    logger.info(`User B collected ${results[1].length} items.`);
    
    // Clean up
    await scraper.closeSession();
  } catch (error) {
    logger.error('❌ Test failed:', error);
  }
}

runConcurrencyTest().then(() => process.exit(0)).catch(() => process.exit(1));
