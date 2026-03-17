---
feature: Analytics Loop
domain: analytics
source: analytics-loop/SKILL.md
tests: []
components: []
status: specced
created: 2026-03-16
updated: 2026-03-16
---

# Analytics Loop

**Source File**: analytics-loop/SKILL.md
**Design System**: .specs/design-system/tokens.md

## Feature: Analytics-Driven Content Optimization

Close the feedback loop between content publishing and content creation by pulling post analytics, scoring engagement, decomposing winning patterns, and generating optimized briefs.

### Scenario: Pull analytics for a project with Zernio configured

```gherkin
Given a project "donatos-deals" exists in projects.json
  And the project has a "zernio" config with a valid profile_id
  And posts were published 48-72 hours ago
When the analytics-loop skill runs Phase 1 (Collect)
Then it fetches analytics from GET /v1/analytics with the project's profileId
  And it paginates through all results
  And it writes raw data to analytics-loop/data/donatos-deals/{date}/raw-analytics.json
```

### Scenario: Score posts using engagement density formula

```gherkin
Given raw-analytics.json contains 50 posts with engagement metrics
When the analytics-loop skill runs Phase 2 (Score)
Then each post receives an engagement_density score
  And the formula is (shares*4 + saves*3 + comments*2 + likes*1) / impressions * 1000
  And posts are sorted by engagement_density descending
  And results are written to scored-posts.json
```

### Scenario: Exclude posts below minimum impression threshold

```gherkin
Given raw-analytics.json contains a post with 300 impressions
  And the project's min_impressions threshold is 500
When the analytics-loop skill runs Phase 2 (Score)
Then the post is excluded from scoring
  And the post appears in scored-posts.json with excluded: true and reason: "below_impression_threshold"
  And the post's score is null
```

### Scenario: Decompose top posts by structural variables

```gherkin
Given scored-posts.json contains 48 scored posts (2 excluded)
  And calendar.json items have "variables" objects with hook_type, video_length, etc.
When the analytics-loop skill runs Phase 3 (Decompose)
Then it groups posts by each variable value
  And computes average engagement_density per group
  And identifies the winning template (highest-scoring combination)
  And identifies per-channel overrides where a channel diverges from global
  And writes results to variable-analysis.json
```

### Scenario: Generate exploit briefs from winning template

```gherkin
Given variable-analysis.json identifies a winning template
  And the project has 3 channels configured
When the analytics-loop skill runs Phase 4 (Generate Briefs)
Then each channel receives 2 exploit briefs
  And exploit briefs use the winning template variables exactly
  And topic_guidance is tailored to each channel's content_pillars
  And schedule_time uses data from /v1/analytics/best-time when available
```

### Scenario: Generate explore brief with single variable change

```gherkin
Given the winning template has video_length: "30"
  And the explore rotation state shows next_variable: "video_length"
  And the second-best video_length value is "45"
When the analytics-loop generates the explore brief
Then the explore brief uses all winning template variables except video_length: "45"
  And explore_variable is "video_length"
  And baseline_value is "30"
  And the rotation state advances to the next variable
```

### Scenario: Cold start with insufficient data

```gherkin
Given the analytics-loop has fewer than 2 complete scoring cycles
When it runs Phase 4 (Generate Briefs)
Then all 3 briefs per channel are exploratory (no exploit/explore split)
  And each brief uses a deliberately different variable combination
  And combinations are distributed to maximize coverage of the variable space
```

### Scenario: Suppress underperforming variable value

```gherkin
Given hook_type "controversy" scores 4.2 avg engagement density
  And the global average is 12.4
  And this pattern holds across 4 scoring cycles with 14 data points
When the suppression check runs (Phase 2.5)
Then "controversy" is added to the suppression list
  And the reason includes "66% below average"
  And exploit briefs will never use hook_type: "controversy"
  And explore briefs can retest it after 14 days (recheck cadence)
```

### Scenario: Lift a previously suppressed value after retest

