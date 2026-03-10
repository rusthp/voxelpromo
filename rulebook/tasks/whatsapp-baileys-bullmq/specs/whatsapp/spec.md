# WhatsApp Queue Specification

## ADDED Requirements

### Requirement: Queue Rate Limiting
The WhatsApp messaging queue SHALL implement rate-limiting to prevent WhatsApp ban mechanisms.
- MUST restrict global sending throughput (e.g., 1 message per 10 seconds).

#### Scenario: Bulk Offer Dispatch
Given a collector job finishes scraping 50 offers
When the system dispatches these offers to the WhatsApp queue
Then the BullMQ Worker SHALL process them respecting the interval without blocking the main event loop

### Requirement: Service Isolation
The WhatsApp sending capability SHALL be isolated from the scraping process.
- The `CollectorService` MUST ONLY push data to the queue.
- The `whatsappWorker` MUST ONLY pop data and send it.

#### Scenario: Network Instability
Given the WhatsApp connection via Baileys is temporarily disconnected
When a new offer is collected and queued
Then the system MUST retry the queue job automatically without losing the offer payload
