## 1. Automation Fix Phase
- [ ] 1.1 Debug `CollectorService` and `TokenExpiryJob` to identify why only Shopee runs correctly
- [ ] 1.2 Fix the failure point in the automation system for Amazon, AliExpress, and Mercado Livre
- [ ] 1.3 Add robust error logging and test `CollectorService` for multi-tenant users

## 2. Mercado Livre Upgrade Phase
- [ ] 2.1 Add method in `MercadoLivreScraper.ts` to scrape `/ofertas` correctly
- [ ] 2.2 Add method in `MercadoLivreScraper.ts` to scrape `/mais-vendidos` correctly
- [ ] 2.3 Integrate new scraping methods into `MercadoLivreService.ts`
- [ ] 2.4 Expose new methods to the `CollectorService.ts`

## 3. Testing Phase
- [ ] 3.1 Test token expiry and renewal mock
- [ ] 3.2 Test ML Offers scraper against live URL
- [ ] 3.3 Test ML Best Sellers scraper against live URL
