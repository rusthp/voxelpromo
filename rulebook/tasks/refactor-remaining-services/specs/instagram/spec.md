# Instagram Multi-Tenancy Specification

## MODIFIED Requirements

### Requirement: Service Isolation
The `InstagramService` SHALL accept configuration via its constructor (or a factory method) and MUST NOT read from `config.json`.

#### Scenario: Service Instantiation
Given a user request
When the `InstagramService` is needed
Then the system MUST fetch the user's settings from DB
And the system MUST instantiate the service with those specific settings

### Requirement: Route Independence
All Instagram-related routes (`/api/instagram/*`) SHALL use `getUserSettingsService` to retrieve credentials for the authenticated user context.
