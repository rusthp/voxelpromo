# Proposal: Background Jobs for WhatsApp with Baileys + BullMQ

## Why
Currently, WhatsApp message sending is either handled synchronously or without proper queueing and rate-limiting. Given WhatsApp's strict anti-spam policies, sending bulk messages directly from the scraping/collection routine can reliably trigger bans.

We need a robust queue system (BullMQ) coupled with our lightweight, high-performance WhatsApp client (Baileys). This allows us to:
1. Isolate scraping/collection stability from WhatsApp connection instability.
2. Implement strict rate-limiting (e.g., max 1 message every 10 seconds per tenant).
3. Automatically retry transient network failures.

## What Changes
1. **BullMQ Integration**: Add `bullmq` and `ioredis` to manage background jobs.
2. **Queue Setup**: Create `whatsappQueue.ts` in `src/jobs/queues`.
3. **Worker Implementation**: Create `whatsappWorker.ts` in `src/jobs/workers` to process jobs isolated from the main web server loop.
4. **WhatsApp Service Enhancements**: Update `WhatsAppServiceBaileys` to cleanly send media and formatted captions, integrated with the queue.
5. **Collector Integration**: Inject the queue dispatcher into `CollectorService.ts` to automatically schedule "send-offer" jobs for the best collected deals.

## Impact
- **Affected code**: `package.json`, `src/jobs/`, `src/services/whatsapp/`, `src/services/collector/`.
- **Breaking changes**: No.
- **User benefit**: Zero blocking between scraping and sending. Much higher security against WhatsApp bans due to rate limiting.
