# Messaging Specification

## MODIFIED Requirements

### Requirement: Multi-Tenant Messaging Configuration
The system SHALL use the authenticated user's stored settings for all messaging operations.

#### Scenario: Testing Telegram Configuration
Given an authenticated user with a valid Telegram Bot Token saved in `UserSettings`
When the user requests `POST /api/config/test` with service "telegram"
Then the system MUST use the stored token to test the connection
AND the system MUST NOT rely on `process.env` or global `config.json`

#### Scenario: Checking Telegram Status
Given an authenticated user
When the user requests `GET /api/telegram/status`
Then the system MUST return the configuration status based on `UserSettings` records
AND the system MUST NOT expose status based on global environment variables

#### Scenario: Listing Telegram Chats
Given an authenticated user with a configured Telegram Bot
When the user requests `GET /api/telegram/chats`
Then the system MUST instantiate a Telegram client using the user's token
AND the system MUST return chats accessible by that specific bot instance
