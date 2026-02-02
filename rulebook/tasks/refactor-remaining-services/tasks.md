# Refactor Remaining Services Tasks

## 1. Instagram Refactor
- [x] 1.1 Remove `config.json` logic from `InstagramService.ts` constructor/methods
- [x] 1.2 Update `instagram.routes.ts` to use `getUserSettingsService`

## 2. Shopee Refactor
- [x] 2.1 Update `ShopeeService.ts` to accept injected config
- [x] 2.2 Update Shopee routes to use `UserSettings`

## 3. WhatsApp Refactor
- [x] 3.1 Update `WhatsAppServiceBaileys.ts` to accept injected config
- [x] 3.2 Update WhatsApp routes to use `UserSettings`

## 4. Verification
- [x] 4.1 Verify compilation (Minor syntax fix needed in `WhatsAppServiceBaileys.ts`)
- [x] 4.2 Verify no regression in linting

## 5. X (Twitter) Refactor
- [x] 5.1 Update `XService.ts` to accept injected config and use `TwitterSettings`
- [x] 5.2 Create `x.routes.ts` with config/test endpoints
- [x] 5.3 Register X routes in `index.ts`

## 6. Awin Refactor
- [x] 6.1 Update `AwinService.ts` to accept injected config and use `AwinSettings`
- [x] 6.2 Create `awin.routes.ts` with config/test endpoints
- [x] 6.3 Register Awin routes in `index.ts`
