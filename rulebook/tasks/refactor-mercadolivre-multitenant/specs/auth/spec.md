# Mercado Livre Auth Specification

## MODIFIED Requirements

### Requirement: Multi-Tenant Authentication
The system SHALL use per-user credentials for all Mercado Livre interactions.

#### Scenario: User Initiates OAuth
Given an authenticated user with ML credentials in UserSettings
When the user requests `/api/mercadolivre/auth/url`
Then the system MUST generate an Auth URL using the user's `clientId` and `redirectUri`
And the system MUST store the `codeVerifier` in the user's database record (not config.json)

#### Scenario: User Completes OAuth
Given a user returning from ML with an auth code
When the callback endpoint is hit
Then the system MUST retrieve the user's specific `codeVerifier`
And the system MUST exchange the code using the user's credentials
And the system MUST save the resulting tokens to the user's database record

### Requirement: Service Isolation
The `MercadoLivreService` SHALL NOT read from `config.json` when an instance configuration is provided.
The global `config.json` SHALL only be used as a fallback for legacy/CLI scripts, never for API requests.