```gherkin
Given hook_type "controversy" was suppressed since 2026-03-20
  And an explore slot retested it on 2026-04-05
  And the retest scored 10.2 (above 75% of the 12.4 global avg)
When the suppression check runs
Then "controversy" is removed from the suppression list
  And it re-enters normal rotation for explore and exploit slots
  And the lift is recorded with the retest score
```

### Scenario: Suppress a toxic pairwise combination

```gherkin
Given video_length "60" scores fine on its own (avg 11.8)
  And voice_pace "slow" scores fine on its own (avg 10.5)
  But the combination video_length="60" + voice_pace="slow" scores 3.1
When the suppression check detects the interaction effect
Then the combination is added to suppressed_combinations
  And briefs will not generate 60s + slow together
  But each value remains available individually
```

### Scenario: Generate 2 days of briefs per analytics run

```gherkin
Given the analytics loop runs on Day 1 evening
When Phase 4 (Generate Briefs) completes
Then briefs are generated for Day 2 AND Day 3
  And Day 2 briefs are in analytics-loop/data/{project}/{date}/briefs/all-briefs.json
  And Day 3 briefs are in analytics-loop/data/{project}/{date}/briefs/day2/all-briefs.json
  And the content-engine reads Day 2 briefs on Day 2 morning
  And the content-engine reads Day 3 briefs on Day 3 morning
```

### Scenario: Template promotion requires sustained improvement

```gherkin
Given a new variable combination outperforms the current template by 20%
  But it has only been observed for 1 scoring cycle across 3 channels
When template promotion is evaluated
Then the current template is NOT replaced
  And the new combination is flagged as "candidate" for monitoring
  And promotion requires: 15%+ lift, 5+ channels, 2+ cycles, 10+ sample posts
```

### Scenario: Content-engine reads briefs in brief-driven mode

```gherkin
Given analytics-loop/data/donatos-deals/{date}/briefs/all-briefs.json exists
When the content-engine starts planning a new calendar
Then it detects the briefs file
  And offers to use brief-driven mode
  And generates calendar items with pre-filled variables from the briefs
  And sets brief_id on each calendar item linking back to the source brief
```

### Scenario: Analytics add-on not active

```gherkin
Given the user's Zernio plan does not include the Analytics add-on
When the analytics-loop attempts to pull analytics
Then the API returns HTTP 402 with "Analytics add-on required"
  And the skill tells the user: "Zernio Analytics add-on is required. Enable it at app.zernio.com/settings/billing."
  And the skill exits gracefully without writing data files
```

### Scenario: Orchestrated mode via content-engine

```gherkin
Given the content-engine invokes analytics-loop in orchestrated mode
  And it passes project_id: "donatos-deals" and date_range: "last_48h"
When the analytics-loop completes all 4 phases
Then it outputs the signal: ANALYTICS_COMPLETE
  And it outputs: BRIEFS_GENERATED: analytics-loop/data/donatos-deals/{date}/briefs/all-briefs.json
  And the content-engine reads the briefs path from the signal
```

### Scenario: Per-channel override detected

```gherkin
Given "Baby Facts Unlocked" consistently performs 34% better with voice_pace: "moderate"
  And this pattern holds for 3+ consecutive scoring cycles
When decomposition runs
Then a per-channel override is recorded for Baby Facts Unlocked
  And the override only applies to voice_pace (all other variables follow global template)
  And generated briefs for this channel use voice_pace: "moderate" instead of the global value
```

## Data Flow

```
Zernio API → raw-analytics.json → scored-posts.json → variable-analysis.json → briefs/
                                                                                    ↓
                                                                         content-engine reads
                                                                                    ↓
                                                                         calendar.json (with variables tagged)
                                                                                    ↓
                                                                         remotion-video creates videos
                                                                                    ↓
                                                                         social-media publishes via Zernio
                                                                                    ↓
                                                                         (48 hours later, loop repeats)
```
