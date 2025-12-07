# Automation Specification - Smart Planner

## ADDED Requirements

### Requirement: Smart Hourly Distribution
The system SHALL allow users to configure a "posts per hour" value that distributes offers randomly within each hour instead of using fixed intervals.

#### Scenario: Smart Planner Enabled
Given the automation config has `postsPerHour` set to 10
When a new hour begins
Then the system MUST select 10 offers and assign random minutes within that hour for posting

#### Scenario: Random Distribution
Given the Smart Planner is active
When distributing posts for an hour
Then each post MUST be assigned a unique random minute within the current hour

#### Scenario: Working Hours Check
Given the Smart Planner is active
When the current hour is outside configured working hours
Then the system SHALL NOT distribute any posts

### Requirement: Strategy Selection
The system SHALL provide a UI toggle to switch between "Fixed Interval" and "Smart Planner" strategies.

#### Scenario: Strategy Toggle
Given a user is on the Automation Settings page
When they select "Smart Planner" strategy
Then the interval minutes field MUST be hidden
And the posts per hour field MUST be shown

#### Scenario: Fixed Interval Fallback
Given a user sets `postsPerHour` to 0
When the automation runs
Then the system MUST use the legacy fixed interval approach

## MODIFIED Requirements

### Requirement: Automation Scheduler
The automation scheduler SHALL support both fixed interval and hourly distribution modes.

#### Scenario: Mode Detection
Given the automation is active
When the scheduler runs
Then it MUST check `postsPerHour` value to determine which mode to use
