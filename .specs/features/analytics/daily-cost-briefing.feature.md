---
feature: Daily Analytics Briefing with Cost-Per-Video Tracking
domain: analytics
source: DonatoSkills/analytics-loop/daily-briefing.js
tests:
  - DonatoSkills/cost-tracker/__tests__/log-usage.test.js
  - DonatoSkills/analytics-loop/scripts/__tests__/daily-briefing.test.js
components:
  - cost-tracker/log-usage.js
  - cost-tracker/rates.json
  - analytics-loop/scripts/daily-briefing.js
personas: [operator]
status: implemented
created: 2026-03-17
updated: 2026-03-17
---

# Daily Analytics Briefing with Cost-Per-Video Tracking

**Source File**: `DonatoSkills/analytics-loop/daily-briefing.js`
**Cost Logger**: `DonatoSkills/cost-tracker/log-usage.js`
**Design System**: `.specs/design-system/tokens.md`
**Personas**: Operator (Andrew) — needs financial visibility into an autonomous system

This feature has two parts that work together:

1. **Cost Instrumentation** — Log API usage (provider, model, units, cost) at the moment each call is made, writing to a structured daily log.
2. **Daily Briefing** — Midday aggregation: pulls cost logs + analytics scores and formats a readable report showing cost per video, monthly burn, and performance highlights.

---

## Feature: Cost Instrumentation

Each API call in the generation pipeline writes a usage record to a daily log file.

### Scenario: TTS call logs character usage
Given a video script is being generated for a channel
When the ElevenLabs TTS API is called with the script text
Then a usage record is appended to `cost-tracker/logs/{YYYY-MM-DD}/{channel}/usage.jsonl`
And the record contains: `{ timestamp, provider: "elevenlabs", model, channel, video_id, chars_used, cost_usd, monthly_chars_remaining }`
And `cost_usd` is calculated as `chars_used * 0.00022` (amortized from $22/100k chars plan)
And `monthly_chars_remaining` is decremented from the running monthly total

### Scenario: Image gen call logs per-image cost
Given a background image is being generated for a video
When the image generation API is called (Gemini / OpenAI / Grok)
Then a usage record is appended to the daily log
And the record contains: `{ timestamp, provider, model, channel, video_id, images_generated: 1, cost_usd }`
And `cost_usd` reflects the model-specific rate from the cost rate table

### Scenario: Image served from cache — no cost logged
Given a background image is retrieved from the image cache
When no API call is made
Then NO usage record is written
And the briefing counts this as a cache hit (cost: $0.00)

### Scenario: Cloudinary upload — no cost logged
Given Cloudinary is on the free plan
When a video or image is uploaded
Then NO usage record is written
And the briefing notes "Media hosting: Free (Cloudinary)"

### Scenario: Provider fallback — only successful call logged
Given ElevenLabs fails and Grok TTS is used as fallback
When the Grok TTS call succeeds
Then only the Grok usage record is written (not the failed ElevenLabs attempt)
And the record notes `fallback: true`

### Scenario: Monthly ElevenLabs limit approaching
Given the running monthly character total exceeds 80,000 (80% of 100k plan)
When a TTS call completes
Then the usage record is flagged with `budget_warning: true`
And the briefing highlights this with a warning line

---

## Feature: Daily Briefing Generator

Runs at midday. Reads cost logs and recent analytics. Outputs a structured report.

### Scenario: Full briefing — content generated, analytics available
Given videos were generated today
And Zernio analytics data is available (from the 48-72hr rolling window)
When the daily briefing script runs
Then it outputs a report with:
  - **Today's content**: count of videos generated per channel
  - **Cost per video**: TTS cost + image gen cost + total per video
  - **Today's total**: sum of all API costs across channels
  - **Monthly burn**: ElevenLabs chars used / 100k + amortized dollar amount
  - **Top performers**: 3 highest-scoring posts from analytics window
  - **Variables winning**: from the decompose phase (e.g., "hook_type: question +23%")
  - **Variables suppressed**: any flags from the suppress phase
  - **Background**: current explore briefs being tested

### Scenario: Content generated, analytics not yet available
Given videos were generated today
But Zernio analytics are empty (new posts, <48hr lag)
When the briefing runs
Then it outputs cost data normally
And it shows "Analytics: No data yet — posts are <48hrs old"

### Scenario: No content generated today
Given no API calls were made today (no cost logs)
When the briefing runs
Then it shows: "Content: No videos generated today"
And "Cost: $0.00"
And still shows analytics from the rolling window if available

