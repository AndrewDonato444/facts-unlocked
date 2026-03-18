---
feature: Daily Content Scheduling
domain: content-engine
source:
  - content-engine/scripts/find-target-date.ts
  - content-engine/scripts/upload-and-schedule.ts
tests: []
components: []
status: implemented
created: 2026-03-18
updated: 2026-03-18
---

# Daily Content Scheduling

**Source Files**: `content-engine/scripts/find-target-date.ts`, `content-engine/scripts/upload-and-schedule.ts`

## Feature: Target Date Resolution

The pipeline runs at 4am ET daily. It must schedule content for **tomorrow**, not today, so posts are ready before the first slot fires (09:00 ET).

### Scenario: Pipeline targets tomorrow, not today

```gherkin
Given the daily-content-creation task fires at 4am ET on any given day
When find-target-date.ts runs
Then it outputs TARGET_DATE: {tomorrow's date in YYYY-MM-DD}
  And tomorrow is computed relative to ET (UTC-5 conservative offset)
  And the calendar folder is named daily-{TARGET_DATE}
  And all scheduledFor times use {TARGET_DATE}T{HH:MM}:00-05:00
```

### Scenario: Correct date at midnight boundary

```gherkin
Given the script runs at 04:00 ET (09:00 UTC)
  And today's UTC date is YYYY-MM-DD
When find-target-date.ts runs
Then TARGET_DATE is the next calendar day relative to ET
  And not the UTC date (which could be a day ahead of ET)
```

### Scenario: Scheduled task dedup via status check

```gherkin
Given upload-and-schedule.ts runs for a calendar
  And item 002 already has status="scheduled" and a zernio_post_id
When the script processes item 002
Then it skips the upload and Zernio call for item 002
  And logs "[002] Already scheduled, skipping"
  And continues to the next pending item
```

## Notes

- ET offset used: UTC-5 (conservative — doesn't attempt DST detection)
- Posting slots: 09:00, 14:00, 18:00 ET per channel per day
- 3 videos per channel (baby + money + ai) = 9 total per daily run
