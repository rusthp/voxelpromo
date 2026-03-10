# Multi-Tenancy Security Audit Proposal

## Context and Why

We need to ensure that the affiliate system robustly supports multi-tenancy. This means that data (like offers or configurations) from one user must never be accessible to or overwrite data from another user. Furthermore, background processes like scrapers must handle concurrent requests from different users safely.

At present, we have identified that although `ShopeeService`, `AmazonService`, and some collectors handle `userId` appropriately, `MercadoLivreScraper` is built as a Singleton with a mutex `sessionLock` acting on a single Puppeteer browser instance. This implies that if multiple users trigger the scraper concurrently, they will be queued and use the same scraper session, potentially sharing cookies or rate limits, and creating a bottleneck.

## What Changes

1.  **Refactor MercadoLivreScraper:** Transition from a strict Singleton to an instance-based or pool-based approach, or ensure that the scraping context (like affiliate cookies) is strictly scoped per request/user to avoid cross-contamination.
2.  **Audit AliExpresService:** Ensure that the fallback mechanisms and parametrized links are correctly using the tenant's app keys, even during retries.
3.  **Audit Background Jobs:** Investigate how the Smart Planner and WhatsApp publisher iterate over users and ensure no state is shared between iterations.

## Impact Analysis

-   **Security:** High. Prevents data leaks between users.
-   **Performance:** High. Removing the single-instance bottleneck in Puppeteer scrapers will allow true concurrent multi-tenant data gathering.

