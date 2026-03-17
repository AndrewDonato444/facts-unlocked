---
feature: Pairwise Combination Tracking
domain: analytics
source: analytics-loop/scripts/check-suppressions.js
tests:
  - analytics-loop/scripts/__tests__/check-suppressions.test.js
components: []
personas: []
status: implemented
created: 2026-03-17
updated: 2026-03-17
---

# Pairwise Combination Tracking — Analytics Loop Phase 2.5

**Source File**: `analytics-loop/scripts/check-suppressions.js`
**Upstream**: Phase 2 output (`scored-posts.json`) + variable-analysis from Phase 3
**Downstream**: `suppression-list.json` consumed by Phase 4 (`generate-briefs.js`)
**Contract**: `shared-references/analytics-schema.md`

## Purpose

Individual variable analysis tells you "stat_lead hooks perform well" and "30s videos perform well" — but it can't tell you whether those two things work well **together**. Pairwise combination tracking answers: "Does stat_lead + 30s actually synergize, or does stat_lead + 45s secretly outperform?"

This is the difference between a system that optimizes 7 variables independently and one that understands their interactions. Without it, the winning template is just "best of each" — with it, the system can detect toxic combinations (great individually, terrible together) and synergistic ones (mediocre individually, exceptional together).

The feature fills in the `checkPairwiseSuppression` stub (lines 105-113) in `check-suppressions.js` and also needs to export functions for testability.

---

## Feature: Pairwise Combination Tracking

Phase 2.5 already handles single-variable suppressions. This feature adds pairwise analysis: for every pair of variables (e.g., hook_type + video_length), compute the average engagement density of each value combination, and suppress combinations that consistently underperform.

### What Already Works

- `loadSuppressionList()` — loads/initializes the suppression list (with `suppressed_combinations` array)
- `getValueHistory()` — tracks single-variable performance across cycles
- `getGlobalAvg()` — reads the current global average
- Phase A (lift check) and Phase B (new suppressions) for single values
- Phase C calls `checkPairwiseSuppression()` and merges results — but it returns `[]`

### What's Stubbed (This Feature)

The `checkPairwiseSuppression(dataDir, globalAvg)` function (lines 105-113) currently returns an empty array. It needs to:

1. Load scored posts and their variable tags (from `variable-analysis.json`)
2. Generate all 21 unique variable pairs from the 7 variables
3. For each pair, compute avg engagement density per value combination
4. Cross-reference historical data to find consistently underperforming combinations
5. Return suppressable combinations meeting threshold criteria

---

## Scenario: Pairwise combination scored across posts

```gherkin
Given scored posts exist with variable tags
And variable-analysis.json exists in the current date directory
When checkPairwiseSuppression runs
Then it reads variable-tagged posts from the current analysis
And computes avg engagement density for each pair of variable values
  (e.g., hook_type="stat_lead" + video_length="30" → avg 28.7)
And returns combinations scoring below 50% of global average
```

### Pair Generation

With 7 variables, there are C(7,2) = 21 unique pairs:
- hook_type + video_length
- hook_type + voice_pace
- hook_type + text_overlay
- hook_type + background_type
- hook_type + music_energy
- hook_type + cta_style
- video_length + voice_pace
- ... (15 more)

Each pair generates buckets keyed by `"value1|value2"` (sorted alphabetically by variable name for consistency).

---

## Scenario: Combination meets suppression criteria

```gherkin
Given a combination "hook_type=question + video_length=60" has:
  - avg engagement density of 4.2
  - global avg is 12.4
  - observed across 3+ scoring cycles
  - 10+ data points total
When checkPairwiseSuppression evaluates it
Then it returns a suppression entry with:
  - combination: { hook_type: "question", video_length: "60" }
  - avg_score: 4.2
  - ratio: 0.34 (below 0.5 threshold)
  - sample_count: 12
  - cycles_observed: 4
  - reason: "Consistently 66% below average across 4 cycles"
```

---

## Scenario: Combination above threshold is not suppressed

```gherkin
Given a combination "hook_type=stat_lead + video_length=30" has:
  - avg engagement density of 28.7
  - global avg is 12.4
When checkPairwiseSuppression evaluates it
Then it is NOT included in the suppression results
  (ratio 2.31 is above 0.5 threshold)
```

---

## Scenario: Combination with insufficient data is not suppressed

```gherkin
Given a combination "hook_type=myth_bust + voice_pace=slow" has:
  - avg engagement density of 3.0 (well below threshold)
  - But only 4 data points (below MIN_SAMPLE of 10)
  - And only observed in 1 cycle (below MIN_CYCLES of 3)
When checkPairwiseSuppression evaluates it
Then it is NOT suppressed (insufficient data to be confident)
```

---

## Scenario: No variable-analysis.json exists

```gherkin
Given no variable-analysis.json exists in the current date directory
When checkPairwiseSuppression runs
Then it returns an empty array (no data to analyze)
```

