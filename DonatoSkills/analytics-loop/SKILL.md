---
name: analytics-loop
description: "Closes the feedback loop between content publishing and content creation. Pulls post analytics from Zernio, scores engagement using a weighted formula, identifies winning content formats through variable decomposition, and generates optimized briefs for the next content batch. Use this skill whenever the user wants to analyze content performance, identify winning formats, optimize their content strategy, run the feedback loop, generate data-driven content briefs, or when they mention analytics, scoring, winning videos, or content optimization. Also triggers when running the full automated content pipeline end-to-end."
---

# Analytics Loop

Pull post analytics from Zernio, score engagement, decompose winning patterns by structural variables, and generate optimized briefs (2 exploit + 1 explore) for the content-engine.

This is the missing piece between "publish content" and "improve content." Without it, the content-engine creates in a vacuum. With it, every batch of content is informed by what actually worked.

---

## How This Works

The analytics loop runs in 5 phases:

```
Phase 1:   COLLECT      → Pull analytics from Zernio (48hr window)
Phase 2:   SCORE        → Apply weighted engagement formula to every post
Phase 2.5: SUPPRESS     → Flag/lift underperforming values based on history
Phase 3:   DECOMPOSE    → Map winning posts to their structural variables
Phase 4:   GENERATE     → Create 2 days of briefs using exploit/explore split
```

Each phase reads the output of the previous phase. All data is written to `analytics-loop/data/{project}/{date}/`. Each run is a dated snapshot — old snapshots are retained for trend analysis but never mutated.

---

## Orchestrated Mode

When invoked by the content-engine or a scheduled task, the prompt will contain **"ORCHESTRATED MODE"** and parameters:

```
ORCHESTRATED MODE — analytics-loop
- Project: {project_id}
- Date range: {last_48h | last_72h | custom YYYY-MM-DD to YYYY-MM-DD}
- Platform filter: {all | tiktok | youtube | instagram | ...}
```

In orchestrated mode:
1. Skip the interactive question flow
2. Run all 5 phases with the provided parameters
3. Output these signals when done:

```
ANALYTICS_COMPLETE
POSTS_ANALYZED: {count}
POSTS_EXCLUDED: {count}
GLOBAL_TOP_SCORE: {engagement_density}
WINNING_TEMPLATE: {JSON summary}
BRIEFS_GENERATED: analytics-loop/data/{project}/{date}/briefs/all-briefs.json
```

The content-engine reads the `BRIEFS_GENERATED` path to enter brief-driven mode.

---

## Project Registry (Multi-Project Support)

**Before doing anything else**, read the project registry to determine which project you're analyzing.

### Step 0: Resolve Active Project

1. **Read `projects.json`** from the DonatoSkills root directory (`~/DonatoSkills/projects.json`)
2. **Read `shared-references/project-registry.md`** for the full resolution logic
3. **Resolve the active project** using this priority:
   - **Orchestrated** — Content-engine passed `project_id` → use directly
   - **Explicit** — User said "for [project name]" → match against project names/slugs
   - **Single project** — Only one project in registry → use it automatically
   - **Ask** — Multiple projects, can't auto-detect → "Which project? I see: [list]"

4. **Once resolved, use the project's configuration:**
   - **Zernio API key**: `process.env[project.zernio.api_key_env]`
   - **Profile ID**: `project.zernio.profile_id` (or iterate `project.zernio.channels[]` for multi-channel)
   - **Analytics config**: `project.analytics_loop.*` for scoring weights, thresholds, etc.
   - **Content pillars**: `project.defaults.content_pillars` for topic guidance in briefs

5. **Verify Zernio is configured.** If the project only has a `buffer` config (no `zernio`), tell the user:
   > "The analytics loop requires Zernio for analytics data. I see this project uses Buffer. Would you like to add Zernio? Run `/setup` to configure it."

---

## Prerequisites

### Zernio API Key + Analytics Add-On

The env var name comes from the active project's `zernio.api_key_env` field in `projects.json` (defaults to `ZERNIO_API_KEY`).

