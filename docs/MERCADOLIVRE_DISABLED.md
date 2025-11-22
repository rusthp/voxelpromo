# ⏸️ Mercado Livre - Temporarily Disabled

## Status

**Mercado Livre collection is currently disabled** in the automatic collection process.

## What This Means

- ✅ The Mercado Livre service code remains intact
- ✅ Manual collection via API endpoint still works: `POST /api/collector/mercadolivre`
- ❌ Automatic collection (cron job) **will NOT** collect from Mercado Livre
- ❌ `collectAll()` method will skip Mercado Livre

## How It Was Disabled

In `src/services/collector/CollectorService.ts`, the `collectAll()` method was modified to skip Mercado Livre:

```typescript
// Mercado Livre temporarily disabled
Promise.resolve(0).then(() => {
  logger.info('⏸️  Mercado Livre collection is disabled');
  return 0;
}),
// this.collectFromMercadoLivre('electronics').catch((error) => {
//   logger.error('Mercado Livre collection failed:', error);
//   return 0;
// }),
```

## Re-enabling Mercado Livre

To re-enable Mercado Livre collection:

1. Open `src/services/collector/CollectorService.ts`
2. Find the `collectAll()` method (around line 635)
3. Replace the disabled code with:

```typescript
this.collectFromMercadoLivre('electronics').catch((error) => {
  logger.error('Mercado Livre collection failed:', error);
  return 0;
}),
```

4. Remove the `Promise.resolve(0)` placeholder
5. Update the log message to remove "(disabled)" from line 667

## Manual Collection Still Available

You can still trigger Mercado Livre collection manually:

### Via API:
```bash
curl -X POST http://localhost:3000/api/collector/mercadolivre \
  -H "Content-Type: application/json" \
  -d '{"category": "electronics"}'
```

### Via Script:
```bash
node scripts/collect-mercadolivre.js
```

## Why Was It Disabled?

Mercado Livre was disabled temporarily due to:
- Rate limiting issues (403 Forbidden errors)
- Need to focus on other sources (Shopee, AliExpress, Amazon)
- IP whitelist issues with MongoDB (unrelated, but affecting overall system)

## Related Files

- `src/services/collector/CollectorService.ts` - Main collector service
- `src/services/mercadolivre/MercadoLivreService.ts` - Mercado Livre service (still functional)
- `src/routes/collector.routes.ts` - API routes (still functional)
- `src/routes/mercadolivre.routes.ts` - Mercado Livre-specific routes (still functional)

## Notes

- All Mercado Livre code remains in the codebase
- No data or configuration was removed
- Re-enabling is a simple code change (see above)
- The service can still be used for manual testing



