---
feature: Variable Decomposition (Analytics Loop Phase 3)
domain: analytics
source: analytics-loop/scripts/decompose-variables.js
tests:
  - analytics-loop/scripts/__tests__/decompose-variables.test.js
components: []
personas: []
status: implemented
created: 2026-03-16
updated: 2026-03-16
---

# Variable Decomposition — Analytics Loop Phase 3

**Source File**: `analytics-loop/scripts/decompose-variables.js`
**Upstream**: Phase 2 output (`scored-posts.json`) + calendar variable tags
**Downstream**: Phase 4 input (`variable-analysis.json` feeds `generate-briefs.js`)
**Contract**: `shared-references/analytics-schema.md`

## Purpose

This is the brain of the self-improving loop. Phase 2 scores posts. Phase 3 answers **why** — which structural variables (hook type, video length, pacing, etc.) correlate with high engagement. Without this, the system creates content blind. With it, every batch learns from the last.

---

## Feature: Variable Decomposition

Phase 3 reads scored posts, cross-references their structural variable tags from content-engine calendars, computes per-variable impact on engagement density, identifies the winning template, and detects per-channel divergences.

### What Already Works

The script has working implementations for:
- Loading scored posts from Phase 2 output
- Looking up variable tags from `content-engine/calendars/*/calendar.json` via post ID matching
- Computing per-variable-value average engagement density (`computeVariableImpact`)
- Identifying the winning template as the combination of best-performing values (`computeWinningTemplate`)
- Writing `variable-analysis.json` output

### What's Stubbed (This Feature)

Two capabilities are TODO stubs that need to be completed:

1. **Variable inference from post content** (line 194-196) — When a post has no calendar entry (created outside the content-engine), infer structural variables from the post's content, metadata, and platform data instead of skipping it entirely.

2. **Per-channel overrides** (line 232-233) — When a specific channel consistently performs better with a different variable value than the global winner, detect and report it as a local override.

---

## Scenario: Tagged posts flow through existing pipeline

```gherkin
Given scored posts exist in scored-posts.json
And calendar items with variable tags exist in content-engine/calendars/
When decompose-variables runs
Then each scored post is matched to its calendar entry by zernioPostId or postId
And per-variable impact is computed (avg engagement density per value)
And the winning template is the combination of highest-scoring values
And variable-analysis.json is written with impact data and winning template
```

**Status**: Already implemented and working. Tests should verify this as baseline.

---

## Scenario: Post without calendar entry gets variables inferred

```gherkin
Given a scored post has no matching calendar entry (legacy or externally created)
When decompose-variables attempts variable inference
Then it analyzes the post content/caption to infer hook_type
And it reads video duration metadata to infer video_length
And it marks each inferred variable with confidence: "inferred"
And variables that cannot be reliably determined are set to "unknown"
And the post is included in the analysis (not skipped)
```

### Inference Rules

| Variable | Inference Method | Confidence |
|----------|-----------------|------------|
| `hook_type` | Pattern-match first sentence against known hook patterns (stat_lead: starts with number/percentage, did_you_know: starts with "did you know", question: ends with "?", myth_bust: contains "actually"/"but really", etc.) | Medium — text patterns are heuristic |
| `video_length` | Read `duration` from post analytics metadata if available, bucket into 15/30/45/60 | High — platform reports exact duration |
| `voice_pace` | If duration and word count are both available, compute WPM and bucket (>170=fast, 130-170=moderate, <130=slow) | Medium — requires both metrics |
| `text_overlay` | Cannot reliably infer from post data alone | Always "unknown" |
| `background_type` | Cannot reliably infer from post data alone | Always "unknown" |
| `music_energy` | Cannot reliably infer from post data alone | Always "unknown" |
| `cta_style` | Pattern-match last sentence for CTA patterns ("follow", "subscribe", "comment", "link in bio") | Low — many CTAs are in captions not video |

### Edge Cases

- Post with empty content/caption: all variables "unknown", still included with confidence "none"
- Post with only image (not video): `video_length` and `voice_pace` are "unknown"
- Multiple hook patterns match: use the strongest match (stat_lead > did_you_know > question, based on specificity)

---

## Scenario: Per-channel override detected

```gherkin
Given 3+ scoring cycles of variable-analysis.json exist in the project's data directory
And channel "Example Channel" consistently scores higher with voice_pace="moderate"
  while the global winning template has voice_pace="fast"
When decompose-variables computes per-channel overrides
Then it reports a per_channel_override for "Example Channel"
  with diverges_on=["voice_pace"] and optimal_override={voice_pace: "moderate"}
And it includes lift percentage and sample count in the override
```

### Override Detection Logic

For each channel that has enough data:
1. Compute per-variable-value avg engagement density **for that channel only**
2. Compare each variable's best value against the global winning template
3. If the channel's best value differs from the global best AND:
   - The channel's local best outperforms the global best by >= 15% on that channel
   - The divergence is observed across >= 3 scoring cycles
   - There are >= 5 posts with the divergent value on this channel
4. Then record a per-channel override

### Data Requirements

- Requires 3+ dated subdirectories in `analytics-loop/data/{project}/` with `variable-analysis.json`
- Each must have channel-level data (posts from the specific channel)
- Override detection scans historical analysis files, not just the current run

---

## Scenario: Per-channel override with insufficient data

```gherkin
Given fewer than 3 scoring cycles exist
When decompose-variables runs
Then per_channel_overrides is an empty array
And no override detection is attempted
```

---

## Scenario: No tagged or inferable posts