**The Zernio Analytics add-on is required.** The free tier only supports posting. If the add-on is not active, the API returns HTTP 402.

If the API returns 402:
> "Zernio Analytics add-on is required for this skill. Enable it at app.zernio.com/settings/billing."

### Variable-Tagged Content

For Phase 3 (Decompose) to work, calendar items must include `variables` objects. If the project has legacy content without variable tags, the skill will:
1. Attempt to infer variables from post content and calendar metadata
2. Tag inferred variables as `confidence: "inferred"` (vs `confidence: "tagged"`)
3. Warn the user that future content should be tagged via the content-engine

---

## Interactive Question Flow

### Step 1: Absorb Context (silent)

Before asking the user anything, read:

1. **Active project** from `projects.json` (resolved in Step 0)
2. **Existing analytics data** — check `analytics-loop/data/{project}/` for previous runs
3. **Existing calendars** — check `content-engine/calendars/` for campaigns belonging to this project
4. **Analytics config** — read `project.analytics_loop` for any overrides (collection window, scoring weights, etc.)

### Step 2: Ask Questions

Group conversationally. Skip what you already know.

1. **Analysis scope** — "What do you want to analyze?
   - **Recent performance** — Last 48-72 hours (default, for the feedback loop)
   - **Trend analysis** — Last 7/14/30 days
   - **Specific campaign** — A particular content batch"

2. **Platform filter** — "All platforms, or focus on one? (TikTok, YouTube, Instagram, etc.)"

3. **Output mode** — "What should I do with the results?
   - **Report only** — Show me what's working and what's not
   - **Generate briefs** — Create optimized briefs for the next content batch
   - **Full loop** — Generate briefs AND feed them into the content-engine"

### Step 3: Run the Loop

Execute phases 1-4 based on the scope and output mode selected.

---

## Phase 1: Collect — Pull Analytics

Pull analytics for all posts published within the collection window.

**Default window**: Posts published 48-72 hours ago (giving platforms time to distribute).

**API call**:

```bash
curl -s "https://zernio.com/api/v1/analytics?profileId=${PROFILE_ID}&fromDate=${FROM_DATE}&toDate=${TO_DATE}&source=late&sortBy=engagement&order=desc&limit=100&page=1" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

**Pagination**: Page through results until `response.posts.length < 100`.

**For multi-channel projects** (`zernio.channels[]`): Iterate over each channel's `profile_id` and collect analytics separately, then merge.

**Reference**: `references/zernio-analytics.md` for full API docs.

**Output**: Write to `analytics-loop/data/{project}/{date}/raw-analytics.json`

---

## Phase 2: Score — Engagement Density

Apply the weighted engagement density formula to every post:

```
engagement_density = (shares × 4 + saves × 3 + comments × 2 + likes × 1) / impressions × 1000
```

### Rules
- **Minimum threshold**: Exclude posts with < 500 impressions (configurable via `project.analytics_loop.min_impressions`)
- **Excluded posts**: Still appear in output with `excluded: true` and `reason: "below_impression_threshold"`
- **Missing metrics**: Treat as 0 (e.g., if saves aren't reported for a platform)

### Cross-Channel Aggregation

After scoring individually, compute:
- Per-channel top performer
- Global top performer (across all channels)
- Average engagement density per channel
- Average engagement density globally

**Reference**: `references/scoring-model.md` for formula details, weight rationale, and tuning guidance.

**Output**: Write to `analytics-loop/data/{project}/{date}/scored-posts.json`

### Show the User

After scoring, display a summary:

```
Analytics Summary — [Project Name] — [Date Range]

Posts analyzed: 58 (2 excluded, < 500 impressions)
Global avg engagement density: 12.4

Top 5 Posts:
#1  [28.7] "Did you know that 73% of..." — TikTok, 15.4K impressions
#2  [24.1] "Most people don't realize..." — TikTok, 8.2K impressions
#3  [19.8] "The average person spends..." — Instagram, 12.1K impressions
#4  [17.2] "Scientists discovered that..." — YouTube, 6.8K impressions
#5  [15.9] "Here's what nobody tells..." — TikTok, 22.0K impressions

