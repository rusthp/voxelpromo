# Refactor Remaining Services for Multi-Tenancy

## Why
Following the successful refactor of Telegram and Mercado Livre, the remaining integration services (Instagram, Shopee, WhatsApp, X, Rakuten, Lomadee) currently rely on a global `config.json` or mixed configuration strategies. This prevents the platform from functioning correctly as a multi-tenant SaaS.

## What Changes
Refactor the following services to support constructor injection and `UserSettings` retrieval:
1.  **InstagramService**: Remove `config.json` fallback, enforce `createForUser` pattern.
2.  **ShopeeService**: Migrate from `config.json` to `ShopeeSettings`.
3.  **WhatsAppService**: Migrate from `config.json` to `WhatsAppSettings`.
4.  **XService**: Migrate from `config.json` to `XSettings`.

## Impact
- **Consistency**: All services will follow the same architecture.
- **Scalability**: Multiple users can use all integrations simultaneously without conflict.
- **Cleanup**: Removes technical debt associated with `config.json`.