### Scenario: Missing cost logs for some videos
Given 6 videos were generated but only 4 have cost records (instrumentation failure)
When the briefing runs
Then it shows costs for the 4 recorded videos
And it notes: "⚠ 2 videos missing cost data — check generation logs"
And it does NOT fabricate costs for missing records

### Scenario: Briefing triggered on-demand
Given the user invokes the briefing manually (outside of the scheduled midday run)
When the briefing script runs with `--date today` or `--date YYYY-MM-DD`
Then it generates the report for the specified date
And outputs to terminal (default) or `briefings/{date}/report.md` with `--save` flag

---

## Feature: Cost Rate Table

A central config that maps provider + model → cost per unit.

### Scenario: Rate table drives all cost calculations
Given the cost rate table in `cost-tracker/rates.json`
When a usage record is written
Then `cost_usd` is always calculated from the rate table, never hardcoded
And the rate table entries are:
  ```json
  {
    "elevenlabs": {
      "default": { "unit": "char", "rate": 0.00022, "plan": "creator-100k" }
    },
    "gemini": {
      "gemini-2.5-flash-image": { "unit": "image", "rate": 0.04 },
      "gemini-3.1-flash-image-preview": { "unit": "image", "rate": 0.03 },
      "gemini-3-pro-image-preview": { "unit": "image", "rate": 0.08 }
    },
    "openai": {
      "gpt-image-1": { "unit": "image", "rate": 0.06 },
      "gpt-image-1-mini": { "unit": "image", "rate": 0.03 }
    },
    "grok": {
      "grok-imagine-image": { "unit": "image", "rate": 0.02 },
      "default-tts": { "unit": "char", "rate": 0.0001 }
    },
    "cloudinary": { "default": { "unit": "upload", "rate": 0.00, "plan": "free" } }
  }
  ```

### Scenario: Rate table is updated when plan changes
Given Cloudinary moves off the free plan
When rates.json is updated with the new Cloudinary rate
Then all future cost records use the new rate automatically
And historical records are unchanged

---

## Data Schema

### Usage Log Record (`usage.jsonl` — one JSON object per line)
```json
{
  "timestamp": "2026-03-17T09:14:32Z",
  "provider": "elevenlabs",
  "model": "adam",
  "channel": "baby-facts-unlocked",
  "video_id": "001-baby-saliva",
  "unit_type": "char",
  "units_used": 412,
  "cost_usd": 0.091,
  "fallback": false,
  "budget_warning": false,
  "monthly_units_running_total": 6240,
  "monthly_budget_remaining_pct": 93.76
}
```

### Log File Location
```
cost-tracker/
├── rates.json                          ← rate table (source of truth)
├── monthly/
│   └── {YYYY-MM}/
│       └── monthly-totals.json         ← running monthly chars/cost per provider
└── logs/
    └── {YYYY-MM-DD}/
        └── {channel}/
            └── usage.jsonl             ← append-only usage log per channel per day
```

---

## Briefing Output Format (Terminal)

```
════════════════════════════════════════════════════════
  FACTS UNLOCKED — DAILY BRIEFING
  Tuesday, March 17 2026  |  Midday Report
════════════════════════════════════════════════════════

TODAY'S CONTENT
───────────────
  baby-facts-unlocked    6 videos
  money-facts-unlocked   3 videos
  Total                  9 videos generated

COST PER VIDEO
───────────────
Channel: baby-facts-unlocked
  Video 001 — baby-saliva
    TTS (ElevenLabs, 412 chars)    $0.09
    Image gen (Gemini flash, 1)    $0.04
    Image cache hits               $0.00  (2 reused)
    ─────────────────────────────────────
    Video total                    $0.13

  Video 002 — baby-hiccups
    TTS (ElevenLabs, 389 chars)    $0.09
    Image gen (Gemini flash, 1)    $0.04
    ─────────────────────────────────────
    Video total                    $0.13

  ... (truncated)

Channel: money-facts-unlocked
  ... (same format)

DAILY SUMMARY
──────────────
  Total TTS cost (ElevenLabs)      $0.81
  Total Image gen cost (Gemini)    $0.36
  Total                            $1.17
  Avg cost per video               $0.13

MONTHLY BUDGET (ElevenLabs)
────────────────────────────
  Used this month: 23,480 / 100,000 chars  (23.5%)
  Remaining budget: 76,520 chars
  Amortized spend: $5.17 of $22.00 plan
  At this rate, monthly spend: ~$8.62/mo
  ✓ Well within plan — no action needed

ANALYTICS HIGHLIGHTS (last 72hrs)
────────────────────────────────────
  Top performers:
    1. baby-myth-hiccups      Score: 87.3   (TikTok)
    2. baby-saliva-surprising  Score: 74.1  (YouTube)
    3. money-compound-fact     Score: 68.9  (YouTube)

  Winning variables:
    hook_type: question       +23% vs baseline
    video_length: 30s         +18% vs baseline
    text_overlay: minimal     +11% vs baseline

  Suppressed (underperforming):
    voice_pace: fast          below threshold (3 cycles)

BACKGROUND WORK
────────────────
  Analytics loop: Phase 3 — decompose-variables (running)
  Explore brief: testing hook_type: story  (baby channel)
  Image cache: 847 cached / 150 max per channel
  Next content run: 3 PM

════════════════════════════════════════════════════════
```