---

## Scenario: Historical combination suppression persists

```gherkin
Given suppression-list.json already contains a suppressed combination
And the combination still scores below threshold in the current cycle
When main() runs Phase C
Then the combination remains in suppressed_combinations
And is not duplicated (dedup by JSON.stringify comparison)
```

---

## Scenario: Pairwise results feed into brief generation

```gherkin
Given suppressed_combinations contains [{ hook_type: "question", video_length: "60" }]
When generate-briefs.js reads suppression-list.json
Then it avoids generating briefs with that specific combination
Even though "question" and "60" may each be valid individually
```

**Note**: This scenario validates the downstream contract — brief generation already reads `suppressed_combinations` from the suppression list, it just has been empty until now.

---

## Output Schema

Each suppressed combination entry:

```json
{
  "combination": {
    "hook_type": "question",
    "video_length": "60"
  },
  "pair_key": "hook_type|video_length",
  "combo_key": "question|60",
  "avg_score": 4.2,
  "global_avg": 12.4,
  "ratio": 0.34,
  "sample_count": 12,
  "cycles_observed": 4,
  "suppressed_since": "2026-03-17",
  "reason": "Consistently 66% below average across 4 cycles with 12 data points"
}
```

---

## Implementation Notes

### `checkPairwiseSuppression(dataDir, globalAvg)` → `checkPairwiseSuppression(dataDir, globalAvg, projectDataDir)`

The function signature needs a third parameter (`projectDataDir`) to access historical data across cycles. Update the call site in `main()` accordingly.

### Algorithm

```
1. Load variable-analysis.json from dataDir
2. Load scored-posts.json from dataDir (need individual post data)
3. Match posts to their variables via variable_impact (or re-derive from calendar)
4. For each pair of variables (21 pairs):
   a. For each post that has both variables with non-"unknown" values:
      - Create a combo key: "value1|value2"
      - Add the post's engagementDensity to that bucket
   b. Compute avg for each combo key
   c. Compute ratio = avg / globalAvg
5. For combos where ratio < SUPPRESSION_THRESHOLD:
   a. Check historical data (getComboHistory) — needs 3+ cycles, 10+ samples
   b. If criteria met, add to results
6. Return array of suppression entries
```

### Historical Lookup

Add a `getComboHistory(projectDataDir, var1, value1, var2, value2)` function that:
1. Scans dated subdirectories for `variable-analysis.json` files
2. For each, loads the scored-posts from that cycle
3. Counts how many cycles this specific combination appeared in
4. Computes the cross-cycle average score
5. Returns `{ cycles, avg, total }`

**Optimization**: Since scanning posts per cycle is expensive, the function can alternatively store combo stats in variable-analysis.json as a new `pairwise_impact` field. But for v1, scanning is fine given the small data volumes.

### Module Exports

The file currently uses `main()` directly without exporting functions. Refactor to export:
- `checkPairwiseSuppression`
- `loadSuppressionList`
- `getValueHistory`
- `getGlobalAvg`

Use the same `module.exports` + `require.main === module` pattern as `decompose-variables.js`.

### What NOT to Change

- The existing `loadSuppressionList()`, `getValueHistory()`, and `getGlobalAvg()` functions work correctly
- Phase A (lift check) and Phase B (new suppressions) logic stays as-is
- The suppression constants (thresholds, min cycles, min sample) stay unchanged
- The `main()` flow stays the same — just update the `checkPairwiseSuppression` call

---

## Test Plan

### Unit Tests (check-suppressions.test.js)

| ID | Test | Type |
|----|------|------|
| UT-CS-001 | Baseline: loadSuppressionList returns default structure when no file exists | Existing behavior |
| UT-CS-002 | Baseline: getValueHistory counts cycles and computes avg across dated dirs | Existing behavior |
| UT-CS-003 | Baseline: getGlobalAvg reads from scored-posts.json summary | Existing behavior |
| UT-CS-004 | Pairwise: generates all 21 unique pairs from 7 variables | New |
| UT-CS-005 | Pairwise: computes avg engagement density per value combination | New |
| UT-CS-006 | Pairwise: suppresses combo below 50% of global avg with 3+ cycles and 10+ samples | New |
| UT-CS-007 | Pairwise: does NOT suppress combo above threshold | New |
| UT-CS-008 | Pairwise: does NOT suppress combo with insufficient cycles (<3) | New |
| UT-CS-009 | Pairwise: does NOT suppress combo with insufficient samples (<10) | New |
| UT-CS-010 | Pairwise: returns empty array when no variable-analysis.json exists | New |
| UT-CS-011 | Pairwise: combo key uses alphabetically sorted variable names for consistency | New |
| UT-CS-012 | Pairwise: skips "unknown" variable values in pair analysis | New |
| UT-CS-013 | Integration: main() merges pairwise results into suppression-list.json without duplicating | New |

---

## Learnings

_(To be filled after implementation)_
