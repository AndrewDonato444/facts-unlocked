# Test Suite: research-loop.js

**File**: `DonatoSkills/analytics-loop/scripts/__tests__/research-loop.test.js`
**Feature**: `.specs/features/analytics/continuous-learning-loop.feature.md`
**Tests**: 20 | **Status**: All passing

---

## Coverage

| ID | Description | Scenario Covered |
|----|-------------|-----------------|
| UT-RL-001 | `filterToLastNDays` keeps signals within last 7 days | Signal filtering |
| UT-RL-002 | `filterToLastNDays` with empty array returns empty | Signal filtering |
| UT-RL-003 | `filterToLastNDays` excludes all signals when all old | Signal filtering |
| UT-RL-004 | `buildBrief` returns all required top-level fields | Happy path |
| UT-RL-005 | `buildBrief` includes one recommendation per channel | Happy path |
| UT-RL-006 | `buildBrief` action_items have sequential priority | Happy path |
| UT-RL-007 | `buildBrief` records skipped sources | Graceful degradation |
| UT-RL-008 | `buildBrief` valid brief with only 1 source | Graceful degradation |
| UT-RL-009 | `buildBrief` empty signals sets carry_forward_note | No signals found |
| UT-RL-010 | `buildBrief` zero signals sets carry_forward_note | No signals found |
| UT-RL-011 | `buildBrief` empty signals has empty action_items | No signals found |
| UT-RL-012 | `updatePatternArchive` creates archive if missing | Pattern archive |
| UT-RL-013 | `updatePatternArchive` adds new tactic entry | Pattern archive |
| UT-RL-014 | `updatePatternArchive` increments weeks_observed | Pattern archive accumulation |
| UT-RL-015 | `updatePatternArchive` handles multiple tactics | Pattern archive |
| UT-RL-016 | `injectResearchIntoTopicGuidance` appends top tactic | generate-briefs integration |
| UT-RL-017 | `injectResearchIntoTopicGuidance` never modifies template | generate-briefs integration |
| UT-RL-018 | `injectResearchIntoTopicGuidance` no-op with empty tactics | generate-briefs integration |
| UT-RL-019 | `getWeekStamp` returns YYYY-WW format | Week stamp utility |
| UT-RL-020 | `getLatestResearchBrief` returns most recent brief | Latest brief loader |
