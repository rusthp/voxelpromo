# Multi-Tenancy Security Specifications

## ADDED Requirements

### Requirement: Scraper Isolation
The system SHALL ensure that whenever a scraper (e.g., MercadoLivreScraper) navigates or uses authenticated sessions, the session data (cookies, User-Agent) MUST be strictly isolated per tenant (user).

#### Scenario: Concurrent Scraping
Given User A and User B trigger an offer collection simultaneously
When the ScraperService executes both jobs
Then User A's job MUST NOT use User B's affiliate cookies
And User B's job MUST NOT use User A's affiliate cookies.

### Requirement: Database Isolation
The system SHALL ensure all offers are saved with a strict association to their `userId`.

#### Scenario: Deduplication across Tenants
Given User A collects Product X
And User B collects Product X
When `OfferService.saveOffers` is called
Then the system MUST create two separate Offer documents, one for User A and one for User B.

### Requirement: Automation Isolation
The system SHALL process automation jobs (like WhatsApp posting) in isolated contexts.

#### Scenario: Job Execution
Given the Scheduler triggers WhatsApp posting for all active users
When the Publisher iterates over users
Then the context (e.g., Baileys auth state) MUST be correctly loaded for the specific user being processed, without cross-contamination from the previous user in the loop.
