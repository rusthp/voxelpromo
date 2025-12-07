# Proposal: Smart Planner Automation

## Why

The existing automation system used a fixed interval approach (e.g., post every 30 minutes), which creates predictable, robotic posting patterns. Users requested a more organic distribution where N posts are randomly distributed within each hour, making the posting behavior appear more human and natural.

## What Changes

### New Capability: Smart Hourly Planner
- Added `postsPerHour` field to `AutomationConfig` model
- Implemented `distributeHourlyPosts()` method in `AutomationService`
- Added hourly cron job (`0 * * * *`) to trigger distribution
- Frontend UI updated with strategy selector (Fixed Interval vs Smart Planner)

### How It Works
1. Every hour (at :00), the system wakes up
2. If `postsPerHour > 0`, it selects N best offers
3. Assigns random minutes within the hour (e.g., 7:05, 7:23, 7:47)
4. The existing minute-by-minute scheduler posts each at the assigned time

### Files Modified
- `src/models/AutomationConfig.ts` - Added `postsPerHour` field
- `src/services/automation/AutomationService.ts` - Added `distributeHourlyPosts()` method
- `src/jobs/scheduler.ts` - Added hourly cron job
- `frontend/src/types/settings.ts` - Added `postsPerHour` to interface
- `frontend/src/components/settings/AutomationSettings.tsx` - Added strategy selector UI

## Impact
- **Affected specs**: automation, scheduling
- **Breaking change**: NO
- **User benefit**: More natural posting patterns, user-controllable quantity per hour
