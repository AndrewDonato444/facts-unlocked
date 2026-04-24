---
feature: Quote Pipeline
domain: content
source: DonatoSkills/content-engine/quote-pipeline/
tests:
  - DonatoSkills/content-engine/quote-pipeline/__tests__/select-quote.test.js
components: []
personas: []
status: implemented
created: 2026-04-23
updated: 2026-04-23
---

# Quote Pipeline

**Source:** `DonatoSkills/content-engine/quote-pipeline/`
**Scheduled by:** `daily-quote-creation` (5:30am ET daily)

## Feature: Quote Pipeline

Produces one mother-baby quote video per day for Baby Facts Unlocked. Replaces a single video slot (2pm ET) in the daily schedule with an emotionally-driven quote card — a short faux-video (6-11s MP4) with a whimsical watercolor background, animated text, and a soft ambient audio track. Exists because analytics confirmed mother-baby bond content outperforms science-body content on TikTok and YouTube, and text-overlay composites (not pure photoreal or pure illustration) are the winning visual format.

Only applies to `baby-facts-unlocked` for v1. Other projects continue their normal 3-video-per-day cadence.

---

## Scenario: Happy path — daily quote post

```
Given the roster at quotes/baby-facts-unlocked/roster.md has unused quotes
And the pipeline is invoked with LIVE=1
When the pipeline runs end-to-end
Then one quote is selected (70/30 famous/original weighting) that has not been used before
And one audio track is picked at random from quotes/baby-facts-unlocked/audio/
And a whimsical illustrated background is generated via Nano Banana matched to the quote's theme
And the MP4 renders at 1080x1920 with duration determined by quote length (7s / 9s / 11s)
And the MP4 is uploaded to R2
And the post is scheduled via Zernio for the target date at 2pm ET across TikTok, Instagram, and YouTube Shorts
And the quote ID is appended to used.md stamped with the target date (not today)
And a record.json is written to the campaign directory
```

## Scenario: Dry-run is the fail-safe default

```
Given the pipeline is invoked without LIVE=1
When the pipeline runs
Then all steps through R2 upload complete normally
And Zernio scheduling is skipped
And the record.json shows status "dry-run-ready"
```

Reason: live posting requires explicit opt-in (`LIVE=1`) so a misconfigured scheduled task prompt cannot accidentally post to production social accounts. The worst case of any misconfiguration is a missed post, never an unintended post.

## Scenario: No quote is posted twice

```
Given a quote ID appears in used.md
When the selector runs
Then that quote is excluded from the eligible pool
And only unused quotes can be picked
```

## Scenario: Quote commits only after render succeeds

```
Given the render step fails (Gemini error, Remotion crash, disk full, etc.)
When the pipeline exits with non-zero status
Then used.md is NOT updated
And the quote remains available for the next run
```

Reason: prevents losing quotes from the pool when a day's render breaks halfway.

## Scenario: Concurrent runs do not double-commit

```
Given two pipeline runs start within seconds of each other
When both reach the used.md commit step
Then a file lock serializes the writes
And each run commits its own distinct quote
And no quote appears twice in used.md
```

## Scenario: Roster exhaustion is explicit

```
Given all quotes in roster.md have been used
When the selector runs
Then it exits with a non-zero status
And the error message tells the operator to replenish roster.md
And no empty or garbage post is produced
```

## Scenario: Timezone handles DST transitions

```
Given a target date in April (EDT) and another in December (EST)
When the pipeline computes the scheduledFor value
Then the April post uses -04:00 offset
And the December post uses -05:00 offset
And the offset is computed from Intl.DateTimeFormat, not hardcoded
```

Reason: prevents the pipeline silently misfiring by one hour at DST rollovers.

## Scenario: First frame is thumbnail-ready

```
Given a rendered quote video
When TikTok or Instagram pulls the first frame as a feed thumbnail
Then the background is already at full opacity (no fade-up from black/blue)
And the quote text is visible at ≥70% opacity
And the attribution is visible at ≥40% opacity
```

Reason: TikTok/IG use the first frame as the feed cover. A blank/ghost-text first frame reads as "broken video" to the algorithm and kills discoverability.

## Scenario: 2pm slot is owned exclusively by the quote pipeline

```
Given the video pipeline (daily-content-creation) runs for baby-facts-unlocked
When it generates the calendar
Then only 9am and 7pm slots are filled with videos
And the 2pm slot is left for the quote pipeline to fill
```

Reason: prevents duplicate posts at 2pm. Video pipeline is configured to skip that slot for baby-facts only (money-facts and ai-facts keep all 3 video slots).

## Scenario: Kill switch is one command

```
Given the operator wants to disable the quote pipeline
When they disable the daily-quote-creation scheduled task
Then no quote posts are produced or scheduled
And the video pipeline continues posting 2 videos per day for baby-facts
And no other project is affected
```

---

## Implementation notes

- **Selector:** `scripts/select-quote.js` — pure Node, no deps. Parses `roster.md` via regex, filters against `used.md`, samples with 70/30 weighting (famous/original). Exits non-zero on exhaustion.
- **Renderer:** Remotion 4.x, 30fps, 1080x1920. Dynamic duration via `calculateMetadata` based on word count (<12 → 7s, 12-20 → 9s, >20 → 11s).
- **Background:** Nano Banana (`gemini-2.5-flash-image`), 9:16 aspect, theme-matched mood prompts. Never photoreal — house style is watercolor whimsical based on 2026-04-23 analytics backfill finding (`style_manifest.json`).
- **Audio:** 5 Suno-generated ambient tracks at `quotes/baby-facts-unlocked/audio/`. Random per render. 1.5s fade-out.
- **Orchestrator:** `scripts/run-pipeline.ts` — fail-safe default is dry-run. `LIVE=1` required for Zernio scheduling.
- **Scheduled task:** `daily-quote-creation` cron `30 5 * * *` (5:30am ET). 85-minute buffer after `daily-content-creation` (4:05am) to avoid Gemini rate-limit contention.

## Known debt (backlog, not blockers)

- No cost logging (video pipeline logs to `cost-tracker/`; this one does not)
- No retry on Gemini/Zernio failures (video pipeline uses `withRetry`; this one does not)
- `/add-new` does not support quote pipelines yet — will be addressed if quote format validates on baby-facts
- Magic-number font scaling in `QuoteCard.tsx` could be a lookup table
