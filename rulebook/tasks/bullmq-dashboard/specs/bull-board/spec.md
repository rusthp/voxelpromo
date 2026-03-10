## ADDED Requirements

### Requirement: BullMQ Monitoring Dashboard
The system SHALL implement a graphical interface to monitor background queues.

#### Scenario: Admin views queues
Given an authenticated user with admin privileges
When the admin accesses the `/admin/queues` endpoint
Then the system MUST render the `@bull-board` interface displaying the status of the `whatsapp_offers` queue.

#### Scenario: Security Protection
Given an unauthenticated user or non-admin user
When the user accesses the `/admin/queues` endpoint
Then the system SHALL block access and return a 401 or 403 error.