Per-Channel Averages:
  Baby Facts Unlocked (TikTok): 16.2 avg (18 posts)
  Baby Facts Unlocked (IG):     11.4 avg (12 posts)
```

---

## Phase 2.5: Suppress — Negative Learnings

Track what consistently fails so the system doesn't keep repeating losing patterns.

### How It Works

1. Load the existing suppression list from `analytics-loop/data/{project}/suppression-list.json`
2. **Check for lifts**: If a previously suppressed value now scores above 75% of the global average in a recent retest, remove it from the suppression list — audience behavior changes over time
3. **Check for new suppressions**: Any variable value that scores below 50% of the global average across 3+ scoring cycles with 10+ data points gets suppressed
4. **Pairwise combinations**: Individual values might be fine but toxic in specific combinations (e.g., "60s + slow pace" tanks even though 60s and slow pace each score okay alone). Track these separately.

### Suppression List

```json
{
  "suppressed_values": [
    {
      "variable": "hook_type",
      "value": "controversy",
      "avg_score": 4.2,
      "global_avg": 12.4,
      "ratio": 0.34,
      "sample_count": 14,
      "cycles_observed": 4,
      "suppressed_since": "2026-03-20",
      "reason": "Consistently 66% below average across 4 cycles with adequate sample size"
    }
  ],
  "suppressed_combinations": [
    {
      "combination": { "video_length": "60", "voice_pace": "slow" },
      "avg_score": 3.1,
      "note": "Long + slow combination kills retention on every channel"
    }
  ],
  "recheck_cadence_days": 14
}
```

### Enforcement Rules

- **Exploit slots**: Suppressed values NEVER appear. If the winning template contains a suppressed value, the brief generator substitutes the next-best non-suppressed value.
- **Explore slots**: Suppressed values CAN appear, but only once per recheck cadence (default 14 days). This allows the system to detect when a previously bad approach starts working again.
- **Lifted values**: When a retest scores above 75% of global avg, the value is removed from suppression and re-enters normal rotation.

The suppression list persists at the project level (not per-date), since it accumulates across scoring cycles.

**Output**: Write to `analytics-loop/data/{project}/suppression-list.json`

---

## Phase 3: Decompose — Variable Analysis

This is what makes the loop self-improving rather than just self-selecting.

### How It Works

1. Load scored posts from Phase 2
2. For each post, look up its variable tags from the calendar JSON (matched by `zernioPostId` or `postId` → calendar item's `zernio_post_id`)
3. Group posts by each variable value and compute average engagement density per group
4. Identify which variable combinations appear in the top-performing posts
5. For each variable, compute average engagement density when each value is present

### Finding Calendar Items

Search `content-engine/calendars/*/calendar.json` for items where:
- `zernio_post_id` matches the post's `zernioPostId`, OR
- `buffer_post_id` matches the post's `postId`

If no matching calendar item is found (post was created outside the content-engine), attempt to infer variables from the post content.

### Variable Impact Analysis

For each variable, rank its values by average engagement density:

```json
{
  "variable": "hook_type",
  "values": {
    "stat_lead": { "avg_score": 24.3, "count": 18 },
    "did_you_know": { "avg_score": 15.1, "count": 14 },
    "myth_bust": { "avg_score": 11.8, "count": 12 },
    "question": { "avg_score": 9.2, "count": 8 }
  },
  "most_impactful_value": "stat_lead",
  "lift_over_average": "96%"
}
```

### Winning Template

The combination of the highest-scoring value for each variable:

```json
{
  "winning_template": {
    "hook_type": "stat_lead",
    "video_length": "30",
    "voice_pace": "fast",
    "text_overlay": "karaoke_highlight",
    "background_type": "stock_montage",
    "music_energy": "upbeat",
    "cta_style": "follow_cta",
    "avg_engagement_density": 28.7,
    "confidence": "high | medium | low",
    "sample_count": 12
  }
}
```

**Confidence levels**:
- **high**: 10+ posts with this exact combination
- **medium**: 5-9 posts
- **low**: < 5 posts (treat as preliminary)

### Per-Channel Overrides

If a specific channel consistently (3+ cycles) performs better with a different value for one variable, record a local override:

```json
{
  "channel": "Baby Facts Unlocked",
  "profile_id": "prof_baby",
  "diverges_on": ["voice_pace"],
  "optimal_override": { "voice_pace": "moderate" },
  "note": "Slower pacing outperforms fast by 34% on this channel"
}
```

**Reference**: `references/variable-taxonomy.md` for the full taxonomy.

**Output**: Write to `analytics-loop/data/{project}/{date}/variable-analysis.json`

---

## Phase 4: Generate Briefs

Produce the next **2 days** of content plans for every channel using the exploit/explore split. Two days because the analytics loop runs every 48 hours but the content-engine runs daily — generating 2 days of briefs ensures the content task always has something to read, even on off-days.

### The 2/1 Rule

For each channel, generate 3 video briefs:
- **2 exploit videos**: Use the current winning template, adapted to this channel's topic
- **1 explore video**: Use the winning template but change exactly ONE variable

### Explore Variable Rotation

The explore slot cycles through variables systematically. Track rotation state in `analytics-loop/data/{project}/explore-rotation-state.json`:

```json
{
  "explore_rotation": {
    "prof_love": {
      "last_tested": "hook_type",
      "last_tested_date": "2026-03-15",
      "rotation_order": [
        "hook_type", "video_length", "voice_pace",
        "text_overlay", "background_type", "music_energy", "cta_style"
      ],
      "next_variable": "video_length"
    }
  }
}
```

**Explore value selection**: Pick the value with the SECOND-highest engagement density for the tested variable. If no second-best data exists, pick a value with < 3 data points to fill gaps.

### Cold Start Behavior

If the system has fewer than 2 complete scoring cycles of data:
- All 3 videos per channel are exploratory
- Each uses a deliberately different variable combination
- Distribute combinations to maximize coverage of the variable space
- The 2/1 exploit/explore split activates only after 2+ scored batches

### Template Promotion Rules

A new winning template only replaces the current one when:
- Outperforms current template by at least **15%** (`template_promotion.min_lift`)
- Observed across at least **5 channels** (`template_promotion.min_channels`)
- Holds for at least **2 consecutive** scoring cycles (`template_promotion.min_cycles`)
- Minimum **10 posts** with the new combination (`template_promotion.min_sample`)

All thresholds configurable via `project.analytics_loop.template_promotion`.

### Schedule Time Optimization

When the `/v1/analytics/best-time` endpoint returns data, use it to set `schedule_time` on each brief. Otherwise, fall back to the project's default posting schedule.

### Brief Output

Each brief per channel:

```json
{
  "date": "2026-03-17",
  "channel": "Love Facts Unlocked",
  "profile_id": "prof_love",
  "briefs": [
    {
      "slot": 1,
      "type": "exploit",
      "template": {
        "hook_type": "stat_lead",
        "video_length": "30",
        "voice_pace": "fast",
        "text_overlay": "karaoke_highlight",
        "background_type": "stock_montage",
        "music_energy": "upbeat",
        "cta_style": "follow_cta"
      },
      "topic_guidance": "Use a surprising love/relationship statistic as the hook. Channel pillars: dating stats, relationship psychology, love history.",
      "schedule_time": "09:00"
    },
    {
      "slot": 2,
      "type": "exploit",
      "template": { "...same as slot 1..." },
      "topic_guidance": "Different fact from slot 1. Avoid overlapping stats.",
      "schedule_time": "14:00"
    },
    {
      "slot": 3,
      "type": "explore",
      "template": {
        "hook_type": "stat_lead",
        "video_length": "45",
        "voice_pace": "fast",
        "text_overlay": "karaoke_highlight",
        "background_type": "stock_montage",
        "music_energy": "upbeat",
        "cta_style": "follow_cta"
      },
      "explore_variable": "video_length",
      "explore_value": "45",
      "baseline_value": "30",
      "topic_guidance": "Same content quality as exploit slots. Only the tested variable changes.",
      "schedule_time": "19:00"
    }
  ]
}
```

**Output**: Write per-channel briefs to `analytics-loop/data/{project}/{date}/briefs/` and a combined `all-briefs.json` for the content-engine.

---

## Integration with Content-Engine

The analytics-loop does NOT call the content-engine directly. It produces briefs as JSON files. The content-engine reads those files as input. This keeps the skills loosely coupled.

### How briefs feed into the content-engine

When `analytics-loop/data/{project}/{date}/briefs/all-briefs.json` exists, the content-engine enters **brief-driven mode**:

1. Read the briefs file
2. For each brief, generate a calendar item matching the specified template variables
3. Set `brief_id` on each calendar item linking back to the source brief
4. Set `variables` on each calendar item from the brief's template
5. Pass template variables through to remotion-video as creation parameters
6. Tag each post with its variable combination for future scoring
7. Upload to Cloudinary and schedule via Zernio as normal

When no briefs file exists, the content-engine falls back to its existing calendar-from-scratch behavior.

### Template variable mapping in remotion-video

When invoked with a brief's template object, remotion-video maps variables to rendering config:

| Variable | Remotion Parameter |
|----------|--------------------|
| `hook_type` | Scene 1 script structure and opening text |
| `video_length` | Composition `durationInFrames` (e.g., 30s × 30fps = 900 frames) |
| `voice_pace` | TTS speed parameter / script word count |
| `text_overlay` | Caption component style |
| `background_type` | `visual_mode` + SceneBackground component |
| `music_energy` | Background audio selection and volume |
| `cta_style` | Final scene configuration |

---

## Data Storage

All data lives in `analytics-loop/data/{project}/{date}/`:

```
analytics-loop/data/
└── donatos-deals/
    ├── 2026-03-16/
    │   ├── raw-analytics.json        # Phase 1 output
    │   ├── scored-posts.json         # Phase 2 output
    │   ├── variable-analysis.json    # Phase 3 output
    │   └── briefs/
    │       ├── all-briefs.json       # Day 1 combined (content-engine reads this)
    │       ├── love-facts.json       # Day 1 per-channel brief
    │       ├── baby-facts.json       # Day 1 per-channel brief
    │       └── day2/
    │           ├── all-briefs.json   # Day 2 combined
    │           ├── love-facts.json   # Day 2 per-channel brief
    │           └── baby-facts.json   # Day 2 per-channel brief
    ├── 2026-03-14/                   # Previous run (retained for trends)
    │   └── ...
    ├── explore-rotation-state.json   # Persistent across runs
    └── suppression-list.json         # Persistent — tracks what doesn't work
```

Each run is a dated snapshot. Old snapshots are retained for trend analysis but never mutated.

---

## Configuration Defaults

All configurable via `project.analytics_loop` in `projects.json`.

| Parameter | Default | Notes |
|-----------|---------|-------|
| Collection window | 48 hours | Extend to 72 if content-decay shows significant late engagement |
| Min impressions | 500 | Lower to 200 for new channels with small audiences |
| Exploit/explore ratio | 2:1 | Can shift to 1:1:1 during cold start or 3:0 when locked on a winner |
| Share weight | 4 | Highest because shares directly generate new impressions |
| Save weight | 3 | Strong signal for fact-based content specifically |
| Comment weight | 2 | Lower quality signal on faceless channels |
| Like weight | 1 | Baseline — noisiest metric |
| Template promotion lift | 15% | Minimum improvement to trigger a template switch |
| Template promotion channels | 5 | Minimum channels showing improvement |
| Template promotion cycles | 2 | Minimum consecutive scoring cycles |
| Template promotion sample | 10 | Minimum posts with the new combination |

---

## Recurring Mode (Scheduled Tasks)

For ongoing optimization, the analytics loop runs on **two scheduled tasks** with different cadences:

### Task 1: Analytics Loop (every 48 hours, evening)

```
Task name: analytics-loop-{project-slug}
Schedule: Every 48 hours at 8pm (default)
Prompt: |
  You are the analytics-loop skill for [project_id].
  ORCHESTRATED MODE — analytics-loop
  - Project: [project_id]
  - Date range: last_48h
  - Platform filter: all

  Run all 5 phases. Write 2 days of briefs to analytics-loop/data/{project}/{date}/briefs/.
  The content-engine will read them on its next run.
```

Runs in the evening so briefs are ready before the morning content creation task. Generates 2 days of briefs per run to cover both days until the next analytics run.

### Task 2: Content Creation (daily, morning)

```
Task name: content-creation-{project-slug}
Schedule: Daily at 4am (default)
Prompt: |
  Run the content engine in brief-driven mode for [project_id].
  Check analytics-loop/data/{project_id}/ for the most recent briefs.
  Read today's briefs and create videos for all channels.
  Upload to Cloudinary and schedule via Zernio.
```

Runs every morning — reads whatever briefs are available. On analytics days, it gets fresh briefs. On off-days, it reads Day 2 briefs from the previous analytics run.

### The Cadence

```
Day 1 evening:  Analytics loop fires → scores posts → generates Day 2 + Day 3 briefs
Day 2 morning:  Content task fires → reads Day 2 briefs → creates videos → schedules
Day 3 morning:  Content task fires → reads Day 3 briefs → creates videos → schedules
Day 3 evening:  Analytics loop fires again → scores Day 1+2 posts → generates Day 4+5 briefs
... (repeats)
```

### Kickoff Sequence

1. Manually create first batch of videos (cold start — all exploratory)
2. Set analytics loop to fire 48 hours after first batch publishes
3. Set daily content task to start the morning after the first analytics run completes
4. From there, both tasks recur and the system is self-sustaining

---

## Error Handling

| Error | Handling |
|-------|----------|
| HTTP 402 (Analytics add-on required) | Tell user to enable add-on at Zernio billing. Exit gracefully. |
| HTTP 401 (Invalid API key) | Check `ZERNIO_API_KEY` is set. Reference `/setup` for configuration. |
| HTTP 404 (Profile not found) | Verify `profileId` in projects.json matches Zernio. |
| No posts in collection window | Report "No posts found in the last 48 hours." Skip scoring. |
| All posts below impression threshold | Report "All posts below threshold." Show the posts anyway with a note. |
| No calendar items with variables | Attempt inference. Warn that tagging improves accuracy. |
| Previous scoring cycle missing | Enter cold start mode for brief generation. |

---

## Reference Files

| File | Purpose |
|------|---------|
| `references/scoring-model.md` | Engagement density formula, weights, interpretation |
| `references/variable-taxonomy.md` | 7 structural variables with values and mapping rules |
| `references/zernio-analytics.md` | Zernio analytics API endpoints, params, response schemas |
| `shared-references/analytics-schema.md` | Shared contract between content-engine and analytics-loop |

---

## Scripts

Reference implementations for each phase. These can be run standalone or by the orchestrator.

| Script | Phase | Description |
|--------|-------|-------------|
| `scripts/pull-analytics.js` | 1 | Fetch analytics from Zernio, paginate, write raw JSON |
| `scripts/score-posts.js` | 2 | Apply scoring formula, filter, aggregate |
| `scripts/check-suppressions.js` | 2.5 | Flag/lift underperforming values based on cross-cycle history |
| `scripts/decompose-variables.js` | 3 | Cross-reference variables, identify winning template |
| `scripts/generate-briefs.js` | 4 | Create 2 days of exploit/explore briefs per channel |
| `scripts/run-loop.js` | All | Orchestrator — runs all 5 phases sequentially |

See each script for implementation details.
