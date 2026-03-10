## WhatsApp Background Jobs Implementation

- [ ] 1. Install `bullmq` and `ioredis` dependencies.
- [ ] 2. Setup Redis connection utility.
- [ ] 3. Create `whatsappQueue.ts` with rate limiter options.
- [ ] 4. Enhance `WhatsAppServiceBaileys.ts` to format offers and send media messages.
- [ ] 5. Create `whatsappWorker.ts` to process queue items and call Baileys.
- [ ] 6. Update `CollectorService.ts` to add jobs to `whatsappQueue` after scraping.
