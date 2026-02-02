# Refactor Mercado Livre for Multi-Tenancy

## Why
The current Mercado Livre integration relies on a global `config.json` file, which causes critical failures (403 Forbidden) in a multi-tenant environment. When user A tries to authenticate, the system reads the global config (often empty or belonging to another environment), resulting in mismatching `client_id` and `redirect_uri`.

## What Changes
- **Service Layer**: Refactor `MercadoLivreService.ts` to accept configuration via constructor injection, removing reliance on global state.
- **Route Layer**: Update `mercadolivre.routes.ts` to retrieve credentials from the authenticated user's `UserSettings` in the database.
- **OAuth Flow**: Implement user-isolated PKCE flow, storing `codeVerifier` and tokens in the user's private settings record.
- **Operations**: Ensure all downstream operations (scraping, affiliate links) utilize the user specific service instance.

## Impact
- **Critical Fix**: Resolves the 403 error preventing users from connecting their ML accounts.
- **Scalability**: Enables proper SaaS operation where multiple users can connect different ML accounts simultaneously.
- **Security**: Isolates tokens and credentials per user.
