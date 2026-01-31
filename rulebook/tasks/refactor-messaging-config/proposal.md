# Refactor Messaging Configuration Proposal

## Why
The current messaging configuration system violates multi-tenancy principles by relying on a global `config.json` and environment variables for runtime operations like testing connections and checking status. This causes valid user-specific configurations stored in the database to be ignored, leading to failed tests ("Bot Token not configured") and inconsistent status displays.

## What Changes
We will refactor the messaging service and API endpoints to strictly use the requesting user's `UserSettings` from the database.

### Key Changes:
1.  **Strict Multi-Tenancy**: Endpoints `/api/config/test`, `/api/telegram/status`, and `/api/telegram/chats` will fetch credentials using `req.user.id` -> `UserSettings`.
2.  **Stateless Services**: `TelegramService` will be instantiated per-request with the specific user's configuration, rather than relying on a singleton coupled to process environment variables.
3.  **Deprecation**: Usage of `config.json` for runtime API checks will be removed, retained only for system bootstrapping if needed.

## Impact
- **Positive**: Correct functioning of "Testar" buttons for all users; proper isolation of user data; scalable architecture.
- **Risks**: Scripts relying solely on env vars/config.json for runtime API calls might need updates (low risk as UI is primary interaction).
