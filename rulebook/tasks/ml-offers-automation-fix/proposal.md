# Proposal: ML Offers Automation Fix

## Why
The automated renewal system for identifying and posting new offers stopped working for all platforms except Shopee. Additionally, we need to expand Mercado Livre integration capabilities to explicitly scrape specific offers and best-selling products from provided category URLs (Ofertas and Mais Vendidos).

## What Changes
1. Investigate and fix the logic in `TokenExpiryJob.ts`, `AutomationService.ts`, and `CollectorService.ts` that handles daily data collection and token renewals. Currently, Shopee runs correctly, but Amazon, AliExpress, and Mercado Livre fail to automatically collect or renew correctly in a multi-tenant environment.
2. Extend `MercadoLivreScraper.ts` and `MercadoLivreService.ts` to support scraping explicitly from `https://www.mercadolivre.com.br/ofertas` and `https://www.mercadolivre.com.br/mais-vendidos/*`.

## Impact
- Affected specs: Scraper, Automation, Collector
- Affected code:
  - `src/services/jobs/TokenExpiryJob.ts`
  - `src/services/automation/AutomationService.ts`
  - `src/services/collector/CollectorService.ts`
  - `src/services/mercadolivre/MercadoLivreScraper.ts`
  - `src/services/mercadolivre/MercadoLivreService.ts`
- Breaking change: NO
- User benefit: Restores automated deal fetching for all integrated affiliate platforms and allows targeted collection of top ML products to improve conversion rates.
