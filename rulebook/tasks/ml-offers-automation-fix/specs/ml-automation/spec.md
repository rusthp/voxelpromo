# ML Offers and Automation Fix Specification

## MODIFIED Requirements

### Requirement: Multi-Tenant Offer Collection
The system SHALL collect offers automatically for all configured and active platforms for each multi-tenant user without failing silently.

#### Scenario: Scheduled collection execution
Given an active user with configured Amazon, AliExpress, Shopee, and Mercado Livre integrations
When the collection cron job triggers
Then the system MUST successfully trigger `collectAll` and fetch offers from all four platforms, continuing gracefully if one platform encounters an error.

### Requirement: Mercado Livre Scraping Enhancements
The system SHALL scrape products directly from Mercado Livre's custom "Ofertas" and "Mais Vendidos" pages.

#### Scenario: Scraping daily offers page
Given the system requests the Mercado Livre offers page
When the scraper navigates to the URL
Then the system MUST extract product titles, prices, original prices, and product links.

#### Scenario: Scraping best sellers page
Given the system requests a Mercado Livre best sellers category page
When the scraper navigates to the URL
Then the system MUST extract the top-selling product details.