---

## User Journey

1. The autonomous system generates content throughout the morning
2. Each API call writes a cost record to the daily log
3. **[This feature]** — At midday, the briefing script aggregates logs + analytics into a readable report
4. Andrew reads the report to understand cost efficiency and performance trends
5. Eventually: weekly brief adds revenue data → ROI per video becomes possible

---

## Implementation Notes

- The cost instrumentation should be a shared utility (`cost-tracker/log-usage.js`) called from any skill that makes paid API calls
- `log-usage.js` reads `rates.json` and writes to the correct `logs/{date}/{channel}/usage.jsonl`
- Monthly totals are maintained in `monthly/{YYYY-MM}/monthly-totals.json` so ElevenLabs running total persists across days
- The briefing script should work even if some logs are missing (partial data is better than no data)
- The scheduled task should run at 12:00 PM daily, using the existing scheduled tasks infrastructure

---

## Future: Weekly Brief

Once revenue data is available from YouTube/TikTok monetization:

```
WEEKLY ROI REPORT
  Total content cost:    $8.14
  Estimated ad revenue:  $14.30
  Net:                   +$6.16
  ROI:                   75.5%
  Best ROI channel:      baby-facts-unlocked ($0.09/video, $1.82 revenue/video)
```

---

## Component References

- Cost Logger: `DonatoSkills/cost-tracker/log-usage.js` (new)
- Rate Table: `DonatoSkills/cost-tracker/rates.json` (new)
- Monthly Totals: `DonatoSkills/cost-tracker/monthly/{YYYY-MM}/monthly-totals.json` (new)
- Daily Briefing: `DonatoSkills/analytics-loop/daily-briefing.js` (new)
- Scheduled Task: midday trigger via existing scheduled tasks infrastructure

---

## Learnings

### Cost Tracker Design
- Keep `logUsage()` as a single-call entry point that handles the full pipeline (calculate → append → update monthly totals). Skills only need one call.
- Store rates in `rates.json` at the `cost-tracker/` root so they're easy to update without touching code. Unknown providers throw loudly — you want that noise.
- For subscription providers (ElevenLabs), track a running monthly total in `monthly/{YYYY-MM}/monthly-totals.json` so budget warnings work across day boundaries. Pay-as-you-go providers (Gemini, OpenAI) get `monthly_budget: null`.
- `usage.jsonl` (newline-delimited JSON) is the right format for append-only logs: each record is independent, easy to parse, and doesn't require reading the whole file to append.

### Briefing Aggregation
- Aggregate cost data at three levels: record → video → channel → total. This lets the briefing show both granular (per-video) and summary (daily total) views from the same data structure.
- `aggregateCostLogs` is pure file I/O — it just reads and sums. `buildBriefingData` does the analysis (projections, pct calculations). `formatBriefing` is pure string rendering. Three separate concerns = easy to test each independently.
- Budget projection: `daily_rate = chars_used / day_of_month`, then `projected = daily_rate * days_in_month`. Simple and useful — gives a "you're on track to spend ~$X this month" line.

### Testing Patterns
- Use `fs.mkdtempSync` + `os.tmpdir()` for file system tests — creates isolated temp directories per test with no cleanup needed (OS handles it).
- Write fixture helpers (`makeRecord`, `writeUsageLog`) once and reuse across describes — avoids setup/teardown complexity.
- Test the three layers (calculateCost, buildUsageRecord, appendUsageRecord) independently before testing the full pipeline.
