# Smart Planner Implementation Tasks

## 1. Implementation Phase
- [x] 1.1 Add `postsPerHour` field to AutomationConfig model
- [x] 1.2 Implement `distributeHourlyPosts()` method in AutomationService
- [x] 1.3 Add hourly cron job to scheduler
- [x] 1.4 Update legacy interval job to skip when Smart Planner is active

## 2. Frontend Phase
- [x] 2.1 Add `postsPerHour` to frontend types
- [x] 2.2 Create strategy selector UI (Fixed vs Smart)
- [x] 2.3 Add posts per hour input field
- [x] 2.4 Make UI responsive for mobile

## 3. Testing Phase
- [x] 3.1 Fix TypeScript errors (offer._id null checks)
- [x] 3.2 Add unit tests for distributeHourlyPosts <!-- completed: 12 tests added -->
- [x] 3.3 Test end-to-end scheduling <!-- completed: 10 E2E tests added -->

## 4. Documentation Phase
- [x] 4.1 Create task structure per RULEBOOK.md
- [x] 4.2 Write proposal.md
- [x] 4.3 Write tasks.md
- [x] 4.4 Write spec.md
