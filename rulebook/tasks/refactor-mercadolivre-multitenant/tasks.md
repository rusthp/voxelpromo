# Refactor Mercado Livre Tasks

## 1. Service Refactor
- [x] 1.1 Update `MercadoLivreService.ts` constructor to accept config
- [x] 1.2 Implement `getConfig` priority logic (Injected > Global)

## 2. OAuth & Routes Refactor
- [x] 2.1 Refactor `/auth/url` to use `UserSettings`
- [x] 2.2 Refactor `/auth/exchange` and `/auth/callback` to use `UserSettings`
- [x] 2.3 Refactor operational routes (`/status`, `/scrape-url`) to use `UserSettings`

## 3. Verification
- [x] 3.1 Verify compilation
- [x] 3.2 Verify no regression in linting