```gherkin
Given all scored posts have no calendar entries
And variable inference returns "unknown" for all variables on all posts
When decompose-variables runs
Then it writes variable-analysis.json with sample_size=0 (or the count of inferable posts)
And winning_template is null
And variable_impact is empty
And a warning is included explaining that tagged content is needed
```

---

## Scenario: Mixed tagged and inferred posts

```gherkin
Given some posts have calendar variable tags (confidence: "tagged")
And other posts have variables inferred from content (confidence: "inferred")
When decompose-variables computes variable impact
Then tagged posts are weighted at full value
And inferred posts are weighted at 0.5x (reduced confidence)
And the output includes a breakdown of tagged vs inferred sample counts
```

### Weighted Scoring

When computing per-variable averages:
- Tagged posts contribute their full `engagementDensity` score
- Inferred posts contribute `engagementDensity * 0.5` to the weighted average
- This prevents low-confidence inferences from dominating the analysis
- The output includes `tagged_count` and `inferred_count` per variable value

---

## Output Schema

The output `variable-analysis.json` matches the existing schema in `shared-references/analytics-schema.md` with these additions:

```json
{
  "date": "2026-03-16",
  "sample_size": 58,
  "sample_breakdown": {
    "tagged": 42,
    "inferred": 14,
    "skipped": 2
  },
  "excluded_posts": 2,
  "global_avg_engagement_density": 12.4,
  "winning_template": {
    "hook_type": "stat_lead",
    "video_length": "30",
    "voice_pace": "fast",
    "text_overlay": "karaoke_highlight",
    "background_type": "stock_montage",
    "music_energy": "upbeat",
    "cta_style": "follow_cta",
    "avg_engagement_density": 28.7,
    "confidence": "high",
    "sample_count": 12
  },
  "variable_impact": [
    {
      "variable": "hook_type",
      "values": {
        "stat_lead": { "avg_score": 24.3, "count": 18, "tagged_count": 14, "inferred_count": 4 },
        "did_you_know": { "avg_score": 15.1, "count": 14, "tagged_count": 10, "inferred_count": 4 }
      },
      "most_impactful_value": "stat_lead",
      "lift_over_average": "96%"
    }
  ],
  "per_channel_overrides": [
    {
      "channel": "Example Channel",
      "profile_id": "prof_example",
      "diverges_on": ["voice_pace"],
      "optimal_override": { "voice_pace": "moderate" },
      "lift_on_channel": "34%",
      "sample_count": 12,
      "cycles_observed": 4,
      "note": "Slower pacing outperforms fast by 34% on this channel"
    }
  ]
}
```

---

## Implementation Notes

### Variable Inference (S8)

Add an `inferVariables(post)` function that:
1. Takes a scored post object (with `content`, `analytics`, platform metadata)
2. Returns a `{ variables, confidences }` object
3. Each variable has a corresponding confidence: `"tagged"`, `"inferred"`, or `"unknown"`
4. Called at line 194 in the existing code (replacing the TODO comment)
5. Posts with at least 1 non-"unknown" inferred variable are included in analysis

### Per-Channel Overrides (S9)

Add a `detectPerChannelOverrides(postsWithVars, projectDataDir, date)` function that:
1. Groups current posts by channel/profile
2. For each channel, computes local variable impact
3. Loads historical variable-analysis.json files from previous cycles
4. Detects consistent divergences (3+ cycles, 15%+ lift, 5+ posts)
5. Returns array of override objects
6. Called at line 232 in the existing code (replacing the TODO comment)

### What NOT to Change

- The existing `computeVariableImpact()` and `computeWinningTemplate()` functions work correctly
- The output file path and format remain backward-compatible
- The `findCalendarVariables()` function stays as-is
- The VARIABLES array and main flow remain unchanged

---

## Test Plan

### Unit Tests (decompose-variables.test.js)

| ID | Test | Type |
|----|------|------|
| UT-DV-001 | Baseline: tagged posts produce correct variable impact analysis | Existing behavior |
| UT-DV-002 | Baseline: winning template is the combination of best values per variable | Existing behavior |
| UT-DV-003 | Baseline: confidence levels (high/medium/low) based on sample count | Existing behavior |
| UT-DV-004 | Inference: stat_lead hook detected from caption starting with percentage | New |
| UT-DV-005 | Inference: question hook detected from caption ending with "?" | New |
| UT-DV-006 | Inference: video_length bucketed from duration metadata | New |
| UT-DV-007 | Inference: voice_pace computed from WPM (word count / duration) | New |
| UT-DV-008 | Inference: non-inferable variables default to "unknown" | New |
| UT-DV-009 | Inference: empty caption results in all "unknown" | New |
| UT-DV-010 | Inference: inferred posts weighted at 0.5x in averages | New |
| UT-DV-011 | Inference: sample_breakdown shows tagged vs inferred counts | New |
| UT-DV-012 | Override: no overrides with < 3 scoring cycles | New |
| UT-DV-013 | Override: divergence detected when channel best differs from global best | New |
| UT-DV-014 | Override: divergence requires 15%+ lift on channel | New |
| UT-DV-015 | Override: divergence requires 5+ posts with divergent value | New |
| UT-DV-016 | Override: multiple variables can diverge for same channel | New |
| UT-DV-017 | Mixed: tagged + inferred posts both contribute to analysis | New |
| UT-DV-018 | Edge: all posts untagged and non-inferable produces empty analysis | New |

---

## Learnings

_(To be filled after implementation)_
