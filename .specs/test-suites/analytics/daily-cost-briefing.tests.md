# Test Suite: Daily Analytics Briefing with Cost-Per-Video Tracking

**Feature Spec**: `.specs/features/analytics/daily-cost-briefing.feature.md`
**Test Files**:
- `DonatoSkills/cost-tracker/__tests__/log-usage.test.js`
- `DonatoSkills/analytics-loop/scripts/__tests__/daily-briefing.test.js`

**Total Tests**: 37
**Status**: ✅ All passing

---

## cost-tracker/log-usage.js (20 tests)

| ID | Test | Scenario |
|----|------|----------|
| UT-CB-001 | ElevenLabs TTS cost = chars * 0.00022 | Rate table calculation |
| UT-CB-002 | Gemini flash image cost = 0.04 per image | Rate table calculation |
| UT-CB-003 | OpenAI gpt-image-1 cost = 0.06 per image | Rate table calculation |
| UT-CB-003b | Grok image cost = 0.02 per image | Rate table calculation |
| UT-CB-003c | Cloudinary cost = 0.00 | Free plan |
| UT-CB-003d | Grok TTS cost = chars * 0.0001 | Rate table calculation |
| UT-CB-003e | Unknown model falls back to provider default | Fallback lookup |
| UT-CB-003f | Completely unknown provider throws | Error handling |
| UT-CB-004 | TTS record has all required fields | Record structure |
| UT-CB-005 | Image gen record has correct unit_type | Record structure |
| UT-CB-006 | fallback:true preserved in record | Fallback logging |
| UT-CB-007 | budget_warning set when monthly total >80% | Budget warning |
| UT-CB-007b | No budget_warning below 80% | Budget warning |
| UT-CB-008 | Creates usage.jsonl with one record | File system write |
| UT-CB-009 | Appends multiple records without overwriting | File system write |
| UT-CB-010 | Creates intermediate directories if needed | File system write |
| UT-CB-011 | Creates monthly totals file on first call | Monthly tracking |
| UT-CB-012 | Accumulates units across multiple calls | Monthly tracking |
| UT-CB-013 | Tracks multiple providers independently | Monthly tracking |
| UT-CB-014 | Image gen providers have no monthly budget | Monthly tracking |

---

## analytics-loop/scripts/daily-briefing.js (17 tests)

| ID | Test | Scenario |
|----|------|----------|
| UT-DB-001 | Aggregates records from single channel into per-video cost map | Cost aggregation |
| UT-DB-002 | Aggregates across multiple channels | Cost aggregation |
| UT-DB-003 | Returns zero-cost result when no logs exist | No content today |
| UT-DB-004 | Correctly sums per-provider costs within a video | Cost aggregation |
| UT-DB-005 | Budget warning surfaced in aggregated result | Budget warning |
| UT-DB-006 | Full briefing data includes all required sections | Full briefing |
| UT-DB-007 | No content today shows zero cost | No content |
| UT-DB-008 | Analytics unavailable sets analytics.available to false | No analytics |
| UT-DB-009 | Monthly burn rate projection computed correctly | Monthly burn |
| UT-DB-010 | Budget warning surfaced in briefing data | Budget warning |
| UT-DB-011 | Formatted output contains date header | Formatting |
| UT-DB-012 | Formatted output includes total cost and avg per video | Formatting |
| UT-DB-013 | No-content day shows appropriate message | Formatting |
| UT-DB-014 | Analytics unavailable shows appropriate message | Formatting |
| UT-DB-015 | Budget warning appears in output when flagged | Formatting |
| UT-DB-016 | Monthly burn section shows chars used and percentage | Formatting |
| UT-DB-017 | Cloudinary shown as free in output | Formatting |
